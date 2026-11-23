import { once } from "node:events";
import express from "express";

export async function startDocumentSource(text: string) {
  const app = express();
  const requests: string[] = [];
  app.use((request, _response, next) => { requests.push(request.originalUrl); next(); });
  app.get("/redirect/latest", (_request, response) => response.redirect("/definitions/spec.yaml"));
  app.get("/definitions/spec.yaml", (_request, response) => response.type("application/yaml").send(text));
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP listener");
  const origin = `http://127.0.0.1:${address.port}`;
  return { origin, url: `${origin}/redirect/latest`, finalUrl: `${origin}/definitions/spec.yaml`, requests,
    async close() { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); },
  };
}
