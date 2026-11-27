import { StickyNote } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { NotesBoard } from "@/components/notes/notes-board"
import { listNotes } from "@/app/actions/notes"
import { requireNotesPageAccess } from "@/lib/notes-auth"

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireNotesPageAccess()
  const [{ saved }, notes] = await Promise.all([searchParams, listNotes()])
  const initialMessage = saved === "created" ? "Nota salva com sucesso." : saved === "updated" ? "Nota atualizada com sucesso." : undefined
  return (
    <AppShell>
      <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex items-center gap-4 border-b border-border pb-5">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><StickyNote className="size-7" aria-hidden="true" /></div>
            <div><h1 className="text-3xl font-semibold tracking-tight">Notas</h1><p className="mt-1 text-sm text-muted-foreground sm:text-base">Suas anotações rápidas e importantes</p></div>
          </header>
          <NotesBoard notes={notes} initialMessage={initialMessage} />
        </div>
      </main>
    </AppShell>
  )
}

