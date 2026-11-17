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

const rawRemoteImage = renderRichContent('<img src="https://tracker.example/pixel.png" alt="tracking"/>');
assert.doesNotMatch(rawRemoteImage, /tracker\.example/);
assert.match(rawRemoteImage, /alt="tracking"/);
const localImage = renderRichContent('<img src="/api/assets/' + 'a'.repeat(64) + '" alt="local"/>');
assert.ok(localImage.includes('src="/api/assets/'));

const video = renderRichContent('<AsyncVideo query="demo video"/>');
assert.match(video, /视频引用/);
const appBlock = renderRichContent('<AppBlock title="unsafe"><script>run()</script></AppBlock>');
assert.match(appBlock, /不执行/);
assert.doesNotMatch(appBlock, /<script/i);

const table = renderRichContent('| Name | Value |\n| --- | ---: |\n| Chats | 120 |');
assert.match(table, /<table>/);
assert.match(table, /Chats/);
const structuredTable = renderRichContent('<table><table-row><table-cell header={true} rowSpan={2} align="center">A</table-cell><table-cell colSpan={2}>B</table-cell></table-row></table>');
assert.match(structuredTable, /rowspan="2"/);
assert.match(structuredTable, /colspan="2"/);
assert.match(structuredTable, /text-align:center/);

const chart = renderRichContent('<Chart content={{"chartType":"bar","xKey":"day","series":[{"dataKey":"count"}],"data":[{"day":"Mon","count":2}]}}/>');
assert.match(chart, /dil-chart/);
assert.match(chart, /<svg/);
const pie = renderRichContent('<Chart content={{"chartType":"pie","nameKey":"name","valueKey":"value","series":[{"dataKey":"value"}],"data":[{"name":"A","value":3},{"name":"B","value":2}]}}/>');
assert.match(pie, /dil-chart-pie/);
assert.match(pie, /A/);
const scatter = renderRichContent('<Chart content={{"chartType":"scatter","xKey":"x","series":[{"dataKey":"y"}],"data":[{"x":1,"y":2},{"x":3,"y":4}]}}/>');
assert.match(scatter, /<circle/);
assert.doesNotMatch(scatter, /<polyline/);

const fence = String.fromCharCode(96).repeat(3);
const mermaid = renderRichContent(fence + 'mermaid\nflowchart TD\nA[Start] --> B{Ready?}\nB --> C[Yes]\nB --> D[No]\n' + fence);
assert.match(mermaid, /dil-mermaid/);
assert.match(renderMermaid('graph LR\nA[One] --> B[Two]'), /<svg/);

const unsafe = renderRichContent('<Link url="javascript:alert(1)" title="unsafe"/> <script>alert(1)</script>');
assert.doesNotMatch(unsafe, /javascript:/i);
assert.doesNotMatch(unsafe, /<script/i);

const fenced = renderRichContent(fence + 'html\n<row>not a component</row>\n' + fence);
assert.match(fenced, /&lt;row&gt;/);

const styledText = renderRichContent('<text color="secondary" size="sm" weight="semibold" textAlign="center">Muted label</text>');
assert.match(styledText, /color:var\(--muted\)/);
assert.match(styledText, /font-size:0\.875rem/);
assert.match(styledText, /font-weight:600/);
assert.match(styledText, /text-align:center/);
const styledBox = renderRichContent('<box direction="row" align="center" justify="between" padding={3} background="surface" radius="12px"><text>Left</text><text>Right</text></box>');
assert.match(styledBox, /flex-direction:row/);
assert.match(styledBox, /align-items:center/);
assert.match(styledBox, /justify-content:space-between/);
assert.match(styledBox, /padding:12px/);
assert.match(styledBox, /background-color:var\(--panel-soft\)/);
assert.match(styledBox, /border-radius:12px/);
const grid = renderRichContent('<grid columns={3} rowGap={2} columnGap={4}><grid-item span={2}>A</grid-item><grid-item>B</grid-item></grid>');
assert.match(grid, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(grid, /row-gap:8px/);
assert.match(grid, /column-gap:16px/);
assert.match(grid, /grid-column:span 2/);

console.log('Rich content tests passed.');
