'use client'
import { useEffect, useState } from 'react'
import DateInput from '@/app/dashboard/_components/DateInput'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

function fmtPesos(n) {
  if (n === null || n === undefined || n === '') return '—'
  return '$' + Math.abs(Math.round(n)).toLocaleString('es-CL')
}

function fmtFecha(fechaStr) {
  if (!fechaStr) return '—'
  const [y, m, d] = fechaStr.split('-')
  return `${parseInt(d)} ${MESES[parseInt(m) - 1]} ${y}`
}

// Suma `meses` a una fecha "YYYY-MM-DD" (mismo cálculo que hace el servidor,
// solo para mostrar una vista previa mientras se completa el formulario).
function sumarMeses(fechaStr, meses) {
  if (!fechaStr) return null
  const [y, m, d] = fechaStr.split('-').map(Number)
  const venc = new Date(y, m - 1 + meses, d)
  return `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, '0')}-${String(venc.getDate()).padStart(2, '0')}`
}

const ESTILOS_ESTADO = {
  al_dia:       { borde: 'border-border',      punto: 'bg-green-500', texto: 'text-green-500', label: 'Al día' },
  por_vencer:   { borde: 'border-amber-500/40', punto: 'bg-amber-500', texto: 'text-amber-500', label: 'Por vencer' },
  vencido:      { borde: 'border-pink-500/40',  punto: 'bg-pink-500',  texto: 'text-pink-400',  label: 'Vencido' },
  sin_registro: { borde: 'border-zinc-500/40',  punto: 'bg-zinc-500',  texto: 'text-zinc-400',  label: 'Sin registro' },
}

