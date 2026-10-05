import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { getDatabaseUrl } from "@/lib/utils";

const databaseUrl = getDatabaseUrl()

const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle({ client: pool });
export { schema };
