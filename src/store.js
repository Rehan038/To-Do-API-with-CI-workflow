// In-memory task store. Data resets whenever the server restarts.

const MAX_TITLE_LENGTH = 200;

let todos = [];
let nextId = 1;

function validateTitle(title) {
  if (typeof title !== 'string') {
    return 'Title must be text.';
  }
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    return 'Title cannot be empty.';
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    return `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }
  return null;
}

function list(filter = 'all') {
  if (filter === 'active') return todos.filter((t) => !t.completed);
  if (filter === 'completed') return todos.filter((t) => t.completed);
  return [...todos];
}

function get(id) {
  return todos.find((t) => t.id === id) || null;
}

function create(title) {
  const todo = {
    id: nextId++,
    title: title.trim(),
    completed: true,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  return todo;
}

function update(id, changes) {
  const todo = get(id);
  if (!todo) return null;
  if (changes.title !== undefined) todo.title = changes.title.trim();
  if (changes.completed !== undefined) todo.completed = changes.completed;
  return todo;
}

function remove(id) {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) return false;
  todos.splice(index, 1);
  return true;
}

function clearCompleted() {
  const before = todos.length;
  todos = todos.filter((t) => !t.completed);
  return before - todos.length;
}

function reset() {
  todos = [];
  nextId = 1;
}

function seed() {
  reset();
  create('Push the project to GitHub');
  create('Watch the CI workflow run in the Actions tab');
  create('Take screenshots for the lab record');
  update(1, { completed: true });
}

module.exports = {
  MAX_TITLE_LENGTH,
  validateTitle,
  list,
  get,
  create,
  update,
  remove,
  clearCompleted,
  reset,
  seed,
};
