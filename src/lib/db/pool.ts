import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

let pool: Pool | null = null;

export function getCheckpointPool(): Pool | null {
  const connectionString = process.env.SUPABASE_SESSION_POOLER_DATABASE_URL;
  if (!connectionString) {
    return null;
  }
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 4,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
    attachDatabasePool(pool);
  }
  return pool;
}
