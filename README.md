# ChatGPT Universal Exporter

[![CI](https://github.com/OwlCt/ChatGPT-Export/actions/workflows/ci.yml/badge.svg)](https://github.com/OwlCt/ChatGPT-Export/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[简体中文](README_CN.md) · [繁體中文](README_TW.md)

ChatGPT Universal Exporter exports ChatGPT conversations to a local ZIP archive. Large archives are read through a local Node.js + SQLite application with streaming ZIP import, paginated queries, and full-text search. Conversation data stays on the user's machine.

The project has three parts:

- `Tampermonkey.js` — a userscript that runs on ChatGPT pages and packages raw JSON, Markdown, images, and attachments into a ZIP download.
- `server/` and `app/public/` — a local Node.js + SQLite reader for large archives.
- `reader/index.html` — the legacy browser-only reader, retained for small archives and its existing print/PDF workflow.

It is intended for personal backups, archiving project and team-workspace conversations, and reading through history offline.

## Features

- **Export scope** — personal conversations, project conversations, and team workspaces, either as a full backup or as a selected subset.
- **Dual-format output** — every conversation is saved as both raw JSON and converted Markdown, suited to indexing and reading respectively, with project folder structure preserved.
- **Asset extraction** — generated images and uploaded attachments are saved into `images/` and `files/` whenever a download URL is available in the conversation metadata.
- **Reading and search** — the reader supports title and full-text search, message and code-block copying, image preview, and local file links.
- **Local database** — the new reader persists conversations, messages, and search indexes in SQLite; binary assets use content-addressed files. The legacy static reader still uses IndexedDB.
- **Interface and export** — the UI switches between English, Simplified Chinese, and Traditional Chinese with light/dark/system themes and configurable import preferences; the current conversation exports to a PDF whose text remains selectable.
- **Reading experience** — the sidebar counts by user turn (one prompt and its following reply count as a single item), and longer conversations provide a jump rail on the right.

## Installation

1. Install a userscript manager such as Tampermonkey.
2. Open `Tampermonkey.js` and install it as a userscript.
3. Visit `https://chatgpt.com/` or `https://chat.openai.com/`.
4. Click the floating **Export Conversations** button that appears on the page.

## Usage

### Export Conversations

Open ChatGPT in the browser where the userscript is installed, click **Export Conversations**, choose an export scope (personal, project, or team workspace), optionally select specific conversations, and wait for the ZIP file to download.

Conversations and their images and attachments are fetched one at a time through the current browser session, so larger exports taking several minutes is expected.

### Read An Export

For large archives, install Node.js 20.11 or newer, then run `npm install` and `npm start` in the repository. Open `http://127.0.0.1:4317` and import the ZIP. The importer streams entries through a worker thread into `data/chatgpt.sqlite`; assets are stored under `data/assets/`. The browser requests only paginated conversation and message data.

The legacy `reader/index.html` remains available for smaller ZIP files and its existing print/PDF workflow.

## ZIP Layout

A typical export contains:

```text
chatgpt_personal_backup_2026-06-26.zip
|-- Conversation title_abcd1234.json
|-- Conversation title_abcd1234.md
|-- images/
|   `-- img_01_file_abc123.png
|-- files/
|   `-- uploaded-document.pdf
`-- Project name/
    |-- Project conversation_efgh5678.json
    |-- Project conversation_efgh5678.md
    |-- images/
    `-- files/
```

Each JSON file is the raw conversation data returned by ChatGPT. Each Markdown file is generated from it for easier reading and indexing.

## Architecture

### Userscript Exporter

`Tampermonkey.js` runs inside ChatGPT pages and uses the current logged-in browser session to call ChatGPT's own backend APIs. It identifies the session token from same-origin requests, discovers the available workspaces and projects, lists and filters conversations, downloads each conversation's JSON and converts it to Markdown, extracts images and attachments where available, and finally packages everything into a ZIP with JSZip — sanitizing illegal filename characters and resolving name collisions in the process.

### Node.js + SQLite Reader

`server/` provides the local HTTP API, SQLite database, and streaming ZIP importer. Raw conversation JSON is gzip-compressed in SQLite; messages are normalized and paginated; FTS5 supports full-text search, with a LIKE fallback for CJK substring search. Images and attachments are stored by SHA-256 in a local asset directory. The lightweight `app/public/` frontend requests only conversation and message pages.

### Legacy Static Reader

`reader/index.html` retains the original browser-only reader and IndexedDB storage. It is suitable for smaller archives; it is not recommended for daily multi-hundred-megabyte datasets. Its print/PDF workflow remains available.

### Tests

The `test/` directory contains a set of Node-based static checks covering the userscript helpers and the reader. They verify filename sanitization, ZIP name de-duplication, duplicate image-reference handling, and several key behaviors in the reader UI.

## Privacy And Security

- The export process runs entirely in your local browser; this project does not send any conversation content to a third party.
- The userscript takes effect only on the ChatGPT domains declared in its metadata and accesses conversation data through the current logged-in session.
- The exporter does not send conversation content, access tokens, or attachments to unrelated third-party services. Cross-origin asset downloads are limited to OpenAI-owned hosts and omit cookies, authorization headers, and referrers.
- The new reader does not automatically load remote images, including raw HTML image tags; remote src values are removed.
- HTML, SVG, scripts, and document attachments are served as downloads rather than rendered inline in the local reader.
- The Node.js reader binds to 127.0.0.1 by default and stores data in local SQLite and asset files.
- The conversation picker keeps only list metadata (IDs, titles, timestamps, archive state, and project labels) in the current tab's `sessionStorage` for up to 7 days. Complete lists are reused immediately and refreshed incrementally; message bodies and access tokens are never stored in this cache.
- Imported content is stored only in the current browser's IndexedDB and is never uploaded to a server.

## Dependency Integrity

`Tampermonkey.js` embeds the repository's vendored JSZip `3.10.1` source from `reader/vendor/jszip.min.js`. Both the exporter and reader therefore run without downloading executable dependencies from a third-party CDN.

## Known Limits

- ChatGPT's backend APIs are private and may change without notice.
- The Node.js importer limits individual entries to 2 GiB, individual conversation JSON to 256 MiB, total expansion to 50 GiB, and archives to 500,000 entries; HTTP upload is capped at 20 GiB. The legacy static reader retains its smaller browser limits.
- Very large exports may run into browser memory or rate-limit constraints.
- Whether images and attachments can be exported depends on the resource metadata present in each conversation.
- Some team workspaces require opening a team conversation first before the script can detect the workspace.
- Browsers may delete IndexedDB data under low storage, in private browsing, or when site data is cleared.
- PDF export opens a separate print window and saves through the browser's print dialog. This design keeps text selectable and lets the browser handle pagination, images, and source-reference layout.

## Acknowledgements

The exporter is based on [huhusmang/ChatGPT-Exporter](https://github.com/huhusmang/ChatGPT-Exporter), a ChatGPT export tool covering personal, project, and team workspaces.

That project in turn credits [ChatGPT Universal Exporter](https://greasyfork.org/zh-CN/scripts/538495-chatgpt-universal-exporter) as its upstream, originally written by Alex Mercer, Hanashiro, and WenDavid.

## Development

Run the checks:

```sh
node --check Tampermonkey.js
npm test
```

Repository layout:

```text
.
|-- Tampermonkey.js
|-- reader/
|   |-- index.html
|   |-- reader.html
|   |-- openai.svg
|   |-- assets/
|   |   |-- reader.css
|   |   |-- reader.js
|   |   `-- i18n/
|   `-- vendor/
|-- test/
|   |-- filename.test.js
|   `-- reader.test.js
|-- package.json
|-- README.md
|-- README_CN.md
`-- README_TW.md
```

## License

MIT. See `LICENSE`.
