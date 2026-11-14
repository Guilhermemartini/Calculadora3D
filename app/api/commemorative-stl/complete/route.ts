import { db, pool } from '@/lib/db'
import { processPendingBlobCleanup } from '@/lib/commemorative-blob-cleanup'
import { del, head } from '@vercel/blob'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
const MAX_FILE_SIZE = 50_000_000
const PENDING_PREFIX = 'commemorative-stl/pending/'

type Metadata = { dateId: string; modelId: string | null; modelName: string; originalFilename: string; pathname: string }

async function registerFile(metadata: Metadata) {
  if (!metadata.dateId || !metadata.modelName?.trim() || !metadata.originalFilename?.toLowerCase().endsWith('.stl') || !metadata.pathname?.startsWith(PENDING_PREFIX) || !metadata.pathname.toLowerCase().endsWith('.stl')) throw new Error('Os dados do arquivo STL são inválidos.')
  const blob = await head(metadata.pathname)
  if (blob.pathname !== metadata.pathname || !blob.url.startsWith('https://') || !blob.size || blob.size > MAX_FILE_SIZE) throw new Error(blob.size > MAX_FILE_SIZE ? 'O arquivo STL excede o limite de 50.000.000 bytes (50 MB).' : 'Não foi possível validar o arquivo no armazenamento.')

  const client = await pool.connect()
  let previousUrl = ''
  let modelId = metadata.modelId
  try {
    await client.query('BEGIN')
    const date = await client.query('SELECT id FROM commemorative_dates WHERE id = $1 LIMIT 1', [metadata.dateId])
    if (!date.rowCount) throw new Error('A comemoração não foi encontrada.')
    if (modelId) {
      const previous = await client.query('SELECT blob_url, blob_path FROM commemorative_stl_models WHERE id = $1 AND commemorative_date_id = $2 LIMIT 1 FOR UPDATE', [modelId, metadata.dateId])
      if (!previous.rowCount) throw new Error('O modelo a substituir não foi encontrado.')
      const previousPath = String(previous.rows[0].blob_path ?? '')
      if (previousPath === metadata.pathname) {
        await client.query('COMMIT')
        return { id: modelId, cleanupPending: false }
      }
      previousUrl = String(previous.rows[0].blob_url ?? '')
      await client.query('UPDATE commemorative_stl_models SET model_name = $1, original_filename = $2, size_bytes = $3, blob_path = $4, blob_url = $5, updated_at = now() WHERE id = $6 AND commemorative_date_id = $7', [metadata.modelName.trim(), metadata.originalFilename, blob.size, blob.pathname, blob.url, modelId, metadata.dateId])
      if (previousUrl) await client.query('INSERT INTO commemorative_blob_cleanup (blob_url) VALUES ($1) ON CONFLICT (blob_url) DO NOTHING', [previousUrl])
    } else {
      modelId = crypto.randomUUID()
      await client.query('INSERT INTO commemorative_stl_models (id, commemorative_date_id, model_name, original_filename, size_bytes, blob_path, blob_url) VALUES ($1, $2, $3, $4, $5, $6, $7)', [modelId, metadata.dateId, metadata.modelName.trim(), metadata.originalFilename, blob.size, blob.pathname, blob.url])
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
  if (previousUrl) {
    await processPendingBlobCleanup().catch((error) => console.error('STL cleanup remains queued:', error))
    const pending = await db.execute(sql`SELECT 1 FROM commemorative_blob_cleanup WHERE blob_url = ${previousUrl} LIMIT 1`)
    return { id: modelId, cleanupPending: pending.rows.length > 0 }
  }
  return { id: modelId, cleanupPending: false }
}

export async function POST(request: Request) {
  let metadata: Metadata | null = null
  try {
    metadata = await request.json() as Metadata
    const result = await registerFile(metadata)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    if (metadata?.pathname?.startsWith(PENDING_PREFIX)) await del(metadata.pathname).catch((cleanupError) => console.error('Failed to remove unregistered STL:', cleanupError))
    console.error('STL registration error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Não foi possível concluir o cadastro do arquivo STL.' }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { pathname } = await request.json() as { pathname?: string }
    if (!pathname?.startsWith(PENDING_PREFIX)) return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 })
    const registered = await db.execute(sql`SELECT 1 FROM commemorative_stl_models WHERE blob_path = ${pathname} LIMIT 1`)
    if (registered.rows.length) return NextResponse.json({ success: true })
    await del(pathname)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('STL cleanup error:', error)
    return NextResponse.json({ error: 'Não foi possível limpar o arquivo pendente.' }, { status: 500 })
  }
}
