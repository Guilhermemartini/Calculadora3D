"use client"

import {
  deleteCommemorativeDate,
  deleteSTLModel,
  listCommemorativeDates,
  saveCommemorativeDate,
  updateSTLModelName,
  type CommemorativeDate,
  type STLModel,
} from "@/app/actions/commemorative-dates"
import { Button } from "@/components/ui/button"
import { CalendarDays, ChevronDown, Download, FileBox, Pencil, Plus, Search, Star, Trash2, Upload, X } from "lucide-react"
import { useMemo, useRef, useState } from "react"

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]
const MAX_STL_SIZE = 4 * 1024 * 1024
const dateLabel = (start: string, end: string) => {
  const format = (value: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", timeZone: "UTC" }).format(new Date(`${value}T12:00:00Z`))
  return start === end ? format(start) : `${format(start)} a ${format(end)}`
}
const fileSize = (size: number) => size < 1024 * 1024 ? `${(size / 1024).toFixed(0)} KB` : `${(size / (1024 * 1024)).toFixed(2)} MB`

export function CommemorativeDatesManager({ initialDates }: { initialDates: CommemorativeDate[] }) {
  const [dates, setDates] = useState(initialDates)
  const [month, setMonth] = useState("all")
  const [priorityOnly, setPriorityOnly] = useState(false)
  const [search, setSearch] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dateForm, setDateForm] = useState<Partial<CommemorativeDate> | null>(null)
  const [modelForm, setModelForm] = useState<{ dateId: string; model?: STLModel; file: File | null; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const fileInput = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => dates.filter((date) => {
    const monthMatch = month === "all" || (date.dateStart.slice(5, 7) <= month.padStart(2, "0") && date.dateEnd.slice(5, 7) >= month.padStart(2, "0"))
    const priorityMatch = !priorityOnly || date.highPriority
    const term = search.trim().toLocaleLowerCase("pt-BR")
    const searchMatch = !term || date.name.toLocaleLowerCase("pt-BR").includes(term) || date.models.some((model) => model.modelName.toLocaleLowerCase("pt-BR").includes(term))
    return monthMatch && priorityMatch && searchMatch
  }), [dates, month, priorityOnly, search])

  async function refresh() {
    const result = await listCommemorativeDates()
    setDates(result)
  }

  async function saveDate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!dateForm) return
    const form = event.currentTarget
    const data = new FormData(form)
    const start = String(data.get("dateStart") ?? "")
    const end = String(data.get("hasRange") === "on" ? data.get("dateEnd") ?? "" : start)
    if (end && end < start) { setError("A data final não pode ser anterior à data inicial."); return }
    setBusy(true); setError("")
    try {
      await saveCommemorativeDate({ id: dateForm.id, name: String(data.get("name") ?? ""), dateStart: start, dateEnd: end || start, highPriority: data.get("highPriority") === "on" })
      await refresh(); setDateForm(null); setMessage("Comemoração salva.")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar a comemoração.") }
    finally { setBusy(false) }
  }

  async function removeDate(date: CommemorativeDate) {
    const detail = date.models.length ? ` Ela contém ${date.models.length} modelo(s), e seus registros e arquivos STL também serão excluídos.` : ""
    if (!window.confirm(`Excluir “${date.name}”?${detail}`)) return
    setBusy(true); setError("")
    try { const result = await deleteCommemorativeDate(date.id); await refresh(); setMessage(result.cleanupPending ? "Comemoração excluída. Alguns arquivos aguardam limpeza automática do armazenamento." : "Comemoração excluída.") }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir a comemoração.") }
    finally { setBusy(false) }
  }

  async function saveModel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!modelForm) return
    const form = new FormData(event.currentTarget)
    const name = String(form.get("modelName") ?? "").trim()
    const file = form.get("file")
    if (!name || !(file instanceof File) || file.size === 0) { setError("Informe o nome e selecione um arquivo STL."); return }
    if (!file.name.toLowerCase().endsWith(".stl")) { setError("Selecione um arquivo com extensão .stl."); return }
    if (file.size > MAX_STL_SIZE) { setError("O arquivo STL deve ter no máximo 4 MB."); return }
    setBusy(true); setError("")
    try {
      const payload = new FormData()
      payload.set("dateId", modelForm.dateId); payload.set("modelName", name); payload.set("file", file)
      if (modelForm.model) payload.set("modelId", modelForm.model.id)
      const response = await fetch("/api/commemorative-stl/upload", { method: "POST", body: payload })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Não foi possível salvar o STL.")
      await refresh(); setModelForm(null); setMessage(modelForm.model ? (result.cleanupPending ? "Arquivo STL substituído. A versão anterior está na fila de limpeza automática." : "Arquivo STL substituído.") : "Arquivo STL salvo.")
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar o arquivo.") }
    finally { setBusy(false) }
  }

  async function removeModel(model: STLModel) {
    if (!window.confirm(`Excluir o modelo “${model.modelName}” e seu arquivo STL?`)) return
    setBusy(true); setError("")
    try { const result = await deleteSTLModel(model.id); await refresh(); setMessage(result.cleanupPending ? "Modelo excluído. O arquivo aguarda limpeza automática do armazenamento." : "Modelo excluído.") }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível excluir o modelo.") }
    finally { setBusy(false) }
  }

  async function renameModel(model: STLModel) {
    const next = window.prompt("Novo nome do modelo", model.modelName)
    if (next === null || !next.trim()) return
    setBusy(true); setError("")
    try { await updateSTLModelName(model.id, next); await refresh(); setMessage("Nome do modelo atualizado.") }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível renomear o modelo.") }
    finally { setBusy(false) }
  }

  const grouped = MONTHS.map((name, index) => ({ name, index, items: filtered.filter((date) => (month === "all" ? Number(date.dateStart.slice(5, 7)) : Number(month)) === index + 1) })).filter((group) => group.items.length)

  return <section className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm font-medium text-primary">Planejamento comercial</p><h2 className="text-2xl font-semibold tracking-tight">Datas comemorativas</h2><p className="mt-1 text-sm text-muted-foreground">Organize suas datas comerciais e os arquivos STL de cada coleção.</p></div>
      <Button onClick={() => { setError(""); setDateForm({ name: "", dateStart: "2027-01-01", dateEnd: "2027-01-01", highPriority: false }) }}><Plus /> Adicionar data</Button>
    </header>
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-center">
      <label className="relative min-w-0 flex-1 sm:min-w-60"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar comemoração ou modelo" className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" aria-label="Buscar por comemoração ou modelo" /></label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground"><span>Mês</span><select value={month} onChange={(event) => setMonth(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"><option value="all">Todos os meses</option>{MONTHS.map((item, index) => <option key={item} value={String(index + 1)}>{item}</option>)}</select></label>
      <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm"><input type="checkbox" checked={priorityOnly} onChange={(event) => setPriorityOnly(event.target.checked)} className="size-4 accent-primary" /> Somente prioritárias</label>
      <span className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">2027</span>
    </div>
    {message ? <div role="status" className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm">{message}<button onClick={() => setMessage("")} aria-label="Fechar mensagem"><X className="size-4" /></button></div> : null}
    {error ? <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
    {grouped.length ? <div className="space-y-6">{grouped.map((group) => <section key={group.name} aria-label={group.name}>
      <div className="mb-3 flex items-center gap-3"><h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{group.name}</h3><div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">{group.items.length}</span></div>
      <div className="grid gap-3 xl:grid-cols-2">{group.items.map((date) => {
        const open = expanded === date.id
        return <article key={date.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarDays className="size-5" /></div>
            <button className="min-w-0 flex-1 text-left" onClick={() => setExpanded(open ? null : date.id)} aria-expanded={open}><span className="flex items-center gap-2"><span className="truncate font-semibold">{date.name}</span>{date.highPriority ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"><Star className="size-3 fill-current" /> Prioritária</span> : null}</span><span className="mt-1 block text-sm text-muted-foreground">{dateLabel(date.dateStart, date.dateEnd)}</span><span className="mt-2 block text-xs text-muted-foreground">{date.models.length} {date.models.length === 1 ? "modelo cadastrado" : "modelos cadastrados"}</span></button>
            <button aria-label={open ? "Recolher" : "Expandir"} onClick={() => setExpanded(open ? null : date.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} /></button>
            <div className="flex shrink-0"><Button variant="ghost" size="icon" aria-label={`Editar ${date.name}`} onClick={() => { setError(""); setDateForm(date) }}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" aria-label={`Excluir ${date.name}`} onClick={() => void removeDate(date)}><Trash2 className="size-4" /></Button></div>
          </div>
          {open ? <div className="border-t border-border bg-background/40 p-4 sm:p-5">
            {date.models.length ? <div className="space-y-2">{date.models.map((model) => <div key={model.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3"><FileBox className="size-5 shrink-0 text-primary" /><div className="min-w-0"><p className="truncate text-sm font-medium">{model.modelName}</p><p className="truncate text-xs text-muted-foreground">{model.originalFilename} · {fileSize(model.sizeBytes)}</p></div></div>
              <div className="flex flex-wrap gap-1"><a className="inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-medium transition-colors hover:bg-muted" href={`/api/commemorative-stl/download?id=${encodeURIComponent(model.id)}`}><Download className="size-4" /> Baixar STL</a><Button size="icon" variant="ghost" aria-label="Editar nome" onClick={() => void renameModel(model)}><Pencil className="size-4" /></Button><Button size="sm" variant="ghost" onClick={() => { setError(""); setModelForm({ dateId: date.id, model, file: null, name: model.modelName }); setTimeout(() => fileInput.current?.click(), 0) }}><Upload /> Substituir arquivo</Button><Button size="icon" variant="ghost" aria-label="Excluir modelo" onClick={() => void removeModel(model)}><Trash2 className="size-4" /></Button></div>
            </div>)}</div> : <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">Nenhum arquivo cadastrado. Adicione seu primeiro STL para esta data.</p>}
            <Button className="mt-3" variant="outline" onClick={() => { setError(""); setModelForm({ dateId: date.id, name: "", file: null }); setTimeout(() => fileInput.current?.click(), 0) }}><Plus /> Adicionar arquivo STL</Button>
          </div> : null}
        </article>
      })}</div>
    </section>)}</div> : <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center text-sm text-muted-foreground">Nenhuma data corresponde aos filtros selecionados.</div>}

    {dateForm ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="date-dialog-title"><form onSubmit={saveDate} className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl"><header className="flex items-center justify-between border-b border-border px-5 py-4"><h3 id="date-dialog-title" className="font-semibold">{dateForm.id ? "Editar comemoração" : "Adicionar data"}</h3><button type="button" onClick={() => setDateForm(null)} aria-label="Fechar"><X className="size-5" /></button></header><div className="space-y-4 p-5"><label className="block space-y-1.5"><span className="text-sm font-medium">Nome da comemoração *</span><input name="name" required maxLength={120} defaultValue={dateForm.name} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label><label className="block space-y-1.5"><span className="text-sm font-medium">Data de início *</span><input name="dateStart" type="date" min="2027-01-01" max="2027-12-31" required defaultValue={dateForm.dateStart} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label><label className="flex items-center gap-2 text-sm"><input name="hasRange" type="checkbox" defaultChecked={dateForm.dateEnd !== dateForm.dateStart} className="size-4 accent-primary" /> Informar período com início e fim</label><label className="block space-y-1.5"><span className="text-sm font-medium">Data final</span><input name="dateEnd" type="date" min="2027-01-01" max="2027-12-31" defaultValue={dateForm.dateEnd} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label><label className="flex items-center gap-2 text-sm"><input name="highPriority" type="checkbox" defaultChecked={dateForm.highPriority} className="size-4 accent-primary" /> Alta prioridade</label>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</div><footer className="flex justify-end gap-2 border-t border-border p-4"><Button type="button" variant="ghost" onClick={() => setDateForm(null)}>Cancelar</Button><Button disabled={busy}>{busy ? "Salvando..." : "Salvar data"}</Button></footer></form></div> : null}
    {modelForm ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="stl-dialog-title"><form onSubmit={saveModel} className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl"><header className="flex items-center justify-between border-b border-border px-5 py-4"><h3 id="stl-dialog-title" className="font-semibold">{modelForm.model ? "Substituir arquivo STL" : "Adicionar arquivo STL"}</h3><button type="button" onClick={() => setModelForm(null)} aria-label="Fechar"><X className="size-5" /></button></header><div className="space-y-4 p-5"><label className="block space-y-1.5"><span className="text-sm font-medium">Nome do modelo *</span><input name="modelName" required maxLength={160} defaultValue={modelForm.name} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm" /></label><label className="block space-y-1.5"><span className="text-sm font-medium">Arquivo STL *</span><input ref={fileInput} name="file" type="file" accept=".stl,model/stl" required className="block w-full rounded-lg border border-border bg-background p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground" onChange={(event) => { const file = event.target.files?.[0] ?? null; setModelForm((current) => current ? { ...current, file } : current) }} /><span className="block text-xs text-muted-foreground">Somente arquivos .stl. Limite de 4 MB por arquivo.</span></label>{modelForm.model ? <p className="text-xs text-muted-foreground">O arquivo atual será mantido até o novo envio e cadastro serem concluídos.</p> : null}{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</div><footer className="flex justify-end gap-2 border-t border-border p-4"><Button type="button" variant="ghost" onClick={() => setModelForm(null)}>Cancelar</Button><Button disabled={busy}>{busy ? "Enviando..." : modelForm.model ? "Substituir arquivo" : "Salvar arquivo"}</Button></footer></form></div> : null}
  </section>
}
