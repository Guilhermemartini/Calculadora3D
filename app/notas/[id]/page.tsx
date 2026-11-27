import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { NoteForm } from "@/components/notes/note-form"
import { getNote } from "@/app/actions/notes"
import { requireNotesPageAccess } from "@/lib/notes-auth"

export default async function EditNotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireNotesPageAccess()
  const note = await getNote(id)
  if (!note) notFound()
  return (
    <AppShell>
      <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-8">
        <NoteForm initialNote={note} />
      </main>
    </AppShell>
  )
}
