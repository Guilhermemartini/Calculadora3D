"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, StickyNote, X } from "lucide-react"
import { deleteNote, setNotePinned, toggleNoteTask } from "@/app/actions/notes"
import { Button } from "@/components/ui/button"
import type { Note } from "@/lib/notes"
import { NoteCard } from "@/components/notes/note-card"

export function NotesBoard({ notes: initialNotes, initialMessage }: { notes: Note[]; initialMessage?: string }) {
  const router = useRouter()
  const [notes, setNotes] = useState(initialNotes)
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [message, setMessage] = useState(initialMessage ?? "")
  const [error, setError] = useState("")
  const cancelDeleteRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!pendingDelete) return
    cancelDeleteRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) setPendingDelete(null)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [isDeleting, pendingDelete])

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [notes],
  )

  async function changePin(id: string, pinned: boolean) {
    const previous = notes.find((note) => note.id === id)?.isPinned
    setError("")
    setNotes((current) => current.map((note) => note.id === id ? { ...note, isPinned: pinned } : note))
    try {
      await setNotePinned(id, pinned)
    } catch (cause) {
      setNotes((current) => current.map((note) => note.id === id ? { ...note, isPinned: Boolean(previous) } : note))
      setError(cause instanceof Error ? cause.message : "Não foi possível fixar a nota.")
    }
  }

  async function changeTask(id: string, path: number[]) {
    const currentNote = notes.find((note) => note.id === id)
    if (!currentNote) return
    const previousContent = currentNote.content
    setError("")
    try {
      const content = await toggleNoteTask(id, path)
      setNotes((current) => current.map((note) => note.id === id ? { ...note, content, updatedAt: new Date().toISOString() } : note))
    } catch (cause) {
      setNotes((current) => current.map((note) => note.id === id ? { ...note, content: previousContent } : note))
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar a tarefa.")
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    setIsDeleting(true)
    setError("")
    try {
      await deleteNote(pendingDelete.id)
      setNotes((current) => current.filter((note) => note.id !== pendingDelete.id))
      setMessage("Nota excluída.")
      setPendingDelete(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir a nota.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Minhas notas</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {notes.length} {notes.length === 1 ? "nota cadastrada" : "notas cadastradas"}
          </p>
        </div>
        <Button type="button" onClick={() => router.push("/notas/nova")} className="h-12 rounded-xl px-5 font-semibold">
          <Plus data-icon="inline-start" /> Nova Nota
        </Button>
      </div>

      {message ? <div role="status" className="mb-4 flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-foreground"><span>{message}</span><button type="button" onClick={() => setMessage("")} className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Fechar mensagem"><X className="size-4" /></button></div> : null}
      {error ? <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      {sortedNotes.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedNotes.map((note) => <NoteCard key={note.id} note={note} onPin={changePin} onDelete={setPendingDelete} onToggleTask={changeTask} />)}
        </div>
      ) : (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-12 text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><StickyNote className="size-7" aria-hidden="true" /></div>
          <h3 className="text-lg font-semibold">Nenhuma nota cadastrada</h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">Crie sua primeira nota para organizar suas ideias, tarefas e lembretes.</p>
          <Button type="button" onClick={() => router.push("/notas/nova")} className="mt-6 rounded-xl"><Plus data-icon="inline-start" /> Nova Nota</Button>
        </div>
      )}

      {pendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) setPendingDelete(null) }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-note-title" aria-describedby="delete-note-description" className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
            <h2 id="delete-note-title" className="text-lg font-semibold">Excluir nota</h2>
            <p id="delete-note-description" className="mt-2 text-sm text-muted-foreground">Tem certeza de que deseja excluir esta nota? Esta ação não poderá ser desfeita.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button ref={cancelDeleteRef} type="button" variant="outline" disabled={isDeleting} onClick={() => setPendingDelete(null)}>Cancelar</Button>
              <Button type="button" variant="destructive" disabled={isDeleting} onClick={confirmDelete}>{isDeleting ? "Excluindo..." : "Excluir nota"}</Button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  )
}
