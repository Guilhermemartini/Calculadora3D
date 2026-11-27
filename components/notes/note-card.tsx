import Link from "next/link"
import { CalendarDays, ExternalLink, Pencil, Pin, StickyNote, Trash2 } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import type { Note } from "@/lib/notes"
import { NoteRenderer } from "@/components/notes/note-renderer"

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const startOfDate = new Date(date)
  startOfDate.setHours(0, 0, 0, 0)
  const days = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000)
  if (days <= 0) return `Atualizada hoje às ${time}`
  if (days === 1) return `Atualizada ontem às ${time}`
  return `Atualizada em ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date)} às ${time}`
}

export function NoteCard({
  note,
  onPin,
  onDelete,
  onToggleTask,
}: {
  note: Note
  onPin: (id: string, pinned: boolean) => void
  onDelete: (note: Note) => void
  onToggleTask: (id: string, path: number[]) => void
}) {
  return (
    <article className="flex min-h-[290px] flex-col rounded-2xl border border-border bg-muted/80 p-5 text-card-foreground">
      <header className="mb-4 flex items-start gap-3">
        <StickyNote className="mt-0.5 size-6 shrink-0 text-foreground" aria-hidden="true" />
        <Link href={`/notas/${note.id}`} className="min-w-0 flex-1 rounded-sm text-lg font-semibold leading-snug outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
          <span className="line-clamp-2">{note.title}</span>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={note.isPinned ? "Desafixar nota" : "Fixar nota"}
          aria-pressed={note.isPinned}
          title={note.isPinned ? "Desafixar" : "Fixar"}
          onClick={() => onPin(note.id, !note.isPinned)}
          className={note.isPinned ? "shrink-0 text-primary hover:text-primary" : "shrink-0 text-muted-foreground"}
        >
          <Pin className="size-5" fill={note.isPinned ? "currentColor" : "none"} />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden">
        <NoteRenderer content={note.content} comments={note.comments} onToggleTask={(path) => onToggleTask(note.id, path)} />
      </div>
      <Link href={`/notas/${note.id}`} className="mt-2 inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline">
        Abrir nota <ExternalLink className="size-3" aria-hidden="true" />
      </Link>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          {formatUpdatedAt(note.updatedAt)}
        </span>
        <div className="flex items-center gap-1">
          <Link href={`/notas/${note.id}`} className={buttonVariants({ variant: "outline", size: "icon-sm" })} aria-label={`Editar ${note.title}`} title="Editar">
            <Pencil />
          </Link>
          <Button type="button" variant="outline" size="icon-sm" aria-label={`Excluir ${note.title}`} title="Excluir" className="text-destructive hover:text-destructive" onClick={() => onDelete(note)}>
            <Trash2 />
          </Button>
        </div>
      </footer>
    </article>
  )
}
