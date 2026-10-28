# To-Do App with CI

![CI](https://github.com/YOUR_GITHUB_USERNAME/todo-ci-app/actions/workflows/ci.yml/badge.svg)

A To-Do REST API built with Node.js and Express, with a web UI. Every commit pushed to `main` runs a GitHub Actions workflow that installs dependencies, lints the code with ESLint and runs the Jest test suite on Node 20 and 22.

## Run it locally

```powershell
npm install
npm start
```

Open http://localhost:3000.

```powershell
npm run lint   # check code style
npm test       # run the 24 API tests
```

## API

| Method | Route | What it does |
| --- | --- | --- |
| GET | `/health` | Health check, returns `{ "status": "ok" }` |
| GET | `/api/todos?filter=all\|active\|completed` | List tasks |
| POST | `/api/todos` | Create a task: `{ "title": "..." }` |
| GET | `/api/todos/:id` | Get one task |
| PATCH | `/api/todos/:id` | Update: `{ "title": "..." }` and/or `{ "completed": true }` |
| DELETE | `/api/todos/:id` | Delete a task |
| DELETE | `/api/todos/completed` | Delete all done tasks |

Tasks are kept in memory, so they reset when the server restarts.

## Project layout

```
todo-ci-app/
├── .github/workflows/ci.yml   GitHub Actions workflow
├── public/                    Web UI (HTML, CSS, JS)
├── src/
│   ├── app.js                 Express app and routes
│   ├── server.js              Starts the server
│   └── store.js               In-memory task store
├── tests/todos.test.js        Jest + Supertest API tests
├── eslint.config.js           ESLint rules
└── package.json
```

## Push to GitHub

```powershell
git init
git add .
git commit -m "Initial commit: To-Do API with CI workflow"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/todo-ci-app.git
git push -u origin main
```

Then open the **Actions** tab on the repository to watch the workflow run.
