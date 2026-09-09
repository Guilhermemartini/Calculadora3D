"use client"

import {
  createFilament,
  deleteFilament,
  listFilaments,
  removeFilamentUsage,
  updateFilament,
  useFilament,
} from "@/app/actions/filaments"
import { Field, NumberInput, Select } from "@/components/form-controls"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  type Filament,
  FILAMENT_MATERIALS,
  createId,
  formatDateTime,
  formatGrams,
  remainingPercent,
} from "@/lib/filaments"
import { Droplet, History, Layers, MinusCircle, Pencil, Plus, Trash2, X } from "lucide-react"
import { type ReactNode, useEffect, useMemo, useState } from "react"

type FormState = {
  color: string
  material: string
  totalWeight: number
  currentWeight: number
  rollPrice: number
}

const EMPTY_FORM: FormState = {
  color: "",
  material: FILAMENT_MATERIALS[0] ?? "PLA",
  totalWeight: 1000,
  currentWeight: 1000,
  rollPrice: 100,
}

export function FilamentStock() {
  const [filaments, setFilaments] = useState<Filament[]>([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const [useId, setUseId] = useState<string | null>(null)
  const [useAmount, setUseAmount] = useState(0)

  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [historyId, setHistoryId] = useState<string | null>(null)

  useEffect(() => {
    listFilaments()
      .then((items) => setFilaments(items))
      .catch(() => undefined)
      .finally(() => setLoaded(true))
  }, [])

  const useTarget = useMemo(
    () => filaments.find((f) => f.id === useId) ?? null,
    [filaments, useId],
  )
  const deleteTarget = useMemo(
    () => filaments.find((f) => f.id === deleteId) ?? null,
    [filaments, deleteId],
  )
  const historyTarget = useMemo(
    () => filaments.find((f) => f.id === historyId) ?? null,
    [filaments, historyId],
  )

  async function refreshStock() {
    setSaving(true)
    try {
      setFilaments(await listFilaments())
    } finally {
      setSaving(false)
    }
  }

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(f: Filament) {
    setEditingId(f.id)
    setForm({
      color: f.color,
      material: f.material,
      totalWeight: f.totalWeight,
      currentWeight: f.currentWeight,
      rollPrice: f.rollPrice,
    })
    setFormOpen(true)
  }

  async function saveForm() {
    const total = Math.max(0, form.totalWeight)
    const current = Math.max(0, Math.min(form.currentWeight, total || form.currentWeight))
    const input = { id: editingId ?? createId(), ...form, totalWeight: total, currentWeight: current }
    setSaving(true)
    try {
      if (editingId) await updateFilament(input)
      else await createFilament(input)
      await refreshStock()
      setFormOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function confirmUse() {
    if (!useTarget) return
    const amount = Math.max(0, useAmount)
    setSaving(true)
    try {
      await useFilament(useTarget.id, createId(), amount)
      await refreshStock()
      setUseId(null)
      setUseAmount(0)
    } finally {
      setSaving(false)
    }
  }

  async function removeUsage(filamentId: string, entryId: string) {
    setSaving(true)
    try {
      await removeFilamentUsage(filamentId, entryId)
      await refreshStock()
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await deleteFilament(deleteTarget.id)
      await refreshStock()
      setDeleteId(null)
    } finally {
      setSaving(false)
    }
  }

  const formValid = form.color.trim().length > 0 && form.totalWeight > 0

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho da seção */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Layers className="size-4 text-primary" />
          <div>
            <h2 className="text-base font-semibold leading-tight">Meus filamentos</h2>
            <p className="text-sm text-muted-foreground leading-tight">
              {filaments.length} {filaments.length === 1 ? "rolo cadastrado" : "rolos cadastrados"}
            </p>
          </div>
        </div>
        <Button size="lg" className="h-10" onClick={openNew}>
          <Plus />
          Novo Filamento
        </Button>
      </div>

      {/* Lista */}
      {filaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Layers className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">Nenhum filamento cadastrado</p>
            <p className="text-sm text-muted-foreground">
              Clique em &quot;Novo Filamento&quot; para adicionar o primeiro rolo.
            </p>
          </div>
          <Button variant="outline" className="mt-1" onClick={openNew}>
            <Plus />
            Novo Filamento
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filaments.map((f) => (
            <FilamentCard
              key={f.id}
              filament={f}
              onUse={() => {
                setUseId(f.id)
                setUseAmount(0)
              }}
              onEdit={() => openEdit(f)}
              onDelete={() => setDeleteId(f.id)}
              onHistory={() => setHistoryId(f.id)}
            />
          ))}
        </div>
      )}

      {/* Modal Novo / Editar */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? "Editar filamento" : "Novo filamento"}
      >
        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <Field label="Cor" htmlFor="fil-color" className="sm:col-span-2">
            <TextInput
              id="fil-color"
              value={form.color}
              onChange={(v) => setForm((p) => ({ ...p, color: v }))}
              placeholder="Ex.: Preto Premium"
            />
          </Field>
          <Field label="Material" htmlFor="fil-material">
            <Select
              id="fil-material"
              value={form.material}
              onChange={(v) => setForm((p) => ({ ...p, material: v }))}
              options={FILAMENT_MATERIALS.map((m) => ({ value: m, label: m }))}
            />
          </Field>
          <Field label="Peso total" htmlFor="fil-total" hint="Peso do rolo cheio.">
            <NumberInput
              id="fil-total"
              value={form.totalWeight}
              onChange={(v) => setForm((p) => ({ ...p, totalWeight: v }))}
              suffix="g"
            />
          </Field>
          <Field
            label="Peso atual"
            htmlFor="fil-current"
            hint="Quanto resta no rolo."
            className="sm:col-span-2"
          >
            <NumberInput
              id="fil-current"
              value={form.currentWeight}
              onChange={(v) => setForm((p) => ({ ...p, currentWeight: v }))}
              suffix="g"
            />
          </Field>
          <Field label="Valor do rolo" htmlFor="fil-price" className="sm:col-span-2">
            <NumberInput
              id="fil-price"
              value={form.rollPrice}
              onChange={(v) => setForm((p) => ({ ...p, rollPrice: v }))}
              prefix="R$"
            />
          </Field>
        </div>
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>
            Cancelar
          </Button>
          <Button className="flex-1" disabled={!formValid} onClick={saveForm}>
            {editingId ? "Salvar alterações" : "Salvar"}
          </Button>
        </div>
      </Modal>

      {/* Modal Utilizar */}
      <Modal open={!!useTarget} onClose={() => setUseId(null)} title="Utilizar filamento">
        {useTarget ? (
          <>
            <div className="px-5 py-5">
              <p className="mb-4 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{useTarget.color}</span> — restam{" "}
                {formatGrams(useTarget.currentWeight)} g.
              </p>
              <Field label="Quantidade utilizada" htmlFor="use-amount">
                <NumberInput
                  id="use-amount"
                  value={useAmount}
                  onChange={setUseAmount}
                  suffix="g"
                  max={useTarget.currentWeight}
                />
              </Field>
            </div>
            <div className="flex gap-2 border-t border-border px-5 py-4">
              <Button variant="outline" className="flex-1" onClick={() => setUseId(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={useAmount <= 0}
                onClick={confirmUse}
              >
                <MinusCircle />
                Descontar
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

      {/* Modal Excluir */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteId(null)} title="Excluir filamento">
        {deleteTarget ? (
          <>
            <div className="px-5 py-5">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja excluir{" "}
                <span className="font-medium text-foreground">{deleteTarget.color}</span>? Esta ação
                não pode ser desfeita.
              </p>
            </div>
            <div className="flex gap-2 border-t border-border px-5 py-4">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={confirmDelete}>
                <Trash2 />
                Excluir
              </Button>
            </div>
          </>
        ) : null}
      </Modal>

      {/* Modal Histórico */}
      <Modal open={!!historyTarget} onClose={() => setHistoryId(null)} title="Histórico de uso">
        {historyTarget ? (
          <div className="px-5 py-5">
            <p className="mb-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{historyTarget.color}</span> —{" "}
              {(historyTarget.usage?.length ?? 0) === 0
                ? "nenhuma utilização registrada."
                : `${historyTarget.usage?.length} ${
                    historyTarget.usage?.length === 1 ? "registro" : "registros"
                  }.`}
            </p>

            {(historyTarget.usage?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background px-6 py-10 text-center">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <History className="size-5" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Utilize este filamento para registrar o primeiro consumo.
                </p>
              </div>
            ) : (
              <ul className="flex max-h-[50svh] flex-col gap-2 overflow-y-auto">
                {historyTarget.usage?.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatGrams(u.amount)} g
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(u.date)}</p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeUsage(historyTarget.id, u.id)}
                      aria-label="Remover registro"
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

function FilamentCard({
  filament,
  onUse,
  onEdit,
  onDelete,
  onHistory,
}: {
  filament: Filament
  onUse: () => void
  onEdit: () => void
  onDelete: () => void
  onHistory: () => void
}) {
  const pct = remainingPercent(filament)
  const low = pct <= 15
  const usageCount = filament.usage?.length ?? 0

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-5 text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold leading-tight">
            {filament.color || "Sem cor"}
          </h3>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {filament.material}
        </span>
      </div>

      {/* Progresso */}
      <div className="flex flex-col gap-2">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              low ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatGrams(filament.currentWeight)} g de {formatGrams(filament.totalWeight)} g
          </span>
          <span className="font-semibold tabular-nums text-foreground">{Math.round(pct)}%</span>
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button size="sm" className="flex-1" onClick={onUse}>
          <Droplet />
          Utilizar
        </Button>
        <Button
          size="icon-sm"
          variant="outline"
          onClick={onHistory}
          aria-label={`Histórico de uso${usageCount ? ` (${usageCount})` : ""}`}
          className="relative"
        >
          <History />
          {usageCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
              {usageCount}
            </span>
          ) : null}
        </Button>
        <Button size="icon-sm" variant="outline" onClick={onEdit} aria-label="Editar">
          <Pencil />
        </Button>
        <Button size="icon-sm" variant="destructive" onClick={onDelete} aria-label="Excluir">
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:opacity-50"
    />
  )
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

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
        className="relative z-10 max-h-[90svh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Fechar">
            <X />
          </Button>
        </div>
        {children}
      </div>
    </div>
  )
}
