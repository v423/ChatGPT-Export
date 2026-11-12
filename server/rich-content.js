'use strict';

const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const KNOWN_TAGS = new Set([
  'row', 'col', 'box', 'grid', 'grid-item', 'flow', 'flow-item', 'card',
  'pressable', 'blockquote', 'list', 'list-item', 'table', 'table-section',
  'table-row', 'table-cell', 'divider', 'spacer', 'text', 'title', 'caption',
  'label', 'badge', 'bold', 'italic', 'underline', 'strikethrough', 'math',
  'code', 'icon', 'favicon', 'AsyncImage', 'AsyncImageGroup', 'AsyncVideo', 'AppBlock', 'Entity', 'Link',
  'Cite', 'CodeCite', 'FileCite', 'Chart', 'MapWidgetV2', 'CodeBlock',
  'WritingBlock', 'FollowUp', 'FollowUpPillGroup', 'escape'
]);

function addText(parent, value) {
  if (!value) return;
  const last = parent.children[parent.children.length - 1];
  if (last && last.type === 'text') last.value += value;
  else parent.children.push({ type: 'text', value });
}

function findTagEnd(source, start) {
  let quote = '';
  let braceDepth = 0;
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === '\\' && index + 1 < source.length) {
        index += 1;
        continue;
      }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}' && braceDepth > 0) {
      braceDepth -= 1;
      continue;
    }
    if (char === '>' && braceDepth === 0) return index;
  }
  return -1;
}

function readExpression(source, start) {
  let depth = 0;
  let quote = '';
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === '\\' && index + 1 < source.length) {
        index += 1;
        continue;
      }
      if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { value: source.slice(start + 1, index), end: index + 1 };
    }
  }
  return { value: source.slice(start + 1), end: source.length };
}

function parseExpressionValue(expression) {
  const value = String(expression || '').trim();
  if (!value) return '';
  try {
    return JSON.parse(value);
  } catch (_) {
    if ((value[0] === "'" && value[value.length - 1] === "'") ||
        (value[0] === '"' && value[value.length - 1] === '"')) {
      return value.slice(1, -1);
    }
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
}

function parseAttributes(source) {
  const attributes = {};
  let index = 0;
  while (index < source.length) {
    while (/\s|\/$/.test(source[index] || '')) index += 1;
    if (index >= source.length) break;
    const nameMatch = source.slice(index).match(/^([A-Za-z_:][\w:.-]*)/);
    if (!nameMatch) {
      index += 1;
      continue;
    }
    const name = nameMatch[1];
    index += name.length;
    while (/\s/.test(source[index] || '')) index += 1;
    if (source[index] !== '=') {
      attributes[name] = true;
      continue;
    }
    index += 1;
    while (/\s/.test(source[index] || '')) index += 1;
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      index += 1;
      let value = '';
      while (index < source.length && source[index] !== quote) {
        if (source[index] === '\\' && index + 1 < source.length) index += 1;
        value += source[index];
        index += 1;
      }
      if (source[index] === quote) index += 1;
      attributes[name] = value;
    } else if (source[index] === '{') {
      const expression = readExpression(source, index);
      attributes[name] = parseExpressionValue(expression.value);
      index = expression.end;
    } else {
      const match = source.slice(index).match(/^([^\s/>]+)/);
      attributes[name] = match ? match[1] : true;
      index += match ? match[1].length : 0;
    }
  }
  return attributes;
}

function parseTagAt(source, start) {
  if (source[start] !== '<') return null;
  const head = source.slice(start).match(/^<\s*(\/?)\s*([A-Za-z][\w.-]*)/);
  if (!head || !KNOWN_TAGS.has(head[2])) return null;
  const end = findTagEnd(source, start);
  if (end < 0) return null;
  const raw = source.slice(start, end + 1);
  const closing = Boolean(head[1]);
  const selfClosing = !closing && /\/\s*>$/.test(raw);
  const attributeStart = head[0].length;
  const attributeText = raw.slice(attributeStart, raw.length - 1).replace(/\/\s*$/, '');
  return {
    name: head[2],
    closing,
    selfClosing,
    attributes: closing ? {} : parseAttributes(attributeText),
    end: end + 1
  };
}

