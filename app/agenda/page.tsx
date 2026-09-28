import { AppShell } from "@/components/app-shell"
import { AgendaBoard } from "@/components/agenda-board"

export const dynamic = "force-dynamic"
import { listAgendaTasks } from "@/app/actions/agenda"

function startOfWeek(date: Date) {
  const day = date.getDay()
  const result = new Date(date)
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1))
  result.setHours(12, 0, 0, 0)
  return result
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default async function AgendaPage() {
  const start = startOfWeek(new Date())
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const tasks = await listAgendaTasks(dateKey(start), dateKey(end))

  return (
    <AppShell>
      <AgendaBoard initialTasks={tasks} initialWeek={dateKey(new Date())} />
    </AppShell>
  )
}
