import { db } from '@/lib/db'
import { authorizationFailure, authorizeLegacyRequest } from '@/lib/authz'
import { head } from '@vercel/blob'
import { sql } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const access = await authorizeLegacyRequest(request.headers, 'budgets')
  if (!access.ok) return authorizationFailure(access)
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Arquivo não informado.' }, { status: 400 })
  const result = await db.execute(sql`SELECT stl_file_name, stl_file_data FROM budgets WHERE id = ${id} AND user_id = ${access.user.id} LIMIT 1`)
  const budget = result.rows[0] as { stl_file_name: string | null; stl_file_data: string | null } | undefined
  if (!budget?.stl_file_name || !budget.stl_file_data) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 })

  let fileResponse: Response
  let contentLength: string | null = null
  if (budget.stl_file_data.startsWith('data:')) {
    fileResponse = await fetch(budget.stl_file_data, { cache: 'no-store' })
  } else {
    if (!budget.stl_file_data.startsWith(`budgets/${access.user.id}/`)) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 })
    try {
      const blob = await head(budget.stl_file_data)
      if (blob.pathname !== budget.stl_file_data || !blob.url.startsWith('https://')) return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 })
      contentLength = String(blob.size)
      fileResponse = await fetch(blob.url, { cache: 'no-store' })
    } catch {
      return NextResponse.json({ error: 'O arquivo não está disponível no armazenamento.' }, { status: 502 })
    }
  }
  if (!fileResponse.ok || !fileResponse.body) return NextResponse.json({ error: 'O arquivo não está disponível no armazenamento.' }, { status: 502 })

  const filename = budget.stl_file_name.replace(/[\r\n"\\]/g, '_')
  const headers = new Headers({
    'Content-Type': 'model/stl',
    'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(budget.stl_file_name)}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  if (contentLength) headers.set('Content-Length', contentLength)
  return new NextResponse(fileResponse.body, { headers })
}
