import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Sqlite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import type { DatabaseSchema } from "./schema.js";

export function createDatabase(path = process.env.DATABASE_PATH ?? "../../data/agent-capability-hub.sqlite") {
  const databasePath = path === ":memory:" ? path : resolve(process.cwd(), path);

  if (databasePath !== ":memory:") {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const sqlite = new Sqlite(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return new Kysely<DatabaseSchema>({
    dialect: new SqliteDialect({ database: sqlite }),
  });
}
