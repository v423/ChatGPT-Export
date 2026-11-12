# Node.js + SQLite Reader

## Runtime and storage

- Node.js >= 20.11.
- better-sqlite3 for SQLite, yauzl for sequential ZIP entry streaming, marked and sanitize-html for Markdown rendering and sanitization.
- Database: data/chatgpt.sqlite; assets: data/assets/<sha-prefix>/<sha256>.
- The service binds to 127.0.0.1:4317 by default. Remote binding requires CHATGPT_EXPORT_ALLOW_REMOTE=1.

## Import pipeline

1. The browser streams the selected ZIP to the local HTTP service.
2. The server writes the upload to a temporary file and computes its SHA-256.
3. A worker thread performs decompression, JSON parsing, and synchronous SQLite writes so the HTTP event loop remains responsive.
4. yauzl reads one ZIP entry at a time. Path traversal, symlinks, oversized entries, extreme compression ratios, and archives above configured limits are rejected.
5. Each conversation JSON is parsed independently. Original JSON is gzip-compressed into SQLite; messages are normalized into rows and a DIL AST is stored alongside the original text.
6. Images and files are streamed to temporary files, hashed, and moved to content-addressed paths. Duplicate binary assets share one stored file.
7. Import progress and provenance are recorded in import_jobs, import_conversations, and asset_locations.

Identical completed archives are skipped. CLI imports never delete the caller's source ZIP.

## SQLite model

- conversations: identity, title, project path, timestamps, raw JSON gzip BLOB, source hash, import provenance.
- messages: node/message IDs, parent IDs, sequence, role, channel, content text/JSON, metadata, DIL AST, current-path flag.
- messages_fts: FTS5 index for title and message text; LIKE fallback when FTS5 is unavailable.
- assets and asset_locations: content-addressed asset metadata and per-import archive paths.
- import_jobs: import status, progress, counts, and errors.

SQLite uses WAL, foreign keys, a bounded page cache, and prepared statements. Message pages select only the columns needed for rendering; ordinary reader requests do not load the raw JSON BLOB, full content JSON, or stored AST. Message pages are fetched by sequence.

## HTTP API

- GET /api/health
- GET /api/stats
- GET /api/conversations?limit=50&offset=0&q=...&project=...
- GET /api/conversations/:id?limit=80
- GET /api/conversations/:id/messages?before=<sequence>&limit=80
- GET /api/imports/:id
- POST /api/import with the ZIP body and X-File-Name
- GET /api/assets/:sha256

CJK substring search uses SQLite LIKE rather than relying only on unicode61 token matching. Project filters are applied in SQL before pagination.

## Rich content

The renderer parses a safe subset of DIL without evaluating expressions or executing embedded JavaScript.

- Layout: row, col, box, grid, flow, card, table, divider, spacer.
- Text/data: text, title, caption, label, badge, entity, citations, safe links, code, math.
- Media: local images, AsyncImage placeholders, AsyncVideo placeholders/local media, and file references.
- Structured content: Markdown/DIL tables, bar/line/scatter/pie charts, common Mermaid flowcharts, static MapWidgetV2 summaries, CodeBlock and WritingBlock.
- AppBlock: source/placeholder only. Arbitrary HTML/JavaScript is never executed.
- Cite refs remain visible. A citation becomes a clickable link only when the exported metadata contains a matching source URL.
- AsyncImage query is displayed as a placeholder if the export has no local binary. External images are not fetched.
- Raw HTML image tags lose remote src attributes. SVG paint values and marker references are restricted to safe values/local fragments.
- Markdown images display only when they resolve to a local /api/assets/<sha256> path.

The Mermaid renderer covers common flowchart/graph node-and-edge syntax, not the full Mermaid grammar. Unsupported component forms must remain visible as a safe fallback.

## Asset delivery and safety

- Only safe raster image formats and audio/video media are served inline.
- HTML, SVG, scripts, documents, and other files are served as attachments with nosniff and a restrictive content security policy.
- The reader does not automatically load remote images.
- The server has no CORS allowance and binds to loopback by default.

## Current limits

- The importer targets this exporter's ZIP layout: conversation JSON plus images/ and files/ folders. Markdown-only ZIP archives are not indexed yet.
- A single unusually large message is still returned as one page item.
- The new Node.js reader does not yet provide its own PDF/print export; the legacy static reader retains its print/PDF workflow.
- Full DIL/Mermaid parity is not claimed.
- A 100 MB+ real-world archive benchmark and complete automated CI pass are still pending.
