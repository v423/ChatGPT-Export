'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const yauzl = require('yauzl');
const mime = require('mime-types');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { parseConversation } = require('./chatgpt');

const MAX_ARCHIVE_ENTRIES = 500000;
const MAX_ENTRY_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_JSON_BYTES = 256 * 1024 * 1024;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 1000;

function hashFile(filename) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filename);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function openZip(filename) {
  return new Promise((resolve, reject) => {
    yauzl.open(filename, {
      lazyEntries: true,
      autoClose: false,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true
    }, (error, zipfile) => {
      if (error) reject(error);
      else resolve(zipfile);
    });
  });
}

function openEntryStream(zipfile, entry) {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (error, stream) => {
      if (error) reject(error);
      else resolve(stream);
    });
  });
}

async function readEntryBuffer(zipfile, entry, maxBytes) {
  const declaredSize = Number(entry.uncompressedSize) || 0;
  if (declaredSize > maxBytes) throw new Error('ZIP entry exceeds the JSON processing limit: ' + entry.fileName);
  const stream = await openEntryStream(zipfile, entry);
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > maxBytes) {
      stream.destroy();
      throw new Error('ZIP entry exceeded its processing limit: ' + entry.fileName);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}

function safeArchivePath(rawName) {
  const raw = String(rawName || '');
  if (!raw || raw.includes('\0')) throw new Error('ZIP contains an empty or invalid entry path');
  const normalized = raw.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    throw new Error('ZIP contains an absolute path: ' + raw);
  }
  const segments = normalized.split('/');
  if (segments.some(segment => segment === '..')) {
    throw new Error('ZIP contains a parent-relative path: ' + raw);
  }
  const safe = segments.filter(segment => segment && segment !== '.').join('/');
  if (!safe) throw new Error('ZIP contains an invalid entry path');
  return safe;
}

function isSymlink(entry) {
  const attributes = Number(entry.externalFileAttributes) >>> 0;
  const unixMode = (attributes >>> 16) & 0xffff;
  return (unixMode & 0o170000) === 0o120000;
}

function assetLocationForPath(archivePath) {
  const segments = archivePath.split('/');
  let folderIndex = -1;
  let kind = '';
  for (let index = 0; index < segments.length; index += 1) {
    const lower = segments[index].toLowerCase();
    if (lower === 'images' || lower === 'files') {
      folderIndex = index;
      kind = lower === 'images' ? 'image' : 'file';
    }
  }
  if (folderIndex < 0 || folderIndex === segments.length - 1) return null;
  return {
    baseDir: segments.slice(0, folderIndex).join('/'),
    filename: segments[segments.length - 1],
    kind
  };
}

