'use client'
import { useEffect, useState } from 'react'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'
import { COLORES_COACH } from '@/lib/constants'
import ModalCostos from './ModalCostos'

function Ring({ pct, color, size = 88, stroke = 9 }) {
  const r    = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = ((pct ?? 0) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }} />
    </svg>
  )
}

function StatCard({ tag, label, value, sub, color = '#ef4444', note, onClick }) {
  const strLen   = String(value).length
  const fontSize = strLen > 10 ? 'text-xl' : strLen > 7 ? 'text-2xl' : 'text-3xl'
  return (
    <div
      onClick={onClick}
      className={`bg-surface border border-border rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-36 ${onClick ? 'cursor-pointer hover:border-pink-500/50 hover:shadow-md transition-all' : ''}`}
      style={{ borderTop: `2px solid ${color}` }}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}>
          {tag}
        </span>
        {onClick
          ? <span className="text-[10px] text-zinc-500 flex items-center gap-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar
            </span>
          : note && <span className="text-[10px] text-zinc-600">{note}</span>
        }
      </div>
      <div className={`${fontSize} font-black leading-tight`} style={{ color }}>{value}</div>
      <div>
        <div className="text-xs text-zinc-500">{label}</div>
        {sub && <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

function BarRow({ label, value, max, colorHex, pct }) {
  const width = max > 0 ? Math.round((value / max) * 100) : (pct ?? 0)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground truncate max-w-[65%]">{label}</span>
        <span className="text-sm font-bold text-foreground shrink-0">{value}</span>
      </div>
      <div className="h-2.5 bg-hover-md rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, background: colorHex, transition: 'width 0.8s ease' }}
        />
      </div>
    </div>
  )
}

function BloqueTitulo({ children }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-1 h-5 rounded-full bg-pink-600" />
      <h2 className="text-sm font-black text-foreground uppercase tracking-widest">{children}</h2>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-4">{children}</div>
  )
}

// ── Gráfico de barras verticales: ocupación por horario ──────────────────────

const DIAS_ORDER = ['lunes','martes','miercoles','jueves','viernes','sabado']
const DIAS_SHORT  = { lunes:'Lu', martes:'Ma', miercoles:'Mi', jueves:'Ju', viernes:'Vi', sabado:'Sá' }

function nivelOcupacion(count, cap) {
  const pct = count / cap
  if (count === 0)   return { color: '#d1d5db', label: 'Sin alumnos',    bg: 'bg-zinc-200' }
  if (pct >= 0.875)  return { color: '#ef4444', label: 'Muy concurrido', bg: 'bg-pink-500'    }
  if (pct >= 0.625)  return { color: '#f59e0b', label: 'Concurrido',     bg: 'bg-amber-400'  }
  if (pct >= 0.375)  return { color: '#22c55e', label: 'Moderado',       bg: 'bg-green-500'  }
  return                    { color: '#86efac', label: 'Libre',           bg: 'bg-green-300'  }
}

