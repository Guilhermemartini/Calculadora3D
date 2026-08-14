export type Finishing = "none" | "sanding" | "painting" | "both"
export type Urgency = "normal" | "urgent" | "veryUrgent"
export type DiscountType = "brl" | "percent"

export interface AdvancedParams {
  hourlyRate: number // R$/h (impressora + energia)
  profitMargin: number // %
  sandingCost: number // R$
  paintingCost: number // R$
  urgency: {
    normal: number // %
    urgent: number // %
    veryUrgent: number // %
  }
}

export interface CalculatorInput {
  filamentOnly: boolean
  weight: number // g (por peça)
  hours: number
  minutes: number
  material: string
  filamentPricePerKg: number // R$/kg
  quantity: number
  finishing: Finishing
  urgency: Urgency
  discountValue: number
  discountType: DiscountType
}

export interface CalculationResult {
  pricePerGram: number
  weightTotal: number
  timePerPieceMinutes: number
  timeTotalMinutes: number
  filamentCost: number
  printerCost: number
  finishingCost: number
  subtotal: number
  profit: number
  urgencyAmount: number
  discountAmount: number
  final: number
  finalPerPiece: number
}

export const DEFAULT_PARAMS: AdvancedParams = {
  hourlyRate: 4,
  profitMargin: 40,
  sandingCost: 10,
  paintingCost: 20,
  urgency: {
    normal: 0,
    urgent: 20,
    veryUrgent: 50,
  },
}

function finishingPerPiece(finishing: Finishing, params: AdvancedParams): number {
  switch (finishing) {
    case "sanding":
      return params.sandingCost
    case "painting":
      return params.paintingCost
    case "both":
      return params.sandingCost + params.paintingCost
    default:
      return 0
  }
}

export function calculate(input: CalculatorInput, params: AdvancedParams): CalculationResult {
  const qty = Math.max(1, input.quantity || 0)
  const weight = Math.max(0, input.weight || 0)

  // 1. Custo por grama
  const pricePerGram = (input.filamentPricePerKg || 0) / 1000
  // 2. Custo total do filamento (por peça)
  const filamentCostPerPiece = weight * pricePerGram
  // 3. Multiplicar pela quantidade
  const filamentCost = filamentCostPerPiece * qty

  const weightTotal = weight * qty
  const timePerPieceMinutes = (input.hours || 0) * 60 + (input.minutes || 0)
  const timeTotalMinutes = timePerPieceMinutes * qty

  if (input.filamentOnly) {
    return {
      pricePerGram,
      weightTotal,
      timePerPieceMinutes,
      timeTotalMinutes,
      filamentCost,
      printerCost: 0,
      finishingCost: 0,
      subtotal: filamentCost,
      profit: 0,
      urgencyAmount: 0,
      discountAmount: 0,
      final: filamentCost,
      finalPerPiece: qty > 0 ? filamentCost / qty : 0,
    }
  }

  // 4. Custo impressora + energia
  const printerCost = (timeTotalMinutes / 60) * (params.hourlyRate || 0)
  // 5. Acabamento
  const finishingCost = finishingPerPiece(input.finishing, params) * qty
  // 6. Subtotal
  const subtotal = filamentCost + printerCost + finishingCost
  // 7. Margem de lucro
  const profit = subtotal * ((params.profitMargin || 0) / 100)
  const afterProfit = subtotal + profit
  // 8. Urgência
  const urgencyPercent = params.urgency[input.urgency] || 0
  const urgencyAmount = afterProfit * (urgencyPercent / 100)
  const afterUrgency = afterProfit + urgencyAmount
  // 9. Desconto
  let discountAmount = 0
  if (input.discountValue > 0) {
    discountAmount =
      input.discountType === "percent"
        ? afterUrgency * (input.discountValue / 100)
        : input.discountValue
  }
  // 10. Valor final
  const final = Math.max(0, afterUrgency - discountAmount)

  return {
    pricePerGram,
    weightTotal,
    timePerPieceMinutes,
    timeTotalMinutes,
    filamentCost,
    printerCost,
    finishingCost,
    subtotal,
    profit,
    urgencyAmount,
    discountAmount,
    final,
    finalPerPiece: qty > 0 ? final / qty : 0,
  }
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0)
}

export function formatTime(totalMinutes: number): string {
  const minutes = Math.round(totalMinutes)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

export const MATERIALS = ["PLA", "PETG", "ABS", "TPU", "ASA", "Outro"] as const

export const FINISHING_LABELS: Record<Finishing, string> = {
  none: "Nenhum",
  sanding: "Lixar",
  painting: "Pintar",
  both: "Lixar e Pintar",
}

export const URGENCY_LABELS: Record<Urgency, string> = {
  normal: "Normal",
  urgent: "Urgente",
  veryUrgent: "Muito urgente",
}
