import { createApp } from "../../src/app.js";
import { createDatabase, initializeDatabase } from "../../src/database.js";
import { startMcpSource } from "./mcp-source.js";
import { startRestSource } from "./rest-source.js";

const database = createDatabase(":memory:");
await initializeDatabase(database, { adminUsername: "browser-admin", adminPassword: "browser-test-password" });
const source = await startMcpSource();
const rest = await startRestSource();
const app = createApp(database);
app.get("/__fixture__/targets", (_request, response) => response.json({ mcp: source.url, rest: rest.url }));
const server = app.listen(3310, "127.0.0.1");
async function close() {
  await app.locals.closeMcp();
  await source.close();
  await rest.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await database.destroy();
  process.exit(0);
}
process.once("SIGINT", () => void close());
process.once("SIGTERM", () => void close());