function parseDIL(source) {
  const input = String(source || '');
  const root = { type: 'root', children: [] };
  const stack = [root];
  const fence = String.fromCharCode(96).repeat(3);
  const backtick = String.fromCharCode(96);
  const inlineCodePattern = new RegExp('^' + backtick + '+');
  let index = 0;
  let textStart = 0;

  function flushText(end) {
    if (end > textStart) addText(stack[stack.length - 1], input.slice(textStart, end));
  }

  while (index < input.length) {
    if (input.startsWith(fence, index)) {
      const lineStart = input.lastIndexOf('\n', index - 1) + 1;
      if (/^\s*$/.test(input.slice(lineStart, index))) {
        const close = input.indexOf(fence, index + 3);
        if (close >= 0) {
          index = close + 3;
          continue;
        }
      }
    }
    if (input[index] === backtick) {
      const run = input.slice(index).match(inlineCodePattern);
      const marker = run ? run[0] : backtick;
      const close = input.indexOf(marker, index + marker.length);
      if (close >= 0) {
        index = close + marker.length;
        continue;
      }
    }
    if (input[index] !== '<') {
      index += 1;
      continue;
    }

    const tag = parseTagAt(input, index);
    if (!tag) {
      index += 1;
      continue;
    }

    flushText(index);
    const current = stack[stack.length - 1];
    if (tag.closing) {
      let match = -1;
      for (let cursor = stack.length - 1; cursor > 0; cursor -= 1) {
        if (stack[cursor].name === tag.name) {
          match = cursor;
          break;
        }
      }
      if (match < 0) addText(current, input.slice(index, tag.end));
      else stack.length = match;
    } else {
      const node = {
        type: 'element',
        name: tag.name,
        attributes: tag.attributes,
        children: []
      };
      current.children.push(node);
      if (!tag.selfClosing) stack.push(node);
    }
    index = tag.end;
    textStart = index;
  }

  flushText(input.length);
  return root;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value) {
  const candidate = value && typeof value === 'object' && typeof value.uri === 'string' ? value.uri : value;
  const raw = String(candidate || '').trim();
  if (/^\/api\/assets\/[a-f0-9]{64}$/i.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:' || url.protocol === 'http:' || url.protocol === 'mailto:') {
      if (url.username || url.password) return '';
      return url.href;
    }
  } catch (_) {}
  return '';
}

function safeSpacing(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(64, value * 4)) + 'px';
  }
  const raw = String(value || '').trim();
  if (/^(?:0|[0-9]+(?:\.[0-9]+)?(?:px|rem|pt|%))$/.test(raw)) return raw;
  return '';
}


function safeLength(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(4096, value)) + 'px';
  }
  const raw = String(value || '').trim();
  return /^(?:0|[0-9]+(?:\.[0-9]+)?(?:px|rem|pt|%))$/.test(raw) ? raw : '';
}

function safeFlex(value) {
  const raw = String(value == null ? '' : value).trim();
  return /^(?:0|[0-9]+(?:\.[0-9]+)?)(?:\s+[0-9]+(?:\.[0-9]+)?){0,2}$/.test(raw) ? raw : '';
}

function safeColor(value) {
  const raw = String(value || '').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
  if (/^(?:transparent|currentColor|black|white|red|green|blue|gray|grey|orange|purple)$/i.test(raw)) return raw;
  if (/^rgba?\([0-9.,%\s]+\)$/i.test(raw)) return raw;
  return '';
}

function safeAspectRatio(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^([0-9]+(?:\.[0-9]+)?)\s*[:/]\s*([0-9]+(?:\.[0-9]+)?)$/);
  if (!match || Number(match[1]) <= 0 || Number(match[2]) <= 0) return '';
  return Number(match[1]) + ' / ' + Number(match[2]);
}

