import type { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    default: "Notas | Precificação 3D",
    template: "%s | Precificação 3D",
  },
  description: "Organize ideias, tarefas e lembretes em notas pessoais da Precificação 3D.",
}

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return children
}
