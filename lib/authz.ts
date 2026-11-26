import { auth, authDatabase } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export const LEGACY_MODULES = [
  "calculator",
  "filaments",
  "agenda",
  "shortcuts",
  "budgets",
] as const

export type LegacyModule = (typeof LEGACY_MODULES)[number]
export type AuthenticatedUser = typeof auth.$Infer.Session.user

export type AccessResult =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; status: 401 | 403 | 503 }

function summarizeError(error: unknown) {
  return error instanceof Error
    ? { name: error.name, message: error.message }
    : { message: String(error) }
}

export function authorizationFailure(result: Extract<AccessResult, { ok: false }>) {
  const message = result.status === 401
    ? "Authentication required."
    : result.status === 403
      ? "This account cannot access these records."
      : "Access could not be verified."
  return Response.json({ error: message }, { status: result.status })
}

export async function authorizeLegacyRequest(
  requestHeaders: Headers,
  module: LegacyModule,
): Promise<AccessResult> {
  let session: Awaited<ReturnType<typeof auth.api.getSession>>
  try {
    session = await auth.api.getSession({ headers: requestHeaders })
  } catch (error) {
    console.error("[authz] Session verification failed:", summarizeError(error))
    return { ok: false, status: 503 }
  }
  if (!session) return { ok: false, status: 401 }

  try {
    const result = await authDatabase.query(
      "SELECT 1 FROM legacy_data_access WHERE user_id = $1 AND module_key = $2 LIMIT 1",
      [session.user.id, module],
    )
    if (!result.rowCount) return { ok: false, status: 403 }
    return { ok: true, user: session.user }
  } catch (error) {
    console.error("[authz] Legacy access database query failed:", summarizeError(error))
    return { ok: false, status: 503 }
  }
}

export async function requireLegacyDataAccess(module: LegacyModule) {
  const result = await authorizeLegacyRequest(await headers(), module)
  if (result.ok) return result.user
  if (result.status === 401) throw new Error("Authentication required.")
  if (result.status === 403) throw new Error("This account cannot access these legacy records.")
  throw new Error("Access could not be verified.")
}

export async function requireLegacyPageAccess(module: LegacyModule) {
  const result = await authorizeLegacyRequest(await headers(), module)
  if (result.ok) return result.user
  if (result.status === 401) redirect("/login?reason=session-expired")
  if (result.status === 403) redirect("/acesso-restrito")
  throw new Error("Access could not be verified.")
}
