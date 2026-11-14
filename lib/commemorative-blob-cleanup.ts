import { del } from '@vercel/blob'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function processPendingBlobCleanup() {
  const pending = await db.execute(sql`SELECT blob_url FROM commemorative_blob_cleanup ORDER BY queued_at LIMIT 20`)
  for (const row of pending.rows as Array<{ blob_url: string }>) {
    try {
      await del(row.blob_url)
      await db.execute(sql`DELETE FROM commemorative_blob_cleanup WHERE blob_url = ${row.blob_url}`)
    } catch (error) {
      console.error('Blob cleanup remains queued:', error)
    }
  }
}
