import { Pool } from "pg";
import { getEnv } from "@/src/lib/env";

let pool: Pool | null = null;

export function getRagPool(): Pool | null {
  const connectionString = getEnv().SUPABASE_SESSION_POOLER_DATABASE_URL;
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: 2,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 4_000,
    });
  }
  return pool;
}

export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
