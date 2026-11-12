'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Worker } = require('node:worker_threads');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const mime = require('mime-types');
const { openDatabase } = require('./db');
const { importZipFile } = require('./importer');
const { renderRichContent } = require('./rich-content');

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function sendJson(response, statusCode, value) {
  const body = Buffer.from(JSON.stringify(value));
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(body);
}

function safeFilename(value) {
  let name = String(value || 'chatgpt-export.zip');
  try { name = decodeURIComponent(name); } catch (_) {}
  name = path.basename(name).replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').trim();
  return (name || 'chatgpt-export.zip').slice(0, 160);
}

function parseLimit(value, fallback, maximum) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return Math.min(number, maximum);
}

function makeFtsQuery(value) {
  const tokens = String(value || '').trim().split(/[^\p{L}\p{N}_-]+/u).filter(Boolean).slice(0, 12);
  if (!tokens.length) return '';
  return tokens.map(token => '"' + token.replace(/"/g, '""') + '"*').join(' AND ');
}

function readSources(metadata) {
  if (!metadata || typeof metadata !== 'object') return [];
  if (Array.isArray(metadata.content_references)) return metadata.content_references;
  if (Array.isArray(metadata.contentReferences)) return metadata.contentReferences;
  if (Array.isArray(metadata.citations)) return metadata.citations;
  return [];
}

function normalizedAssetName(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function replaceAssetMarkers(content, assets) {
  const list = Array.isArray(assets) ? assets : [];
  let text = String(content || '');
  text = text.replace(/<!--\s*image:([^>]+?)\s*-->/g, (_, rawPointer) => {
    const pointer = normalizedAssetName(rawPointer.trim());
    const asset = list.find(item => item.kind === 'image' &&
      (normalizedAssetName(item.filename).includes(pointer) || normalizedAssetName(item.archive_path).includes(pointer)));
    if (!asset) return '\n\n[图片资源未找到：' + rawPointer.trim() + ']\n\n';
    return '\n\n![图片](/api/assets/' + asset.sha256 + ')\n\n';
  });
  text = text.replace(/<!--\s*file:([^>]+?)\s*-->/g, (_, rawKey) => {
    let key = rawKey.trim();
    try { key = decodeURIComponent(key); } catch (_) {}
    const needle = normalizedAssetName(key);
    const asset = list.find(item => item.kind === 'file' &&
      (normalizedAssetName(item.filename) === needle ||
       normalizedAssetName(item.filename).includes(needle) ||
       normalizedAssetName(item.archive_path).includes(needle)));
    if (!asset) return '\n\n[附件：' + key.replace(/[<>]/g, '') + ']\n\n';
    return '\n\n[附件：' + asset.filename + '](/api/assets/' + asset.sha256 + ')\n\n';
  });
  return text;
}

function getConversationAssets(db, conversation) {
  return db.prepare(
    'SELECT al.archive_path, al.base_dir, al.filename, al.kind, al.sha256, a.size, a.mime_type ' +
    'FROM import_conversations ic ' +
    'JOIN asset_locations al ON al.import_id = ic.import_id ' +
    'JOIN assets a ON a.sha256 = al.sha256 ' +
    'WHERE ic.conversation_id = ? AND al.base_dir = ? ' +
    'ORDER BY (SELECT created_at FROM import_jobs WHERE id = al.import_id) DESC, al.archive_path'
  ).all(conversation.id, conversation.project_path || '');
}

function renderMessageRow(message, assets) {
  let metadata = {};
  try { metadata = JSON.parse(message.metadata_json || '{}'); } catch (_) {}
  const content = replaceAssetMarkers(message.content_text, assets);
  return {
    id: message.message_id,
    sequence: message.sequence,
    role: message.role,
    authorName: message.author_name,
    channel: message.channel,
    createdAt: message.created_at,
    contentHtml: renderRichContent(content, { sources: readSources(metadata), assets })
  };
}

function getMessagePage(db, conversation, params) {
  const limit = parseLimit(params.get('limit'), 80, MAX_PAGE_SIZE);
  const beforeValue = params.get('before');
  const before = beforeValue == null ? null : Number.parseInt(beforeValue, 10);
  let rows;
  if (Number.isFinite(before)) {
    rows = db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? AND sequence < ? ORDER BY sequence DESC LIMIT ?'
    ).all(conversation.id, before, limit);
  } else {
    rows = db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY sequence DESC LIMIT ?'
    ).all(conversation.id, limit);
  }
  rows.reverse();
  const assets = getConversationAssets(db, conversation);
  const items = rows.map(message => renderMessageRow(message, assets));
  const firstSequence = rows.length ? rows[0].sequence : null;
  const hasOlder = firstSequence != null && Boolean(db.prepare(
    'SELECT 1 FROM messages WHERE conversation_id = ? AND sequence < ? LIMIT 1'
  ).get(conversation.id, firstSequence));
  return {
    items,
    hasOlder,
    nextBefore: hasOlder ? firstSequence : null
  };
}

function searchConversations(db, query, limit, offset) {
  const match = makeFtsQuery(query);
  if (match && db.ftsEnabled) {
    try {
      const total = db.prepare(
        'SELECT COUNT(DISTINCT conversation_id) AS count FROM messages_fts WHERE messages_fts MATCH ?'
      ).get(match).count;
      const items = db.prepare(
        'SELECT c.id, c.title, c.project_title, c.updated_at, c.message_count ' +
        'FROM conversations c WHERE c.id IN (' +
        'SELECT DISTINCT conversation_id FROM messages_fts WHERE messages_fts MATCH ?' +
        ') ORDER BY c.updated_at DESC LIMIT ? OFFSET ?'
      ).all(match, limit, offset);
      return { items, total };
    } catch (_) {
      // Fall through to LIKE search for unsupported FTS query syntax.
    }
  }

  const like = '%' + String(query || '').toLowerCase().replace(/[%_]/g, '') + '%';
  const total = db.prepare(
    'SELECT COUNT(DISTINCT c.id) AS count FROM conversations c ' +
    'LEFT JOIN messages m ON m.conversation_id = c.id ' +
    'WHERE lower(c.title) LIKE ? OR lower(COALESCE(m.content_text, \'\')) LIKE ?'
  ).get(like, like).count;
  const items = db.prepare(
    'SELECT DISTINCT c.id, c.title, c.project_title, c.updated_at, c.message_count ' +
    'FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id ' +
    'WHERE lower(c.title) LIKE ? OR lower(COALESCE(m.content_text, \'\')) LIKE ? ' +
    'ORDER BY c.updated_at DESC LIMIT ? OFFSET ?'
  ).all(like, like, limit, offset);
  return { items, total };
}

function createSizeGuard(maxBytes) {
  let received = 0;
  return new Transform({
    transform(chunk, encoding, callback) {
      received += chunk.length;
      if (received > maxBytes) {
        callback(new Error('上传文件超过 20 GiB 限制'));
        return;
      }
      callback(null, chunk);
    }
  });
}

function isAllowedOrigin(origin, port) {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return (url.hostname === '127.0.0.1' || url.hostname === 'localhost' || url.hostname === '[::1]') &&
      Number(url.port || (url.protocol === 'https:' ? 443 : 80)) === Number(port);
  } catch (_) {
    return false;
  }
}

