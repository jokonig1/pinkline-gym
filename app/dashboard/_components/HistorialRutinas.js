'use client'
import { useState } from 'react'

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return ''
  const [, m, d] = fechaStr.split('-')
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${meses[parseInt(m) - 1]}`
}

function getMesLabel(yearMonth) {
  const [year, month] = yearMonth.split('-')
  return new Date(parseInt(year), parseInt(month) - 1, 1)
    .toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
}

function getWeekOfMonth(fechaStr) {
  return Math.ceil(parseInt(fechaStr.split('-')[2]) / 7)
}

// ── Historial de rutinas con vista por mes y semanas ──────────────────────────

export default function HistorialRutinas({ sesiones }) {
  const [abiertos, setAbiertos] = useState(() => {
    if (!sesiones.length) return {}
    return { [sesiones[0].fecha.substring(0, 7)]: true }
  })
  // Semanas desplegadas en mobile (en desktop siempre se ven, esto no aplica ahí)
  const [semanasAbiertas, setSemanasAbiertas] = useState({})

  function toggle(mes) {
    setAbiertos(prev => ({ ...prev, [mes]: !prev[mes] }))
  }

  if (!sesiones.length) {
    return (
      <p className="text-sm text-zinc-600 text-center py-6">Sin sesiones registradas todavía</p>
    )
  }

  // Agrupar por mes
  const porMes = {}
  sesiones.forEach(s => {
    const mes = s.fecha.substring(0, 7)
    if (!porMes[mes]) porMes[mes] = []
    porMes[mes].push(s)
  })
  const meses = Object.keys(porMes).sort().reverse()

  return (
    <div className="space-y-2">
      {meses.map(mes => {
        const sesionsMes = porMes[mes]
        const isOpen = !!abiertos[mes]

        // Agrupar por semana del mes
        const porSemana = {}
        sesionsMes.forEach(s => {
          const w = getWeekOfMonth(s.fecha)
          if (!porSemana[w]) porSemana[w] = []
          porSemana[w].push(s)
        })
        const semanas = Object.keys(porSemana).map(Number).sort()

        return (
          <div key={mes} className="border border-border rounded-xl overflow-hidden">

            {/* Cabecera del mes */}
            <button
              onClick={() => toggle(mes)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-surface hover:bg-hover transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-foreground capitalize">
                  {getMesLabel(mes)}
                </span>
                <span className="text-[10px] bg-hover-md text-zinc-500 px-2 py-0.5 rounded-full">
                  {sesionsMes.length} {sesionsMes.length === 1 ? 'sesión' : 'sesiones'}
                </span>
              </div>
              <span className="text-zinc-500 text-xs">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Cuerpo: columnas por semana (con scroll horizontal si no entran todas) */}
            {isOpen && (
              <div className="border-t border-border">
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
                  {semanas.map(w => {
                    const abiertaDefault = w === semanas[semanas.length - 1]
                    const semanaAbierta = semanasAbiertas[`${mes}-${w}`] ?? abiertaDefault
                    return (
                    <div key={w} className="flex flex-col md:flex-1 md:min-w-0">

                      {/* Cabecera de semana: desplegable en mobile, siempre visible el contenido en desktop */}
                      <button
                        onClick={() => setSemanasAbiertas(prev => ({ ...prev, [`${mes}-${w}`]: !semanaAbierta }))}
                        className="w-full flex items-center justify-between px-2 py-2.5 bg-raised border-b border-border shrink-0 text-left md:cursor-default"
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-foreground uppercase tracking-wider truncate">
                            Semana {w}
                          </div>
                          <div className="text-[9px] text-zinc-500 mt-0.5 truncate">
                            {porSemana[w].map(s => formatFechaCorta(s.fecha)).join(' · ')}
                          </div>
                        </div>
                        <span className="md:hidden text-zinc-500 text-[10px] shrink-0 ml-1">
                          {semanaAbierta ? '▲' : '▼'}
                        </span>
                      </button>

                      {/* Sesiones de la semana */}
                      <div className={`${semanaAbierta ? 'block' : 'hidden'} md:block p-2 space-y-3`}>
                        {porSemana[w].map((sesion, idx) => (
                          <div key={sesion.id}>
                            {/* Si hay más de 1 sesión en la semana, separar con línea */}
                            {idx > 0 && <div className="border-t border-border mb-3" />}

                            {/* Nombre de rutina (partido en líneas por "/" solo en desktop) + fecha */}
                            <div className="mb-2">
                              <div className="text-[10px] font-bold text-pink-500 uppercase tracking-wider leading-tight">
                                <span className="md:hidden">{sesion.rutina_nombre}</span>
                                <span className="hidden md:block">
                                  {sesion.rutina_nombre.split('/').map((parte, i) => (
                                    <div key={i}>{parte.trim()}</div>
                                  ))}
                                </span>
                              </div>
                              <span className="text-[9px] text-zinc-500">
                                {formatFechaCorta(sesion.fecha)}
                              </span>
                            </div>

                            {/* Ejercicios: en fila en mobile (hay ancho de sobra), apiladas hacia
                                abajo en desktop (donde compiten por ancho 5 columnas angostas) */}
                            <div className="space-y-2">
                              {(sesion.ejercicios || []).map((ej, i) => (
                                <div key={i}>
                                  <div className="text-[9px] text-zinc-500 mb-1 truncate" title={ej.nombre}>
                                    {ej.nombre}
                                  </div>
                                  <div className="flex flex-wrap md:flex-col gap-1 items-start">
                                    {(ej.series || []).map((serie, j) => (
                                      <span
                                        key={j}
                                        className="text-[9px] font-bold text-foreground bg-hover-md border border-border px-1.5 py-0.5 rounded"
                                      >
                                        {serie.peso ? `${serie.peso}kg` : '—'}
                                        <span className="text-zinc-500 font-normal">×</span>
                                        {serie.reps || '—'}
                                      </span>
                                    ))}
                                    {(!ej.series || ej.series.length === 0) && (
                                      <span className="text-[9px] text-zinc-600">—</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {sesion.notas && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <span className="text-[9px] text-zinc-500 italic">{sesion.notas}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
