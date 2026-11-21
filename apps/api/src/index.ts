import { createApp } from "./app.js";
import { createDatabase, initializeDatabase } from "./database.js";

const database = createDatabase();
await initializeDatabase(database);
const app = createApp(database);
const port = Number(process.env.API_PORT ?? 3100);
const server = app.listen(port, "127.0.0.1", () => {
  process.stdout.write(`API listening on http://127.0.0.1:${port}\n`);
});

function shutdown() {
  server.close(() => {
    void database.destroy().finally(() => process.exit(0));
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
