'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DIAS_POR_PLAN } from '@/lib/constants'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'
import StatusBadge from '@/app/dashboard/_components/StatusBadge'

export default function AlumnosList({
  coachIdFiltro = null,
  mostrarAgregar = false,
  rutaNuevo = '/dashboard/admin/alumnos/nuevo',
  rutaVer = (id) => `/dashboard/admin/alumnos/${id}`,
}) {
  const supabase = createClient()
  const router   = useRouter()

  const [alumnos, setAlumnos]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPlan,   setFiltroPlan]   = useState('todos')
  const [filtroTipo,   setFiltroTipo]   = useState('todos')
  const [filtroCoach,  setFiltroCoach]  = useState('todos')

  const [menuAbierto, setMenuAbierto] = useState(null)
  const menuRef = useRef(null)

  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [eliminando, setEliminando]           = useState(false)
  const [errorEliminar, setErrorEliminar]     = useState('')

  const [modalEditar, setModalEditar]       = useState(null)
  const [formEditar, setFormEditar]         = useState({})
  const [horariosEditar, setHorariosEditar] = useState([])
  const [coaches, setCoaches]               = useState([])
  const [guardandoEdit, setGuardandoEdit]   = useState(false)
  const [errorEdit, setErrorEdit]           = useState('')
  const [capWarning, setCapWarning]         = useState(null) // { items, onConfirmar }

  const fetchAlumnos = useCallback(async () => {
    let query = supabase
      .from('alumnos')
      .select('*, coach:coach_id(nombre)')
      .order('created_at', { ascending: false })

    if (coachIdFiltro) query = query.eq('coach_id', coachIdFiltro)

    const { data } = await query
    setAlumnos(data || [])
    setLoading(false)
  }, [coachIdFiltro])

  useEffect(() => { fetchAlumnos() }, [fetchAlumnos])

  // Cargar coaches para el filtro de admin (también los usa el modal de edición)
  useEffect(() => {
    if (!coachIdFiltro) {
      fetch('/api/coaches')
        .then(r => r.ok ? r.json() : [])
        .then(data => setCoaches(data))
    }
  }, [coachIdFiltro])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function toggleActivo(alumno) {
    setMenuAbierto(null)
    await supabase.from('alumnos').update({ activo: !alumno.activo }).eq('id', alumno.id)
    fetchAlumnos()
  }

  async function abrirEditar(alumno) {
    setFormEditar({ ...alumno })
    setErrorEdit('')

    const [freshCoaches, horariosRes] = await Promise.all([
      coaches.length === 0
        ? fetch('/api/coaches').then(r => r.ok ? r.json() : [])
        : Promise.resolve(coaches),
      supabase.from('alumno_horarios')
        .select('id, dia, hora, tipo, coach_id')
        .eq('alumno_id', alumno.id)
        .eq('activo', true)
        .order('dia').order('hora'),
    ])

    if (coaches.length === 0) setCoaches(freshCoaches)

    const horariosExistentes = horariosRes.data || []
    const tipoDefecto = (alumno.tipo_clase || '').toLowerCase() === 'personalizado' ? 'personalizado' : 'semipersonalizado'

    if (horariosExistentes.length === 0 && alumno.plan) {
      // Sin horarios aún → pre-llenar según plan y tipo_clase
      const dias = DIAS_POR_PLAN[alumno.plan] || ['lunes']
      setHorariosEditar(dias.map(dia => ({
        dia, hora: '08:00', tipo: tipoDefecto,
        coach_id: alumno.coach_id || null,
        _nuevo: true, _eliminar: false,
      })))
    } else {
      setHorariosEditar(horariosExistentes.map(h => ({ ...h, _nuevo: false, _eliminar: false })))
    }
    setModalEditar(alumno)
  }

  function setHorario(idx, field, value) {
    setHorariosEditar(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h))
  }

  function agregarHorario() {
    const tipoDefecto = (formEditar.tipo_clase || '').toLowerCase() === 'personalizado' ? 'personalizado' : 'semipersonalizado'
    setHorariosEditar(prev => [...prev, {
      dia: 'lunes', hora: '08:00', tipo: tipoDefecto,
      coach_id: formEditar.coach_id || null,
      _nuevo: true, _eliminar: false,
    }])
  }

  function marcarEliminarHorario(idx) {
    setHorariosEditar(prev => prev.map((h, i) => {
      if (i !== idx) return h
      return h._nuevo ? null : { ...h, _eliminar: !h._eliminar }
    }).filter(Boolean))
  }

  async function checkCapacidadBloques(nuevosHorarios) {
    if (!nuevosHorarios.length) return []
    const items = []
    for (const h of nuevosHorarios) {
      const { data } = await supabase
        .from('alumno_horarios')
        .select('hora')
        .eq('activo', true)
        .eq('dia', h.dia)
      const count = (data || []).filter(r => (r.hora || '').startsWith(h.hora)).length
      if (count >= 16) items.push({ dia: h.dia, hora: h.hora.slice(0, 5), count })
    }
    return items
  }

  async function ejecutarGuardarEditar() {
    setCapWarning(null)
    setGuardandoEdit(true)
    setErrorEdit('')

    const { error: errAlumno } = await supabase
      .from('alumnos')
      .update({
        nombre:                formEditar.nombre,
        rut:                   formEditar.rut,
        telefono:              formEditar.telefono,
        email:                 formEditar.email,
        direccion:             formEditar.direccion,
        fecha_nacimiento:      formEditar.fecha_nacimiento,
        contacto_emergencia:   formEditar.contacto_emergencia,
        telefono_emergencia:   formEditar.telefono_emergencia,
        objetivos:             formEditar.objetivos,
        restricciones_medicas: formEditar.restricciones_medicas,
        plan:                  formEditar.plan,
        tipo_clase:            formEditar.tipo_clase || null,
        coach_id:              formEditar.coach_id || null,
      })
      .eq('id', formEditar.id)

    if (errAlumno) {
      setErrorEdit(errAlumno.message)
      setGuardandoEdit(false)
      return
    }

    const aEliminar  = horariosEditar.filter(h => h._eliminar && h.id)
    const aNuevos    = horariosEditar.filter(h => h._nuevo && !h._eliminar && h.dia && h.hora)
    const aActualizar = horariosEditar.filter(h => !h._nuevo && !h._eliminar && h.id)

    await Promise.all([
      ...aEliminar.map(h => supabase.from('alumno_horarios').delete().eq('id', h.id)),
      aNuevos.length > 0
        ? supabase.from('alumno_horarios').insert(
            aNuevos.map(h => ({
              alumno_id: formEditar.id,
              coach_id:  h.coach_id || formEditar.coach_id || null,
              dia:       h.dia,
              hora:      h.hora,
              tipo:      h.tipo,
              activo:    true,
            }))
          )
        : Promise.resolve(),
      ...aActualizar.map(h =>
        supabase.from('alumno_horarios')
          .update({ dia: h.dia, hora: h.hora, tipo: h.tipo, coach_id: h.coach_id || null })
          .eq('id', h.id)
      ),
    ])

    setAlumnos(prev => prev.map(a => a.id === formEditar.id
      ? { ...a, ...formEditar, coach: coaches.find(c => c.id === formEditar.coach_id) || a.coach }
      : a
    ))
    setGuardandoEdit(false)
    setModalEditar(null)
  }

  async function guardarEditar() {
    const aNuevos = horariosEditar.filter(h => h._nuevo && !h._eliminar && h.dia && h.hora)
    const bloquesSaturados = await checkCapacidadBloques(aNuevos)
    if (bloquesSaturados.length > 0) {
      setCapWarning({ items: bloquesSaturados, onConfirmar: ejecutarGuardarEditar })
      return
    }
    await ejecutarGuardarEditar()
  }

  async function eliminarAlumno(alumno) {
    setEliminando(true)
    setErrorEliminar('')

    try {
      const res = await fetch('/api/eliminar-alumno', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alumno.id }),
      })

      const json = await res.json()

      if (!res.ok) {
        const msg = json.tabla
          ? `Error en tabla "${json.tabla}": ${json.error}`
          : json.error || 'Error desconocido'
        console.error('eliminarAlumno:', msg)
        setErrorEliminar(msg)
        setEliminando(false)
        return
      }

      setAlumnos(prev => prev.filter(a => a.id !== alumno.id))
      setConfirmEliminar(null)
    } catch (err) {
      console.error('eliminarAlumno (red):', err)
      setErrorEliminar('Error de red al intentar eliminar.')
    }

    setEliminando(false)
  }

  const alumnosFiltrados = alumnos.filter(a => {
    const q = busqueda.toLowerCase()
    const matchBusqueda =
      a.nombre?.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.rut?.includes(q)
    const matchEstado =
      filtroEstado === 'todos'   ? true :
      filtroEstado === 'activos' ? a.activo :
      !a.activo
    const matchPlan  = filtroPlan  === 'todos' || a.plan      === filtroPlan
    const matchTipo  = filtroTipo  === 'todos' || (a.tipo_clase || 'Semi Personalizado') === filtroTipo
    const matchCoach = filtroCoach === 'todos' || a.coach_id  === filtroCoach
    return matchBusqueda && matchEstado && matchPlan && matchTipo && matchCoach
  })

  if (loading) return <LoadingSpinner />

  return (
    <div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
            Total: {alumnos.length} registro{alumnos.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-green-500 font-medium">{alumnos.filter(a => a.activo).length} activos</span>
            <span className="text-zinc-500">{alumnos.filter(a => !a.activo).length} inactivos</span>
          </div>
        </div>
        {mostrarAgregar && (
          <button
            onClick={() => router.push(rutaNuevo)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2"
          >
            + Nuevo alumno
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="space-y-2 mb-4">
        {/* Búsqueda */}
        <input
          type="text"
          placeholder="Buscar por nombre, RUT o correo..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="w-full bg-surface border border-border text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-600"
        />

        {/* Selects en grilla — 2 cols en móvil */}
        <div className={`grid gap-2 grid-cols-2 ${!coachIdFiltro ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <select
            value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}
            className="bg-surface border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
          </select>

          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="bg-surface border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
          >
            <option value="todos">Todos los tipos</option>
            <option value="Semi Personalizado">Semi Personalizado</option>
            <option value="Personalizado">Personalizado</option>
          </select>

          <select
            value={filtroPlan}
            onChange={e => setFiltroPlan(e.target.value)}
            className="bg-surface border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
          >
            <option value="todos">Todos los planes</option>
            <option value="1x/sem">1x por semana</option>
            <option value="2x/sem">2x por semana</option>
            <option value="3x/sem">3x por semana</option>
            <option value="4x/sem">4x por semana</option>
            <option value="5x/sem">5x por semana</option>
            <option value="6x/sem">6x por semana</option>
            <option value="Personalizado">Personalizado</option>
          </select>

          {/* Filtro por coach — solo en vista admin */}
          {!coachIdFiltro && (
            <select
              value={filtroCoach}
              onChange={e => setFiltroCoach(e.target.value)}
              className="col-span-2 sm:col-span-1 bg-surface border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
            >
              <option value="todos">Todos los coaches</option>
              <option value="">Sin coach</option>
              {coaches.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          )}
        </div>

        {/* Indicador de filtros activos */}
        {(filtroEstado !== 'todos' || filtroPlan !== 'todos' || filtroTipo !== 'todos' || filtroCoach !== 'todos' || busqueda) && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {alumnosFiltrados.length} resultado{alumnosFiltrados.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => { setBusqueda(''); setFiltroEstado('todos'); setFiltroPlan('todos'); setFiltroTipo('todos'); setFiltroCoach('todos') }}
              className="text-[11px] text-red-500 hover:text-red-400 transition-colors"
            >
              Limpiar filtros ✕
            </button>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-surface border border-border rounded-xl">

        <div className="hidden md:flex items-center gap-4 px-5 py-3 border-b border-border">
          <div className="flex-1 text-[10px] text-zinc-500 uppercase tracking-widest">Nombre</div>
          <div className="w-28 shrink-0 text-[10px] text-zinc-500 uppercase tracking-widest">RUT</div>
          <div className="w-32 shrink-0 text-[10px] text-zinc-500 uppercase tracking-widest">Plan</div>
          <div className="w-28 shrink-0 text-[10px] text-zinc-500 uppercase tracking-widest">Coach</div>
          <div className="w-20 shrink-0 text-[10px] text-zinc-500 uppercase tracking-widest">Estado</div>
          <div className="w-8 shrink-0" />
        </div>

        {alumnosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-zinc-600 text-sm rounded-b-xl">
            No se encontraron alumnos
          </div>
        ) : (
          alumnosFiltrados.map((alumno, idx) => (
            <div
              key={alumno.id}
              className={`flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 md:py-4 border-b border-border hover:bg-hover transition-colors
                ${idx === alumnosFiltrados.length - 1 ? 'rounded-b-xl border-b-0' : ''}`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-400 shrink-0">
                  {alumno.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{alumno.nombre}</div>
                  <div className="text-xs text-zinc-500 truncate">
                    <span className="hidden md:inline">{alumno.email}</span>
                    <span className="md:hidden">
                      {alumno.tipo_clase?.toLowerCase() === 'personalizado' ? 'Personalizado' : 'Semi Personalizado'} · {alumno.plan}{alumno.coach?.nombre ? ` · ${alumno.coach.nombre.split(' ')[0]}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="hidden md:block w-28 shrink-0 text-sm text-zinc-500">{alumno.rut || '—'}</div>
              <div className="hidden md:block w-32 shrink-0 text-sm text-zinc-500">
                <div className="truncate">{alumno.tipo_clase?.toLowerCase() === 'personalizado' ? 'Personalizado' : 'Semi Personal.'}</div>
                <div className="text-[11px] text-zinc-600">{alumno.plan}</div>
              </div>
              <div className="hidden md:block w-28 shrink-0 text-sm text-zinc-500">{alumno.coach?.nombre || '—'}</div>

              <div className="shrink-0 w-20 flex justify-end md:justify-start">
                <StatusBadge activo={alumno.activo} />
              </div>

              <div className="relative shrink-0 w-8" ref={menuAbierto === alumno.id ? menuRef : null}>
                <button
                  onClick={() => setMenuAbierto(prev => prev === alumno.id ? null : alumno.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-foreground hover:bg-hover-md transition-all text-lg leading-none"
                  title="Opciones"
                >
                  ···
                </button>

                {menuAbierto === alumno.id && (
                  <div className="absolute right-0 top-9 z-20 bg-raised border border-border-strong rounded-xl shadow-2xl shadow-black/20 py-1.5 w-44 overflow-hidden">
                    <button
                      onClick={() => { setMenuAbierto(null); router.push(rutaVer(alumno.id)) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-2 hover:text-foreground hover:bg-hover-md transition-colors text-left"
                    >
                      <span className="text-base">◉</span> Ver perfil
                    </button>
                    <button
                      onClick={() => { setMenuAbierto(null); abrirEditar(alumno) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-2 hover:text-foreground hover:bg-hover-md transition-colors text-left"
                    >
                      <span className="text-base">✎</span> Editar
                    </button>
                    <button
                      onClick={() => toggleActivo(alumno)}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                        alumno.activo
                          ? 'text-zinc-500 hover:text-foreground hover:bg-hover-md'
                          : 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                      }`}
                    >
                      <span className="text-base">{alumno.activo ? '○' : '●'}</span>
                      {alumno.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button
                      onClick={() => { setMenuAbierto(null); setConfirmEliminar(alumno) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:text-red-400 hover:bg-red-900/20 transition-colors text-left"
                    >
                      <span className="text-base">✕</span> Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal confirmación eliminar */}
      {confirmEliminar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-xl">✕</span>
            </div>
            <h3 className="text-foreground font-bold text-base text-center mb-1">¿Eliminar alumno?</h3>
            <p className="text-sm text-zinc-500 text-center mb-1">
              <span className="text-foreground font-medium">{confirmEliminar.nombre}</span>
            </p>
            <p className="text-xs text-zinc-600 text-center mb-5">
              Se eliminarán también sus horarios y excepciones registradas.
              Esta acción no se puede deshacer.
            </p>

            {errorEliminar && (
              <div className="bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2.5 mb-4">
                <p className="text-xs text-red-400">{errorEliminar}</p>
                <p className="text-[11px] text-red-700 mt-1">
                  Revisá la consola del navegador para más detalles (F12 → Console).
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmEliminar(null); setErrorEliminar('') }}
                disabled={eliminando}
                className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminarAlumno(confirmEliminar)}
                disabled={eliminando}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                {eliminando ? 'Eliminando...' : errorEliminar ? 'Reintentar' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar alumno */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-xl shadow-2xl my-4">

            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-foreground font-bold">Editar alumno</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{modalEditar.nombre}</p>
              </div>
              <button onClick={() => setModalEditar(null)}
                className="text-zinc-600 hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md transition-all">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">

              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Datos personales</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Nombre completo', field: 'nombre' },
                    { label: 'RUT',              field: 'rut' },
                    { label: 'Teléfono',         field: 'telefono' },
                    { label: 'Correo',           field: 'email', type: 'email' },
                    { label: 'Dirección',        field: 'direccion' },
                    { label: 'Fecha nacimiento', field: 'fecha_nacimiento', type: 'date' },
                  ].map(({ label, field, type = 'text' }) => (
                    <div key={field}>
                      <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">{label}</label>
                      <input
                        type={type}
                        value={formEditar[field] || ''}
                        onChange={e => setFormEditar(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Contacto de emergencia</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Nombre contacto',   field: 'contacto_emergencia' },
                    { label: 'Teléfono contacto', field: 'telefono_emergencia' },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">{label}</label>
                      <input
                        value={formEditar[field] || ''}
                        onChange={e => setFormEditar(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Información del gimnasio</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">

                  {/* Tipo de clase */}
                  <div>
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Tipo de clase</label>
                    <div className="flex gap-2">
                      {['Personalizado', 'Semi Personalizado'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormEditar(f => ({ ...f, tipo_clase: t }))}
                          className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                            (formEditar.tipo_clase || 'Semi Personalizado') === t
                              ? 'bg-red-600/15 border-red-600/40 text-red-500'
                              : 'border-border text-zinc-500 hover:text-foreground bg-raised'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frecuencia */}
                  <div>
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Días por semana</label>
                    <select
                      value={formEditar.plan || ''}
                      onChange={e => setFormEditar(f => ({ ...f, plan: e.target.value }))}
                      className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                    >
                      <option value="1x/sem">1 día</option>
                      <option value="2x/sem">2 días</option>
                      <option value="3x/sem">3 días</option>
                      <option value="4x/sem">4 días</option>
                      <option value="5x/sem">5 días</option>
                      <option value="6x/sem">6 días</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Coach asignado</label>
                    <select
                      value={formEditar.coach_id || ''}
                      onChange={e => setFormEditar(f => ({ ...f, coach_id: e.target.value }))}
                      className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                    >
                      <option value="">Sin asignar</option>
                      {coaches.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-3">
                  {['objetivos', 'restricciones_medicas'].map(field => (
                    <div key={field}>
                      <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">
                        {field === 'objetivos' ? 'Objetivos' : 'Restricciones médicas'}
                      </label>
                      <textarea
                        value={formEditar[field] || ''}
                        onChange={e => setFormEditar(f => ({ ...f, [field]: e.target.value }))}
                        rows={2}
                        className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Horario semanal fijo</div>
                  <button type="button" onClick={agregarHorario}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors font-medium">
                    + Agregar día
                  </button>
                </div>

                {horariosEditar.length === 0 && (
                  <p className="text-xs text-zinc-600 italic">Sin horarios asignados</p>
                )}

                <div className="space-y-2">
                  {horariosEditar.map((h, idx) => (
                    <div
                      key={idx}
                      className={`transition-opacity ${h._eliminar ? 'opacity-30' : ''}`}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                        <select value={h.dia} disabled={h._eliminar} onChange={e => setHorario(idx, 'dia', e.target.value)}
                          className="bg-raised border border-border text-foreground rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-red-600 disabled:text-zinc-500">
                          {['lunes','martes','miercoles','jueves','viernes','sabado'].map(d => (
                            <option key={d} value={d}>
                              {d.charAt(0).toUpperCase() + d.slice(1).replace('miercoles','Miércoles').replace('sabado','Sábado')}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2 items-center">
                          <input type="time" value={h.hora?.slice(0, 5) || ''} disabled={h._eliminar}
                            onChange={e => setHorario(idx, 'hora', e.target.value)}
                            className="flex-1 bg-raised border border-border text-foreground rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-red-600 disabled:text-zinc-500" />
                          {/* Delete en móvil (col 2, fila 1) */}
                          <button type="button" onClick={() => marcarEliminarHorario(idx)}
                            className={`sm:hidden w-7 h-7 flex items-center justify-center rounded-lg text-sm shrink-0 ${
                              h._eliminar ? 'text-green-500' : 'text-zinc-600 hover:text-red-400'
                            }`}>
                            {h._eliminar ? '↩' : '✕'}
                          </button>
                        </div>
                        <select value={h.tipo} disabled={h._eliminar} onChange={e => setHorario(idx, 'tipo', e.target.value)}
                          className="col-span-2 sm:col-span-1 bg-raised border border-border text-foreground rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-red-600 disabled:text-zinc-500">
                          <option value="semipersonalizado">Semi Personalizado</option>
                          <option value="personalizado">Personalizado</option>
                        </select>
                        {/* Delete en desktop (col 4) */}
                        <button type="button" onClick={() => marcarEliminarHorario(idx)}
                          className={`hidden sm:flex w-7 h-7 items-center justify-center rounded-lg text-sm transition-all ${
                            h._eliminar
                              ? 'text-green-500 hover:bg-green-900/20'
                              : 'text-zinc-600 hover:text-red-400 hover:bg-red-900/20'
                          }`}
                          title={h._eliminar ? 'Restaurar' : 'Eliminar'}>
                          {h._eliminar ? '↩' : '✕'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {horariosEditar.some(h => h._eliminar) && (
                  <p className="text-[11px] text-zinc-600 mt-2">
                    Los horarios tachados se eliminarán al guardar.
                  </p>
                )}
              </div>

              {errorEdit && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2">
                  {errorEdit}
                </p>
              )}
            </div>

            <div className="flex gap-2 px-6 pb-5">
              <button onClick={() => setModalEditar(null)} disabled={guardandoEdit}
                className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={guardarEditar} disabled={guardandoEdit}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal advertencia de capacidad */}
      {capWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-amber-500 text-xl">⚠</span>
            </div>
            <h3 className="text-foreground font-bold text-base text-center mb-1">
              Bloque al límite de capacidad
            </h3>
            <p className="text-sm text-zinc-500 text-center mb-3">
              Los siguientes bloques ya tienen 16 alumnos:
            </p>
            <div className="space-y-1.5 mb-5">
              {capWarning.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-foreground capitalize">
                    {item.dia} {item.hora}
                  </span>
                  <span className="text-xs font-bold text-amber-500">{item.count}/16</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 text-center mb-5">
              Podés agregar el alumno igual, pero el bloque superará el límite recomendado.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCapWarning(null)}
                className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={capWarning.onConfirmar}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                Agregar igual
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
