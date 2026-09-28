import { AppShell } from "@/components/app-shell"
import { BudgetManager } from "@/components/budget-manager"

export default function OrcamentosPage() {
  return (
    <AppShell>
      <main className="min-h-svh px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">Orçamentos</h1>
            <p className="mt-1 text-sm text-muted-foreground">Consulte, edite e gerencie seus orçamentos salvos.</p>
          </div>
          <BudgetManager />
        </div>
      </main>
    </AppShell>
  )
}
