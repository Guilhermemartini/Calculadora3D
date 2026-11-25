import { db } from '@/lib/db'
import { authorizationFailure, authorizeLegacyRequest } from '@/lib/authz'
import { del } from '@vercel/blob'
import { handleUpload } from '@vercel/blob/client'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
const MAX_FILE_SIZE = 50_000_000

type UploadMetadata = { budgetId: string; originalFilename: string }

function parseMetadata(value: string | null): UploadMetadata | null {
  if (!value || value.length > 1_000) return null
  try {
    const metadata = JSON.parse(value) as Partial<UploadMetadata>
    if (typeof metadata.budgetId !== 'string' || !/^[a-zA-Z0-9-]{1,100}$/.test(metadata.budgetId) || typeof metadata.originalFilename !== 'string' || !metadata.originalFilename.toLowerCase().endsWith('.stl')) return null
    return { budgetId: metadata.budgetId, originalFilename: metadata.originalFilename }
  } catch { return null }
}

export async function POST(request: Request) {
  const access = await authorizeLegacyRequest(request.headers, 'budgets')
  if (!access.ok) return authorizationFailure(access)
  const pendingPrefix = `budgets/${access.user.id}/pending/`
  try {
    const body = await request.json()
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const metadata = parseMetadata(clientPayload)
        if (!metadata || !pathname.startsWith(`${pendingPrefix}${metadata.budgetId}/`) || !pathname.toLowerCase().endsWith('.stl')) throw new Error('Arquivo ou dados do envio inválidos.')
        return {
          allowedContentTypes: ['model/stl', 'application/sla', 'application/octet-stream'],
          maximumSizeInBytes: MAX_FILE_SIZE,
          validUntil: Date.now() + 10 * 60 * 1000,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify(metadata),
        }
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Budget STL upload token error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível autorizar o envio.' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  const access = await authorizeLegacyRequest(request.headers, 'budgets')
  if (!access.ok) return authorizationFailure(access)
  try {
    const { pathname } = await request.json() as { pathname?: string }
    if (!pathname?.startsWith(`budgets/${access.user.id}/pending/`)) return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 })
    const registered = await db.execute(sql`SELECT 1 FROM budgets WHERE user_id = ${access.user.id} AND stl_file_data = ${pathname} LIMIT 1`)
    if (registered.rows.length) return NextResponse.json({ success: true })
    await del(pathname)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Budget STL cleanup error:', error)
    return NextResponse.json({ error: 'Não foi possível limpar o arquivo pendente.' }, { status: 500 })
  }
}
