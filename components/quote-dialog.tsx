"use client"

import { Button } from "@/components/ui/button"
import {
  type CalculationResult,
  type CalculatorInput,
  FINISHING_LABELS,
  URGENCY_LABELS,
  formatBRL,
  formatTime,
} from "@/lib/calc"
import { generateQuotePDF } from "@/lib/pdf"
import { Check, Copy, FileDown, X } from "lucide-react"
import { useEffect, useState } from "react"

function buildQuoteText(input: CalculatorInput, result: CalculationResult): string {
  const lines = [
    "ORÇAMENTO - IMPRESSÃO 3D",
    "----------------------------------------",
    `Material:    ${input.material}`,
    `Peso total:  ${result.weightTotal.toLocaleString("pt-BR")} g`,
    `Tempo total: ${formatTime(result.timeTotalMinutes)}`,
    `Quantidade:  ${input.quantity} peça(s)`,
    `Acabamento:  ${FINISHING_LABELS[input.finishing]}`,
  ]
  if (!input.filamentOnly) {
    lines.push(`Urgência:    ${URGENCY_LABELS[input.urgency]}`)
  }
  lines.push("----------------------------------------")
  lines.push(`VALOR TOTAL: ${formatBRL(result.final)}`)
  return lines.join("\n")
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

export function QuoteDialog({
  open,
  onClose,
  input,
  result,
}: {
  open: boolean
  onClose: () => void
  input: CalculatorInput
  result: CalculationResult
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  if (!open) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildQuoteText(input, result))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Fechar"
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card text-card-foreground shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="quote-title" className="text-base font-semibold">
            Orçamento
          </h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
            <X />
          </Button>
        </div>

        <div className="px-5 py-2">
          <InfoRow label="Material" value={input.material} />
          <InfoRow label="Peso total" value={`${result.weightTotal.toLocaleString("pt-BR")} g`} />
          <InfoRow label="Tempo total" value={formatTime(result.timeTotalMinutes)} />
          <InfoRow label="Quantidade" value={`${input.quantity} peça(s)`} />
          <InfoRow label="Acabamento" value={FINISHING_LABELS[input.finishing]} />
          {!input.filamentOnly ? (
            <InfoRow label="Urgência" value={URGENCY_LABELS[input.urgency]} />
          ) : null}
        </div>

        <div className="mx-5 mb-5 mt-1 flex items-center justify-between rounded-xl bg-primary px-4 py-3 text-primary-foreground">
          <span className="text-sm font-medium opacity-90">Valor total</span>
          <span className="text-xl font-bold tabular-nums">{formatBRL(result.final)}</span>
        </div>

        <div className="flex flex-col gap-2 border-t border-border px-5 py-4">
          <Button className="w-full" onClick={() => generateQuotePDF(input, result)}>
            <FileDown />
            Baixar PDF
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Fechar
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleCopy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copiado!" : "Copiar texto"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
