import { AppShell } from "@/components/app-shell"
import { NoteForm } from "@/components/notes/note-form"
import { requireNotesPageAccess } from "@/lib/notes-auth"

export default async function NewNotePage() {
  await requireNotesPageAccess()
  return (
    <AppShell>
      <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-8">
        <NoteForm />
      </main>
    </AppShell>
  )
}
