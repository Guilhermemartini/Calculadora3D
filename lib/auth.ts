import { betterAuth } from "better-auth"
import { randomBytes } from "node:crypto"
import { Pool } from "pg"

const globalForAuth = globalThis as typeof globalThis & { authPool?: Pool; authSecret?: string }
const connectionString = process.env.DATABASE_URL
const secret = process.env.BETTER_AUTH_SECRET || (
  process.env.NODE_ENV === "development"
    ? (globalForAuth.authSecret ??= randomBytes(32).toString("base64url"))
    : undefined
)

if (!connectionString) throw new Error("DATABASE_URL must be configured.")
if (!secret) throw new Error("BETTER_AUTH_SECRET must be configured.")

const authPool =
  globalForAuth.authPool ??
  new Pool({
    connectionString,
    options: "-c search_path=auth,public",
    max: 3,
  })

if (process.env.NODE_ENV !== "production") globalForAuth.authPool = authPool

export const authDatabase = authPool

export const auth = betterAuth({
  database: authPool,
  secret,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.AUTH_PROVISION_MODE !== "1",
    autoSignIn: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60,
  },
})
