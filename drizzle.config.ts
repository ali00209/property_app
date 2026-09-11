import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  schemaFilter: ["public"],
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://postgres:root@localhost:5432/property",
  },
});
