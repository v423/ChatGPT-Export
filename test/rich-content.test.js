'use strict';

const assert = require('node:assert/strict');
const { parseDIL, renderRichContent, renderMermaid } = require('../server/rich-content');

const sample = [
  '<row align="start" gap={3}>',
  '<AsyncImage query="PCAPdroid Android network monitor screenshot" aspectRatio="3:4" maxWidth="144px"/>',
  '<box flex="1" gap={1}>',
  '<Entity category="software" value="PCAPdroid"/>',
  '',
  '开源的 Android 网络分析工具。<Cite refs={["turn846082search1","turn739189search4"]}/>',
  '<text color="secondary" size="sm">安装渠道</text>',
  '<text><Link url="https://f-droid.org/en/packages/com.emanuelef.remote_capture/" title="F-Droid"/> · <Link url="https://github.com/emanuele-f/PCAPdroid" title="GitHub 源码"/></text>',
  '</box>',
  '</row>'
].join('\n');

const ast = parseDIL(sample);
assert.equal(ast.children[0].name, 'row');
assert.equal(ast.children[0].attributes.gap, 3);
const image = ast.children[0].children[0];
assert.equal(image.name, 'AsyncImage');
assert.equal(image.attributes.query, 'PCAPdroid Android network monitor screenshot');
const box = ast.children[0].children[1];
const cite = box.children.find(node => node.name === 'Cite');
assert.deepEqual(cite.attributes.refs, ['turn846082search1', 'turn739189search4']);

const html = renderRichContent(sample);
assert.match(html, /dil-row/);
assert.match(html, /dil-image-placeholder/);
assert.match(html, /PCAPdroid/);
assert.match(html, /dil-entity/);
assert.match(html, /turn846082search1/);
assert.match(html, /https:\/\/f-droid\.org/);
assert.doesNotMatch(html, /<img[^>]+src="https?:/i);

const table = renderRichContent('| Name | Value |\n| --- | ---: |\n| Chats | 120 |');
assert.match(table, /<table>/);
assert.match(table, /Chats/);

const chart = renderRichContent('<Chart content={{"chartType":"bar","xKey":"day","series":[{"dataKey":"count"}],"data":[{"day":"Mon","count":2}]}}/>');
assert.match(chart, /dil-chart/);
assert.match(chart, /<svg/);

const fence = String.fromCharCode(96).repeat(3);
const mermaid = renderRichContent(fence + 'mermaid\nflowchart TD\nA[Start] --> B{Ready?}\nB --> C[Yes]\nB --> D[No]\n' + fence);
assert.match(mermaid, /dil-mermaid/);
assert.match(renderMermaid('graph LR\nA[One] --> B[Two]'), /<svg/);

const unsafe = renderRichContent('<Link url="javascript:alert(1)" title="unsafe"/> <script>alert(1)</script>');
assert.doesNotMatch(unsafe, /javascript:/i);
assert.doesNotMatch(unsafe, /<script/i);

const fenced = renderRichContent(fence + 'html\n<row>not a component</row>\n' + fence);
assert.match(fenced, /&lt;row&gt;/);

console.log('Rich content tests passed.');