function safeSvgPaint(value) {
  const raw = String(value || '').trim();
  if (/^(?:none|currentColor|transparent|#[0-9a-f]{3,8}|[a-z]{1,20})$/i.test(raw)) return raw;
  if (/^rgba?\([0-9.,%\s]+\)$/i.test(raw)) return raw;
  if (/^url\(\s*#[a-z0-9_.-]+\s*\)$/i.test(raw)) return raw;
  return 'none';
}

function safeSvgPath(value) {
  return String(value || '').replace(/[^a-z0-9.,+\-\s]/gi, '').slice(0, 5000);
}

function safeSvgNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.max(-100000, Math.min(100000, number))) : '0';
}

function safeEnum(value, allowed) {
  const raw = String(value || '');
  return allowed.has(raw) ? raw : '';
}

function textContent(nodes) {
  return (nodes || []).map(node => node.type === 'text' ? node.value : textContent(node.children)).join('');
}

function sanitizeMarkdown(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      'a', 'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'sup', 'sub', 'img', 'svg', 'defs', 'marker', 'path', 'line', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'g', 'text'
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      code: ['class'],
      pre: ['class'],
      th: ['align', 'colspan'],
      td: ['align', 'colspan'],
      img: ['src', 'alt', 'class'],
      svg: ['class', 'viewBox', 'role', 'aria-label'],
      defs: [],
      marker: ['id', 'markerWidth', 'markerHeight', 'refX', 'refY', 'orient'],
      path: ['d', 'fill'],
      line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'marker-end'],
      rect: ['x', 'y', 'width', 'height', 'rx'],
      circle: ['cx', 'cy', 'r', 'fill'],
      ellipse: ['cx', 'cy', 'rx', 'ry'],
      polygon: ['points'],
      polyline: ['points', 'fill', 'stroke', 'stroke-width'],
      g: ['class'],
      text: ['x', 'y', 'text-anchor']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }, true),
      img: (tagName, attribs) => {
        const src = safeUrl(attribs.src);
        const safeAttributes = { alt: String(attribs.alt || '外部图片未加载').slice(0, 500) };
        if (src && src.startsWith('/api/assets/')) safeAttributes.src = src;
        return { tagName: 'img', attribs: safeAttributes };
      },
      path: (tagName, attribs) => ({
        tagName,
        attribs: { d: safeSvgPath(attribs.d), fill: safeSvgPaint(attribs.fill) }
      }),
      line: (tagName, attribs) => ({
        tagName,
        attribs: {
          x1: safeSvgNumber(attribs.x1), y1: safeSvgNumber(attribs.y1),
          x2: safeSvgNumber(attribs.x2), y2: safeSvgNumber(attribs.y2),
          stroke: safeSvgPaint(attribs.stroke),
          'stroke-width': safeSvgNumber(attribs['stroke-width']),
          'marker-end': /^url\(\s*#[a-z0-9_.-]+\s*\)$/i.test(String(attribs['marker-end'] || '')) ? attribs['marker-end'] : ''
        }
      }),
      rect: (tagName, attribs) => ({
        tagName,
        attribs: {
          x: safeSvgNumber(attribs.x), y: safeSvgNumber(attribs.y),
          width: safeSvgNumber(attribs.width), height: safeSvgNumber(attribs.height),
          rx: safeSvgNumber(attribs.rx), fill: safeSvgPaint(attribs.fill),
          stroke: safeSvgPaint(attribs.stroke)
        }
      }),
      circle: (tagName, attribs) => ({
        tagName,
        attribs: {
          cx: safeSvgNumber(attribs.cx), cy: safeSvgNumber(attribs.cy),
          r: safeSvgNumber(attribs.r), fill: safeSvgPaint(attribs.fill),
          stroke: safeSvgPaint(attribs.stroke)
        }
      }),
      ellipse: (tagName, attribs) => ({
        tagName,
        attribs: {
          cx: safeSvgNumber(attribs.cx), cy: safeSvgNumber(attribs.cy),
          rx: safeSvgNumber(attribs.rx), ry: safeSvgNumber(attribs.ry),
          fill: safeSvgPaint(attribs.fill), stroke: safeSvgPaint(attribs.stroke)
        }
      }),
      polygon: (tagName, attribs) => ({
        tagName,
        attribs: { points: safeSvgPath(attribs.points), fill: safeSvgPaint(attribs.fill), stroke: safeSvgPaint(attribs.stroke) }
      }),
      polyline: (tagName, attribs) => ({
        tagName,
        attribs: {
          points: safeSvgPath(attribs.points), fill: safeSvgPaint(attribs.fill),
          stroke: safeSvgPaint(attribs.stroke), 'stroke-width': safeSvgNumber(attribs['stroke-width'])
        }
      }),
      text: (tagName, attribs) => ({
        tagName,
        attribs: {
          x: safeSvgNumber(attribs.x), y: safeSvgNumber(attribs.y),
          'text-anchor': ['start', 'middle', 'end'].includes(attribs['text-anchor']) ? attribs['text-anchor'] : 'start'
        }
      }),
      svg: (tagName, attribs) => ({
        tagName,
        attribs: {
          class: ['dil-chart', 'dil-mermaid'].includes(attribs.class) ? attribs.class : '',
          viewBox: /^[0-9.\s-]{1,80}$/.test(String(attribs.viewBox || '')) ? attribs.viewBox : '0 0 640 300',
          role: 'img',
          'aria-label': String(attribs['aria-label'] || '图表').slice(0, 100)
        }
      })
    }
  });
}

