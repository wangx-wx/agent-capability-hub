import { createApp } from "./app.js";
import { loadProjectEnv } from "./config/env.js";
import { createDatabase } from "./database/client.js";
import { initializeDatabase } from "./database/initialize.js";

loadProjectEnv();
const database = createDatabase();
await initializeDatabase(database);
const app = createApp(database);
await app.locals.startMcp();
const port = Number(process.env.API_PORT ?? 3100);
const host = process.env.API_HOST ?? "0.0.0.0";
const server = app.listen(port, host, () => {
  process.stdout.write(`API listening on http://${host.includes(":") ? `[${host}]` : host}:${port}\n`);
});

function shutdown() {
  server.close(() => {
    void app.locals.closeMcp().then(() => database.destroy()).finally(() => process.exit(0));
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
