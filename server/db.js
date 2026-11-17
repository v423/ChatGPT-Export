'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const SCHEMA_VERSION = 1;

function openDatabase(filename) {
  if (filename !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }

  const db = new Database(filename, { timeout: 5000 });
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -64000');
  db.pragma('mmap_size = 268435456');

  const schema = [
    "CREATE TABLE IF NOT EXISTS import_jobs (id TEXT PRIMARY KEY, filename TEXT NOT NULL, sha256 TEXT, status TEXT NOT NULL DEFAULT 'queued', total_entries INTEGER NOT NULL DEFAULT 0, processed_entries INTEGER NOT NULL DEFAULT 0, total_bytes INTEGER NOT NULL DEFAULT 0, processed_bytes INTEGER NOT NULL DEFAULT 0, conversations_added INTEGER NOT NULL DEFAULT 0, conversations_updated INTEGER NOT NULL DEFAULT 0, conversations_skipped INTEGER NOT NULL DEFAULT 0, messages_imported INTEGER NOT NULL DEFAULT 0, assets_added INTEGER NOT NULL DEFAULT 0, error TEXT, created_at INTEGER NOT NULL, started_at INTEGER, finished_at INTEGER)",
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_import_jobs_sha256 ON import_jobs(sha256) WHERE sha256 IS NOT NULL AND status = 'completed'",
    "CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL, title TEXT NOT NULL, project_title TEXT, project_path TEXT NOT NULL DEFAULT '', source_path TEXT NOT NULL, created_at INTEGER, updated_at INTEGER, message_count INTEGER NOT NULL DEFAULT 0, raw_sha256 TEXT NOT NULL, raw_json_gzip BLOB NOT NULL, import_id TEXT REFERENCES import_jobs(id), imported_at INTEGER NOT NULL)",
    "CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC, id)",
    "CREATE INDEX IF NOT EXISTS idx_conversations_project ON conversations(project_path, updated_at DESC)",
    "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, message_id TEXT NOT NULL, node_id TEXT NOT NULL, parent_id TEXT, sequence INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'unknown', author_name TEXT, channel TEXT, recipient TEXT, created_at INTEGER, updated_at INTEGER, content_type TEXT, content_text TEXT NOT NULL DEFAULT '', content_json TEXT NOT NULL DEFAULT '{}', metadata_json TEXT NOT NULL DEFAULT '{}', dil_ast_json TEXT NOT NULL DEFAULT '{\"type\":\"root\",\"children\":[]}', is_current_path INTEGER NOT NULL DEFAULT 0, UNIQUE(conversation_id, message_id))",
    "CREATE INDEX IF NOT EXISTS idx_messages_conversation_sequence ON messages(conversation_id, sequence)",
    "CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(conversation_id, parent_id)",
    "CREATE TABLE IF NOT EXISTS assets (sha256 TEXT PRIMARY KEY, storage_path TEXT NOT NULL, size INTEGER NOT NULL, mime_type TEXT NOT NULL, created_at INTEGER NOT NULL)",
    "CREATE TABLE IF NOT EXISTS asset_locations (id INTEGER PRIMARY KEY AUTOINCREMENT, import_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE, archive_path TEXT NOT NULL, base_dir TEXT NOT NULL DEFAULT '', filename TEXT NOT NULL, kind TEXT NOT NULL, sha256 TEXT NOT NULL REFERENCES assets(sha256), UNIQUE(import_id, archive_path))",
    "CREATE INDEX IF NOT EXISTS idx_asset_locations_base_dir ON asset_locations(base_dir, kind)",
    "CREATE INDEX IF NOT EXISTS idx_asset_locations_sha ON asset_locations(sha256)",
    "CREATE TABLE IF NOT EXISTS import_conversations (import_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE, source_path TEXT NOT NULL, PRIMARY KEY(import_id, conversation_id))"
  ].join('\n');
  db.exec(schema);

  db.ftsEnabled = true;
  try {
    db.exec([
      "CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(conversation_id UNINDEXED, message_id UNINDEXED, title, role UNINDEXED, content_text, tokenize = 'unicode61 remove_diacritics 2')",
      "CREATE VIRTUAL TABLE IF NOT EXISTS conversations_fts USING fts5(conversation_id UNINDEXED, title, project_title, tokenize = 'unicode61 remove_diacritics 2')"
    ].join('\n'));
  } catch (error) {
    db.ftsEnabled = false;
    db.ftsError = error.message;
    db.exec([
      "CREATE TABLE IF NOT EXISTS messages_fts (conversation_id TEXT NOT NULL, message_id TEXT NOT NULL, title TEXT NOT NULL, role TEXT NOT NULL, content_text TEXT NOT NULL)",
      "CREATE INDEX IF NOT EXISTS idx_messages_fts_conversation ON messages_fts(conversation_id)",
      "CREATE TABLE IF NOT EXISTS conversations_fts (conversation_id TEXT PRIMARY KEY, title TEXT NOT NULL, project_title TEXT NOT NULL DEFAULT '')"
    ].join('\n'));
  }

  const currentVersion = Number(db.pragma('user_version', { simple: true })) || 0;
  if (currentVersion < SCHEMA_VERSION) db.pragma('user_version = ' + SCHEMA_VERSION);
  return db;
}

function closeDatabase(db) {
  if (db && db.open) db.close();
}

module.exports = { openDatabase, closeDatabase, SCHEMA_VERSION };
