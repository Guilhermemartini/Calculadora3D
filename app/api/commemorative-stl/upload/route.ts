import { db } from '@/lib/db'
import { authorizationFailure, authorizeLegacyRequest } from '@/lib/authz'
import { handleUpload } from '@vercel/blob/client'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
const MAX_FILE_SIZE = 50_000_000

type UploadMetadata = { dateId: string; modelId: string | null; modelName: string; originalFilename: string }

function parseMetadata(value: string | null): UploadMetadata | null {
  if (!value || value.length > 2_000) return null
  try {
    const metadata = JSON.parse(value) as Partial<UploadMetadata>
    if (typeof metadata.dateId !== 'string' || !metadata.dateId || typeof metadata.modelName !== 'string' || !metadata.modelName.trim() || typeof metadata.originalFilename !== 'string' || !metadata.originalFilename.toLowerCase().endsWith('.stl') || (metadata.modelId !== null && typeof metadata.modelId !== 'string')) return null
    return { dateId: metadata.dateId, modelId: metadata.modelId ?? null, modelName: metadata.modelName.trim(), originalFilename: metadata.originalFilename }
  } catch { return null }
}

export async function POST(request: Request) {
  const access = await authorizeLegacyRequest(request.headers, 'agenda')
  if (!access.ok) return authorizationFailure(access)
  const pendingPrefix = `commemorative-stl/${access.user.id}/pending/`
  try {
    const body = await request.json()
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const metadata = parseMetadata(clientPayload)
        if (!metadata || !pathname.startsWith(pendingPrefix) || !pathname.toLowerCase().endsWith('.stl')) throw new Error('Arquivo ou dados do envio inválidos.')
        const validDate = await db.execute(sql`SELECT id FROM commemorative_dates WHERE id = ${metadata.dateId} AND user_id = ${access.user.id} LIMIT 1`)
        if (!validDate.rows.length) throw new Error('A comemoração não foi encontrada.')
        if (metadata.modelId) {
          const validModel = await db.execute(sql`SELECT id FROM commemorative_stl_models WHERE id = ${metadata.modelId} AND commemorative_date_id = ${metadata.dateId} AND user_id = ${access.user.id} LIMIT 1`)
          if (!validModel.rows.length) throw new Error('O modelo a substituir não foi encontrado.')
        }
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
    console.error('STL upload token error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível autorizar o envio.' }, { status: 400 })
  }
}
