'use client'
import { useState, useEffect } from 'react'
import { DIAS, DIAS_LABEL } from '@/lib/constants'
import { getSemana } from '@/lib/getSemana'
import { toDateStr } from './calendar/utils'

function fmtRango(d1, d2) {
  const opts = { day: 'numeric', month: 'short' }
  return `${d1.toLocaleDateString('es-CL', opts)} – ${d2.toLocaleDateString('es-CL', opts)}`
}

export default function ResumenSemanalRutina({ alumnoId, refreshKey }) {
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [diasAlumno,   setDiasAlumno]   = useState([])
  const [sesiones,     setSesiones]     = useState([])
  const [diaExpandido, setDiaExpandido] = useState(null)

  useEffect(() => {
    if (!alumnoId) { setDiasAlumno([]); return }
    fetch(`/api/alumno/horarios?alumno_id=${alumnoId}`)
      .then(r => r.ok ? r.json() : { horarios: [] })
      .then(({ horarios }) => {
        const dias = [...new Set((horarios || []).filter(h => !h.fecha).map(h => h.dia))]
          .sort((a, b) => DIAS.indexOf(a) - DIAS.indexOf(b))
        setDiasAlumno(dias)
      })
  }, [alumnoId])

  const semana     = getSemana(semanaOffset)
  const fechaDesde  = toDateStr(semana[0].fecha)
  const fechaHasta  = toDateStr(semana[5].fecha)

  useEffect(() => {
    if (!alumnoId || diasAlumno.length === 0) { setSesiones([]); return }
    setDiaExpandido(null)
    fetch(`/api/sesiones-rutina?alumno_id=${alumnoId}&fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setSesiones(Array.isArray(data) ? data : []))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alumnoId, semanaOffset, refreshKey, diasAlumno.length, fechaDesde, fechaHasta])

  if (!alumnoId || diasAlumno.length === 0) return null

  const sesionExpandida = diaExpandido
    ? sesiones.find(s => s.fecha === toDateStr(semana.find(d => d.dia === diaExpandido).fecha))
    : null

  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Rutinas de la semana</div>

      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setSemanaOffset(o => o - 1)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-foreground hover:bg-hover-md transition-colors"
        >‹</button>
        <span className="text-[10px] text-zinc-500 capitalize">{fmtRango(semana[0].fecha, semana[5].fecha)}</span>
        <button
          onClick={() => setSemanaOffset(o => Math.min(0, o + 1))}
          disabled={semanaOffset >= 0}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-foreground hover:bg-hover-md transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        >›</button>
      </div>

      <div className="flex gap-2">
        {diasAlumno.map(dia => {
          const entry    = semana.find(d => d.dia === dia)
          const fechaStr = toDateStr(entry.fecha)
          const sesion   = sesiones.find(s => s.fecha === fechaStr)
          const activo   = diaExpandido === dia

          return (
            <button
              key={dia}
              onClick={() => sesion && setDiaExpandido(activo ? null : dia)}
              className={`flex-1 min-w-0 rounded-xl px-1.5 py-2 text-center transition-all ${
                sesion
                  ? `bg-pink-600/15 border ${activo ? 'border-pink-600' : 'border-pink-600/40'}`
                  : 'bg-hover border border-border-strong cursor-default'
              }`}
            >
              <div className={`text-[10px] font-bold uppercase ${sesion ? 'text-pink-400' : 'text-zinc-500'}`}>
                {DIAS_LABEL[dia]}
              </div>
              <div className={`text-[9px] mt-0.5 truncate ${sesion ? 'text-pink-300' : 'text-zinc-600'}`}>
                {sesion ? sesion.rutina_nombre : 'Pendiente'}
              </div>
            </button>
          )
        })}
      </div>

      {sesionExpandida && (
        <div className="mt-2 bg-raised rounded-xl p-3 space-y-2.5">
          {(sesionExpandida.ejercicios || []).map((ej, i) => (
            <div key={i}>
              <div className="text-xs font-bold text-foreground mb-1">{ej.nombre}</div>
              <div className="flex flex-wrap gap-1.5">
                {(ej.series || []).map((s, j) => (
                  <span key={j} className="text-[10px] text-zinc-500 bg-hover-md px-2 py-0.5 rounded">
                    {s.peso ? `${s.peso} kg` : '—'} × {s.reps || '—'}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {sesionExpandida.notas && (
            <div className="text-[10px] text-zinc-600 italic pt-1 border-t border-border">{sesionExpandida.notas}</div>
          )}
        </div>
      )}
    </div>
  )
}
