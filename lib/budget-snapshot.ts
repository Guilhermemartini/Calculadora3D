import type { AdvancedParams, CalculatorInput } from "@/lib/calc"

export type BudgetCalculatorData = {
  input: CalculatorInput
  params: AdvancedParams
}

const calculatorDataMarker = "#calculator-data="

export function createBudgetSnapshot(name: string, data: BudgetCalculatorData): string {
  const safeName = name.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    }
    return entities[character]
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420"><rect width="100%" height="100%" fill="#171717"/><text x="50%" y="48%" text-anchor="middle" fill="#f97316" font-size="34" font-family="sans-serif">${safeName}</text><text x="50%" y="60%" text-anchor="middle" fill="#a3a3a3" font-size="18" font-family="sans-serif">Preview do modelo 3D</text></svg>`
  const serializedData = encodeURIComponent(JSON.stringify(data))
  return `data:image/svg+xml,${encodeURIComponent(svg)}${calculatorDataMarker}${serializedData}`
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

export function readBudgetCalculatorData(snapshotData: string | null): BudgetCalculatorData | null {
  if (!snapshotData) return null
  const markerIndex = snapshotData.indexOf(calculatorDataMarker)
  if (markerIndex < 0) return null

  try {
    const value = JSON.parse(decodeURIComponent(snapshotData.slice(markerIndex + calculatorDataMarker.length))) as {
      input?: Partial<CalculatorInput>
      params?: Partial<AdvancedParams> & { urgency?: Partial<AdvancedParams["urgency"]> }
    }
    const input = value.input
    const params = value.params
    if (!input || !params || !params.urgency) return null

    const inputNumbers = [input.weight, input.hours, input.minutes, input.filamentPricePerKg, input.quantity, input.discountValue, input.freightDistanceKm]
    const parameterNumbers = [params.hourlyRate, params.profitMargin, params.sandingCost, params.paintingCost, params.packagingQuantity, params.packagingTotalCost, params.accessoryQuantity, params.accessoryTotalCost, params.urgency.normal, params.urgency.urgent, params.urgency.veryUrgent]
    const validInput = inputNumbers.every(isNumber)
      && typeof input.filamentOnly === "boolean"
      && typeof input.material === "string"
      && ["none", "sanding", "painting", "both"].includes(input.finishing ?? "")
      && ["none", "packaging", "accessory", "both"].includes(input.additionalCosts ?? "")
      && ["normal", "urgent", "veryUrgent"].includes(input.urgency ?? "")
      && ["brl", "percent"].includes(input.discountType ?? "")
      && typeof input.freightEnabled === "boolean"
      && typeof input.freightOrigin === "string"
      && typeof input.freightDestination === "string"
      && ["car", "motorcycle"].includes(input.vehicle ?? "")
    const validParams = parameterNumbers.every(isNumber)
      && typeof params.roundFinalValue === "boolean"
      && typeof params.freightEnabled === "boolean"
      && typeof params.freightOrigin === "string"
      && typeof params.freightDestination === "string"
      && isNumber(params.freightDistanceKm)
      && ["car", "motorcycle"].includes(params.vehicle ?? "")

    if (!validInput || !validParams) return null
    return { input: input as CalculatorInput, params: params as AdvancedParams }
  } catch {
    return null
  }
}