export default function Contabilidad() {
  const [alumnas, setAlumnas] = useState([])
  const [loading, setLoading] = useState(true)

  const [busqueda,     setBusqueda]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const [modal,     setModal]     = useState(null) // alumna en edición
  const [form,      setForm]      = useState({})
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')
  const [confirmCancelar, setConfirmCancelar] = useState(false)
  const [cancelando,      setCancelando]      = useState(false)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const res = await fetch('/api/admin/pagos')
    if (res.ok) {
      const data = await res.json()
      setAlumnas(data.alumnas || [])
    }
    setLoading(false)
  }

  function abrirModal(alumna) {
    setModal(alumna)
    setError('')
    setConfirmCancelar(false)
    setForm({
      fecha_pago:    new Date().toISOString().split('T')[0],
      meses_pagados: 1,
      monto:         '',
      notas:         '',
    })
  }

  async function cancelarPago() {
    setCancelando(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/pagos/${modal.pago.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Error al cancelar el pago.')
        setCancelando(false)
        return
      }
      setModal(null)
      await cargar()
    } catch {
      setError('Error de conexión.')
    }
    setCancelando(false)
  }

  async function guardar() {
    setGuardando(true)
    setError('')
    try {
      const res = await fetch('/api/admin/pagos', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alumno_id:     modal.id,
          fecha_pago:    form.fecha_pago,
          meses_pagados: parseInt(form.meses_pagados) || 1,
          monto:         form.monto === '' ? null : parseInt(form.monto),
          notas:         form.notas || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Error al guardar.')
        setGuardando(false)
        return
      }
      setModal(null)
      await cargar()
    } catch {
      setError('Error de conexión.')
    }
    setGuardando(false)
  }

  const sinRegistro = alumnas.filter(a => a.estado === 'sin_registro')
  const porVencer   = alumnas.filter(a => a.estado === 'por_vencer')
  const vencidas    = alumnas.filter(a => a.estado === 'vencido')
  const alDia       = alumnas.filter(a => a.estado === 'al_dia')

  // Orden de urgencia: las que necesitan atención primero, "al día" al final.
  const ORDEN_ESTADO = { vencido: 0, sin_registro: 1, por_vencer: 2, al_dia: 3 }

  const filtradas = alumnas
    .filter(a => {
      const matchBusqueda = a.nombre.toLowerCase().includes(busqueda.toLowerCase())
      const matchEstado = filtroEstado === 'todos' || filtroEstado === a.estado
      return matchBusqueda && matchEstado
    })
    .sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] || a.nombre.localeCompare(b.nombre))

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-4xl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-foreground">Contabilidad</h1>
        <p className="text-xs text-zinc-500 mt-1">Estado de pago por alumna, según fecha de vencimiento</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-black text-green-500">{alDia.length}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Al día</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-black text-amber-500">{porVencer.length}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Por vencer</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-black text-pink-400">{vencidas.length}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Vencidas</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-black text-zinc-400">{sinRegistro.length}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Sin registro</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-surface border border-border text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-pink-600 transition-colors placeholder:text-zinc-600"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="bg-surface border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-600 transition-colors"
        >
          <option value="todos">Todos los estados</option>
          <option value="al_dia">Al día</option>
          <option value="por_vencer">Por vencer</option>
          <option value="vencido">Vencidas</option>
          <option value="sin_registro">Sin registro</option>
        </select>
      </div>

      {/* Lista de alumnas */}
      <div className="space-y-2">
        {filtradas.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center text-zinc-500 text-sm">
            No hay alumnas que coincidan con el filtro.
          </div>
        ) : filtradas.map(a => {
          const estilos = ESTILOS_ESTADO[a.estado]
          return (
            <button
              key={a.id}
              onClick={() => abrirModal(a)}
              className={`w-full flex items-center justify-between gap-3 bg-surface border ${estilos.borde} rounded-xl px-4 py-3 text-left hover:bg-hover-md transition-colors`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${estilos.punto}`} />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">{a.nombre}</div>
                  <div className="text-xs text-zinc-500">{a.tipo_clase || 'Semi Personalizado'} · {a.plan}</div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xs font-bold ${estilos.texto}`}>
                  {a.estado === 'sin_registro' || a.estado === 'vencido' ? '⚠ ' : ''}{estilos.label}
                </div>
                {a.pago && (
                  <div className="text-xs text-zinc-500">
                    {a.estado === 'vencido' ? 'Venció' : 'Vence'} {fmtFecha(a.pago.fecha_vencimiento)}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Modal registrar pago */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div className="bg-surface border border-border-strong rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-base font-black text-foreground">{modal.nombre}</h3>
              {modal.pago ? (
                <p className="text-xs text-zinc-500">
                  Último pago: {fmtFecha(modal.pago.fecha_pago)} · {modal.estado === 'vencido' ? 'venció' : 'vence'} {fmtFecha(modal.pago.fecha_vencimiento)}
                </p>
              ) : (
                <p className="text-xs text-zinc-500">Todavía no tiene ningún pago registrado.</p>
              )}
            </div>

            {modal.pago && (
              confirmCancelar ? (
                <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-foreground">¿Cancelar este pago? Se borra y la alumna queda con el registro anterior (o sin registro, si era el único).</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmCancelar(false)}
                      className="flex-1 py-1.5 rounded-lg border border-border text-xs text-zinc-500 hover:text-foreground transition-colors"
                    >
                      No, dejarlo
                    </button>
                    <button
                      onClick={cancelarPago}
                      disabled={cancelando}
                      className="flex-1 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold disabled:opacity-50 transition-colors"
                    >
                      {cancelando ? 'Cancelando...' : 'Sí, cancelar pago'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmCancelar(true)}
                  className="text-xs text-pink-400 hover:text-pink-300 transition-colors"
                >
                  Cancelar este pago →
                </button>
              )
            )}

            <div className="border-t border-border pt-4">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Registrar nuevo pago</p>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Fecha de pago</label>
                  <DateInput
                    value={form.fecha_pago}
                    onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))}
                    className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">¿Cuántos meses paga?</label>
                  <select
                    value={form.meses_pagados}
                    onChange={e => setForm(f => ({ ...f, meses_pagados: e.target.value }))}
                    className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600 transition-colors"
                  >
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <option key={n} value={n}>{n} mes{n > 1 ? 'es' : ''}</option>
                    ))}
                  </select>
                  {form.fecha_pago && (
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Quedaría al día hasta el <span className="text-foreground font-medium">{fmtFecha(sumarMeses(form.fecha_pago, parseInt(form.meses_pagados) || 1))}</span>.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Monto pagado</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="$"
                    value={form.monto}
                    onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Notas (opcional)</label>
                  <textarea
                    rows={2}
                    value={form.notas}
                    onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                    placeholder="Ej: promo Instagram, transferencia a nombre de..."
                    className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-pink-400">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm text-zinc-500 hover:text-foreground hover:bg-hover transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold disabled:opacity-50 transition-all"
              >
                {guardando ? 'Guardando...' : 'Registrar pago'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
