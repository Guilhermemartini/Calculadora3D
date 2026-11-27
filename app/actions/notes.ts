"use server"

import { del } from "@vercel/blob"
import { revalidatePath } from "next/cache"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { getNotesUserId } from "@/lib/notes-auth"
import type { Note, NoteComment, NoteNode } from "@/lib/notes"

const ALLOWED_NODES = new Set([
  "doc", "paragraph", "heading", "text", "bulletList", "orderedList", "listItem",
  "taskList", "taskItem", "blockquote", "codeBlock", "hardBreak", "horizontalRule", "image",
])
const ALLOWED_MARKS = new Set(["bold", "italic", "strike", "underline", "code", "link", "textStyle", "highlight", "noteComment"])
const ALLOWED_FONTS = new Set(["Arial", "Roboto", "Inter", "Open Sans", "Montserrat", "Times New Roman", "Georgia", "Verdana", "Courier New"])
const DEFAULT_CONTENT: NoteNode = { type: "doc", content: [{ type: "paragraph" }] }

type SaveNoteInput = {
  id: string | null
  isNew: boolean
  title: string
  content: NoteNode
  comments: NoteComment[]
}

function isSafeHref(value: string) {
  try {
    const url = new URL(value)
    return ["http:", "https:", "mailto:"].includes(url.protocol)
  } catch {
    return false
  }
}

function imagePathFromSource(source: string, userId: string) {
  if (!source.startsWith("/api/notes/image?")) throw new Error("Use imagens enviadas para esta nota.")
  let url: URL
  try {
    url = new URL(source, "https://notes.invalid")
  } catch {
    throw new Error("Uma imagem da nota possui uma referência inválida.")
  }
  if (url.pathname !== "/api/notes/image") throw new Error("Use imagens enviadas para esta nota.")
  const pathname = url.searchParams.get("pathname")
  if (!pathname || !pathname.startsWith(`notes/${userId}/`) || pathname.includes("..")) {
    throw new Error("Uma imagem não pertence a esta conta.")
  }
  return pathname
}

function sanitizeNode(value: unknown, userId: string, depth = 0, counter = { value: 0 }): NoteNode {
  if (!value || typeof value !== "object" || Array.isArray(value) || depth > 24 || ++counter.value > 2500) {
    throw new Error("O conteúdo da nota não é válido.")
  }
  const raw = value as Record<string, unknown>
  if (typeof raw.type !== "string" || !ALLOWED_NODES.has(raw.type)) {
    throw new Error("O conteúdo contém um tipo de bloco não permitido.")
  }

  const node: NoteNode = { type: raw.type }
  if (raw.text !== undefined) {
    if (typeof raw.text !== "string" || raw.text.length > 100_000) throw new Error("O texto da nota é muito extenso.")
    node.text = raw.text
  }

  if (raw.attrs !== undefined && raw.attrs !== null) {
    if (typeof raw.attrs !== "object" || Array.isArray(raw.attrs)) throw new Error("Os atributos da nota não são válidos.")
    const attrs = raw.attrs as Record<string, unknown>
    const safeAttrs: NoteNode["attrs"] = {}
    for (const [key, attribute] of Object.entries(attrs)) {
      if (attribute === null || typeof attribute === "boolean" || typeof attribute === "number") {
        safeAttrs[key] = attribute
      } else if (typeof attribute === "string" && attribute.length <= 2048) {
        if (key === "src") imagePathFromSource(attribute, userId)
        if (key === "fontFamily" && !ALLOWED_FONTS.has(attribute)) throw new Error("A fonte selecionada não é permitida.")
        if (key === "width" && !/^(?:[8-9]\d|[1-9]\d{2}|1[01]\d{2}|1200)(?:px)?$/.test(attribute)) throw new Error("A largura da imagem não é válida.")
        if (key === "paragraphSpacing" && !["0", "0.5", "1", "1.5"].includes(attribute)) throw new Error("O espaçamento entre parágrafos não é válido.")
        if (key === "fontSize" && !/^(?:[8-9]|[1-9]\d|1[0-2]\d)px$/.test(attribute)) throw new Error("O tamanho da fonte não é válido.")
        if (key === "lineHeight" && !["1", "1.15", "1.5", "2"].includes(attribute)) throw new Error("O espaçamento entre linhas não é válido.")
        if ((key === "color" || key === "backgroundColor") && !/^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,20})$/i.test(attribute)) throw new Error("A cor escolhida não é válida.")
        safeAttrs[key] = attribute
      }
    }
    node.attrs = safeAttrs
  }

  if (raw.content !== undefined) {
    if (!Array.isArray(raw.content) || raw.content.length > 2500) throw new Error("A nota contém itens demais.")
    node.content = raw.content.map((child) => sanitizeNode(child, userId, depth + 1, counter))
  }

  if (raw.marks !== undefined) {
    if (!Array.isArray(raw.marks) || raw.marks.length > 10) throw new Error("A formatação da nota não é válida.")
    node.marks = raw.marks.map((markValue) => {
      if (!markValue || typeof markValue !== "object" || Array.isArray(markValue)) throw new Error("A formatação da nota não é válida.")
      const mark = markValue as Record<string, unknown>
      if (typeof mark.type !== "string" || !ALLOWED_MARKS.has(mark.type)) throw new Error("A nota contém uma formatação não permitida.")
      const attrs = mark.attrs && typeof mark.attrs === "object" ? mark.attrs as Record<string, unknown> : undefined
      if (mark.type === "link" && (typeof attrs?.href !== "string" || !isSafeHref(attrs.href))) throw new Error("O link da nota não é seguro.")
      const safeMark: NonNullable<NoteNode["marks"]>[number] = { type: mark.type }
      if (attrs) {
        safeMark.attrs = Object.fromEntries(Object.entries(attrs).filter(([, item]) => item === null || typeof item === "string" || typeof item === "number" || typeof item === "boolean")) as NonNullable<NoteNode["marks"]>[number]["attrs"]
      }
      return safeMark
    })
  }

  if (node.type === "image" && typeof node.attrs?.src !== "string") throw new Error("Uma imagem da nota não possui uma referência válida.")
  return node
}

