import { createHash } from "node:crypto";
import type { Request } from "express";
import type { Kysely } from "kysely";
import type { DatabaseSchema } from "../../database/schema.js";

export const sessionDurationSeconds = 12 * 60 * 60;
export const sessionCookieName = "ach_session";

export type AuthenticatedUser = {
  id: string;
  username: string;
  isAdmin: boolean;
};

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function readCookie(request: Request, name: string) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  const cookie = cookies.map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}

export async function getSessionUser(database: Kysely<DatabaseSchema>, request: Request): Promise<AuthenticatedUser | null> {
  const token = readCookie(request, sessionCookieName);
  if (!token) return null;

  const session = await database
    .selectFrom("sessions")
    .innerJoin("users", "users.id", "sessions.userId")
    .select(["users.id", "users.username", "users.isAdmin", "users.active", "sessions.expiresAt"])
    .where("sessions.id", "=", hashSessionToken(token))
    .executeTakeFirst();
  if (!session || !session.active || session.expiresAt <= new Date().toISOString()) return null;

  return { id: session.id, username: session.username, isAdmin: Boolean(session.isAdmin) };
}

export type ResolveSessionUser = (request: Request) => Promise<AuthenticatedUser | null>;
