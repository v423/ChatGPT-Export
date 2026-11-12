# ChatGPT Archive Reader — Requirements and Acceptance

> Status: implementation in progress. A feature is not complete until its acceptance criteria are verified.

## 1. Goal

Build a local-first archive pipeline for large ChatGPT conversation exports. A daily archive may exceed 100 MB, so the primary reader must use Node.js and SQLite rather than loading the entire ZIP or dataset into browser IndexedDB.

The archive must remain useful to both people and local CLI/AI tools: retain the original JSON, provide readable Markdown, keep attachments as separate files, and offer PDF/print as a fallback.

## 2. Export contract

### 2.1 Source fidelity

- Preserve the original ChatGPT conversation JSON without redaction or lossy normalization.
- Keep the full mapping, including parent/child relationships, alternative branches, current_node, timestamps, author/channel metadata, content references, and attachment metadata.
- Markdown is a reading/indexing view, not the source of truth. Do not silently discard source data to make Markdown prettier.
- Do not use screenshots as an export format.
- Keep images and uploaded/generated files as separate binary assets, with stable references from Markdown and structured data.
- Report failed conversations and missing assets in an export diagnostic instead of silently treating the archive as complete.

### 2.2 Editable standard format

Add a versioned, tool-independent format named chat-archive/v1 alongside the original raw JSON.

The planned archive contract is:

- manifest.json: format/version, exporter version, generated time, conversation counts, asset inventory, checksums, and relative paths.
- conversations/<id>.json: normalized conversation metadata and messages, retaining source node IDs, parent IDs, branch membership, current-path flags, timestamps, roles, channels, structured content, citations, and attachment references.
- conversations/<id>.md: human/CLI-readable Markdown.
- images/ and files/: binary assets addressed by stable relative paths.
- Original ChatGPT JSON remains included unchanged.

The normalized JSON must be independently editable and must not overwrite or mutate the original raw JSON. Schema migration must be versioned.

Status: raw JSON + Markdown + assets are currently exported. The versioned manifest and normalized chat-archive/v1 export are not implemented yet.

### 2.3 Lazy-loaded context

- Prefer the conversation detail API when it returns the complete mapping.
- Verify completeness using the returned mapping/current-node structure and export diagnostics.
- If the API response is incomplete because the page has lazily loaded additional context, use a controlled DOM auto-scroll fallback to load all messages before finalizing.
- The fallback must not use screenshots and must not silently stop at the initially rendered viewport.

Status: direct conversation API retrieval is implemented. An explicit completeness detector and auto-scroll fallback still need implementation/verification.

## 3. Conversation-list performance

- Render locally cached metadata immediately when the export picker opens.
- Refresh from ChatGPT APIs in the background; do not walk the visible interface and fetch every row individually.
- Keep list cache limited to IDs, titles, timestamps, archive state, project/workspace labels, and pagination/completeness metadata. Never store access tokens or message bodies in the list cache.
- On a warm cache, refresh the newest root/archive page and the first page of each project, retaining previously indexed older pages.
- Perform a full paginated scan only for a cold/incomplete cache or an explicit full refresh.
- Keep personal, archived, project, and team/workspace scopes distinct.
- If a refresh fails, show cached results with an explicit incomplete/stale warning.

Current implementation: local-first cache, 2-minute root freshness, 30-minute project freshness, 7-day cache retention, first-page incremental refresh, and API pagination for initial/full scans. Cache capacity and browser storage quota still need large-account testing.

## 4. Large-archive reader

- Runtime: Node.js 20.11 or newer.
- Persistence: SQLite, not IndexedDB, for the large-archive reader.
- ZIP import: sequential entry streaming; never extract the entire archive to memory or disk first.
- Run decompression, JSON parsing, and synchronous SQLite writes in a worker thread so imports do not block the HTTP event loop.
- Store original conversation JSON as gzip-compressed SQLite data; normalize messages and metadata into queryable rows.
- Store binary assets separately using SHA-256 content-addressed paths and deduplicate identical files.
- Keep import provenance, checksums, progress, counts, and errors.
- Make identical archive imports idempotent; preserve the user's source ZIP during CLI imports.
- Use keyset/sequence pagination for messages and bounded pages for the conversation list.
- Do not select the compressed raw JSON BLOB or unused message JSON/AST columns when rendering a message page.
- Provide full-text search with a substring-search fallback for CJK languages.
- Keep the service bound to loopback by default. Remote binding requires an explicit opt-in.

## 5. Rich-content fidelity

The reader must preserve the original component markup and render a safe offline approximation. It must not evaluate JavaScript expressions, execute AppBlock content, or automatically fetch remote images.

