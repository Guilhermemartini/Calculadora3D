import { AppShell } from '@/components/app-shell'
import { ShortcutManager } from '@/components/shortcut-manager'

export default function AtalhosPage() {
  return <AppShell><main className="min-h-svh"><header className="border-b border-border bg-card/50"><div className="mx-auto max-w-5xl px-4 py-6 sm:px-6"><h1 className="text-lg font-semibold">Atalhos</h1><p className="text-sm text-muted-foreground">Links úteis para o seu fluxo de trabalho.</p></div></header><div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8"><ShortcutManager /></div></main></AppShell>
}