function GraficoOcupacion({ porHora, porDiaHora, capacidad }) {
  const [filtroDia, setFiltroDia] = useState(null)
  const [tooltip,   setTooltip]   = useState(null) // { x, y, hora, count, nivel }

  const datos = filtroDia
    ? porDiaHora.filter(d => d.dia === filtroDia).map(d => ({ hora: d.hora, count: d.count }))
    : porHora

  if (datos.length === 0) {
    return <p className="text-xs text-zinc-600 italic text-center py-6">Sin horarios asignados</p>
  }

  const CHART_H  = 100
  const BAR_W    = 22
  const GAP      = 6
  const PAD_L    = 4
  const PAD_R    = 4
  const PAD_T    = 8
  const PAD_B    = 22
  const W        = datos.length * (BAR_W + GAP) - GAP + PAD_L + PAD_R
  const H        = CHART_H + PAD_T + PAD_B

  // Líneas de referencia (25%, 50%, 75%, 100%)
  const gridLines = [0.25, 0.5, 0.75, 1].map(pct => ({
    pct,
    y: PAD_T + CHART_H - pct * CHART_H,
  }))

  return (
    <div className="space-y-3">

      {/* Filtro por día */}
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setFiltroDia(null)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
            filtroDia === null ? 'bg-pink-600 text-white' : 'text-zinc-500 hover:text-foreground hover:bg-hover-md'
          }`}>
          Promedio
        </button>
        {DIAS_ORDER.map(dia => {
          if (!porDiaHora.some(d => d.dia === dia)) return null
          return (
            <button key={dia} onClick={() => setFiltroDia(dia === filtroDia ? null : dia)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                filtroDia === dia ? 'bg-pink-600 text-white' : 'text-zinc-500 hover:text-foreground hover:bg-hover-md'
              }`}>
              {DIAS_SHORT[dia]}
            </button>
          )
        })}
      </div>

      {/* Gráfico */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ minWidth: Math.min(W, 300), maxHeight: 160 }}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Líneas de grid */}
          {gridLines.map(({ pct, y }) => (
            <g key={pct}>
              <line
                x1={PAD_L} x2={W - PAD_R} y1={y} y2={y}
                stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.8"
                strokeDasharray={pct === 1 ? 'none' : '3 2'}
              />
              <text x={PAD_L} y={y - 2} fontSize="5.5" fill="currentColor" opacity="0.35">
                {Math.round(pct * capacidad)}
              </text>
            </g>
          ))}

          {/* Barras */}
          {datos.map(({ hora, count }, i) => {
            const nivel  = nivelOcupacion(count, capacidad)
            const barH   = count > 0 ? (count / capacidad) * CHART_H : 2
            const x      = PAD_L + i * (BAR_W + GAP)
            const y      = PAD_T + CHART_H - barH
            const hLabel = `${parseInt(hora)}h`

            return (
              <g key={hora}
                onMouseEnter={() => {
                  setTooltip({ i, hora, count, nivel })
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Zona hover invisible */}
                <rect x={x} y={PAD_T} width={BAR_W} height={CHART_H} fill="transparent" />

                {/* Barra */}
                <rect
                  x={x} y={y} width={BAR_W} height={barH}
                  rx="3"
                  fill={tooltip?.i === i ? nivel.color : nivel.color + 'cc'}
                  style={{ transition: 'height 0.6s ease, y 0.6s ease' }}
                />

                {/* Label hora */}
                <text
                  x={x + BAR_W / 2} y={H - 4}
                  textAnchor="middle" fontSize="6.5"
                  fill="currentColor" opacity="0.45"
                >
                  {hLabel}
                </text>

                {/* Número encima si hay espacio */}
                {count > 0 && barH > 14 && (
                  <text
                    x={x + BAR_W / 2} y={y + 10}
                    textAnchor="middle" fontSize="7" fontWeight="bold"
                    fill="white"
                  >
                    {count}
                  </text>
                )}
              </g>
            )
          })}
        </svg>

        {/* Tooltip flotante */}
        {tooltip && (
          <div className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none z-10">
            <div className="bg-surface border border-border-strong rounded-xl shadow-xl px-3 py-2 text-center whitespace-nowrap">
              <div className="text-xs font-bold text-foreground">{tooltip.hora}</div>
              <div className="text-lg font-black" style={{ color: tooltip.nivel.color }}>
                {tooltip.count}
                <span className="text-xs font-normal text-zinc-500">/{capacidad}</span>
              </div>
              <div className="text-[10px] font-semibold" style={{ color: tooltip.nivel.color }}>
                {tooltip.nivel.label}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-border">
        {[
          { color: '#86efac', label: 'Libre (< 38%)' },
          { color: '#22c55e', label: 'Moderado (38–62%)' },
          { color: '#f59e0b', label: 'Concurrido (63–87%)' },
          { color: '#ef4444', label: 'Muy concurrido (≥ 88%)' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="text-[10px] text-zinc-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const PLAN_COLORS = {
  '1x/sem':       '#0891b2',
  '2x/sem':       '#2563eb',
  '3x/sem':       '#16a34a',
  '4x/sem':       '#d97706',
  '5x/sem':       '#dc2626',
  '6x/sem':       '#9333ea',
  'Personalizado':'#7c3aed',
  'Sin plan':     '#52525b',
}

export default function AdminMetricas() {
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [modalCostos,  setModalCostos]  = useState(false)
  const [refetchKey,   setRefetchKey]   = useState(0)

  useEffect(() => {
    fetch('/api/admin/metricas')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Error al cargar métricas.'); setLoading(false) })
  }, [refetchKey])

  if (loading) return <LoadingSpinner />
  if (error)   return <div className="text-pink-400 text-sm">{error}</div>

  const {
    alumnos, asistencia, excepciones, porPlan, porCoach, sesionesRutina,
    semana, clasesEstaSemana, ingresosMes, ingresosMesAnterior, historico = [],
    costosFijos, margen, margenPct, puntoEquilibrio, precioPromedio,
    tasaRetencion, adherenciaRutina, asistieronMes,
  } = data

  function fmtPesos(n) {
    if (!n && n !== 0) return '—'
    const abs = Math.abs(Math.round(n))
    const str = '$' + abs.toLocaleString('es-CL')
    return n < 0 ? '-' + str : str
  }

  const capacidadMax = data.capacidadMax ?? 300
  const maxPlan      = Math.max(...porPlan.map(p => p.count), 1)
  const maxCoachRev  = Math.max(...(porCoach || []).map(c => c.revenue || 0), 1)

  function fmtFecha(str) {
    if (!str) return ''
    const [, m, d] = str.split('-')
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${parseInt(d)} ${meses[parseInt(m) - 1]}`
  }

  const tasaOcupacion = Math.round(alumnos.activos / capacidadMax * 100)

  return (
    <div className="max-w-4xl space-y-8">

      {/* Encabezado */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Métricas</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Semana: {fmtFecha(semana.inicio)} — {fmtFecha(semana.fin)}
          </p>
        </div>
        <span className="text-[10px] text-zinc-600 bg-hover border border-border px-3 py-1.5 rounded-full">
          Actualizado ahora
        </span>
      </div>

      {/* ── BLOQUE 1: ALUMNOS ── */}
      <div>
        <BloqueTitulo>Alumnos</BloqueTitulo>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard tag="Activos" label="Alumnos activos" value={alumnos.activos} color="#22c55e"
            sub={`${alumnos.inactivos} inactivos`} />
          <StatCard tag="Nuevos" label="Nuevos este mes" value={alumnos.nuevosEsteMes} color="#fbbf24" />
          <StatCard tag="Retención" label="Tasa de retención"
            value={tasaRetencion !== null ? `${tasaRetencion}%` : '—'} color="#a78bfa"
            sub={`${alumnos.total} alumnos históricos`} />
        </div>
      </div>

      {/* ── BLOQUE 2: OPERACIÓN ── */}
      <div>
        <BloqueTitulo>Operación</BloqueTitulo>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-2xl p-5">
              <SectionTitle>Tasa de asistencia semanal</SectionTitle>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Ring pct={asistencia.tasa ?? 0} color="#22c55e" size={80} stroke={8} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-black text-foreground">
                      {asistencia.tasa !== null ? `${asistencia.tasa}%` : '—'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 flex-1 flex-wrap">
                  <div><div className="text-2xl font-black text-green-400">{asistencia.asistieron}</div><div className="text-xs text-zinc-500">asistencias</div></div>
                  <div><div className="text-2xl font-black text-pink-400">{asistencia.total - asistencia.asistieron}</div><div className="text-xs text-zinc-500">inasistencias</div></div>
                  {asistencia.total === 0 && <div className="text-xs text-zinc-600 italic self-center">Sin registros</div>}
                </div>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-2xl p-5">
              <SectionTitle>Tasa de ocupación del gimnasio</SectionTitle>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <Ring pct={tasaOcupacion ?? 0} color="#06b6d4" size={80} stroke={8} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-black text-foreground">{tasaOcupacion}%</span>
                  </div>
                </div>
                <div className="flex gap-4 flex-1 flex-wrap">
                  <div><div className="text-2xl font-black text-cyan-400">{alumnos.activos}</div><div className="text-xs text-zinc-500">activos</div></div>
                  <div><div className="text-2xl font-black text-zinc-400">{capacidadMax - alumnos.activos}</div><div className="text-xs text-zinc-500">cupos libres</div></div>
                  <div className="text-[10px] text-zinc-500 self-end">máx: {capacidadMax}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5">
            <SectionTitle>Cancelaciones y reagendamientos — mes actual</SectionTitle>
            {excepciones.total === 0 ? (
              <div className="text-center py-4">
                <div className="text-xs font-bold text-green-500 uppercase tracking-widest mb-1">Sin novedades</div>
                <div className="text-sm text-zinc-500">Sin cancelaciones ni reagendamientos este mes</div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    { label: 'Cancelaciones',   value: excepciones.cancelaciones,  color: '#f87171', sub: 'clases canceladas' },
                    { label: 'Reagendamientos', value: excepciones.reagendamientos, color: '#fbbf24', sub: 'clases movidas' },
                  ].map(({ label, value, color, sub }) => (
                    <div key={label} className="bg-hover border border-border rounded-xl p-4 text-center" style={{ borderTop: `2px solid ${color}40` }}>
                      <div className="text-3xl font-black" style={{ color }}>{value}</div>
                      <div className="text-xs font-semibold text-zinc-500 mt-1">{label}</div>
                      <div className="text-[10px] text-zinc-600">{sub}</div>
                    </div>
                  ))}
                </div>
                <div className="h-3 bg-hover-md rounded-full overflow-hidden flex">
                  <div className="h-full bg-pink-500/70 rounded-l-full" style={{ width: `${Math.round(excepciones.cancelaciones / excepciones.total * 100)}%` }} />
                  <div className="h-full bg-amber-400/70 rounded-r-full" style={{ width: `${Math.round(excepciones.reagendamientos / excepciones.total * 100)}%` }} />
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-[10px] text-pink-400">Cancelaciones</span>
                  <span className="text-[10px] text-amber-400">Reagendamientos</span>
                </div>
              </>
            )}
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5">
            <SectionTitle>Ocupación por bloque horario</SectionTitle>
            <GraficoOcupacion porHora={data.ocupacionPorHora || []} porDiaHora={data.ocupacionPorDiaHora || []} capacidad={data.capacidadPorBloque || 16} />
          </div>
        </div>
      </div>

      {/* ── BLOQUE 3: FINANCIERO ── */}
      <div>
        <BloqueTitulo>Financiero</BloqueTitulo>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Ingresos con flecha */}
          {(() => {
            const diff   = ingresosMes - (ingresosMesAnterior || 0)
            const pct    = ingresosMesAnterior > 0 ? Math.round(Math.abs(diff) / ingresosMesAnterior * 100) : null
            const subido = diff > 0
            const igual  = diff === 0 || pct === null
            const color  = '#4ade80'
            const strLen = fmtPesos(ingresosMes).length
            const fs     = strLen > 10 ? 'text-xl' : strLen > 7 ? 'text-2xl' : 'text-3xl'
            return (
              <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col justify-between h-36"
                style={{ borderTop: `2px solid ${color}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: `${color}20`, color }}>Ingresos</span>
                  <span className="text-[10px] text-zinc-600">mes</span>
                </div>
                <div className={`${fs} font-black leading-tight`} style={{ color }}>{fmtPesos(ingresosMes)}</div>
                <div>
                  {igual
                    ? <span className="text-[11px] text-zinc-500">Sin cambios vs mes anterior</span>
                    : <span className={`text-[11px] font-bold flex items-center gap-1 ${subido ? 'text-green-400' : 'text-pink-400'}`}>
                        <span>{subido ? '↑' : '↓'}</span>{pct}% vs mes anterior
                      </span>
                  }
                </div>
              </div>
            )
          })()}

          <StatCard tag="Costos fijos" label="Coaches + arriendo + servicios"
            value={fmtPesos(costosFijos)} color="#f87171"
            onClick={() => setModalCostos(true)} />

          {/* Margen */}
          {(() => {
            const color = margen >= 0 ? '#4ade80' : '#f87171'
            const fs    = fmtPesos(margen).length > 10 ? 'text-xl' : 'text-2xl'
            return (
              <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col justify-between h-36"
                style={{ borderTop: `2px solid ${color}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ background: `${color}20`, color }}>Margen</span>
                  <span className="text-[10px] text-zinc-600">mes</span>
                </div>
                <div className={`${fs} font-black leading-tight`} style={{ color }}>{fmtPesos(margen)}</div>
                <div className="text-[11px] font-bold" style={{ color }}>
                  {margenPct}% del ingreso
                </div>
              </div>
            )
          })()}

          <StatCard tag="Precio prom." label="Precio promedio por alumno"
            value={fmtPesos(precioPromedio)} color="#22d3ee" />

          <StatCard tag="Punto equilibrio" label="Alumnos necesarios para cubrir costos"
            value={puntoEquilibrio !== null ? `${puntoEquilibrio} alumnos` : '—'}
            color={alumnos.activos >= (puntoEquilibrio || 0) ? '#4ade80' : '#f87171'}
            sub={alumnos.activos >= (puntoEquilibrio || 0)
              ? `✓ Superado (${alumnos.activos} activos)`
              : `Faltan ${(puntoEquilibrio || 0) - alumnos.activos}`} />

          <StatCard tag="Clases" label="Clases realizadas este mes"
            value={clasesEstaSemana ?? 0} color="#a78bfa" note="mes" />
        </div>
      </div>

      {/* ── BLOQUE 3: COACHES ── */}
      <div>
        <BloqueTitulo>Coaches</BloqueTitulo>
        <div className="bg-surface border border-border rounded-2xl p-5">
          {porCoach.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">Sin datos</p>
          ) : (
            <div className="space-y-4">
              {porCoach.map(({ nombre, count, color, revenue, costo, margen: mg, margenPct: mgPct }, i) => {
                const paleta = color !== null && color !== undefined
                  ? COLORES_COACH[Number(color) % COLORES_COACH.length]
                  : COLORES_COACH[i % COLORES_COACH.length]
                const pct = maxCoachRev > 0 ? Math.round((revenue / maxCoachRev) * 100) : 0
                const positivo = mg >= 0
                return (
                  <div key={nombre} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 items-center">
                    {/* Nombre + barra */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: paleta.border }} />
                        <span className="text-sm font-medium text-foreground truncate">{nombre}</span>
                        <span className="text-[11px] text-zinc-500 shrink-0">{count} alumnos</span>
                      </div>
                      <div className="h-2 bg-hover-md rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: paleta.border }} />
                      </div>
                    </div>
                    {/* Revenue */}
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500">Ingresos</div>
                      <div className="text-sm font-bold text-green-400">{fmtPesos(revenue)}</div>
                    </div>
                    {/* Costo */}
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500">Costo asig.</div>
                      <div className="text-sm font-bold text-pink-400">{fmtPesos(costo)}</div>
                    </div>
                    {/* Margen */}
                    <div className="text-right">
                      <div className="text-[10px] text-zinc-500">Margen</div>
                      <div className={`text-sm font-bold ${positivo ? 'text-green-400' : 'text-pink-400'}`}>
                        {fmtPesos(mg)} <span className="text-[10px]">({mgPct}%)</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── BLOQUE 4: PLANES ── */}
      <div>
        <BloqueTitulo>Planes</BloqueTitulo>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="space-y-3.5">
            {porPlan.filter(p => p.count > 0).length === 0 ? (
              <p className="text-xs text-zinc-600 italic">Sin datos</p>
            ) : (
              porPlan
                .filter(p => p.count > 0)
                .sort((a, b) => b.count - a.count)
                .map(({ plan, count }) => (
                  <BarRow key={plan} label={plan} value={count} max={maxPlan}
                    colorHex={PLAN_COLORS[plan] || '#52525b'} />
                ))
            )}
          </div>
        </div>
      </div>

      {/* ── BLOQUE 6: PROGRESO ── */}
      <div>
        <BloqueTitulo>Progreso</BloqueTitulo>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <SectionTitle>Adherencia a rutina</SectionTitle>
          <p className="text-xs text-zinc-500 mb-4">
            Porcentaje de clases asistidas en las que el coach registró la rutina completa.
          </p>
          <div className="flex items-center gap-6">
            <div className="relative shrink-0">
              <Ring pct={adherenciaRutina ?? 0} color="#a78bfa" size={88} stroke={9} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black text-foreground">
                  {adherenciaRutina !== null ? `${adherenciaRutina}%` : '—'}
                </span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <div className="text-2xl font-black text-purple-400">{sesionesRutina}</div>
                <div className="text-xs text-zinc-500">rutinas registradas este mes</div>
              </div>
              <div>
                <div className="text-2xl font-black text-zinc-400">{asistieronMes ?? 0}</div>
                <div className="text-xs text-zinc-500">clases asistidas este mes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── EVOLUCIÓN MENSUAL (histórico) ── */}
      {historico.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-5">
          <SectionTitle>Evolución mensual — últimos 6 meses</SectionTitle>

          {/* Tabla comparativa */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-130">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[10px] text-zinc-500 uppercase tracking-wider pb-3 font-medium">Métrica</th>
                  {historico.map(m => (
                    <th key={m.key} className="text-center text-[10px] text-zinc-500 uppercase tracking-wider pb-3 font-medium px-2">
                      {m.mes}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">

                {/* Alumnos acumulados */}
                <tr>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">Total alumnos</td>
                  {historico.map((m, i) => {
                    const prev = i > 0 ? historico[i-1].acumulados : null
                    const diff = prev !== null ? m.acumulados - prev : null
                    return (
                      <td key={m.key} className="text-center py-3 px-2">
                        <div className="text-base font-black text-foreground">{m.acumulados}</div>
                        {diff !== null && diff !== 0 && (
                          <div className={`text-[10px] font-bold ${diff > 0 ? 'text-green-400' : 'text-pink-400'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>

                {/* Nuevos ese mes */}
                <tr>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">Nuevos</td>
                  {historico.map(m => (
                    <td key={m.key} className="text-center py-3 px-2">
                      <div className={`text-base font-black ${m.nuevos > 0 ? 'text-green-400' : 'text-zinc-500'}`}>
                        {m.nuevos > 0 ? `+${m.nuevos}` : '—'}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Clases realizadas */}
                <tr>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">Clases realizadas</td>
                  {historico.map((m, i) => {
                    const prev = i > 0 ? historico[i-1].clasesRealizadas : null
                    const diff = prev !== null ? m.clasesRealizadas - prev : null
                    return (
                      <td key={m.key} className="text-center py-3 px-2">
                        <div className="text-base font-black text-foreground">{m.clasesRealizadas}</div>
                        {diff !== null && diff !== 0 && (
                          <div className={`text-[10px] font-bold ${diff > 0 ? 'text-green-400' : 'text-pink-400'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>

                {/* Inasistencias */}
                <tr>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">Inasistencias</td>
                  {historico.map((m, i) => {
                    const prev = i > 0 ? historico[i-1].inasistencias : null
                    const diff = prev !== null ? m.inasistencias - prev : null
                    return (
                      <td key={m.key} className="text-center py-3 px-2">
                        <div className="text-base font-black text-foreground">{m.inasistencias}</div>
                        {diff !== null && diff !== 0 && (
                          <div className={`text-[10px] font-bold ${diff > 0 ? 'text-pink-400' : 'text-green-400'}`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>

                {/* Ingresos estimados */}
                <tr>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">Ingresos est.</td>
                  {historico.map((m, i) => {
                    const prev = i > 0 ? historico[i-1].ingresos : null
                    const diff = prev !== null ? m.ingresos - prev : null
                    const pct  = prev > 0 ? Math.round(Math.abs(diff) / prev * 100) : null
                    return (
                      <td key={m.key} className="text-center py-3 px-2">
                        <div className="text-xs font-black text-green-400">{fmtPesos(m.ingresos)}</div>
                        {diff !== null && diff !== 0 && pct !== null && (
                          <div className={`text-[10px] font-bold ${diff > 0 ? 'text-green-400' : 'text-pink-400'}`}>
                            {diff > 0 ? '↑' : '↓'}{pct}%
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>

                {/* Costos */}
                <tr>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">Costos</td>
                  {historico.map((m, i) => {
                    const prev = i > 0 ? historico[i-1].costos : null
                    const diff = prev !== null ? m.costos - prev : null
                    const pct  = prev > 0 ? Math.round(Math.abs(diff) / prev * 100) : null
                    return (
                      <td key={m.key} className="text-center py-3 px-2">
                        <div className="text-xs font-black text-pink-400">{m.costos != null ? fmtPesos(m.costos) : '—'}</div>
                        {diff !== null && diff !== 0 && pct !== null && (
                          <div className={`text-[10px] font-bold ${diff > 0 ? 'text-pink-400' : 'text-green-400'}`}>
                            {diff > 0 ? '↑' : '↓'}{pct}%
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>

                {/* Margen */}
                <tr>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">Margen</td>
                  {historico.map(m => {
                    const mg = m.margen
                    const positivo = mg != null && mg >= 0
                    return (
                      <td key={m.key} className="text-center py-3 px-2">
                        <div className={`text-xs font-black ${positivo ? 'text-green-400' : 'text-pink-400'}`}>
                          {mg != null ? fmtPesos(mg) : '—'}
                        </div>
                      </td>
                    )
                  })}
                </tr>

              </tbody>
            </table>
          </div>

          {/* Barras visuales para alumnos por mes */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-4">Alumnos por mes</div>
            <div className="flex items-end gap-3" style={{ height: 140 }}>
              {(() => {
                const max = Math.max(...historico.map(m => m.acumulados), 1)
                return historico.map((m, i) => {
                  const pct   = m.acumulados > 0 ? (m.acumulados / max) * 100 : 0
                  const esActual = i === historico.length - 1
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                      {m.acumulados > 0 && (
                        <div className={`text-[10px] font-black ${esActual ? 'text-pink-400' : 'text-zinc-400'}`}>
                          {m.acumulados}
                        </div>
                      )}
                      <div
                        className="w-full rounded-t-md transition-all duration-700"
                        style={{
                          height: m.acumulados > 0 ? `${pct}%` : 3,
                          background: esActual
                            ? '#ef4444'
                            : m.acumulados > 0 ? '#ef444460' : '#ffffff0a',
                          minHeight: m.acumulados > 0 ? 12 : 3,
                        }}
                      />
                      <div className={`text-[9px] uppercase font-bold tracking-wider ${esActual ? 'text-pink-500' : 'text-zinc-500'}`}>
                        {m.mes}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}

      <ModalCostos
        open={modalCostos}
        onClose={() => setModalCostos(false)}
        onSaved={() => setRefetchKey(k => k + 1)}
      />

    </div>
  )
}
