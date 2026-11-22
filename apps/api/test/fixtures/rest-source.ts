import { once } from "node:events";
import express from "express";

export async function startRestSource() {
  const app = express();
  app.use(express.json());
  const requests: Array<{ method: string; url: string; authorization: string | undefined; tenant: string | undefined; body: unknown }> = [];
  let response = { status: 200, contentType: "application/json", body: '{ "accepted": true }' };
  app.use((request, reply) => {
    requests.push({ method: request.method, url: request.originalUrl, authorization: request.header("authorization"), tenant: request.header("x-tenant"), body: request.body });
    reply.status(response.status).setHeader("Content-Type", response.contentType);
    reply.end(response.body);
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP listener");
  return {
    url: `http://127.0.0.1:${address.port}/v1`, requests,
    respond(value: typeof response) { response = value; },
    async close() { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); },
  };
}
