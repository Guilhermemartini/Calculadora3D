import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
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
    const blob = await put(`agenda/${crypto.randomUUID()}-${file.name}`, file, { access: "public" })
    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Agenda image upload error:", error)
    return NextResponse.json({ error: "Não foi possível enviar a imagem." }, { status: 500 })
  }
}
