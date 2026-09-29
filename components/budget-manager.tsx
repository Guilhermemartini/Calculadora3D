"use client"

import { deleteBudget, listBudgets, type Budget } from "@/app/actions/budgets"
import { Button } from "@/components/ui/button"
import { formatBRL, formatTime } from "@/lib/calc"
import { FreightCalculator } from "@/components/freight-calculator"
import { Edit3, FileBox, History, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

export function BudgetManager() {
  const [items, setItems] = useState<Budget[]>([])
  const [selected, setSelected] = useState<Budget | null>(null)
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    try { setItems(await listBudgets()) } finally { setLoading(false) }
  }
  useEffect(() => { refresh().catch(() => setLoading(false)) }, [])

  async function remove(id: string) {
    if (!window.confirm("Excluir este orçamento?")) return
    await deleteBudget(id)
    setSelected(null)
    await refresh()
  }

  if (loading) return <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Carregando orçamentos...</div>
  if (!items.length) return <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center"><FileBox className="mx-auto mb-3 size-9 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhum orçamento salvo.</p><Button className="mt-4" onClick={() => window.location.assign("/")}>Criar orçamento</Button></div>

  return <>
    <FreightCalculator />
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <button type="button" className="block w-full text-left" onClick={() => setSelected(item)}>
          {item.snapshotData ? <img src={item.snapshotData} alt={`Preview de ${item.name}`} className="h-40 w-full bg-muted object-cover" /> : <div className="flex h-40 items-center justify-center bg-muted"><FileBox className="size-10 text-muted-foreground" /></div>}
          <div className="p-4"><h2 className="truncate font-semibold">{item.name}</h2><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground"><span>Tempo<strong className="mt-1 block text-foreground">{formatTime(item.hours * 60 + item.minutes)}</strong></span><span>Peso<strong className="mt-1 block text-foreground">{item.weight} g</strong></span></div><p className="mt-3 text-lg font-semibold text-primary">{formatBRL(item.totalValue)}</p></div>
        </button>
        <div className="flex gap-2 border-t border-border p-3"><Button variant="outline" size="sm" className="flex-1" onClick={() => window.location.assign(`/?budget=${item.id}`)}><Edit3 /> Editar</Button><Button variant="ghost" size="icon-sm" onClick={() => remove(item.id)} aria-label="Excluir orçamento"><Trash2 /></Button></div>
      </article>)}
    </div>
    {selected ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="dialog" aria-modal="true"><div className="max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card shadow-xl"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="font-semibold">{selected.name}</h2><Button variant="ghost" size="icon-sm" onClick={() => setSelected(null)} aria-label="Fechar">×</Button></div><div className="flex flex-col gap-4 p-5 text-sm"><div className="grid grid-cols-2 gap-3"><Info label="Tempo" value={formatTime(selected.hours * 60 + selected.minutes)} /><Info label="Peso" value={`${selected.weight} g`} /><Info label="Valor da impressão" value={formatBRL(selected.printValue)} /><Info label="Frete" value={selected.freightEnabled ? formatBRL(selected.freightValue) : "Não calculado"} /><Info label="Valor total" value={formatBRL(selected.totalValue)} /></div><div><p className="mb-2 font-medium">Acabamentos e adicionais</p>{selected.finishes.length ? <ul className="space-y-2">{selected.finishes.map((finish) => <li key={finish.name} className="flex justify-between rounded-lg bg-muted px-3 py-2"><span>{finish.name}</span><span>{formatBRL(finish.value)}</span></li>)}</ul> : <p className="text-muted-foreground">Nenhum acabamento ou adicional.</p>}</div>{selected.freightEnabled ? <div className="rounded-xl bg-muted p-3 text-muted-foreground">{selected.origin} → {selected.destination} · {selected.distanceKm} km · {selected.vehicle === "motorcycle" ? "Moto" : "Carro"}</div> : null}<p className="text-xs text-muted-foreground">Arquivo: {selected.stlFileName ?? "Nenhum STL anexado"}</p></div></div></div> : null}
  </>
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-muted p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div> }
