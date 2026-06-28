'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'

const DIAS_ORDER = ['lunes','martes','miercoles','jueves','viernes','sabado']
const DIAS_LABEL = { lunes:'Lunes', martes:'Martes', miercoles:'Miércoles', jueves:'Jueves', viernes:'Viernes', sabado:'Sábado' }
const DIAS_ES    = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

function hoyDia() {
  const d = new Date().getDay()
  return d === 0 ? null : DIAS_ORDER[d - 1]
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function getSemanaActual() {
  const hoy = new Date()
  hoy.setHours(0,0,0,0)
  const dow = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1 // 0=Lun
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - dow)
  return DIAS_ORDER.map((dia, i) => {
    const fecha = new Date(lunes)
    fecha.setDate(lunes.getDate() + i)
    return { dia, fecha, fechaStr: toDateStr(fecha) }
  })
}

export default function MisClases() {
  const [alumno,      setAlumno]      = useState(null)
  const [horarios,    setHorarios]    = useState([])
  const [excepciones, setExcepciones] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [semana]                      = useState(getSemanaActual)
  const [vista,       setVista]       = useState('semana')

  const diaHoy = hoyDia()

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setLoading(false); return }

      // Buscar perfil por email (API usa supabaseAdmin — bypasea RLS)
      const alumnoRes  = await fetch(`/api/alumno/perfil?email=${encodeURIComponent(user.email)}`)
      const alumnoData = alumnoRes.ok ? await alumnoRes.json() : null
      if (!alumnoData?.id) { setLoading(false); return }
      setAlumno(alumnoData)

      // Cargar horarios y excepciones via API (supabaseAdmin — bypasea RLS)
      const horariosRes = await fetch(`/api/alumno/horarios?alumno_id=${alumnoData.id}`)
      const { horarios: hrs, excepciones: excs } = horariosRes.ok
        ? await horariosRes.json()
        : { horarios: [], excepciones: [] }

      setHorarios(hrs)
      setExcepciones(excs)
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

  if (horarios.length === 0) return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-black text-foreground mb-6">Mis clases</h1>
      <div className="bg-surface border border-border rounded-2xl p-12 text-center">
        <div className="text-4xl mb-3">📅</div>
        <div className="text-foreground font-bold mb-1">Sin clases asignadas</div>
        <div className="text-zinc-500 text-sm">
          Tu coach todavía no asignó tus horarios. Consultale directamente.
        </div>
      </div>
    </div>
  )

  // Construir slots para la semana (con excepciones aplicadas)
  function getSlotsParaDia(dia, fechaStr) {
    const regulares = horarios
      .filter(h => h.dia === dia)
      .filter(h => {
        const exc = excepciones.find(e => e.alumno_horario_id === h.id && e.fecha_original === fechaStr)
        return !exc || (!exc.cancelado && !exc.fecha_nueva)
      })
      .map(h => ({ ...h, tipo_slot: 'regular', exc: null }))

    const movidas = excepciones
      .filter(exc => exc.fecha_nueva === fechaStr && !exc.cancelado)
      .map(exc => {
        const h = horarios.find(x => x.id === exc.alumno_horario_id)
        return h ? { ...h, hora: exc.hora_nueva || h.hora, tipo_slot: 'movida', exc } : null
      })
      .filter(Boolean)

    return [...regulares, ...movidas].sort((a,b) => (a.hora||'').localeCompare(b.hora||''))
  }

  const totalClasesPorSemana = horarios.length

  return (
    <div className="max-w-lg">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Mis clases</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {totalClasesPorSemana} clase{totalClasesPorSemana !== 1 ? 's' : ''} por semana · {alumno.plan}
          </p>
        </div>
        <div className="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {[{ k:'semana', l:'Semana' }, { k:'lista', l:'Lista' }].map(({ k, l }) => (
            <button key={k} onClick={() => setVista(k)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                vista === k ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-foreground'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Vista semana — días con slots */}
      {vista === 'semana' && (
        <div className="space-y-2">
          {semana.map(({ dia, fecha, fechaStr }) => {
            const slots  = getSlotsParaDia(dia, fechaStr)
            const esHoy  = dia === diaHoy && fecha.toDateString() === new Date().toDateString()
            const esPast = fecha < new Date(new Date().setHours(0,0,0,0))

            return (
              <div key={dia}
                className={`bg-surface border rounded-xl overflow-hidden transition-colors ${
                  esHoy ? 'border-red-600/50' : 'border-border'
                }`}>
                {/* Cabecera del día */}
                <div className={`flex items-center gap-3 px-4 py-2.5 ${esHoy ? 'bg-red-600/5' : 'bg-raised'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    esHoy ? 'bg-red-600 text-white' : esPast ? 'bg-hover-md text-zinc-500' : 'bg-hover text-foreground'
                  }`}>
                    {fecha.getDate()}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${esHoy ? 'text-red-500' : esPast ? 'text-zinc-500' : 'text-foreground'}`}>
                      {DIAS_LABEL[dia]}
                      {esHoy && <span className="ml-2 text-[10px] font-normal text-red-400">Hoy</span>}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                  {slots.length === 0 && (
                    <span className="text-[10px] text-zinc-600">Sin clases</span>
                  )}
                </div>

                {/* Slots del día */}
                {slots.map((slot, i) => (
                  <div key={`${slot.id}-${i}`}
                    className="flex items-center gap-3 px-4 py-3 border-t border-border">
                    <div className="text-sm font-bold text-red-500 w-12 shrink-0">
                      {slot.hora?.slice(0,5)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">
                        {slot.tipo === 'semipersonalizado' ? 'Semi Personalizado' : 'Personalizado'}
                        {slot.tipo_slot === 'movida' && (
                          <span className="ml-1.5 text-[10px] text-amber-500 font-normal">↗ reagendada</span>
                        )}
                      </div>
                      {slot.coach?.nombre && (
                        <div className="text-[11px] text-zinc-500">Coach: {slot.coach.nombre}</div>
                      )}
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      slot.tipo === 'semipersonalizado' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'
                    }`}>
                      {slot.tipo === 'semipersonalizado' ? 'Semi' : 'Personal'}
                    </span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {/* Vista lista — horario fijo semanal */}
      {vista === 'lista' && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-raised border-b border-border">
            <div className="text-xs text-zinc-500 uppercase tracking-widest">Horario fijo semanal</div>
          </div>
          {DIAS_ORDER.map(dia => {
            const slots = horarios.filter(h => h.dia === dia)
              .sort((a,b) => (a.hora||'').localeCompare(b.hora||''))
            if (slots.length === 0) return null
            return (
              <div key={dia} className="border-b border-border last:border-b-0">
                <div className="px-4 py-2 bg-hover/50">
                  <div className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                    {DIAS_LABEL[dia]}
                  </div>
                </div>
                {slots.map(slot => (
                  <div key={slot.id} className="flex items-center gap-3 px-4 py-3 border-t border-border first:border-t-0">
                    <div className="text-sm font-bold text-red-500 w-12 shrink-0">{slot.hora?.slice(0,5)}</div>
                    <div className="flex-1 text-sm text-foreground">
                      {slot.tipo === 'semipersonalizado' ? 'Semi Personalizado' : 'Personalizado'}
                    </div>
                    {slot.coach?.nombre && (
                      <div className="text-[11px] text-zinc-500">{slot.coach.nombre}</div>
                    )}
                  </div>
                ))}
              </div>
            )
          }).filter(Boolean)}
        </div>
      )}
    </div>
  )
}
