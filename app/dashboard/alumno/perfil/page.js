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

function diasRestantes(fechaStr) {
  if (!fechaStr) return null
  const hoy  = new Date(); hoy.setHours(0,0,0,0)
  const venc = new Date(fechaStr + 'T00:00:00')
  return Math.ceil((venc - hoy) / 86400000)
}

export default function AlumnoPerfil() {
  const [email,   setEmail]   = useState(null)
  const [alumno,  setAlumno]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setEmail(user.email)
    }
    init()
  }, [])

  const [pesoActual, setPesoActual] = useState(null)

  useEffect(() => {
    if (!email) return
    async function load() {
      const alumnoRes  = await fetch(`/api/alumno/perfil?email=${encodeURIComponent(email)}`)
      const alumnoData = alumnoRes.ok ? await alumnoRes.json() : null
      setAlumno(alumnoData)

      // Cargar el peso más reciente
      if (alumnoData?.id) {
        const pesoRes = await fetch(`/api/alumno/peso?alumno_id=${alumnoData.id}`)
        if (pesoRes.ok) {
          const pesos = await pesoRes.json()
          if (pesos.length > 0) setPesoActual(pesos[pesos.length - 1])
        }
      }

      setLoading(false)
    }
    load()
  }, [email])

  if (loading) return <LoadingSpinner />

  if (!alumno) return (
    <div className="bg-surface border border-border rounded-xl p-8 text-center max-w-md">
      <div className="text-3xl mb-3">⚠️</div>
      <div className="text-foreground font-bold mb-1">Perfil no encontrado</div>
      <div className="text-zinc-500 text-sm">
        Tu cuenta no tiene un perfil de alumno asociado.<br />
        Contactá al administrador del gimnasio.
      </div>
    </div>
  )

  const initials         = alumno.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const diasRestantesVal = diasRestantes(alumno.vencimiento_plan)

  return (
    <div className="max-w-lg space-y-4">

      {/* Header — avatar + nombre + estado */}
      <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-900/30 flex items-center justify-center text-xl font-black text-red-400 shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-foreground font-bold text-lg leading-tight">{alumno.nombre}</h2>
          <div className="text-xs text-zinc-500 mt-0.5 truncate">{alumno.email}</div>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
          alumno.activo ? 'bg-green-500/10 text-green-500' : 'bg-zinc-500/10 text-zinc-500'
        }`}>
          {alumno.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Card de plan */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Mi plan</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Plan actual</div>
            <div className="text-sm font-bold text-foreground">{alumno.plan || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Miembro desde</div>
            <div className="text-sm font-bold text-foreground">
              {alumno.created_at
                ? new Date(alumno.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Vencimiento del plan</div>
            {alumno.vencimiento_plan ? (
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${
                  diasRestantesVal !== null && diasRestantesVal <= 7 ? 'text-red-500' : 'text-foreground'
                }`}>
                  {formatFecha(alumno.vencimiento_plan)}
                </span>
                {diasRestantesVal !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    diasRestantesVal <= 0
                      ? 'bg-red-500/10 text-red-500'
                      : diasRestantesVal <= 7
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-green-500/10 text-green-500'
                  }`}>
                    {diasRestantesVal <= 0
                      ? 'Vencido'
                      : `${diasRestantesVal} días restantes`}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-sm text-zinc-500">
                Sin fecha de vencimiento — consultá con el administrador
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mi coach — solo lectura */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Mi coach</div>
        {alumno.coach?.nombre ? (
          <div className="flex items-center gap-3 p-3 bg-hover border border-border rounded-xl">
            <div className="w-8 h-8 rounded-full bg-red-900/30 flex items-center justify-center text-xs font-bold text-red-400 shrink-0">
              {alumno.coach.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{alumno.coach.nombre}</div>
              <div className="text-[10px] text-zinc-500">Coach asignado</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Sin coach asignado. Contactá al administrador.</p>
        )}
      </div>

      {/* Datos personales */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Mis datos</div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Nombre',       value: alumno.nombre,                             cols: 2 },
            { label: 'RUT',          value: alumno.rut },
            { label: 'Teléfono',     value: alumno.telefono },
            { label: 'Correo',       value: alumno.email,                              cols: 2 },
            { label: 'Estatura',     value: alumno.altura_cm ? `${alumno.altura_cm} cm` : null },
            { label: 'Peso actual',  value: pesoActual ? `${pesoActual.peso_kg} kg` : null },
          ].map(({ label, value, cols }) => (
            <div key={label} className={cols === 2 ? 'col-span-2' : ''}>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">{label}</div>
              <div className="text-sm text-foreground">{value || <span className="text-zinc-500">—</span>}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-600 mt-4">
          Para modificar tus datos, contactá al administrador del gimnasio.
        </p>
      </div>

    </div>
  )
}
