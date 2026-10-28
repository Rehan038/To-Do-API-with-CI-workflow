const app = require('./app');
const store = require('./store');

const PORT = process.env.PORT || 3000;

store.seed();

app.listen(PORT, () => {
  console.log(`To-Do app running at http://localhost:${PORT}`);
});
