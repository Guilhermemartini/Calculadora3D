"use client"

import { authClient } from "@/lib/auth-client"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function LoginForm({ returnTo }: { returnTo: string }) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError("")
    try {
      const result = await authClient.signIn.email({ email: email.trim(), password })
      if (result.error) {
        setError("Não foi possível entrar. Confira o e-mail e a senha.")
        return
      }
      router.replace(returnTo)
      router.refresh()
    } catch {
      setError("Não foi possível entrar agora. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        E-mail
        <input
          autoComplete="username"
          type="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Senha
        <span className="relative">
          <input
            autoComplete="current-password"
            type={showPassword ? "text" : "password"}
            minLength={12}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-xl border border-input bg-background px-3 pr-11 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
          />
          <button
            type="button"
            aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
          >
            {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
          </button>
        </span>
      </label>
      {error ? <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Entrando...
          </span>
        ) : "Entrar"}
      </button>
    </form>
  )
}
