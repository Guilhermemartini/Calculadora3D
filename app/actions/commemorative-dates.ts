'use server'

import { processPendingBlobCleanup } from '@/lib/commemorative-blob-cleanup'
import { db, pool } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type STLModel = {
  id: string
  dateId: string
  modelName: string
  originalFilename: string
  sizeBytes: number
  createdAt: string
}

export type CommemorativeDate = {
  id: string
  name: string
  dateStart: string
  dateEnd: string
  highPriority: boolean
  models: STLModel[]
}

const initialDates = [
  ['ano-novo', 'Ano-Novo', '2027-01-01', '2027-01-01', false],
  ['volta-as-aulas', 'Volta às aulas', '2027-01-01', '2027-02-28', false],
  ['carnaval', 'Carnaval', '2027-02-09', '2027-02-09', false],
  ['dia-internacional-da-mulher', 'Dia Internacional da Mulher', '2027-03-08', '2027-03-08', false],
  ['dia-do-consumidor', 'Dia do Consumidor', '2027-03-15', '2027-03-15', false],
  ['pascoa', 'Páscoa', '2027-03-28', '2027-03-28', true],
  ['dia-mundial-do-livro', 'Dia Mundial do Livro', '2027-04-23', '2027-04-23', false],
  ['dia-das-maes', 'Dia das Mães', '2027-05-09', '2027-05-09', true],
  ['dia-da-enfermagem', 'Dia da Enfermagem', '2027-05-12', '2027-05-12', false],
  ['dia-dos-namorados', 'Dia dos Namorados', '2027-06-12', '2027-06-12', true],
  ['sao-joao', 'São João / Festas Juninas', '2027-06-24', '2027-06-24', false],
  ['dia-do-amigo', 'Dia do Amigo', '2027-07-20', '2027-07-20', false],
  ['dia-dos-avos', 'Dia dos Avós', '2027-07-26', '2027-07-26', false],
  ['dia-dos-pais', 'Dia dos Pais', '2027-08-08', '2027-08-08', true],
  ['dia-do-estudante', 'Dia do Estudante', '2027-08-11', '2027-08-11', false],
  ['dia-do-cliente', 'Dia do Cliente', '2027-09-15', '2027-09-15', false],
  ['dia-da-arvore', 'Dia da Árvore', '2027-09-21', '2027-09-21', false],
  ['dia-dos-animais', 'Dia dos Animais', '2027-10-04', '2027-10-04', false],
  ['dia-das-criancas', 'Dia das Crianças', '2027-10-12', '2027-10-12', true],
  ['dia-dos-professores', 'Dia dos Professores', '2027-10-15', '2027-10-15', true],
  ['halloween', 'Halloween', '2027-10-31', '2027-10-31', false],
  ['finados', 'Finados', '2027-11-02', '2027-11-02', false],
  ['black-friday', 'Black Friday', '2027-11-26', '2027-11-26', false],
  ['natal', 'Natal', '2027-12-25', '2027-12-25', true],
  ['reveillon', 'Réveillon', '2027-12-31', '2027-12-31', false],
] as const

