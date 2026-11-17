import { AppShell } from "@/components/app-shell"
import { AgendaBoard } from "@/components/agenda-board"

export const dynamic = "force-dynamic"
import { listAllAgendaTasks } from "@/app/actions/agenda"
import { listCommemorativeDates } from "@/app/actions/commemorative-dates"
import { requireLegacyPageAccess } from "@/lib/authz"

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default async function AgendaPage() {
  await requireLegacyPageAccess("agenda")
  const [tasks, commemorativeDates] = await Promise.all([listAllAgendaTasks(), listCommemorativeDates()])

  return (
    <AppShell>
      <AgendaBoard initialTasks={tasks} initialWeek={dateKey(new Date())} initialCommemorativeDates={commemorativeDates} />
    </AppShell>
  )
}
