import type { Migration } from "kysely";

export const serviceMigration: Migration = {
  async up(database) {
    await database.schema.createTable("services")
      .addColumn("id", "text", (column) => column.primaryKey().references("resources.id").onDelete("cascade"))
      .addColumn("kind", "text", (column) => column.notNull())
      .addColumn("namespace", "text", (column) => column.notNull().unique())
      .addColumn("url", "text", (column) => column.notNull())
      .addColumn("transport", "text", (column) => column.notNull())
      .addColumn("headers", "text", (column) => column.notNull())
      .addColumn("timeoutSeconds", "real", (column) => column.notNull())
      .addColumn("enabled", "integer", (column) => column.notNull())
      .execute();
  },
  async down(database) { await database.schema.dropTable("services").execute(); },
};
