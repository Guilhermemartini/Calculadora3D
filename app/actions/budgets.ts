'use server'

import { db } from '@/lib/db'
import { requireLegacyDataAccess } from '@/lib/authz'
import { del } from '@vercel/blob'
import { sql } from 'drizzle-orm'

export type Budget = {
  id: string
  name: string
  stlFileName: string | null
  stlFileData: string | null
  snapshotData: string | null
  weight: number
  hours: number
  minutes: number
  printValue: number
  finishes: Array<{ name: string; value: number }>
  freightEnabled: boolean
  origin: string | null
  destination: string | null
  distanceKm: number
  vehicle: string | null
  freightValue: number
  totalValue: number
  createdAt: string
  updatedAt: string
}

function map(row: Record<string, unknown>): Budget {
  return {
    id: String(row.id), name: String(row.name), stlFileName: row.stl_file_name ? String(row.stl_file_name) : null,
    stlFileData: row.stl_file_data ? String(row.stl_file_data) : null, snapshotData: row.snapshot_data ? String(row.snapshot_data) : null,
    weight: Number(row.weight), hours: Number(row.hours), minutes: Number(row.minutes), printValue: Number(row.print_value),
    finishes: Array.isArray(row.finishes) ? row.finishes as Budget['finishes'] : [], freightEnabled: Boolean(row.freight_enabled),
    origin: row.origin ? String(row.origin) : null, destination: row.destination ? String(row.destination) : null,
    distanceKm: Number(row.distance_km), vehicle: row.vehicle ? String(row.vehicle) : null, freightValue: Number(row.freight_value), totalValue: Number(row.total_value),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }
}

export async function listBudgets() {
  const user = await requireLegacyDataAccess('budgets')
  const result = await db.execute(sql`SELECT * FROM budgets WHERE user_id = ${user.id} ORDER BY created_at DESC`)
  return result.rows.map((row) => map(row as Record<string, unknown>))
}

export async function getBudget(id: string) {
  const user = await requireLegacyDataAccess('budgets')
  const result = await db.execute(sql`SELECT * FROM budgets WHERE id = ${id} AND user_id = ${user.id} LIMIT 1`)
  return result.rows[0] ? map(result.rows[0] as Record<string, unknown>) : null
}

export async function saveBudget(input: Omit<Budget, 'createdAt' | 'updatedAt'>) {
  const user = await requireLegacyDataAccess('budgets')
  const existing = await db.execute(sql`SELECT stl_file_data FROM budgets WHERE id = ${input.id} AND user_id = ${user.id} LIMIT 1`)
  const existingPathname = (existing.rows[0] as { stl_file_data?: string | null } | undefined)?.stl_file_data ?? null
  const pendingPathname = `budgets/${user.id}/pending/${input.id}/`
  if (input.stlFileData && !input.stlFileData.startsWith(pendingPathname) && input.stlFileData !== existingPathname) {
    throw new Error('O arquivo STL não pertence a esta conta ou orçamento.')
  }
  await db.execute(sql`INSERT INTO budgets (id, user_id, name, stl_file_name, stl_file_data, snapshot_data, weight, hours, minutes, print_value, finishes, freight_enabled, origin, destination, distance_km, vehicle, freight_value, total_value) VALUES (${input.id}, ${user.id}, ${input.name}, ${input.stlFileName}, ${input.stlFileData}, ${input.snapshotData}, ${input.weight}, ${input.hours}, ${input.minutes}, ${input.printValue}, ${JSON.stringify(input.finishes)}::jsonb, ${input.freightEnabled}, ${input.origin}, ${input.destination}, ${input.distanceKm}, ${input.vehicle}, ${input.freightValue}, ${input.totalValue}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, stl_file_name = EXCLUDED.stl_file_name, stl_file_data = EXCLUDED.stl_file_data, snapshot_data = EXCLUDED.snapshot_data, weight = EXCLUDED.weight, hours = EXCLUDED.hours, minutes = EXCLUDED.minutes, print_value = EXCLUDED.print_value, finishes = EXCLUDED.finishes, freight_enabled = EXCLUDED.freight_enabled, origin = EXCLUDED.origin, destination = EXCLUDED.destination, distance_km = EXCLUDED.distance_km, vehicle = EXCLUDED.vehicle, freight_value = EXCLUDED.freight_value, total_value = EXCLUDED.total_value, updated_at = now() WHERE budgets.user_id = EXCLUDED.user_id`)
  if (existingPathname && existingPathname !== input.stlFileData && existingPathname.startsWith(`budgets/${user.id}/`)) {
    await del(existingPathname).catch((error) => console.error('Budget STL cleanup failed:', error))
  }
}

export async function deleteBudget(id: string) {
  const user = await requireLegacyDataAccess('budgets')
  const result = await db.execute(sql`DELETE FROM budgets WHERE id = ${id} AND user_id = ${user.id} RETURNING stl_file_data`)
  const pathname = (result.rows[0] as { stl_file_data?: string | null } | undefined)?.stl_file_data
  if (pathname?.startsWith(`budgets/${user.id}/`)) {
    await del(pathname).catch((error) => console.error('Budget STL cleanup failed:', error))
  }
}
