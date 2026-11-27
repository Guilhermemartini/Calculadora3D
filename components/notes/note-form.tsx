"use client"

import { useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, StickyNote } from "lucide-react"
import { saveNote } from "@/app/actions/notes"
import { Button } from "@/components/ui/button"
import { NoteEditor } from "@/components/notes/note-editor"
import { EMPTY_NOTE_DOCUMENT, type Note, type NoteComment, type NoteNode } from "@/lib/notes"

export function NoteForm({ initialNote }: { initialNote?: Note }) {
  const router = useRouter()
  const draftId = useRef<string | null>(null)
  const [title, setTitle] = useState(initialNote?.title ?? "")
  const [content, setContent] = useState<NoteNode>(initialNote?.content ?? EMPTY_NOTE_DOCUMENT)
  const [comments, setComments] = useState<NoteComment[]>(initialNote?.comments ?? [])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const isEditing = Boolean(initialNote)

  function cancel() {
    if (saving) return
    if (dirty && !window.confirm("Existem alterações não salvas. Deseja sair sem salvar?")) return
    router.push("/notas")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError("Informe o nome da nota.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const id = initialNote?.id ?? (draftId.current ??= crypto.randomUUID())
      await saveNote({ id, isNew: !initialNote, title: cleanTitle, content, comments })
      router.replace(`/notas?saved=${isEditing ? "updated" : "created"}`)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar a nota.")
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground"><StickyNote className="size-7" aria-hidden="true" /></div>
        <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">{isEditing ? "Editar nota" : "Nova nota"}</h1><p className="mt-1 text-sm text-muted-foreground">{isEditing ? "Atualize sua anotação" : "Crie uma anotação rápida e importante"}</p></div>
      </div>

      {error ? <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p> : null}

      <div className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-2">
          <label htmlFor="note-title" className="text-sm font-medium">Nome da nota</label>
          <input id="note-title" value={title} onChange={(event) => { setTitle(event.target.value); setDirty(true) }} placeholder="Digite o nome da nota" required maxLength={120} className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none transition focus-visible:ring-3 focus-visible:ring-ring/40" />
        </div>

        <div className="mb-2 flex flex-col gap-2">
          <label id="note-content-label" className="text-sm font-medium">Conteúdo da nota</label>
          <NoteEditor
            key={initialNote?.id ?? "new-note"}
            initialContent={content}
            comments={comments}
            onChange={(nextContent) => { setContent(nextContent); setDirty(true) }}
            onCommentsChange={(nextComments) => { setComments(nextComments); setDirty(true) }}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <Button type="button" variant="outline" onClick={cancel} disabled={saving} className="h-11 min-w-32"><ArrowLeft data-icon="inline-start" /> Cancelar</Button>
        <Button type="submit" disabled={saving || !title.trim()} className="h-11 min-w-40">
          {saving ? <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : <Check data-icon="inline-start" />}
          {saving ? "Salvando..." : "Salvar nota"}
        </Button>
      </div>
    </form>
  )
}