### 5.1 Required component families

- Layout: row, col, box, grid, flow, card, divider, spacer.
- Text: text, title, caption, label, badge, bold, italic, underline, strikethrough, code, math.
- Data and references: Entity, Cite, CodeCite, FileCite, Link.
- Media: AsyncImage, AsyncImageGroup, AsyncVideo, Markdown images, local attachments.
- Structured data: Markdown/DIL tables, Chart (bar, line, scatter, pie), Mermaid flowcharts.
- Other: MapWidgetV2 static location summary, CodeBlock, WritingBlock, FollowUp, FollowUpPillGroup, AppBlock safe placeholder.

### 5.2 Rendering rules

- Preserve nested layout, spacing, alignment, width/aspect ratio, table spans, and safe sizing attributes where available.
- Preserve citation reference IDs; turn them into links only when the exported metadata contains a matching source URL.
- Resolve images only to local exported assets. An AsyncImage query without a local binary must display a clear placeholder with the query, not a broken or remote image.
- Render common Mermaid flowchart syntax; unsupported syntax must remain visible as source/fallback, not disappear.
- Render AppBlock as a safe source/placeholder. Never execute its HTML/JavaScript.
- Keep original DIL text and normalized AST available for future renderer improvements.

Current implementation: a safe subset is implemented, including nested layouts, entities, citations, links, tables, bar/line/scatter/pie charts, basic Mermaid flowcharts, media placeholders, static map summaries, and a non-executing AppBlock fallback. Full DIL parity is not claimed.

## 6. Privacy and security

- Do not send conversation bodies, tokens, or attachments to unrelated third-party services.
- The list observer may capture workspace identifiers and list metadata only; it must not inspect or persist bearer tokens.
- Never auto-load remote images from Markdown or raw HTML.
- Serve only safe raster images and audio/video as inline previews. Serve HTML, SVG, scripts, documents, and other attachments as downloads.
- Sanitize Markdown HTML and restrict SVG paint references to local fragments or safe color values.
- Reject ZIP path traversal, symbolic links, excessive entry counts, oversized entries, extreme compression ratios, and excessive total expansion.
- Keep remote binding disabled unless explicitly enabled.

## 7. Acceptance criteria

| Area | Acceptance |
|---|---|
| Source fidelity | Raw JSON remains unchanged after export/import; all mapping nodes and branches remain represented |
| Markdown | User, assistant, tool roles, citations, image/file references, and non-root/orphan nodes are not silently dropped |
| Lazy loading | Completeness is verified; fallback scroll loads the full visible conversation when API data is incomplete |
| List performance | Warm cache appears immediately; incremental refresh does not re-fetch every historical project page |
| Large import | A 100 MB+ daily archive imports without browser IndexedDB and without loading the whole ZIP into memory |
| SQLite paging | Reader endpoints do not read raw gzip BLOBs or unused content JSON/AST for ordinary message pages |
| Search | Chinese substring search works; project filtering is applied before pagination |
| Rich content | The nested row / AsyncImage / box / Entity / Cite / Link sample retains its hierarchy and content |
| Charts/tables | Pie, line, bar, scatter, Mermaid flowchart, table spans, and alignment render correctly or show an explicit fallback |
| Security | Remote HTML images do not request external URLs; active attachments are downloads; scripts never execute |
| Portability | Original ZIP and raw JSON remain available; normalized JSON is versioned; assets are separate and checksummed |
| PDF | A selectable-text print/PDF fallback remains available |

## 8. Current status and known gaps

### Implemented in the current branches

- Tampermonkey export to ZIP with raw JSON, Markdown, and separate assets.
- Local-first conversation-list caching and incremental project refresh.
- Iterative Markdown traversal across reachable and orphan mapping nodes.
- Node.js + SQLite schema, streaming ZIP importer, worker-thread import, FTS, local HTTP API, and paginated reader.
- Content-addressed asset storage and import provenance.
- Initial DIL parser/renderer with the supported subset listed above.
- Safer attachment delivery and remote-image sanitization.

### Not yet complete or not yet verified

- chat-archive/v1 manifest and normalized editable JSON export.
- Explicit API completeness diagnostics and lazy-load auto-scroll fallback.
- PDF/print export in the new Node.js reader (the legacy static reader retains its print/PDF flow).
- Markdown-only archive import.
- Full DIL/Mermaid parity and real-world rendering comparison against ChatGPT.
- Performance test with the user's actual 100 MB+ daily archive.
- Automated test/CI pass for the current stacked PRs.

Do not mark the project complete until these gaps are either implemented or explicitly accepted as out of scope.
