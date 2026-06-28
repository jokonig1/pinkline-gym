'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { COLORES_COACH } from '@/lib/constants'

export default function NuevoCoach() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [form,    setForm]    = useState({
    nombre:   '',
    email:    '',
    password: '',
    telefono: '',
    color:    null,
  })

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/crear-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre:   form.nombre,
        email:    form.email,
        password: form.password,
        color:    form.color,
      }),
    })

    const result = await res.json()

    if (!res.ok) {
      setError(result.error || 'Error al crear el coach')
      setLoading(false)
      return
    }

    router.push('/dashboard/admin/coaches')
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-foreground transition-colors text-sm">
          ← Volver
        </button>
        <h2 className="text-foreground font-bold">Nuevo Coach</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Datos del coach</div>

          {[
            { label: 'Nombre completo',       field: 'nombre',   type: 'text',     required: true  },
            { label: 'Correo electrónico',     field: 'email',    type: 'email',    required: true  },
            { label: 'Contraseña temporal',    field: 'password', type: 'password', required: true  },
            { label: 'Teléfono (opcional)',    field: 'telefono', type: 'tel',      required: false },
          ].map(f => (
            <div key={f.field}>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={f.type}
                value={form[f.field]}
                onChange={e => set(f.field, e.target.value)}
                required={f.required}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>
          ))}

          {/* Selector de color */}
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-2">
              Color en el calendario
            </label>
            <div className="flex gap-2.5 flex-wrap">
              {COLORES_COACH.map((c, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => set('color', idx)}
                  className={`w-9 h-9 rounded-full transition-all ${
                    form.color !== null && form.color !== undefined && Number(form.color) === idx
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110'
                      : 'hover:scale-105 opacity-60 hover:opacity-100'
                  }`}
                  style={{ background: c.border }}
                  title={`Color ${idx + 1}`}
                />
              ))}
            </div>
            {form.color !== null && (
              <div className="flex items-center gap-2 mt-2.5 px-3 py-2 rounded-lg"
                style={{ background: COLORES_COACH[form.color].bg }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORES_COACH[form.color].border }} />
                <span className="text-xs" style={{ color: COLORES_COACH[form.color].text }}>
                  Este color se verá en el calendario
                </span>
              </div>
            )}
          </div>

          <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-xs text-yellow-500">
              El coach recibir�� acceso con este correo y contraseña. Se recomienda pedirle que la cambie al primer ingreso.
            </p>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg border border-border-strong text-zinc-500 hover:text-foreground text-sm transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-8 py-2.5 rounded-lg transition-colors text-sm">
            {loading ? 'Creando...' : 'Crear coach'}
          </button>
        </div>
      </form>
    </div>
  )
}
