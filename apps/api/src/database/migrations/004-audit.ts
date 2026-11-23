import type { Migration } from "kysely";

export const auditMigration: Migration = {
  async up(database) {
    await database.schema.createTable("audit")
      .addColumn("id", "text", (column) => column.primaryKey())
      .addColumn("userId", "text", (column) => column.notNull())
      .addColumn("username", "text", (column) => column.notNull())
      .addColumn("keyId", "text")
      .addColumn("serviceId", "text")
      .addColumn("serviceName", "text")
      .addColumn("toolId", "text")
      .addColumn("toolName", "text", (column) => column.notNull())
      .addColumn("createdAt", "text", (column) => column.notNull())
      .addColumn("status", "text", (column) => column.notNull())
      .addColumn("clientName", "text")
      .addColumn("clientVersion", "text")
      .execute();
    await database.schema.createIndex("audit_user_status_idx").on("audit").columns(["userId", "status"]).execute();
  },
  async down(database) { await database.schema.dropTable("audit").execute(); },
};
