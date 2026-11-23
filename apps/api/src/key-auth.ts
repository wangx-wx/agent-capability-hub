import type { Request } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "./database.js";

export async function resolveApiKey(database: Kysely<DatabaseSchema>, request: Request) {
  const authorization = request.header("authorization") ?? "";
  const keyValue = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const key = keyValue
    ? await database
        .selectFrom("api_keys")
        .innerJoin("users", "users.id", "api_keys.userId")
        .select(["api_keys.id as keyId", "users.id as userId", "users.isAdmin", "users.active", "api_keys.expiresAt"])
        .where("api_keys.value", "=", keyValue)
        .where("api_keys.revokedAt", "is", null)
        .executeTakeFirst()
    : undefined;
  if (!key || !key.active || (key.expiresAt !== null && key.expiresAt <= new Date().toISOString())) return null;
  return key;
}
