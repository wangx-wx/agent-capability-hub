import { randomUUID } from "node:crypto";
import { Migrator, type Kysely, type MigrationProvider } from "kysely";
import { hashPassword } from "../modules/auth/password.js";
import type { DatabaseSchema } from "./schema.js";
import { initialMigration } from "./migrations/001-initial.js";
import { serviceMigration } from "./migrations/002-services.js";
import { toolMigration } from "./migrations/003-tools.js";
import { auditMigration } from "./migrations/004-audit.js";
import { toolNameMigration } from "./migrations/005-tool-names.js";

const migrationProvider: MigrationProvider = {
  getMigrations: async () => ({ "001_initial": initialMigration, "002_services": serviceMigration, "003_tools": toolMigration, "004_audit": auditMigration, "005_tool_names": toolNameMigration }),
};

export interface InitialAdminCredentials {
  adminUsername?: string;
  adminPassword?: string;
}

export async function initializeDatabase(
  database: Kysely<DatabaseSchema>,
  credentials: InitialAdminCredentials = {
    adminUsername: process.env.ADMIN_USERNAME,
    adminPassword: process.env.ADMIN_PASSWORD,
  },
) {
  const migrator = new Migrator({ db: database, provider: migrationProvider });
  const migration = await migrator.migrateToLatest();
  if (migration.error) throw migration.error;
  await database.updateTable("audit").set({ status: "unknown" }).where("status", "=", "running").execute();

  const admin = await database.selectFrom("users").select("id").where("isAdmin", "=", 1).executeTakeFirst();
  if (admin) return;

  if (!credentials.adminUsername || !credentials.adminPassword) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required to initialize the administrator");
  }

  const now = new Date().toISOString();
  const adminRoleId = randomUUID();
  const adminUserId = randomUUID();
  await database.transaction().execute(async (transaction) => {
    await transaction
      .insertInto("roles")
      .values({ id: adminRoleId, name: "Administrator", isAdmin: 1, createdAt: now })
      .execute();
    await transaction
      .insertInto("users")
      .values({
        id: adminUserId,
        username: credentials.adminUsername!,
        passwordHash: hashPassword(credentials.adminPassword!),
        isAdmin: 1,
        active: 1,
        createdAt: now,
      })
      .execute();
    await transaction.insertInto("user_roles").values({ userId: adminUserId, roleId: adminRoleId }).execute();
    await seedDemoResources(transaction);
  });
}

async function seedDemoResources(database: Kysely<DatabaseSchema>) {
  const serviceId = randomUUID();
  const toolId = randomUUID();
  const publicSkillId = randomUUID();
  const privateSkillId = randomUUID();
  await database
    .insertInto("resources")
    .values([
      { id: serviceId, type: "service", visibility: "restricted", parentId: null, name: "Demo MCP Service", description: "示例 MCP 服务目录" },
      { id: toolId, type: "tool", visibility: "restricted", parentId: serviceId, name: "demo_lookup", description: "示例工具占位，不提供调用" },
      { id: publicSkillId, type: "skill", visibility: "public", parentId: null, name: "Public Demo Skill", description: "公共 Skills 示例" },
      { id: privateSkillId, type: "skill", visibility: "restricted", parentId: null, name: "Private Demo Skill", description: "角色授权 Skills 示例" },
    ])
    .execute();
}
