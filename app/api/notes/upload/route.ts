import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { getNotesUserId } from "@/lib/notes-auth"

const MAX_IMAGE_SIZE = 4 * 1024 * 1024
const IMAGE_TYPES = new Map<string, { extension: string; signature: (bytes: Uint8Array) => boolean }>([
  ["image/png", { extension: "png", signature: (bytes) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 }],
  ["image/jpeg", { extension: "jpg", signature: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff }],
  ["image/gif", { extension: "gif", signature: (bytes) => new TextDecoder().decode(bytes.slice(0, 6)).startsWith("GIF8") }],
  ["image/webp", { extension: "webp", signature: (bytes) => new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP" }],
])

export async function POST(request: Request) {
  let userId: string
  try {
    userId = await getNotesUserId(request.headers)
  } catch {
    return NextResponse.json({ error: "Entre na sua conta para enviar imagens." }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecione uma imagem." }, { status: 400 })
    if (file.size === 0 || file.size > MAX_IMAGE_SIZE) return NextResponse.json({ error: "A imagem deve ter até 4 MB." }, { status: 400 })

    const definition = IMAGE_TYPES.get(file.type)
    if (!definition) return NextResponse.json({ error: "Use uma imagem PNG, JPEG, GIF ou WebP." }, { status: 400 })
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!definition.signature(bytes)) return NextResponse.json({ error: "O arquivo não corresponde ao formato de imagem informado." }, { status: 400 })

    const pathname = `notes/${userId}/${crypto.randomUUID()}.${definition.extension}`
    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
    })
    return NextResponse.json({ pathname: blob.pathname })
  } catch (error) {
    console.error("[notes] Falha ao enviar imagem:", error)
    return NextResponse.json({ error: "Não foi possível enviar a imagem. Tente novamente." }, { status: 500 })
  }
}
