import { AppShell } from "@/components/app-shell"
import { AgendaBoard } from "@/components/agenda-board"

export const dynamic = "force-dynamic"
import { listAllAgendaTasks } from "@/app/actions/agenda"

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default async function AgendaPage() {
  const tasks = await listAllAgendaTasks()

  return (
    <AppShell>
      <AgendaBoard initialTasks={tasks} initialWeek={dateKey(new Date())} />
    </AppShell>
  )
}
