'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

const DEFAULT_SETTINGS = {
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
  const rows = await db.execute(sql`SELECT * FROM calculator_settings WHERE id = 'default' LIMIT 1`)
  const row = rows.rows[0] as Record<string, unknown> | undefined
  if (!row) return DEFAULT_SETTINGS
  return {
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
    roundFinalValue: Boolean(row.round_final_value),
  }
}

export async function saveCalculatorSettings(settings: typeof DEFAULT_SETTINGS) {
  await db.execute(sql`
    INSERT INTO calculator_settings (
      id, hourly_rate, profit_margin, sanding_cost, painting_cost,
      urgency_normal, urgency_urgent, urgency_very_urgent,
      packaging_quantity, packaging_total_cost, accessory_quantity, accessory_total_cost, round_final_value, updated_at
    ) VALUES (
      'default', ${settings.hourlyRate}, ${settings.profitMargin}, ${settings.sandingCost}, ${settings.paintingCost},
      ${settings.urgencyNormal}, ${settings.urgencyUrgent}, ${settings.urgencyVeryUrgent},
      ${settings.packagingQuantity}, ${settings.packagingTotalCost}, ${settings.accessoryQuantity}, ${settings.accessoryTotalCost}, ${settings.roundFinalValue}, now()
    )
    ON CONFLICT (id) DO UPDATE SET
      hourly_rate = EXCLUDED.hourly_rate, profit_margin = EXCLUDED.profit_margin,
      sanding_cost = EXCLUDED.sanding_cost, painting_cost = EXCLUDED.painting_cost,
      urgency_normal = EXCLUDED.urgency_normal, urgency_urgent = EXCLUDED.urgency_urgent,
      urgency_very_urgent = EXCLUDED.urgency_very_urgent,
      packaging_quantity = EXCLUDED.packaging_quantity, packaging_total_cost = EXCLUDED.packaging_total_cost,
      accessory_quantity = EXCLUDED.accessory_quantity, accessory_total_cost = EXCLUDED.accessory_total_cost,
      round_final_value = EXCLUDED.round_final_value,
      updated_at = now()
  `)
}
