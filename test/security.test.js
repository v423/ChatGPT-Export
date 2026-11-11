const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const tm = fs.readFileSync(path.join(__dirname, '..', 'Tampermonkey.js'), 'utf8');
const reader = fs.readFileSync(path.join(__dirname, '..', 'reader/assets/reader.js'), 'utf8');
const jszip = fs.readFileSync(path.join(__dirname, '..', 'reader/vendor/jszip.min.js'), 'utf8');

assert.doesNotMatch(tm, /^\s*\/\/\s*@require\s+https?:\/\//m, 'userscript must not load executable code from a remote CDN');
assert.ok(tm.includes(jszip.trim()), 'userscript should embed the same vendored JSZip source used by the reader');
assert.match(tm, /function markdownExternalImageLink\(image\)/, 'failed image downloads should keep a link to the original HTTPS asset');
assert.match(tm, /function installBundledJSZip\(\)/, 'bundled JSZip should be isolated from host-page module loaders');
assert.doesNotMatch(tm, /XMLHttpRequest\.prototype\.open|this\.getRequestHeader/, 'broken XHR header interception must be removed');
assert.doesNotMatch(tm, /function tryCaptureToken/, 'the fetch observer must not capture bearer tokens');
assert.doesNotMatch(tm, /credentials\s*:\s*['"]include['"]/, 'asset requests must not send credentials to arbitrary origins');
assert.doesNotMatch(tm, /sendBeacon|GM_xmlhttpRequest|WebSocket|EventSource/, 'the exporter must not add background upload or socket channels');

const captureStart = tm.indexOf('(function captureWorkspaceIdsOnly()');
const captureEnd = tm.indexOf('async function ensureAccessToken()', captureStart);
assert.ok(captureStart >= 0 && captureEnd > captureStart, 'workspace observer should exist');
const captureBlock = tm.slice(captureStart, captureEnd);
assert.match(captureBlock, /ChatGPT-Account-Id/, 'workspace observer should read the workspace header');
assert.doesNotMatch(captureBlock, /headers\.get\(['"]Authorization['"]\)|tryCaptureToken/, 'workspace observer must not inspect authorization headers');

const assetHelperStart = tm.indexOf('const TRUSTED_ASSET_DOMAINS');
const assetHelperEnd = tm.indexOf('async function fetchImageBlob', assetHelperStart);
assert.ok(assetHelperStart >= 0 && assetHelperEnd > assetHelperStart, 'asset request guard should exist');
const assetHelpers = tm.slice(assetHelperStart, assetHelperEnd);
const assetFactory = new Function('URL', 'location', assetHelpers + '; return createAssetFetchRequest;');
const createAssetFetchRequest = assetFactory(URL, { origin: 'https://chatgpt.com' });

const sameOrigin = createAssetFetchRequest('/backend-api/files/file_123/download', 'secret-token');
assert.equal(sameOrigin.url, 'https://chatgpt.com/backend-api/files/file_123/download');
assert.equal(sameOrigin.options.credentials, 'same-origin');
assert.equal(sameOrigin.options.headers.Authorization, 'Bearer secret-token');

const trustedCdn = createAssetFetchRequest('https://files.oaiusercontent.com/file_123', 'secret-token');
assert.equal(trustedCdn.options.credentials, 'omit');
assert.equal(trustedCdn.options.headers, undefined, 'cross-origin CDN requests must not carry Authorization');
assert.equal(trustedCdn.options.referrerPolicy, 'no-referrer');
assert.throws(() => createAssetFetchRequest('//attacker.example/collect', 'secret-token'));
assert.throws(() => createAssetFetchRequest('https://attacker.example/collect', 'secret-token'));
assert.throws(() => createAssetFetchRequest('http://files.oaiusercontent.com/file_123', 'secret-token'));

const imageHelperStart = reader.indexOf('      function safeImageUrl(url) {');
const imageHelperEnd = reader.indexOf('      function downloadBlob(blob, filename)', imageHelperStart);
assert.ok(imageHelperStart >= 0 && imageHelperEnd > imageHelperStart, 'offline image URL guard should exist');
const safeImageUrl = new Function(reader.slice(imageHelperStart, imageHelperEnd) + '; return safeImageUrl;')();
assert.equal(safeImageUrl('https://tracker.example/pixel.png'), '', 'remote images must not load automatically in the offline reader');
assert.equal(safeImageUrl('blob:https://localhost/example'), 'blob:https://localhost/example');
assert.equal(safeImageUrl('data:image/png;base64,AAAA'), 'data:image/png;base64,AAAA');
assert.equal(safeImageUrl('data:image/svg+xml,<svg></svg>'), '', 'active SVG data URLs must not be embedded as images');
assert.match(reader, /image\.localUrl \|\| image\.url \|\| image\.download_url/, 'reader should retain a clickable fallback for images that were not downloaded');

const linkHelperStart = reader.indexOf('      function safeUrl(url) {');
const linkHelperEnd = reader.indexOf('      function safeImageUrl(url)', linkHelperStart);
assert.ok(linkHelperStart >= 0 && linkHelperEnd > linkHelperStart, 'link URL guard should exist');
const safeUrl = new Function(reader.slice(linkHelperStart, linkHelperEnd) + '; return safeUrl;')();
assert.equal(safeUrl('data:image/svg+xml,<svg></svg>'), '', 'data URLs must not be allowed as clickable links');
assert.equal(safeUrl('javascript:alert(1)'), '', 'script URLs must be rejected');

const normalizeStart = reader.indexOf('      function normalizeZipPath(path) {');
const normalizeEnd = reader.indexOf('      function dirname(path)', normalizeStart);
const validationStart = reader.indexOf('      function validateImportFileSize(file) {');
const validationEnd = reader.indexOf('      async function readZip(file)', validationStart);
assert.ok(normalizeStart >= 0 && normalizeEnd > normalizeStart && validationStart > 0 && validationEnd > validationStart, 'ZIP validation helpers should exist');
const zipHelperSource = reader.slice(normalizeStart, normalizeEnd) + reader.slice(validationStart, validationEnd);
const zipHelperFactory = new Function(
  'MAX_IMPORT_ZIP_BYTES',
  'MAX_IMPORT_ENTRIES',
  'MAX_IMPORT_ENTRY_UNCOMPRESSED_BYTES',
  'MAX_IMPORT_TOTAL_UNCOMPRESSED_BYTES',
  't',
  'formatBytes',
  zipHelperSource + '; return { validateImportFileSize, validateZipEntries };'
);
const zipHelpers = zipHelperFactory(
  512 * 1024 * 1024,
  100000,
  512 * 1024 * 1024,
  2 * 1024 * 1024 * 1024,
  key => key,
  value => String(value)
);
assert.doesNotThrow(() => zipHelpers.validateImportFileSize({ size: 1024 }));
assert.throws(() => zipHelpers.validateImportFileSize({ size: 512 * 1024 * 1024 + 1 }), /error.zipTooLarge/);

const validEntries = zipHelpers.validateZipEntries([
  { name: 'conversations/chat.json', dir: false, _data: { uncompressedSize: 100 } },
  { name: 'images/image.png', dir: false, _data: { uncompressedSize: 200 } },
  { name: 'images/', dir: true, _data: { uncompressedSize: 0 } }
]);
assert.deepEqual(Array.from(validEntries, item => item.name).sort(), ['conversations/chat.json', 'images/image.png']);

assert.throws(() => zipHelpers.validateZipEntries([
  { name: '../../outside.txt', dir: false, _data: { uncompressedSize: 1 } }
]), /error.zipUnsafePath/);
assert.throws(() => zipHelpers.validateZipEntries([
  { name: '/absolute.txt', dir: false, _data: { uncompressedSize: 1 } }
]), /error.zipUnsafePath/);
assert.throws(() => zipHelpers.validateZipEntries([
  { name: 'folder/./file.txt', dir: false, _data: { uncompressedSize: 1 } },
  { name: 'folder/file.txt', dir: false, _data: { uncompressedSize: 1 } }
]), /error.zipDuplicatePath/);
assert.throws(() => zipHelpers.validateZipEntries([
  { name: 'huge.bin', dir: false, _data: { uncompressedSize: 512 * 1024 * 1024 + 1 } }
]), /error.zipEntryTooLarge/);
assert.throws(() => zipHelpers.validateZipEntries(
  Array.from({ length: 100001 }, (_, i) => ({ name: 'folder-' + i + '/', dir: true }))
), /error.zipTooManyEntries/);
assert.throws(() => zipHelpers.validateZipEntries(
  Array.from({ length: 5 }, (_, i) => ({ name: 'file-' + i + '.bin', dir: false, _data: { uncompressedSize: 512 * 1024 * 1024 } }))
), /error.zipExpandedTooLarge/);

console.log('security checks ok');
