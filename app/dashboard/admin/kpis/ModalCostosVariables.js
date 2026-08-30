'use client'
import { useEffect, useState } from 'react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmtPesos(n) {
  if (!n && n !== 0) return '—'
  return '$' + Math.abs(Math.round(n)).toLocaleString('es-CL')
}

export default function ModalCostosVariables({ open, onClose, onSaved }) {
  const today = new Date()
  const año = today.getFullYear()
  const mes  = today.getMonth() + 1

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    fetch(`/api/admin/costos-variables?año=${año}&mes=${mes}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setItems(d.items || []); setLoading(false) })
      .catch(() => { setError('Error al cargar costos variables.'); setLoading(false) })
  }, [open])

  function updateItem(i, field, value) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems(prev => [...prev, { nombre: '', monto: 0 }])
  }

  function removeItem(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  const total = items.reduce((s, item) => s + (parseInt(item.monto) || 0), 0)

  async function handleSave() {
    if (items.some(i => !i.nombre.trim())) {
      setError('Todos los ítems deben tener nombre.')
      return
    }
    setSaving(true)
    setError('')
    const itemsClean = items.map(i => ({ nombre: i.nombre.trim(), monto: parseInt(i.monto) || 0 }))
    try {
      const res = await fetch('/api/admin/costos-variables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ año, mes, items: itemsClean }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al guardar.'); setSaving(false); return }
      onSaved?.()
      onClose()
    } catch {
      setError('Error de conexión.')
    }
    setSaving(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-surface border border-border-strong rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-black text-foreground">Costos variables del mes</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{MESES[mes - 1]} {año}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-hover">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <p className="text-xs text-zinc-500 text-center py-8">Cargando...</p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[11px] text-zinc-500 -mt-1 mb-1">
                Gastos puntuales de este mes (compras, reparaciones, etc.). No se heredan del mes anterior.
              </p>

              {/* Header cols */}
              <div className="flex items-center gap-2 pb-1">
                <span className="flex-1 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Ítem</span>
                <span className="w-32 text-right text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Monto ($)</span>
                <span className="w-6" />
              </div>

              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="flex-1 bg-hover border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                    placeholder="Nombre del ítem"
                    value={item.nombre}
                    onChange={e => updateItem(i, 'nombre', e.target.value)}
                  />
                  <input
                    className="w-36 bg-hover border border-border rounded-xl px-3 py-2 text-sm text-foreground text-right focus:outline-none focus:border-pink-500 transition-colors"
                    type="text"
                    inputMode="numeric"
                    value={'$' + (parseInt(item.monto) || 0).toLocaleString('es-CL')}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '')
                      updateItem(i, 'monto', raw === '' ? 0 : parseInt(raw))
                    }}
                  />
                  <button
                    onClick={() => removeItem(i)}
                    className="w-6 h-6 flex items-center justify-center text-zinc-600 hover:text-pink-400 transition-colors shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              ))}

              <button
                onClick={addItem}
                className="w-full mt-1 text-xs text-zinc-500 hover:text-foreground border border-dashed border-border hover:border-border-strong rounded-xl py-2.5 transition-colors"
              >
                + Agregar ítem
              </button>

              {error && <p className="text-xs text-pink-400 pt-1">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-5 shrink-0">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-sm font-bold text-foreground">Total costos variables</span>
            <span className="text-xl font-black text-pink-400">{fmtPesos(total)}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm text-zinc-500 hover:text-foreground hover:bg-hover transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold disabled:opacity-50 transition-all"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
