import { LoginForm } from "@/components/login-form"

function safeReturnTo(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/"
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; reason?: string }>
}) {
  const params = await searchParams
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-lg sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <span aria-hidden="true" className="text-xl font-bold">3D</span>
          </div>
          <div>
            <p className="font-semibold">Calculadora 3D</p>
            <p className="text-sm text-muted-foreground">Entre para acessar seu espaço de trabalho</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Use a conta criada para você. O cadastro público está desativado.
        </p>
        {params.reason === "session-expired" ? (
          <p role="status" className="mt-4 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            Sua sessão expirou. Entre novamente para continuar.
          </p>
        ) : null}
        <LoginForm returnTo={safeReturnTo(params.returnTo)} />
      </section>
    </main>
  )
}
