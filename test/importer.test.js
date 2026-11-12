'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const yazl = require('yazl');
const { openDatabase, closeDatabase } = require('../server/db');
const { importZipFile } = require('../server/importer');

async function writeFixtureZip(filename, conversation) {
  const zip = new yazl.ZipFile();
  zip.addBuffer(Buffer.from(JSON.stringify(conversation)), 'Demo conversation.json');
  zip.addBuffer(Buffer.from('sample-image-binary'), 'images/img_01_file_abc123.png');
  zip.end();
  await new Promise((resolve, reject) => {
    zip.outputStream.on('error', reject);
    const output = fs.createWriteStream(filename);
    output.on('error', reject);
    output.on('finish', resolve);
    zip.outputStream.pipe(output);
  });
}

async function main() {
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'chatgpt-sqlite-test-'));
  const archivePath = path.join(tempDir, 'fixture.zip');
  const dataDir = path.join(tempDir, 'data');
  const db = openDatabase(':memory:');
  const conversation = {
    conversation_id: 'fixture-conversation',
    title: 'Rich fixture',
    create_time: 1700000000,
    update_time: 1700000100,
    current_node: 'assistant-node',
    mapping: {
      root: { parent: null, children: ['user-node'], message: null },
      'user-node': {
        parent: 'root',
        children: ['assistant-node'],
        message: {
          id: 'user-message',
          author: { role: 'user' },
          create_time: 1700000000,
          content: { content_type: 'text', parts: ['Please summarize this.'] }
        }
      },
      'assistant-node': {
        parent: 'user-node',
        children: [],
        message: {
          id: 'assistant-message',
          author: { role: 'assistant' },
          create_time: 1700000100,
          content: { content_type: 'text', parts: ['<row><Entity category="software" value="Demo"/></row>'] },
          metadata: { channel: 'final' }
        }
      }
    }
  };

  try {
    await writeFixtureZip(archivePath, conversation);
    db.prepare('INSERT INTO import_jobs (id, filename, status, created_at) VALUES (?, ?, ?, ?)')
      .run('job-fixture', 'fixture.zip', 'queued', Date.now());
    const result = await importZipFile({
      db,
      archivePath,
      dataDir,
      jobId: 'job-fixture',
      filename: 'fixture.zip',
      deleteArchiveOnFinish: false
    });

    assert.equal(result.status, 'completed');
    assert.equal(result.conversationsAdded, 1);
    assert.equal(result.messagesImported, 2);
    assert.equal(result.assetsAdded, 1);
    assert.equal(fs.existsSync(archivePath), true, 'CLI/source archives must not be deleted');
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM messages').get().count, 2);
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM assets').get().count, 1);
    const stored = db.prepare('SELECT dil_ast_json FROM messages WHERE message_id = ?').get('assistant-message');
    assert.match(stored.dil_ast_json, /Entity/);
  } finally {
    closeDatabase(db);
    await fsp.rm(tempDir, { recursive: true, force: true });
  }
}

main().then(() => {
  console.log('ZIP importer tests passed.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
