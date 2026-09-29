import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Selecione uma imagem.' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'O arquivo precisa ser uma imagem.' }, { status: 400 })
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'A imagem deve ter no máximo 5 MB.' }, { status: 400 })
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const blob = await put(`shortcuts/${crypto.randomUUID()}.${extension}`, file, {
      access: 'public',
      addRandomSuffix: false,
      contentType: file.type,
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('[v0] Erro ao enviar imagem do atalho:', error)
    return NextResponse.json({ error: 'Não foi possível enviar a imagem.' }, { status: 500 })
  }
}
