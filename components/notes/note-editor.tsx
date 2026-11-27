"use client"

import { EditorContent, useEditor } from "@tiptap/react"
import { useRef, useState } from "react"
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Check, Highlighter, ImageMinus, ImagePlus,
  IndentDecrease, IndentIncrease, Italic, Link2, List, ListChecks, ListOrdered,
  MessageSquarePlus, Minus, Paintbrush, Plus, Redo2, Strikethrough, Underline,
  Undo2, Unlink, Upload, X,
} from "lucide-react"
import type { NoteComment, NoteNode } from "@/lib/notes"
import { noteEditorExtensions } from "@/components/notes/note-editor-extensions"

type Props = {
  initialContent: NoteNode
  comments: NoteComment[]
  onChange: (content: NoteNode) => void
  onCommentsChange: (comments: NoteComment[]) => void
}

const fonts = ["Arial", "Roboto", "Inter", "Open Sans", "Montserrat", "Times New Roman", "Georgia", "Verdana", "Courier New"]
const lineHeights = ["1", "1.15", "1.5", "2"]

function ToolButton({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-40 ${active ? "border-primary/30 bg-primary/15 text-primary" : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"}`}
    >
      {children}
    </button>
  )
}

function safeLink(value: string) {
  const href = /^(https?:|mailto:)/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`
  try {
    const url = new URL(href)
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? href : null
  } catch {
    return null
  }
}

export function NoteEditor({ initialContent, comments, onChange, onCommentsChange }: Props) {
  const imageInput = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editorError, setEditorError] = useState("")
  const [selectionVersion, setSelectionVersion] = useState(0)
  const [fontSize, setFontSize] = useState("16")
  const [showComments, setShowComments] = useState(false)

  const editor = useEditor({
    extensions: noteEditorExtensions,
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: "note-editor-content",
        class: "min-h-[350px] px-4 py-4 text-sm leading-relaxed text-foreground outline-none sm:px-6",
        "aria-labelledby": "note-content-label",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as NoteNode),
    onTransaction: () => setSelectionVersion((value) => value + 1),
  })

  void selectionVersion

  function applyHeading(value: string) {
    if (!editor) return
    if (value === "normal") editor.chain().focus().setParagraph().run()
    else {
      const level = Number(value === "title" ? 1 : value === "subtitle" ? 2 : value.replace("heading-", ""))
      editor.chain().focus().setHeading({ level: Math.min(6, Math.max(1, level)) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
    }
  }

  function currentHeading() {
    if (!editor) return "normal"
    if (editor.isActive("heading", { level: 1 })) return "title"
    if (editor.isActive("heading", { level: 2 })) return "subtitle"
    for (let level = 3; level <= 6; level += 1) {
      if (editor.isActive("heading", { level })) return `heading-${level}`
    }
    return "normal"
  }

  function changeIndent(direction: -1 | 1) {
    if (!editor) return
    if (editor.isActive("taskItem")) {
      editor.chain().focus()[direction > 0 ? "sinkListItem" : "liftListItem"]("taskItem").run()
      return
    }
    if (editor.isActive("listItem")) {
      editor.chain().focus()[direction > 0 ? "sinkListItem" : "liftListItem"]("listItem").run()
      return
    }
    const type = editor.isActive("heading") ? "heading" : "paragraph"
    const current = Number(editor.getAttributes(type).indentLevel) || 0
    editor.chain().focus().updateAttributes(type, { indentLevel: Math.min(6, Math.max(0, current + direction)) }).run()
  }

  function changeLink() {
    if (!editor) return
    const current = String(editor.getAttributes("link").href ?? "")
    const answer = window.prompt("Endereço do link (deixe vazio para remover)", current)
    if (answer === null) return
    if (!answer.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }
    const href = safeLink(answer)
    if (!href) {
      setEditorError("Informe um endereço http, https ou e-mail válido.")
      return
    }
    setEditorError("")
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
  }

  function addComment() {
    if (!editor) return
    const { from, to, empty } = editor.state.selection
    if (empty) {
      setEditorError("Selecione um trecho do texto para associar um comentário.")
      return
    }
    const body = window.prompt("Comentário sobre o trecho selecionado")?.trim()
    if (!body) return
    const id = crypto.randomUUID()
    editor.chain().focus().setTextSelection({ from, to }).setMark("noteComment", { commentId: id }).run()
    onCommentsChange([...comments, { id, body: body.slice(0, 1000), createdAt: new Date().toISOString() }])
    setEditorError("")
    setShowComments(true)
  }

  function editComment(comment: NoteComment) {
    const body = window.prompt("Editar comentário", comment.body)?.trim()
    if (!body) return
    onCommentsChange(comments.map((item) => item.id === comment.id ? { ...item, body: body.slice(0, 1000) } : item))
  }

  function removeComment(commentId: string) {
    if (!editor) return
    const ranges: Array<{ from: number; to: number }> = []
    editor.state.doc.descendants((node, position) => {
      if (node.marks.some((mark) => mark.type.name === "noteComment" && mark.attrs.commentId === commentId)) {
        ranges.push({ from: position, to: position + node.nodeSize })
      }
    })
    for (const range of ranges.reverse()) {
      editor.chain().focus().setTextSelection(range).unsetMark("noteComment").run()
    }
    onCommentsChange(comments.filter((item) => item.id !== commentId))
  }

  async function insertImage(file: File | undefined) {
    if (!editor || !file) return
    setUploadingImage(true)
    setEditorError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/notes/upload", { method: "POST", body: formData })
      const result = await response.json() as { pathname?: string; error?: string }
      if (!response.ok || !result.pathname) throw new Error(result.error || "Não foi possível enviar a imagem.")
      const src = `/api/notes/image?pathname=${encodeURIComponent(result.pathname)}`
      editor.chain().focus().setImage({ src, alt: file.name.slice(0, 200) }).run()
    } catch (cause) {
      setEditorError(cause instanceof Error ? cause.message : "Não foi possível inserir a imagem.")
    } finally {
      setUploadingImage(false)
      if (imageInput.current) imageInput.current.value = ""
    }
  }

  function handleEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = event.target
    if (event.defaultPrevented || !editor || !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "k") return
    if (!(target instanceof HTMLElement) || !target.closest(".tiptap")) return
    event.preventDefault()
    changeLink()
  }

  const activeSize = Number.parseInt(String(editor?.getAttributes("textStyle").fontSize ?? fontSize), 10) || 16
  const setSize = (nextSize: number) => {
    if (!editor) return
    const value = Math.min(128, Math.max(8, nextSize))
    setFontSize(String(value))
    editor.chain().focus().setFontSize(`${value}px`).run()
  }

  return (
    <div className="notes-editor overflow-hidden rounded-xl border border-border bg-background" onKeyDown={handleEditorKeyDown}>
      <div className="flex flex-col gap-2 border-b border-border bg-card/70 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <select aria-label="Estilo do parágrafo" title="Estilo do parágrafo" value={currentHeading()} onChange={(event) => applyHeading(event.target.value)} className="h-9 max-w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground sm:w-40">
            <option value="normal">Texto normal</option>
            <option value="title">Título</option>
            <option value="subtitle">Subtítulo</option>
            {[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={`heading-${level}`}>Cabeçalho {level}</option>)}
          </select>
          <select aria-label="Família tipográfica" title="Família tipográfica" value={String(editor?.getAttributes("textStyle").fontFamily ?? "Inter")} onChange={(event) => editor?.chain().focus().setFontFamily(event.target.value).run()} className="h-9 max-w-full rounded-lg border border-input bg-background px-2 text-xs text-foreground sm:w-36">
            {fonts.map((font) => <option key={font} value={font}>{font}</option>)}
          </select>
          <div className="flex h-9 items-center overflow-hidden rounded-lg border border-input bg-background">
            <button type="button" title="Diminuir tamanho da fonte" aria-label="Diminuir tamanho da fonte" onMouseDown={(event) => event.preventDefault()} onClick={() => setSize(activeSize - 1)} className="flex size-8 items-center justify-center text-muted-foreground hover:bg-muted"><Minus className="size-3.5" /></button>
            <input aria-label="Tamanho da fonte" title="Tamanho da fonte" type="number" min={8} max={128} value={fontSize} onChange={(event) => setFontSize(event.target.value)} onBlur={() => setSize(Number(fontSize) || 16)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setSize(Number(fontSize) || 16) } }} className="h-full w-12 border-x border-input bg-transparent text-center text-xs outline-none" />
            <button type="button" title="Aumentar tamanho da fonte" aria-label="Aumentar tamanho da fonte" onMouseDown={(event) => event.preventDefault()} onClick={() => setSize(activeSize + 1)} className="flex size-8 items-center justify-center text-muted-foreground hover:bg-muted"><Plus className="size-3.5" /></button>
          </div>
          <select aria-label="Espaçamento entre linhas" title="Espaçamento entre linhas" defaultValue="1.5" onChange={(event) => editor?.chain().focus().setLineHeight(event.target.value).run()} className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground">
            {lineHeights.map((lineHeight) => <option key={lineHeight} value={lineHeight}>{lineHeight === "1" ? "Simples" : lineHeight === "1.15" ? "1,15" : lineHeight === "1.5" ? "1,5" : "Duplo"}</option>)}
          </select>
          <select aria-label="Espaçamento entre parágrafos" title="Espaçamento entre parágrafos" defaultValue="0.5" onChange={(event) => {
            if (!editor) return
            const type = editor.isActive("heading") ? "heading" : "paragraph"
            editor.chain().focus().updateAttributes(type, { paragraphSpacing: event.target.value }).run()
          }} className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground">
            <option value="0">Parágrafos: compacto</option>
            <option value="0.5">Parágrafos: normal</option>
            <option value="1">Parágrafos: amplo</option>
            <option value="1.5">Parágrafos: duplo</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <ToolButton label="Negrito (Ctrl+B)" active={Boolean(editor?.isActive("bold"))} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="size-4" /></ToolButton>
          <ToolButton label="Itálico (Ctrl+I)" active={Boolean(editor?.isActive("italic"))} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="size-4" /></ToolButton>
          <ToolButton label="Sublinhado (Ctrl+U)" active={Boolean(editor?.isActive("underline"))} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()}><Underline className="size-4" /></ToolButton>
          <ToolButton label="Tachado" active={Boolean(editor?.isActive("strike"))} disabled={!editor} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough className="size-4" /></ToolButton>
          <label title="Cor do texto" className="flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted">
            <Paintbrush className="size-4" aria-hidden="true" />
            <span className="sr-only">Cor do texto</span>
            <input type="color" aria-label="Cor do texto" defaultValue="#f5f5f5" onChange={(event) => editor?.chain().focus().setColor(event.target.value).run()} className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" />
          </label>
          <label title="Realçar texto" className="flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted">
            <Highlighter className="size-4" aria-hidden="true" />
            <span className="sr-only">Cor do realce</span>
            <input type="color" aria-label="Cor do realce" defaultValue="#f97316" onChange={(event) => editor?.chain().focus().setHighlight({ color: event.target.value }).run()} className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" />
          </label>
          <ToolButton label="Inserir ou editar link (Ctrl+K)" active={Boolean(editor?.isActive("link"))} disabled={!editor} onClick={changeLink}><Link2 className="size-4" /></ToolButton>
          <ToolButton label="Adicionar comentário ao trecho selecionado" disabled={!editor} onClick={addComment}><MessageSquarePlus className="size-4" /></ToolButton>
          <ToolButton label="Alinhar à esquerda" active={Boolean(editor?.isActive({ textAlign: "left" }))} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign("left").run()}><AlignLeft className="size-4" /></ToolButton>
          <ToolButton label="Centralizar" active={Boolean(editor?.isActive({ textAlign: "center" }))} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign("center").run()}><AlignCenter className="size-4" /></ToolButton>
          <ToolButton label="Alinhar à direita" active={Boolean(editor?.isActive({ textAlign: "right" }))} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign("right").run()}><AlignRight className="size-4" /></ToolButton>
          <ToolButton label="Justificar" active={Boolean(editor?.isActive({ textAlign: "justify" }))} disabled={!editor} onClick={() => editor?.chain().focus().setTextAlign("justify").run()}><AlignJustify className="size-4" /></ToolButton>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <ToolButton label="Lista com marcadores" active={Boolean(editor?.isActive("bulletList"))} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="size-4" /></ToolButton>
          <ToolButton label="Lista numerada" active={Boolean(editor?.isActive("orderedList"))} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></ToolButton>
          <ToolButton label="Checklist" active={Boolean(editor?.isActive("taskList"))} disabled={!editor} onClick={() => editor?.chain().focus().toggleTaskList().run()}><ListChecks className="size-4" /></ToolButton>
          <ToolButton label="Aumentar recuo ou criar subitem" disabled={!editor} onClick={() => changeIndent(1)}><IndentIncrease className="size-4" /></ToolButton>
          <ToolButton label="Diminuir recuo" disabled={!editor} onClick={() => changeIndent(-1)}><IndentDecrease className="size-4" /></ToolButton>
          <ToolButton label="Inserir imagem" disabled={!editor || uploadingImage} onClick={() => imageInput.current?.click()}>{uploadingImage ? <Upload className="size-4 animate-pulse" /> : <ImagePlus className="size-4" />}</ToolButton>
          <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" aria-label="Selecionar imagem" onChange={(event) => void insertImage(event.target.files?.[0])} />
          <ToolButton label="Remover imagem selecionada" disabled={!editor?.isActive("image")} onClick={() => editor?.chain().focus().deleteSelection().run()}><ImageMinus className="size-4" /></ToolButton>
          <ToolButton label="Desfazer (Ctrl+Z)" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}><Undo2 className="size-4" /></ToolButton>
          <ToolButton label="Refazer (Ctrl+Shift+Z)" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}><Redo2 className="size-4" /></ToolButton>
          <ToolButton label="Limpar formatação" disabled={!editor} onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}><X className="size-4" /></ToolButton>
          <button type="button" onClick={() => { editor?.chain().focus().unsetLink().run(); editor?.chain().focus().unsetHighlight().run() }} title="Remover link ou realce" aria-label="Remover link ou realce" className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted"><Unlink className="size-4" /> Remover link</button>
        </div>
      </div>

      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/50 px-4 py-2.5">
        <button type="button" onClick={() => setShowComments((value) => !value)} aria-expanded={showComments} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
          <MessageSquarePlus className="size-4" /> Comentários ({comments.length})
        </button>
        <span className="text-xs text-muted-foreground">Ctrl/⌘ + B, I, U · Ctrl/⌘ + K para links</span>
      </div>

      {showComments && comments.length ? (
        <div className="border-t border-border px-4 py-3">
          <h3 className="mb-2 text-sm font-semibold">Comentários</h3>
          <ul className="flex flex-col gap-2">
            {comments.map((comment) => (
              <li key={comment.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted/70 px-3 py-2 text-sm">
                <div className="min-w-0"><p className="break-words">{comment.body}</p><time className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(comment.createdAt))}</time></div>
                <div className="flex shrink-0 gap-1"><button type="button" onClick={() => editComment(comment)} aria-label="Editar comentário" title="Editar comentário" className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"><span className="text-xs">Editar</span></button><button type="button" onClick={() => removeComment(comment.id)} aria-label="Excluir comentário" title="Excluir comentário" className="rounded p-1.5 text-destructive hover:bg-background"><X className="size-4" /></button></div>
              </li>
            ))}
          </ul>
        </div>
      ) : showComments ? <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">Ainda não há comentários nesta nota.</p> : null}

      {editorError ? <p role="alert" className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">{editorError}</p> : null}
    </div>
  )
}
