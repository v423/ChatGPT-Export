'use strict';

const { parentPort, workerData } = require('node:worker_threads');
const { openDatabase, closeDatabase } = require('./db');
const { importZipFile } = require('./importer');

async function main() {
  const db = openDatabase(workerData.dbPath);
  try {
    const result = await importZipFile({
      db,
      archivePath: workerData.archivePath,
      dataDir: workerData.dataDir,
      jobId: workerData.jobId,
      filename: workerData.filename,
      deleteArchiveOnFinish: true
    });
    parentPort.postMessage({ ok: true, result });
  } catch (error) {
    parentPort.postMessage({ ok: false, error: error.message || String(error) });
    process.exitCode = 1;
  } finally {
    closeDatabase(db);
  }
}

main().catch(error => {
  parentPort.postMessage({ ok: false, error: error.message || String(error) });
  process.exitCode = 1;
});
