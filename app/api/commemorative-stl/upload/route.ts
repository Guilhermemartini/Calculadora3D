import { db, pool } from '@/lib/db'
import { processPendingBlobCleanup } from '@/lib/commemorative-blob-cleanup'
import { put, del } from '@vercel/blob'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
const MAX_FILE_SIZE = 4 * 1024 * 1024

export async function POST(request: Request) {
  let uploadedUrl: string | null = null
  try {
    const form = await request.formData()
    const file = form.get('file')
    const dateId = String(form.get('dateId') ?? '').trim()
    const modelName = String(form.get('modelName') ?? '').trim()
    const modelId = String(form.get('modelId') ?? '').trim()

    if (!(file instanceof File) || !dateId || !modelName) return NextResponse.json({ error: 'Informe a comemoração, o nome do modelo e o arquivo STL.' }, { status: 400 })
    if (!file.name.toLowerCase().endsWith('.stl')) return NextResponse.json({ error: 'O arquivo precisa ter a extensão .stl.' }, { status: 415 })
    if (!file.size) return NextResponse.json({ error: 'O arquivo está vazio.' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'O arquivo STL deve ter no máximo 4 MB.' }, { status: 413 })
    const validDate = await db.execute(sql`SELECT id FROM commemorative_dates WHERE id = ${dateId} LIMIT 1`)
    if (!validDate.rows.length) return NextResponse.json({ error: 'A comemoração não foi encontrada.' }, { status: 404 })

    const oldModel = modelId
      ? await db.execute(sql`SELECT blob_url FROM commemorative_stl_models WHERE id = ${modelId} AND commemorative_date_id = ${dateId} LIMIT 1`)
      : null
    if (modelId && !oldModel?.rows.length) return NextResponse.json({ error: 'O modelo não foi encontrado.' }, { status: 404 })

    const safeFilename = file.name.replace(/[\\/\\\\]/g, '_')
    const blob = await put(`commemorative-stl/${dateId}/${crypto.randomUUID()}/${safeFilename}`, file, { access: 'public', addRandomSuffix: true, contentType: 'model/stl' })
    uploadedUrl = blob.url
    if (modelId) {
      const client = await pool.connect()
      let previousUrl = ''
      try {
        await client.query('BEGIN')
        const updated = await client.query(
          'UPDATE commemorative_stl_models SET model_name = $1, original_filename = $2, size_bytes = $3, blob_path = $4, blob_url = $5, updated_at = now() WHERE id = $6 AND commemorative_date_id = $7 RETURNING id',
          [modelName, file.name, file.size, blob.pathname, blob.url, modelId, dateId],
        )
        if (!updated.rowCount) throw new Error('O modelo não foi encontrado.')
        previousUrl = String(oldModel!.rows[0].blob_url ?? '')
        if (previousUrl) await client.query('INSERT INTO commemorative_blob_cleanup (blob_url) VALUES ($1) ON CONFLICT (blob_url) DO NOTHING', [previousUrl])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
      uploadedUrl = null
      await processPendingBlobCleanup().catch((error) => console.error('STL cleanup remains queued:', error))
      const pending = previousUrl ? await db.execute(sql`SELECT 1 FROM commemorative_blob_cleanup WHERE blob_url = ${previousUrl} LIMIT 1`) : { rows: [] }
      return NextResponse.json({ success: true, id: modelId, cleanupPending: pending.rows.length > 0 })
    }

    const id = crypto.randomUUID()
    await db.execute(sql`INSERT INTO commemorative_stl_models (id, commemorative_date_id, model_name, original_filename, size_bytes, blob_path, blob_url) VALUES (${id}, ${dateId}, ${modelName}, ${file.name}, ${file.size}, ${blob.pathname}, ${blob.url})`)
    return NextResponse.json({ success: true, id })
  } catch (error) {
    if (uploadedUrl) await del(uploadedUrl).catch(async (cleanupError) => {
      console.error('New STL cleanup failed:', cleanupError)
      await db.execute(sql`INSERT INTO commemorative_blob_cleanup (blob_url) VALUES (${uploadedUrl}) ON CONFLICT (blob_url) DO NOTHING`).catch((queueError) => console.error('Could not queue STL cleanup:', queueError))
    })
    console.error('STL upload error:', error)
    return NextResponse.json({ error: 'Não foi possível salvar o arquivo STL. Tente novamente.' }, { status: 500 })
  }
}
