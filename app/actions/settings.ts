'use server'

import { db } from '@/lib/db'
import { requireLegacyDataAccess } from '@/lib/authz'
import { sql } from 'drizzle-orm'

export type CalculatorSettings = {
  hourlyRate: number
  profitMargin: number
  sandingCost: number
  paintingCost: number
  urgencyNormal: number
  urgencyUrgent: number
  urgencyVeryUrgent: number
  packagingQuantity: number
  packagingTotalCost: number
  accessoryQuantity: number
  accessoryTotalCost: number
  roundFinalValue: boolean
}

const DEFAULT_SETTINGS: CalculatorSettings = {
  hourlyRate: 4,
  profitMargin: 40,
  sandingCost: 10,
  paintingCost: 20,
  urgencyNormal: 0,
  urgencyUrgent: 20,
  urgencyVeryUrgent: 50,
  packagingQuantity: 0,
  packagingTotalCost: 0,
  accessoryQuantity: 0,
  accessoryTotalCost: 0,
  roundFinalValue: false,
}

export async function getCalculatorSettings() {
  const user = await requireLegacyDataAccess('calculator')
  try {
    const rows = await db.execute(sql`SELECT * FROM calculator_settings WHERE id = 'default' AND user_id = ${user.id} LIMIT 1`)
    const row = rows.rows[0] as Record<string, unknown> | undefined
    if (!row) return { exists: false, settings: DEFAULT_SETTINGS }
    return {
      exists: true,
      settings: {
        hourlyRate: Number(row.hourly_rate),
        profitMargin: Number(row.profit_margin),
        sandingCost: Number(row.sanding_cost),
        paintingCost: Number(row.painting_cost),
        urgencyNormal: Number(row.urgency_normal),
        urgencyUrgent: Number(row.urgency_urgent),
        urgencyVeryUrgent: Number(row.urgency_very_urgent),
        packagingQuantity: Number(row.packaging_quantity ?? 0),
        packagingTotalCost: Number(row.packaging_total_cost ?? 0),
        accessoryQuantity: Number(row.accessory_quantity ?? 0),
        accessoryTotalCost: Number(row.accessory_total_cost ?? 0),
        roundFinalValue: row.round_final_value === true,
      },
    }
  } catch {
    throw new Error('Não foi possível carregar os parâmetros.')
  }
}

function validateSettings(value: unknown): CalculatorSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Revise os parâmetros informados.')
  const input = value as Record<string, unknown>
  const numericFields = [
    'hourlyRate', 'profitMargin', 'sandingCost', 'paintingCost',
    'urgencyNormal', 'urgencyUrgent', 'urgencyVeryUrgent',
    'packagingQuantity', 'packagingTotalCost', 'accessoryQuantity', 'accessoryTotalCost',
  ] as const
  for (const field of numericFields) {
    if (typeof input[field] !== 'number' || !Number.isFinite(input[field]) || input[field] < 0) throw new Error('Revise os parâmetros informados.')
  }
  if (typeof input.roundFinalValue !== 'boolean') throw new Error('Revise os parâmetros informados.')
  return {
    hourlyRate: input.hourlyRate as number,
    profitMargin: input.profitMargin as number,
    sandingCost: input.sandingCost as number,
    paintingCost: input.paintingCost as number,
    urgencyNormal: input.urgencyNormal as number,
    urgencyUrgent: input.urgencyUrgent as number,
    urgencyVeryUrgent: input.urgencyVeryUrgent as number,
    packagingQuantity: input.packagingQuantity as number,
    packagingTotalCost: input.packagingTotalCost as number,
    accessoryQuantity: input.accessoryQuantity as number,
    accessoryTotalCost: input.accessoryTotalCost as number,
    roundFinalValue: input.roundFinalValue,
  }
}

export async function saveCalculatorSettings(value: unknown) {
  const user = await requireLegacyDataAccess('calculator')
  const settings = validateSettings(value)
  try {
    await db.execute(sql`
    INSERT INTO calculator_settings (
      id, user_id, hourly_rate, profit_margin, sanding_cost, painting_cost,
      urgency_normal, urgency_urgent, urgency_very_urgent,
      packaging_quantity, packaging_total_cost, accessory_quantity, accessory_total_cost, round_final_value, updated_at
    ) VALUES (
      'default', ${user.id}, ${settings.hourlyRate}, ${settings.profitMargin}, ${settings.sandingCost}, ${settings.paintingCost},
      ${settings.urgencyNormal}, ${settings.urgencyUrgent}, ${settings.urgencyVeryUrgent},
      ${settings.packagingQuantity}, ${settings.packagingTotalCost}, ${settings.accessoryQuantity}, ${settings.accessoryTotalCost}, ${settings.roundFinalValue}, now()
    )
    ON CONFLICT (id, user_id) DO UPDATE SET
      hourly_rate = EXCLUDED.hourly_rate, profit_margin = EXCLUDED.profit_margin,
      sanding_cost = EXCLUDED.sanding_cost, painting_cost = EXCLUDED.painting_cost,
      urgency_normal = EXCLUDED.urgency_normal, urgency_urgent = EXCLUDED.urgency_urgent,
      urgency_very_urgent = EXCLUDED.urgency_very_urgent,
      packaging_quantity = EXCLUDED.packaging_quantity, packaging_total_cost = EXCLUDED.packaging_total_cost,
      accessory_quantity = EXCLUDED.accessory_quantity, accessory_total_cost = EXCLUDED.accessory_total_cost,
      round_final_value = EXCLUDED.round_final_value,
      updated_at = now()
    `)
    return { saved: true }
  } catch {
    throw new Error('Não foi possível salvar os parâmetros. Tente novamente.')
  }
}
