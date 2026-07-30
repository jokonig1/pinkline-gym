'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResumenSemanalRutina from './ResumenSemanalRutina'
import RutinaLogger from './RutinaLogger'

export default function ModalClase({ slot, coachId, fecha, rutasAdmin = false, onClose }) {
  const router = useRouter()
  const alumno = slot.alumno

  const [asistio,          setAsistio]          = useState(null)
  const [asistenciaId,     setAsistenciaId]     = useState(null)
  const [guardandoAsist,   setGuardandoAsist]   = useState(false)
  const [refreshResumen,   setRefreshResumen]   = useState(0)
  const [menuAbierto,      setMenuAbierto]      = useState(false)

  function irAPerfil() {
    if (!alumno?.id) return
    const base = rutasAdmin ? '/dashboard/admin/alumnos' : '/dashboard/coach/alumnos'
    router.push(`${base}/${alumno.id}`)
  }

  useEffect(() => {
    fetch(`/api/asistencias?coach_id=${coachId}&alumno_horario_id=${slot.id}&fecha=${fecha}`)
      .then(r => r.ok ? r.json() : null)
      .then(asist => { if (asist) { setAsistio(asist.asistio); setAsistenciaId(asist.id) } })
  }, [coachId, slot.id, fecha])

  async function marcarAsistencia(valor) {
    setGuardandoAsist(true)
    setAsistio(valor)
    const res = await fetch('/api/asistencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alumno_id:         alumno?.id || null,
        coach_id:          coachId,
        alumno_horario_id: slot.id,
        fecha,
        hora:              slot.hora?.slice(0, 5),
        asistio:           valor,
      }),
    })
    if (res.ok) { const d = await res.json(); setAsistenciaId(d.id) }
    setGuardandoAsist(false)
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface border border-border-strong rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88dvh]">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div>
            <div className="text-base font-black text-foreground">{alumno?.nombre || slot.invitado_nombre}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-zinc-500">{slot.hora?.slice(0, 5)}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-hover-md text-zinc-500 font-medium">
                {slot.tipo === 'semipersonalizado' ? 'Semi Personalizado' : 'Personalizado'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {alumno?.id && (
              <div className="relative">
                <button
                  onClick={() => setMenuAbierto(m => !m)}
                  className="text-zinc-600 hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md transition-all text-lg leading-none"
                  aria-label="Más opciones"
                >⋮</button>
                {menuAbierto && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
                    <div className="absolute right-0 top-9 z-20 bg-surface border border-border-strong rounded-xl shadow-xl py-1 w-36">
                      <button
                        onClick={irAPerfil}
                        className="w-full text-left px-3.5 py-2.5 text-sm text-foreground hover:bg-hover-md transition-colors"
                      >
                        Ver perfil
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="text-zinc-600 hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md transition-all"
            >✕</button>
          </div>
        </div>

        {/* Cuerpo con scroll */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Asistencia */}
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Asistencia</div>
            <div className="flex gap-2">
              {[
                { label: '✓  Asistió',     value: true,  cls: 'bg-green-600/20 border-green-600/40 text-green-400' },
                { label: '✕  No asistió', value: false, cls: 'bg-pink-600/20 border-pink-600/40 text-pink-400' },
              ].map(({ label, value, cls }) => (
                <button
                  key={String(value)}
                  disabled={guardandoAsist}
                  onClick={() => marcarAsistencia(value)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all disabled:opacity-50 ${
                    asistio === value
                      ? cls
                      : 'border-border-strong text-zinc-500 hover:text-foreground hover:border-border-strong'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {asistio !== null && (
              <div className={`mt-2 text-xs text-center font-medium ${asistio ? 'text-green-500' : 'text-pink-400'}`}>
                {asistio ? 'Asistencia registrada' : 'Inasistencia registrada'}
              </div>
            )}
          </div>

          {/* Resumen semanal de rutinas */}
          <ResumenSemanalRutina alumnoId={alumno?.id} refreshKey={refreshResumen} />

          {/* Rutina */}
          <RutinaLogger
            alumnoId={alumno?.id || null}
            coachId={coachId}
            alumnoHorarioId={slot.id}
            fecha={fecha}
            onGuardado={() => setRefreshResumen(c => c + 1)}
          />
        </div>

        {/* Footer fijo */}
        <div className="px-5 pb-5 pt-3 border-t border-border shrink-0 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
