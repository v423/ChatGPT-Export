# Node.js + SQLite Reader

## Goals

- Handle multi-hundred-megabyte daily exports without loading the archive or all conversations into browser memory.
- Keep message text, conversation metadata, raw conversation JSON, and search indexes in SQLite.
- Keep binary assets in a local content-addressed file store to avoid bloating the database with large image/file BLOBs.
- Preserve raw DIL-like component markup and render a safe offline representation.

## Runtime

- Node.js >= 20.11
- better-sqlite3 for the SQLite binding
- yauzl for sequential ZIP entry streaming
- marked + sanitize-html for Markdown parsing and HTML sanitization

Run npm install, then npm start. The service binds to 127.0.0.1:4317 by default. The database is data/chatgpt.sqlite; assets are stored under data/assets/<sha-prefix>/<sha256>.

## Import pipeline

1. The browser streams the selected ZIP file to the local HTTP service.
2. The server writes the upload to a temporary file and computes its SHA-256.
3. yauzl reads one ZIP entry at a time. Unsafe paths, symbolic links, oversized entries, excessive compression ratios, and archives above configured limits are rejected.
4. Each conversation JSON is parsed independently. The raw JSON is gzip-compressed into SQLite; messages are normalized into rows and DIL AST JSON is stored alongside the original content.
5. Image and file entries are streamed to a temporary file, hashed, and moved to a SHA-256 content path. Duplicate binary assets share one stored file.
6. Import progress and per-archive provenance are recorded in import_jobs, import_conversations, and asset_locations.

The importer is idempotent for identical archives and uses the raw conversation hash to skip unchanged conversations. CLI imports never delete the caller's source ZIP.

## SQLite model

- conversations: conversation identity, title, project path, timestamps, raw JSON gzip BLOB, source hash, import provenance.
- messages: one row per message with parent/node IDs, sequence, role, channel, content text/JSON, metadata, DIL AST, and current-path flag.
- messages_fts: FTS5 index for title and message text; a LIKE fallback is used when FTS5 is unavailable.
- assets and asset_locations: content-addressed file metadata and per-import archive paths.
- import_jobs: upload/import status, progress, counts, and errors.

SQLite uses WAL, foreign keys, a bounded page cache, and prepared statements. Message pages are fetched by sequence; the browser never receives the entire database.

## HTTP API

- GET /api/health
- GET /api/stats
- GET /api/conversations?limit=50&offset=0&q=...
- GET /api/conversations/:id?limit=80
- GET /api/conversations/:id/messages?before=<sequence>&limit=80
- GET /api/imports/:id
- POST /api/import with the ZIP file as the request body and X-File-Name
- GET /api/assets/:sha256

The server binds to loopback by default and does not enable CORS. Remote binding requires an explicit CHATGPT_EXPORT_ALLOW_REMOTE=1 opt-in.

## Rich content

The renderer parses known component tags without evaluating JavaScript expressions. It supports layout components (row, col, box, grid), text and badges, entities, citation references, safe links, tables, chart SVG, Mermaid-style flowcharts, code blocks, and static map/location summaries.

- Cite refs are preserved as citation chips; a source link is shown only when exported message metadata contains a matching URL.
- AsyncImage query is rendered as a placeholder because a search query is not an exported image asset. External images are never fetched automatically.
- Markdown image references only render as images when they resolve to a local /api/assets/<sha256> resource.
- Unknown component tags are shown as safe placeholders rather than executed.

## Current limits / follow-up

- The importer currently targets ZIPs produced by this exporter: conversation JSON plus images/ and files/ folders. Markdown-only archives are not yet indexed.
- The Mermaid renderer intentionally supports common flowchart / graph node-and-edge syntax, not the complete Mermaid language.
- The reader loads the latest 80 messages and fetches earlier pages on demand. A single message with an exceptionally large payload is still returned as one unit.
- Existing reader/index.html remains as a legacy browser-only reader for small archives; it is not the recommended path for large datasets.
