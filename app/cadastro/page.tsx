import Link from "next/link"
import type { Metadata } from "next"
import { SignupForm } from "@/components/signup-form"

export const metadata: Metadata = {
  title: "Criar conta | Calculadora de Precificação 3D",
  description: "Crie sua conta na Calculadora de Precificação 3D.",
}

export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-card-foreground shadow-lg sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <span aria-hidden="true" className="text-xl font-bold">3D</span>
          </div>
          <div>
            <p className="font-semibold">Calculadora 3D</p>
            <p className="text-sm text-muted-foreground">Crie seu acesso</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          O cadastro cria sua conta. O acesso aos registros da calculadora depende de aprovação de um responsável.
        </p>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </section>
    </main>
  )
}
