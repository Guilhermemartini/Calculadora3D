import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export async function getNotesUserId(requestHeaders?: Headers) {
  const session = await auth.api.getSession({
    headers: requestHeaders ?? (await headers()),
  })

  if (!session?.user?.id) throw new Error("Authentication required.")
  return session.user.id
}

export async function requireNotesPageAccess() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login?reason=session-expired&returnTo=%2Fnotas")
  return session.user
}
