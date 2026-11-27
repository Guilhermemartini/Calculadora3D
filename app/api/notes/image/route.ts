import { get } from "@vercel/blob"
import { NextResponse } from "next/server"
import { getNotesUserId } from "@/lib/notes-auth"

export async function GET(request: Request) {
  let userId: string
  try {
    userId = await getNotesUserId(request.headers)
  } catch {
    return NextResponse.json({ error: "Autenticação necessária." }, { status: 401 })
  }

  const pathname = new URL(request.url).searchParams.get("pathname")
  if (!pathname || !pathname.startsWith(`notes/${userId}/`) || pathname.includes("..")) {
    return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 })
  }

  try {
    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    })
    if (!result) return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 })
    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" },
      })
    }
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("[notes] Falha ao ler imagem:", error)
    return NextResponse.json({ error: "Não foi possível carregar a imagem." }, { status: 500 })
  }
}
