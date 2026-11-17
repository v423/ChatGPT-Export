'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { openDatabase, closeDatabase } = require('./db');
const { importZipFile } = require('./importer');

async function main() {
  const [command, archivePath] = process.argv.slice(2);
  const dataDir = path.resolve(process.env.CHATGPT_EXPORT_DATA_DIR || 'data');
  const db = openDatabase(path.join(dataDir, 'chatgpt.sqlite'));

  try {
    if (command === 'import') {
      if (!archivePath) {
        throw new Error('Usage: node server/cli.js import <archive.zip>');
      }
      if (!fs.existsSync(archivePath)) throw new Error('Archive not found: ' + archivePath);
      const jobId = crypto.randomUUID();
      const filename = path.basename(archivePath);
      db.prepare('INSERT INTO import_jobs (id, filename, status, created_at) VALUES (?, ?, ?, ?)')
        .run(jobId, filename, 'queued', Date.now());
      const result = await importZipFile({
        db,
        archivePath: path.resolve(archivePath),
        dataDir,
        jobId,
        filename,
        deleteArchiveOnFinish: false
      });
      console.log(JSON.stringify({ jobId, ...result }, null, 2));
      return;
    }

    if (command === 'stats') {
      const conversations = db.prepare('SELECT COUNT(*) AS count FROM conversations').get().count;
      const messages = db.prepare('SELECT COUNT(*) AS count FROM messages').get().count;
      const assets = db.prepare('SELECT COUNT(*) AS count FROM assets').get().count;
      console.log(JSON.stringify({ conversations, messages, assets, database: path.join(dataDir, 'chatgpt.sqlite') }, null, 2));
      return;
    }

    throw new Error('Usage: node server/cli.js <import <archive.zip>|stats>');
  } finally {
    closeDatabase(db);
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exitCode = 1;
});
