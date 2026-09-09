"use server"

import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export type FilamentRow = {
  id: string
  color: string
  material: string
  totalWeight: number
  currentWeight: number
  rollPrice: number
  usage: { id: string; amount: number; date: string }[]
}

function mapFilament(row: Record<string, unknown>, usage: FilamentRow["usage"]): FilamentRow {
  return {
    id: String(row.id),
    color: String(row.color),
    material: String(row.material),
    totalWeight: Number(row.total_weight),
    currentWeight: Number(row.current_weight),
    rollPrice: Number(row.roll_price),
    usage,
  }
}

export async function listFilaments(): Promise<FilamentRow[]> {
  const rows = await db.execute(sql`
    SELECT f.*, COALESCE(
      json_agg(json_build_object('id', u.id, 'amount', u.amount, 'date', u.used_at) ORDER BY u.used_at DESC)
      FILTER (WHERE u.id IS NOT NULL), '[]'::json
    ) AS usage
    FROM filaments f
    LEFT JOIN filament_usage u ON u.filament_id = f.id
    GROUP BY f.id
    ORDER BY f.created_at DESC
  `)
  return rows.rows.map((row) => mapFilament(row as Record<string, unknown>, (row as Record<string, unknown>).usage as FilamentRow["usage"]))
}

export async function createFilament(input: Omit<FilamentRow, "usage">) {
  await db.execute(sql`
    INSERT INTO filaments (id, color, material, total_weight, current_weight, roll_price)
    VALUES (${input.id}, ${input.color}, ${input.material}, ${input.totalWeight}, ${input.currentWeight}, ${input.rollPrice})
  `)
}

export async function updateFilament(input: Omit<FilamentRow, "usage">) {
  await db.execute(sql`
    UPDATE filaments SET color = ${input.color}, material = ${input.material}, total_weight = ${input.totalWeight}, current_weight = ${input.currentWeight}, roll_price = ${input.rollPrice}, updated_at = now()
    WHERE id = ${input.id}
  `)
}

export async function deleteFilament(id: string) {
  await db.execute(sql`DELETE FROM filament_usage WHERE filament_id = ${id}`)
  await db.execute(sql`DELETE FROM filaments WHERE id = ${id}`)
}

export async function useFilament(filamentId: string, usageId: string, amount: number) {
  await db.execute(sql`
    INSERT INTO filament_usage (id, filament_id, amount) VALUES (${usageId}, ${filamentId}, ${amount})
  `)
  await db.execute(sql`
    UPDATE filaments SET current_weight = GREATEST(0, current_weight - ${amount}), updated_at = now() WHERE id = ${filamentId}
  `)
}

export async function removeFilamentUsage(filamentId: string, usageId: string) {
  await db.execute(sql`
    UPDATE filaments f SET current_weight = LEAST(f.total_weight, f.current_weight + u.amount), updated_at = now()
    FROM filament_usage u WHERE f.id = ${filamentId} AND u.id = ${usageId} AND u.filament_id = f.id
  `)
  await db.execute(sql`DELETE FROM filament_usage WHERE id = ${usageId} AND filament_id = ${filamentId}`)
}
