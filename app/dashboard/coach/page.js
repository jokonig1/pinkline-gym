'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ModalClase    from '@/app/dashboard/_components/ModalClase'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'

const HORAS_LABEL = {
  '06:00': '6 AM', '07:00': '7 AM', '08:00': '8 AM', '09:00': '9 AM',
  '10:00': '10 AM', '11:00': '11 AM', '12:00': '12 PM', '13:00': '1 PM',
  '16:00': '4 PM', '17:00': '5 PM', '18:00': '6 PM', '19:00': '7 PM',
  '20:00': '8 PM', '21:00': '9 PM',
}

const DIAS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

export default function CoachInicio() {
  const [profile,    setProfile]    = useState(null)
  const [clases,     setClases]     = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [modalSlot,  setModalSlot]  = useState(null)
  const [fechaHoy,   setFechaHoy]   = useState('')

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, nombre, rol')
        .eq('id', user.id)
        .single()
      setProfile(prof)
    }
    init()
  }, [])

  useEffect(() => {
    if (!profile) return
    async function load() {
      const res = await fetch(`/api/mis-clases-hoy?coach_id=${profile.id}`)
      if (!res.ok) { setLoading(false); return }

      const { horarios, excepciones, movidasHoy, asistencias: asist, fechaHoy: fh } = await res.json()
      setFechaHoy(fh)
      setAsistencias(asist)

      const slots = []
      horarios.forEach(h => {
        const exc = excepciones.find(e => e.alumno_horario_id === h.id && e.fecha_original === fh)
        if (exc?.cancelado) return
        if (exc?.fecha_nueva) return
        slots.push({ ...h, tipo_slot: 'regular' })
      })
      movidasHoy.forEach(exc => {
        if (!exc.horario) return
        slots.push({
          ...exc.horario,
          hora: exc.hora_nueva || exc.horario.hora,
          tipo_slot: 'movida',
          alumno: exc.horario.alumno,
        })
      })

      slots.sort((a, b) => (a.hora || '').localeCompare(b.hora || ''))
      setClases(slots)
      setLoading(false)
    }
    load()
  }, [profile])

  if (loading || !profile) return <LoadingSpinner />

  const nombre    = profile.nombre?.split(' ')[0] || profile.nombre
  const hoy       = new Date()
  const diaLabel  = DIAS_ES[hoy.getDay()]
  const fechaLabel = hoy.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })

  const porHora = {}
  clases.forEach(c => {
    const hora = c.hora?.slice(0, 5) || 'Sin hora'
    if (!porHora[hora]) porHora[hora] = []
    porHora[hora].push(c)
  })
  const horasOrdenadas = Object.keys(porHora).sort()

  return (
    <div className="max-w-2xl">

      {/* Bienvenida */}
      <div className="mb-6">
        <div className="text-xs text-zinc-500 tracking-widest mb-1 capitalize">
          {diaLabel}, {fechaLabel}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground">
          Bienvenido, <span className="text-red-500">{nombre}</span>
        </h1>
      </div>

      {/* Mis clases de hoy */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-foreground">Mis clases de hoy</div>
        <div className="text-xs text-zinc-600">
          {clases.length} {clases.length === 1 ? 'clase' : 'clases'}
        </div>
      </div>

      {clases.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">🏋️</div>
          <div className="text-foreground font-bold mb-1">Sin clases hoy</div>
          <div className="text-zinc-600 text-sm">Disfruta tu día libre</div>
        </div>
      ) : (
        <div className="space-y-6">
          {horasOrdenadas.map(hora => (
            <div key={hora}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  {HORAS_LABEL[hora] || hora}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                {porHora[hora].map((slot, i) => {
                  const asist = asistencias.find(a => a.alumno_horario_id === slot.id)
                  const iniciales = slot.alumno?.nombre
                    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

                  return (
                    <button
                      key={`${slot.id}-${i}`}
                      onClick={() => setModalSlot(slot)}
                      className="flex items-center gap-3 bg-surface border border-border-md rounded-2xl px-4 py-3.5 hover:bg-hover hover:border-border-strong transition-all text-left w-full sm:w-auto sm:flex-1 sm:min-w-48 active:scale-[0.98]"
                    >
                      <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center text-sm font-black text-red-400 shrink-0">
                        {iniciales}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-foreground truncate">{slot.alumno?.nombre}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {slot.tipo === 'semipersonalizado' ? 'Semi Personalizado' : 'Personalizado'}
                          {slot.tipo_slot === 'movida' && (
                            <span className="ml-1.5 text-amber-500">↗ movida</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {asist === undefined || asist === null ? (
                          <span className="text-[9px] text-zinc-700 font-medium px-2 py-1 rounded-full bg-hover border border-border">
                            Pendiente
                          </span>
                        ) : asist.asistio ? (
                          <span className="text-[9px] text-green-400 font-bold px-2 py-1 rounded-full bg-green-900/20 border border-green-900/30">
                            ✓ Asistió
                          </span>
                        ) : (
                          <span className="text-[9px] text-red-400 font-bold px-2 py-1 rounded-full bg-red-900/20 border border-red-900/30">
                            ✕ Faltó
                          </span>
                        )}
                      </div>
                      <span className="text-zinc-500 text-sm shrink-0">›</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalSlot && (
        <ModalClase
          slot={modalSlot}
          coachId={profile.id}
          fecha={fechaHoy}
          onClose={() => {
            setModalSlot(null)
            fetch(`/api/asistencias?coach_id=${profile.id}&fecha=${fechaHoy}`)
              .then(r => r.ok ? r.json() : [])
              .then(data => { if (Array.isArray(data)) setAsistencias(data) })
          }}
        />
      )}
    </div>
  )
}
