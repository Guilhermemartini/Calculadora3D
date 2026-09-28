"use client"

import {
  deleteAgendaTask,
  listAgendaTasks,
  moveAgendaTask,
  saveAgendaTask,
  updateAgendaTaskStatus,
  type AgendaStatus,
  type AgendaTask,
} from "@/app/actions/agenda"
import { Button } from "@/components/ui/button"
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, GripVertical, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react"
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

export function AgendaBoard({ initialTasks, initialWeek }: { initialTasks: AgendaTask[]; initialWeek: string }) {
  const [week, setWeek] = useState(() => new Date(`${initialWeek}T12:00:00`))
  const [tasks, setTasks] = useState(initialTasks)
  const [form, setForm] = useState<FormState | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(week), index)), [week])
  const range = { start: dateKey(days[0]), end: dateKey(days[6]) }

  function reload(nextWeek = week) {
    const nextDays = Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(nextWeek), index))
    startTransition(async () => setTasks(await listAgendaTasks(dateKey(nextDays[0]), dateKey(nextDays[6]))))
  }
  function shift(amount: number) { const next = addDays(week, amount * 7); setWeek(next); reload(next) }
  function goToday() { const next = new Date(); setWeek(next); reload(next) }
  function submit(event: React.FormEvent) {
    event.preventDefault(); if (!form?.name.trim()) return
    const payload = { ...form, name: form.name.trim(), notes: form.notes.trim() || null }
    startTransition(async () => { await saveAgendaTask(payload); setForm(null); reload() })
  }
  function remove(id: string) { if (!window.confirm("Excluir esta tarefa?")) return; startTransition(async () => { await deleteAgendaTask(id); reload() }) }
  function move(id: string, date: string) { setTasks((current) => current.map((task) => task.id === id ? { ...task, date } : task)); startTransition(async () => await moveAgendaTask(id, date)) }
  function status(id: string, value: AgendaStatus) { setTasks((current) => current.map((task) => task.id === id ? { ...task, status: value } : task)); startTransition(async () => await updateAgendaTaskStatus(id, value)) }
  function image(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setForm((current) => current ? { ...current, imageData: String(reader.result) } : current); reader.readAsDataURL(file) }

  return <main className="min-h-svh bg-background px-4 py-6 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-medium text-primary">Produção</p><h1 className="text-2xl font-semibold tracking-tight">Agenda</h1><p className="mt-1 text-sm text-muted-foreground">Organize suas tarefas de produção por dia.</p></div>
        <Button onClick={() => setForm(emptyForm(dateKey(new Date())))}><Plus /> Nova tarefa</Button>
      </header>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
        <div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Semana anterior"><ChevronLeft /></Button><Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Próxima semana"><ChevronRight /></Button><Button variant="outline" onClick={goToday}><CalendarDays /> Hoje</Button></div>
        <p className="text-sm font-medium">{formatDay(days[0])} — {formatDay(days[6])}</p><span className="text-xs text-muted-foreground">{isPending ? "Salvando..." : "Sincronizado"}</span>
      </div>
      <div className="grid gap-3 overflow-x-auto pb-4 md:grid-cols-2 xl:grid-cols-7">
        {days.map((day) => { const key = dateKey(day); const today = key === dateKey(new Date()); const dayTasks = tasks.filter((task) => task.date.slice(0, 10) === key); return <section key={key} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedId) { move(draggedId, key); setDraggedId(null) } }} className={`min-h-[420px] min-w-[220px] rounded-2xl border bg-card ${today ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>
          <div className={`border-b border-border px-4 py-3 ${today ? "bg-primary/10" : ""}`}><div className="flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{formatDay(day)}</h2>{today && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Hoje</span>}</div><p className="mt-1 text-xs text-muted-foreground">{dayTasks.length} {dayTasks.length === 1 ? "tarefa" : "tarefas"}</p></div>
          <div className="flex flex-col gap-2 p-2">{dayTasks.map((task) => <article key={task.id} draggable onDragStart={() => setDraggedId(task.id)} className="group cursor-grab rounded-xl border border-border bg-background p-3 shadow-sm active:cursor-grabbing"><div className="flex items-start gap-2"><GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />{task.imageData ? <img src={task.imageData} alt="" className="size-10 rounded-lg object-cover" /> : null}<div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{task.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{task.time}</p></div><button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setForm({ ...task, notes: task.notes ?? "" })} aria-label="Editar tarefa"><Pencil className="size-3.5" /></button></div><div className="mt-3 flex items-center justify-between gap-2"><select aria-label={`Status de ${task.name}`} value={task.status} onChange={(event) => status(task.id, event.target.value as AgendaStatus)} className="h-7 min-w-0 flex-1 rounded-md border border-border bg-card px-2 text-xs outline-none focus:ring-2 focus:ring-ring/40">{STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><button className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => remove(task.id)} aria-label="Excluir tarefa"><Trash2 className="size-3.5" /></button></div>{task.notes ? <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{task.notes}</p> : null}</article>)}</div>
        </section> })}
      </div>
    </div>
    {form ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><form onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-xl"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-semibold">{form.id ? "Editar tarefa" : "Nova tarefa"}</h2><p className="text-xs text-muted-foreground">Preencha os dados da produção.</p></div><button type="button" onClick={() => setForm(null)} aria-label="Fechar"><X className="size-5" /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-medium">Nome do item</span><input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" placeholder="Ex.: Suporte de parede" /></label><label className="space-y-1.5"><span className="text-sm font-medium">Dia</span><input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label><label className="space-y-1.5"><span className="text-sm font-medium">Horário</span><input type="time" required value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40" /></label><label className="space-y-1.5"><span className="text-sm font-medium">Status</span><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AgendaStatus })} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40">{STATUS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="space-y-1.5"><span className="text-sm font-medium">Imagem <span className="font-normal text-muted-foreground">(opcional)</span></span><span className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm text-muted-foreground"><ImagePlus className="size-4" /><input type="file" accept="image/*" onChange={image} className="min-w-0 text-xs" /></span></label><label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-medium">Observação <span className="font-normal text-muted-foreground">(opcional)</span></span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40" placeholder="Detalhes da produção..." /></label></div><div className="flex justify-end gap-2 border-t border-border px-5 py-4"><Button type="button" variant="outline" onClick={() => setForm(null)}>Cancelar</Button><Button type="submit" disabled={isPending}>Salvar</Button></div></form></div> : null}
  </main>
}
