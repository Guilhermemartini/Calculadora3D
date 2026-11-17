import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { withVerifiedSsl } from "./connection-string"

const globalForDb = globalThis as unknown as { pool?: Pool }

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: withVerifiedSsl(process.env.DATABASE_URL),
    max: 5,
  })

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

export const db = drizzle(pool)
