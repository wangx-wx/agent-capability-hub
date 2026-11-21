import Sqlite from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { Kysely, SqliteDialect } from "kysely";
import request from "supertest";
import { createApp } from "../src/app.js";
import type { DatabaseSchema } from "../src/database.js";

describe("GET /api/health", () => {
  let database: Kysely<DatabaseSchema> | undefined;

  afterEach(async () => {
    await database?.destroy();
    database = undefined;
  });

  it("reports the API and SQLite connection as healthy", async () => {
    database = new Kysely<DatabaseSchema>({
      dialect: new SqliteDialect({ database: new Sqlite(":memory:") }),
    });

    const response = await request(createApp(database)).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok", database: "ok" });
  });
});
