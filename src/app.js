const path = require('path');
const express = require('express');
const store = require('./store');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check — useful for CI and container checks
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Parse :id and reject anything that is not a positive whole number
function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Task id must be a positive whole number.' });
    return null;
  }
  return id;
}

// GET /api/todos?filter=all|active|completed
app.get('/api/todos', (req, res) => {
  const filter = req.query.filter || 'all';
  if (!['all', 'active', 'completed'].includes(filter)) {
    return res.status(400).json({ error: 'Filter must be all, active or completed.' });
  }
  res.json(store.list(filter));
});

// POST /api/todos  { "title": "..." }
app.post('/api/todos', (req, res) => {
  const title = req.body ? req.body.title : undefined;
  const error = store.validateTitle(title);
  if (error) return res.status(400).json({ error });
  res.status(201).json(store.create(title));
});

// DELETE /api/todos/completed — must be declared before /:id
app.delete('/api/todos/completed', (req, res) => {
  const removed = store.clearCompleted();
  res.json({ removed });
});

// GET /api/todos/:id
app.get('/api/todos/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const todo = store.get(id);
  if (!todo) return res.status(404).json({ error: 'Task not found.' });
  res.json(todo);
});

// PATCH /api/todos/:id  { "title"?: "...", "completed"?: true|false }
app.patch('/api/todos/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const { title, completed } = req.body || {};
  if (title === undefined && completed === undefined) {
    return res.status(400).json({ error: 'Send a title or completed value to update.' });
  }
  if (title !== undefined) {
    const error = store.validateTitle(title);
    if (error) return res.status(400).json({ error });
  }
  if (completed !== undefined && typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Completed must be true or false.' });
  }

  const todo = store.update(id, { title, completed });
  if (!todo) return res.status(404).json({ error: 'Task not found.' });
  res.json(todo);
});

// DELETE /api/todos/:id
app.delete('/api/todos/:id', (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  if (!store.remove(id)) return res.status(404).json({ error: 'Task not found.' });
  res.status(204).end();
});

// Unknown API routes return JSON, not HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Malformed JSON bodies
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  next(err);
});

module.exports = app;
