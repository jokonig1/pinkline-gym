'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const [y, m, d] = fechaStr.split('-')
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${M[parseInt(m)-1]} ${y}`
}

export default function MiRutina() {
  const [alumnoId, setAlumnoId] = useState(null)
  const [sesiones, setSesiones] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selIdx,   setSelIdx]   = useState(0) // índice de sesión seleccionada (0 = más reciente)

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setLoading(false); return }

      const alumnoRes  = await fetch(`/api/alumno/perfil?email=${encodeURIComponent(user.email)}`)
      const alumnoData = alumnoRes.ok ? await alumnoRes.json() : null
      if (!alumnoData) { setLoading(false); return }
      setAlumnoId(alumnoData.id)

      const sRes = await fetch(`/api/sesiones-rutina?alumno_id=${alumnoData.id}`)
      setSesiones(sRes.ok ? await sRes.json() : [])
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return <LoadingSpinner />

  if (sesiones.length === 0) return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-black text-foreground mb-6">Mi rutina</h1>
      <div className="bg-surface border border-border rounded-2xl p-12 text-center">
        <div className="text-4xl mb-3">📋</div>
        <div className="text-foreground font-bold mb-1">Sin rutinas registradas</div>
        <div className="text-zinc-500 text-sm">
          Cuando tu coach registre una sesión, podrás ver los ejercicios y pesos aquí.
        </div>
      </div>
    </div>
  )

  // Agrupar por nombre de rutina para comparar sesiones
  const porRutina = {}
  sesiones.forEach(s => {
    if (!porRutina[s.rutina_nombre]) porRutina[s.rutina_nombre] = []
    porRutina[s.rutina_nombre].push(s)
  })
  const rutinas = Object.keys(porRutina)

  const sesActual = sesiones[selIdx]
  const sesAnterior = sesiones.find(
    (s, i) => i > selIdx && s.rutina_nombre === sesActual.rutina_nombre
  )

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-foreground">Mi rutina</h1>
          <p className="text-xs text-zinc-500 mt-1">{sesiones.length} sesiones registradas</p>
        </div>
      </div>

      {/* Selector de sesión */}
      <div className="bg-surface border border-border rounded-xl p-4 mb-5">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Sesión</div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {sesiones.slice(0, 10).map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSelIdx(i)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selIdx === i
                  ? 'bg-red-600/15 border-red-600/40 text-red-500'
                  : 'border-border text-zinc-500 hover:text-foreground'
              }`}
            >
              <div className="font-bold">{s.rutina_nombre}</div>
              <div className="text-[9px] opacity-70">{s.fecha}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Sesión seleccionada */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 bg-raised border-b border-border flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-foreground">{sesActual.rutina_nombre}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">{formatFecha(sesActual.fecha)}</div>
          </div>
          {sesAnterior && (
            <div className="text-[10px] text-zinc-500 text-right">
              Anterior:<br/>
              <span className="text-foreground">{formatFecha(sesAnterior.fecha)}</span>
            </div>
          )}
        </div>

        <div className="divide-y divide-border">
          {(sesActual.ejercicios || []).map((ej, i) => {
            const ejAnterior = sesAnterior?.ejercicios?.find(e => e.nombre === ej.nombre)
            return (
              <div key={i} className="px-4 py-3.5">
                <div className="text-xs font-bold text-foreground mb-2.5">{ej.nombre}</div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Hoy */}
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Hoy</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(ej.series || []).map((s, j) => (
                        <div key={j}
                          className="bg-red-600/10 border border-red-600/20 rounded-lg px-2.5 py-1.5 text-center">
                          <div className="text-[9px] text-red-400/70 mb-0.5">S{j+1}</div>
                          <div className="text-xs font-bold text-red-500">
                            {s.peso ? `${s.peso}kg` : '—'}
                          </div>
                          <div className="text-[9px] text-red-400/70">×{s.reps || '—'}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Anterior */}
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">
                      {sesAnterior ? 'Anterior' : '—'}
                    </div>
                    {ejAnterior ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(ejAnterior.series || []).map((s, j) => {
                          const pesoHoy = parseFloat(ej.series?.[j]?.peso || 0)
                          const pesoAnt = parseFloat(s.peso || 0)
                          const mejoro  = pesoHoy > pesoAnt
                          return (
                            <div key={j}
                              className="bg-hover-md border border-border rounded-lg px-2.5 py-1.5 text-center">
                              <div className="text-[9px] text-zinc-500 mb-0.5">S{j+1}</div>
                              <div className={`text-xs font-bold ${mejoro ? 'text-green-500' : 'text-zinc-500'}`}>
                                {s.peso ? `${s.peso}kg` : '—'}
                                {mejoro && <span className="text-[8px] ml-0.5">↑</span>}
                              </div>
                              <div className="text-[9px] text-zinc-500">×{s.reps || '—'}</div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-zinc-600 italic">Primera vez</div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {sesActual.notas && (
          <div className="px-4 py-3 border-t border-border bg-hover">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Notas del coach</div>
            <div className="text-xs text-zinc-500">{sesActual.notas}</div>
          </div>
        )}
      </div>

      {/* Progreso por ejercicio */}
      {rutinas.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Progreso por rutina</div>
          <div className="space-y-2">
            {rutinas.map(nombre => {
              const sess = porRutina[nombre]
              return (
                <div key={nombre} className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
                  <div>
                    <div className="text-sm font-medium text-foreground">{nombre}</div>
                    <div className="text-[10px] text-zinc-500">{sess.length} sesión{sess.length !== 1 ? 'es' : ''}</div>
                  </div>
                  <div className="text-xs text-zinc-500">{sess[0].fecha}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
