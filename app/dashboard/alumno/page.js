'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return ''
  const [, m, d] = fechaStr.split('-')
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${M[parseInt(m)-1]}`
}

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const [y, m, d] = fechaStr.split('-')
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${M[parseInt(m)-1]} ${y}`
}

function diasRestantes(fechaStr) {
  if (!fechaStr) return null
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const venc = new Date(fechaStr + 'T00:00:00')
  return Math.ceil((venc - hoy) / 86400000)
}

function getMesLabel(ym) {
  const [y, m] = ym.split('-')
  return new Date(+y, +m-1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

function getWeekOfMonth(f) { return Math.ceil(parseInt(f.split('-')[2]) / 7) }

// ── Gráfico de peso (SVG puro) ─────────────────────────────────────────────

function GraficoPeso({ datos }) {
  if (datos.length < 2) return (
    <div className="text-center py-8 text-zinc-600 text-xs">
      Registrá al menos 2 pesos para ver el gráfico
    </div>
  )

  const W = 500, H = 140
  const PAD = { t: 16, r: 16, b: 28, l: 40 }
  const cW  = W - PAD.l - PAD.r
  const cH  = H - PAD.t - PAD.b

  const pesos  = datos.map(d => parseFloat(d.peso_kg))
  const minP   = Math.floor(Math.min(...pesos)) - 1
  const maxP   = Math.ceil(Math.max(...pesos))  + 1
  const rangeP = maxP - minP || 1

  const x = i  => PAD.l + (i / (datos.length - 1)) * cW
  const y = p  => PAD.t + cH - ((p - minP) / rangeP) * cH

  const linePath = datos
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(parseFloat(d.peso_kg)).toFixed(1)}`)
    .join(' ')

  const areaPath = [
    ...datos.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(parseFloat(d.peso_kg)).toFixed(1)}`),
    `L ${x(datos.length-1).toFixed(1)} ${(PAD.t+cH).toFixed(1)}`,
    `L ${PAD.l.toFixed(1)} ${(PAD.t+cH).toFixed(1)} Z`,
  ].join(' ')

  // Ticks Y
  const ticks = Array.from({ length: 4 }, (_, i) => minP + Math.round((rangeP / 3) * i))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      <defs>
        <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dc2626" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {ticks.map(t => (
        <g key={t}>
          <line x1={PAD.l} x2={PAD.l+cW} y1={y(t)} y2={y(t)}
            stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
          <text x={PAD.l-6} y={y(t)+4} textAnchor="end"
            fontSize="9" fill="currentColor" opacity="0.4">{t}</text>
        </g>
      ))}

      {/* Área bajo la línea */}
      <path d={areaPath} fill="url(#pesoGrad)" />

      {/* Línea */}
      <path d={linePath} fill="none" stroke="#dc2626" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Puntos + tooltip en title */}
      {datos.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(parseFloat(d.peso_kg))} r="4"
            fill="#dc2626" stroke="var(--bg-surface)" strokeWidth="2" />
          <title>{formatFechaCorta(d.fecha)}: {d.peso_kg} kg</title>
        </g>
      ))}

      {/* Etiquetas X: primero y último */}
      {[0, datos.length - 1].map(i => (
        <text key={i} x={x(i)} y={H - 4} textAnchor={i === 0 ? 'start' : 'end'}
          fontSize="9" fill="currentColor" opacity="0.4">
          {formatFechaCorta(datos[i].fecha)}
        </text>
      ))}
    </svg>
  )
}

// ── Historial de rutinas ──────────────────────────────────────────────────────

