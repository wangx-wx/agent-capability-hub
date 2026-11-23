import type { Migration } from "kysely";

export const initialMigration: Migration = {
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
