"use client"

import { AdvancedParamsSection } from "@/components/advanced-params"
import { Field, NumberInput, Select, Switch } from "@/components/form-controls"
import { QuoteDialog } from "@/components/quote-dialog"
import { SummaryPanel } from "@/components/summary-panel"
import { Button } from "@/components/ui/button"
import {
  type AdvancedParams,
  type CalculatorInput,
  DEFAULT_PARAMS,
  FINISHING_LABELS,
  type Finishing,
  MATERIALS,
  URGENCY_LABELS,
  type Urgency,
  calculate,
} from "@/lib/calc"
import { Box, Clock, FileText, Package } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

const PARAMS_KEY = "print3d:params"

const DEFAULT_INPUT: CalculatorInput = {
  filamentOnly: false,
  weight: 20,
  hours: 1,
  minutes: 30,
  material: "PLA",
  filamentPricePerKg: 100,
  quantity: 1,
  finishing: "none",
  urgency: "normal",
  discountValue: 0,
  discountType: "brl",
}

export function PricingCalculator() {
  const [input, setInput] = useState<CalculatorInput>(DEFAULT_INPUT)
  const [params, setParams] = useState<AdvancedParams>(DEFAULT_PARAMS)
  const [loaded, setLoaded] = useState(false)
  const [quoteOpen, setQuoteOpen] = useState(false)

  // Carrega parâmetros salvos do navegador
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PARAMS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setParams({ ...DEFAULT_PARAMS, ...parsed, urgency: { ...DEFAULT_PARAMS.urgency, ...parsed.urgency } })
      }
    } catch {
      // ignora
    }
    setLoaded(true)
  }, [])

  // Salva parâmetros automaticamente
  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(PARAMS_KEY, JSON.stringify(params))
    } catch {
      // ignora
    }
  }, [params, loaded])

  const result = useMemo(() => calculate(input, params), [input, params])

  const set = <K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  const filamentOnly = input.filamentOnly

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Formulário */}
      <div className="flex flex-col gap-6">
        {/* Cobrar apenas filamento */}
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-card-foreground shadow-sm">
          <div className="flex flex-col gap-0.5">
            <label htmlFor="filament-only" className="text-sm font-semibold">
              Cobrar apenas filamento
            </label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Considera somente o custo do filamento, ignorando mão de obra, energia, acabamento, lucro,
              urgência e desconto.
            </p>
          </div>
          <Switch
            id="filament-only"
            checked={input.filamentOnly}
            onChange={(v) => set("filamentOnly", v)}
          />
        </div>

        {/* Peça e material */}
        <section className="rounded-2xl border border-border bg-card px-5 py-5 text-card-foreground shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <Box className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Dados da peça</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Peso da peça" htmlFor="weight" hint="Peso de uma única peça.">
              <NumberInput
                id="weight"
                value={input.weight}
                onChange={(v) => set("weight", v)}
                suffix="g"
              />
            </Field>
            <Field label="Tipo de material" htmlFor="material" hint="Apenas informativo.">
              <Select
                id="material"
                value={input.material}
                onChange={(v) => set("material", v)}
                options={MATERIALS.map((m) => ({ value: m, label: m }))}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Tempo de impressão (por peça)">
              <div className="grid grid-cols-2 gap-3">
                <NumberInput value={input.hours} onChange={(v) => set("hours", v)} suffix="h" min={0} />
                <NumberInput
                  value={input.minutes}
                  onChange={(v) => set("minutes", v)}
                  suffix="min"
                  min={0}
                  max={59}
                />
              </div>
            </Field>
          </div>
        </section>

        {/* Custos */}
        <section className="rounded-2xl border border-border bg-card px-5 py-5 text-card-foreground shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <Package className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Filamento e quantidade</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Preço do filamento" htmlFor="filament-price" hint="Valor pago por 1 kg.">
              <NumberInput
                id="filament-price"
                value={input.filamentPricePerKg}
                onChange={(v) => set("filamentPricePerKg", v)}
                prefix="R$"
                suffix="/kg"
              />
            </Field>
            <Field label="Quantidade" htmlFor="quantity">
              <NumberInput
                id="quantity"
                value={input.quantity}
                onChange={(v) => set("quantity", Math.max(1, Math.round(v)))}
                min={1}
                step={1}
              />
            </Field>
          </div>
        </section>

        {/* Serviços - ocultado quando apenas filamento */}
        <section
          className={cnSection(filamentOnly)}
          aria-hidden={filamentOnly}
        >
          <div className="mb-4 flex items-center gap-2.5">
            <Clock className="size-4 text-primary" />
            <h2 className="text-base font-semibold">Serviços e ajustes</h2>
            {filamentOnly ? (
              <span className="ml-auto rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                Desativado
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Acabamento">
              <Select
                value={input.finishing}
                onChange={(v) => set("finishing", v as Finishing)}
                disabled={filamentOnly}
                options={(Object.keys(FINISHING_LABELS) as Finishing[]).map((f) => ({
                  value: f,
                  label: FINISHING_LABELS[f],
                }))}
              />
            </Field>
            <Field label="Urgência">
              <Select
                value={input.urgency}
                onChange={(v) => set("urgency", v as Urgency)}
                disabled={filamentOnly}
                options={(Object.keys(URGENCY_LABELS) as Urgency[]).map((u) => ({
                  value: u,
                  label: URGENCY_LABELS[u],
                }))}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Desconto">
              <div className="grid grid-cols-[1fr_140px] gap-3">
                <NumberInput
                  value={input.discountValue}
                  onChange={(v) => set("discountValue", v)}
                  disabled={filamentOnly}
                  prefix={input.discountType === "brl" ? "R$" : undefined}
                  suffix={input.discountType === "percent" ? "%" : undefined}
                />
                <Select
                  value={input.discountType}
                  onChange={(v) => set("discountType", v as CalculatorInput["discountType"])}
                  disabled={filamentOnly}
                  options={[
                    { value: "brl", label: "R$ (Reais)" },
                    { value: "percent", label: "% (Percentual)" },
                  ]}
                />
              </div>
            </Field>
          </div>
        </section>

        <AdvancedParamsSection
          params={params}
          onChange={setParams}
          onReset={() => setParams(DEFAULT_PARAMS)}
        />
      </div>

      {/* Resumo (fixo em telas grandes) */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="flex flex-col gap-4">
          <SummaryPanel input={input} result={result} />
          <Button size="lg" className="h-11 w-full text-sm" onClick={() => setQuoteOpen(true)}>
            <FileText />
            Gerar orçamento
          </Button>
        </div>
      </div>

      <QuoteDialog
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        input={input}
        result={result}
      />
    </div>
  )
}

function cnSection(disabled: boolean) {
  return [
    "rounded-2xl border border-border bg-card px-5 py-5 text-card-foreground shadow-sm transition-opacity",
    disabled ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ")
}
