'use server'

import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type AgendaStatus = 'a_fazer' | 'em_producao' | 'concluido'

export type AgendaTask = {
  id: string
  date: string
  name: string
  imageData: string | null
  time: string
  status: AgendaStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

function map(row: Record<string, unknown>): AgendaTask {
  return {
    id: String(row.id),
    date: String(row.task_date),
    name: String(row.name),
    imageData: row.image_data ? String(row.image_data) : null,
    time: String(row.task_time),
    status: String(row.status) as AgendaStatus,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function listAgendaTasks(startDate: string, endDate: string) {
  const result = await db.execute(sql`
    SELECT * FROM agenda_tasks
    WHERE task_date BETWEEN ${startDate}::date AND ${endDate}::date
    ORDER BY task_date ASC, task_time ASC, created_at ASC
  `)
  return result.rows.map((row) => map(row as Record<string, unknown>))
}

export async function saveAgendaTask(input: {
  id: string
  date: string
  name: string
  imageData?: string | null
  time: string
  status: AgendaStatus
  notes?: string | null
}) {
  await db.execute(sql`
    INSERT INTO agenda_tasks (id, task_date, name, image_data, task_time, status, notes)
    VALUES (${input.id}, ${input.date}::date, ${input.name}, ${input.imageData ?? null}, ${input.time}, ${input.status}, ${input.notes ?? null})
    ON CONFLICT (id) DO UPDATE SET
      task_date = EXCLUDED.task_date,
      name = EXCLUDED.name,
      image_data = EXCLUDED.image_data,
      task_time = EXCLUDED.task_time,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = now()
  `)
}

export async function updateAgendaTaskStatus(id: string, status: AgendaStatus) {
  await db.execute(sql`
    UPDATE agenda_tasks SET status = ${status}, updated_at = now() WHERE id = ${id}
  `)
}

export async function moveAgendaTask(id: string, date: string) {
  await db.execute(sql`
    UPDATE agenda_tasks SET task_date = ${date}::date, updated_at = now() WHERE id = ${id}
  `)
}

export async function deleteAgendaTask(id: string) {
  await db.execute(sql`DELETE FROM agenda_tasks WHERE id = ${id}`)
}