async function ensureInitialDates() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('commemorative-dates-2027-seed'))")
    const marker = await client.query("SELECT marker_key FROM app_initialization_markers WHERE marker_key = 'commemorative-dates-2027'")
    if (marker.rowCount === 0) {
      for (const [slug, name, start, end, priority] of initialDates) {
        await client.query(
          'INSERT INTO commemorative_dates (id, name, date_start, date_end, high_priority) VALUES ($1, $2, $3::date, $4::date, $5) ON CONFLICT (id) DO NOTHING',
          [`2027-${slug}`, name, start, end, priority],
        )
      }
      await client.query("INSERT INTO app_initialization_markers (marker_key) VALUES ('commemorative-dates-2027') ON CONFLICT (marker_key) DO NOTHING")
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function listCommemorativeDates(filters?: { month?: number; priorityOnly?: boolean; search?: string }) {
  await ensureInitialDates()
  await processPendingBlobCleanup()
  const clauses = []
  if (filters?.month && filters.month >= 1 && filters.month <= 12) {
    const monthStart = `2027-${String(filters.month).padStart(2, '0')}-01`
    clauses.push(sql`d.date_start <= (date_trunc('month', ${monthStart}::date) + interval '1 month - 1 day')::date AND d.date_end >= ${monthStart}::date`)
  }
  if (filters?.priorityOnly) clauses.push(sql`d.high_priority = true`)
  if (filters?.search?.trim()) {
    const term = `%${filters.search.trim()}%`
    clauses.push(sql`(d.name ILIKE ${term} OR EXISTS (SELECT 1 FROM commemorative_stl_models m WHERE m.commemorative_date_id = d.id AND m.model_name ILIKE ${term}))`)
  }
  const whereClause = clauses.length ? sql`WHERE ${sql.join(clauses, sql` AND `)}` : sql``
  const dateResult = await db.execute(sql`
    SELECT d.id, d.name, d.date_start::text AS date_start, d.date_end::text AS date_end, d.high_priority
    FROM commemorative_dates d ${whereClause}
    ORDER BY d.date_start, d.name
  `)
  const dates = dateResult.rows as Array<Record<string, unknown>>
  if (!dates.length) return [] as CommemorativeDate[]
  const modelResult = await db.execute(sql`
    SELECT id, commemorative_date_id, model_name, original_filename, size_bytes, created_at
    FROM commemorative_stl_models
    WHERE commemorative_date_id IN (${sql.join(dates.map((date) => sql`${String(date.id)}`), sql`, `)})
    ORDER BY created_at
  `)
  const byDate = new Map<string, STLModel[]>()
  for (const row of modelResult.rows as Array<Record<string, unknown>>) {
    const dateId = String(row.commemorative_date_id)
    const models = byDate.get(dateId) ?? []
    models.push({ id: String(row.id), dateId, modelName: String(row.model_name), originalFilename: String(row.original_filename), sizeBytes: Number(row.size_bytes), createdAt: String(row.created_at) })
    byDate.set(dateId, models)
  }
  return dates.map((row) => ({ id: String(row.id), name: String(row.name), dateStart: String(row.date_start), dateEnd: String(row.date_end), highPriority: Boolean(row.high_priority), models: byDate.get(String(row.id)) ?? [] }))
}

function validateDateInput(input: { name: string; dateStart: string; dateEnd?: string; highPriority: boolean }) {
  const name = input.name.trim()
  const dateEnd = input.dateEnd || input.dateStart
  const isValidDate = (value: string) => {
    if (!/^2027-\d{2}-\d{2}$/.test(value)) return false
    const parsed = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
  }
  if (!name || !isValidDate(input.dateStart) || !isValidDate(dateEnd)) throw new Error('Informe o nome e datas válidas de 2027.')
  if (dateEnd < input.dateStart) throw new Error('A data final não pode ser anterior à data inicial.')
  return { name, dateEnd }
}

export async function saveCommemorativeDate(input: { id?: string; name: string; dateStart: string; dateEnd?: string; highPriority: boolean }) {
  const { name, dateEnd } = validateDateInput(input)
  const id = input.id || crypto.randomUUID()
  await db.execute(sql`
    INSERT INTO commemorative_dates (id, name, date_start, date_end, high_priority)
    VALUES (${id}, ${name}, ${input.dateStart}::date, ${dateEnd}::date, ${input.highPriority})
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, date_start = EXCLUDED.date_start, date_end = EXCLUDED.date_end, high_priority = EXCLUDED.high_priority, updated_at = now()
  `)
  return id
}

export async function deleteCommemorativeDate(id: string) {
  const client = await pool.connect()
  let count = 0
  let urls: string[] = []
  try {
    await client.query('BEGIN')
    const files = await client.query('SELECT blob_url FROM commemorative_stl_models WHERE commemorative_date_id = $1', [id])
    urls = files.rows.map((row: { blob_url: string | null }) => row.blob_url).filter((url: string | null): url is string => Boolean(url))
    for (const url of urls) await client.query('INSERT INTO commemorative_blob_cleanup (blob_url) VALUES ($1) ON CONFLICT (blob_url) DO NOTHING', [url])
    const result = await client.query('DELETE FROM commemorative_dates WHERE id = $1 RETURNING id', [id])
    count = result.rowCount ?? result.rows.length
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  await processPendingBlobCleanup()
  const pending = urls.length ? await db.execute(sql`SELECT COUNT(*)::int AS count FROM commemorative_blob_cleanup WHERE blob_url IN (${sql.join(urls.map((url) => sql`${url}`), sql`, `)})`) : { rows: [{ count: 0 }] }
  return { count, cleanupPending: Number((pending.rows[0] as { count: number }).count) > 0 }
}

export async function updateSTLModelName(id: string, modelName: string) {
  const name = modelName.trim()
  if (!id || !name) throw new Error('Informe o nome do modelo.')
  await db.execute(sql`UPDATE commemorative_stl_models SET model_name = ${name}, updated_at = now() WHERE id = ${id}`)
}

export async function deleteSTLModel(id: string) {
  const client = await pool.connect()
  let url = ''
  let count = 0
  try {
    await client.query('BEGIN')
    const file = await client.query('SELECT blob_url FROM commemorative_stl_models WHERE id = $1 LIMIT 1', [id])
    url = file.rows[0]?.blob_url ?? ''
    if (url) await client.query('INSERT INTO commemorative_blob_cleanup (blob_url) VALUES ($1) ON CONFLICT (blob_url) DO NOTHING', [url])
    const result = await client.query('DELETE FROM commemorative_stl_models WHERE id = $1 RETURNING id', [id])
    count = result.rowCount ?? result.rows.length
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
  if (url) await processPendingBlobCleanup()
  const pending = url ? await db.execute(sql`SELECT 1 FROM commemorative_blob_cleanup WHERE blob_url = ${url} LIMIT 1`) : { rows: [] }
  return { count, cleanupPending: pending.rows.length > 0 }
}
