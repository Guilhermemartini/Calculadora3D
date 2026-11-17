import { auth } from "@/lib/auth"
import { NextRequest, NextResponse } from "next/server"

export async function proxy(request: NextRequest) {
  let session = null
  try {
    session = await auth.api.getSession({ headers: request.headers })
  } catch {
    return NextResponse.json({ error: "Não foi possível verificar a sessão." }, { status: 503 })
  }

  if (session) return NextResponse.next()

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("reason", "session-expired")
  loginUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/", "/estoque/:path*", "/agenda/:path*", "/atalhos/:path*", "/orcamentos/:path*"],
}
