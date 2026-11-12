# ChatGPT Universal Exporter

[![CI](https://github.com/OwlCt/ChatGPT-Export/actions/workflows/ci.yml/badge.svg)](https://github.com/OwlCt/ChatGPT-Export/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[English README](README.md) · [繁體中文](README_TW.md)

ChatGPT Universal Exporter 用于将 ChatGPT 对话导出为本地 ZIP 文件，并在本机通过 Node.js + SQLite 阅读、搜索与归档。对话正文不会上传至第三方服务。

项目包含三部分：

- `Tampermonkey.js`：用户脚本，运行于 ChatGPT 页面，将对话打包为 ZIP 文件供下载。
- `server/` + `app/public/`：Node.js 本地服务与 SQLite 阅读器，面向大型档案，采用流式导入、SQLite 持久化、FTS 全文检索和分页加载。
- `reader/index.html`：旧版纯浏览器阅读器，保留用于小型 ZIP 和无需启动 Node.js 的场景；不再推荐用于超大档案。

适用于个人对话备份、项目与团队空间的归档，以及历史记录的离线阅读。

## 功能

- **导出范围**：支持个人对话、项目对话与团队工作空间，既可整体备份，也可按需选择部分对话。
- **双格式保存**：每条对话同时保存原始 JSON 与转换后的 Markdown，兼顾索引与阅读，并保留项目的文件夹结构。
- **资源提取**：当对话元数据中包含可用的下载地址时，自动将生成图片与上传附件分别存入 `images/` 与 `files/`。
- **阅读与检索**：支持标题/全文搜索、中文子串搜索、消息分页、图片预览和本地附件下载。
- **可视化消息**：支持常见 DIL 布局、实体、引用、表格、柱状/折线/散点/饼图、基础 Mermaid 流程图；交互式 AppBlock 不执行脚本，只保留安全占位内容。
- **本地数据库**：新版阅读器将会话、消息、结构化内容与全文索引持久化到 SQLite；图片和附件采用内容哈希文件存储并去重。旧版静态阅读器仍使用 IndexedDB。
- **界面与导出**：界面支持英文、简体中文、繁体中文切换与亮色/暗色/跟随系统主题，并可预设导入偏好；当前对话可导出为文字可选的 PDF。
- **阅读体验**：侧边栏按"用户回合"计数，即一次提问及其后续回复计为一条；较长对话提供右侧快速跳转导航。

## 安装

1. 安装用户脚本管理器（如 Tampermonkey）。
2. 打开 `Tampermonkey.js` 并将其安装为用户脚本。
3. 访问 `https://chatgpt.com/` 或 `https://chat.openai.com/`。
4. 点击页面中出现的 **Export Conversations** 浮动按钮。

## 使用

### 导出对话

在已安装用户脚本的浏览器中打开 ChatGPT，点击 **Export Conversations**，选择导出范围（个人、项目或团队工作空间），如有需要可进一步勾选具体对话，随后等待 ZIP 文件下载完成。

对话及其图片、附件均通过当前浏览器会话逐条获取，因此数据量较大时，导出耗时数分钟属于正常情况。

### 阅读导出包

对于大型档案，先安装 Node.js 20.11 或更新版本，然后在项目目录执行：

```sh
npm install
npm start
```

打开 `http://127.0.0.1:4317`，选择 ZIP 导出包即可导入。导入过程由本机 Node.js 流式处理，完成后会话和消息写入 `data/chatgpt.sqlite`，图片与附件存放于 `data/assets/`。阅读器只按需请求会话列表和当前消息页，不会把整份档案加载到浏览器。

也可以通过命令行导入：

```sh
node server/cli.js import ./chatgpt_personal_backup.zip
```

数据库与资源仅保存在本机。旧版 `reader/index.html` 仍可用于较小的 ZIP，但大型档案请使用 Node.js 阅读器。

## ZIP 结构

典型导出内容如下：

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

JSON 文件为 ChatGPT 返回的原始对话数据，Markdown 文件由其转换生成，用于便捷阅读与检索。

## 技术架构

### 用户脚本导出器

`Tampermonkey.js` 运行于 ChatGPT 页面内部，借助当前已登录的浏览器会话调用 ChatGPT 自身的后端接口。其工作流程为：从同源请求中识别会话 token，发现可用的工作空间与项目，拉取并筛选对话列表，下载各对话的 JSON 并转换为 Markdown，提取可获取的图片与附件，最终通过 JSZip 打包为 ZIP，并在此过程中处理文件名非法字符与重名冲突。

### Node.js + SQLite 阅读器

`server/` 提供本地 HTTP API、SQLite 数据库和 ZIP 导入器。ZIP 按条目逐个读取，并由 worker thread 执行解压和数据库写入；会话原始 JSON 以 gzip BLOB 保存，消息按序号分页读取，避免普通查询加载原始大 BLOB。FTS5 用于全文搜索，中文子串搜索使用 LIKE 回退。图片与附件以 SHA-256 内容寻址存放在本地文件目录。`app/public/` 只请求会话列表页和当前会话消息页。

### 旧版静态阅读器

`reader/index.html` 保留原有纯浏览器阅读能力，JSZip 从仓库 `reader/vendor/` 加载。它仍使用 IndexedDB 和浏览器内存，适合小型档案；不适合每日数百 MB 的长期数据集。

### 测试

`test/` 包含用户脚本安全检查、DIL 解析/渲染测试、SQLite 数据库/ZIP 导入测试，以及本地 HTTP API、分页、中文搜索和附件安全测试。当前分支的完整 CI 结果仍待确认。

## 隐私与安全

- 导出过程完全在本地浏览器中完成，本项目不会将任何对话内容发送至第三方。
- 用户脚本仅在其元数据声明的 ChatGPT 域名中生效，并通过当前登录会话访问对话数据。
- 导出器不会向无关第三方服务发送会话内容、访问令牌或附件。跨域资源下载仅允许 OpenAI 自有域名，且不携带 Cookie、Authorization 或 Referer。
- 新版阅读器不会自动加载远程图片，原始 HTML 中的外链图片也会移除 src；只有本地资源才会显示。
- HTML、SVG、脚本和文档附件通过下载方式提供，避免在本地阅读器同源环境中直接执行。
- 对话选择器仅在当前标签页的 `sessionStorage` 中缓存列表元数据（ID、标题、时间、归档状态和项目名称），最长保留 7 天。完整列表会优先直接复用，再通过少量 API 请求增量更新；缓存不包含消息正文或访问令牌。
- 新版 Node.js 阅读器默认仅监听 `127.0.0.1`，导入数据保存在本地 SQLite 与资源目录，不会自动发送至远程服务。
- 旧版静态阅读器的导入内容仍存储于当前浏览器 IndexedDB。

## 依赖完整性

`Tampermonkey.js` 直接内置仓库中的 JSZip `3.10.1`（来源为 `reader/vendor/jszip.min.js`）。导出器和阅读器均不需要从第三方 CDN 下载可执行依赖。

## 已知限制

- ChatGPT 后端接口为非公开接口，可能随时变更。
- Node.js 导入器默认限制单个 ZIP 条目 2 GiB、单个 JSON 会话 256 MiB、解压总量 50 GiB、最多 500,000 个条目；HTTP 上传上限为 20 GiB。旧版静态阅读器仍限制压缩后 512 MiB、解压后 2 GiB。
- 数据量过大的导出可能受到浏览器内存或接口限流的影响。
- 图片与附件能否导出，取决于各对话中是否存在可用的资源元数据。
- 部分团队工作空间需先打开一个团队对话，脚本方能识别其空间信息。
- 新版阅读器目前只索引本项目 ZIP 中的 JSON；Markdown-only ZIP 尚未支持。
- chat-archive/v1 标准化 manifest/JSON、API 完整性检测与懒加载自动滚动兜底仍待实现。
- 在存储空间不足、隐私模式或清除站点数据等情况下，浏览器可能删除 IndexedDB 缓存。
- PDF/打印功能目前保留在旧版静态阅读器；新版 Node.js 阅读器的 PDF 导出仍待补齐。

## 致谢

本导出器基于 [huhusmang/ChatGPT-Exporter](https://github.com/huhusmang/ChatGPT-Exporter) 开发，后者是一个覆盖个人、项目与团队工作空间的 ChatGPT 对话导出工具。

该项目注明其上游基础为 [ChatGPT Universal Exporter](https://greasyfork.org/zh-CN/scripts/538495-chatgpt-universal-exporter)，原始工作由 Alex Mercer、Hanashiro 与 WenDavid 完成。

## 开发

运行检查：

```sh
node --check Tampermonkey.js
npm test
```

仓库结构：

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

## 许可证

MIT，详见 `LICENSE`。
