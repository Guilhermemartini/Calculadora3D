"use client"

import {
  deleteAgendaTask,
  listAgendaTasks,
  listAllAgendaTasks,
  saveAgendaTask,
  updateAgendaTaskStatus,
  type AgendaStatus,
  type AgendaTask,
} from "@/app/actions/agenda"
import { Button } from "@/components/ui/button"
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, ImagePlus, List, Pencil, Plus, Trash2, X } from "lucide-react"
import { useMemo, useState, useTransition } from "react"

const STATUS: Array<{ value: AgendaStatus; label: string }> = [
  { value: "a_fazer", label: "A fazer" },
  { value: "em_producao", label: "Em produção" },
  { value: "concluido", label: "Concluído" },
]

type FormState = { id: string; date: string; name: string; imageData: string | null; time: string; status: AgendaStatus; notes: string }

function dateKey(date: Date) { return date.toISOString().slice(0, 10) }
function startOfWeek(date: Date) { const d = new Date(date); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); d.setHours(12); return d }
function addDays(date: Date, amount: number) { const d = new Date(date); d.setDate(d.getDate() + amount); return d }
function formatDay(date: Date) { return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" }).format(date).replace(/^./, (c) => c.toUpperCase()) }
function emptyForm(date: string): FormState { return { id: "", date, name: "", imageData: null, time: "09:00", status: "a_fazer", notes: "" } }
const HOURS = Array.from({ length: 12 }, (_, index) => index + 8)

export function AgendaBoard({ initialTasks, initialWeek }: { initialTasks: AgendaTask[]; initialWeek: string }) {
  const [week, setWeek] = useState(() => new Date(`${initialWeek}T12:00:00`))
  const [tasks, setTasks] = useState(initialTasks)
  const [allTasks, setAllTasks] = useState(initialTasks)
  const [form, setForm] = useState<FormState | null>(null)
  const [view, setView] = useState<"agenda" | "listagem">("agenda")
  const [selectedDate, setSelectedDate] = useState("")
  const [isPending, startTransition] = useTransition()
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(week), index)), [week])

  function reload(nextWeek = week) {
    const nextDays = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(nextWeek), index))
    startTransition(async () => {
      const [weekTasks, completeTasks] = await Promise.all([
        listAgendaTasks(dateKey(nextDays[0]), dateKey(nextDays[6])),
        listAllAgendaTasks(),
      ])
      setTasks(weekTasks)
      setAllTasks(completeTasks)
    })
  }
  function shift(amount: number) { const next = addDays(week, amount * 7); setWeek(next); reload(next) }
  function goToday() { const next = new Date(); setSelectedDate(dateKey(next)); setWeek(next); reload(next) }
  function filterByDate(value: string) {
    setSelectedDate(value)
    if (!value) return
    const next = new Date(`${value}T12:00:00`)
    setWeek(next)
    reload(next)
  }
  function submit(event: React.FormEvent) {
    event.preventDefault(); if (!form?.name.trim()) return
    const payload = {
      ...form,
      id: form.id || crypto.randomUUID(),
      name: form.name.trim(),
      notes: form.notes.trim() || null,
    }
    startTransition(async () => { await saveAgendaTask(payload); setForm(null); reload() })
  }
  function remove(id: string) { if (!window.confirm("Excluir esta tarefa?")) return; startTransition(async () => { await deleteAgendaTask(id); reload() }) }
  function status(id: string, value: AgendaStatus) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: value } : task))
    setAllTasks((current) => current.map((task) => task.id === id ? { ...task, status: value } : task))
    startTransition(async () => await updateAgendaTaskStatus(id, value))
  }
  function image(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setForm((current) => current ? { ...current, imageData: String(reader.result) } : current); reader.readAsDataURL(file) }
  const sortedTasks = useMemo(() => [...allTasks].sort((a, b) => `${a.date.slice(0, 10)} ${a.time}`.localeCompare(`${b.date.slice(0, 10)} ${b.time}`)), [allTasks])

  return <main className="min-h-svh bg-background px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-medium text-primary">Produção</p><h1 className="text-2xl font-semibold tracking-tight">Agenda</h1><p className="mt-1 text-sm text-muted-foreground">Organize suas tarefas de produção por dia.</p></div>
        <Button onClick={() => setForm(emptyForm(dateKey(new Date())))}><Plus /> Nova tarefa</Button>
      </header>
      <div className="mb-5 inline-flex rounded-xl border border-border bg-card p-1 shadow-sm" role="tablist" aria-label="Visualização da agenda">
        <button type="button" role="tab" aria-selected={view === "agenda"} onClick={() => setView("agenda")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${view === "agenda" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><CalendarDays className="size-4" /> Agenda</button>
        <button type="button" role="tab" aria-selected={view === "listagem"} onClick={() => setView("listagem")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${view === "listagem" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><List className="size-4" /> Listagem</button>
      </div>
      {view === "agenda" ? <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Semana anterior"><ChevronLeft /></Button><Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Próxima semana"><ChevronRight /></Button><Button variant="outline" onClick={goToday}><CalendarDays /> Hoje</Button></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span>Filtrar por data</span>
            <input type="date" value={selectedDate} onChange={(event) => filterByDate(event.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring/40" aria-label="Filtrar agenda por data" />
          </label>
          {selectedDate ? <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDate("")}>Limpar</Button> : null}
        </div>
        <p className="text-sm font-medium">{formatDay(days[0])} — {formatDay(days[6])}</p><span className="text-xs text-muted-foreground">{isPending ? "Salvando..." : "Sincronizado"}</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <div className="min-w-[980px]">
          <div className="grid grid-cols-[72px_repeat(7,minmax(126px,1fr))] border-b border-border">
            <div className="border-r border-border p-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Hora</div>
            {days.map((day) => {
              const key = dateKey(day)
              const today = key === dateKey(new Date())
              const dayTasks = tasks.filter((task) => task.date.slice(0, 10) === key)
              return <div key={key} className={`border-r border-border p-3 last:border-r-0 ${today ? "bg-primary/10" : ""}`}>
                <div className="flex items-center justify-between gap-1"><p className="text-xs font-semibold">{new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(day).replace(".", "")}</p>{today ? <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">Hoje</span> : null}</div>
                <p className="mt-1 text-lg font-semibold leading-none">{day.getDate()}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{dayTasks.length} {dayTasks.length === 1 ? "agendamento" : "agendamentos"}</p>
              </div>
            })}
          </div>
          <div className="grid grid-cols-[72px_repeat(7,minmax(126px,1fr))]">
            <div className="border-r border-border">{HOURS.map((hour) => <div key={hour} className="flex h-24 items-start justify-end border-b border-border px-2 pt-2 text-[11px] text-muted-foreground">{String(hour).padStart(2, "0")}:00</div>)}</div>
            {days.map((day) => {
              const key = dateKey(day)
              return <div key={key} className="border-r border-border last:border-r-0">{HOURS.map((hour) => {
                const hourTasks = tasks.filter((task) => task.date.slice(0, 10) === key && Number(task.time.slice(0, 2)) === hour)
                return <div key={hour} className="group relative h-24 border-b border-border p-1.5 hover:bg-muted/30">
                  <button type="button" onClick={() => setForm(emptyForm(`${key}`))} className="absolute right-1 top-1 hidden rounded-md p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary group-hover:block" aria-label={`Adicionar agendamento em ${key} às ${hour}:00`}><Plus className="size-3.5" /></button>
                  <div className="flex flex-col gap-1">{hourTasks.map((task) => <article key={task.id} className="rounded-lg border border-primary/30 bg-primary/10 p-2 shadow-sm"><div className="flex items-start gap-1.5"><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-foreground">{task.name}</p><p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="size-3" />{task.time}</p></div><button type="button" className="rounded p-0.5 text-muted-foreground hover:text-foreground" onClick={() => setForm({ ...task, notes: task.notes ?? "" })} aria-label="Editar tarefa"><Pencil className="size-3" /></button></div><div className="mt-1.5 flex items-center gap-1"><select aria-label={`Status de ${task.name}`} value={task.status} onChange={(event) => status(task.id, event.target.value as AgendaStatus)} className="h-6 min-w-0 flex-1 rounded border border-border bg-card px-1 text-[10px] outline-none focus:ring-2 focus:ring-ring/40">{STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button type="button" className="rounded p-1 text-muted-foreground hover:text-destructive" onClick={() => remove(task.id)} aria-label="Excluir tarefa"><Trash2 className="size-3" /></button></div></article>)}</div>
                </div>
              })}</div>
            })}
          </div>
        </div>
      </div>
      </> : <section className="rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold">Serviços agendados</h2><p className="text-sm text-muted-foreground">Ordenados dos mais próximos aos mais longos.</p></div><span className="text-sm text-muted-foreground">{sortedTasks.length} {sortedTasks.length === 1 ? "serviço" : "serviços"}</span></div>
        {sortedTasks.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhum serviço agendado.</div> : <div className="divide-y divide-border">{sortedTasks.map((task) => <article key={task.id} className="flex flex-wrap items-center gap-4 px-5 py-4"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Clock3 className="size-5" /></div><div className="min-w-0"><p className="truncate font-medium">{task.name}</p><p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "full" }).format(new Date(`${task.date.slice(0, 10)}T12:00:00`))} às {task.time}</p>{task.notes ? <p className="mt-1 truncate text-xs text-muted-foreground">{task.notes}</p> : null}</div></div><select aria-label={`Status de ${task.name}`} value={task.status} onChange={(event) => status(task.id, event.target.value as AgendaStatus)} className="h-8 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring/40">{STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...task, notes: task.notes ?? "" })} aria-label="Editar tarefa"><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => remove(task.id)} aria-label="Excluir tarefa"><Trash2 className="size-4" /></Button></article>)}</div>}
      </section>}
    </div>
    {form ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold">{form.id ? "Editar tarefa" : "Nova tarefa"}</h2><p className="text-xs text-muted-foreground">Preencha os dados da produção.</p></div><button type="button" onClick={() => setForm(null)} aria-label="Fechar"><X className="size-5" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-medium">Nome do item</span><input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" placeholder="Ex.: Suporte de parede" /></label><label className="space-y-1.5"><span className="text-sm font-medium">Dia</span><input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label><label className="space-y-1.5"><span className="text-sm font-medium">Horário</span><input type="time" required value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label><label className="space-y-1.5"><span className="text-sm font-medium">Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AgendaStatus })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">{STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="space-y-1.5"><span className="text-sm font-medium">Imagem <span className="font-normal text-muted-foreground">(opcional)</span></span><span className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground"><ImagePlus className="size-4" /><input type="file" accept="image/*" onChange={image} className="min-w-0 text-xs" /></span></label><label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-medium">Observação <span className="font-normal text-muted-foreground">(opcional)</span></span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" placeholder="Detalhes da produção..." /></label></div><div className="flex justify-end gap-2 border-t border-border px-5 py-4"><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button type="submit" disabled={isPending}>Salvar</Button></div></form></div> : null}
  </main>
}
