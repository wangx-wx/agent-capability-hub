import type { Migration } from "kysely";

export const toolMigration: Migration = {
  async up(database) {
    await database.schema.createTable("tools")
      .addColumn("id", "text", (column) => column.primaryKey().references("resources.id").onDelete("cascade"))
      .addColumn("serviceId", "text", (column) => column.notNull().references("services.id").onDelete("cascade"))
      .addColumn("originalName", "text", (column) => column.notNull())
      .addColumn("definition", "text", (column) => column.notNull())
      .addUniqueConstraint("tools_service_original_unique", ["serviceId", "originalName"])
      .execute();
  },
  async down(database) { await database.schema.dropTable("tools").execute(); },
};
