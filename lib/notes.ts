export type NoteNode = {
  type: string
  attrs?: Record<string, string | number | boolean | null>
  content?: NoteNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, string | number | boolean | null> }>
}

export type NoteComment = {
  id: string
  body: string
  createdAt: string
}

export type Note = {
  id: string
  title: string
  content: NoteNode
  comments: NoteComment[]
  imagePaths: string[]
  isPinned: boolean
  createdAt: string
  updatedAt: string
}

export const EMPTY_NOTE_DOCUMENT: NoteNode = {
  type: "doc",
  content: [{ type: "paragraph" }],
}
