"use client"

import { getCalculatorSettings, saveCalculatorSettings, type CalculatorSettings } from "@/app/actions/settings"
import { saveBudget, type Budget } from "@/app/actions/budgets"
import { AdvancedParamsSection } from "@/components/advanced-params"
import { Field, NumberInput, Select, Switch } from "@/components/form-controls"
import { QuoteDialog } from "@/components/quote-dialog"
import { SummaryPanel } from "@/components/summary-panel"
import { Button } from "@/components/ui/button"
import { createBudgetSnapshot, readBudgetCalculatorData } from "@/lib/budget-snapshot"
import { upload as uploadToBlob } from "@vercel/blob/client"
import {
  type AdvancedParams,
  type CalculatorInput,
  type AdditionalCosts,
  DEFAULT_PARAMS,
  FINISHING_LABELS,
  type Finishing,
  MATERIALS,
  URGENCY_LABELS,
  type Urgency,
  calculate,
} from "@/lib/calc"
import { Box, Clock, FileText, Package } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

const DEFAULT_INPUT: CalculatorInput = {
  filamentOnly: false,
  weight: 20,
  hours: 1,
  minutes: 30,
  material: "PLA",
  filamentPricePerKg: 100,
  quantity: 1,
  finishing: "none",
  additionalCosts: "none",
  urgency: "normal",
  discountValue: 0,
  discountType: "brl",
  freightEnabled: false,
  freightOrigin: "",
  freightDestination: "",
  freightDistanceKm: 0,
  vehicle: "car",
}

function settingsFromParams(params: AdvancedParams): CalculatorSettings {
  return {
    hourlyRate: params.hourlyRate,
    profitMargin: params.profitMargin,
    sandingCost: params.sandingCost,
    paintingCost: params.paintingCost,
    urgencyNormal: params.urgency.normal,
    urgencyUrgent: params.urgency.urgent,
    urgencyVeryUrgent: params.urgency.veryUrgent,
    packagingQuantity: params.packagingQuantity,
    packagingTotalCost: params.packagingTotalCost,
    accessoryQuantity: params.accessoryQuantity,
    accessoryTotalCost: params.accessoryTotalCost,
    roundFinalValue: params.roundFinalValue,
  }
}

function paramsFromSettings(settings: CalculatorSettings): AdvancedParams {
  return {
    ...DEFAULT_PARAMS,
    hourlyRate: settings.hourlyRate,
    profitMargin: settings.profitMargin,
    sandingCost: settings.sandingCost,
    paintingCost: settings.paintingCost,
    packagingQuantity: settings.packagingQuantity,
    packagingTotalCost: settings.packagingTotalCost,
    accessoryQuantity: settings.accessoryQuantity,
    accessoryTotalCost: settings.accessoryTotalCost,
    roundFinalValue: settings.roundFinalValue,
    urgency: {
      normal: settings.urgencyNormal,
      urgent: settings.urgencyUrgent,
      veryUrgent: settings.urgencyVeryUrgent,
    },
  }
}

function sameSettings(left: CalculatorSettings | null, right: CalculatorSettings) {
  return left !== null && JSON.stringify(left) === JSON.stringify(right)
}

