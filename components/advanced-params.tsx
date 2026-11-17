"use client"

import { Field, NumberInput, Switch } from "@/components/form-controls"
import type { AdvancedParams } from "@/lib/calc"
import { cn } from "@/lib/utils"
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react"
import { useState } from "react"

export function AdvancedParamsSection({
  params,
  onChange,
  onReset,
  onSave,
  onRetry,
  loadState,
  saving,
  dirty,
  changedDuringSave,
  saveState,
}: {
  params: AdvancedParams
  onChange: (p: AdvancedParams) => void
  onReset: () => void
  onSave: () => void
  onRetry: () => void
  loadState: "loading" | "ready" | "error"
  saving: boolean
  dirty: boolean
  changedDuringSave: boolean
  saveState: "idle" | "saved" | "error"
}) {
  const [open, setOpen] = useState(false)
  const disabled = loadState !== "ready"

  const set = (patch: Partial<AdvancedParams>) => onChange({ ...params, ...patch })
  const setUrgency = (patch: Partial<AdvancedParams["urgency"]>) =>
    onChange({ ...params, urgency: { ...params.urgency, ...patch } })

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <SlidersHorizontal className="size-4 text-primary" />
          <span className="text-base font-semibold">Parâmetros avançados</span>
          <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {loadState === "loading" ? (
          <p role="status" className="text-sm text-muted-foreground">Carregando parâmetros...</p>
        ) : null}
        {loadState === "error" ? (
          <div className="flex flex-wrap items-center gap-2">
            <p role="alert" className="text-sm text-destructive">Não foi possível carregar os parâmetros.</p>
            <button type="button" onClick={onRetry} className="text-sm font-medium text-primary underline underline-offset-4">
              Tentar novamente
            </button>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="border-t border-border px-5 py-5">
          {loadState === "loading" ? <p role="status" className="mb-4 text-sm text-muted-foreground">Aguarde a leitura das configurações antes de editar.</p> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Valor da hora (impressora + energia)">
              <NumberInput
                value={params.hourlyRate}
                onChange={(v) => set({ hourlyRate: v })}
                prefix="R$"
                step={0.5}
                disabled={disabled}
              />
            </Field>
            <Field label="Margem de lucro">
              <NumberInput
                value={params.profitMargin}
                onChange={(v) => set({ profitMargin: v })}
                suffix="%"
                disabled={disabled}
              />
            </Field>
            <Field label="Valor para lixar">
              <NumberInput value={params.sandingCost} onChange={(v) => set({ sandingCost: v })} prefix="R$" disabled={disabled} />
            </Field>
            <Field label="Valor para pintar">
              <NumberInput value={params.paintingCost} onChange={(v) => set({ paintingCost: v })} prefix="R$" disabled={disabled} />
            </Field>
            <Field label="Quantidade de embalagens">
              <NumberInput value={params.packagingQuantity} onChange={(v) => set({ packagingQuantity: v })} suffix="un." min={0} disabled={disabled} />
            </Field>
            <Field label="Valor da embalagem">
              <NumberInput value={params.packagingTotalCost} onChange={(v) => set({ packagingTotalCost: v })} prefix="R$" min={0} disabled={disabled} />
            </Field>
            <Field label="Quantidade de acessórios">
              <NumberInput value={params.accessoryQuantity} onChange={(v) => set({ accessoryQuantity: v })} suffix="un." min={0} disabled={disabled} />
            </Field>
            <Field label="Valor dos acessórios">
              <NumberInput value={params.accessoryTotalCost} onChange={(v) => set({ accessoryTotalCost: v })} prefix="R$" min={0} disabled={disabled} />
            </Field>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              Custo por embalagem: <strong className="text-foreground">R$ {(params.packagingQuantity > 0 ? params.packagingTotalCost / params.packagingQuantity : 0).toFixed(2).replace(".", ",")}</strong>
            </div>
            <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              Custo por acessório: <strong className="text-foreground">R$ {(params.accessoryQuantity > 0 ? params.accessoryTotalCost / params.accessoryQuantity : 0).toFixed(2).replace(".", ",")}</strong>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Arredondar valor</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Arredonda o valor final para cima até o próximo número inteiro.
              </p>
            </div>
            <Switch
              id="round-final-value"
              aria-label="Arredondar valor"
              checked={params.roundFinalValue}
              onChange={(v) => set({ roundFinalValue: v })}
              disabled={disabled}
            />
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-foreground/90">Percentuais de urgência</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Normal">
                <NumberInput
                  value={params.urgency.normal}
                  onChange={(v) => setUrgency({ normal: v })}
                  suffix="%"
                  disabled={disabled}
                />
              </Field>
              <Field label="Urgente">
                <NumberInput
                  value={params.urgency.urgent}
                  onChange={(v) => setUrgency({ urgent: v })}
                  suffix="%"
                  disabled={disabled}
                />
              </Field>
              <Field label="Muito urgente">
                <NumberInput
                  value={params.urgency.veryUrgent}
                  onChange={(v) => setUrgency({ veryUrgent: v })}
                  suffix="%"
                  disabled={disabled}
                />
              </Field>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            disabled={disabled}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Restaurar valores padrão
          </button>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div aria-live="polite" className="text-sm">
              {loadState === "ready" && dirty && !saving ? <p className="text-amber-700 dark:text-amber-400">Há alterações pendentes.</p> : null}
              {loadState === "ready" && saving ? <p className="text-muted-foreground">Salvando parâmetros...</p> : null}
              {loadState === "ready" && !saving && saveState === "saved" && !dirty ? <p className="text-emerald-700 dark:text-emerald-400">Parâmetros salvos.</p> : null}
              {loadState === "ready" && !saving && saveState === "error" ? <p role="alert" className="text-destructive">Não foi possível salvar. Seus valores foram mantidos; tente novamente.</p> : null}
              {loadState === "ready" && saving && changedDuringSave ? <p className="text-amber-700 dark:text-amber-400">A edição mais recente ficará pendente após esta gravação.</p> : null}
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={disabled || saving || !dirty}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar parâmetros"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
