import express from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";

export function createApp(database: Kysely<DatabaseSchema>) {
  const app = express();
  app.use(express.json());

  app.get("/api/health", async (_request, response) => {
    try {
      await database.selectNoFrom((expression) => expression.lit(1).as("value")).executeTakeFirst();
      response.json({ status: "ok", database: "ok" });
    } catch {
      response.status(503).json({ status: "error", database: "unavailable" });
    }
  });

  return app;
}
