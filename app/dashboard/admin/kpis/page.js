'use client'
import { useEffect, useState, useCallback } from 'react'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'
import { COLORES_COACH } from '@/lib/constants'

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

function StatCard({ tag, label, value, sub, color = '#ef4444', note }) {
  const strLen   = String(value).length
  const fontSize = strLen > 10 ? 'text-xl' : strLen > 7 ? 'text-2xl' : 'text-3xl'
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-36"
      style={{ borderTop: `2px solid ${color}` }}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}>
          {tag}
        </span>
        {note && <span className="text-[10px] text-zinc-600">{note}</span>}
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
  if (pct >= 0.875)  return { color: '#ef4444', label: 'Muy concurrido', bg: 'bg-red-500'    }
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
            filtroDia === null ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-foreground hover:bg-hover-md'
          }`}>
          Promedio
        </button>
        {DIAS_ORDER.map(dia => {
          if (!porDiaHora.some(d => d.dia === dia)) return null
          return (
            <button key={dia} onClick={() => setFiltroDia(dia === filtroDia ? null : dia)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                filtroDia === dia ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-foreground hover:bg-hover-md'
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
                onMouseEnter={ev => {
                  const rect = ev.currentTarget.closest('svg').getBoundingClientRect()
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
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/admin/metricas')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Error al cargar métricas.'); setLoading(false) })
  }, [])

  if (loading) return <LoadingSpinner />
  if (error)   return <div className="text-red-400 text-sm">{error}</div>

  const { alumnos, asistencia, excepciones, porPlan, porCoach, sesionesRutina, coaches, semana,
          clasesEstaSemana, ingresosMes, ingresosMesAnterior, historico = [] } = data

  function fmtPesos(n) {
    if (!n) return '$0'
    return '$' + Math.round(n).toLocaleString('es-CL')
  }
  const capacidadMax  = data.capacidadMax ?? 100
  const tasaOcupacion = Math.round(alumnos.activos / capacidadMax * 100)
  const maxPlan  = Math.max(...porPlan.map(p => p.count), 1)
  const maxCoach = Math.max(...porCoach.map(c => c.count), 1)

  function fmtFecha(str) {
    if (!str) return ''
    const [, m, d] = str.split('-')
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
    return `${parseInt(d)} ${meses[parseInt(m) - 1]}`
  }

  return (
    <div className="max-w-4xl space-y-6">

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

      {/* Fila 1: Stats principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard tag="Alumnos" label="Alumnos activos" value={alumnos.activos} color="#22c55e"
          sub={`${alumnos.inactivos} inactivos`} />
        <StatCard tag="Nuevos" label="Nuevos alumnos este mes" value={alumnos.nuevosEsteMes} color="#fbbf24" />
        <StatCard tag="Clases" label="Clases realizadas este mes" value={clasesEstaSemana ?? 0} color="#22d3ee"
          note="mes" />
        {/* Card ingresos con flecha comparativa */}
        {(() => {
          const diff   = ingresosMes - (ingresosMesAnterior || 0)
          const pct    = ingresosMesAnterior > 0 ? Math.round(Math.abs(diff) / ingresosMesAnterior * 100) : null
          const subido = diff > 0
          const igual  = diff === 0 || pct === null
          const color  = '#4ade80'
          const strLen = fmtPesos(ingresosMes).length
          const fontSize = strLen > 10 ? 'text-xl' : strLen > 7 ? 'text-2xl' : 'text-3xl'
          return (
            <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-36"
              style={{ borderTop: `2px solid ${color}` }}>
              {/* Tag */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ background: `${color}20`, color }}>
                  Ingresos
                </span>
                <span className="text-[10px] text-zinc-600">mes</span>
              </div>
              {/* Número */}
              <div className={`${fontSize} font-black leading-tight`} style={{ color }}>
                {fmtPesos(ingresosMes)}
              </div>
              {/* Comparación — misma altura que el sub de StatCard */}
              <div>
                {igual ? (
                  <span className="text-[11px] text-zinc-500">Sin cambios vs mes anterior</span>
                ) : (
                  <span className={`text-[11px] font-bold flex items-center gap-1 ${subido ? 'text-green-400' : 'text-red-400'}`}>
                    <span className="text-sm">{subido ? '↑' : '↓'}</span>
                    {pct}% vs mes anterior
                  </span>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Fila 2: Asistencia + Ocupación */}
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
              <div>
                <div className="text-2xl font-black text-green-400">{asistencia.asistieron}</div>
                <div className="text-xs text-zinc-500">asistencias</div>
              </div>
              <div>
                <div className="text-2xl font-black text-red-400">{asistencia.total - asistencia.asistieron}</div>
                <div className="text-xs text-zinc-500">inasistencias</div>
              </div>
              {asistencia.total === 0 && (
                <div className="text-xs text-zinc-600 italic self-center">Sin registros este mes</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <SectionTitle>Tasa de ocupación</SectionTitle>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Ring pct={tasaOcupacion ?? 0} color="#06b6d4" size={80} stroke={8} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black text-foreground">
                  {tasaOcupacion !== null ? `${tasaOcupacion}%` : '—'}
                </span>
              </div>
            </div>
            <div className="flex gap-4 flex-1 flex-wrap">
              <div>
                <div className="text-2xl font-black text-cyan-400">{alumnos.activos}</div>
                <div className="text-xs text-zinc-500">activos</div>
              </div>
              <div>
                <div className="text-2xl font-black text-zinc-400">{capacidadMax - (alumnos.activos ?? 0)}</div>
                <div className="text-xs text-zinc-500">cupos libres</div>
              </div>
              <div className="text-[10px] text-zinc-500 self-end">máx: {capacidadMax}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fila 3: Por plan + Por coach */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <SectionTitle>Alumnos por plan</SectionTitle>
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

        <div className="bg-surface border border-border rounded-2xl p-5">
          <SectionTitle>Alumnos por coach</SectionTitle>
          <div className="space-y-3.5">
            {porCoach.length === 0 ? (
              <p className="text-xs text-zinc-600 italic">Sin datos</p>
            ) : (
              porCoach.map(({ nombre, count, color }, i) => {
                const paleta = color !== null && color !== undefined
                  ? COLORES_COACH[Number(color) % COLORES_COACH.length]
                  : COLORES_COACH[i % COLORES_COACH.length]
                return (
                  <BarRow key={nombre} label={nombre} value={count} max={maxCoach}
                    colorHex={paleta.border} />
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Fila 4: Cancelaciones vs Reagendamientos */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <SectionTitle>Cancelaciones y reagendamientos — mes actual</SectionTitle>

        {excepciones.total === 0 ? (
          <div className="text-center py-6">
            <div className="text-xs font-bold text-green-500 uppercase tracking-widest mb-2">Sin novedades</div>
            <div className="text-sm text-zinc-500 font-medium">Sin cancelaciones ni reagendamientos esta semana</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Cancelaciones',   value: excepciones.cancelaciones,   color: '#f87171',
                sub: 'clases canceladas este mes' },
              { label: 'Reagendamientos', value: excepciones.reagendamientos,  color: '#fbbf24',
                sub: 'clases movidas este mes' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="bg-hover border border-border rounded-xl p-4 text-center"
                style={{ borderTop: `2px solid ${color}40` }}>
                <div className="text-3xl font-black" style={{ color }}>{value}</div>
                <div className="text-xs font-semibold text-zinc-500 mt-2">{label}</div>
                <div className="text-[10px] text-zinc-600 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
        )}

        {excepciones.total > 0 && (
          <div className="mt-4">
            <div className="h-3 bg-hover-md rounded-full overflow-hidden flex">
              <div className="h-full bg-red-500/70 rounded-l-full transition-all duration-700"
                style={{ width: `${Math.round(excepciones.cancelaciones / excepciones.total * 100)}%` }} />
              <div className="h-full bg-amber-400/70 rounded-r-full transition-all duration-700"
                style={{ width: `${Math.round(excepciones.reagendamientos / excepciones.total * 100)}%` }} />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-red-400">Cancelaciones</span>
              <span className="text-[10px] text-amber-400">Reagendamientos</span>
            </div>
          </div>
        )}
      </div>

      {/* Fila 5: Ocupación por horario */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <SectionTitle>Ocupación por bloque horario</SectionTitle>
        <GraficoOcupacion
          porHora={data.ocupacionPorHora || []}
          porDiaHora={data.ocupacionPorDiaHora || []}
          capacidad={data.capacidadPorBloque || 16}
        />
      </div>

      {/* Fila 6: Comparación mensual */}
      {historico.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-5">
          <SectionTitle>Evolución mensual — últimos 6 meses</SectionTitle>

          {/* Tabla comparativa */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
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
                          <div className={`text-[10px] font-bold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                          <div className={`text-[10px] font-bold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
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
                          <div className={`text-[10px] font-bold ${diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
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
                          <div className={`text-[10px] font-bold ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {diff > 0 ? '↑' : '↓'}{pct}%
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>

              </tbody>
            </table>
          </div>

          {/* Mini barras visuales para alumnos acumulados */}
          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3">Total alumnos por mes</div>
            <div className="flex items-end gap-2 h-16">
              {(() => {
                const max = Math.max(...historico.map(m => m.acumulados), 1)
                return historico.map((m, i) => {
                  const h = Math.max((m.acumulados / max) * 100, 4)
                  const esActual = i === historico.length - 1
                  return (
                    <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[9px] text-zinc-500 font-bold">{m.acumulados}</div>
                      <div
                        className="w-full rounded-t-sm transition-all duration-700"
                        style={{
                          height: `${h}%`,
                          background: esActual ? '#ef4444' : '#ef444440',
                          minHeight: 4,
                        }}
                      />
                      <div className={`text-[9px] uppercase font-bold ${esActual ? 'text-red-500' : 'text-zinc-500'}`}>
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

    </div>
  )
}
