import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:root@localhost:5432/property_db",
  },
  out: "./drizzle",
  schema: "./src/db/schema.ts",
});