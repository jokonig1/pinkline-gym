'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COLORES_COACH } from '@/lib/constants'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'

export default function CoachesPage() {
  const router = useRouter()

  const [coaches,  setCoaches]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tick,     setTick]     = useState(0)

  const [menuAbierto, setMenuAbierto] = useState(null)
  const menuRef = useRef(null)

  const [modalEditar, setModalEditar] = useState(null)
  const [formEditar,  setFormEditar]  = useState({})
  const [guardando,   setGuardando]   = useState(false)
  const [errorEditar, setErrorEditar] = useState('')

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      // Usa la API (supabaseAdmin) para incluir admins que también actúan como coach
      const [coachesRes, alumnosRes] = await Promise.all([
        fetch('/api/coaches'),
        supabase.from('alumnos').select('coach_id').eq('activo', true),
      ])

      const lista = coachesRes.ok ? await coachesRes.json() : []
      if (!lista.length) { setLoading(false); return }

      const countPerCoach = {}
      for (const a of alumnosRes.data || []) {
        if (a.coach_id) countPerCoach[a.coach_id] = (countPerCoach[a.coach_id] || 0) + 1
      }

      setCoaches(lista.map(c => ({ ...c, total_alumnos: countPerCoach[c.id] || 0 })))
      setLoading(false)
    }
    load()
  }, [tick])

  useEffect(() => {
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function refetch() { setTick(t => t + 1) }

  async function toggleActivo(coach) {
    setMenuAbierto(null)
    const supabase = createClient()
    await supabase.from('profiles').update({ activo: !coach.activo }).eq('id', coach.id)
    refetch()
  }

  function abrirEditar(coach) {
    setMenuAbierto(null)
    setErrorEditar('')
    setFormEditar({
      id:       coach.id,
      nombre:   coach.nombre   || '',
      telefono: coach.telefono || '',
      color:    coach.color    ?? null,
    })
    setModalEditar(coach)
  }

  async function guardarEditar() {
    setGuardando(true)
    setErrorEditar('')

    const res = await fetch('/api/actualizar-coach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:       formEditar.id,
        nombre:   formEditar.nombre,
        telefono: formEditar.telefono,
        color:    formEditar.color,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setErrorEditar(json.error || 'Error al guardar')
      setGuardando(false)
      return
    }

    setGuardando(false)
    setModalEditar(null)
    refetch()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
            Total: {coaches.length} coaches
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-green-500 font-medium">{coaches.filter(c => c.activo).length} activos</span>
            <span className="text-zinc-500">{coaches.filter(c => !c.activo).length} inactivos</span>
          </div>
        </div>
        <button
          onClick={() => router.push('/dashboard/admin/coaches/nuevo')}
          className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-colors"
        >
          + Nuevo coach
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {coaches.length === 0 && (
          <div className="col-span-3 text-center py-12 text-zinc-600 text-sm">
            No hay coaches registrados
          </div>
        )}

        {coaches.map((coach, i) => {
          const colorIdx  = coach.color !== null && coach.color !== undefined ? Number(coach.color) : i
          const color     = COLORES_COACH[colorIdx % COLORES_COACH.length]
          const initials  = coach.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          const capacidad = Math.min(Math.round((coach.total_alumnos / 35) * 100), 100)

          return (
            <div key={coach.id}
              className="bg-surface border border-border rounded-xl p-5 hover:border-border-strong transition-colors">

              {/* Cabecera */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                    style={{ background: color.bg, color: color.text, border: `1.5px solid ${color.border}40` }}
                  >
                    {initials}
                  </div>
                  <div>
                    <div className="text-foreground font-semibold text-sm">{coach.nombre}</div>
                    <div className="text-zinc-500 text-xs">{coach.email}</div>
                  </div>
                </div>

                {/* 3-dot menu */}
                <div className="relative" ref={menuAbierto === coach.id ? menuRef : null}>
                  <button
                    onClick={() => setMenuAbierto(prev => prev === coach.id ? null : coach.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-foreground hover:bg-hover-md transition-all text-lg leading-none"
                  >
                    ···
                  </button>

                  {menuAbierto === coach.id && (
                    <div className="absolute right-0 top-9 z-20 bg-raised border border-border-strong rounded-xl shadow-2xl shadow-black/20 py-1.5 w-40">
                      <button
                        onClick={() => router.push(`/dashboard/admin/coaches/${coach.id}`)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-2 hover:text-foreground hover:bg-hover-md transition-colors text-left"
                      >
                        <span>◉</span> Ver detalle
                      </button>
                      <button
                        onClick={() => abrirEditar(coach)}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-2 hover:text-foreground hover:bg-hover-md transition-colors text-left"
                      >
                        <span>✎</span> Editar
                      </button>
                      <button
                        onClick={() => toggleActivo(coach)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${
                          coach.activo
                            ? 'text-zinc-500 hover:text-foreground hover:bg-hover-md'
                            : 'text-green-400 hover:text-green-300 hover:bg-green-900/20'
                        }`}
                      >
                        <span>{coach.activo ? '○' : '●'}</span>
                        {coach.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Color dot */}
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color.border }} />
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Color en calendario</span>
              </div>

              {/* Estado */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  coach.activo ? 'bg-green-500/10 text-green-500' : 'bg-zinc-500/10 text-zinc-500'
                }`}>
                  {coach.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-raised rounded-lg p-3">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Alumnos</div>
                  <div className="text-2xl font-black text-foreground">{coach.total_alumnos}</div>
                </div>
                <div className="bg-raised rounded-lg p-3">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Capacidad</div>
                  <div className="text-2xl font-black text-foreground">{capacidad}%</div>
                </div>
              </div>

              {/* Barra ocupación */}
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1.5">
                  <span>Ocupación</span>
                  <span>{coach.total_alumnos}/35</span>
                </div>
                <div className="h-1.5 bg-raised rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      capacidad >= 90 ? 'bg-red-500' :
                      capacidad >= 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${capacidad}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal editar coach */}
      {modalEditar && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-strong rounded-2xl w-full max-w-md shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="text-foreground font-bold">Editar coach</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{modalEditar.email}</p>
              </div>
              <button onClick={() => setModalEditar(null)}
                className="text-zinc-600 hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md transition-all">✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Nombre completo</label>
                <input
                  value={formEditar.nombre}
                  onChange={e => setFormEditar(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1.5">Teléfono</label>
                <input
                  value={formEditar.telefono}
                  onChange={e => setFormEditar(f => ({ ...f, telefono: e.target.value }))}
                  placeholder="+56 9 xxxx xxxx"
                  className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-zinc-600"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-2">
                  Color en el calendario
                </label>
                <div className="flex gap-2.5 flex-wrap">
                  {COLORES_COACH.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormEditar(f => ({ ...f, color: idx }))}
                      className={`w-8 h-8 rounded-full transition-all ${
                        formEditar.color !== null && formEditar.color !== undefined && Number(formEditar.color) === idx
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110'
                          : 'hover:scale-105 opacity-70 hover:opacity-100'
                      }`}
                      style={{ background: c.border }}
                      title={`Color ${idx + 1}`}
                    />
                  ))}
                </div>
                {formEditar.color !== null && formEditar.color !== undefined && (
                  <div className="flex items-center gap-2 mt-2.5 px-3 py-2 rounded-lg"
                    style={{ background: COLORES_COACH[Number(formEditar.color) % COLORES_COACH.length].bg }}>
                    <div className="w-2.5 h-2.5 rounded-full"
                      style={{ background: COLORES_COACH[Number(formEditar.color) % COLORES_COACH.length].border }} />
                    <span className="text-xs" style={{ color: COLORES_COACH[Number(formEditar.color) % COLORES_COACH.length].text }}>
                      Color seleccionado — se verá así en el calendario
                    </span>
                  </div>
                )}
              </div>

              {errorEditar && (
                <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2">
                  {errorEditar}
                </p>
              )}
            </div>

            <div className="flex gap-2 px-6 pb-5">
              <button onClick={() => setModalEditar(null)} disabled={guardando}
                className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={guardarEditar} disabled={guardando}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
