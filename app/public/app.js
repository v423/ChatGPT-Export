'use strict';

(() => {
  const state = {
    items: [],
    offset: 0,
    total: 0,
    query: '',
    selectedId: null,
    selectedConversation: null,
    messages: [],
    hasMore: false,
    hasOlder: false,
    loadingList: false,
    loadingOlder: false,
    searchTimer: 0,
    importTimer: 0
  };

  const el = id => document.getElementById(id);
  const list = el('conversationList');
  const reader = el('messages');
  const toast = el('toast');

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(value) {
    if (!value) return '时间未知';
    const date = new Date(Number(value) * 1000);
    if (Number.isNaN(date.getTime())) return '时间未知';
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function formatBytes(value) {
    let size = Number(value) || 0;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    return size.toFixed(index === 0 || size >= 10 ? 0 : 1) + ' ' + units[index];
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('visible'), 3200);
  }

  async function api(url, options) {
    const response = await fetch(url, options);
    const type = response.headers.get('content-type') || '';
    const body = type.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message = body && body.error ? body.error : '请求失败：' + response.status;
      throw new Error(message);
    }
    return body;
  }

  async function refreshStats() {
    try {
      const stats = await api('/api/stats');
      el('stats').textContent = stats.conversations.toLocaleString('zh-CN') + ' 条对话 · ' +
        stats.messages.toLocaleString('zh-CN') + ' 条消息 · ' + formatBytes(stats.assetBytes) + ' 资源';
      el('conversationCount').textContent = stats.conversations.toLocaleString('zh-CN') + ' 条记录';
    } catch (error) {
      el('stats').textContent = '数据库连接失败';
    }
  }

  function renderList() {
    if (!state.items.length) {
      list.innerHTML = '<div class="empty-list">' +
        (state.query ? '没有找到匹配的对话' : '还没有导入记录') + '</div>';
      return;
    }

    list.innerHTML = state.items.map(item => {
      const active = item.id === state.selectedId ? ' active' : '';
      const project = item.project_title ? '<span class="conversation-project">' + escapeHtml(item.project_title) + '</span>' : '';
      return '<button class="conversation-item' + active + '" type="button" data-id="' + escapeHtml(item.id) + '">' +
        '<span class="conversation-item-title">' + escapeHtml(item.title || '未命名对话') + '</span>' +
        '<span class="conversation-item-meta">' + project +
        '<span>' + formatDate(item.updated_at) + '</span>' +
        '<span>' + (Number(item.message_count) || 0) + ' 条消息</span></span>' +
        '</button>';
    }).join('');
  }

  async function loadConversations(reset) {
    if (state.loadingList) return;
    state.loadingList = true;
    if (reset) {
      state.offset = 0;
      state.items = [];
    }
    el('listStatus').textContent = '正在查询…';
    try {
      const params = new URLSearchParams({
        limit: '50',
        offset: String(state.offset)
      });
      if (state.query) params.set('q', state.query);
      const result = await api('/api/conversations?' + params.toString());
      state.total = result.total;
      state.hasMore = result.hasMore;
      state.offset += result.items.length;
      state.items = reset ? result.items : state.items.concat(result.items);
      el('listStatus').textContent = state.total.toLocaleString('zh-CN') + ' 条匹配记录';
      renderList();
      if (state.hasMore && list.scrollHeight <= list.clientHeight + 12) {
        window.setTimeout(() => loadConversations(false), 0);
      }
    } catch (error) {
      el('listStatus').textContent = error.message;
      if (reset) list.innerHTML = '<div class="empty-list">' + escapeHtml(error.message) + '</div>';
    } finally {
      state.loadingList = false;
    }
  }

  function renderMessages() {
    if (!state.messages.length) {
      reader.innerHTML = '<div class="empty-list">这条对话没有可显示的消息</div>';
      return;
    }
    reader.innerHTML = state.messages.map(message => {
      const role = message.role === 'assistant' ? 'assistant' :
        message.role === 'user' ? 'user' : 'system';
      const roleLabel = message.role === 'assistant' ? 'ChatGPT' :
        message.role === 'user' ? '你' : (message.authorName || message.role || '消息');
      const channel = message.channel ? '<span class="message-channel">' + escapeHtml(message.channel) + '</span>' : '';
      return '<article class="message message-' + role + '" data-sequence="' + message.sequence + '">' +
        '<header class="message-header"><strong>' + escapeHtml(roleLabel) + '</strong>' + channel +
        '<time>' + formatDate(message.createdAt) + '</time></header>' +
        '<div class="message-content">' + (message.contentHtml || '') + '</div>' +
        '</article>';
    }).join('');
  }

  async function selectConversation(id) {
    state.selectedId = id;
    state.selectedConversation = null;
    state.messages = [];
    state.hasOlder = false;
    state.nextBefore = null;
    el('emptyState').hidden = true;
    el('conversationHeader').hidden = false;
    reader.hidden = false;
    reader.innerHTML = '<div class="loading-state">正在加载对话…</div>';
    el('olderContainer').hidden = true;
    renderList();

    try {
      const result = await api('/api/conversations/' + encodeURIComponent(id) + '?limit=80');
      state.selectedConversation = result;
      state.messages = result.messages || [];
      state.hasOlder = Boolean(result.hasOlder);
      state.nextBefore = result.nextBefore;
      el('conversationTitle').textContent = result.title || '未命名对话';
      el('conversationMeta').textContent =
        (result.projectTitle ? result.projectTitle + ' · ' : '') +
        formatDate(result.updatedAt) + ' · ' + result.messageCount + ' 条消息';
      renderMessages();
      el('olderContainer').hidden = !state.hasOlder;
      reader.scrollTop = reader.scrollHeight;
    } catch (error) {
      reader.innerHTML = '<div class="empty-list">' + escapeHtml(error.message) + '</div>';
    }
  }

  async function loadOlderMessages() {
    if (!state.selectedId || !state.hasOlder || state.loadingOlder || !state.messages.length) return;
    state.loadingOlder = true;
    el('loadOlderButton').disabled = true;
    el('loadOlderButton').textContent = '正在加载…';
    const before = state.messages[0].sequence;
    try {
      const params = new URLSearchParams({ limit: '80', before: String(before) });
      const oldHeight = reader.scrollHeight;
      const oldTop = reader.scrollTop;
      const result = await api('/api/conversations/' + encodeURIComponent(state.selectedId) + '/messages?' + params.toString());
      state.messages = result.items.concat(state.messages);
      state.hasOlder = Boolean(result.hasOlder);
      state.nextBefore = result.nextBefore;
      renderMessages();
      reader.scrollTop = oldTop + (reader.scrollHeight - oldHeight);
      el('olderContainer').hidden = !state.hasOlder;
    } catch (error) {
      showToast(error.message);
    } finally {
      state.loadingOlder = false;
      el('loadOlderButton').disabled = false;
      el('loadOlderButton').textContent = '加载更早的消息';
    }
  }

  async function pollImport(jobId) {
    window.clearTimeout(state.importTimer);
    try {
      const job = await api('/api/imports/' + encodeURIComponent(jobId));
      const processed = Number(job.processed_entries) || 0;
      const total = Number(job.total_entries) || 0;
      const percent = total > 0 ? Math.min(98, Math.round(processed / total * 100)) : 0;
      el('importTitle').textContent = job.status === 'completed' ? '导入完成' :
        job.status === 'failed' ? '导入失败' : '正在导入：' + job.filename;
      el('importPercent').textContent = processed.toLocaleString('zh-CN') + ' 个条目';
      el('importProgress').style.width = (job.status === 'completed' ? 100 : percent) + '%';
      el('importDetails').textContent =
        '会话新增 ' + job.conversations_added + ' · 更新 ' + job.conversations_updated +
        ' · 消息 ' + job.messages_imported.toLocaleString('zh-CN') +
        ' · 资源 ' + job.assets_added.toLocaleString('zh-CN');
      if (job.status === 'completed') {
        el('importPanel').hidden = true;
        showToast('导入完成');
        await Promise.all([refreshStats(), loadConversations(true)]);
        return;
      }
      if (job.status === 'failed' || job.status === 'duplicate') {
        el('importPanel').hidden = true;
        showToast(job.error || (job.status === 'duplicate' ? '这个 ZIP 已经导入过' : '导入失败'));
        await refreshStats();
        return;
      }
      state.importTimer = window.setTimeout(() => pollImport(jobId), 900);
    } catch (error) {
      el('importPanel').hidden = true;
      showToast(error.message);
    }
  }

  async function importFile(file) {
    if (!file) return;
    el('importPanel').hidden = false;
    el('importTitle').textContent = '正在上传：' + file.name;
    el('importPercent').textContent = formatBytes(file.size);
    el('importProgress').style.width = '4%';
    el('importDetails').textContent = '上传完成后会在本机流式解析并写入 SQLite。';
    try {
      const result = await api('/api/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/zip',
          'X-File-Name': encodeURIComponent(file.name)
        },
        body: file
      });
      pollImport(result.jobId);
    } catch (error) {
      el('importPanel').hidden = true;
      showToast(error.message);
    }
  }

  function openImportPicker() {
    el('zipInput').click();
  }

  el('importButton').addEventListener('click', openImportPicker);
  el('emptyImportButton').addEventListener('click', openImportPicker);
  el('zipInput').addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    if (file) importFile(file);
    event.target.value = '';
  });
  el('searchInput').addEventListener('input', event => {
    window.clearTimeout(state.searchTimer);
    state.query = event.target.value.trim();
    state.searchTimer = window.setTimeout(() => loadConversations(true), 280);
  });
  el('refreshButton').addEventListener('click', () => {
    loadConversations(true);
    refreshStats();
  });
  el('loadOlderButton').addEventListener('click', loadOlderMessages);
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-id]');
    if (button) selectConversation(button.dataset.id);
  });
  list.addEventListener('scroll', () => {
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 160 && state.hasMore && !state.loadingList) {
      loadConversations(false);
    }
  });
  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      el('searchInput').focus();
    }
    if (event.key === 'Escape') {
      el('searchInput').blur();
    }
  });

  Promise.all([refreshStats(), loadConversations(true)]);
})();
