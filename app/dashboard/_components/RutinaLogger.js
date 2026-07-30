'use client'
import { useState, useEffect } from 'react'
import ExercisePicker from './ExercisePicker'
import { resolverEjercicio } from './ejerciciosCatalogo'

/**
 * Elegir/crear una rutina y cargar la sesión de hoy (ejercicios + series).
 * Usado tanto por el coach (ModalClase.js) como por el propio alumno (Inicio),
 * con el mismo comportamiento: auto-carga la sesión ya guardada hoy, permite
 * elegir una plantilla existente o crear una nueva desde cero.
 */
export default function RutinaLogger({ alumnoId, coachId, alumnoHorarioId, fecha, onGuardado }) {
  const [rutinas,          setRutinas]          = useState([])
  const [rutinaActiva,     setRutinaActiva]     = useState(null)
  const [ultimaSesion,     setUltimaSesion]     = useState(null)
  const [ejerciciosHoy,    setEjerciciosHoy]    = useState([])
  const [loadingRutina,    setLoadingRutina]    = useState(false)
  const [guardandoRutina,  setGuardandoRutina]  = useState(false)
  const [notas,            setNotas]            = useState('')
  const [savedRutina,      setSavedRutina]      = useState(false)
  const [errorRutina,      setErrorRutina]      = useState('')

  useEffect(() => {
    async function load() {
      const [rutinasRes, sesionRes] = await Promise.all([
        fetch(`/api/rutinas-predefinidas?coach_id=${coachId}`),
        alumnoId
          ? fetch(`/api/sesiones-rutina?alumno_id=${alumnoId}&fecha_desde=${fecha}&fecha_hasta=${fecha}`)
          : Promise.resolve(null),
      ])
      if (rutinasRes.ok) setRutinas(await rutinasRes.json())
      if (sesionRes?.ok) {
        const sesiones = await sesionRes.json()
        const sesionHoy = (sesiones || []).find(s => s.alumno_horario_id === alumnoHorarioId) || sesiones?.[0]
        if (sesionHoy) {
          setRutinaActiva({ id: sesionHoy.rutina_predefinida_id, nombre: sesionHoy.rutina_nombre })
          setEjerciciosHoy(sesionHoy.ejercicios || [])
          setNotas(sesionHoy.notas || '')
          setSavedRutina(true)
        }
      }
    }
    load()
  }, [coachId, alumnoHorarioId, fecha, alumnoId])

  async function seleccionarRutina(rutina) {
    setRutinaActiva(rutina)
    setLoadingRutina(true)
    setSavedRutina(false)
    setErrorRutina('')

    let ultima = null
    if (alumnoId) {
      const res = await fetch(
        `/api/sesiones-rutina?alumno_id=${alumnoId}&rutina_nombre=${encodeURIComponent(rutina.nombre)}`
      )
      ultima = res.ok ? await res.json() : null
    }
    setUltimaSesion(ultima)

    const ejerciciosBase = (rutina.ejercicios || []).map(ej => {
      const prevEj = ultima?.ejercicios?.find(e => e.nombre === ej.nombre)
      return {
        nombre: ej.nombre,
        series: prevEj?.series?.length
          ? prevEj.series.map(s => ({ peso: s.peso ?? '', reps: s.reps ?? '' }))
          : [{ peso: '', reps: '' }],
      }
    })
    setEjerciciosHoy(ejerciciosBase)
    setLoadingRutina(false)
  }

  function crearRutinaNueva() {
    setRutinaActiva({ id: null, nombre: '' })
    setUltimaSesion(null)
    setEjerciciosHoy([])
    setSavedRutina(false)
    setErrorRutina('')
  }

  function setSerie(ejIdx, serieIdx, field, value) {
    setSavedRutina(false)
    setEjerciciosHoy(prev => prev.map((ej, i) => {
      if (i !== ejIdx) return ej
      return {
        ...ej,
        series: ej.series.map((s, j) => j === serieIdx ? { ...s, [field]: value } : s),
      }
    }))
  }

  function agregarSerie(ejIdx) {
    setSavedRutina(false)
    setEjerciciosHoy(prev => prev.map((ej, i) => {
      if (i !== ejIdx) return ej
      const ultima = ej.series[ej.series.length - 1]
      return { ...ej, series: [...ej.series, { peso: ultima?.peso ?? '', reps: ultima?.reps ?? '' }] }
    }))
  }

  function quitarSerie(ejIdx, serieIdx) {
    setSavedRutina(false)
    setEjerciciosHoy(prev => prev.map((ej, i) => {
      if (i !== ejIdx) return ej
      const nuevas = ej.series.filter((_, j) => j !== serieIdx)
      return { ...ej, series: nuevas.length ? nuevas : [{ peso: '', reps: '' }] }
    }))
  }

  function renombrarEjercicio(ejIdx, nombre) {
    setSavedRutina(false)
    setEjerciciosHoy(prev => prev.map((ej, i) => i === ejIdx ? { ...ej, nombre } : ej))
  }

  function eliminarEjercicio(ejIdx) {
    setSavedRutina(false)
    setEjerciciosHoy(prev => prev.filter((_, i) => i !== ejIdx))
  }

  function agregarEjercicio() {
    setSavedRutina(false)
    setEjerciciosHoy(prev => [...prev, { nombre: '', series: [{ peso: '', reps: '' }] }])
  }

  async function guardarSesion() {
    setGuardandoRutina(true)
    setErrorRutina('')

    // Resuelve cada nombre contra el catálogo compartido antes de guardar.
    const ejerciciosResueltos = await Promise.all(ejerciciosHoy.map(async ej => {
      if (!ej.nombre.trim()) return ej
      const data = await resolverEjercicio(ej.nombre.trim())
      return { ...ej, nombre: data?.nombre || ej.nombre.trim() }
    }))

    let rutinaPredefinidaId = rutinaActiva.id
    if (rutinaPredefinidaId === null) {
      if (!rutinaActiva.nombre.trim()) {
        setErrorRutina('Ponele un nombre a la rutina.')
        setGuardandoRutina(false)
        return
      }
      const ejerciciosConNombre = ejerciciosResueltos.filter(e => e.nombre.trim())
      if (ejerciciosConNombre.length === 0) {
        setErrorRutina('Agrega al menos un ejercicio.')
        setGuardandoRutina(false)
        return
      }
      const resRutina = await fetch('/api/rutinas-predefinidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coach_id:   coachId,
          nombre:     rutinaActiva.nombre.trim(),
          ejercicios: ejerciciosConNombre.map((e, i) => ({ nombre: e.nombre.trim(), orden: i })),
        }),
      })
      if (!resRutina.ok) {
        const err = await resRutina.json().catch(() => ({}))
        setErrorRutina(err.error || 'Error al crear la rutina.')
        setGuardandoRutina(false)
        return
      }
      const nuevaRutina = await resRutina.json()
      rutinaPredefinidaId = nuevaRutina.id
      setRutinas(prev => [...prev, nuevaRutina])
      setRutinaActiva(r => ({ ...r, id: nuevaRutina.id }))
    }

    const res = await fetch('/api/sesiones-rutina', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alumno_id:             alumnoId || null,
        coach_id:              coachId,
        alumno_horario_id:     alumnoHorarioId,
        fecha,
        rutina_nombre:         rutinaActiva.nombre,
        rutina_predefinida_id: rutinaPredefinidaId,
        ejercicios:            ejerciciosResueltos,
        notas,
      }),
    })
    if (res.ok) {
      setSavedRutina(true)
      onGuardado?.()
    } else {
      const err = await res.json()
      setErrorRutina(err.error || 'Error al guardar la sesión.')
    }
    setGuardandoRutina(false)
  }

  function prevSerie(ejNombre) {
    const prevEj = ultimaSesion?.ejercicios?.find(e => e.nombre === ejNombre)
    if (!prevEj?.series?.length) return null
    return prevEj.series
  }

  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Rutina de hoy</div>

      <div className="flex gap-2 mb-4">
        <select
          value={rutinaActiva?.id || ''}
          onChange={e => {
            const r = rutinas.find(x => x.id === e.target.value)
            if (r) seleccionarRutina(r)
          }}
          className="flex-1 bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-600"
        >
          <option value="">
            {rutinas.length === 0 ? 'Sin rutinas predefinidas' : 'Elegir rutina existente…'}
          </option>
          {rutinas.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
        </select>
        <button
          onClick={crearRutinaNueva}
          className="shrink-0 px-3.5 rounded-lg border border-dashed border-border-strong text-zinc-500 hover:text-pink-400 hover:border-pink-900/40 text-xs font-bold transition-colors"
        >
          + Nueva
        </button>
      </div>

      {loadingRutina && (
        <div className="text-xs text-zinc-500 text-center py-4">Cargando sesión anterior…</div>
      )}

      {rutinaActiva && !loadingRutina && (
        <div className="space-y-4">

          {rutinaActiva.id === null && (
            <input
              type="text"
              value={rutinaActiva.nombre}
              onChange={e => { setSavedRutina(false); setRutinaActiva(r => ({ ...r, nombre: e.target.value })) }}
              placeholder="Nombre de la rutina (ej: Piernas)"
              className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-pink-600 transition-colors placeholder:text-zinc-600 placeholder:font-normal"
            />
          )}

          {ultimaSesion && (
            <div className="text-[10px] text-zinc-600 text-center">
              Última sesión:{' '}
              <span className="text-zinc-500">
                {new Date(ultimaSesion.fecha + 'T12:00:00').toLocaleDateString('es-CL', {
                  day: 'numeric', month: 'short'
                })}
              </span>
            </div>
          )}

          {ejerciciosHoy.map((ej, ejIdx) => {
            const prev = prevSerie(ej.nombre)
            return (
              <div key={ejIdx} className="bg-raised rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ExercisePicker
                    value={ej.nombre}
                    onChange={val => renombrarEjercicio(ejIdx, val)}
                    placeholder="Nombre del ejercicio"
                    className="bg-transparent text-sm font-bold text-foreground placeholder:text-zinc-600 focus:outline-none border-b border-transparent focus:border-border-strong pb-0.5 transition-colors"
                  />
                  <button
                    onClick={() => eliminarEjercicio(ejIdx)}
                    className="text-zinc-600 hover:text-pink-400 transition-colors w-6 h-6 flex items-center justify-center rounded shrink-0 hover:bg-pink-900/20 text-xs"
                    title="Eliminar ejercicio"
                  >✕</button>
                </div>

                {prev && (
                  <div className="mb-2 pb-2 border-b border-border">
                    <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Anterior</div>
                    <div className="flex flex-wrap gap-1.5">
                      {prev.map((s, i) => (
                        <span key={i} className="text-[10px] text-zinc-500 bg-hover-md px-2 py-0.5 rounded">
                          {s.peso ? `${s.peso} kg` : '—'} × {s.reps || '—'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-2">Hoy</div>
                <div className="space-y-1.5">
                  {ej.series.map((serie, serieIdx) => (
                    <div key={serieIdx} className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-600 w-4 text-center">{serieIdx + 1}</span>
                      <div className="flex-1 grid grid-cols-2 gap-1.5">
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="decimal"
                            placeholder="kg"
                            value={serie.peso}
                            onChange={e => setSerie(ejIdx, serieIdx, 'peso', e.target.value)}
                            className="w-full bg-input-bg border border-border text-foreground rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-pink-600 transition-colors text-center"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-600">kg</span>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="reps"
                            value={serie.reps}
                            onChange={e => setSerie(ejIdx, serieIdx, 'reps', e.target.value)}
                            className="w-full bg-input-bg border border-border text-foreground rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-pink-600 transition-colors text-center"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-zinc-600">reps</span>
                        </div>
                      </div>
                      <button
                        onClick={() => quitarSerie(ejIdx, serieIdx)}
                        className="text-zinc-600 hover:text-pink-400 transition-colors w-5 h-5 flex items-center justify-center text-xs shrink-0"
                      >✕</button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => agregarSerie(ejIdx)}
                  className="mt-2 text-[10px] text-zinc-600 hover:text-pink-400 transition-colors"
                >
                  + Agregar serie
                </button>
              </div>
            )
          })}

          <button
            onClick={agregarEjercicio}
            className="w-full border border-dashed border-border-strong text-zinc-600 hover:text-pink-400 hover:border-pink-900/40 text-xs py-2.5 rounded-xl transition-colors"
          >
            + Agregar ejercicio
          </button>

          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1.5">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={e => { setSavedRutina(false); setNotas(e.target.value) }}
              rows={2}
              placeholder="Observaciones de la sesión..."
              className="w-full bg-raised border border-border text-foreground rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-600 resize-none transition-colors placeholder:text-zinc-600"
            />
          </div>

          {errorRutina && (
            <p className="text-xs text-pink-400 bg-pink-900/20 border border-pink-900/30 rounded-lg px-3 py-2">
              {errorRutina}
            </p>
          )}

          {savedRutina && (
            <p className="text-xs text-green-400 text-center font-medium">
              ✓ Sesión guardada correctamente
            </p>
          )}

          {!savedRutina && (
            <button
              onClick={guardarSesion}
              disabled={guardandoRutina}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
            >
              {guardandoRutina ? 'Guardando…' : 'Guardar sesión'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
