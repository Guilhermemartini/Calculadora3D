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
    connectionString: process.env.DATABASE_URL_UNPOOLED ?? connectionString,
    options: "-c search_path=auth,public",
    max: 3,
  })

if (process.env.NODE_ENV !== "production") globalForAuth.authPool = authPool

export const authDatabase = authPool

const baseURL =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.V0_RUNTIME_URL)

const trustedOrigins = [
  ...(process.env.NODE_ENV === "development"
    ? [
        "http://localhost:3000",
        process.env.V0_RUNTIME_URL,
        process.env.V0_DEV_APP_URL,
        process.env.V0_BUILD_URL,
        process.env.V0_SANDBOX_URL,
      ].filter((origin): origin is string => Boolean(origin))
    : []),
  ...(process.env.NODE_ENV === "production"
    ? [
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
        process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : undefined,
      ].filter((origin): origin is string => Boolean(origin))
    : []),
]

export const auth = betterAuth({
  database: authPool,
  secret,
  baseURL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    autoSignIn: false,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  session: {
    expiresIn: 60 * 60 * 12,
    updateAge: 60 * 60,
  },
  ...(process.env.NODE_ENV === "development"
    ? {
        advanced: {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        },
      }
    : {}),
})
