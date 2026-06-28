'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'

export default function CoachRutinas() {
  const [coachId, setCoachId]     = useState(null)
  const [rutinas, setRutinas]     = useState([])
  const [loading, setLoading]     = useState(true)

  const [modal,   setModal]       = useState(null)
  const [saving,  setSaving]      = useState(false)
  const [error,   setError]       = useState('')

  const [confirmDel, setConfirmDel] = useState(null)

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
  }, [coachId])

  async function fetchRutinas() {
    const res = await fetch(`/api/rutinas-predefinidas?coach_id=${coachId}`)
    setRutinas(res.ok ? await res.json() : [])
    setLoading(false)
  }

  function abrirNueva() {
    setModal({ nombre: '', ejercicios: [{ nombre: '' }] })
    setError('')
  }

  function abrirEditar(r) {
    setModal({
      id:         r.id,
      nombre:     r.nombre,
      ejercicios: r.ejercicios.length
        ? r.ejercicios.map(e => ({ nombre: e.nombre || '' }))
        : [{ nombre: '' }],
    })
    setError('')
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
    if (ejerciciosValidos.length === 0) { setError('Agregá al menos un ejercicio.'); return }

    setSaving(true)
    setError('')

    let res
    if (modal.id) {
      res = await fetch(`/api/rutinas-predefinidas/${modal.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre: modal.nombre.trim(), ejercicios: ejerciciosValidos }),
      })
    } else {
      res = await fetch('/api/rutinas-predefinidas', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          coach_id:   coachId,
          nombre:     modal.nombre.trim(),
          ejercicios: ejerciciosValidos,
          orden:      rutinas.length,
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

  if (loading || !coachId) return <LoadingSpinner />

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-foreground font-black text-lg">Mis rutinas</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Plantillas reutilizables para registrar sesiones con tus alumnos
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors flex items-center gap-2"
        >
          + Nueva rutina
        </button>
      </div>

      {rutinas.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-foreground font-bold mb-1">Sin rutinas todavía</div>
          <div className="text-zinc-600 text-sm mb-4">
            Creá plantillas de rutinas para usarlas cuando registres sesiones
          </div>
          <button
            onClick={abrirNueva}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
          >
            + Crear primera rutina
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rutinas.map(r => (
            <div key={r.id} className="bg-surface border border-border rounded-2xl px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
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
                    className="text-xs text-zinc-600 hover:text-red-400 px-3 py-1.5 rounded-lg border border-border hover:border-red-900/30 transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal crear/editar */}
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
                  className="w-full bg-raised border border-border text-foreground rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Ejercicios</label>
                  <button
                    onClick={agregarEjercicio}
                    className="text-xs text-red-500 hover:text-red-400 transition-colors font-medium"
                  >
                    + Agregar
                  </button>
                </div>

                <div className="space-y-2">
                  {modal.ejercicios.map((ej, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-600 w-5 text-center shrink-0">{idx + 1}</span>
                      <input
                        type="text"
                        value={ej.nombre}
                        onChange={e => setEjercicio(idx, e.target.value)}
                        placeholder="Nombre del ejercicio"
                        className="flex-1 bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder:text-zinc-600"
                      />
                      <button
                        onClick={() => quitarEjercicio(idx)}
                        className="text-zinc-600 hover:text-red-400 transition-colors w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-900/10 text-sm shrink-0"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2">
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
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                {saving ? 'Guardando…' : 'Guardar rutina'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-red-500 text-xl">✕</span>
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
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
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