function renderMermaid(source) {
  const lines = String(source || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const directionMatch = lines[0] && lines[0].match(/^(?:flowchart|graph)\s+(TD|TB|BT|LR|RL)\b/i);
  if (!directionMatch) return '';
  const direction = directionMatch[1].toUpperCase();
  const nodes = new Map();
  const edges = [];
  const ensureNode = (id, definition) => {
    if (!nodes.has(id)) nodes.set(id, { id, label: id, shape: 'rect' });
    const node = nodes.get(id);
    if (definition) {
      const labelMatch = definition.match(/^\s*(?:\[\[([^\]]+)\]\]|\(\(([^)]+)\)\)|\(\[([^\]]+)\]\)|\[([^\]]+)\]|\{([^}]+)\})/);
      const label = labelMatch && labelMatch.slice(1).find(Boolean);
      if (label) node.label = label;
      if (definition.includes('{')) node.shape = 'diamond';
      else if (definition.startsWith('((')) node.shape = 'circle';
      else if (definition.startsWith('([')) node.shape = 'round';
    }
    return node;
  };

  for (const line of lines.slice(1)) {
    const edge = line.match(/^([A-Za-z0-9_]+)(?:\s*(\[\[[^\]]+\]\]|\(\([^)]+\)\)|\(\[[^)]+\]\)|\[[^\]]+\]|\{[^}]+\}))?\s*(-->|==>|-.->|---)\s*(?:\|([^|]+)\|\s*)?([A-Za-z0-9_]+)(?:\s*(\[\[[^\]]+\]\]|\(\([^)]+\)\)|\(\[[^)]+\]\)|\[[^\]]+\]|\{[^}]+\}))?/);
    if (edge) {
      ensureNode(edge[1], edge[2]);
      ensureNode(edge[5], edge[6]);
      edges.push({ from: edge[1], to: edge[5], label: edge[4] || '' });
      continue;
    }
    const node = line.match(/^([A-Za-z0-9_]+)\s*(\[\[[^\]]+\]\]|\(\([^)]+\)\)|\(\[[^)]+\]\)|\[[^\]]+\]|\{[^}]+\})$/);
    if (node) ensureNode(node[1], node[2]);
  }

  if (!nodes.size) return '';
  const indegree = new Map(Array.from(nodes.keys(), id => [id, 0]));
  const outgoing = new Map(Array.from(nodes.keys(), id => [id, []]));
  edges.forEach(edge => {
    indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
    outgoing.get(edge.from).push(edge.to);
  });
  const layer = new Map();
  const queue = Array.from(nodes.keys()).filter(id => indegree.get(id) === 0);
  queue.forEach(id => layer.set(id, 0));
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor];
    for (const target of outgoing.get(id)) {
      layer.set(target, Math.max(layer.get(target) || 0, (layer.get(id) || 0) + 1));
      indegree.set(target, indegree.get(target) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }
  nodes.forEach((node, id) => {
    if (!layer.has(id)) layer.set(id, 0);
  });

  const groups = new Map();
  nodes.forEach((node, id) => {
    const depth = layer.get(id) || 0;
    if (!groups.has(depth)) groups.set(depth, []);
    groups.get(depth).push(id);
  });
  const depths = Array.from(groups.keys()).sort((a, b) => a - b);
  const horizontal = direction === 'LR' || direction === 'RL';
  const nodeWidth = 176;
  const nodeHeight = 58;
  const gapX = 76;
  const gapY = 48;
  const maxGroup = Math.max(...Array.from(groups.values(), group => group.length));
  const width = horizontal ? (depths.length * (nodeWidth + gapX) + 40) : (maxGroup * (nodeWidth + gapX) + 40);
  const height = horizontal ? (maxGroup * (nodeHeight + gapY) + 40) : (depths.length * (nodeHeight + gapY) + 40);
  const positions = new Map();

  depths.forEach((depth, depthIndex) => {
    const group = groups.get(depth);
    group.forEach((id, itemIndex) => {
      let x = horizontal ? 20 + depthIndex * (nodeWidth + gapX) : 20 + itemIndex * (nodeWidth + gapX);
      let y = horizontal ? 20 + itemIndex * (nodeHeight + gapY) : 20 + depthIndex * (nodeHeight + gapY);
      if (direction === 'BT') y = height - y - nodeHeight;
      if (direction === 'RL') x = width - x - nodeWidth;
      positions.set(id, { x, y });
    });
  });

  const svg = [];
  svg.push('<svg class="dil-mermaid" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Flowchart">');
  svg.push('<defs><marker id="dil-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="currentColor"/></marker></defs>');
  edges.forEach(edge => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return;
    const x1 = from.x + nodeWidth / 2;
    const y1 = from.y + nodeHeight / 2;
    const x2 = to.x + nodeWidth / 2;
    const y2 = to.y + nodeHeight / 2;
    svg.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="currentColor" stroke-width="1.5" marker-end="url(#dil-arrow)"/>');
    if (edge.label) {
      svg.push('<text x="' + ((x1 + x2) / 2) + '" y="' + ((y1 + y2) / 2 - 7) + '" text-anchor="middle">' + escapeHtml(edge.label) + '</text>');
    }
  });
  nodes.forEach((node, id) => {
    const point = positions.get(id);
    const shape = node.shape === 'diamond'
      ? '<polygon points="' + (point.x + nodeWidth / 2) + ',' + point.y + ' ' + (point.x + nodeWidth) + ',' + (point.y + nodeHeight / 2) + ' ' + (point.x + nodeWidth / 2) + ',' + (point.y + nodeHeight) + ' ' + point.x + ',' + (point.y + nodeHeight / 2) + '"/>'
      : node.shape === 'circle'
        ? '<ellipse cx="' + (point.x + nodeWidth / 2) + '" cy="' + (point.y + nodeHeight / 2) + '" rx="' + (nodeWidth / 2) + '" ry="' + (nodeHeight / 2) + '"/>'
        : '<rect x="' + point.x + '" y="' + point.y + '" width="' + nodeWidth + '" height="' + nodeHeight + '" rx="' + (node.shape === 'round' ? 24 : 8) + '"/>';
    svg.push('<g class="dil-flow-node">' + shape + '<text x="' + (point.x + nodeWidth / 2) + '" y="' + (point.y + nodeHeight / 2 + 4) + '" text-anchor="middle">' + escapeHtml(node.label) + '</text></g>');
  });
  svg.push('</svg>');
  return svg.join('');
}

