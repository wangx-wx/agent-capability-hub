import { sql, type Migration } from "kysely";

export const toolNameMigration: Migration = {
  async up(database) {
    await database.schema.createIndex("tools_public_name_unique").on("resources").column("name")
      .unique().where(sql.ref("type"), "=", "tool").execute();
  },
  async down(database) { await database.schema.dropIndex("tools_public_name_unique").execute(); },
};
