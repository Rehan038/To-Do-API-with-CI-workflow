// Front end for the To-Do REST API. All data lives on the server.

const API = '/api/todos';

const els = {
  day: document.getElementById('day'),
  date: document.getElementById('date'),
  progressText: document.getElementById('progress-text'),
  bar: document.getElementById('bar'),
  barFill: document.getElementById('bar-fill'),
  form: document.getElementById('composer'),
  input: document.getElementById('new-title'),
  formError: document.getElementById('form-error'),
  tabs: document.querySelectorAll('.tab'),
  clearDone: document.getElementById('clear-done'),
  list: document.getElementById('list'),
  empty: document.getElementById('empty'),
  emptyTitle: document.getElementById('empty-title'),
  emptyText: document.getElementById('empty-text'),
  toast: document.getElementById('toast'),
  template: document.getElementById('item-template'),
};

let todos = [];
let filter = 'all';
let newId = null;
let toastTimer = null;

const EMPTY_STATES = {
  all: ['Nothing on the list', 'Add your first task above to get started.'],
  active: ['All caught up', 'Every task is done. Add another above.'],
  completed: ['Nothing finished yet', 'Tick a task off and it will show up here.'],
};

// ---------- API helpers ----------
async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 3200);
}

function handleError(err) {
  const offline = err instanceof TypeError;
  showToast(offline ? 'Can’t reach the server. Check that npm start is running.' : err.message);
}

// ---------- Rendering ----------
function renderHeader() {
  const now = new Date();
  els.day.textContent = now.toLocaleDateString('en-GB', { weekday: 'long' });
  els.date.textContent = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderProgress() {
  const total = todos.length;
  const done = todos.filter((t) => t.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  els.progressText.textContent = total === 0 ? 'No tasks yet' : `${done} of ${total} done`;
  els.barFill.style.width = `${pct}%`;
  els.bar.setAttribute('aria-valuenow', String(pct));

  document.getElementById('count-all').textContent = total;
  document.getElementById('count-active').textContent = total - done;
  document.getElementById('count-completed').textContent = done;
  els.clearDone.disabled = done === 0;
}

function visibleTodos() {
  if (filter === 'active') return todos.filter((t) => !t.completed);
  if (filter === 'completed') return todos.filter((t) => t.completed);
  return todos;
}

function buildItem(todo) {
  const node = els.template.content.firstElementChild.cloneNode(true);
  node.dataset.id = todo.id;
  node.classList.toggle('is-done', todo.completed);
  if (todo.id === newId) node.classList.add('is-new');

  const checkbox = node.querySelector('.check-input');
  checkbox.checked = todo.completed;
  node.querySelector('.check-label').textContent = `Mark “${todo.title}” as ${todo.completed ? 'not done' : 'done'}`;
  node.querySelector('.title').textContent = todo.title;
  node.querySelector('.edit-btn').setAttribute('aria-label', `Rename “${todo.title}”`);
  node.querySelector('.delete-btn').setAttribute('aria-label', `Delete “${todo.title}”`);
  return node;
}

function render() {
  renderProgress();

  els.tabs.forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.filter === filter));
  });

  const items = visibleTodos();
  els.list.replaceChildren(...items.map(buildItem));
  newId = null;

  const isEmpty = items.length === 0;
  els.empty.hidden = !isEmpty;
  if (isEmpty) {
    const [title, text] = EMPTY_STATES[filter];
    els.emptyTitle.textContent = title;
    els.emptyText.textContent = text;
  }
}

// ---------- Actions ----------
async function load() {
  try {
    todos = await request(API);
    render();
  } catch (err) {
    handleError(err);
    render();
  }
}

async function addTodo(title) {
  const todo = await request(API, { method: 'POST', body: JSON.stringify({ title }) });
  todos.push(todo);
  newId = todo.id;
  if (filter === 'completed') {
    location.hash = '#/';
  }
  render();
}

async function toggleTodo(id, completed) {
  const updated = await request(`${API}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ completed }),
  });
  todos = todos.map((t) => (t.id === id ? updated : t));
  render();
}

async function renameTodo(id, title) {
  const updated = await request(`${API}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });
  todos = todos.map((t) => (t.id === id ? updated : t));
  render();
}

async function deleteTodo(id) {
  const removed = todos.find((t) => t.id === id);
  await request(`${API}/${id}`, { method: 'DELETE' });
  todos = todos.filter((t) => t.id !== id);
  render();
  if (removed) showToast(`Deleted “${removed.title}”`);
}

async function clearCompleted() {
  const { removed } = await request(`${API}/completed`, { method: 'DELETE' });
  todos = todos.filter((t) => !t.completed);
  render();
  showToast(removed === 1 ? 'Cleared 1 done task' : `Cleared ${removed} done tasks`);
}

// ---------- Inline editing ----------
function startEdit(item) {
  if (item.classList.contains('is-editing')) return;
  const id = Number(item.dataset.id);
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  const title = item.querySelector('.title');
  const input = item.querySelector('.edit-input');
  item.classList.add('is-editing');
  title.hidden = true;
  input.hidden = false;
  input.value = todo.title;
  input.focus();
  input.select();

  let finished = false;
  const finish = async (save) => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    if (!save || value === todo.title) {
      render();
      return;
    }
    if (value === '') {
      showToast('A task needs a name. Delete it instead if you no longer need it.');
      render();
      return;
    }
    try {
      await renameTodo(id, value);
    } catch (err) {
      handleError(err);
      render();
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

// ---------- Routing ----------
function applyHash() {
  const map = { '#/active': 'active', '#/completed': 'completed' };
  filter = map[location.hash] || 'all';
  render();
}

// ---------- Events ----------
els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = els.input.value.trim();
  if (!title) {
    els.formError.textContent = 'Type a task before adding it.';
    els.input.focus();
    return;
  }
  els.formError.textContent = '';
  try {
    await addTodo(title);
    els.input.value = '';
    els.input.focus();
  } catch (err) {
    if (err instanceof TypeError) handleError(err);
    else els.formError.textContent = err.message;
  }
});

els.input.addEventListener('input', () => {
  els.formError.textContent = '';
});

els.list.addEventListener('change', (e) => {
  if (!e.target.classList.contains('check-input')) return;
  const id = Number(e.target.closest('.item').dataset.id);
  toggleTodo(id, e.target.checked).catch((err) => {
    handleError(err);
    render();
  });
});

els.list.addEventListener('click', (e) => {
  const item = e.target.closest('.item');
  if (!item) return;
  const id = Number(item.dataset.id);

  if (e.target.closest('.delete-btn')) {
    deleteTodo(id).catch(handleError);
  } else if (e.target.closest('.edit-btn')) {
    startEdit(item);
  }
});

els.list.addEventListener('dblclick', (e) => {
  if (!e.target.classList.contains('title')) return;
  startEdit(e.target.closest('.item'));
});

els.clearDone.addEventListener('click', () => {
  clearCompleted().catch(handleError);
});

document.addEventListener('keydown', (e) => {
  const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
  if (e.key === '/' && !typing) {
    e.preventDefault();
    els.input.focus();
  }
});

window.addEventListener('hashchange', applyHash);

// ---------- Start ----------
renderHeader();
applyHash();
load();
