import { randomBytes } from "node:crypto";
import { loadProjectEnv } from "../config/env.js";
import { createDatabase } from "../database/client.js";
import { hashPassword } from "../modules/auth/password.js";

loadProjectEnv();
const database = createDatabase();

try {
  const admin = await database.selectFrom("users").select(["id", "username"]).where("isAdmin", "=", 1).executeTakeFirst();
  if (!admin) throw new Error("No initialized administrator found in the configured database");

  const password = randomBytes(24).toString("base64url");
  await database.transaction().execute(async (transaction) => {
    await transaction.updateTable("users").set({ passwordHash: hashPassword(password) }).where("id", "=", admin.id).execute();
    await transaction.deleteFrom("sessions").where("userId", "=", admin.id).execute();
  });
  process.stdout.write(`Administrator: ${admin.username}\nNew password: ${password}\n`);
} finally {
  await database.destroy();
}
