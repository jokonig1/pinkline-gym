'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'
import EmptyIcon from '@/app/dashboard/_components/EmptyIcon'

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
      <EmptyIcon tipo="advertencia" className="w-8 h-8 mb-3 text-zinc-500" />
      <div className="text-foreground font-bold mb-1">Perfil no encontrado</div>
      <div className="text-zinc-500 text-sm">
        Tu cuenta no tiene un perfil de alumno asociado.<br />
        Contacta al administrador del gimnasio.
      </div>
    </div>
  )

  const initials         = alumno.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const diasRestantesVal = diasRestantes(alumno.vencimiento_plan)

  return (
    <div className="max-w-lg space-y-4">

      {/* Header — avatar + nombre + estado */}
      <div className="bg-surface border border-border rounded-xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-pink-900/30 flex items-center justify-center text-xl font-black text-pink-400 shrink-0">
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
                  diasRestantesVal !== null && diasRestantesVal <= 7 ? 'text-pink-500' : 'text-foreground'
                }`}>
                  {formatFecha(alumno.vencimiento_plan)}
                </span>
                {diasRestantesVal !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    diasRestantesVal <= 0
                      ? 'bg-pink-500/10 text-pink-500'
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
                Sin fecha de vencimiento — consulta con el administrador
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
            <div className="w-8 h-8 rounded-full bg-pink-900/30 flex items-center justify-center text-xs font-bold text-pink-400 shrink-0">
              {alumno.coach.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{alumno.coach.nombre}</div>
              <div className="text-[10px] text-zinc-500">Coach asignado</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Sin coach asignado. Contacta al administrador.</p>
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
          Para modificar tus datos, contacta al administrador del gimnasio.
        </p>
      </div>

      {/* Cambiar contraseña */}
      <CambiarContrasena email={email} />

    </div>
  )
}

// ── Componente cambiar contraseña ─────────────────────────────────────────────

function CambiarContrasena({ email }) {
  const [actual,    setActual]    = useState('')
  const [nueva,     setNueva]     = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verActual, setVerActual] = useState(false)
  const [verNueva,  setVerNueva]  = useState(false)
  const [verConf,   setVerConf]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [exito,     setExito]     = useState(false)

  async function handleCambiar(e) {
    e.preventDefault()
    setError(''); setExito(false)

    if (nueva.length < 6)          { setError('La nueva contraseña debe tener al menos 6 caracteres.'); return }
    if (nueva !== confirmar)        { setError('Las contraseñas nuevas no coinciden.'); return }
    if (nueva === actual)           { setError('La nueva contraseña debe ser diferente a la actual.'); return }

    setLoading(true)
    const supabase = createClient()

    // Verificar contraseña actual
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password: actual,
    })
    if (signInErr) {
      setError('La contraseña actual es incorrecta.')
      setLoading(false)
      return
    }

    // Actualizar contraseña
    const { error: updateErr } = await supabase.auth.updateUser({ password: nueva })
    setLoading(false)

    if (updateErr) {
      setError('Error al cambiar la contraseña. Intenta de nuevo.')
    } else {
      setExito(true)
      setActual(''); setNueva(''); setConfirmar('')
      setTimeout(() => setExito(false), 4000)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Cambiar contraseña</div>

      <form onSubmit={handleCambiar} className="space-y-3">

        {/* Contraseña actual */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
            Contraseña actual
          </label>
          <div className="relative">
            <input
              type={verActual ? 'text' : 'password'}
              value={actual}
              onChange={e => setActual(e.target.value)}
              required
              placeholder="Tu contraseña actual"
              className="w-full bg-raised border border-border text-foreground rounded-lg px-4 py-2.5 pr-11 text-sm focus:outline-none focus:border-pink-600 transition-colors"
            />
            <button type="button" onClick={() => setVerActual(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground transition-colors">
              {verActual ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {/* Nueva contraseña */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={verNueva ? 'text' : 'password'}
              value={nueva}
              onChange={e => setNueva(e.target.value)}
              required
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-raised border border-border text-foreground rounded-lg px-4 py-2.5 pr-11 text-sm focus:outline-none focus:border-pink-600 transition-colors"
            />
            <button type="button" onClick={() => setVerNueva(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground transition-colors">
              {verNueva ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {/* Confirmar nueva */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">
            Confirmar nueva contraseña
          </label>
          <div className="relative">
            <input
              type={verConf ? 'text' : 'password'}
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              required
              placeholder="Repite la nueva contraseña"
              className="w-full bg-raised border border-border text-foreground rounded-lg px-4 py-2.5 pr-11 text-sm focus:outline-none focus:border-pink-600 transition-colors"
            />
            <button type="button" onClick={() => setVerConf(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground transition-colors">
              {verConf ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-pink-400 bg-pink-900/20 border border-pink-900/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {exito && (
          <p className="text-xs text-green-400 bg-green-900/20 border border-green-900/30 rounded-lg px-3 py-2">
            ✓ Contraseña actualizada correctamente
          </p>
        )}

        <button type="submit" disabled={loading}
          className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors mt-1">
          {loading ? 'Verificando…' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}

// ── Iconos ojo ────────────────────────────────────────────────────────────────

function Eye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
