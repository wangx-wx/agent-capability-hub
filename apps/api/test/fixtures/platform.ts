import { once } from "node:events";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createDatabase, initializeDatabase } from "../../src/database.js";

export async function startPlatform(options?: Parameters<typeof createApp>[1], database = createDatabase(":memory:")) {
  await initializeDatabase(database, { adminUsername: "root", adminPassword: "administrator password" });
  const app = createApp(database, options);
  const admin = request.agent(app);
  await admin.post("/api/auth/login").send({ username: "root", password: "administrator password" }).expect(200);
  const key = await admin.post("/api/keys").send({ name: "SDK client", expiresAt: null }).expect(201);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected a TCP listener");
  return {
    app, admin, token: key.body.key.value as string, keyId: key.body.key.id as string,
    url: new URL(`http://127.0.0.1:${address.port}/mcp`),
    async close() {
      await app.locals.closeMcp();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await database.destroy();
    },
  };
}
