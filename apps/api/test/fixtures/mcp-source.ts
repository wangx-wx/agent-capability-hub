import { once } from "node:events";
import express from "express";
import { Server, createMcpHandler, type Tool } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";

export async function startMcpSource() {
  const tools: Tool[] = [
    { name: "echo", description: "Echo text", inputSchema: { type: "object", properties: { text: { type: "string" } }, required: ["text"], additionalProperties: false } },
    { name: "count", description: "Return a count", inputSchema: { type: "object", properties: {} } },
  ];
  const calls: Array<{ name: string; arguments: unknown; authorization: string | undefined }> = [];
  let held: Promise<void> | undefined;
  let started: (() => void) | undefined;
  const handler = createMcpHandler(() => {
    const server = new Server({ name: "controlled-source", version: "1.0.0" }, { capabilities: { tools: {} } });
    server.setRequestHandler("tools/list", async (request) => request.params?.cursor
      ? { tools: tools.slice(1) } : { tools: tools.slice(0, 1), nextCursor: tools.length > 1 ? "page-2" : undefined });
    server.setRequestHandler("tools/call", async (request, context) => {
      calls.push({ name: request.params.name, arguments: request.params.arguments, authorization: context.http?.req?.headers.get("authorization") ?? undefined });
      started?.();
      await held;
      return { content: [{ type: "text", text: String(request.params.arguments?.text ?? "2") }] };
    });
    return server;
  });
  const app = express();
  app.use(express.json());
  const nodeHandler = toNodeHandler(handler);
  app.all("/mcp", (request, response) => void nodeHandler(request, response, request.body));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP listener");
  return {
    tools, calls, url: `http://127.0.0.1:${address.port}/mcp`,
    holdCalls() {
      let release!: () => void;
      held = new Promise<void>((resolve) => { release = resolve; });
      return { started: new Promise<void>((resolve) => { started = resolve; }), release };
    },
    async close() {
      await handler.close();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}
