"use client"

import { authClient } from "@/lib/auth-client"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function SignupForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    if (!name.trim()) {
      setError("Informe seu nome.")
      return
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    setPending(true)
    setError("")

    try {
      const result = await authClient.signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      })

      if (result.error) {
        setError("Não foi possível criar a conta. Confira os dados ou tente novamente.")
        return
      }

      router.replace("/login?reason=account-created")
      router.refresh()
    } catch {
      setError("Não foi possível criar a conta agora. Tente novamente.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Nome
        <input
          autoComplete="name"
          type="text"
          maxLength={100}
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        E-mail
        <input
          autoComplete="email"
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
            autoComplete="new-password"
            type={showPassword ? "text" : "password"}
            minLength={12}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby="signup-password-hint"
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
        <span id="signup-password-hint" className="text-xs font-normal text-muted-foreground">
          Use entre 12 e 128 caracteres.
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Confirmar senha
        <input
          autoComplete="new-password"
          type={showPassword ? "text" : "password"}
          minLength={12}
          maxLength={128}
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        />
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
            Criando conta...
          </span>
        ) : "Criar conta"}
      </button>
    </form>
  )
}
