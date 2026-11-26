import { db } from '@/lib/db'
import { authorizationFailure, authorizeLegacyRequest } from '@/lib/authz'
import { sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const access = await authorizeLegacyRequest(request.headers, 'agenda')
  if (!access.ok) return authorizationFailure(access)
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Arquivo não informado.' }, { status: 400 })
  const result = await db.execute(sql`SELECT original_filename, blob_url FROM commemorative_stl_models WHERE id = ${id} AND user_id = ${access.user.id} LIMIT 1`)
  const model = result.rows[0] as { original_filename: string; blob_url: string } | undefined
  if (!model?.blob_url) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 })

  const fileResponse = await fetch(model.blob_url, { cache: 'no-store' })
  if (!fileResponse.ok || !fileResponse.body) return NextResponse.json({ error: 'O arquivo não está disponível no armazenamento.' }, { status: 502 })
  const filename = model.original_filename.replace(/[\r\n"\\]/g, '_')
  const headers = new Headers({
    'Content-Type': 'model/stl',
    'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(model.original_filename)}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  const length = fileResponse.headers.get('content-length')
  if (length) headers.set('Content-Length', length)
  return new NextResponse(fileResponse.body, { headers })
}
