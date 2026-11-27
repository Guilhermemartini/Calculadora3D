import type { CSSProperties, ReactNode } from "react"
import type { NoteComment, NoteNode } from "@/lib/notes"

type Props = {
  content: NoteNode
  comments?: NoteComment[]
  onToggleTask?: (path: number[]) => void
}

const FONT_FAMILIES = new Set(["Arial", "Roboto", "Inter", "Open Sans", "Montserrat", "Times New Roman", "Georgia", "Verdana", "Courier New"])

function safeHref(value: unknown) {
  if (typeof value !== "string") return undefined
  try {
    const url = new URL(value)
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : undefined
  } catch {
    return undefined
  }
}

function renderText(node: NoteNode, comments: NoteComment[]): ReactNode {
  let output: ReactNode = node.text ?? ""
  for (const mark of node.marks ?? []) {
    const attrs = mark.attrs ?? {}
    if (mark.type === "bold") output = <strong key="bold">{output}</strong>
    else if (mark.type === "italic") output = <em key="italic">{output}</em>
    else if (mark.type === "underline") output = <u key="underline">{output}</u>
    else if (mark.type === "strike") output = <s key="strike">{output}</s>
    else if (mark.type === "code") output = <code key="code" className="rounded bg-background/40 px-1">{output}</code>
    else if (mark.type === "link") {
      const href = safeHref(attrs.href)
      if (href) output = <a key="link" href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">{output}</a>
    } else if (mark.type === "highlight") {
      const color = typeof attrs.color === "string" && /^#[0-9a-f]{3,8}$/i.test(attrs.color) ? attrs.color : "#f97316"
      output = <mark key="highlight" style={{ backgroundColor: color, color: "#171717" }} className="rounded px-0.5">{output}</mark>
    } else if (mark.type === "textStyle") {
      const style: CSSProperties = {}
      if (typeof attrs.color === "string" && /^#[0-9a-f]{3,8}$/i.test(attrs.color)) style.color = attrs.color
      if (typeof attrs.backgroundColor === "string" && /^#[0-9a-f]{3,8}$/i.test(attrs.backgroundColor)) style.backgroundColor = attrs.backgroundColor
      if (typeof attrs.fontFamily === "string" && FONT_FAMILIES.has(attrs.fontFamily)) style.fontFamily = attrs.fontFamily
      if (typeof attrs.fontSize === "string" && /^(?:[8-9]|[1-9]\d|1[0-2]\d)px$/.test(attrs.fontSize)) style.fontSize = attrs.fontSize
      output = <span key="text-style" style={style}>{output}</span>
    } else if (mark.type === "noteComment") {
      const comment = comments.find((item) => item.id === attrs.commentId)
      output = <span key={`comment-${String(attrs.commentId)}`} title={comment?.body ?? "Comentário"} className="note-comment-mark">{output}</span>
    }
  }
  return output
}

function blockStyle(node: NoteNode): CSSProperties {
  const attrs = node.attrs ?? {}
  const style: CSSProperties = {}
  if (["left", "center", "right", "justify"].includes(String(attrs.textAlign))) style.textAlign = attrs.textAlign as CSSProperties["textAlign"]
  if (["1", "1.15", "1.5", "2"].includes(String(attrs.lineHeight))) style.lineHeight = attrs.lineHeight as string
  if (["0", "0.5", "1", "1.5"].includes(String(attrs.paragraphSpacing))) style.marginBlockEnd = `${attrs.paragraphSpacing}em`
  const indent = Math.min(6, Math.max(0, Number(attrs.indentLevel) || 0))
  if (indent) style.marginInlineStart = `${indent * 1.5}rem`
  return style
}

function children(node: NoteNode, path: number[], comments: NoteComment[], onToggleTask?: Props["onToggleTask"]) {
  return (node.content ?? []).map((child, index) => renderNode(child, [...path, index], comments, onToggleTask))
}

function renderNode(node: NoteNode, path: number[], comments: NoteComment[], onToggleTask?: Props["onToggleTask"]): ReactNode {
  if (node.type === "text") return renderText(node, comments)
  if (node.type === "doc") return <>{children(node, path, comments, onToggleTask)}</>
  if (node.type === "paragraph") return <p style={blockStyle(node)}>{children(node, path, comments, onToggleTask)}</p>
  if (node.type === "heading") {
    const content = children(node, path, comments, onToggleTask)
    const style = blockStyle(node)
    const level = Number(node.attrs?.level) || 1
    if (level === 1) return <h1 style={style} className="text-lg font-bold">{content}</h1>
    if (level === 2) return <h2 style={style} className="text-base font-semibold">{content}</h2>
    if (level === 3) return <h3 style={style} className="text-sm font-semibold">{content}</h3>
    if (level === 4) return <h4 style={style} className="text-sm font-medium">{content}</h4>
    if (level === 5) return <h5 style={style} className="text-sm font-medium">{content}</h5>
    return <h6 style={style} className="text-sm font-medium">{content}</h6>
  }
  if (node.type === "bulletList" || node.type === "taskList") return <ul className={node.type === "taskList" ? "note-task-list" : "list-disc ps-6"}>{children(node, path, comments, onToggleTask)}</ul>
  if (node.type === "orderedList") return <ol start={Number(node.attrs?.start) || 1} className="list-decimal ps-6">{children(node, path, comments, onToggleTask)}</ol>
  if (node.type === "listItem") return <li style={blockStyle(node)}>{children(node, path, comments, onToggleTask)}</li>
  if (node.type === "taskItem") {
    const checked = Boolean(node.attrs?.checked)
    return (
      <li className="flex items-start gap-2" data-checked={checked}>
        {onToggleTask ? (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggleTask(path)}
            aria-label={checked ? "Desmarcar tarefa" : "Marcar tarefa como concluída"}
            className="mt-1 size-4 shrink-0 accent-primary"
          />
        ) : <span aria-hidden="true" className="mt-1 size-4 shrink-0 rounded border border-muted-foreground/60" />}
        <span className={checked ? "text-muted-foreground line-through" : ""}>{children(node, path, comments, onToggleTask)}</span>
      </li>
    )
  }
  if (node.type === "blockquote") return <blockquote className="border-s-2 border-primary/50 ps-3 italic text-muted-foreground">{children(node, path, comments, onToggleTask)}</blockquote>
  if (node.type === "codeBlock") return <pre className="overflow-x-auto rounded-lg bg-background/50 p-2 font-mono text-xs"><code>{children(node, path, comments, onToggleTask)}</code></pre>
  if (node.type === "hardBreak") return <br />
  if (node.type === "horizontalRule") return <hr className="border-border" />
  if (node.type === "image") {
    const src = typeof node.attrs?.src === "string" && node.attrs.src.startsWith("/api/notes/image?") ? node.attrs.src : ""
    if (!src) return null
    const width = Number(node.attrs?.width)
    const style = Number.isFinite(width) && width >= 80 && width <= 1200 ? { width: `${width}px` } : undefined
    return <img src={src} alt={typeof node.attrs?.alt === "string" ? node.attrs.alt : "Imagem da nota"} style={style} className="my-2 max-h-48 max-w-full rounded-lg object-contain" loading="lazy" />
  }
  return null
}

export function NoteRenderer({ content, comments = [], onToggleTask }: Props) {
  return <div className="notes-rendered flex flex-col gap-1 break-words text-sm leading-relaxed">{renderNode(content, [], comments, onToggleTask)}</div>
}
