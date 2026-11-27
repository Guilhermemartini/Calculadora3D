import { Extension, Mark, mergeAttributes } from "@tiptap/core"
import { Highlight } from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import TaskItem from "@tiptap/extension-task-item"
import TaskList from "@tiptap/extension-task-list"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyleKit } from "@tiptap/extension-text-style"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"

const NoteCommentMark = Mark.create({
  name: "noteComment",
  inclusive: false,
  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-note-comment"),
        renderHTML: (attributes) =>
          attributes.commentId ? { "data-note-comment": attributes.commentId } : {},
      },
    }
  },
  parseHTML() {
    return [{ tag: "span[data-note-comment]" }]
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "note-comment-mark" }), 0]
  },
})

const Indentation = Extension.create({
  name: "noteIndentation",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading", "listItem"],
        attributes: {
          indentLevel: {
            default: 0,
            parseHTML: (element) => Number(element.getAttribute("data-indent-level") || 0),
            renderHTML: (attributes) => {
              const level = Math.min(6, Math.max(0, Number(attributes.indentLevel) || 0))
              const styles = level ? [`margin-inline-start: ${level * 1.5}rem`] : []
              if (["0", "0.5", "1", "1.5"].includes(String(attributes.paragraphSpacing))) {
                styles.push(`margin-block-end: ${attributes.paragraphSpacing}em`)
              }
              return {
                ...(level ? { "data-indent-level": level } : {}),
                ...(styles.length ? { style: styles.join("; ") } : {}),
              }
            },
          },
          paragraphSpacing: {
            default: null,
            parseHTML: (element) => {
              const match = element.style.marginBlockEnd.match(/^(0|0\.5|1|1\.5)em$/)
              return match?.[1] ?? null
            },
            renderHTML: () => ({}),
          },
        },
      },
    ]
  },
})

export const noteEditorExtensions = [
  StarterKit.configure({ link: false, underline: false }),
  TextStyleKit.configure({ lineHeight: { types: ["paragraph", "heading"] } }),
  Underline,
  Link.configure({ openOnClick: false, autolink: true }),
  Highlight.configure({ multicolor: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Image.configure({
    allowBase64: false,
    inline: false,
    resize: { enabled: true, minWidth: 80, directions: ["right"], alwaysPreserveAspectRatio: true },
  }),
  Placeholder.configure({ placeholder: "Escreva sua nota aqui..." }),
  NoteCommentMark,
  Indentation,
]
