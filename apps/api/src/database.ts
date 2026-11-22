import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Sqlite from "better-sqlite3";
import {
  Kysely,
  Migrator,
  SqliteDialect,
  type Migration,
  type MigrationProvider,
} from "kysely";
import { hashPassword } from "./password.js";
import type { ServiceTable } from "./service-schema.js";
import { serviceMigration } from "./service-migration.js";
import type { ToolTable } from "./tool-schema.js";
import { toolMigration } from "./tool-migration.js";

interface UserTable {
  id: string;
  username: string;
  passwordHash: string;
  isAdmin: number;
  active: number;
  createdAt: string;
}

interface RoleTable {
  id: string;
  name: string;
  isAdmin: number;
  createdAt: string;
}

interface UserRoleTable {
  userId: string;
  roleId: string;
}

interface ResourceTable {
  id: string;
  type: "service" | "tool" | "skill";
  visibility: "public" | "restricted";
  parentId: string | null;
  name: string;
  description: string;
}

interface RoleResourceTable {
  roleId: string;
  resourceId: string;
}

interface ApiKeyTable {
  id: string;
  userId: string;
  name: string;
  value: string;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

interface SessionTable {
  id: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: UserTable;
  roles: RoleTable;
  user_roles: UserRoleTable;
  resources: ResourceTable;
  role_resources: RoleResourceTable;
  api_keys: ApiKeyTable;
  sessions: SessionTable;
  services: ServiceTable;
  tools: ToolTable;
}

const initialMigration: Migration = {
  up: async (database) => {
    await database.schema
      .createTable("users")
      .addColumn("id", "text", (column) => column.primaryKey())
      .addColumn("username", "text", (column) => column.notNull().unique())
      .addColumn("passwordHash", "text", (column) => column.notNull())
      .addColumn("isAdmin", "integer", (column) => column.notNull().defaultTo(0))
      .addColumn("active", "integer", (column) => column.notNull().defaultTo(1))
      .addColumn("createdAt", "text", (column) => column.notNull())
      .execute();
    await database.schema
      .createTable("roles")
      .addColumn("id", "text", (column) => column.primaryKey())
      .addColumn("name", "text", (column) => column.notNull().unique())
      .addColumn("isAdmin", "integer", (column) => column.notNull().defaultTo(0))
      .addColumn("createdAt", "text", (column) => column.notNull())
      .execute();
    await database.schema
      .createTable("user_roles")
      .addColumn("userId", "text", (column) => column.notNull().references("users.id").onDelete("cascade"))
      .addColumn("roleId", "text", (column) => column.notNull().references("roles.id").onDelete("cascade"))
      .addPrimaryKeyConstraint("user_roles_pk", ["userId", "roleId"])
      .execute();
    await database.schema
      .createTable("resources")
      .addColumn("id", "text", (column) => column.primaryKey())
      .addColumn("type", "text", (column) => column.notNull())
      .addColumn("visibility", "text", (column) => column.notNull())
      .addColumn("parentId", "text")
      .addColumn("name", "text", (column) => column.notNull())
      .addColumn("description", "text", (column) => column.notNull().defaultTo(""))
      .execute();
    await database.schema
      .createTable("role_resources")
      .addColumn("roleId", "text", (column) => column.notNull().references("roles.id").onDelete("cascade"))
      .addColumn("resourceId", "text", (column) => column.notNull().references("resources.id").onDelete("cascade"))
      .addPrimaryKeyConstraint("role_resources_pk", ["roleId", "resourceId"])
      .execute();
    await database.schema
      .createTable("api_keys")
      .addColumn("id", "text", (column) => column.primaryKey())
      .addColumn("userId", "text", (column) => column.notNull().references("users.id"))
      .addColumn("name", "text", (column) => column.notNull())
      .addColumn("value", "text", (column) => column.notNull().unique())
      .addColumn("expiresAt", "text")
      .addColumn("revokedAt", "text")
      .addColumn("createdAt", "text", (column) => column.notNull())
      .execute();
    await database.schema
      .createTable("sessions")
      .addColumn("id", "text", (column) => column.primaryKey())
      .addColumn("userId", "text", (column) => column.notNull().references("users.id").onDelete("cascade"))
      .addColumn("expiresAt", "text", (column) => column.notNull())
      .addColumn("createdAt", "text", (column) => column.notNull())
      .execute();
    await database.schema
      .createIndex("api_keys_user_id_idx")
      .on("api_keys")
      .column("userId")
      .execute();
    await database.schema.createIndex("sessions_user_id_idx").on("sessions").column("userId").execute();
  },
  down: async (database) => {
    await database.schema.dropTable("sessions").execute();
    await database.schema.dropTable("api_keys").execute();
    await database.schema.dropTable("role_resources").execute();
    await database.schema.dropTable("resources").execute();
    await database.schema.dropTable("user_roles").execute();
    await database.schema.dropTable("roles").execute();
    await database.schema.dropTable("users").execute();
  },
};

const migrationProvider: MigrationProvider = {
  getMigrations: async () => ({ "001_initial": initialMigration, "002_services": serviceMigration, "003_tools": toolMigration }),
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
