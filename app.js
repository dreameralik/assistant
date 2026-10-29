const storageKey = 'mosya-data-v1';
const workerUrl = 'https://dreamer-ai.dreameralik-89.workers.dev/ask';
const state = JSON.parse(localStorage.getItem(storageKey) || '{"tasks":[],"notes":[],"queue":[],"responses":[]}');
state.tasks ||= [];
state.notes ||= [];
state.queue ||= [];
state.responses ||= [];
state.lastError ||= '';
const $ = (selector) => document.querySelector(selector);

function save() { localStorage.setItem(storageKey, JSON.stringify(state)); render(); }
function render() {
  const tasks = $('#taskList');
  tasks.innerHTML = state.tasks.map((task, index) => `<li><input type="checkbox" data-task="${index}" ${task.done ? 'checked' : ''}><label class="${task.done ? 'done' : ''}">${escapeHtml(task.text)}</label><button class="delete" data-delete="${index}">Удалить</button></li>`).join('');
  $('#emptyTasks').hidden = state.tasks.length > 0;
  $('#taskCount').textContent = state.tasks.filter((task) => !task.done).length;
  $('#queueInfo').textContent = state.lastError || `В очереди: ${state.queue.length}`;
  $('#queueList').innerHTML = state.queue.map((request, index) => `<li><label>${escapeHtml(request.text)}<small>Ожидает подключения</small></label><button class="delete" data-queue-delete="${index}">Удалить</button></li>`).join('');
  $('#responses').innerHTML = state.responses.map((response) => `<article><strong>Dreamer:</strong><br>${escapeHtml(response)}</article>`).join('');
  $('#notes').innerHTML = state.notes.map((note) => `<article>${escapeHtml(note)}</article>`).join('');
}
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character])); }
function addTask() { const input = $('#taskInput'); const text = input.value.trim(); if (!text) return; state.tasks.unshift({ text, done: false }); input.value = ''; save(); }
function updateConnection() { $('#connection').textContent = navigator.onLine ? 'Онлайн' : 'Без интернета'; $('#connection').classList.toggle('online', navigator.onLine); if (navigator.onLine) processQueue(); }
async function processQueue() {
  if (!state.queue.length) return;
  const request = state.queue[0];
  try {
    const result = await fetch(workerUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: request.text }) });
    const data = await result.json();
    if (!result.ok || data.error) throw new Error(data.error || 'Ошибка Worker');
    state.responses.unshift(data.text || 'Ответ не получен.');
    state.queue.shift();
    state.lastError = '';
    save();
    if (state.queue.length) processQueue();
  } catch (error) { state.lastError = `Ошибка: ${error.message}`; save(); }
}

$('#addTask').addEventListener('click', addTask);
$('#taskInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') addTask(); });
$('#taskList').addEventListener('click', (event) => { const checkbox = event.target.closest('[data-task]'); const remove = event.target.closest('[data-delete]'); if (checkbox) state.tasks[checkbox.dataset.task].done = checkbox.checked; if (remove) state.tasks.splice(remove.dataset.delete, 1); save(); });
$('#queueList').addEventListener('click', (event) => { const remove = event.target.closest('[data-queue-delete]'); if (!remove) return; state.queue.splice(remove.dataset.queueDelete, 1); save(); });
$('#queueRequest').addEventListener('click', () => { const input = $('#aiInput'); const text = input.value.trim(); if (!text) return; state.lastError = ''; state.queue.push({ text, createdAt: new Date().toISOString(), status: 'waiting' }); input.value = ''; save(); if (navigator.onLine) processQueue(); });
$('#saveNote').addEventListener('click', () => { const input = $('#noteInput'); const text = input.value.trim(); if (!text) return; state.notes.unshift(text); input.value = ''; save(); });
window.addEventListener('online', updateConnection); window.addEventListener('offline', updateConnection); updateConnection(); render();
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
