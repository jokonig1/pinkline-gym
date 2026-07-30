'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'
import DateInput from '@/app/dashboard/_components/DateInput'

function normalizar(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return ''
  const [, m, d] = fechaStr.split('-')
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${M[parseInt(m) - 1]}`
}

export default function CoachTraspasos() {
  const [coachId,  setCoachId]  = useState(null)
  const [coaches,  setCoaches]  = useState([])
  const [alumnos,  setAlumnos]  = useState([])
  const [traspasos, setTraspasos] = useState([])
  const [loading,  setLoading]  = useState(true)

  // Traspaso temporal
  const [coachDestino, setCoachDestino] = useState('')
  const [fechaDesde,   setFechaDesde]   = useState(toDateStr(new Date()))
  const [fechaHasta,   setFechaHasta]   = useState(toDateStr(new Date()))
  const [motivo,       setMotivo]       = useState('')
  const [guardandoTemp, setGuardandoTemp] = useState(false)
  const [errorTemp,      setErrorTemp]     = useState('')
  const [modoTemp,           setModoTemp]           = useState('todos') // 'todos' | 'elegir'
  const [busquedaAlumnoTemp, setBusquedaAlumnoTemp] = useState('')
  const [alumnosSelecTemp,   setAlumnosSelecTemp]   = useState(new Set())

  function toggleAlumnoTemp(id) {
    setAlumnosSelecTemp(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function cambiarModoTemp(modo) {
    setModoTemp(modo)
    if (modo === 'todos') { setAlumnosSelecTemp(new Set()); setBusquedaAlumnoTemp('') }
  }

  // Traspaso permanente de alumnos (uno o varios, a un mismo coach por envío)
  const [busquedaAlumno,  setBusquedaAlumno]  = useState('')
  const [alumnosSelec,    setAlumnosSelec]    = useState(new Set())
  const [coachNuevo,      setCoachNuevo]      = useState('')
  const [guardandoPerm,   setGuardandoPerm]   = useState(false)
  const [errorPerm,       setErrorPerm]       = useState('')
  const [exitoPerm,       setExitoPerm]       = useState('')

  function toggleAlumno(id) {
    setAlumnosSelec(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function cargarTraspasos(id) {
    const res = await fetch(`/api/traspasos?coach_id=${id}`)
    setTraspasos(res.ok ? await res.json() : [])
  }

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setCoachId(user.id)

      const [coachesRes, alumnosRes] = await Promise.all([
        fetch('/api/coaches'),
        supabase.from('alumnos').select('id, nombre, plan').eq('coach_id', user.id).eq('activo', true).order('nombre'),
      ])
      setCoaches(coachesRes.ok ? await coachesRes.json() : [])
      setAlumnos(alumnosRes.data || [])
      await cargarTraspasos(user.id)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <LoadingSpinner />

  const otrosCoaches = coaches.filter(c => c.id !== coachId)
  const hoyStr = toDateStr(new Date())

  async function crearTraspaso() {
    setErrorTemp('')
    if (!coachDestino) { setErrorTemp('Elige a qué coach traspasar.'); return }
    if (fechaHasta < fechaDesde) { setErrorTemp('La fecha hasta no puede ser antes que la fecha desde.'); return }
    if (modoTemp === 'elegir' && alumnosSelecTemp.size === 0) {
      setErrorTemp('Elige al menos un alumno, o cambia a "Todos mis alumnos".'); return
    }

    setGuardandoTemp(true)
    const res = await fetch('/api/traspasos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coach_origen_id:  coachId,
        coach_destino_id: coachDestino,
        fecha_desde:      fechaDesde,
        fecha_hasta:      fechaHasta,
        motivo:           motivo.trim() || null,
        alumno_ids:       modoTemp === 'elegir' ? [...alumnosSelecTemp] : [],
      }),
    })
    if (res.ok) {
      setCoachDestino(''); setMotivo(''); setAlumnosSelecTemp(new Set()); setBusquedaAlumnoTemp('')
      await cargarTraspasos(coachId)
    } else {
      const err = await res.json().catch(() => ({}))
      setErrorTemp(err.error || 'Error al crear el traspaso.')
    }
    setGuardandoTemp(false)
  }

  const alumnosFiltradosTemp = alumnos.filter(a =>
    !busquedaAlumnoTemp.trim() || normalizar(a.nombre).includes(normalizar(busquedaAlumnoTemp))
  )

  async function cancelarTraspaso(id) {
    await fetch(`/api/traspasos?id=${id}`, { method: 'DELETE' })
    await cargarTraspasos(coachId)
  }

  const alumnosFiltrados = alumnos.filter(a =>
    !busquedaAlumno.trim() || normalizar(a.nombre).includes(normalizar(busquedaAlumno))
  )

  async function traspasarAlumnos() {
    setErrorPerm(''); setExitoPerm('')
    const ids = [...alumnosSelec]
    if (ids.length === 0) { setErrorPerm('Elige al menos un alumno.'); return }
    if (!coachNuevo)      { setErrorPerm('Elige a qué coach los traspasas.'); return }

    setGuardandoPerm(true)
    const res = await fetch('/api/traspasos/alumnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumno_ids: ids, coach_nuevo_id: coachNuevo }),
    })
    if (res.ok) {
      const nombreCoach = otrosCoaches.find(c => c.id === coachNuevo)?.nombre || ''
      setExitoPerm(`${ids.length} alumno${ids.length !== 1 ? 's' : ''} traspasado${ids.length !== 1 ? 's' : ''} a ${nombreCoach}.`)
      setAlumnos(prev => prev.filter(a => !alumnosSelec.has(a.id)))
      setAlumnosSelec(new Set()); setBusquedaAlumno(''); setCoachNuevo('')
    } else {
      const err = await res.json().catch(() => ({}))
      setErrorPerm(err.error || 'Error al traspasar los alumnos.')
    }
    setGuardandoPerm(false)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Traspasos</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Traspasa tus clases a otro coach por unos días, o pásale un alumno para siempre.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

      {/* ── Traspaso temporal ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-pink-900/20 flex items-center justify-center text-pink-400 text-lg font-bold shrink-0">
            ↻
          </div>
          <div>
            <div className="text-base font-black text-foreground">Traspaso temporal de clases</div>
            <div className="text-[11px] text-zinc-500">Por vacaciones o algunos días — vuelve solo al terminar el rango</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Traspasar a</label>
            <select
              value={coachDestino}
              onChange={e => setCoachDestino(e.target.value)}
              className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-600"
            >
              <option value="">Elegir coach…</option>
              {otrosCoaches.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Desde</label>
              <DateInput
                value={fechaDesde} min={hoyStr}
                onChange={e => setFechaDesde(e.target.value)}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-600"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Hasta</label>
              <DateInput
                value={fechaHasta} min={fechaDesde || hoyStr}
                onChange={e => setFechaHasta(e.target.value)}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-600"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Qué traspasar</label>
            <div className="flex gap-0.5 bg-raised border border-border rounded-lg p-1">
              {[
                { key: 'todos',  label: 'Todos mis alumnos' },
                { key: 'elegir', label: 'Elegir alumnos' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => cambiarModoTemp(key)}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    modoTemp === key ? 'bg-pink-600 text-white' : 'text-zinc-500 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {modoTemp === 'elegir' && (
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                Alumnos {alumnosSelecTemp.size > 0 && `(${alumnosSelecTemp.size} elegido${alumnosSelecTemp.size !== 1 ? 's' : ''})`}
              </label>
              <p className="text-[11px] text-zinc-500 mb-1.5">
                Repite la operación con otro coach para repartir el resto de tus alumnos.
              </p>
              <input
                type="text"
                placeholder="Buscar por nombre…"
                value={busquedaAlumnoTemp}
                onChange={e => setBusquedaAlumnoTemp(e.target.value)}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-600 placeholder:text-zinc-600 mb-1.5"
              />
              {alumnos.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No tienes alumnos asignados.</p>
              ) : (
                <div className="max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                  {alumnosFiltradosTemp.length === 0 ? (
                    <div className="text-xs text-zinc-600 text-center py-3">Sin resultados</div>
                  ) : alumnosFiltradosTemp.map(a => (
                    <label
                      key={a.id}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition-colors ${
                        alumnosSelecTemp.has(a.id) ? 'bg-pink-600/10 text-foreground' : 'hover:bg-hover text-foreground'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={alumnosSelecTemp.has(a.id)}
                        onChange={() => toggleAlumnoTemp(a.id)}
                        className="accent-pink-600"
                      />
                      {a.nombre} <span className="text-zinc-500 text-xs">· {a.plan}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">
              Motivo <span className="normal-case text-zinc-600">(opcional)</span>
            </label>
            <input
              type="text"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: Vacaciones"
              className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-600 placeholder:text-zinc-600"
            />
          </div>

          {errorTemp && (
            <p className="text-xs text-pink-400 bg-pink-900/20 border border-pink-900/30 rounded-lg px-3 py-2">{errorTemp}</p>
          )}

          <button
            onClick={crearTraspaso}
            disabled={guardandoTemp}
            className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
          >
            {guardandoTemp
              ? 'Guardando…'
              : modoTemp === 'elegir'
                ? `Traspasar ${alumnosSelecTemp.size || ''} alumno${alumnosSelecTemp.size !== 1 ? 's' : ''}`.replace('  ', ' ')
                : 'Traspasar todas mis clases'}
          </button>
        </div>

        {/* Lista de traspasos */}
        {traspasos.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border space-y-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Mis traspasos</div>
            {traspasos.map(t => {
              const esSaliente = t.coach_origen_id === coachId
              const otro = esSaliente ? t.destino?.nombre : t.origen?.nombre
              const vigente = t.fecha_hasta >= hoyStr
              return (
                <div key={t.id} className="flex items-center justify-between gap-3 bg-raised rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">
                      {esSaliente ? `Le traspasé a ${otro || '—'}` : `Me traspasó ${otro || '—'}`}
                      {t.alumno?.nombre && ` · ${t.alumno.nombre}`}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {formatFechaCorta(t.fecha_desde)} – {formatFechaCorta(t.fecha_hasta)}
                      {t.motivo && ` · ${t.motivo}`}
                    </div>
                  </div>
                  {vigente && (
                    <button
                      onClick={() => cancelarTraspaso(t.id)}
                      className="shrink-0 text-[11px] text-zinc-500 hover:text-pink-400 px-2.5 py-1 rounded-lg border border-border hover:border-pink-900/30 transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Traspaso permanente de alumnos ── */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-pink-900/20 flex items-center justify-center text-pink-400 text-lg font-bold shrink-0">
            →
          </div>
          <div>
            <div className="text-base font-black text-foreground">Traspaso permanente de alumnos</div>
            <div className="text-[11px] text-zinc-500">Le cambia el coach al alumno para siempre</div>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Elige uno o varios alumnos y a qué coach se los traspasas. Puedes repetir la operación
          para mandar distintos alumnos a distintos coaches.
        </p>

        {exitoPerm && (
          <p className="text-xs text-green-400 bg-green-900/10 border border-green-900/30 rounded-lg px-3 py-2 mb-3">
            ✓ {exitoPerm}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">
              Alumnos {alumnosSelec.size > 0 && `(${alumnosSelec.size} elegido${alumnosSelec.size !== 1 ? 's' : ''})`}
            </label>
            <input
              type="text"
              placeholder="Buscar por nombre…"
              value={busquedaAlumno}
              onChange={e => setBusquedaAlumno(e.target.value)}
              className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-600 placeholder:text-zinc-600 mb-1.5"
            />
            {alumnos.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">No tienes alumnos asignados.</p>
            ) : (
              <div className="max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {alumnosFiltrados.length === 0 ? (
                  <div className="text-xs text-zinc-600 text-center py-3">Sin resultados</div>
                ) : alumnosFiltrados.map(a => (
                  <label
                    key={a.id}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition-colors ${
                      alumnosSelec.has(a.id) ? 'bg-pink-600/10 text-foreground' : 'hover:bg-hover text-foreground'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={alumnosSelec.has(a.id)}
                      onChange={() => toggleAlumno(a.id)}
                      className="accent-pink-600"
                    />
                    {a.nombre} <span className="text-zinc-500 text-xs">· {a.plan}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Nuevo coach</label>
            <select
              value={coachNuevo}
              onChange={e => setCoachNuevo(e.target.value)}
              className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-600"
            >
              <option value="">Elegir coach…</option>
              {otrosCoaches.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          {errorPerm && (
            <p className="text-xs text-pink-400 bg-pink-900/20 border border-pink-900/30 rounded-lg px-3 py-2">{errorPerm}</p>
          )}

          <button
            onClick={traspasarAlumnos}
            disabled={guardandoPerm}
            className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
          >
            {guardandoPerm ? 'Traspasando…' : `Traspasar ${alumnosSelec.size > 1 ? `${alumnosSelec.size} alumnos` : 'alumno'}`}
          </button>
        </div>
      </div>

      </div>
    </div>
  )
}
