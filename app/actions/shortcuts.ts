'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type Shortcut = { id: string; name: string; link: string; imageUrl: string; createdAt: string; updatedAt: string }

function map(row: Record<string, unknown>): Shortcut {
  return { id: String(row.id), name: String(row.name), link: String(row.link), imageUrl: String(row.image_url), createdAt: String(row.created_at), updatedAt: String(row.updated_at) }
}

export async function listShortcuts(): Promise<Shortcut[]> {
  const result = await db.execute(sql`SELECT * FROM shortcuts ORDER BY created_at DESC`)
  return result.rows.map((row) => map(row as Record<string, unknown>))
}

export async function saveShortcut(input: { id?: string; name: string; link: string; imageUrl: string }) {
  const id = input.id ?? crypto.randomUUID()
  if (input.id) {
    await db.execute(sql`UPDATE shortcuts SET name = ${input.name}, link = ${input.link}, image_url = ${input.imageUrl}, updated_at = now() WHERE id = ${input.id}`)
  } else {
    await db.execute(sql`INSERT INTO shortcuts (id, name, link, image_url) VALUES (${id}, ${input.name}, ${input.link}, ${input.imageUrl})`)
  }
  return id
}

export async function deleteShortcut(id: string) {
  await db.execute(sql`DELETE FROM shortcuts WHERE id = ${id}`)
}
