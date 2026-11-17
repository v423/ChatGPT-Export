'use strict';

const assert = require('node:assert/strict');
const { openDatabase, closeDatabase } = require('../server/db');

const db = openDatabase(':memory:');
try {
  db.prepare('INSERT INTO import_jobs (id, filename, status, created_at) VALUES (?, ?, ?, ?)')
    .run('job-1', 'fixture.zip', 'completed', Date.now());
  db.prepare('INSERT INTO conversations (id, conversation_id, title, project_title, project_path, source_path, created_at, updated_at, message_count, raw_sha256, raw_json_gzip, import_id, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run('conv-1', 'conv-1', 'SQLite Test', null, '', 'fixture.json', 1700000000, 1700000100, 1, 'hash', Buffer.from('gzip'), 'job-1', Date.now());
  db.prepare('INSERT INTO messages (conversation_id, message_id, node_id, sequence, role, content_text) VALUES (?, ?, ?, ?, ?, ?)')
    .run('conv-1', 'msg-1', 'node-1', 0, 'assistant', 'SQLite full text search');
  db.prepare('INSERT INTO messages_fts (conversation_id, message_id, title, role, content_text) VALUES (?, ?, ?, ?, ?)')
    .run('conv-1', 'msg-1', 'SQLite Test', 'assistant', 'SQLite full text search');

  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM conversations').get().count, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM messages').get().count, 1);
  if (db.ftsEnabled) {
    const found = db.prepare("SELECT conversation_id FROM messages_fts WHERE messages_fts MATCH 'SQLite'").get();
    assert.equal(found.conversation_id, 'conv-1');
  }
} finally {
  closeDatabase(db);
}

console.log('SQLite database tests passed.');
