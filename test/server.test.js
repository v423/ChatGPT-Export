'use strict';

const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');
const { openDatabase, closeDatabase } = require('../server/db');
const { createServer } = require('../server/index');

async function main() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'chatgpt-api-test-'));
  const db = openDatabase(':memory:');
  const app = createServer({ db, dataDir: tempDir, port: 0 });

  try {
    db.prepare('INSERT INTO import_jobs (id, filename, status, created_at) VALUES (?, ?, ?, ?)')
      .run('api-job', 'fixture.zip', 'completed', Date.now());
    db.prepare('INSERT INTO conversations (id, conversation_id, title, project_title, project_path, source_path, created_at, updated_at, message_count, raw_sha256, raw_json_gzip, import_id, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('api-conv', 'api-conv', 'API fixture', null, '', 'fixture.json', 1700000000, 1700000100, 2, 'raw-hash', Buffer.from('gzip'), 'api-job', Date.now());
    const insertMessage = db.prepare('INSERT INTO messages (conversation_id, message_id, node_id, sequence, role, content_text, content_json, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    insertMessage.run('api-conv', 'msg-0', 'node-0', 0, 'user', 'hello from user', '{}', '{}');
    insertMessage.run('api-conv', 'msg-1', 'node-1', 1, 'assistant', '<row><Entity category="software" value="SQLite"/></row>', '{}', '{}');
    db.prepare('INSERT INTO messages_fts (conversation_id, message_id, title, role, content_text) VALUES (?, ?, ?, ?, ?)')
      .run('api-conv', 'msg-0', 'API fixture', 'user', 'hello from user');
    db.prepare('INSERT INTO messages_fts (conversation_id, message_id, title, role, content_text) VALUES (?, ?, ?, ?, ?)')
      .run('api-conv', 'msg-1', 'API fixture', 'assistant', 'SQLite');

    const address = await app.listen();
    const base = 'http://127.0.0.1:' + address.port;
    const health = await fetch(base + '/api/health').then(response => response.json());
    assert.equal(health.ok, true);

    const list = await fetch(base + '/api/conversations?limit=10').then(response => response.json());
    assert.equal(list.total, 1);
    assert.equal(list.items[0].id, 'api-conv');

    const search = await fetch(base + '/api/conversations?q=hello').then(response => response.json());
    assert.equal(search.total, 1);

    const conversation = await fetch(base + '/api/conversations/api-conv?limit=1').then(response => response.json());
    assert.equal(conversation.messages.length, 1);
    assert.equal(conversation.messages[0].sequence, 1);
    assert.equal(conversation.hasOlder, true);
    assert.match(conversation.messages[0].contentHtml, /dil-entity/);

    const older = await fetch(base + '/api/conversations/api-conv/messages?before=1&limit=1').then(response => response.json());
    assert.equal(older.items[0].sequence, 0);
    assert.equal(older.hasOlder, false);
  } finally {
    await new Promise(resolve => app.server.close(resolve));
    closeDatabase(db);
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().then(() => {
  console.log('HTTP API tests passed.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
