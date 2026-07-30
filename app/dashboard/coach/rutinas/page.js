'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'
import ExercisePicker from '@/app/dashboard/_components/ExercisePicker'
import { resolverEjercicio } from '@/app/dashboard/_components/ejerciciosCatalogo'
import EmptyIcon from '@/app/dashboard/_components/EmptyIcon'

function normalizar(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function CoachRutinas() {
  const [coachId,    setCoachId]    = useState(null)
  const [rutinas,    setRutinas]    = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading,    setLoading]    = useState(true)

  const [modal,   setModal]       = useState(null)
  const [saving,  setSaving]      = useState(false)
  const [error,   setError]       = useState('')

  // Crear categoría nueva sin salir del modal de rutina
  const [creandoCategoriaInline,   setCreandoCategoriaInline]   = useState(false)
  const [nombreCategoriaInline,    setNombreCategoriaInline]    = useState('')
  const [guardandoCategoriaInline, setGuardandoCategoriaInline] = useState(false)
  const [errorCategoriaInline,     setErrorCategoriaInline]     = useState('')

  const [confirmDel, setConfirmDel] = useState(null)
  const [filtroCategoria, setFiltroCategoria] = useState(null)

  // Popover de "+ Categoría" directo sobre la tarjeta de la rutina
  const [popoverRutinaId, setPopoverRutinaId] = useState(null)

  // Modal de categorías (crear/editar + asignar rutinas)
  const [modalCategoria,   setModalCategoria]   = useState(null)
  const [guardandoCat,     setGuardandoCat]     = useState(false)
  const [errorCat,         setErrorCat]         = useState('')
  const [busquedaCat,      setBusquedaCat]      = useState('')
  const [confirmDelCat,    setConfirmDelCat]    = useState(null)

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCoachId(user.id)
    }
    init()
  }, [])

  useEffect(() => {
    if (!coachId) return
    fetchRutinas()
    fetchCategorias()
  }, [coachId])

  async function fetchRutinas() {
    const res = await fetch(`/api/rutinas-predefinidas?coach_id=${coachId}`)
    setRutinas(res.ok ? await res.json() : [])
    setLoading(false)
  }

  async function fetchCategorias() {
    const res = await fetch(`/api/rutinas-categorias?coach_id=${coachId}`)
    setCategorias(res.ok ? await res.json() : [])
  }

  function resetCategoriaInline() {
    setCreandoCategoriaInline(false); setNombreCategoriaInline(''); setErrorCategoriaInline('')
  }

  function abrirNueva() {
    setModal({
      nombre: '',
      categoria_ids: filtroCategoria && filtroCategoria !== '__sin__' ? [filtroCategoria] : [],
      ejercicios: [{ nombre: '' }],
    })
    setError(''); resetCategoriaInline()
  }

  function abrirEditar(r) {
    setModal({
      id:            r.id,
      nombre:        r.nombre,
      categoria_ids: r.categoria_ids || [],
      ejercicios: r.ejercicios.length
        ? r.ejercicios.map(e => ({ nombre: e.nombre || '' }))
        : [{ nombre: '' }],
    })
    setError(''); resetCategoriaInline()
  }

  function toggleCategoriaEnModal(catId) {
    setModal(m => ({
      ...m,
      categoria_ids: m.categoria_ids.includes(catId)
        ? m.categoria_ids.filter(id => id !== catId)
        : [...m.categoria_ids, catId],
    }))
  }

  async function crearCategoriaInline() {
    if (!nombreCategoriaInline.trim()) { setErrorCategoriaInline('Pon un nombre.'); return }
    setGuardandoCategoriaInline(true); setErrorCategoriaInline('')

    const res = await fetch('/api/rutinas-categorias', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ coach_id: coachId, nombre: nombreCategoriaInline.trim() }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setErrorCategoriaInline(err.error || 'Error al crear la categoría.')
      setGuardandoCategoriaInline(false)
      return
    }

    const nueva = await res.json()
    setCategorias(prev => [...prev, nueva].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    setModal(m => ({ ...m, categoria_ids: [...m.categoria_ids, nueva.id] }))
    setGuardandoCategoriaInline(false)
    resetCategoriaInline()
  }

  function setNombreModal(val) { setModal(m => ({ ...m, nombre: val })) }

  function setEjercicio(idx, val) {
    setModal(m => ({
      ...m,
      ejercicios: m.ejercicios.map((e, i) => i === idx ? { nombre: val } : e),
    }))
  }

  function agregarEjercicio() {
    setModal(m => ({ ...m, ejercicios: [...m.ejercicios, { nombre: '' }] }))
  }

  function quitarEjercicio(idx) {
    setModal(m => ({
      ...m,
      ejercicios: m.ejercicios.length > 1
        ? m.ejercicios.filter((_, i) => i !== idx)
        : m.ejercicios,
    }))
  }

  async function guardar() {
    if (!modal.nombre.trim()) { setError('El nombre de la rutina es obligatorio.'); return }
    const ejerciciosValidos = modal.ejercicios
      .map((e, i) => ({ nombre: e.nombre.trim(), orden: i }))
      .filter(e => e.nombre)
    if (ejerciciosValidos.length === 0) { setError('Agrega al menos un ejercicio.'); return }

    setSaving(true)
    setError('')

    // Resuelve cada nombre contra el catálogo compartido (usa el canónico si ya existe, o lo crea).
    const ejerciciosResueltos = await Promise.all(ejerciciosValidos.map(async e => {
      const data = await resolverEjercicio(e.nombre)
      return { nombre: data?.nombre || e.nombre, orden: e.orden }
    }))

    let res
    if (modal.id) {
      res = await fetch(`/api/rutinas-predefinidas/${modal.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre: modal.nombre.trim(), categoria_ids: modal.categoria_ids, ejercicios: ejerciciosResueltos }),
      })
    } else {
      res = await fetch('/api/rutinas-predefinidas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          coach_id:      coachId,
          nombre:        modal.nombre.trim(),
          categoria_ids: modal.categoria_ids,
          ejercicios:    ejerciciosResueltos,
          orden:         rutinas.length,
        }),
      })
    }

    if (res.ok) {
      await fetchRutinas()
      setModal(null)
    } else {
      const err = await res.json()
      setError(err.error || 'Error al guardar la rutina.')
    }
    setSaving(false)
  }

  async function eliminar(id) {
    await fetch(`/api/rutinas-predefinidas/${id}`, { method: 'DELETE' })
    setRutinas(prev => prev.filter(r => r.id !== id))
    setConfirmDel(null)
  }

  // Alterna una categoría directo desde la tarjeta, sin abrir el modal de editar.
  async function toggleCategoriaEnRutina(rutina, categoriaId) {
    const tiene   = (rutina.categoria_ids || []).includes(categoriaId)
    const nuevas  = tiene
      ? rutina.categoria_ids.filter(id => id !== categoriaId)
      : [...(rutina.categoria_ids || []), categoriaId]

    setRutinas(prev => prev.map(r => r.id === rutina.id ? { ...r, categoria_ids: nuevas } : r))

    await fetch(`/api/rutinas-predefinidas/${rutina.id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ categoria_ids: nuevas }),
    })
    fetchCategorias()
  }

  // ── Categorías ────────────────────────────────────────────────────────────

  function abrirNuevaCategoria() {
    setModalCategoria({ nombre: '', seleccionadas: new Set() })
    setErrorCat(''); setBusquedaCat('')
  }

  function abrirEditarCategoria(cat) {
    setModalCategoria({
      id:            cat.id,
      nombre:        cat.nombre,
      seleccionadas: new Set(rutinas.filter(r => (r.categoria_ids || []).includes(cat.id)).map(r => r.id)),
    })
    setErrorCat(''); setBusquedaCat('')
  }

  function toggleRutinaEnCategoria(id) {
    setModalCategoria(m => {
      const next = new Set(m.seleccionadas)
      next.has(id) ? next.delete(id) : next.add(id)
      return { ...m, seleccionadas: next }
    })
  }

  async function guardarCategoria() {
    if (!modalCategoria.nombre.trim()) { setErrorCat('El nombre es obligatorio.'); return }
    setGuardandoCat(true); setErrorCat('')

    let categoriaId = modalCategoria.id
    const res = categoriaId
      ? await fetch(`/api/rutinas-categorias/${categoriaId}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ nombre: modalCategoria.nombre.trim() }),
        })
      : await fetch('/api/rutinas-categorias', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ coach_id: coachId, nombre: modalCategoria.nombre.trim() }),
        })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      setErrorCat(err.error || 'Error al guardar la categoría.')
      setGuardandoCat(false)
      return
    }
    if (!categoriaId) categoriaId = (await res.json()).id

    // Cada rutina puede estar en más de una categoría — el PUT reemplaza el
    // conjunto completo, así que hay que mandar sus categorías actuales +/- esta.
    const previas  = new Set(rutinas.filter(r => (r.categoria_ids || []).includes(categoriaId)).map(r => r.id))
    const aAgregar = [...modalCategoria.seleccionadas].filter(id => !previas.has(id))
    const aQuitar  = [...previas].filter(id => !modalCategoria.seleccionadas.has(id))

    const resultados = await Promise.all([
      ...aAgregar.map(id => {
        const r = rutinas.find(x => x.id === id)
        const nuevas = [...new Set([...(r?.categoria_ids || []), categoriaId])]
        return fetch(`/api/rutinas-predefinidas/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoria_ids: nuevas }),
        })
      }),
      ...aQuitar.map(id => {
        const r = rutinas.find(x => x.id === id)
        const nuevas = (r?.categoria_ids || []).filter(cid => cid !== categoriaId)
        return fetch(`/api/rutinas-predefinidas/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoria_ids: nuevas }),
        })
      }),
    ])

    await Promise.all([fetchRutinas(), fetchCategorias()])

    if (resultados.some(r => !r.ok)) {
      setErrorCat('La categoría se guardó, pero alguna rutina no se pudo asignar. Vuelve a intentar.')
      setGuardandoCat(false)
      return
    }

    setModalCategoria(null)
    setGuardandoCat(false)
  }

  async function eliminarCategoria(cat) {
    await fetch(`/api/rutinas-categorias/${cat.id}`, { method: 'DELETE' })
    if (filtroCategoria === cat.id) setFiltroCategoria(null)
    setConfirmDelCat(null)
    await Promise.all([fetchRutinas(), fetchCategorias()])
  }

  if (loading || !coachId) return <LoadingSpinner />

  const hayNoCategorizadas = rutinas.some(r => !r.categoria_ids?.length)

  const rutinasFiltradas = !filtroCategoria
    ? rutinas
    : filtroCategoria === '__sin__'
      ? rutinas.filter(r => !r.categoria_ids?.length)
      : rutinas.filter(r => r.categoria_ids?.includes(filtroCategoria))

  // Una rutina en varias categorías aparece repetida en cada grupo al que pertenece.
  const grupos = {}
  rutinasFiltradas.forEach(r => {
    const ids = r.categoria_ids?.length ? r.categoria_ids : ['__sin__']
    ids.forEach(catId => {
      if (!grupos[catId]) grupos[catId] = []
      grupos[catId].push(r)
    })
  })
  const idsGrupos = [...categorias.map(c => c.id), '__sin__'].filter(id => grupos[id]?.length)
  const hayCategorias = categorias.length > 0

  function nombreDeGrupo(id) {
    if (id === '__sin__') return 'Sin categoría'
    return categorias.find(c => c.id === id)?.nombre || 'Categoría'
  }

  const rutinasFiltradasModalCat = rutinas.filter(r =>
    !busquedaCat.trim() || normalizar(r.nombre).includes(normalizar(busquedaCat))
  )

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h2 className="text-foreground font-black text-lg">Mis rutinas</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Plantillas reutilizables para registrar sesiones con tus alumnos
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={abrirNuevaCategoria}
            className="border border-border-strong text-zinc-500 hover:text-foreground text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            + Categoría
          </button>
          <button
            onClick={abrirNueva}
            className="bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
          >
            + Nueva rutina
          </button>
        </div>
      </div>

      {rutinas.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <EmptyIcon tipo="lista" className="w-10 h-10 mb-3 text-zinc-500" />
          <div className="text-foreground font-bold mb-1">Sin rutinas todavía</div>
          <div className="text-zinc-600 text-sm mb-4">
            Crea plantillas de rutinas para usarlas cuando registres sesiones
          </div>
          <button
            onClick={abrirNueva}
            className="bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            + Crear primera rutina
          </button>
        </div>
      ) : (
        <>
          {hayCategorias && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              <button
                onClick={() => setFiltroCategoria(null)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  !filtroCategoria ? 'bg-pink-600 text-white border-pink-600' : 'border-border-strong text-zinc-500 hover:text-foreground'
                }`}
              >
                Todas
              </button>
              {categorias.map(c => (
                <button
                  key={c.id}
                  onClick={() => setFiltroCategoria(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    filtroCategoria === c.id ? 'bg-pink-600 text-white border-pink-600' : 'border-border-strong text-zinc-500 hover:text-foreground'
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
              {hayNoCategorizadas && (
                <button
                  onClick={() => setFiltroCategoria('__sin__')}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    filtroCategoria === '__sin__' ? 'bg-pink-600 text-white border-pink-600' : 'border-border-strong text-zinc-500 hover:text-foreground'
                  }`}
                >
                  Sin categoría
                </button>
              )}
            </div>
          )}

          {rutinasFiltradas.length === 0 ? (
            <div className="text-sm text-zinc-500 text-center py-10">Sin rutinas en esta categoría.</div>
          ) : (
            <div className="space-y-6">
              {idsGrupos.map(idGrupo => {
                const cat = categorias.find(c => c.id === idGrupo)
                return (
                <div key={idGrupo}>
                  {hayCategorias && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        {nombreDeGrupo(idGrupo)} <span className="text-zinc-600 font-normal normal-case">· {grupos[idGrupo].length}</span>
                      </div>
                      {cat && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => abrirEditarCategoria(cat)}
                            className="w-7 h-7 flex items-center justify-center rounded-full border border-border-strong text-zinc-400 hover:text-foreground hover:border-foreground transition-colors text-sm"
                            title="Editar categoría"
                          >✎</button>
                          <button
                            onClick={() => setConfirmDelCat(cat)}
                            className="w-7 h-7 flex items-center justify-center rounded-full border border-border-strong text-zinc-400 hover:text-pink-400 hover:border-pink-400 transition-colors text-sm"
                            title="Eliminar categoría"
                          >✕</button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {grupos[idGrupo].map(r => (
                      <div key={`${idGrupo}-${r.id}`} className="bg-surface border border-border rounded-2xl px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-foreground">{r.nombre}</div>
                            <div className="text-xs text-zinc-600 mt-1">
                              {r.ejercicios.length} ejercicio{r.ejercicios.length !== 1 ? 's' : ''}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {r.ejercicios.map((e, i) => (
                                <span key={i} className="text-[10px] text-zinc-500 bg-hover-md px-2 py-0.5 rounded-full">
                                  {e.nombre}
                                </span>
                              ))}
                            </div>

                            {/* Categorías: se ven y se editan directo acá, sin entrar a Editar */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                              {(r.categoria_ids || []).map(catId => {
                                const catActual = categorias.find(c => c.id === catId)
                                if (!catActual) return null
                                return (
                                  <span key={catId} className="flex items-center gap-1 text-[10px] text-pink-400 bg-pink-600/10 border border-pink-600/20 pl-2 pr-1 py-0.5 rounded-full">
                                    {catActual.nombre}
                                    <button
                                      onClick={() => toggleCategoriaEnRutina(r, catId)}
                                      className="hover:text-pink-200 w-3.5 h-3.5 flex items-center justify-center"
                                      title="Quitar de esta categoría"
                                    >×</button>
                                  </span>
                                )
                              })}
                              <div className="relative">
                                <button
                                  onClick={() => setPopoverRutinaId(id => id === r.id ? null : r.id)}
                                  className="text-[10px] text-zinc-500 hover:text-foreground border border-dashed border-border-strong px-2 py-0.5 rounded-full transition-colors"
                                >
                                  + Categoría
                                </button>
                                {popoverRutinaId === r.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setPopoverRutinaId(null)} />
                                    <div className="absolute left-0 top-6 z-20 bg-surface border border-border-strong rounded-xl shadow-xl py-1.5 w-48 max-h-56 overflow-y-auto">
                                      {categorias.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-zinc-600">Crea una categoría primero</div>
                                      ) : categorias.map(catOpcion => (
                                        <label
                                          key={catOpcion.id}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-hover-md transition-colors"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={(r.categoria_ids || []).includes(catOpcion.id)}
                                            onChange={() => toggleCategoriaEnRutina(r, catOpcion.id)}
                                            className="accent-pink-600"
                                          />
                                          {catOpcion.nombre}
                                        </label>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => abrirEditar(r)}
                              className="text-xs text-zinc-500 hover:text-foreground px-3 py-1.5 rounded-lg border border-border-strong hover:border-border-strong transition-all"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmDel(r)}
                              className="text-xs text-zinc-600 hover:text-pink-400 px-3 py-1.5 rounded-lg border border-border hover:border-pink-900/30 transition-all"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal crear/editar rutina */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface border border-border-strong rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[88dvh]">

            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
              <h3 className="text-foreground font-bold">
                {modal.id ? 'Editar rutina' : 'Nueva rutina'}
              </h3>
              <button
                onClick={() => setModal(null)}
                className="text-zinc-600 hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md transition-all"
              >✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Nombre de la rutina
                </label>
                <input
                  type="text"
                  value={modal.nombre}
                  onChange={e => setNombreModal(e.target.value)}
                  placeholder="Ej: Espalda / Bícep"
                  className="w-full bg-raised border border-border text-foreground rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-600 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    Categorías {modal.categoria_ids.length > 0 && `(${modal.categoria_ids.length})`}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (creandoCategoriaInline) resetCategoriaInline()
                      else { setCreandoCategoriaInline(true); setErrorCategoriaInline('') }
                    }}
                    className="text-[11px] text-pink-500 hover:text-pink-400 transition-colors font-medium"
                  >
                    {creandoCategoriaInline ? 'Cancelar' : '+ Nueva categoría'}
                  </button>
                </div>

                {creandoCategoriaInline && (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={nombreCategoriaInline}
                      onChange={e => setNombreCategoriaInline(e.target.value)}
                      placeholder="Ej: Piernas"
                      className="flex-1 bg-raised border border-border text-foreground rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-600 transition-colors placeholder:text-zinc-600"
                    />
                    <button
                      type="button"
                      onClick={crearCategoriaInline}
                      disabled={guardandoCategoriaInline}
                      className="bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-sm font-bold px-4 rounded-xl transition-colors shrink-0"
                    >
                      {guardandoCategoriaInline ? '…' : 'Crear'}
                    </button>
                  </div>
                )}

                {categorias.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">Todavía no tienes categorías creadas.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {categorias.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleCategoriaEnModal(c.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                          modal.categoria_ids.includes(c.id)
                            ? 'bg-pink-600 text-white border-pink-600'
                            : 'border-border-strong text-zinc-500 hover:text-foreground'
                        }`}
                      >
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                )}

                {errorCategoriaInline && (
                  <p className="text-xs text-pink-400 mt-1.5">{errorCategoriaInline}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Ejercicios</label>
                  <button
                    onClick={agregarEjercicio}
                    className="text-xs text-pink-500 hover:text-pink-400 transition-colors font-medium"
                  >
                    + Agregar
                  </button>
                </div>

                <div className="space-y-2">
                  {modal.ejercicios.map((ej, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-600 w-5 text-center shrink-0">{idx + 1}</span>
                      <ExercisePicker
                        value={ej.nombre}
                        onChange={val => setEjercicio(idx, val)}
                        placeholder="Nombre del ejercicio"
                        className="flex-1 bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600 transition-colors placeholder:text-zinc-600"
                      />
                      <button
                        onClick={() => quitarEjercicio(idx)}
                        className="text-zinc-600 hover:text-pink-400 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-pink-900/10 text-sm shrink-0"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-pink-400 bg-pink-900/20 border border-pink-900/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-border shrink-0 flex gap-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving}
                className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar rutina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear/editar categoría + asignar rutinas */}
      {modalCategoria && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-surface border border-border-strong rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl flex flex-col max-h-[88dvh]">

            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
              <h3 className="text-foreground font-bold">
                {modalCategoria.id ? 'Editar categoría' : 'Nueva categoría'}
              </h3>
              <button
                onClick={() => setModalCategoria(null)}
                className="text-zinc-600 hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md transition-all"
              >✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={modalCategoria.nombre}
                  onChange={e => setModalCategoria(m => ({ ...m, nombre: e.target.value }))}
                  placeholder="Ej: Piernas"
                  className="w-full bg-raised border border-border text-foreground rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-pink-600 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Rutinas en esta categoría {modalCategoria.seleccionadas.size > 0 && `(${modalCategoria.seleccionadas.size})`}
                </label>
                <input
                  type="text"
                  placeholder="Buscar rutina…"
                  value={busquedaCat}
                  onChange={e => setBusquedaCat(e.target.value)}
                  className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-pink-600 placeholder:text-zinc-600 mb-1.5"
                />
                {rutinas.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">Todavía no tienes rutinas creadas.</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {rutinasFiltradasModalCat.length === 0 ? (
                      <div className="text-xs text-zinc-600 text-center py-3">Sin resultados</div>
                    ) : rutinasFiltradasModalCat.map(r => (
                      <label
                        key={r.id}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer transition-colors ${
                          modalCategoria.seleccionadas.has(r.id) ? 'bg-pink-600/10 text-foreground' : 'hover:bg-hover text-foreground'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={modalCategoria.seleccionadas.has(r.id)}
                          onChange={() => toggleRutinaEnCategoria(r.id)}
                          className="accent-pink-600"
                        />
                        {r.nombre}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {errorCat && (
                <p className="text-xs text-pink-400 bg-pink-900/20 border border-pink-900/30 rounded-lg px-3 py-2">
                  {errorCat}
                </p>
              )}
            </div>

            <div className="px-5 pb-5 pt-3 border-t border-border shrink-0 flex gap-2">
              <button
                onClick={() => setModalCategoria(null)}
                className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={guardarCategoria}
                disabled={guardandoCat}
                className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                {guardandoCat ? 'Guardando…' : 'Guardar categoría'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar rutina */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-pink-900/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-pink-500 text-xl">✕</span>
              </div>
              <p className="text-foreground font-bold">¿Eliminar rutina?</p>
              <p className="text-zinc-500 text-sm mt-1">«{confirmDel.nombre}»</p>
              <p className="text-zinc-600 text-xs mt-2">
                Las sesiones ya registradas no se verán afectadas.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDel(null)}
                className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminar(confirmDel.id)}
                className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar categoría */}
      {confirmDelCat && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-pink-900/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-pink-500 text-xl">✕</span>
              </div>
              <p className="text-foreground font-bold">¿Eliminar categoría?</p>
              <p className="text-zinc-500 text-sm mt-1">«{confirmDelCat.nombre}»</p>
              <p className="text-zinc-600 text-xs mt-2">
                Las rutinas que estaban ahí no se borran, quedan sin categoría.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelCat(null)}
                className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminarCategoria(confirmDelCat)}
                className="flex-1 bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
