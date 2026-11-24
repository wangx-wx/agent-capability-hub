import type { Migration } from "kysely";

export const auditDurationMigration: Migration = {
  async up(database) {
    await database.schema.alterTable("audit").addColumn("durationMs", "integer").execute();
  },
  async down(database) {
    await database.schema.alterTable("audit").dropColumn("durationMs").execute();
  },
};
