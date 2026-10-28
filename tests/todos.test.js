const request = require('supertest');
const app = require('../src/app');
const store = require('../src/store');

beforeEach(() => {
  store.reset();
});

describe('Health check', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

describe('Web UI', () => {
  test('GET / serves the HTML page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});

describe('Creating tasks', () => {
  test('POST /api/todos creates a task', async () => {
    const res = await request(app).post('/api/todos').send({ title: 'Write lab record' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 1, title: 'Write lab record', completed: false });
    expect(res.body.createdAt).toBeDefined();
  });

  test('trims spaces around the title', async () => {
    const res = await request(app).post('/api/todos').send({ title: '   Revise DevOps   ' });
    expect(res.body.title).toBe('Revise DevOps');
  });

  test('rejects an empty title', async () => {
    const res = await request(app).post('/api/todos').send({ title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Title cannot be empty.');
  });

  test('rejects a missing title', async () => {
    const res = await request(app).post('/api/todos').send({});
    expect(res.status).toBe(400);
  });

  test('rejects a title longer than 200 characters', async () => {
    const res = await request(app).post('/api/todos').send({ title: 'a'.repeat(201) });
    expect(res.status).toBe(400);
  });

  test('rejects malformed JSON', async () => {
    const res = await request(app)
      .post('/api/todos')
      .set('Content-Type', 'application/json')
      .send('{"title": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Request body must be valid JSON.');
  });
});

describe('Reading tasks', () => {
  beforeEach(() => {
    store.create('First');
    store.create('Second');
    store.update(2, { completed: true });
  });

  test('GET /api/todos lists all tasks', async () => {
    const res = await request(app).get('/api/todos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('filters active tasks', async () => {
    const res = await request(app).get('/api/todos?filter=active');
    expect(res.body.map((t) => t.title)).toEqual(['First']);
  });

  test('filters completed tasks', async () => {
    const res = await request(app).get('/api/todos?filter=completed');
    expect(res.body.map((t) => t.title)).toEqual(['Second']);
  });

  test('rejects an unknown filter', async () => {
    const res = await request(app).get('/api/todos?filter=later');
    expect(res.status).toBe(400);
  });

  test('GET /api/todos/:id returns one task', async () => {
    const res = await request(app).get('/api/todos/1');
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('First');
  });

  test('returns 404 for a task that does not exist', async () => {
    const res = await request(app).get('/api/todos/99');
    expect(res.status).toBe(404);
  });

  test('returns 400 for an invalid id', async () => {
    const res = await request(app).get('/api/todos/abc');
    expect(res.status).toBe(400);
  });
});

describe('Updating tasks', () => {
  beforeEach(() => {
    store.create('Original');
  });

  test('marks a task as done', async () => {
    const res = await request(app).patch('/api/todos/1').send({ completed: true });
    expect(res.status).toBe(200);
    expect(res.body.completed).toBe(true);
  });

  test('renames a task', async () => {
    const res = await request(app).patch('/api/todos/1').send({ title: 'Renamed' });
    expect(res.body.title).toBe('Renamed');
  });

  test('rejects a non-boolean completed value', async () => {
    const res = await request(app).patch('/api/todos/1').send({ completed: 'yes' });
    expect(res.status).toBe(400);
  });

  test('rejects an empty update', async () => {
    const res = await request(app).patch('/api/todos/1').send({});
    expect(res.status).toBe(400);
  });

  test('returns 404 when updating a missing task', async () => {
    const res = await request(app).patch('/api/todos/42').send({ completed: true });
    expect(res.status).toBe(404);
  });
});

describe('Deleting tasks', () => {
  beforeEach(() => {
    store.create('Keep');
    store.create('Remove');
    store.update(2, { completed: true });
  });

  test('DELETE /api/todos/:id removes a task', async () => {
    const res = await request(app).delete('/api/todos/1');
    expect(res.status).toBe(204);
    expect(store.list()).toHaveLength(1);
  });

  test('returns 404 when deleting a missing task', async () => {
    const res = await request(app).delete('/api/todos/42');
    expect(res.status).toBe(404);
  });

  test('DELETE /api/todos/completed clears done tasks', async () => {
    const res = await request(app).delete('/api/todos/completed');
    expect(res.status).toBe(200);
    expect(res.body.removed).toBe(1);
    expect(store.list().map((t) => t.title)).toEqual(['Keep']);
  });
});

describe('Unknown routes', () => {
  test('unknown API route returns JSON 404', async () => {
    const res = await request(app).get('/api/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Route not found.');
  });
});