export function PricingCalculator({ userId, initialBudget }: { userId: string; initialBudget: Budget | null }) {
  const initialCalculatorData = useMemo(
    () => readBudgetCalculatorData(initialBudget?.snapshotData ?? null),
    [initialBudget?.snapshotData],
  )
  const initialInput: CalculatorInput = initialCalculatorData?.input ?? (initialBudget ? {
    ...DEFAULT_INPUT,
    weight: initialBudget.weight,
    hours: initialBudget.hours,
    minutes: initialBudget.minutes,
    freightEnabled: initialBudget.freightEnabled,
    freightOrigin: initialBudget.origin ?? "",
    freightDestination: initialBudget.destination ?? "",
    freightDistanceKm: initialBudget.distanceKm,
    vehicle: initialBudget.vehicle === "motorcycle" ? "motorcycle" : "car",
  } : DEFAULT_INPUT)
  const [input, setInput] = useState<CalculatorInput>(initialInput)
  const [params, setParams] = useState<AdvancedParams>(initialCalculatorData?.params ?? DEFAULT_PARAMS)
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading")
  const [savedSettings, setSavedSettings] = useState<CalculatorSettings | null>(null)
  const [savingSnapshot, setSavingSnapshot] = useState<CalculatorSettings | null>(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle")
  const savingSettingsRef = useRef(false)
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [budgetName, setBudgetName] = useState(initialBudget?.name ?? "")
  const [stlFile, setStlFile] = useState<File | null>(null)
  const [stlUploadProgress, setStlUploadProgress] = useState<number | null>(null)
  const [budgetError, setBudgetError] = useState("")
  const [savingBudget, setSavingBudget] = useState(false)
  const [budgetSaved, setBudgetSaved] = useState(false)

  const loadSettings = useCallback(async () => {
    setLoadState("loading")
    setSavedSettings(null)
    setSaveState("idle")
    try {
      const result = await getCalculatorSettings()
      const settings = result.exists ? result.settings : settingsFromParams(DEFAULT_PARAMS)
      if (!initialCalculatorData) setParams(paramsFromSettings(settings))
      setSavedSettings(settings)
      setLoadState("ready")
    } catch {
      setLoadState("error")
    }
  }, [initialCalculatorData])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const dirty = loadState === "ready" && !sameSettings(savedSettings, settingsFromParams(params))
  const changedDuringSave = savingSettings && !sameSettings(savingSnapshot, settingsFromParams(params))

  function updateParams(next: AdvancedParams) {
    setParams(next)
    setSaveState((current) => current === "saved" || current === "error" ? "idle" : current)
  }

  async function handleSaveSettings() {
    if (loadState !== "ready" || !dirty || savingSettingsRef.current) return
    const submitted = settingsFromParams(params)
    savingSettingsRef.current = true
    setSavingSnapshot(submitted)
    setSavingSettings(true)
    setSaveState("idle")
    try {
      await saveCalculatorSettings(submitted)
      setSavedSettings(submitted)
      setSaveState("saved")
    } catch {
      setSaveState("error")
    } finally {
      savingSettingsRef.current = false
      setSavingSnapshot(null)
      setSavingSettings(false)
    }
  }

  const calculationInput = useMemo(
    () => ({
      ...input,
      freightEnabled: params.freightEnabled,
      freightOrigin: params.freightOrigin,
      freightDestination: params.freightDestination,
      freightDistanceKm: params.freightDistanceKm,
      vehicle: params.vehicle,
    }),
    [input, params.freightEnabled, params.freightOrigin, params.freightDestination, params.freightDistanceKm, params.vehicle],
  )

  const result = useMemo(() => calculate(calculationInput, params), [calculationInput, params])

  const set = <K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) =>
    setInput((prev) => ({ ...prev, [key]: value }))

  const filamentOnly = input.filamentOnly

  async function handleSaveBudget() {
    if (!budgetName.trim() || savingBudget) return
    if (stlFile && !stlFile.name.toLowerCase().endsWith(".stl")) {
      setBudgetError("Selecione um arquivo com extensão .stl.")
      return
    }
    if (stlFile && stlFile.size > 50_000_000) {
      setBudgetError("O arquivo STL deve ter no máximo 50.000.000 bytes (50 MB).")
      return
    }
    setSavingBudget(true)
    setBudgetError("")
    const id = initialBudget?.id ?? crypto.randomUUID()
    let uploadedPathname = ""
    try {
      let stlFileData: string | null = initialBudget?.stlFileData ?? null
      if (stlFile) {
        setStlUploadProgress(0)
        const safeFilename = stlFile.name.replace(/[\\/\\r\\n]/g, "_")
        const blob = await uploadToBlob(`budgets/${userId}/pending/${id}/${safeFilename}`, stlFile, {
          access: "public",
          handleUploadUrl: "/api/budgets-stl/upload",
          clientPayload: JSON.stringify({ budgetId: id, originalFilename: stlFile.name }),
          contentType: "model/stl",
          multipart: true,
          onUploadProgress: ({ percentage }) => setStlUploadProgress(percentage),
        })
        uploadedPathname = blob.pathname
        stlFileData = blob.pathname
      }
      const snapshot = createBudgetSnapshot(budgetName.trim(), { input: calculationInput, params })
      await saveBudget({
        id, name: budgetName.trim(), stlFileName: stlFile?.name ?? initialBudget?.stlFileName ?? null, stlFileData, snapshotData: snapshot,
        weight: input.weight, hours: input.hours, minutes: input.minutes, printValue: result.final,
        finishes: [{ name: FINISHING_LABELS[input.finishing], value: result.finishingCost }, { name: "Embalagem", value: result.packagingCost }, { name: "Acessório", value: result.accessoryCost }].filter((item) => item.value > 0),
        freightEnabled: calculationInput.freightEnabled, origin: calculationInput.freightOrigin || null, destination: calculationInput.freightDestination || null, distanceKm: calculationInput.freightDistanceKm, vehicle: calculationInput.vehicle, freightValue: result.freightCost, totalValue: result.final,
      })
      setBudgetSaved(true)
      window.setTimeout(() => setBudgetSaved(false), 2500)
    } catch (error) {
      if (uploadedPathname) await fetch("/api/budgets-stl/upload", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pathname: uploadedPathname }) }).catch(() => undefined)
      setBudgetError(error instanceof Error ? error.message : "Não foi possível salvar o orçamento.")
    } finally {
      setSavingBudget(false)
      setStlUploadProgress(null)
    }
  }

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
            <Field label="Custos adicionais">
              <Select
                value={input.additionalCosts}
                onChange={(v) => set("additionalCosts", v as AdditionalCosts)}
                disabled={filamentOnly}
                options={[
                  { value: "none", label: "Nenhum" },
                  { value: "packaging", label: "Embalagem" },
                  { value: "accessory", label: "Acessório" },
                  { value: "both", label: "Embalagem e Acessório" },
                ]}
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

        <section className="rounded-2xl border border-border bg-card px-5 py-5 text-card-foreground shadow-sm">
          <div className="mb-4 flex items-center gap-2.5"><FileText className="size-4 text-primary" /><h2 className="text-base font-semibold">{initialBudget ? "Editar orçamento" : "Salvar orçamento"}</h2></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do orçamento" htmlFor="budget-name"><input id="budget-name" value={budgetName} onChange={(e) => setBudgetName(e.target.value)} placeholder="Ex.: Suporte de parede" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-3 focus:ring-ring/40" /></Field>
            <Field label="Modelo STL" htmlFor="budget-stl"><input id="budget-stl" type="file" accept=".stl,model/stl" onChange={(event) => { const file = event.target.files?.[0] ?? null; setBudgetError(""); if (file && !file.name.toLowerCase().endsWith(".stl")) { setBudgetError("Selecione um arquivo com extensão .stl."); event.currentTarget.value = ""; setStlFile(null); return } setStlFile(file) }} className="h-10 w-full cursor-pointer rounded-xl border border-input bg-background px-3 py-2 text-sm" /><span className="mt-1 block truncate text-xs text-muted-foreground">{stlUploadProgress !== null ? `Enviando STL: ${Math.round(stlUploadProgress)}%` : stlFile?.name ?? initialBudget?.stlFileName ?? "Opcional · até 50 MB"}</span></Field>
          </div>
          {budgetError ? <p role="alert" className="mt-3 text-sm text-destructive">{budgetError}</p> : null}
        </section>

        <AdvancedParamsSection
          params={params}
          onChange={updateParams}
          onReset={() => updateParams(DEFAULT_PARAMS)}
          onSave={() => void handleSaveSettings()}
          onRetry={() => void loadSettings()}
          loadState={loadState}
          saving={savingSettings}
          dirty={dirty}
          changedDuringSave={changedDuringSave}
          saveState={saveState}
        />

        </div>

      {/* Resumo (fixo em telas grandes) */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <div className="flex flex-col gap-4">
          <SummaryPanel input={calculationInput} result={result} />
          <Button size="lg" className="h-11 w-full text-sm" onClick={handleSaveBudget} disabled={!budgetName.trim() || savingBudget || loadState !== "ready"}>
            <FileText />
            {savingBudget ? "Salvando..." : budgetSaved ? (initialBudget ? "Orçamento atualizado" : "Orçamento salvo") : (initialBudget ? "Salvar alterações" : "Salvar orçamento")}
          </Button>
          <Button variant="outline" size="lg" className="h-11 w-full text-sm" onClick={() => setQuoteOpen(true)} disabled={loadState !== "ready"}>
            Gerar orçamento em PDF
          </Button>
        </div>
      </div>

      <QuoteDialog
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        input={calculationInput}
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
