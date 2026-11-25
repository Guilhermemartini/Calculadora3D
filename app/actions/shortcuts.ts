'use server'

import { db } from '@/lib/db'
import { requireLegacyDataAccess } from '@/lib/authz'
import { sql } from 'drizzle-orm'

export type ShortcutGroup = { id: string; name: string; createdAt: string; updatedAt: string }
export type Shortcut = { id: string; name: string; link: string; imageUrl: string; groupId: string | null; createdAt: string; updatedAt: string }

function mapGroup(row: Record<string, unknown>): ShortcutGroup { return { id: String(row.id), name: String(row.name), createdAt: String(row.created_at), updatedAt: String(row.updated_at) } }
function mapShortcut(row: Record<string, unknown>): Shortcut { return { id: String(row.id), name: String(row.name), link: String(row.link), imageUrl: String(row.image_url), groupId: row.group_id ? String(row.group_id) : null, createdAt: String(row.created_at), updatedAt: String(row.updated_at) } }

export async function listShortcutGroups(): Promise<ShortcutGroup[]> {
  const user = await requireLegacyDataAccess('shortcuts')
  const result = await db.execute(sql`SELECT * FROM shortcut_groups WHERE user_id = ${user.id} ORDER BY created_at ASC`)
  return result.rows.map((row) => mapGroup(row as Record<string, unknown>))
}
export async function listShortcuts(): Promise<Shortcut[]> {
  const user = await requireLegacyDataAccess('shortcuts')
  const result = await db.execute(sql`SELECT * FROM shortcuts WHERE user_id = ${user.id} ORDER BY created_at DESC`)
  return result.rows.map((row) => mapShortcut(row as Record<string, unknown>))
}
export async function saveGroup(input: { id?: string; name: string }) {
  const user = await requireLegacyDataAccess('shortcuts')
  const id = input.id ?? crypto.randomUUID()
  if (input.id) await db.execute(sql`UPDATE shortcut_groups SET name = ${input.name}, updated_at = now() WHERE id = ${input.id} AND user_id = ${user.id}`)
  else await db.execute(sql`INSERT INTO shortcut_groups (id, user_id, name) VALUES (${id}, ${user.id}, ${input.name})`)
  return id
}
export async function deleteGroup(id: string) {
  const user = await requireLegacyDataAccess('shortcuts')
  await db.execute(sql`UPDATE shortcuts SET group_id = NULL WHERE user_id = ${user.id} AND group_id = ${id}`)
  await db.execute(sql`DELETE FROM shortcut_groups WHERE id = ${id} AND user_id = ${user.id}`)
}
export async function saveShortcut(input: { id?: string; name: string; link: string; imageUrl: string; groupId?: string | null }) {
  const user = await requireLegacyDataAccess('shortcuts')
  const id = input.id ?? crypto.randomUUID()
  let groupId = input.groupId ?? null
  if (groupId) {
    const group = await db.execute(sql`SELECT 1 FROM shortcut_groups WHERE id = ${groupId} AND user_id = ${user.id} LIMIT 1`)
    if (!group.rows.length) groupId = null
  }
  if (input.id) await db.execute(sql`UPDATE shortcuts SET name = ${input.name}, link = ${input.link}, image_url = ${input.imageUrl}, group_id = ${groupId}, updated_at = now() WHERE id = ${input.id} AND user_id = ${user.id}`)
  else await db.execute(sql`INSERT INTO shortcuts (id, user_id, name, link, image_url, group_id) VALUES (${id}, ${user.id}, ${input.name}, ${input.link}, ${input.imageUrl}, ${groupId})`)
  return id
}
export async function deleteShortcut(id: string) { const user = await requireLegacyDataAccess('shortcuts'); await db.execute(sql`DELETE FROM shortcuts WHERE id = ${id} AND user_id = ${user.id}`) }
export async function moveShortcut(id: string, groupId: string | null) {
  const user = await requireLegacyDataAccess('shortcuts')
  let ownedGroupId = groupId
  if (groupId) {
    const group = await db.execute(sql`SELECT 1 FROM shortcut_groups WHERE id = ${groupId} AND user_id = ${user.id} LIMIT 1`)
    if (!group.rows.length) ownedGroupId = null
  }
  await db.execute(sql`UPDATE shortcuts SET group_id = ${ownedGroupId}, updated_at = now() WHERE id = ${id} AND user_id = ${user.id}`)
}
