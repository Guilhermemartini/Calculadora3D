'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type ShortcutGroup = { id: string; name: string; createdAt: string; updatedAt: string }
export type Shortcut = { id: string; name: string; link: string; imageUrl: string; groupId: string | null; createdAt: string; updatedAt: string }

function mapGroup(row: Record<string, unknown>): ShortcutGroup { return { id: String(row.id), name: String(row.name), createdAt: String(row.created_at), updatedAt: String(row.updated_at) } }
function mapShortcut(row: Record<string, unknown>): Shortcut { return { id: String(row.id), name: String(row.name), link: String(row.link), imageUrl: String(row.image_url), groupId: row.group_id ? String(row.group_id) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) } }

export async function listShortcutGroups(): Promise<ShortcutGroup[]> {
  const result = await db.execute(sql`SELECT * FROM shortcut_groups ORDER BY created_at ASC`)
  return result.rows.map((row) => mapGroup(row as Record<string, unknown>))
}
export async function listShortcuts(): Promise<Shortcut[]> {
  const result = await db.execute(sql`SELECT * FROM shortcuts ORDER BY created_at DESC`)
  return result.rows.map((row) => mapShortcut(row as Record<string, unknown>))
}
export async function saveGroup(input: { id?: string; name: string }) {
  const id = input.id ?? crypto.randomUUID()
  if (input.id) await db.execute(sql`UPDATE shortcut_groups SET name = ${input.name}, updated_at = now() WHERE id = ${input.id}`)
  else await db.execute(sql`INSERT INTO shortcut_groups (id, name) VALUES (${id}, ${input.name})`)
  return id
}
export async function deleteGroup(id: string) {
  await db.execute(sql`UPDATE shortcuts SET group_id = NULL WHERE group_id = ${id}`)
  await db.execute(sql`DELETE FROM shortcut_groups WHERE id = ${id}`)
}
export async function saveShortcut(input: { id?: string; name: string; link: string; imageUrl: string; groupId?: string | null }) {
  const id = input.id ?? crypto.randomUUID()
  if (input.id) await db.execute(sql`UPDATE shortcuts SET name = ${input.name}, link = ${input.link}, image_url = ${input.imageUrl}, group_id = ${input.groupId ?? null}, updated_at = now() WHERE id = ${input.id}`)
  else await db.execute(sql`INSERT INTO shortcuts (id, name, link, image_url, group_id) VALUES (${id}, ${input.name}, ${input.link}, ${input.imageUrl}, ${input.groupId ?? null})`)
  return id
}
export async function deleteShortcut(id: string) { await db.execute(sql`DELETE FROM shortcuts WHERE id = ${id}`) }
export async function moveShortcut(id: string, groupId: string | null) { await db.execute(sql`UPDATE shortcuts SET group_id = ${groupId}, updated_at = now() WHERE id = ${id}`) }
