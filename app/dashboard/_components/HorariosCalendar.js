'use client'
import { useState, Fragment, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DIAS, DIAS_LABEL, DIAS_LABEL_LARGO, HORAS, COLORES_COACH } from '@/lib/constants'
import { toDateStr, resolveColor } from './calendar/utils'
import TarjetaSemanal from './calendar/TarjetaSemanal'
import TarjetaDiaria  from './calendar/TarjetaDiaria'
import ModalMover     from './calendar/ModalMover'

const DIAS_2 = { lunes:'Lu', martes:'Ma', miercoles:'Mi', jueves:'Ju', viernes:'Vi', sabado:'Sá' }

const FORM_EXTRA_INIT = {
  alumno_id:'', busqueda:'', nombre:'', telefono:'', plan:'3x/sem', coach_id:'',
  dia:'lunes', hora:'08:00', tipo:'semipersonalizado',
}

export default function HorariosCalendar({
  horarios, excepciones, coaches, semana,
  semanaOffset, setSemanaOffset,
  onGuardar, onDeshacer,
  soloEditarCoachId = null,
}) {
  const router = useRouter()

  // Vista inicial: semanal en desktop, diaria en móvil
  const [vista, setVista] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'diaria' : 'semanal'
  )
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 5 : d - 1
  })

  // Filtro por coach
  const [coachFiltro, setCoachFiltro] = useState(soloEditarCoachId || null)

  // Modal acciones rápidas (Ver perfil / Mover clase)
  const [slotAccion,   setSlotAccion]   = useState(null)

  const [modalSlot,    setModalSlot]    = useState(null)
  const [moverForm,    setMoverForm]    = useState({ fecha_nueva:'', hora_nueva:'', motivo:'' })
  const [guardando,    setGuardando]    = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')

  // Modal agregar extra
  const [modalAgregar,   setModalAgregar]   = useState(false)
  const [paso,           setPaso]           = useState(1)
  const [tipoAlumno,     setTipoAlumno]     = useState(null)
  const [alumnos,        setAlumnos]        = useState([])
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)
  const [formExtra,      setFormExtra]      = useState(FORM_EXTRA_INIT)
  const [guardandoExtra, setGuardandoExtra] = useState(false)
  const [errorExtra,     setErrorExtra]     = useState('')
  const [capWarningExtra,setCapWarningExtra]= useState(false)
  const [exitoExtra,     setExitoExtra]     = useState(false)

  function abrirAcciones(slot) {
    setSlotAccion(slot)
  }

  function irAPerfil() {
    if (slotAccion?.alumno?.id) {
      router.push(`/dashboard/admin/alumnos/${slotAccion.alumno.id}`)
    }
    setSlotAccion(null)
  }

  function irAMover() {
    const slot = slotAccion
    setSlotAccion(null)
    abrirMover(slot)
  }

  // ── Datos ───────────────────────────────────────────────────────────────────

  const horariosFiltrados = coachFiltro
    ? horarios.filter(h => h.coach_id === coachFiltro)
    : horarios

  const hoy = new Date()
  const mesActual = new Date(hoy.getFullYear(), hoy.getMonth() + Math.floor(semanaOffset / 4.33), 1)
  const mesLabel  = mesActual.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const fmtFecha  = f => `${f.getDate()} ${f.toLocaleDateString('es-CL', { month: 'short' })}`
  const semanaLabel = semana.length >= 6 ? `${fmtFecha(semana[0].fecha)} – ${fmtFecha(semana[5].fecha)}` : ''
  const periodLabel = vista === 'mensual' ? mesLabel : semanaLabel

  function getExcepcion(hId, fechaStr) {
    return excepciones.find(e => e.alumno_horario_id === hId && e.fecha_original === fechaStr) || null
  }

  function getSlots(dia, hora, fecha) {
    const fechaStr = fecha ? toDateStr(fecha) : undefined
    if (!fechaStr) return []

    const regulares = horariosFiltrados
      .filter(h => h.dia === dia && h.hora?.slice(0,5) === hora)
      .filter(h => {
        const exc = getExcepcion(h.id, fechaStr)
        return !exc || (!exc.cancelado && !exc.fecha_nueva && !exc.hora_nueva)
      })
      .map(h => ({ ...h, excepcion: null, fechaStr, _movida: false }))

    const movidas = excepciones
      .filter(exc => {
        if (!exc.fecha_nueva || exc.cancelado) return false
        if (exc.fecha_nueva !== fechaStr) return false
        // Si no hay hora_nueva, la clase se mueve con su hora original
        const h = horarios.find(x => x.id === exc.alumno_horario_id)
        const horaEfectiva = exc.hora_nueva?.slice(0,5) || h?.hora?.slice(0,5)
        if (horaEfectiva !== hora) return false
        if (coachFiltro) return h?.coach_id === coachFiltro
        return true
      })
      .map(exc => {
        const h = horarios.find(x => x.id === exc.alumno_horario_id)
        return h ? { ...h, excepcion: exc, fechaStr: exc.fecha_original, _movida: true } : null
      })
      .filter(Boolean)

    return [...regulares, ...movidas]
  }

  // ── Modal mover ─────────────────────────────────────────────────────────────

  function abrirMover(slot) {
    const exc = slot.excepcion
    setModalSlot(slot); setErrorGuardar('')
    setMoverForm({
      fecha_nueva: exc?.fecha_nueva || '',
      hora_nueva:  exc?.hora_nueva?.slice(0,5) || slot.hora?.slice(0,5) || '',
      motivo:      exc?.motivo || '',
    })
  }

  async function guardarMover() {
    if (!moverForm.fecha_nueva || !moverForm.hora_nueva) { setErrorGuardar('Elegí la nueva fecha y hora.'); return }
    setGuardando(true); setErrorGuardar('')
    try { await onGuardar(modalSlot, moverForm); setModalSlot(null) }
    catch (err) { setErrorGuardar(err.message || 'Error al guardar.') }
    finally { setGuardando(false) }
  }

  async function restaurar() {
    if (!modalSlot?.excepcion?.id) return
    setErrorGuardar('')
    try { await onDeshacer(modalSlot.excepcion.id); setModalSlot(null) }
    catch (err) { setErrorGuardar(err.message || 'Error al restaurar.') }
  }

  function handleMesDiaClick(fecha) {
    const dow = fecha.getDay()
    const idx = dow === 0 ? 5 : dow - 1
    const ini = new Date(hoy); const td = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1
    ini.setDate(hoy.getDate() - td); ini.setHours(0,0,0,0)
    const tgt = new Date(fecha); tgt.setDate(fecha.getDate() - idx); tgt.setHours(0,0,0,0)
    setSemanaOffset(Math.round((tgt - ini) / (7*24*3600*1000)))
    setDiaSeleccionado(idx); setVista('diaria')
  }

  // ── Modal agregar extra ─────────────────────────────────────────────────────

  function abrirModalAgregar() {
    setModalAgregar(true); setPaso(1); setTipoAlumno(null); setAlumnos([])
    setFormExtra({ ...FORM_EXTRA_INIT, coach_id: soloEditarCoachId || '' })
    setErrorExtra(''); setCapWarningExtra(false); setExitoExtra(false)
  }

  function cerrarModalAgregar() {
    setModalAgregar(false)
    if (exitoExtra) window.location.reload()
  }

  async function fetchAlumnos() {
    setLoadingAlumnos(true)
    const supabase = createClient()
    let q = supabase.from('alumnos').select('id,nombre,plan,coach_id').eq('activo',true).order('nombre')
    if (soloEditarCoachId) q = q.eq('coach_id', soloEditarCoachId)
    const { data } = await q
    setAlumnos(data || [])
    setLoadingAlumnos(false)
  }

  function elegirTipo(tipo) {
    setTipoAlumno(tipo); setPaso(2)
    if (tipo === 'existente') fetchAlumnos()
  }

  async function guardarExtra(forzar = false) {
    setErrorExtra('')
    if (tipoAlumno === 'existente' && !formExtra.alumno_id) { setErrorExtra('Seleccioná un alumno.'); return }
    if (tipoAlumno === 'nuevo' && !formExtra.nombre.trim()) { setErrorExtra('El nombre es obligatorio.'); return }
    if (!forzar) {
      const supabase = createClient()
      const { data } = await supabase.from('alumno_horarios').select('hora').eq('activo',true).eq('dia',formExtra.dia)
      const count = (data||[]).filter(r => (r.hora||'').startsWith(formExtra.hora)).length
      if (count >= 16) { setCapWarningExtra(count); return }
    }
    setCapWarningExtra(false); setGuardandoExtra(true)
    const supabase = createClient()
    try {
      let alumnoId = formExtra.alumno_id
      if (tipoAlumno === 'nuevo') {
        const { data: n, error: e } = await supabase.from('alumnos')
          .insert([{ nombre: formExtra.nombre.trim(), telefono: formExtra.telefono.trim() || null,
            plan: formExtra.plan, coach_id: formExtra.coach_id || soloEditarCoachId || null, activo: true }])
          .select('id').single()
        if (e) throw new Error(e.message)
        alumnoId = n.id
      }
      const { error: errH } = await supabase.from('alumno_horarios').insert([{
        alumno_id: alumnoId, coach_id: formExtra.coach_id || soloEditarCoachId || null,
        dia: formExtra.dia, hora: formExtra.hora, tipo: formExtra.tipo, activo: true,
      }])
      if (errH) throw new Error(errH.message)
      setExitoExtra(true)
    } catch (err) { setErrorExtra(err.message || 'Error al guardar.')
    } finally { setGuardandoExtra(false) }
  }

  const alumnosFiltrados = formExtra.busqueda.trim()
    ? alumnos.filter(a => a.nombre?.toLowerCase().includes(formExtra.busqueda.toLowerCase()))
    : alumnos

  const tarjetaProps = {
    coaches, soloEditarCoachId,
    onAbrirAcciones: abrirAcciones,
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col relative">

      {/* ── Controles ── */}
      <div className="mb-3 space-y-2">

        {/* Tabs + navegación */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-0.5 bg-surface border border-border rounded-lg p-1">
            {[
              { key:'semanal', label:'Semanal', short:'Sem' },
              { key:'diaria',  label:'Diaria',  short:'Día' },
              { key:'mensual', label:'Mensual', short:'Mes' },
            ].map(({ key, label, short }) => (
              <button key={key} onClick={() => setVista(key)}
                className={`px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                  vista === key ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-foreground'
                }`}>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setSemanaOffset(s => s - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-foreground hover:bg-hover-md transition-colors">←</button>
            <button onClick={() => setSemanaOffset(0)}
              className="text-xs text-zinc-500 hover:text-foreground px-2 py-1.5 rounded-lg border border-border hover:border-border-strong transition-colors">Hoy</button>
            <button onClick={() => setSemanaOffset(s => s + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-foreground hover:bg-hover-md transition-colors">→</button>
          </div>
        </div>

        {/* Período */}
        <div className="text-sm font-semibold text-foreground capitalize">{periodLabel}</div>

        {/* Filtro por coach — desplegable */}
        {coaches.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">Ver:</span>
            {/* Dot de color del coach seleccionado */}
            {coachFiltro && (() => {
              const idx = coaches.findIndex(c => c.id === coachFiltro)
              const c   = coaches[idx]
              if (!c) return null
              const color = COLORES_COACH[(c.color != null ? Number(c.color) : idx) % COLORES_COACH.length]
              return <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color.border }} />
            })()}
            <select
              value={coachFiltro || ''}
              onChange={e => setCoachFiltro(e.target.value || null)}
              className="bg-surface border border-border text-foreground rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-red-600 transition-colors"
            >
              <option value="">Todos los coaches</option>
              {coaches.map((c, i) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── VISTA SEMANAL ─────────────────────────────────────────────────────
           Diseño mobile-first: columnas iguales con minmax(0,1fr), sin min-width
           ni overflow-x. Las columnas se comprimen para caber en cualquier pantalla.
      ── */}
      {vista === 'semanal' && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">

          {/* Cabecera de días */}
          <div className="grid gap-px bg-border"
            style={{ gridTemplateColumns: '28px repeat(6, minmax(0, 1fr))' }}>
            <div className="bg-surface" />
            {semana.map(({ dia, fecha }) => {
              const esHoy = fecha.toDateString() === hoy.toDateString()
              return (
                <div key={dia} className={`bg-surface py-1 text-center ${esHoy ? 'bg-red-600/5' : ''}`}>
                  {/* Abreviación de 2 letras en móvil, 3 letras en sm+ */}
                  <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-wide">
                    <span className="sm:hidden">{DIAS_2[dia]}</span>
                    <span className="hidden sm:inline">{DIAS_LABEL[dia]}</span>
                  </div>
                  <div className={`text-[10px] sm:text-xs font-black ${esHoy ? 'text-red-500' : 'text-foreground'}`}>
                    {fecha.getDate()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Filas de horas */}
          <div className="grid gap-px bg-border"
            style={{ gridTemplateColumns: '28px repeat(6, minmax(0, 1fr))' }}>
            {HORAS.map(hora => (
              <Fragment key={hora}>
                {/* Etiqueta de hora — solo el número en móvil */}
                <div className="bg-surface flex items-start justify-end pr-0.5 pt-0.5">
                  <span className="text-[7px] sm:text-[8px] text-zinc-500 font-mono leading-none">
                    <span className="sm:hidden">{parseInt(hora)}</span>
                    <span className="hidden sm:inline">{hora}</span>
                  </span>
                </div>
                {semana.map(({ dia, fecha }) => {
                  const slots = getSlots(dia, hora, fecha)
                  return (
                    <div key={`${dia}-${hora}`} className="bg-surface p-px min-h-9 sm:min-h-12 min-w-0 overflow-hidden">
                      {slots.map(slot => (
                        <TarjetaSemanal
                          key={`${slot.id}-${slot.fechaStr}`}
                          slot={slot}
                          {...tarjetaProps}
                        />
                      ))}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ── VISTA DIARIA ─────────────────────────────────────────────────────── */}
      {vista === 'diaria' && (
        <div>
          {/* Selector de día — chips horizontales, overflow-x solo en el chip bar */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-none"
            style={{ WebkitOverflowScrolling: 'touch' }}>
            {semana.map(({ dia, fecha }, i) => {
              const esHoy = fecha.toDateString() === hoy.toDateString()
              return (
                <button key={dia} onClick={() => setDiaSeleccionado(i)}
                  className={`shrink-0 flex flex-col items-center px-2.5 sm:px-3 py-1.5 rounded-xl transition-all ${
                    diaSeleccionado === i
                      ? 'bg-red-600 text-white'
                      : 'bg-surface border border-border text-zinc-500 hover:text-foreground'
                  }`}>
                  <span className="text-[9px] uppercase tracking-widest">{DIAS_2[dia]}</span>
                  <span className={`text-sm sm:text-base font-black ${esHoy && diaSeleccionado !== i ? 'text-red-500' : ''}`}>
                    {fecha.getDate()}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Filas de horas */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            {HORAS.map(hora => {
              const diaActual = semana[diaSeleccionado]
              const slots     = getSlots(diaActual?.dia, hora, diaActual?.fecha)

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
                    <span className="text-[10px] text-zinc-500">
                      {slots.length} {slots.length === 1 ? 'alumno' : 'alumnos'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 px-3 pb-2.5">
                    {slots.map(slot => (
                      <TarjetaDiaria
                        key={`${slot.id}-${slot.fechaStr}`}
                        slot={slot}
                        onDeshacer={onDeshacer}
                        {...tarjetaProps}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── VISTA MENSUAL ────────────────────────────────────────────────────── */}
      {vista === 'mensual' && (
        <div
          className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col"
          style={{ height: 'min(calc(100dvh - 310px), 600px)', minHeight: '340px' }}
        >
          {/* Cabecera días de la semana */}
          <div className="grid grid-cols-7 gap-px bg-border shrink-0">
            {['L','M','X','J','V','S','D'].map(d => (
              <div key={d} className="bg-surface py-1 text-center text-[9px] font-bold text-zinc-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Celdas del mes */}
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

                const slots = esDomingo ? [] : [
                  ...horariosFiltrados.filter(h => {
                    if (h.dia !== diaNombre) return false
                    const exc = getExcepcion(h.id, fechaStr)
                    return !exc || (!exc.cancelado && !exc.fecha_nueva)
                  }),
                  ...excepciones
                    .filter(exc => {
                      if (!exc.cancelado && exc.fecha_nueva === fechaStr) {
                        if (!coachFiltro) return true
                        const h = horarios.find(x => x.id === exc.alumno_horario_id)
                        return h?.coach_id === coachFiltro
                      }
                      return false
                    })
                    .map(exc => {
                      const h = horarios.find(x => x.id === exc.alumno_horario_id)
                      if (!h) return null
                      // Aplicar hora nueva si existe
                      return exc.hora_nueva ? { ...h, hora: exc.hora_nueva } : h
                    })
                    .filter(Boolean),
                ]

                celdas.push(
                  <div key={d}
                    onClick={() => !esDomingo && handleMesDiaClick(fecha)}
                    className={`bg-surface p-0.5 overflow-hidden transition-colors flex flex-col
                      ${!esDomingo ? 'cursor-pointer hover:bg-hover active:bg-hover-md' : ''}
                      ${esHoy ? 'ring-1 ring-inset ring-red-600/40' : ''}`}
                  >
                    <div className={`text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full mx-auto mb-px shrink-0 ${
                      esHoy ? 'bg-red-600 text-white' : esDomingo ? 'text-zinc-600' : 'text-zinc-500'
                    }`}>{d}</div>
                    <div className="space-y-px flex-1 min-h-0 overflow-hidden">
                      {slots.slice(0, 2).map(slot => {
                        const color = resolveColor(slot, coaches)
                        return (
                          <div key={slot.id}
                            onClick={e => {
                              e.stopPropagation()
                              abrirAcciones({ ...slot, fechaStr, excepcion: getExcepcion(slot.id, fechaStr) })
                            }}
                            className="text-[7px] px-0.5 py-px rounded truncate leading-tight cursor-pointer hover:brightness-125 active:scale-95"
                            style={{ background: color.bg, color: color.border }}
                          >
                            {slot.alumno?.nombre?.split(' ')[0]}
                          </div>
                        )
                      })}
                      {slots.length > 2 && (
                        <div className="text-[7px] text-zinc-600 px-0.5">+{slots.length - 2}</div>
                      )}
                    </div>
                  </div>
                )
              }
              return celdas
            })()}
          </div>
        </div>
      )}

      {/* ── Botón + agregar clase extra ── */}
      <button onClick={abrirModalAgregar} title="Agregar clase extra / sobrecupo"
        className="fixed bottom-6 right-6 z-20 w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-2xl font-light active:scale-95">
        +
      </button>

      {/* ── Modal acciones rápidas ── */}
      {slotAccion && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSlotAccion(null)}
        >
          <div
            className="bg-surface border border-border-strong rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Info del slot */}
            <div className="px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center text-sm font-black text-red-400 shrink-0">
                  {slotAccion.alumno?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">{slotAccion.alumno?.nombre}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {slotAccion.hora?.slice(0, 5)}
                    {' · '}
                    <span className="capitalize">{slotAccion.dia}</span>
                    {' · '}
                    {slotAccion.tipo === 'semipersonalizado' ? 'Semi Personalizado' : 'Personalizado'}
                    {slotAccion._movida && <span className="text-amber-500"> · Reagendada</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="p-3 space-y-1.5">
              <button
                onClick={irAPerfil}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-hover-md transition-colors text-left"
              >
                <span className="text-lg">◉</span>
                <div>
                  <div className="text-sm font-semibold text-foreground">Ver perfil</div>
                  <div className="text-[11px] text-zinc-500">Historial, datos y rutinas del alumno</div>
                </div>
                <span className="ml-auto text-zinc-400">›</span>
              </button>

              {(!soloEditarCoachId || slotAccion.coach_id === soloEditarCoachId) && (
                <button
                  onClick={irAMover}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-hover-md transition-colors text-left"
                >
                  <span className="text-lg">↗</span>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {slotAccion.excepcion ? 'Editar cambio' : 'Mover clase'}
                    </div>
                    <div className="text-[11px] text-zinc-500">Cambiar fecha u hora para esta semana</div>
                  </div>
                  <span className="ml-auto text-zinc-400">›</span>
                </button>
              )}
            </div>

            {/* Cancelar */}
            <div className="px-3 pb-4">
              <button
                onClick={() => setSlotAccion(null)}
                className="w-full py-3 rounded-xl border border-border-strong text-zinc-500 hover:text-foreground text-sm font-medium transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal mover ── */}
      {modalSlot && (
        <ModalMover
          slot={modalSlot} form={moverForm} setForm={setMoverForm}
          guardando={guardando} error={errorGuardar}
          onGuardar={guardarMover} onDeshacer={restaurar} onClose={() => setModalSlot(null)}
        />
      )}

      {/* ── Modal agregar clase extra ── */}
      {modalAgregar && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface border border-border-strong rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[90dvh]">

            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
              <div>
                <h3 className="text-foreground font-bold">Clase extra / sobrecupo</h3>
                {paso === 2 && (
                  <button onClick={() => { setPaso(1); setErrorExtra(''); setCapWarningExtra(false) }}
                    className="text-[11px] text-zinc-500 hover:text-foreground transition-colors mt-0.5">
                    ← Volver
                  </button>
                )}
              </div>
              <button onClick={cerrarModalAgregar}
                className="text-zinc-600 hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md transition-all">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4">
              {exitoExtra ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-500 text-2xl">✓</span>
                  </div>
                  <p className="text-foreground font-bold mb-1">¡Clase agregada!</p>
                  <p className="text-sm text-zinc-500 mb-5">
                    {tipoAlumno === 'nuevo' ? 'El alumno fue creado y su horario quedó registrado.' : 'El horario extra quedó registrado.'}
                  </p>
                  <button onClick={cerrarModalAgregar}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors">
                    Cerrar y actualizar
                  </button>
                </div>
              ) : paso === 1 ? (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500 mb-4">Este horario se agrega como clase extra, sin modificar el calendario regular del alumno.</p>
                  {[
                    { tipo:'existente', icon:'◉', titulo:'Alumno existente', sub:'Agregar una clase extra a alguien ya registrado' },
                    { tipo:'nuevo',     icon:'+',  titulo:'Alumno nuevo',     sub:'Registrar a alguien nuevo con datos básicos' },
                  ].map(({ tipo, icon, titulo, sub }) => (
                    <button key={tipo} onClick={() => elegirTipo(tipo)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-red-600/50 hover:bg-red-600/5 transition-all text-left">
                      <div className="w-10 h-10 rounded-full bg-raised flex items-center justify-center shrink-0 text-lg font-bold text-red-500">{icon}</div>
                      <div>
                        <div className="text-sm font-bold text-foreground">{titulo}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>
                      </div>
                      <span className="ml-auto text-zinc-400">›</span>
                    </button>
                  ))}
                </div>
              ) : tipoAlumno === 'existente' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Alumno</label>
                    <input type="text" placeholder="Buscar por nombre..."
                      value={formExtra.busqueda}
                      onChange={e => setFormExtra(f => ({ ...f, busqueda: e.target.value, alumno_id:'' }))}
                      className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-600"
                    />
                    {loadingAlumnos ? (
                      <div className="text-xs text-zinc-500 text-center py-4">Cargando alumnos…</div>
                    ) : (
                      <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                        {alumnosFiltrados.length === 0 ? (
                          <div className="text-xs text-zinc-600 text-center py-4">Sin resultados</div>
                        ) : alumnosFiltrados.map(a => (
                          <button key={a.id}
                            onClick={() => setFormExtra(f => ({ ...f, alumno_id: a.id, busqueda: a.nombre }))}
                            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors ${
                              formExtra.alumno_id === a.id ? 'bg-red-600/10 text-foreground' : 'hover:bg-hover text-foreground'
                            }`}>
                            <div className="w-7 h-7 rounded-full bg-red-900/20 flex items-center justify-center text-[10px] font-bold text-red-400 shrink-0">
                              {a.nombre.split(' ').map(n => n[0]).join('').slice(0,2)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-medium">{a.nombre}</div>
                              <div className="text-[10px] text-zinc-500">{a.plan}</div>
                            </div>
                            {formExtra.alumno_id === a.id && <span className="text-red-500 text-sm shrink-0">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <HorarioForm formExtra={formExtra} setFormExtra={setFormExtra} />
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Nombre completo <span className="text-red-500">*</span></label>
                    <input type="text" value={formExtra.nombre}
                      onChange={e => setFormExtra(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Ej: Juan Pérez"
                      className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Teléfono <span className="text-zinc-500 normal-case">(opcional)</span></label>
                    <input type="tel" value={formExtra.telefono}
                      onChange={e => setFormExtra(f => ({ ...f, telefono: e.target.value }))}
                      placeholder="+56 9 xxxx xxxx"
                      className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Plan</label>
                      <select value={formExtra.plan} onChange={e => setFormExtra(f => ({ ...f, plan: e.target.value }))}
                        className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600">
                        <option value="1x/sem">1x/sem</option>
                        <option value="2x/sem">2x/sem</option>
                        <option value="3x/sem">3x/sem</option>
                        <option value="4x/sem">4x/sem</option>
                        <option value="5x/sem">5x/sem</option>
                        <option value="6x/sem">6x/sem</option>
                        <option value="Full">Full</option>
                        <option value="Personalizado">Personalizado</option>
                      </select>
                    </div>
                    {!soloEditarCoachId && coaches.length > 0 && (
                      <div>
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Coach</label>
                        <select value={formExtra.coach_id} onChange={e => setFormExtra(f => ({ ...f, coach_id: e.target.value }))}
                          className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600">
                          <option value="">Sin asignar</option>
                          {coaches.map(c => <option key={c.id} value={c.id}>{c.nombre.split(' ')[0]}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <HorarioForm formExtra={formExtra} setFormExtra={setFormExtra} />
                </div>
              )}

              {capWarningExtra !== false && !exitoExtra && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-500">⚠</span>
                    <span className="text-xs font-bold text-amber-500">Bloque al límite</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-3">
                    Este bloque ya tiene <strong className="text-foreground">{capWarningExtra}/16</strong> alumnos. ¿Agregar igual?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setCapWarningExtra(false)}
                      className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-xs py-2 rounded-lg">Cancelar</button>
                    <button onClick={() => guardarExtra(true)} disabled={guardandoExtra}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                      {guardandoExtra ? 'Guardando…' : 'Agregar igual'}
                    </button>
                  </div>
                </div>
              )}

              {errorExtra && (
                <p className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2">{errorExtra}</p>
              )}
            </div>

            {paso === 2 && !exitoExtra && capWarningExtra === false && (
              <div className="px-5 pb-5 pt-3 border-t border-border shrink-0 flex gap-2">
                <button onClick={cerrarModalAgregar}
                  className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all">Cancelar</button>
                <button onClick={() => guardarExtra(false)} disabled={guardandoExtra}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                  {guardandoExtra ? 'Guardando…' : tipoAlumno === 'nuevo' ? 'Crear y agregar' : 'Agregar clase'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

function HorarioForm({ formExtra, setFormExtra }) {
  return (
    <div className="space-y-3">
      <div className="h-px bg-border" />
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Horario extra</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Día</label>
          <select value={formExtra.dia} onChange={e => setFormExtra(f => ({ ...f, dia: e.target.value }))}
            className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600">
            {['lunes','martes','miercoles','jueves','viernes','sabado'].map(d => (
              <option key={d} value={d}>{DIAS_LABEL_LARGO[d]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Hora</label>
          <select value={formExtra.hora} onChange={e => setFormExtra(f => ({ ...f, hora: e.target.value }))}
            className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600">
            {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-2">Tipo</label>
        <div className="flex gap-2">
          {[{val:'personalizado',label:'Personalizado'},{val:'semipersonalizado',label:'Semi Personalizado'}].map(({val,label}) => (
            <button key={val} type="button" onClick={() => setFormExtra(f => ({ ...f, tipo: val }))}
              className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                formExtra.tipo === val ? 'bg-red-600/15 border-red-600/40 text-red-500' : 'border-border-strong text-zinc-500 hover:text-foreground'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
