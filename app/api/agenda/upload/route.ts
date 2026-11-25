import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { authorizationFailure, authorizeLegacyRequest } from "@/lib/authz"

export async function POST(request: Request) {
  const access = await authorizeLegacyRequest(request.headers, "agenda")
  if (!access.ok) return authorizationFailure(access)
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Nenhuma imagem foi enviada." }, { status: 400 })
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "O arquivo precisa ser uma imagem." }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "A imagem deve ter no máximo 5 MB." }, { status: 413 })
    }
    const safeFilename = file.name.replace(/[\\/\\r\\n]/g, "_")
    const blob = await put(`agenda/${access.user.id}/${crypto.randomUUID()}-${safeFilename}`, file, { access: "public" })
    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Agenda image upload error:", error)
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 })
  }
}
