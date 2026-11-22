import { once } from "node:events";
import { randomUUID } from "node:crypto";
import express, { type Response } from "express";

export async function startSseSource() {
  const app = express();
  app.use(express.json());
  const streams = new Map<string, Response>();
  const requests: Array<{ method: string; authorization: string | undefined }> = [];
  app.use((request, response, next) => {
    requests.push({ method: request.method, authorization: request.header("authorization") });
    if (request.header("authorization") !== "Bearer sse-secret") { response.status(401).end(); return; }
    next();
  });
  app.get("/sse", (_request, response) => {
    const id = randomUUID();
    streams.set(id, response);
    response.setHeader("Content-Type", "text/event-stream");
    response.write(`event: endpoint\ndata: /messages?sessionId=${id}\n\n`);
    response.on("close", () => { streams.delete(id); });
  });
  app.post("/messages", (request, response) => {
    const stream = streams.get(String(request.query.sessionId));
    if (!stream) { response.status(404).end(); return; }
    response.status(202).end();
    if (request.body.id === undefined) return;
    let result: unknown;
    if (request.body.method === "initialize") result = {
      protocolVersion: "2025-11-25", capabilities: { tools: {} }, serverInfo: { name: "sse-source", version: "1.0.0" },
    };
    else if (request.body.method === "tools/list") result = { tools: [{ name: "echo", inputSchema: { type: "object", properties: { text: { type: "string" } } } }] };
    else result = {
      content: [{ type: "text", text: request.body.params.arguments.text }, { type: "image", data: "aGVsbG8=", mimeType: "image/png" }],
      structuredContent: { source: "legacy" },
    };
    stream.write(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: request.body.id, result })}\n\n`);
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP listener");
  return {
    url: `http://127.0.0.1:${address.port}/sse`, requests,
    get connectionCount() { return streams.size; },
    async close() {
      for (const stream of streams.values()) stream.end();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}
