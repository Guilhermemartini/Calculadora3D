import { AppShell } from "@/components/app-shell"
import { FilamentStock } from "@/components/filament-stock"
import { Layers } from "lucide-react"

export default function EstoquePage() {
  return (
    <AppShell>
      <main className="min-h-svh">
        <header className="border-b border-border bg-card/50">
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5 sm:px-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Layers className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight text-balance">
                Estoque de Filamentos
              </h1>
              <p className="text-sm text-muted-foreground leading-tight">
                Controle de rolos e consumo
              </p>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <FilamentStock />
        </div>
      </main>
    </AppShell>
  )
}
