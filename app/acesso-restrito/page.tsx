import Link from "next/link"

export default function RestrictedAccessPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 text-card-foreground shadow-lg sm:p-9">
        <p className="text-sm font-medium text-primary">Conta autenticada</p>
        <h1 className="mt-2 text-2xl font-semibold">Acesso aos dados pendente</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Esta conta ainda não recebeu acesso aos registros legados. Um responsável precisa confirmar a atribuição antes de liberar esses dados.
        </p>
        <Link href="/login" className="mt-6 inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-muted">
          Voltar ao login
        </Link>
      </section>
    </main>
  )
}
