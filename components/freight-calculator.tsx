"use client"

import { Button } from "@/components/ui/button"
import { Field, NumberInput, Select, TextInput } from "@/components/form-controls"
import { Route, Settings2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type Vehicle = "car" | "motorcycle"
type Coordinate = [number, number]
type RouteResult = { coordinates: Coordinate[]; distanceKm: number; durationMin: number }
const STORAGE_KEY = "calculadora3d-freight-preferences"
const DEFAULTS = { car: 10, motorcycle: 30, origin: "", fuelPrice: 6 }

export function FreightCalculator() {
  const [vehicle, setVehicle] = useState<Vehicle>("car")
  const [consumption, setConsumption] = useState(DEFAULTS.car)
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [fuelPrice, setFuelPrice] = useState(DEFAULTS.fuelPrice)
  const [editingConsumption, setEditingConsumption] = useState(false)
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"); if (saved) { setOrigin(saved.origin ?? ""); setFuelPrice(Number(saved.fuelPrice) || DEFAULTS.fuelPrice); setConsumption(Number(saved.car) || DEFAULTS.car) } } catch {} }, [])
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...saved, origin, fuelPrice, [vehicle]: consumption })) } catch {} }, [origin, fuelPrice, consumption, vehicle])
  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); setConsumption(Number(saved[vehicle]) || DEFAULTS[vehicle]) } catch { setConsumption(DEFAULTS[vehicle]) } }, [vehicle])

  const liters = useMemo(() => route ? (route.distanceKm * 2) / consumption : 0, [route, consumption])
  const fuelCost = liters * fuelPrice

  async function calculateRoute() {
    if (!origin.trim() || !destination.trim() || consumption <= 0 || fuelPrice <= 0) { setError("Preencha origem, destino, consumo e preço do combustível."); return }
    setLoading(true); setError(""); setRoute(null)
    try {
      const [fromResponse, toResponse] = await Promise.all([fetch(`/api/geocode?q=${encodeURIComponent(origin)}`), fetch(`/api/geocode?q=${encodeURIComponent(destination)}`)])
      if (!fromResponse.ok || !toResponse.ok) throw new Error("Não foi possível localizar os endereços.")
      const [from, to] = await Promise.all([fromResponse.json(), toResponse.json()])
      const response = await fetch(`/api/route?from=${from.lon},${from.lat}&to=${to.lon},${to.lat}`)
      const data = await response.json()
      if (!response.ok || !data.coordinates?.length) throw new Error(data.error ?? "Rota não encontrada.")
      setRoute(data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível calcular a rota.") } finally { setLoading(false) }
  }

  return <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Route className="size-5 text-primary" /><h2 className="text-lg font-semibold">Calcular frete</h2></div><p className="mt-1 text-sm text-muted-foreground">A distância é calculada pelas ruas entre a origem e o destino usando o OSRM. O combustível considera ida e volta.</p></div><Button variant="outline" size="sm" onClick={() => setEditingConsumption((value) => !value)}><Settings2 /> Consumo</Button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Veículo utilizado" htmlFor="freight-vehicle"><Select id="freight-vehicle" value={vehicle} onChange={(value) => setVehicle(value as Vehicle)} options={[{ value: "car", label: "Carro" }, { value: "motorcycle", label: "Moto" }]} /></Field><Field label="Consumo do veículo (km/L)" htmlFor="freight-consumption" hint={editingConsumption ? "Edite o consumo salvo para este veículo." : "Salvo separadamente para carro e moto."}><NumberInput id="freight-consumption" value={consumption} onChange={setConsumption} min={0.1} step={0.1} /></Field><Field label="Ponto de partida" htmlFor="freight-origin"><TextInput id="freight-origin" value={origin} onChange={setOrigin} placeholder="Endereço de saída" /></Field><Field label="Ponto de chegada" htmlFor="freight-destination"><TextInput id="freight-destination" value={destination} onChange={setDestination} placeholder="Endereço do cliente" /></Field><Field label="Preço do combustível (R$/L)" htmlFor="freight-fuel"><NumberInput id="freight-fuel" value={fuelPrice} onChange={setFuelPrice} min={0.01} step={0.01} /></Field></div>{error ? <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}<Button className="mt-5 w-full sm:w-auto" onClick={calculateRoute} disabled={loading}>{loading ? "Calculando rota..." : "Calcular rota"}</Button>{route ? <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_1fr]"><RouteMap route={route} /><div className="rounded-xl border border-border bg-background p-4"><p className="mb-3 font-semibold">Resumo da entrega</p><div className="grid grid-cols-2 gap-2 text-sm"><Info label="Veículo" value={vehicle === "motorcycle" ? "Moto" : "Carro"} /><Info label="Consumo" value={`${consumption} km/L`} /><Info label="Distância de ida" value={`${route.distanceKm.toFixed(1).replace(".", ",")} km`} /><Info label="Distância total" value={`${(route.distanceKm * 2).toFixed(1).replace(".", ",")} km`} /><Info label="Tempo estimado" value={`${route.durationMin} min`} /><Info label="Combustível" value={`${liters.toFixed(2).replace(".", ",")} L`} /></div><div className="mt-4 rounded-xl bg-primary/10 p-4"><p className="text-sm text-muted-foreground">Frete estimado</p><p className="mt-1 text-2xl font-bold text-primary">{fuelCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div></div></div> : null}</section>
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted p-2"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div> }
function RouteMap({ route }: { route: RouteResult }) { const lats = route.coordinates.map((point) => point[1]); const lons = route.coordinates.map((point) => point[0]); const minLat = Math.min(...lats); const maxLat = Math.max(...lats); const minLon = Math.min(...lons); const maxLon = Math.max(...lons); const width = Math.max(maxLon - minLon, 0.001); const height = Math.max(maxLat - minLat, 0.001); const path = route.coordinates.map(([lon, lat]) => `${(((lon - minLon) / width) * 92 + 4).toFixed(1)},${(96 - ((lat - minLat) / height) * 92).toFixed(1)}`).join(" "); const start = path.split(" ")[0].split(","); const end = path.split(" ").at(-1)?.split(",") ?? start; return <div className="relative overflow-hidden rounded-xl border border-border bg-[#dbe7d4] p-3"><div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(25deg, transparent 48%, #8ea68b 49%, transparent 51%), linear-gradient(115deg, transparent 48%, #8ea68b 49%, transparent 51%)", backgroundSize: "70px 70px" }} /><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="relative h-64 w-full"><polyline points={path} fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><circle cx={start[0]} cy={start[1]} r="2.7" fill="#2563eb" /><circle cx={end[0]} cy={end[1]} r="2.7" fill="#dc2626" /></svg><div className="absolute bottom-3 left-4 rounded-lg bg-white/90 px-2 py-1 text-xs text-slate-700">Rota real pelas ruas · azul: saída · vermelho: cliente</div></div> }