async function streamEntryToAsset(zipfile, entry, dataDir, maxBytes) {
  const stream = await openEntryStream(zipfile, entry);
  const tempDir = path.join(dataDir, 'tmp');
  await fsp.mkdir(tempDir, { recursive: true });
  const tempPath = path.join(tempDir, crypto.randomUUID() + '.asset');
  const hash = crypto.createHash('sha256');
  let size = 0;

  const counter = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      if (size > maxBytes) {
        callback(new Error('ZIP asset exceeded the per-file size limit: ' + entry.fileName));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    }
  });

  try {
    await pipeline(stream, counter, fs.createWriteStream(tempPath, { flags: 'wx' }));
    const sha256 = hash.digest('hex');
    const storagePath = path.join(dataDir, 'assets', sha256.slice(0, 2), sha256);
    await fsp.mkdir(path.dirname(storagePath), { recursive: true });
    try {
      await fsp.access(storagePath);
      await fsp.unlink(tempPath);
    } catch (_) {
      await fsp.rename(tempPath, storagePath);
    }
    return { sha256, size, storagePath };
  } catch (error) {
    await fsp.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

function createStatements(db) {
  return {
    findImportByHash: db.prepare("SELECT id FROM import_jobs WHERE sha256 = ? AND status = 'completed' LIMIT 1"),
    updateJob: db.prepare('UPDATE import_jobs SET sha256 = COALESCE(?, sha256), status = ?, total_entries = ?, processed_entries = ?, total_bytes = ?, processed_bytes = ?, conversations_added = ?, conversations_updated = ?, conversations_skipped = ?, messages_imported = ?, assets_added = ?, error = ?, started_at = COALESCE(started_at, ?), finished_at = ? WHERE id = ?'),
    getConversation: db.prepare('SELECT raw_sha256, updated_at FROM conversations WHERE id = ?'),
    upsertConversation: db.prepare('INSERT INTO conversations (id, conversation_id, title, project_title, project_path, source_path, created_at, updated_at, message_count, raw_sha256, raw_json_gzip, import_id, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET conversation_id = excluded.conversation_id, title = excluded.title, project_title = excluded.project_title, project_path = excluded.project_path, source_path = excluded.source_path, created_at = excluded.created_at, updated_at = excluded.updated_at, message_count = excluded.message_count, raw_sha256 = excluded.raw_sha256, raw_json_gzip = excluded.raw_json_gzip, import_id = excluded.import_id, imported_at = excluded.imported_at'),
    deleteMessages: db.prepare('DELETE FROM messages WHERE conversation_id = ?'),
    deleteMessageSearch: db.prepare('DELETE FROM messages_fts WHERE conversation_id = ?'),
    deleteConversationSearch: db.prepare('DELETE FROM conversations_fts WHERE conversation_id = ?'),
    insertMessage: db.prepare('INSERT INTO messages (conversation_id, message_id, node_id, parent_id, sequence, role, author_name, channel, recipient, created_at, updated_at, content_type, content_text, content_json, metadata_json, dil_ast_json, is_current_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    insertMessageSearch: db.prepare('INSERT INTO messages_fts (conversation_id, message_id, title, role, content_text) VALUES (?, ?, ?, ?, ?)'),
    insertConversationSearch: db.prepare('INSERT INTO conversations_fts (conversation_id, title, project_title) VALUES (?, ?, ?)'),
    insertImportConversation: db.prepare('INSERT OR IGNORE INTO import_conversations (import_id, conversation_id, source_path) VALUES (?, ?, ?)'),
    insertAsset: db.prepare('INSERT OR IGNORE INTO assets (sha256, storage_path, size, mime_type, created_at) VALUES (?, ?, ?, ?, ?)'),
    insertAssetLocation: db.prepare('INSERT OR IGNORE INTO asset_locations (import_id, archive_path, base_dir, filename, kind, sha256) VALUES (?, ?, ?, ?, ?, ?)')
  };
}

async function importZipFile(options) {
  const db = options.db;
  const archivePath = options.archivePath;
  const dataDir = path.resolve(options.dataDir);
  const jobId = options.jobId;
  const filename = options.filename || path.basename(archivePath);
  if (!db || !jobId) throw new Error('A database and import job ID are required');

  const startedAt = Date.now();
  const statements = createStatements(db);
  let zipfile = null;
  let archiveHash = null;
  let totalEntries = 0;
  let processedEntries = 0;
  let totalBytes = 0;
  let processedBytes = 0;
  let conversationsAdded = 0;
  let conversationsUpdated = 0;
  let conversationsSkipped = 0;
  let messagesImported = 0;
  let assetsAdded = 0;

  const updateJob = (status, error, finishedAt) => {
    statements.updateJob.run(
      archiveHash,
      status,
      totalEntries,
      processedEntries,
      totalBytes,
      processedBytes,
      conversationsAdded,
      conversationsUpdated,
      conversationsSkipped,
      messagesImported,
      assetsAdded,
      error || null,
      startedAt,
      finishedAt || null,
      jobId
    );
  };

  try {
    await fsp.mkdir(dataDir, { recursive: true });
    archiveHash = await hashFile(archivePath);
    const duplicate = statements.findImportByHash.get(archiveHash);
    if (duplicate && duplicate.id !== jobId) {
      updateJob('duplicate', 'This archive was already imported as job ' + duplicate.id, Date.now());
      return { status: 'duplicate', existingImportId: duplicate.id };
    }

    updateJob('processing', null, null);
    zipfile = await openZip(archivePath);

    await new Promise((resolve, reject) => {
      let settled = false;
      const fail = error => {
        if (settled) return;
        settled = true;
        try { zipfile.close(); } catch (_) {}
        reject(error);
      };

      zipfile.on('error', fail);
      zipfile.on('end', () => {
        if (settled) return;
        settled = true;
        resolve();
      });

      zipfile.on('entry', entry => {
        (async () => {
          if (isSymlink(entry)) throw new Error('ZIP symbolic links are not accepted: ' + entry.fileName);
          const archiveEntryPath = safeArchivePath(entry.fileName);
          const uncompressedSize = Number(entry.uncompressedSize) || 0;
          const compressedSize = Number(entry.compressedSize) || 0;

          totalEntries += 1;
          totalBytes += uncompressedSize;
          if (totalEntries > MAX_ARCHIVE_ENTRIES) throw new Error('ZIP contains too many entries');
          if (uncompressedSize > MAX_ENTRY_BYTES) throw new Error('ZIP entry exceeds the 2 GiB limit: ' + archiveEntryPath);
          if (totalBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) throw new Error('ZIP expands beyond the 50 GiB import limit');
          if (compressedSize > 0 && uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO) {
            throw new Error('ZIP entry has an unsafe compression ratio: ' + archiveEntryPath);
          }

          if (!entry.fileName.endsWith('/')) {
            const extension = path.extname(archiveEntryPath).toLowerCase();
            if (extension === '.json') {
              const buffer = await readEntryBuffer(zipfile, entry, MAX_JSON_BYTES);
              const rawSha = crypto.createHash('sha256').update(buffer).digest('hex');
              let data;
              try {
                data = JSON.parse(buffer.toString('utf8'));
              } catch (error) {
                conversationsSkipped += 1;
                processedEntries += 1;
                processedBytes += uncompressedSize;
                updateJob('processing', 'Skipped invalid JSON: ' + archiveEntryPath + ' (' + error.message + ')', null);
                return;
              }
              const conversation = parseConversation(data, archiveEntryPath);
              if (!conversation) {
                conversationsSkipped += 1;
              } else {
                const existing = statements.getConversation.get(conversation.id);
                if (existing && existing.raw_sha256 === rawSha) {
                  conversationsSkipped += 1;
                  statements.insertImportConversation.run(jobId, conversation.id, conversation.sourcePath);
                } else if (existing && existing.updated_at && conversation.updatedAt && conversation.updatedAt < existing.updated_at) {
                  conversationsSkipped += 1;
                  statements.insertImportConversation.run(jobId, conversation.id, conversation.sourcePath);
                } else {
                  const rawGzip = zlib.gzipSync(buffer, { level: 6 });
                  const transaction = db.transaction(() => {
                    statements.upsertConversation.run(
                      conversation.id,
                      conversation.conversationId,
                      conversation.title,
                      conversation.projectTitle,
                      conversation.projectPath,
                      conversation.sourcePath,
                      conversation.createdAt,
                      conversation.updatedAt,
                      conversation.messages.length,
                      rawSha,
                      rawGzip,
                      jobId,
                      Date.now()
                    );
                    statements.deleteMessages.run(conversation.id);
                    statements.deleteMessageSearch.run(conversation.id);
                    statements.deleteConversationSearch.run(conversation.id);
                    for (const message of conversation.messages) {
                      statements.insertMessage.run(
                        conversation.id,
                        message.messageId,
                        message.nodeId,
                        message.parentId,
                        message.sequence,
                        message.role,
                        message.authorName,
                        message.channel,
                        message.recipient,
                        message.createdAt,
                        message.updatedAt,
                        message.contentType,
                        message.contentText,
                        message.contentJson,
                        message.metadataJson,
                        JSON.stringify(message.dilAst),
                        message.isCurrentPath
                      );
                      statements.insertMessageSearch.run(
                        conversation.id,
                        message.messageId,
                        conversation.title,
                        message.role,
                        message.contentText
                      );
                    }
                    statements.insertConversationSearch.run(
                      conversation.id,
                      conversation.title,
                      conversation.projectTitle || ''
                    );
                    statements.insertImportConversation.run(jobId, conversation.id, conversation.sourcePath);
                  });
                  transaction();
                  if (existing) conversationsUpdated += 1;
                  else conversationsAdded += 1;
                  messagesImported += conversation.messages.length;
                }
              }
            } else {
              const assetLocation = assetLocationForPath(archiveEntryPath);
              if (assetLocation) {
                const asset = await streamEntryToAsset(zipfile, entry, dataDir, MAX_ENTRY_BYTES);
                const mimeType = mime.lookup(assetLocation.filename) || 'application/octet-stream';
                const existed = db.prepare('SELECT 1 FROM assets WHERE sha256 = ?').get(asset.sha256);
                statements.insertAsset.run(asset.sha256, asset.storagePath, asset.size, mimeType, Date.now());
                statements.insertAssetLocation.run(
                  jobId,
                  archiveEntryPath,
                  assetLocation.baseDir,
                  assetLocation.filename,
                  assetLocation.kind,
                  asset.sha256
                );
                if (!existed) assetsAdded += 1;
              }
            }
          }

          processedEntries += 1;
          processedBytes += uncompressedSize;
          if (processedEntries % 10 === 0) updateJob('processing', null, null);
        })().then(() => {
          if (!settled) zipfile.readEntry();
        }).catch(fail);
      });

      zipfile.readEntry();
    });

    updateJob('completed', null, Date.now());
    return {
      status: 'completed',
      archiveHash,
      totalEntries,
      processedEntries,
      conversationsAdded,
      conversationsUpdated,
      conversationsSkipped,
      messagesImported,
      assetsAdded
    };
  } catch (error) {
    updateJob('failed', error.message || String(error), Date.now());
    throw error;
  } finally {
    if (zipfile) {
      try { zipfile.close(); } catch (_) {}
    }
    if (options.deleteArchiveOnFinish) {
      await fsp.rm(archivePath, { force: true }).catch(() => {});
    }
  }
}

module.exports = {
  importZipFile,
  hashFile,
  safeArchivePath,
  assetLocationForPath,
  MAX_ARCHIVE_ENTRIES,
  MAX_ENTRY_BYTES,
  MAX_JSON_BYTES,
  MAX_TOTAL_UNCOMPRESSED_BYTES
};
