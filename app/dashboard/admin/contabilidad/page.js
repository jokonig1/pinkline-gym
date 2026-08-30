'use client'
import { useEffect, useState } from 'react'
import DateInput from '@/app/dashboard/_components/DateInput'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function fmtPesos(n) {
  if (n === null || n === undefined || n === '') return '—'
  return '$' + Math.abs(Math.round(n)).toLocaleString('es-CL')
}

// Nombre del mes al que llega un pago que cubre `n` meses a partir de mes/año.
function mesFinal(mes, año, n) {
  const idx = mes - 1 + (n - 1)
  const m = idx % 12
  const a = año + Math.floor(idx / 12)
  return `${MESES[m]} ${a}`
}

export default function Contabilidad() {
  const hoy = new Date()
  const [año, setAño] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [alumnas, setAlumnas] = useState([])
  const [loading, setLoading] = useState(true)

  const [busqueda,    setBusqueda]    = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos') // todos | pagado | no_pagado | sin_registro

  const [modal,     setModal]     = useState(null) // alumna en edición
  const [form,      setForm]      = useState({})
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => { cargar() }, [año, mes])

  async function cargar() {
    setLoading(true)
    const res = await fetch(`/api/admin/pagos?año=${año}&mes=${mes}`)
    if (res.ok) {
      const data = await res.json()
      setAlumnas(data.alumnas || [])
    }
    setLoading(false)
  }

  function cambiarMes(delta) {
    let m = mes + delta
    let a = año
    if (m > 12) { m = 1; a += 1 }
    if (m < 1)  { m = 12; a -= 1 }
    setMes(m); setAño(a)
  }

  function abrirModal(alumna) {
    setModal(alumna)
    setError('')
    setForm({
      pagado:        alumna.pago?.pagado ?? false,
      monto:         alumna.pago?.monto ?? '',
      fecha_pago:    alumna.pago?.fecha_pago || new Date().toISOString().split('T')[0],
      notas:         alumna.pago?.notas || '',
      mesesQueCubre: 1,
    })
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
          año, mes,
          pagado:        form.pagado,
          monto:         form.monto === '' ? null : parseInt(form.monto),
          fecha_pago:    form.fecha_pago || null,
          notas:         form.notas || null,
          mesesQueCubre: parseInt(form.mesesQueCubre) || 1,
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

  const sinRegistro = alumnas.filter(a => !a.pago)
  const noPagado    = alumnas.filter(a => a.pago && !a.pago.pagado)
  const pagaron     = alumnas.filter(a => a.pago?.pagado)

  const filtradas = alumnas.filter(a => {
    const matchBusqueda = a.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const estado = !a.pago ? 'sin_registro' : a.pago.pagado ? 'pagado' : 'no_pagado'
    const matchEstado = filtroEstado === 'todos' || filtroEstado === estado
    return matchBusqueda && matchEstado
  })

  if (loading) return <LoadingSpinner />

  return (
    <div className="max-w-4xl">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Contabilidad</h1>
          <p className="text-xs text-zinc-500 mt-1">Estado de pago mensual por alumna</p>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-xl px-1.5 py-1.5">
          <button onClick={() => cambiarMes(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md text-zinc-500 hover:text-foreground transition-colors">
            ←
          </button>
          <span className="text-sm font-bold text-foreground w-32 text-center">{MESES[mes - 1]} {año}</span>
          <button onClick={() => cambiarMes(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md text-zinc-500 hover:text-foreground transition-colors">
            →
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-black text-green-500">{pagaron.length}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Pagaron</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-black text-pink-400">{noPagado.length}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">No pagaron</div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 text-center">
          <div className="text-xl font-black text-amber-500">{sinRegistro.length}</div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Sin registro</div>
        </div>
      </div>

      {/* Aviso: alumnas sin registro de pago este mes */}
      {sinRegistro.length > 0 && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-amber-500 text-lg leading-none shrink-0">⚠</span>
          <div className="flex-1 text-sm leading-relaxed">
            <span className="font-bold text-foreground">
              {sinRegistro.length} alumna{sinRegistro.length !== 1 ? 's' : ''} sin registro de pago en {MESES[mes - 1]}:
            </span>{' '}
            {sinRegistro.map((a, i) => (
              <span key={a.id}>
                <button
                  onClick={() => abrirModal(a)}
                  className="text-amber-500 hover:text-amber-400 underline underline-offset-2 transition-colors"
                >
                  {a.nombre}
                </button>
                {i < sinRegistro.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

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
          <option value="pagado">Pagaron</option>
          <option value="no_pagado">No pagaron</option>
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
          const estado = !a.pago ? 'sin_registro' : a.pago.pagado ? 'pagado' : 'no_pagado'
          const estilos = {
            pagado:       { borde: 'border-border',           punto: 'bg-green-500', texto: 'text-green-500', label: 'Pagado' },
            no_pagado:    { borde: 'border-pink-500/30',       punto: 'bg-pink-500',  texto: 'text-pink-400',  label: 'No pagado' },
            sin_registro: { borde: 'border-amber-500/40',      punto: 'bg-amber-500', texto: 'text-amber-500', label: 'Sin registro' },
          }[estado]

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
                  {estado === 'sin_registro' ? '⚠ ' : ''}{estilos.label}
                </div>
                {a.pago?.monto != null && (
                  <div className="text-xs text-zinc-500">{fmtPesos(a.pago.monto)}</div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Modal editar pago */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div className="bg-surface border border-border-strong rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-base font-black text-foreground">{modal.nombre}</h3>
              <p className="text-xs text-zinc-500">{MESES[mes - 1]} {año}</p>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pagado}
                onChange={e => setForm(f => ({ ...f, pagado: e.target.checked }))}
                className="w-4 h-4 accent-pink-600"
              />
              <span className="text-sm font-medium text-foreground">Pagó este mes</span>
            </label>

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
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Fecha de pago</label>
              <DateInput
                value={form.fecha_pago}
                onChange={e => setForm(f => ({ ...f, fecha_pago: e.target.value }))}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600 transition-colors"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">¿Cuántos meses cubre este pago?</label>
              <select
                value={form.mesesQueCubre}
                onChange={e => setForm(f => ({ ...f, mesesQueCubre: e.target.value }))}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600 transition-colors"
              >
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <option key={n} value={n}>
                    {n} mes{n > 1 ? 'es' : ''}{n > 1 ? ` (hasta ${mesFinal(mes, año, n)})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-zinc-600 mt-1">
                Si pagó varios meses juntos, elegí cuántos acá y se cargan todos con los mismos datos.
              </p>
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
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
