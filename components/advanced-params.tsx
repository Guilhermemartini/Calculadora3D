"use client"

import { Field, NumberInput } from "@/components/form-controls"
import type { AdvancedParams } from "@/lib/calc"
import { cn } from "@/lib/utils"
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react"
import { useState } from "react"

export function AdvancedParamsSection({
  params,
  onChange,
  onReset,
}: {
  params: AdvancedParams
  onChange: (p: AdvancedParams) => void
  onReset: () => void
}) {
  const [open, setOpen] = useState(false)

  const set = (patch: Partial<AdvancedParams>) => onChange({ ...params, ...patch })
  const setUrgency = (patch: Partial<AdvancedParams["urgency"]>) =>
    onChange({ ...params, urgency: { ...params.urgency, ...patch } })

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40 rounded-2xl"
      >
        <span className="flex items-center gap-2.5">
          <SlidersHorizontal className="size-4 text-primary" />
          <span className="text-base font-semibold">Parâmetros avançados</span>
        </span>
        <ChevronDown className={cn("size-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="border-t border-border px-5 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Valor da hora (impressora + energia)">
              <NumberInput
                value={params.hourlyRate}
                onChange={(v) => set({ hourlyRate: v })}
                prefix="R$"
                step={0.5}
              />
            </Field>
            <Field label="Margem de lucro">
              <NumberInput
                value={params.profitMargin}
                onChange={(v) => set({ profitMargin: v })}
                suffix="%"
              />
            </Field>
            <Field label="Valor para lixar">
              <NumberInput value={params.sandingCost} onChange={(v) => set({ sandingCost: v })} prefix="R$" />
            </Field>
            <Field label="Valor para pintar">
              <NumberInput value={params.paintingCost} onChange={(v) => set({ paintingCost: v })} prefix="R$" />
            </Field>
            <Field label="Quantidade de embalagens">
              <NumberInput value={params.packagingQuantity} onChange={(v) => set({ packagingQuantity: v })} suffix="un." min={0} />
            </Field>
            <Field label="Valor total das embalagens">
              <NumberInput value={params.packagingTotalCost} onChange={(v) => set({ packagingTotalCost: v })} prefix="R$" min={0} />
            </Field>
            <Field label="Quantidade de acessórios">
              <NumberInput value={params.accessoryQuantity} onChange={(v) => set({ accessoryQuantity: v })} suffix="un." min={0} />
            </Field>
            <Field label="Valor total dos acessórios">
              <NumberInput value={params.accessoryTotalCost} onChange={(v) => set({ accessoryTotalCost: v })} prefix="R$" min={0} />
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

          <div className="mt-5">
            <p className="mb-2 text-sm font-medium text-foreground/90">Percentuais de urgência</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Normal">
                <NumberInput
                  value={params.urgency.normal}
                  onChange={(v) => setUrgency({ normal: v })}
                  suffix="%"
                />
              </Field>
              <Field label="Urgente">
                <NumberInput
                  value={params.urgency.urgent}
                  onChange={(v) => setUrgency({ urgent: v })}
                  suffix="%"
                />
              </Field>
              <Field label="Muito urgente">
                <NumberInput
                  value={params.urgency.veryUrgent}
                  onChange={(v) => setUrgency({ veryUrgent: v })}
                  suffix="%"
                />
              </Field>
            </div>
          </div>

          <button
            type="button"
            onClick={onReset}
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Restaurar valores padrão
          </button>
        </div>
      ) : null}
    </div>
  )
}
