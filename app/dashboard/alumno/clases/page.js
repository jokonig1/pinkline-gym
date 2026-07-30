'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'
import EmptyIcon from '@/app/dashboard/_components/EmptyIcon'
import { DIAS, DIAS_LABEL, HORAS } from '@/lib/constants'
import { getSemana } from '@/lib/getSemana'

const DIAS_2 = { lunes:'Lu', martes:'Ma', miercoles:'Mi', jueves:'Ju', viernes:'Vi', sabado:'Sá' }

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

// Mismo formato {bg, border, text} que COLORES_COACH, pero por estado de asistencia
// en vez de por coach — así se reutiliza el mismo patrón visual del calendario del coach.
const ESTADO_STYLE = {
  pendiente: { bg: 'rgba(113,113,122,0.15)', border: '#a1a1aa', text: '#d4d4d8', label: 'Pendiente', dot: 'bg-zinc-500' },
  asistio:   { bg: 'rgba(34,197,94,0.18)',   border: '#22c55e', text: '#4ade80', label: 'Asistió',   dot: 'bg-green-500' },
  falta:     { bg: 'rgba(239,68,68,0.18)',   border: '#ef4444', text: '#f87171', label: 'Faltó',     dot: 'bg-pink-500' },
}

export default function MisClases() {
  const [alumno,      setAlumno]      = useState(null)
  const [horarios,    setHorarios]    = useState([])
  const [excepciones, setExcepciones] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [sesiones,    setSesiones]    = useState([])
  const [loading,     setLoading]     = useState(true)

  const [vista,           setVista]           = useState('semanal')
  const [semanaOffset,    setSemanaOffset]    = useState(0)
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 5 : d - 1
  })

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setLoading(false); return }

      const alumnoRes  = await fetch(`/api/alumno/perfil?email=${encodeURIComponent(user.email)}`)
      const alumnoData = alumnoRes.ok ? await alumnoRes.json() : null
      if (!alumnoData?.id) { setLoading(false); return }
      setAlumno(alumnoData)

      const [horariosRes, asistRes, sesionesRes] = await Promise.all([
        fetch(`/api/alumno/horarios?alumno_id=${alumnoData.id}`),
        fetch(`/api/asistencias?alumno_id=${alumnoData.id}`),
        fetch(`/api/sesiones-rutina?alumno_id=${alumnoData.id}`),
      ])
      const { horarios: hrs, excepciones: excs } = horariosRes.ok
        ? await horariosRes.json()
        : { horarios: [], excepciones: [] }

      setHorarios(hrs)
      setExcepciones(excs)
      setAsistencias(asistRes.ok ? await asistRes.json() : [])
      setSesiones(sesionesRes.ok ? await sesionesRes.json() : [])
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

  if (horarios.length === 0) return (
    <div className="w-full">
      <h1 className="text-2xl font-black text-foreground mb-6">Mis clases</h1>
      <div className="bg-surface border border-border rounded-2xl p-12 text-center">
        <EmptyIcon tipo="calendario" className="w-10 h-10 mb-3 text-zinc-500" />
        <div className="text-foreground font-bold mb-1">Sin clases asignadas</div>
        <div className="text-zinc-500 text-sm">
          Tu coach todavía no asignó tus horarios. Consultale directamente.
        </div>
      </div>
    </div>
  )

  const hoy       = new Date()
  const semana    = getSemana(semanaOffset)
  const mesActual = new Date(hoy.getFullYear(), hoy.getMonth() + Math.floor(semanaOffset / 4.33), 1)

  function getEstado(alumnoHorarioId, fechaStr) {
    const a = asistencias.find(x => x.alumno_horario_id === alumnoHorarioId && x.fecha === fechaStr)
    if (!a) return 'pendiente'
    return a.asistio ? 'asistio' : 'falta'
  }

  // Si asistió y hay una rutina cargada ese día, mostrar su nombre en vez de "Asistió".
  function getLabel(estado, alumnoHorarioId, fechaStr) {
    if (estado === 'asistio') {
      const sesion = sesiones.find(s => s.alumno_horario_id === alumnoHorarioId && s.fecha === fechaStr)
      if (sesion) return sesion.rutina_nombre
    }
    return ESTADO_STYLE[estado].label
  }

  // Construir slots para un día (con excepciones aplicadas)
  function getSlotsParaDia(dia, fechaStr) {
    const regulares = horarios
      .filter(h => h.dia === dia)
      .filter(h => !h.fecha || h.fecha === fechaStr)
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

  function irADia(fecha) {
    const dow = fecha.getDay()
    const idx = dow === 0 ? 5 : dow - 1
    const ini = new Date(hoy); const td = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1
    ini.setDate(hoy.getDate() - td); ini.setHours(0, 0, 0, 0)
    const tgt = new Date(fecha); tgt.setDate(fecha.getDate() - idx); tgt.setHours(0, 0, 0, 0)
    setSemanaOffset(Math.round((tgt - ini) / (7 * 24 * 3600 * 1000)))
    setDiaSeleccionado(idx)
    setVista('diaria')
  }

  const totalClasesPorSemana = horarios.filter(h => !h.fecha).length

  const periodLabel = vista === 'mensual'
    ? mesActual.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
    : `${semana[0].fecha.toLocaleDateString('es-CL', { day:'numeric', month:'short' })} – ${semana[5].fecha.toLocaleDateString('es-CL', { day:'numeric', month:'short' })}`

  return (
    <div className="w-full">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Mis clases</h1>
          <p className="text-xs text-zinc-500 mt-1">
            {totalClasesPorSemana} clase{totalClasesPorSemana !== 1 ? 's' : ''} por semana · {alumno.plan}
          </p>
        </div>
        {/* Referencia de colores */}
        <div className="flex items-center gap-3 flex-wrap">
          {Object.values(ESTADO_STYLE).map(st => (
            <div key={st.label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${st.dot}`} />
              <span className="text-[10px] text-zinc-500">{st.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controles: tabs + navegación (mismo patrón que el calendario del coach) */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-0.5 bg-surface border border-border rounded-lg p-1">
            {[
              { key:'semanal', label:'Semanal', short:'Sem' },
              { key:'diaria',  label:'Diaria',  short:'Día' },
              { key:'mensual', label:'Mensual', short:'Mes' },
            ].map(({ key, label, short }) => (
              <button key={key} onClick={() => setVista(key)}
                className={`px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                  vista === key ? 'bg-pink-600 text-white' : 'text-zinc-500 hover:text-foreground'
                }`}>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setSemanaOffset(s => s - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-foreground hover:bg-hover-md transition-colors">←</button>
            <button
              onClick={() => {
                setSemanaOffset(0)
                setDiaSeleccionado(() => { const d = new Date().getDay(); return d === 0 ? 5 : d - 1 })
              }}
              className="text-xs text-zinc-500 hover:text-foreground px-2 py-1.5 rounded-lg border border-border hover:border-border-strong transition-colors">
              Hoy
            </button>
            <button onClick={() => setSemanaOffset(s => s + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-foreground hover:bg-hover-md transition-colors">→</button>
          </div>
        </div>

        <div className="text-sm font-semibold text-foreground capitalize">{periodLabel}</div>
      </div>

      {/* ── VISTA SEMANAL — un día por fila, de arriba hacia abajo, ancho completo ── */}
      {vista === 'semanal' && (
        <div className="space-y-2">
          {semana.map(({ dia, fecha }) => {
            const esHoy    = fecha.toDateString() === hoy.toDateString()
            const fechaStr = toDateStr(fecha)
            const slots    = getSlotsParaDia(dia, fechaStr)

            return (
              <div key={dia}
                className={`bg-surface border rounded-xl overflow-hidden transition-colors ${
                  esHoy ? 'border-pink-600/50' : 'border-border'
                }`}>
                {/* Cabecera del día */}
                <div className={`flex items-center gap-3 px-4 py-2.5 ${esHoy ? 'bg-pink-600/5' : 'bg-raised'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    esHoy ? 'bg-pink-600 text-white' : 'bg-hover text-foreground'
                  }`}>
                    {fecha.getDate()}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${esHoy ? 'text-pink-500' : 'text-foreground'}`}>
                      {DIAS_LABEL[dia]}
                      {esHoy && <span className="ml-2 text-[10px] font-normal text-pink-400">Hoy</span>}
                    </div>
                  </div>
                </div>

                {/* Clases del día */}
                {slots.length === 0 && (
                  <div className="px-4 py-3.5 border-t border-border">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sin clases</span>
                  </div>
                )}
                {slots.map(slot => {
                  const estado = getEstado(slot.id, fechaStr)
                  const st = ESTADO_STYLE[estado]
                  return (
                    <div key={slot.id}
                      className="flex items-center gap-3 px-4 py-3 border-t border-border"
                      style={{ background: st.bg }}
                    >
                      <div className="text-sm font-black w-14 shrink-0" style={{ color: st.border }}>
                        {slot.hora?.slice(0, 5)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: st.border }}>
                          {getLabel(estado, slot.id, fechaStr)}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate">
                          {slot.tipo === 'semipersonalizado' ? 'Semi Personalizado' : 'Personalizado'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* ── VISTA DIARIA ── */}
      {vista === 'diaria' && (
        <div>
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {semana.map(({ dia, fecha }, i) => {
              const esHoy = fecha.toDateString() === hoy.toDateString()
              return (
                <button key={dia} onClick={() => setDiaSeleccionado(i)}
                  className={`shrink-0 flex flex-col items-center px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
                    diaSeleccionado === i
                      ? 'bg-pink-600 text-white'
                      : 'bg-surface border border-border text-zinc-500 hover:text-foreground'
                  }`}>
                  <span className="text-[9px] uppercase tracking-widest">{DIAS_2[dia]}</span>
                  <span className={`text-sm sm:text-base font-black ${esHoy && diaSeleccionado !== i ? 'text-pink-500' : ''}`}>
                    {fecha.getDate()}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {HORAS.map(hora => {
              const diaActual = semana[diaSeleccionado]
              const fechaStr  = toDateStr(diaActual.fecha)
              const slots     = getSlotsParaDia(diaActual.dia, fechaStr).filter(s => s.hora?.slice(0,5) === hora)

              if (slots.length === 0) return (
                <div key={hora} className="flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0">
                  <span className="w-10 text-[11px] text-zinc-500 font-mono shrink-0">{hora}</span>
                  <span className="text-zinc-700 text-xs">—</span>
                </div>
              )

              return (
                <div key={hora} className="border-b border-border last:border-b-0">
                  <div className="flex items-center gap-2 px-3 pt-2 pb-0.5">
                    <span className="w-10 text-[11px] font-bold text-zinc-500 font-mono shrink-0">{hora}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 px-3 pb-2.5">
                    {slots.map((slot, i) => {
                      const estado = getEstado(slot.id, fechaStr)
                      const st = ESTADO_STYLE[estado]
                      return (
                        <div key={i}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                          style={{ background: st.bg, border: `1px solid ${st.border}30` }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate" style={{ color: st.border }}>
                              {getLabel(estado, slot.id, fechaStr)}
                            </div>
                            <div className="text-[11px] truncate" style={{ color: st.border + 'bb' }}>
                              {slot.tipo === 'semipersonalizado' ? 'Semi Personalizado' : 'Personalizado'}
                              {slot.tipo_slot === 'movida' && <span> · Reagendada</span>}
                              {slot.coach?.nombre && <span> · {slot.coach.nombre.split(' ')[0]}</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── VISTA MENSUAL ── */}
      {vista === 'mensual' && (
        <div
          className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col"
          style={{ height: 'min(calc(100dvh - 310px), 600px)', minHeight: '340px' }}
        >
          <div className="grid grid-cols-7 gap-px bg-border shrink-0">
            {['L','M','X','J','V','S','D'].map(d => (
              <div key={d} className="bg-surface py-1 text-center text-[9px] font-bold text-zinc-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-border flex-1" style={{ gridAutoRows: '1fr' }}>
            {(() => {
              const primerDia = new Date(mesActual)
              const ultimoDia = new Date(primerDia.getFullYear(), primerDia.getMonth() + 1, 0)
              const offset    = (primerDia.getDay() + 6) % 7
              const celdas    = []

              for (let i = 0; i < offset; i++) celdas.push(<div key={`e${i}`} className="bg-surface" />)

              for (let d = 1; d <= ultimoDia.getDate(); d++) {
                const fecha     = new Date(primerDia.getFullYear(), primerDia.getMonth(), d)
                const fechaStr  = toDateStr(fecha)
                const diaNombre = DIAS[(fecha.getDay() + 6) % 7]
                const esHoy     = fecha.toDateString() === hoy.toDateString()
                const esDomingo = fecha.getDay() === 0
                const slots     = esDomingo ? [] : getSlotsParaDia(diaNombre, fechaStr)

                celdas.push(
                  <div key={d}
                    onClick={() => slots.length > 0 && irADia(fecha)}
                    className={`bg-surface p-0.5 overflow-hidden transition-colors flex flex-col
                      ${slots.length > 0 ? 'cursor-pointer hover:bg-hover active:bg-hover-md' : ''}
                      ${esHoy ? 'ring-1 ring-inset ring-pink-600/40' : ''}`}
                  >
                    <div className={`text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full mx-auto mb-px shrink-0 ${
                      esHoy ? 'bg-pink-600 text-white' : esDomingo ? 'text-zinc-600' : 'text-zinc-500'
                    }`}>{d}</div>
                    <div className="space-y-px flex-1 min-h-0 overflow-hidden">
                      {slots.map((slot, i) => {
                        const estado = getEstado(slot.id, fechaStr)
                        const st = ESTADO_STYLE[estado]
                        return (
                          <div key={i}
                            className="text-[7px] px-0.5 py-px rounded truncate leading-tight"
                            style={{ background: st.bg, color: st.border }}
                          >
                            {getLabel(estado, slot.id, fechaStr)}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }
              return celdas
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
