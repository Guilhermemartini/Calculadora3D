import { MATERIALS } from "@/lib/calc"

export type Filament = {
  id: string
  name: string
  color: string
  material: string
  totalWeight: number // gramas
  currentWeight: number // gramas restantes
  rollPrice: number // valor do rolo (R$)
}

export const FILAMENT_MATERIALS = MATERIALS

export const FILAMENTS_KEY = "print3d:filaments"

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function remainingPercent(f: Pick<Filament, "totalWeight" | "currentWeight">): number {
  if (!f.totalWeight || f.totalWeight <= 0) return 0
  const pct = (f.currentWeight / f.totalWeight) * 100
  return Math.max(0, Math.min(100, pct))
}

export function formatGrams(g: number): string {
  return g.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
}