function createServer(options = {}) {
  const dataDir = path.resolve(options.dataDir || process.env.CHATGPT_EXPORT_DATA_DIR || 'data');
  const dbPath = options.dbPath || path.join(dataDir, 'chatgpt.sqlite');
  const publicDir = path.resolve(options.publicDir || path.join(__dirname, '..', 'app', 'public'));
  const host = options.host || process.env.HOST || '127.0.0.1';
  const port = Number(options.port ?? process.env.PORT ?? 4317);
  const db = options.db || openDatabase(dbPath);
  const importWorkers = new Set();

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname);

    try {
      if (request.method === 'GET' && pathname === '/api/health') {
        sendJson(response, 200, { ok: true, database: dbPath, fts: Boolean(db.ftsEnabled) });
        return;
      }

      if (request.method === 'GET' && pathname === '/api/stats') {
        const conversations = db.prepare('SELECT COUNT(*) AS count FROM conversations').get().count;
        const messages = db.prepare('SELECT COUNT(*) AS count FROM messages').get().count;
        const assets = db.prepare('SELECT COUNT(*) AS count FROM assets').get().count;
        const imports = db.prepare("SELECT COUNT(*) AS count FROM import_jobs WHERE status = 'completed'").get().count;
        const bytes = db.prepare('SELECT COALESCE(SUM(size), 0) AS bytes FROM assets').get().bytes;
        sendJson(response, 200, { conversations, messages, assets, imports, assetBytes: bytes, fts: Boolean(db.ftsEnabled) });
        return;
      }

      if (request.method === 'GET' && pathname === '/api/conversations') {
        const limit = parseLimit(url.searchParams.get('limit'), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
        const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0);
        const query = String(url.searchParams.get('q') || '').trim();
        const project = String(url.searchParams.get('project') || '').trim();
        let result;
        if (query) {
          result = searchConversations(db, query, limit, offset);
          if (project) {
            result.items = result.items.filter(item => item.project_title === project);
          }
        } else {
          const where = project ? 'WHERE project_title = ?' : '';
          const values = project ? [project] : [];
          const total = db.prepare('SELECT COUNT(*) AS count FROM conversations ' + where).get(...values).count;
          const items = db.prepare(
            'SELECT id, title, project_title, updated_at, message_count FROM conversations ' +
            where + ' ORDER BY updated_at DESC LIMIT ? OFFSET ?'
          ).all(...values, limit, offset);
          result = { items, total };
        }
        sendJson(response, 200, {
          items: result.items,
          total: result.total,
          limit,
          offset,
          hasMore: offset + result.items.length < result.total
        });
        return;
      }

      const messagesMatch = pathname.match(/^\/api\/conversations\/([^/]+)\/messages$/);
      if (request.method === 'GET' && messagesMatch) {
        const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(messagesMatch[1]);
        if (!conversation) {
          sendJson(response, 404, { error: 'Conversation not found' });
          return;
        }
        sendJson(response, 200, getMessagePage(db, conversation, url.searchParams));
        return;
      }

      const conversationMatch = pathname.match(/^\/api\/conversations\/([^/]+)$/);
      if (request.method === 'GET' && conversationMatch) {
        const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(conversationMatch[1]);
        if (!conversation) {
          sendJson(response, 404, { error: 'Conversation not found' });
          return;
        }
        const page = getMessagePage(db, conversation, url.searchParams);
        sendJson(response, 200, {
          id: conversation.id,
          title: conversation.title,
          projectTitle: conversation.project_title,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
          messageCount: conversation.message_count,
          messages: page.items,
          hasOlder: page.hasOlder,
          nextBefore: page.nextBefore
        });
        return;
      }

      const importMatch = pathname.match(/^\/api\/imports\/([^/]+)$/);
      if (request.method === 'GET' && importMatch) {
        const job = db.prepare(
          'SELECT id, filename, status, total_entries, processed_entries, total_bytes, processed_bytes, conversations_added, conversations_updated, conversations_skipped, messages_imported, assets_added, error, created_at, started_at, finished_at FROM import_jobs WHERE id = ?'
        ).get(importMatch[1]);
        if (!job) {
          sendJson(response, 404, { error: 'Import job not found' });
          return;
        }
        sendJson(response, 200, job);
        return;
      }

      if (request.method === 'POST' && pathname === '/api/import') {
        if (!isAllowedOrigin(request.headers.origin, port)) {
          sendJson(response, 403, { error: 'Cross-origin upload is not allowed' });
          return;
        }
        const declaredLength = Number(request.headers['content-length'] || 0);
        if (declaredLength > MAX_UPLOAD_BYTES) {
          sendJson(response, 413, { error: '上传文件超过 20 GiB 限制' });
          return;
        }
        const jobId = crypto.randomUUID();
        const filename = safeFilename(request.headers['x-file-name']);
        const tempDir = path.join(dataDir, 'tmp');
        const archivePath = path.join(tempDir, jobId + '.zip');
        await fsp.mkdir(tempDir, { recursive: true });
        db.prepare(
          'INSERT INTO import_jobs (id, filename, status, created_at) VALUES (?, ?, ?, ?)'
        ).run(jobId, filename, 'uploading', Date.now());

        try {
          await pipeline(request, createSizeGuard(MAX_UPLOAD_BYTES), fs.createWriteStream(archivePath, { flags: 'wx' }));
        } catch (error) {
          await fsp.rm(archivePath, { force: true }).catch(() => {});
          db.prepare('UPDATE import_jobs SET status = ?, error = ?, finished_at = ? WHERE id = ?')
            .run('failed', error.message, Date.now(), jobId);
          sendJson(response, 413, { error: error.message, jobId });
          return;
        }

        db.prepare('UPDATE import_jobs SET status = ? WHERE id = ?').run('queued', jobId);
        sendJson(response, 202, { jobId, status: 'queued', filename });
        if (options.db) {
          // In-memory databases are not shared between worker threads; keep test/custom DBs on this connection.
          setImmediate(() => {
            importZipFile({
              db,
              archivePath,
              dataDir,
              jobId,
              filename,
              deleteArchiveOnFinish: true
            }).catch(error => {
              console.error('[ChatGPT Exporter] Import failed:', error);
            });
          });
        } else {
          // Keep ZIP decompression, JSON parsing, and synchronous SQLite writes off the HTTP event loop.
          const worker = new Worker(path.join(__dirname, 'import-worker.js'), {
            workerData: { dbPath, dataDir, archivePath, jobId, filename }
          });
          importWorkers.add(worker);
          let workerMessageReceived = false;
          let failureHandled = false;
          const markWorkerFailed = error => {
            if (failureHandled) return;
            failureHandled = true;
            try {
              db.prepare('UPDATE import_jobs SET status = ?, error = ?, finished_at = ? WHERE id = ?')
                .run('failed', error.message || String(error), Date.now(), jobId);
            } catch (_) {}
            fsp.rm(archivePath, { force: true }).catch(() => {});
            console.error('[ChatGPT Exporter] Import worker failed:', error);
          };
          worker.on('message', message => {
            workerMessageReceived = true;
            if (!message || !message.ok) {
              markWorkerFailed(new Error(message && message.error ? message.error : 'Import worker returned an invalid result'));
            }
          });
          worker.on('error', markWorkerFailed);
          worker.on('exit', code => {
            importWorkers.delete(worker);
            if (!workerMessageReceived || code !== 0) {
              markWorkerFailed(new Error('Import worker exited unexpectedly with code ' + code));
            }
          });
        }
        return;
      }

      const assetMatch = pathname.match(/^\/api\/assets\/([a-f0-9]{64})$/i);
      if (request.method === 'GET' && assetMatch) {
        const asset = db.prepare('SELECT storage_path, size, mime_type FROM assets WHERE sha256 = ?').get(assetMatch[1].toLowerCase());
        if (!asset) {
          sendJson(response, 404, { error: 'Asset not found' });
          return;
        }
        const stat = await fsp.stat(asset.storage_path).catch(() => null);
        if (!stat || !stat.isFile()) {
          sendJson(response, 404, { error: 'Asset file is missing' });
          return;
        }
        response.writeHead(200, {
          'Content-Type': asset.mime_type || 'application/octet-stream',
          'Content-Length': stat.size,
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff'
        });
        fs.createReadStream(asset.storage_path).pipe(response);
        return;
      }

      if (request.method === 'GET' && pathname.startsWith('/api/')) {
        sendJson(response, 404, { error: 'API route not found' });
        return;
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') {
        sendJson(response, 405, { error: 'Method not allowed' });
        return;
      }

      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const filePath = path.resolve(publicDir, relative);
      if (filePath !== publicDir && !filePath.startsWith(publicDir + path.sep)) {
        sendJson(response, 403, { error: 'Invalid path' });
        return;
      }
      const stat = await fsp.stat(filePath).catch(() => null);
      if (!stat || !stat.isFile()) {
        sendJson(response, 404, { error: 'Not found' });
        return;
      }
      const contentType = mime.lookup(filePath) || 'application/octet-stream';
      response.writeHead(200, {
        'Content-Type': contentType + (contentType.startsWith('text/') || contentType.includes('javascript') ? '; charset=utf-8' : ''),
        'Content-Length': stat.size,
        'Cache-Control': filePath.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'Content-Security-Policy': "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
      });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(filePath).pipe(response);
    } catch (error) {
      console.error('[ChatGPT Exporter] Request failed:', error);
      if (!response.headersSent) sendJson(response, 500, { error: 'Internal server error' });
      else response.destroy(error);
    }
  });

  server.on('close', () => {
    if (!options.db) db.close();
  });

  return {
    server,
    db,
    dataDir,
    host,
    port,
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, () => {
          server.removeListener('error', reject);
          resolve(server.address());
        });
      });
    }
  };
}

async function startServer(options = {}) {
  const host = options.host || process.env.HOST || '127.0.0.1';
  if (!['127.0.0.1', 'localhost', '::1'].includes(host) && process.env.CHATGPT_EXPORT_ALLOW_REMOTE !== '1') {
    throw new Error('Remote binding is disabled. Set CHATGPT_EXPORT_ALLOW_REMOTE=1 only if you understand the security implications.');
  }
  const app = createServer({ ...options, host });
  const address = await app.listen();
  console.log('ChatGPT SQLite Reader: http://' + host + ':' + address.port);
  console.log('Database: ' + path.join(app.dataDir, 'chatgpt.sqlite'));
  return app;
}

if (require.main === module) {
  startServer().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  createServer,
  startServer,
  makeFtsQuery,
  replaceAssetMarkers,
  getMessagePage
};
