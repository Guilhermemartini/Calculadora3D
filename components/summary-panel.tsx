"use client"

import {
  type CalculationResult,
  type CalculatorInput,
  FINISHING_LABELS,
  URGENCY_LABELS,
  formatBRL,
  formatTime,
} from "@/lib/calc"
import { cn } from "@/lib/utils"

function Row({
  label,
  value,
  muted,
  strong,
  negative,
}: {
  label: string
  value: string
  muted?: boolean
  strong?: boolean
  negative?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className={cn("text-muted-foreground", strong && "text-foreground font-medium")}>
        {label}
      </span>
      <span
        className={cn(
          "font-medium tabular-nums text-foreground",
          muted && "text-muted-foreground",
          negative && "text-primary",
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function SummaryPanel({
  input,
  result,
}: {
  input: CalculatorInput
  result: CalculationResult
}) {
  const filamentOnly = input.filamentOnly

  return (
    <div className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold">Resumo do cálculo</h2>
        {filamentOnly ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            Apenas filamento
          </span>
        ) : null}
      </div>

      <div className="divide-y divide-border px-5">
        <div className="py-2">
          <Row label="Material" value={input.material} />
          <Row label="Peso por peça" value={`${(input.weight || 0).toLocaleString("pt-BR")} g`} />
          <Row label="Peso total" value={`${result.weightTotal.toLocaleString("pt-BR")} g`} />
          <Row label="Tempo por peça" value={formatTime(result.timePerPieceMinutes)} />
          <Row label="Tempo total" value={formatTime(result.timeTotalMinutes)} />
        </div>

        <div className="py-2">
          <Row label="Valor do filamento" value={formatBRL(result.filamentCost)} />
          <Row
            label="Impressora + energia"
            value={filamentOnly ? "—" : formatBRL(result.printerCost)}
            muted={filamentOnly}
          />
          <Row
            label="Acabamento"
            value={filamentOnly ? "—" : formatBRL(result.finishingCost)}
            muted={filamentOnly}
          />
          <Row
            label="Embalagem"
            value={filamentOnly ? "—" : formatBRL(result.packagingCost)}
            muted={filamentOnly}
          />
          <Row
            label="Acessório"
            value={filamentOnly ? "—" : formatBRL(result.accessoryCost)}
            muted={filamentOnly}
          />
        </div>

        <div className="py-2">
          <Row label="Subtotal" value={formatBRL(result.subtotal)} strong />
          <Row label="Lucro" value={filamentOnly ? "—" : formatBRL(result.profit)} muted={filamentOnly} />
          <Row
            label="Urgência"
            value={filamentOnly ? "—" : formatBRL(result.urgencyAmount)}
            muted={filamentOnly}
          />
          <Row
            label="Desconto"
            value={
              filamentOnly || result.discountAmount === 0
                ? filamentOnly
                  ? "—"
                  : formatBRL(0)
                : `- ${formatBRL(result.discountAmount)}`
            }
            muted={filamentOnly}
            negative={!filamentOnly && result.discountAmount > 0}
          />
        </div>
      </div>

      <div className="m-3 rounded-xl bg-primary px-5 py-4 text-primary-foreground">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium opacity-90">Valor final</span>
          <span className="text-2xl font-bold tabular-nums">{formatBRL(result.final)}</span>
        </div>
        {input.quantity > 1 ? (
          <div className="mt-1 flex items-center justify-between text-xs opacity-80">
            <span>
              {input.quantity}× · {FINISHING_LABELS[input.finishing]}
              {!filamentOnly ? ` · ${URGENCY_LABELS[input.urgency]}` : ""}
            </span>
            <span className="tabular-nums">{formatBRL(result.finalPerPiece)} / peça</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