function renderChart(attributes) {
  let content = attributes.content;
  if (typeof content === 'string') {
    try { content = JSON.parse(content); } catch (_) { content = null; }
  }
  if (!content || !Array.isArray(content.data) || !content.data.length) {
    return '<div class="dil-component-fallback">图表数据不可用</div>';
  }

  const data = content.data.filter(row => row && typeof row === 'object').slice(0, 40);
  const chartType = ['bar', 'line', 'scatter', 'pie'].includes(String(content.chartType))
    ? String(content.chartType) : 'bar';
  const xKey = String(content.xKey || content.nameKey || 'x');
  const series = Array.isArray(content.series) && content.series.length
    ? content.series.filter(item => item && item.dataKey).slice(0, 6)
    : [{ dataKey: content.valueKey || 'value', label: 'Value' }];
  if (!series.length) return '<div class="dil-component-fallback">图表系列不可用</div>';

  if (chartType === 'pie') {
    const nameKey = String(content.nameKey || xKey);
    const valueKey = String(content.valueKey || series[0].dataKey);
    const slices = data.map(row => ({
      label: String(row[nameKey] == null ? '' : row[nameKey]).slice(0, 60),
      value: Number(row[valueKey])
    })).filter(item => Number.isFinite(item.value) && item.value > 0);
    const total = slices.reduce((sum, item) => sum + item.value, 0);
    if (!total) return '<div class="dil-component-fallback">饼图没有有效的正数数据</div>';
    const cx = 120, cy = 120, radius = 92;
    let angle = -Math.PI / 2;
    const svg = ['<svg class="dil-chart dil-chart-pie" viewBox="0 0 240 240" role="img" aria-label="Pie chart">'];
    slices.forEach((slice, index) => {
      const nextAngle = angle + (slice.value / total) * Math.PI * 2;
      const x1 = cx + radius * Math.cos(angle);
      const y1 = cy + radius * Math.sin(angle);
      const x2 = cx + radius * Math.cos(nextAngle);
      const y2 = cy + radius * Math.sin(nextAngle);
      const largeArc = nextAngle - angle > Math.PI ? 1 : 0;
      const path = slices.length === 1
        ? 'M ' + cx + ' ' + cy + ' m -' + radius + ' 0 a ' + radius + ' ' + radius + ' 0 1 0 ' + (radius * 2) + ' 0 a ' + radius + ' ' + radius + ' 0 1 0 -' + (radius * 2) + ' 0'
        : 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + radius + ' ' + radius + ' 0 ' + largeArc + ' 1 ' + x2 + ' ' + y2 + ' Z';
      svg.push('<path d="' + path + '" fill="currentColor" opacity="' + (0.35 + (index % 6) * 0.1) + '" stroke="var(--panel)" stroke-width="2"/>');
      angle = nextAngle;
    });
    svg.push('</svg>');
    const legend = '<ul class="dil-chart-legend">' + slices.map((slice, index) =>
      '<li><span style="opacity:' + (0.35 + (index % 6) * 0.1) + '"></span><span>' +
      escapeHtml(slice.label || '未命名') + '</span><strong>' +
      escapeHtml(String(slice.value)) + ' (' + (slice.value / total * 100).toFixed(1) + '%)</strong></li>'
    ).join('') + '</ul>';
    return '<div class="dil-chart-pie-layout">' + svg.join('') + legend + '</div>';
  }

  const width = 640, height = 300, left = 52, right = 18, top = 20, bottom = 54;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const values = [];
  data.forEach(row => series.forEach(item => {
    const value = Number(row[item.dataKey]);
    if (Number.isFinite(value)) values.push(value);
  }));
  if (!values.length) return '<div class="dil-component-fallback">图表没有有效的数值</div>';
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);
  const zeroY = top + (max / span) * plotHeight;
  const svg = ['<svg class="dil-chart" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Chart">'];
  for (let tick = 0; tick <= 4; tick += 1) {
    const y = top + tick * plotHeight / 4;
    svg.push('<line x1="' + left + '" y1="' + y + '" x2="' + (width - right) + '" y2="' + y + '" stroke="currentColor" opacity=".12"/>');
  }

  if (chartType === 'line') {
    series.forEach((item, seriesIndex) => {
      const points = data.map((row, index) => {
        const value = Number(row[item.dataKey]);
        if (!Number.isFinite(value)) return null;
        const x = left + (data.length <= 1 ? plotWidth / 2 : index * plotWidth / (data.length - 1));
        const y = top + ((max - value) / span) * plotHeight;
        return [x, y];
      }).filter(Boolean);
      if (points.length) {
        svg.push('<polyline fill="none" stroke="currentColor" stroke-width="2" opacity="' +
          (0.9 - seriesIndex * 0.12) + '" points="' + points.map(point => point.join(',')).join(' ') + '"/>');
        points.forEach(point => svg.push('<circle cx="' + point[0] + '" cy="' + point[1] + '" r="3.5" fill="currentColor" opacity="' +
          (0.9 - seriesIndex * 0.12) + '"/>'));
      }
    });
  } else if (chartType === 'scatter') {
    const xValues = data.map((row, index) => {
      const value = Number(row[xKey]);
      return Number.isFinite(value) ? value : index;
    });
    const xMin = Math.min(...xValues), xMax = Math.max(...xValues);
    const xSpan = Math.max(1, xMax - xMin);
    data.forEach((row, index) => {
      series.forEach((item, seriesIndex) => {
        const value = Number(row[item.dataKey]);
        if (!Number.isFinite(value)) return;
        const x = left + ((xValues[index] - xMin) / xSpan) * plotWidth;
        const y = top + ((max - value) / span) * plotHeight;
        svg.push('<circle cx="' + x + '" cy="' + y + '" r="4" fill="currentColor" opacity="' +
          (0.9 - seriesIndex * 0.12) + '"/>');
      });
    });
  } else {
    const groupWidth = plotWidth / data.length;
    const barWidth = Math.max(3, Math.min(36, groupWidth * 0.72 / series.length));
    data.forEach((row, index) => {
      series.forEach((item, seriesIndex) => {
        const value = Number(row[item.dataKey]);
        if (!Number.isFinite(value)) return;
        const barHeight = Math.abs(value) / span * plotHeight;
        const x = left + index * groupWidth + groupWidth * 0.14 + seriesIndex * barWidth;
        const y = value >= 0 ? zeroY - barHeight : zeroY;
        svg.push('<rect x="' + x + '" y="' + y + '" width="' + barWidth + '" height="' +
          Math.max(1, barHeight) + '" rx="3" fill="currentColor" opacity="' +
          (0.9 - seriesIndex * 0.12) + '"/>');
      });
      const label = String(row[xKey] == null ? '' : row[xKey]).slice(0, 14);
      svg.push('<text x="' + (left + index * groupWidth + groupWidth / 2) + '" y="' +
        (height - 24) + '" text-anchor="middle">' + escapeHtml(label) + '</text>');
    });
  }
  svg.push('</svg>');
  return svg.join('');
}
function renderMarkdown(source) {
  const renderer = new marked.Renderer();
  renderer.code = function (token) {
    const language = String(token.lang || '').toLowerCase().trim();
    if (language === 'mermaid') {
      const diagram = renderMermaid(token.text);
      if (diagram) return diagram;
    }
    return '<pre><code class="language-' + escapeHtml(language) + '">' + escapeHtml(token.text) + '</code></pre>';
  };
  renderer.image = function (token) {
    const alt = escapeHtml(token.text || '图片');
    const href = safeUrl(token.href);
    if (href && href.startsWith('/api/assets/')) {
      return '<img class="markdown-image" src="' + escapeHtml(href) + '" alt="' + alt + '"/>';
    }
    if (href && /^https?:/i.test(href)) {
      return '<span class="external-image-placeholder">' + alt + '（外部图片未自动加载）</span>';
    }
    return '<span class="external-image-placeholder">' + alt + '</span>';
  };
  const html = marked.parse(String(source || ''), { gfm: true, breaks: true, renderer });
  return sanitizeMarkdown(html);
}

