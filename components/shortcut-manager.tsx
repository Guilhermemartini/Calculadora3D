"use client"

import { deleteShortcut, listShortcuts, saveShortcut, type Shortcut } from '@/app/actions/shortcuts'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/form-controls'
import { Edit3, ExternalLink, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ShortcutManager() {
  const [items, setItems] = useState<Shortcut[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Shortcut | null>(null)
  const [form, setForm] = useState({ name: '', link: '', imageUrl: '' })
  const [loading, setLoading] = useState(true)

  async function refresh() { setLoading(true); setItems(await listShortcuts()); setLoading(false) }
  useEffect(() => { refresh().catch(() => setLoading(false)) }, [])
  function start(item?: Shortcut) { setEditing(item ?? null); setForm(item ? { name: item.name, link: item.link, imageUrl: item.imageUrl } : { name: '', link: '', imageUrl: '' }); setOpen(true) }
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!form.name.trim() || !form.link.trim() || !form.imageUrl.trim()) return; await saveShortcut({ id: editing?.id, ...form }); setOpen(false); await refresh() }
  async function remove(id: string) { if (window.confirm('Excluir este atalho?')) { await deleteShortcut(id); await refresh() } }

  return <div className="flex flex-col gap-5">
    <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">Meus atalhos</h2><p className="text-sm text-muted-foreground">Acesso rápido aos seus links.</p></div><Button onClick={() => start()}><Plus /> Novo atalho</Button></div>
    {loading ? <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Carregando atalhos...</div> : items.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"><ImagePlus className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhum atalho cadastrado.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><a href={item.link} target="_blank" rel="noreferrer" className="block"><img src={item.imageUrl} alt={item.name} className="h-40 w-full object-cover" /><div className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><h3 className="truncate font-semibold">{item.name}</h3><p className="truncate text-xs text-muted-foreground">{item.link}</p></div><ExternalLink className="size-4 shrink-0 text-muted-foreground" /></div></a><div className="flex gap-2 border-t border-border p-3"><Button variant="outline" size="sm" className="flex-1" onClick={() => start(item)}><Edit3 /> Editar</Button><Button variant="ghost" size="icon-sm" onClick={() => remove(item.id)} aria-label="Excluir atalho"><Trash2 /></Button></div></article>)}</div>}
    {open ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl"><div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="font-semibold">{editing ? 'Editar atalho' : 'Novo atalho'}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X className="size-5" /></button></div><div className="flex flex-col gap-4 px-5 py-5"><Field label="Nome" htmlFor="shortcut-name"><TextInput id="shortcut-name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} placeholder="Ex.: Thingiverse" /></Field><Field label="Link" htmlFor="shortcut-link"><TextInput id="shortcut-link" value={form.link} onChange={(v) => setForm((p) => ({ ...p, link: v }))} placeholder="https://..." /></Field><Field label="Imagem" htmlFor="shortcut-image"><TextInput id="shortcut-image" value={form.imageUrl} onChange={(v) => setForm((p) => ({ ...p, imageUrl: v }))} placeholder="URL da imagem" /></Field></div><div className="flex gap-2 border-t border-border px-5 py-4"><Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" className="flex-1">Salvar</Button></div></form></div> : null}
  </div>
}
