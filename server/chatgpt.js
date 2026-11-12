'use strict';

const path = require('node:path').posix;
const crypto = require('node:crypto');
const { parseDIL } = require('./rich-content');

function normalizeTimestamp(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return Math.floor(number > 1000000000000 ? number / 1000 : number);
}

function textFromPart(part) {
  if (typeof part === 'string') return part;
  if (!part || typeof part !== 'object') return '';
  if (typeof part.text === 'string') return part.text;
  if (typeof part.content === 'string') return part.content;
  return '';
}

function assetMarkerFromObject(value) {
  if (!value || typeof value !== 'object') return null;
  const pointer = value.asset_pointer || value.assetPointer || value.file_id ||
    value.fileId || value.file_token || value.fileToken || value.attachment_id;
  if (!pointer || typeof pointer !== 'string') return null;
  const hint = [
    value.content_type, value.type, value.mime_type, value.media_type,
    value.file_type, value.kind
  ].filter(Boolean).join(' ').toLowerCase();
  const isImage = hint.includes('image') || Boolean(value.asset_pointer || value.assetPointer);
  const kind = isImage ? 'image' : 'file';
  const label = value.filename || value.file_name || value.name || pointer;
  return '<!-- ' + kind + ':' + (isImage ? pointer : label) + ' -->';
}

function collectAssetMarkers(value, output, visited, depth) {
  if (!value || typeof value !== 'object' || depth > 6 || output.size >= 40 || visited.has(value)) return;
  visited.add(value);
  const marker = assetMarkerFromObject(value);
  if (marker) output.set(marker, marker);
  if (Array.isArray(value)) {
    value.forEach(item => collectAssetMarkers(item, output, visited, depth + 1));
    return;
  }
  Object.keys(value).forEach(key => {
    if (['thumbnail', 'preview', 'image_url', 'url'].includes(key)) return;
    collectAssetMarkers(value[key], output, visited, depth + 1);
  });
}

function extractContentText(content, metadata = {}) {
  if (!content || typeof content !== 'object') return '';
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const values = parts.map(textFromPart).filter(Boolean);
  if (!values.length && typeof content.text === 'string') values.push(content.text);

  const markers = new Map();
  const visited = new Set();
  collectAssetMarkers(content, markers, visited, 0);
  collectAssetMarkers(metadata.attachments, markers, visited, 0);
  collectAssetMarkers(metadata.files, markers, visited, 0);
  const current = values.join('\n');
  const missingMarkers = Array.from(markers.keys()).filter(marker => !current.includes(marker));
  if (missingMarkers.length) values.push(...missingMarkers);
  return values.join('\n');
}

function collectCurrentPath(mapping, currentNodeId) {
  const current = new Set();
  let nodeId = currentNodeId;
  while (nodeId && !current.has(nodeId)) {
    current.add(nodeId);
    nodeId = mapping[nodeId] && mapping[nodeId].parent;
  }
  return current;
}

function extractMessages(data) {
  const mapping = data && data.mapping;
  if (!mapping || typeof mapping !== 'object') return [];

  const ids = Object.keys(mapping);
  const rootId = mapping['client-created-root']
    ? 'client-created-root'
    : (ids.find(id => !mapping[id] || !mapping[id].parent) || ids[0]);
  const currentPath = collectCurrentPath(mapping, data.current_node);
  const visited = new Set();
  const ordered = [];

  function visit(startId) {
    const stack = [startId];
    while (stack.length) {
      const nodeId = stack.pop();
      if (!nodeId || visited.has(nodeId)) continue;
      visited.add(nodeId);
      const node = mapping[nodeId];
      if (!node) continue;
      if (node.message) ordered.push({ nodeId, node, message: node.message });
      const children = Array.isArray(node.children) ? node.children : [];
      for (let index = children.length - 1; index >= 0; index -= 1) {
        stack.push(children[index]);
      }
    }
  }

  if (rootId) visit(rootId);
  ids
    .filter(id => !visited.has(id))
    .sort((left, right) => {
      const a = normalizeTimestamp(mapping[left]?.message?.create_time) || 0;
      const b = normalizeTimestamp(mapping[right]?.message?.create_time) || 0;
      return a - b;
    })
    .forEach(visit);

  return ordered.map((item, sequence) => {
    const message = item.message;
    const content = message.content || {};
    const metadata = message.metadata || {};
    const contentText = extractContentText(content, metadata);
    return {
      messageId: String(message.id || item.nodeId),
      nodeId: String(item.nodeId),
      parentId: item.node.parent ? String(item.node.parent) : null,
      sequence,
      role: String(message.author?.role || 'unknown'),
      authorName: message.author?.name ? String(message.author.name) : null,
      channel: metadata.channel ? String(metadata.channel) : (metadata.message_type ? String(metadata.message_type) : null),
      recipient: message.recipient ? String(message.recipient) : null,
      createdAt: normalizeTimestamp(message.create_time),
      updatedAt: normalizeTimestamp(message.update_time),
      contentType: content.content_type ? String(content.content_type) : null,
      contentText,
      contentJson: JSON.stringify(content),
      metadataJson: JSON.stringify(metadata),
      dilAst: parseDIL(contentText),
      isCurrentPath: currentPath.has(item.nodeId) ? 1 : 0
    };
  });
}

function parseConversation(data, sourcePath) {
  if (!data || typeof data !== 'object' || !data.mapping || typeof data.mapping !== 'object') return null;

  const normalizedPath = String(sourcePath || '').replace(/\\/g, '/');
  const projectPath = path.dirname(normalizedPath) === '.' ? '' : path.dirname(normalizedPath);
  const filename = path.basename(normalizedPath);
  const conversationId = String(data.conversation_id || '');
  const id = conversationId || crypto.createHash('sha256').update(normalizedPath).digest('hex').slice(0, 32);
  const messages = extractMessages(data);
  const createdAt = normalizeTimestamp(data.create_time) ||
    (messages.find(message => message.createdAt)?.createdAt || null);
  const updatedAt = normalizeTimestamp(data.update_time) ||
    (messages.slice().reverse().find(message => message.createdAt)?.createdAt || createdAt);
  const title = String(data.title || filename.replace(/\.json$/i, '') || id).trim();

  return {
    id,
    conversationId: conversationId || id,
    title: title || id,
    projectPath,
    projectTitle: projectPath ? path.basename(projectPath) : null,
    sourcePath: normalizedPath,
    createdAt,
    updatedAt,
    messages
  };
}

module.exports = { normalizeTimestamp, extractContentText, extractMessages, parseConversation };