function renderElement(node, options) {
  const attributes = node.attributes || {};
  const children = renderNodes(node.children, options);
  const name = node.name;
  const childText = textContent(node.children);

  if (name === 'row' || name === 'flow') {
    const gap = safeSpacing(attributes.gap);
    const rowGap = safeSpacing(attributes.rowGap);
    const columnGap = safeSpacing(attributes.columnGap);
    const align = safeEnum(attributes.align, new Set(['start', 'center', 'end', 'stretch', 'baseline']));
    const justify = safeEnum(attributes.justify, new Set(['start', 'center', 'end', 'between', 'around']));
    const wrap = attributes.wrap === false ? 'nowrap' : 'wrap';
    const style = [
      'display:flex',
      'flex-direction:row',
      'flex-wrap:' + wrap,
      gap ? 'gap:' + gap : '',
      rowGap ? 'row-gap:' + rowGap : '',
      columnGap ? 'column-gap:' + columnGap : '',
      align ? 'align-items:' + (align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align) : '',
      justify ? 'justify-content:' + (justify === 'between' ? 'space-between' : justify === 'around' ? 'space-around' : 'flex-' + justify) : ''
    ].filter(Boolean).join(';');
    return '<div class="' + (name === 'flow' ? 'dil-flow' : 'dil-row') + '" style="' + style + '">' + children + '</div>';
  }
  if (name === 'col' || name === 'box' || name === 'card' || name === 'flow-item' || name === 'grid-item' || name === 'pressable') {
    const gap = safeSpacing(attributes.gap);
    const flex = safeFlex(attributes.flex);
    const padding = safeSpacing(attributes.padding);
    const width = safeLength(attributes.width);
    const minWidth = safeLength(attributes.minWidth);
    const maxWidth = safeLength(attributes.maxWidth);
    const minHeight = safeLength(attributes.minHeight);
    const maxHeight = safeLength(attributes.maxHeight);
    const radius = safeLength(attributes.radius);
    const background = safeColor(attributes.background);
    const style = [
      'display:flex', 'flex-direction:column',
      gap ? 'gap:' + gap : '', flex ? 'flex:' + flex : '',
      padding ? 'padding:' + padding : '', width ? 'width:' + width : '',
      minWidth ? 'min-width:' + minWidth : '', maxWidth ? 'max-width:' + maxWidth : '',
      minHeight ? 'min-height:' + minHeight : '', maxHeight ? 'max-height:' + maxHeight : '',
      radius ? 'border-radius:' + radius : '', background ? 'background-color:' + background : ''
    ].filter(Boolean).join(';');
    return '<div class="dil-box ' + (name === 'card' ? 'dil-card' : '') + '" style="' + style + '">' + children + '</div>';
  }
  if (name === 'grid') {
    const columns = Math.max(1, Math.min(6, Number(attributes.columns) || 2));
    const gap = safeSpacing(attributes.gap) || '12px';
    return '<div class="dil-grid" style="grid-template-columns:repeat(' + columns + ',minmax(0,1fr));gap:' + gap + '">' + children + '</div>';
  }
  if (name === 'blockquote') return '<blockquote class="dil-quote">' + children + '</blockquote>';
  if (name === 'list') return '<ul class="dil-list">' + children + '</ul>';
  if (name === 'list-item') return '<li>' + children + '</li>';
  if (name === 'table') return '<div class="dil-table-wrap"><table class="dil-table">' + children + '</table></div>';
  if (name === 'table-section') return (attributes.header ? '<thead>' : '<tbody>') + children + (attributes.header ? '</thead>' : '</tbody>');
  if (name === 'table-row') return '<tr>' + children + '</tr>';
  if (name === 'table-cell') {
    const tag = attributes.header ? 'th' : 'td';
    const colSpan = Math.max(1, Math.min(20, Number(attributes.colSpan || attributes.colspan) || 1));
    const rowSpan = Math.max(1, Math.min(100, Number(attributes.rowSpan || attributes.rowspan) || 1));
    const width = safeLength(attributes.width);
    const padding = safeSpacing(attributes.padding);
    const align = safeEnum(attributes.align, new Set(['left', 'center', 'right']));
    const style = [width ? 'width:' + width : '', padding ? 'padding:' + padding : '', align ? 'text-align:' + align : ''].filter(Boolean).join(';');
    return '<' + tag + (colSpan > 1 ? ' colspan="' + colSpan + '"' : '') +
      (rowSpan > 1 ? ' rowspan="' + rowSpan + '"' : '') +
      (style ? ' style="' + style + '"' : '') + '>' + children + '</' + tag + '>';
  }
  if (name === 'divider') return '<hr class="dil-divider"/>';
  if (name === 'spacer') return '<span class="dil-spacer" aria-hidden="true"></span>';
  if (name === 'text') return '<span class="dil-text">' + children + '</span>';
  if (name === 'title') return '<h3 class="dil-title">' + children + '</h3>';
  if (name === 'caption' || name === 'label') return '<span class="dil-caption">' + children + '</span>';
  if (name === 'badge') return '<span class="dil-badge">' + children + '</span>';
  if (name === 'bold') return '<strong>' + children + '</strong>';
  if (name === 'italic') return '<em>' + children + '</em>';
  if (name === 'underline') return '<u>' + children + '</u>';
  if (name === 'strikethrough') return '<del>' + children + '</del>';
  if (name === 'code') return '<code>' + escapeHtml(childText) + '</code>';
  if (name === 'math') return '<span class="dil-math">' + escapeHtml(childText) + '</span>';
  if (name === 'icon' || name === 'favicon') {
    return '<span class="dil-icon" aria-label="' + escapeHtml(attributes.name || attributes.alt || '') + '">' +
      escapeHtml(attributes.name || attributes.alt || '•') + '</span>';
  }
  if (name === 'Entity') {
    const category = String(attributes.category || 'entity');
    const value = String(attributes.value || childText || '未知实体');
    return '<span class="dil-entity"><small>' + escapeHtml(category) + '</small><strong>' + escapeHtml(value) + '</strong></span>';
  }
  if (name === 'Cite' || name === 'CodeCite' || name === 'FileCite') {
    const refs = Array.isArray(attributes.refs) ? attributes.refs : [attributes.refs || attributes.ref || attributes.citation_id || childText];
    const sourceList = Array.isArray(options.sources) ? options.sources : [];
    return '<span class="dil-citations">' + refs.filter(Boolean).map(ref => {
      const source = sourceList.find(item => item && (item.ref_id === ref || item.id === ref || item.turn_id === ref));
      const href = safeUrl(source && (source.url || source.uri || source.safe_url));
      const label = String((source && (source.title || source.name)) || ref);
      if (href) return '<a class="dil-cite" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(label) + '</a>';
      return '<span class="dil-cite" title="' + escapeHtml(ref) + '">' + escapeHtml(label) + '</span>';
    }).join('') + '</span>';
  }
  if (name === 'Link') {
    const href = safeUrl(attributes.url || attributes.href);
    const label = children || escapeHtml(attributes.title || attributes.url || '打开链接');
    return href ? '<a class="dil-link" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>' : label;
  }
  if (name === 'AsyncImage') {
    const src = safeUrl(attributes.src);
    const alt = String(attributes.alt || attributes.query || '图片').slice(0, 500);
    const maxWidth = safeLength(attributes.maxWidth);
    const ratio = safeAspectRatio(attributes.aspectRatio);
    const style = [maxWidth ? 'max-width:' + maxWidth : '', ratio ? 'aspect-ratio:' + ratio : ''].filter(Boolean).join(';');
    if (src && src.startsWith('/api/assets/')) {
      return '<figure class="dil-image" style="' + style + '"><img src="' + escapeHtml(src) + '" alt="' + escapeHtml(alt) + '"/><figcaption>' + escapeHtml(alt) + '</figcaption></figure>';
    }
    return '<div class="dil-image-placeholder" style="' + style + '"><span>▧</span><div><strong>图片引用</strong><small>' +
      escapeHtml(attributes.query || attributes.alt || attributes.ref || '原始图片未包含在导出包中') +
      '</small></div></div>';
  }
  if (name === 'AsyncVideo') {
    const src = safeUrl(attributes.src);
    const label = String(attributes.alt || attributes.query || '视频').slice(0, 300);
    if (src && src.startsWith('/api/assets/')) {
      return '<video class="dil-video" controls preload="metadata" src="' + escapeHtml(src) + '">' + escapeHtml(label) + '</video>';
    }
    return '<div class="dil-image-placeholder dil-video-placeholder"><span>▶</span><div><strong>视频引用</strong><small>' +
      escapeHtml(attributes.query || attributes.alt || '视频文件未包含在导出包中') + '</small></div></div>';
  }
  if (name === 'AppBlock') {
    return '<div class="dil-app-block"><strong>交互式组件（AppBlock）</strong><p>为避免执行聊天记录中的任意 HTML / JavaScript，这里仅保留原始内容。</p><pre><code>' +
      escapeHtml(childText) + '</code></pre></div>';
  }
  if (name === 'AsyncImageGroup') {
    const query = String(attributes.query || '图片组');
    return '<div class="dil-image-placeholder"><span>▧</span><div><strong>图片组</strong><small>' + escapeHtml(query) + '</small></div></div>';
  }
  if (name === 'Chart') return '<div class="dil-chart-wrap">' + renderChart(attributes) + '</div>';
  if (name === 'MapWidgetV2') {
    const points = Array.isArray(attributes.points) ? attributes.points : [];
    const title = String(attributes.title || '地图 / 地点').slice(0, 120);
    const narrative = attributes.narrative || attributes.answer || '';
    const details = points.slice(0, 30).map(point => {
      const name = point && (point.name || point.label || point.address || point.title);
      const notes = point && (point.notes || point.description || '');
      return '<li><strong>' + escapeHtml(name || '未命名地点') + '</strong>' +
        (notes ? '<small>' + escapeHtml(notes) + '</small>' : '') + '</li>';
    }).join('');
    return '<section class="dil-map-card"><strong>' + escapeHtml(title) + '</strong>' +
      (narrative ? '<p>' + escapeHtml(narrative) + '</p>' : '') +
      (attributes.origin ? '<small>起点：' + escapeHtml(attributes.origin) + '</small>' : '') +
      (points.length ? '<ol>' + details + '</ol>' : '<p>未提供地点列表</p>') + '</section>';
  }
  if (name === 'CodeBlock') {
    const language = String(attributes.language || 'text');
    return '<pre class="dil-code-block"><code class="language-' + escapeHtml(language) + '">' + escapeHtml(childText) + '</code></pre>';
  }
  if (name === 'WritingBlock') return '<article class="dil-writing-block">' + children + '</article>';
  if (name === 'FollowUp') return '<span class="dil-followup">' + escapeHtml(attributes.value || attributes.label || childText) + '</span>';
  if (name === 'FollowUpPillGroup') return '<div class="dil-followup-group">' + children + '</div>';
  if (name === 'escape') return escapeHtml(childText);

  return '<div class="dil-unknown"><small>' + escapeHtml(name) + '</small>' + children + '</div>';
}

function renderNodes(nodes, options) {
  return (nodes || []).map(node => {
    if (node.type === 'text') return renderMarkdown(node.value);
    return renderElement(node, options);
  }).join('');
}

function renderRichContent(source, options = {}) {
  return renderNodes(parseDIL(source).children, options);
}

module.exports = {
  parseDIL,
  renderRichContent,
  renderMarkdown,
  renderMermaid,
  renderChart,
  safeUrl
};
