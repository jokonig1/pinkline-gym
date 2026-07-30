'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'
import RutinaLogger from '@/app/dashboard/_components/RutinaLogger'
import EmptyIcon from '@/app/dashboard/_components/EmptyIcon'

const DIAS_ORDER = ['lunes','martes','miercoles','jueves','viernes','sabado']

function hoyDia() {
  const d = new Date().getDay()
  return d === 0 ? null : DIAS_ORDER[d - 1]
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

function diasRestantes(fechaStr) {
  if (!fechaStr) return null
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const venc = new Date(fechaStr + 'T00:00:00')
  return Math.ceil((venc - hoy) / 86400000)
}

function formatFechaCorta(fechaStr) {
  if (!fechaStr) return ''
  const [, m, d] = fechaStr.split('-')
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${M[parseInt(m)-1]}`
}

export default function AlumnoInicio() {
  const [alumno,      setAlumno]      = useState(null)
  const [horarios,    setHorarios]    = useState([])
  const [excepciones, setExcepciones] = useState([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setLoading(false); return }

      const alumnoRes  = await fetch(`/api/alumno/perfil?email=${encodeURIComponent(user.email)}`)
      const alumnoData = alumnoRes.ok ? await alumnoRes.json() : null
      setAlumno(alumnoData)

      if (alumnoData?.id) {
        const horariosRes = await fetch(`/api/alumno/horarios?alumno_id=${alumnoData.id}`)
        const { horarios: hrs, excepciones: excs } = horariosRes.ok
          ? await horariosRes.json()
          : { horarios: [], excepciones: [] }
        setHorarios(hrs)
        setExcepciones(excs)
      }
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <LoadingSpinner />

  if (!alumno) return (
    <div className="bg-surface border border-border rounded-xl p-8 text-center max-w-md">
      <EmptyIcon tipo="advertencia" className="w-8 h-8 mb-3 text-zinc-500" />
      <div className="text-foreground font-bold mb-1">Perfil no encontrado</div>
      <div className="text-zinc-500 text-sm">Contacta al administrador del gimnasio.</div>
    </div>
  )

  const diasRestantesVal = diasRestantes(alumno.vencimiento_plan)
  const vecesPorSemana   = horarios.filter(h => !h.fecha).length
  const esPersonalizado  = (alumno.tipo_clase || '').toLowerCase() === 'personalizado'

  // Clases de hoy (horario fijo del día + excepciones aplicadas)
  const diaHoy = hoyDia()
  const hoyStr = toDateStr(new Date())
  const clasesHoy = diaHoy ? (() => {
    const regulares = horarios
      .filter(h => h.dia === diaHoy)
      .filter(h => !h.fecha || h.fecha === hoyStr)
      .filter(h => {
        const exc = excepciones.find(e => e.alumno_horario_id === h.id && e.fecha_original === hoyStr)
        return !exc || (!exc.cancelado && !exc.fecha_nueva)
      })

    const movidas = excepciones
      .filter(exc => exc.fecha_nueva === hoyStr && !exc.cancelado)
      .map(exc => {
        const h = horarios.find(x => x.id === exc.alumno_horario_id)
        return h ? { ...h, hora: exc.hora_nueva || h.hora } : null
      })
      .filter(Boolean)

    return [...regulares, ...movidas].sort((a,b) => (a.hora||'').localeCompare(b.hora||''))
  })() : []

  return (
    <div className="max-w-3xl space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">
          Hola, <span className="text-pink-500">{alumno.nombre?.split(' ')[0]}</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-1">Bienvenido a Pinkline</p>
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Tipo</div>
            <div className="text-sm font-bold text-foreground">
              {esPersonalizado ? 'Personalizado' : 'Semi Personalizado'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Veces por semana</div>
            <div className="text-sm font-bold text-foreground">{vecesPorSemana}x/sem</div>
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
                  ? 'text-pink-500'
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
            <div className="w-7 h-7 rounded-full bg-pink-900/30 flex items-center justify-center text-[10px] font-bold text-pink-400 shrink-0">
              {alumno.coach.nombre.split(' ').map(n => n[0]).join('').slice(0,2)}
            </div>
            <div>
              <div className="text-xs font-medium text-foreground">{alumno.coach.nombre}</div>
              <div className="text-[10px] text-zinc-500">Tu coach</div>
            </div>
          </div>
        )}
      </div>

      {/* Mi clase de hoy */}
      <div>
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Mi clase de hoy</div>

        {clasesHoy.length === 0 ? (
          <div className="bg-surface border border-border rounded-2xl p-10 text-center">
            <EmptyIcon tipo="calendario" className="w-9 h-9 mb-2 text-zinc-500" />
            <div className="text-foreground font-bold mb-1">No tienes clases hoy</div>
            <div className="text-zinc-500 text-sm">Descansa o consulta tu horario en "Mis Clases"</div>
          </div>
        ) : (
          <div className="space-y-4">
            {clasesHoy.map(slot => (
              <div key={slot.id} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm font-bold text-pink-500">{slot.hora?.slice(0,5)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-hover-md text-zinc-500 font-medium">
                    {slot.tipo === 'semipersonalizado' ? 'Semi Personalizado' : 'Personalizado'}
                  </span>
                </div>
                <RutinaLogger
                  alumnoId={alumno.id}
                  coachId={slot.coach_id || alumno.coach_id}
                  alumnoHorarioId={slot.id}
                  fecha={hoyStr}
                />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