function HistorialRutinas({ sesiones }) {
  const [abiertos, setAbiertos] = useState(() => {
    if (!sesiones.length) return {}
    return { [sesiones[0].fecha.substring(0, 7)]: true }
  })

  if (!sesiones.length) return (
    <div className="bg-surface border border-border rounded-xl p-8 text-center">
      <div className="text-3xl mb-2">🏋️</div>
      <div className="text-foreground font-bold text-sm mb-1">Sin sesiones todavía</div>
      <div className="text-zinc-600 text-xs">Tus rutinas aparecerán aquí después de entrenar</div>
    </div>
  )

  const porMes = {}
  sesiones.forEach(s => {
    const mes = s.fecha.substring(0, 7)
    if (!porMes[mes]) porMes[mes] = []
    porMes[mes].push(s)
  })

  return (
    <div className="space-y-2">
      {Object.keys(porMes).sort().reverse().map(mes => {
        const isOpen  = !!abiertos[mes]
        const sessMes = porMes[mes]

        const porSemana = {}
        sessMes.forEach(s => {
          const w = getWeekOfMonth(s.fecha)
          if (!porSemana[w]) porSemana[w] = []
          porSemana[w].push(s)
        })
        const semanas = Object.keys(porSemana).map(Number).sort()

        return (
          <div key={mes} className="border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setAbiertos(p => ({ ...p, [mes]: !p[mes] }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-hover transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-foreground capitalize">{getMesLabel(mes)}</span>
                <span className="text-[10px] bg-hover-md text-zinc-500 px-2 py-0.5 rounded-full">
                  {sessMes.length} sesión{sessMes.length !== 1 ? 'es' : ''}
                </span>
              </div>
              <span className="text-zinc-500 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div className="border-t border-border">
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
                  {semanas.map(w => (
                    <div key={w} className="flex-1 flex flex-col">
                      <div className="px-3 py-2 bg-raised border-b border-border">
                        <div className="text-[11px] font-bold text-foreground uppercase tracking-wider">Semana {w}</div>
                        <div className="text-[10px] text-zinc-500">{porSemana[w].map(s => formatFechaCorta(s.fecha)).join(' · ')}</div>
                      </div>
                      <div className="p-3 space-y-4">
                        {porSemana[w].map((sesion, idx) => (
                          <div key={sesion.id}>
                            {idx > 0 && <div className="border-t border-border mb-4" />}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider">{sesion.rutina_nombre}</span>
                              <span className="text-[9px] text-zinc-500">{formatFechaCorta(sesion.fecha)}</span>
                            </div>
                            <div className="space-y-2">
                              {(sesion.ejercicios || []).map((ej, i) => (
                                <div key={i}>
                                  <div className="text-[10px] text-zinc-500 mb-1">{ej.nombre}</div>
                                  <div className="flex flex-wrap gap-1">
                                    {(ej.series || []).map((s, j) => (
                                      <span key={j} className="text-[10px] font-bold text-foreground bg-hover-md border border-border px-1.5 py-0.5 rounded">
                                        {s.peso ? `${s.peso}kg` : '—'}<span className="text-zinc-500 font-normal">×</span>{s.reps || '—'}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Sección de peso corporal ──────────────────────────────────────────────────

function SeccionPeso({ alumnoId }) {
  const [registros, setRegistros] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [peso,      setPeso]      = useState('')
  const [fecha,     setFecha]     = useState(new Date().toISOString().split('T')[0])
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    fetch(`/api/alumno/peso?alumno_id=${alumnoId}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { setRegistros(d); setLoading(false) })
  }, [alumnoId])

  async function guardar(e) {
    e.preventDefault()
    if (!peso || isNaN(parseFloat(peso))) { setError('Ingresá un peso válido'); return }
    setGuardando(true); setError('')
    const res = await fetch('/api/alumno/peso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumno_id: alumnoId, fecha, peso_kg: parseFloat(peso) }),
    })
    if (res.ok) {
      const nuevo = await res.json()
      setRegistros(prev => {
        const sin = prev.filter(r => r.fecha !== nuevo.fecha)
        return [...sin, nuevo].sort((a,b) => a.fecha.localeCompare(b.fecha))
      })
      setPeso('')
    } else {
      setError('Error al guardar')
    }
    setGuardando(false)
  }

  async function eliminar(id) {
    await fetch(`/api/alumno/peso?id=${id}`, { method: 'DELETE' })
    setRegistros(prev => prev.filter(r => r.id !== id))
  }

  const ultimo = registros[registros.length - 1]
  const primero = registros[0]

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Peso corporal</div>
          {ultimo && (
            <div className="text-2xl font-black text-foreground">
              {ultimo.peso_kg} <span className="text-sm font-normal text-zinc-500">kg</span>
              {registros.length > 1 && (() => {
                const diff = parseFloat(ultimo.peso_kg) - parseFloat(primero.peso_kg)
                const color = diff < 0 ? 'text-green-500' : diff > 0 ? 'text-red-400' : 'text-zinc-500'
                return (
                  <span className={`text-sm font-bold ml-2 ${color}`}>
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                  </span>
                )
              })()}
            </div>
          )}
        </div>
        {ultimo && (
          <div className="text-xs text-zinc-500">Último: {formatFechaCorta(ultimo.fecha)}</div>
        )}
      </div>

      {/* Gráfico */}
      {loading ? (
        <div className="h-24 flex items-center justify-center text-zinc-600 text-xs">Cargando…</div>
      ) : (
        <GraficoPeso datos={registros} />
      )}

      {/* Form agregar peso */}
      <form onSubmit={guardar} className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
            Registrar peso
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              min="30"
              max="300"
              value={peso}
              onChange={e => setPeso(e.target.value)}
              placeholder="kg"
              className="w-24 bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
            />
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="flex-1 bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={guardando}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          {guardando ? '…' : 'Agregar'}
        </button>
      </form>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Últimos registros */}
      {registros.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto">
          {[...registros].reverse().slice(0, 8).map(r => (
            <div key={r.id} className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">{formatFecha(r.fecha)}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold text-foreground">{r.peso_kg} kg</span>
                <button onClick={() => eliminar(r.id)}
                  className="text-zinc-600 hover:text-red-400 transition-colors">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AlumnoProgreso() {
  const [alumno,   setAlumno]   = useState(null)
  const [sesiones, setSesiones] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setLoading(false); return }

      const alumnoRes  = await fetch(`/api/alumno/perfil?email=${encodeURIComponent(user.email)}`)
      const alumnoData = alumnoRes.ok ? await alumnoRes.json() : null
      setAlumno(alumnoData)

      if (alumnoData?.id) {
        const sRes = await fetch(`/api/sesiones-rutina?alumno_id=${alumnoData.id}`)
        setSesiones(sRes.ok ? await sRes.json() : [])
      }
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <LoadingSpinner />

  if (!alumno) return (
    <div className="bg-surface border border-border rounded-xl p-8 text-center max-w-md">
      <div className="text-3xl mb-3">⚠️</div>
      <div className="text-foreground font-bold mb-1">Perfil no encontrado</div>
      <div className="text-zinc-500 text-sm">Contactá al administrador del gimnasio.</div>
    </div>
  )

  const totalSesiones = sesiones.length
  const ultimaSesion  = sesiones[0]?.fecha
  const rutinasUnicas = [...new Set(sesiones.map(s => s.rutina_nombre))].length

  const diasRestantesVal = diasRestantes(alumno.vencimiento_plan)

  return (
    <div className="max-w-2xl space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">
          Hola, <span className="text-red-500">{alumno.nombre?.split(' ')[0]}</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Tu progreso en Redline</p>
      </div>

      {/* Card de plan */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest">Mi plan</div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
            alumno.activo ? 'bg-green-500/10 text-green-500' : 'bg-zinc-500/10 text-zinc-500'
          }`}>
            {alumno.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Plan</div>
            <div className="text-sm font-bold text-foreground">{alumno.plan || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Miembro desde</div>
            <div className="text-sm font-bold text-foreground">
              {alumno.created_at
                ? new Date(alumno.created_at).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })
                : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Vencimiento</div>
            {alumno.vencimiento_plan ? (
              <div className={`text-sm font-bold ${
                diasRestantesVal !== null && diasRestantesVal <= 7
                  ? 'text-red-500'
                  : 'text-foreground'
              }`}>
                {formatFechaCorta(alumno.vencimiento_plan)}
                {diasRestantesVal !== null && (
                  <span className="text-[10px] font-normal text-zinc-500 ml-1.5">
                    ({diasRestantesVal > 0 ? `${diasRestantesVal}d` : 'Vencido'})
                  </span>
                )}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">—</div>
            )}
          </div>
        </div>

        {alumno.coach?.nombre && (
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-red-900/30 flex items-center justify-center text-[10px] font-bold text-red-400 shrink-0">
              {alumno.coach.nombre.split(' ').map(n => n[0]).join('').slice(0,2)}
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">{alumno.coach.nombre}</div>
              <div className="text-[10px] text-zinc-500">Tu coach</div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sesiones',  value: totalSesiones,                                     sub: 'registradas' },
          { label: 'Último',    value: ultimaSesion ? formatFechaCorta(ultimaSesion) : '—', sub: 'entrenamiento' },
          { label: 'Rutinas',   value: rutinasUnicas,                                      sub: 'distintas' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-surface border border-border rounded-xl p-4 text-center">
            <div className="text-xl font-black text-foreground leading-none">{value}</div>
            <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Peso corporal */}
      <SeccionPeso alumnoId={alumno.id} />

      {/* Historial */}
      <div>
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Historial de rutinas</div>
        <HistorialRutinas sesiones={sesiones} />
      </div>

    </div>
  )
}