function collectImagePaths(node: NoteNode, userId: string, paths = new Set<string>()) {
  if (node.type === "image" && typeof node.attrs?.src === "string") paths.add(imagePathFromSource(node.attrs.src, userId))
  node.content?.forEach((child) => collectImagePaths(child, userId, paths))
  return [...paths]
}

function sanitizeComments(value: NoteComment[]) {
  if (!Array.isArray(value) || value.length > 100) throw new Error("A nota pode ter até 100 comentários.")
  return value.map((comment) => {
    if (!comment || typeof comment.id !== "string" || comment.id.length > 100 || typeof comment.body !== "string") {
      throw new Error("Um comentário não é válido.")
    }
    const body = comment.body.trim()
    if (!body || body.length > 1000) throw new Error("Os comentários devem ter até 1.000 caracteres.")
    return { id: comment.id, body, createdAt: typeof comment.createdAt === "string" ? comment.createdAt : new Date().toISOString() }
  })
}

function asJson<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try { return JSON.parse(value) as T } catch { return fallback }
  }
  return (value as T) ?? fallback
}

function mapNote(row: Record<string, unknown>): Note {
  const createdAt = row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at)
  const updatedAt = row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
  return {
    id: String(row.id),
    title: String(row.title),
    content: asJson(row.content, DEFAULT_CONTENT),
    comments: asJson(row.comments, []),
    imagePaths: Array.isArray(row.image_paths) ? row.image_paths.map(String) : [],
    isPinned: Boolean(row.is_pinned),
    createdAt,
    updatedAt,
  }
}

async function deleteRemovedImages(previous: string[], next: string[]) {
  const removed = previous.filter((path) => !next.includes(path))
  if (!removed.length) return
  await Promise.all(removed.map((path) => del(path).catch((error) => console.error("[notes] Falha ao remover imagem antiga:", error))))
}

export async function listNotes(): Promise<Note[]> {
  const userId = await getNotesUserId()
  const result = await db.execute(sql`SELECT id, title, content, comments, image_paths, is_pinned, created_at, updated_at FROM public.notes WHERE user_id = ${userId} ORDER BY is_pinned DESC, updated_at DESC`)
  return result.rows.map((row) => mapNote(row as Record<string, unknown>))
}

export async function getNote(id: string): Promise<Note | null> {
  const userId = await getNotesUserId()
  const result = await db.execute(sql`SELECT id, title, content, comments, image_paths, is_pinned, created_at, updated_at FROM public.notes WHERE id = ${id} AND user_id = ${userId} LIMIT 1`)
  return result.rows[0] ? mapNote(result.rows[0] as Record<string, unknown>) : null
}

export async function saveNote(input: SaveNoteInput) {
  const userId = await getNotesUserId()
  const title = typeof input.title === "string" ? input.title.trim() : ""
  if (!title || title.length > 120) throw new Error("Informe um nome de até 120 caracteres.")
  const serialized = JSON.stringify(input.content)
  if (!serialized || serialized.length > 500_000) throw new Error("O conteúdo da nota deve ter no máximo 500 KB.")
  const content = sanitizeNode(input.content, userId)
  if (content.type !== "doc") throw new Error("O conteúdo da nota não é válido.")
  const comments = sanitizeComments(input.comments)
  const imagePaths = collectImagePaths(content, userId)

  if (input.isNew) {
    const id = input.id ?? crypto.randomUUID()
    const inserted = await db.execute(sql`INSERT INTO public.notes (id, user_id, title, content, comments, image_paths) VALUES (${id}, ${userId}, ${title}, ${JSON.stringify(content)}::jsonb, ${JSON.stringify(comments)}::jsonb, ${imagePaths}) ON CONFLICT (id) DO NOTHING RETURNING id`)
    if (!inserted.rows[0]) {
      const existing = await db.execute(sql`SELECT id FROM public.notes WHERE id = ${id} AND user_id = ${userId} LIMIT 1`)
      if (!existing.rows[0]) throw new Error("Não foi possível criar a nota.")
    }
    revalidatePath("/notas")
    return { id, updated: false }
  }

  if (!input.id) throw new Error("A nota não foi encontrada.")
  const existing = await db.execute(sql`SELECT image_paths FROM public.notes WHERE id = ${input.id} AND user_id = ${userId} LIMIT 1`)
  if (!existing.rows[0]) throw new Error("A nota não foi encontrada.")
  const previous = (existing.rows[0] as { image_paths?: string[] }).image_paths ?? []
  const result = await db.execute(sql`UPDATE public.notes SET title = ${title}, content = ${JSON.stringify(content)}::jsonb, comments = ${JSON.stringify(comments)}::jsonb, image_paths = ${imagePaths}, updated_at = now() WHERE id = ${input.id} AND user_id = ${userId} RETURNING id`)
  if (!result.rows[0]) throw new Error("A nota não foi encontrada.")
  await deleteRemovedImages(previous, imagePaths)
  revalidatePath("/notas")
  return { id: input.id, updated: true }
}

export async function setNotePinned(id: string, isPinned: boolean) {
  const userId = await getNotesUserId()
  const result = await db.execute(sql`UPDATE public.notes SET is_pinned = ${Boolean(isPinned)}, updated_at = now() WHERE id = ${id} AND user_id = ${userId} RETURNING id`)
  if (!result.rows[0]) throw new Error("A nota não foi encontrada.")
  revalidatePath("/notas")
}

export async function deleteNote(id: string) {
  const userId = await getNotesUserId()
  const result = await db.execute(sql`DELETE FROM public.notes WHERE id = ${id} AND user_id = ${userId} RETURNING image_paths`)
  if (!result.rows[0]) throw new Error("A nota não foi encontrada.")
  const paths = (result.rows[0] as { image_paths?: string[] }).image_paths ?? []
  await deleteRemovedImages(paths, [])
  revalidatePath("/notas")
}

export async function toggleNoteTask(id: string, path: number[]) {
  const userId = await getNotesUserId()
  if (!Array.isArray(path) || path.length > 24 || path.some((index) => !Number.isInteger(index) || index < 0 || index > 2500)) {
    throw new Error("A tarefa selecionada não é válida.")
  }
  const result = await db.execute(sql`SELECT content FROM public.notes WHERE id = ${id} AND user_id = ${userId} LIMIT 1`)
  if (!result.rows[0]) throw new Error("A nota não foi encontrada.")
  const content = asJson(result.rows[0].content, DEFAULT_CONTENT)
  let target: NoteNode | undefined = content
  for (const index of path) target = target?.content?.[index]
  if (!target || target.type !== "taskItem") throw new Error("A tarefa não foi encontrada.")
  target.attrs = { ...target.attrs, checked: !Boolean(target.attrs?.checked) }
  const safeContent = sanitizeNode(content, userId)
  await db.execute(sql`UPDATE public.notes SET content = ${JSON.stringify(safeContent)}::jsonb, updated_at = now() WHERE id = ${id} AND user_id = ${userId}`)
  revalidatePath("/notas")
  return safeContent
}
