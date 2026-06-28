'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { COLORES_COACH } from '@/lib/constants'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'

export default function AdminPerfilPage() {
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [color,    setColor]    = useState(null)
  const [ok,       setOk]       = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setColor(data?.color ?? null)
      setLoading(false)
    }
    load()
  }, [])

  async function guardar() {
    if (!profile) return
    setSaving(true)
    setOk(false)
    setError('')
    const res = await fetch('/api/actualizar-coach', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: profile.id, color }),
    })
    const json = await res.json()
    setSaving(false)
    if (!res.ok) { setError(json.error || 'Error al guardar'); return }
    setOk(true)
    setProfile(p => ({ ...p, color }))
  }

  if (loading) return <LoadingSpinner />

  const initials = profile?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const previewColor = color !== null && color !== undefined
    ? COLORES_COACH[Number(color) % COLORES_COACH.length]
    : null

  return (
    <div className="max-w-lg">

      {/* Avatar */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4 flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black"
          style={previewColor
            ? { background: previewColor.bg, color: previewColor.text, border: `2px solid ${previewColor.border}` }
            : { background: 'rgba(220,38,38,0.15)', color: '#f87171' }
          }
        >
          {initials}
        </div>
        <div>
          <div className="text-foreground font-bold text-base">{profile?.nombre}</div>
          <div className="text-zinc-500 text-sm">{profile?.email}</div>
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Administrador</div>
        </div>
      </div>

      {/* Color del calendario */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Color en el calendario</div>
        <p className="text-xs text-zinc-600 mb-4">
          Este color identifica tus clases en el calendario. Elige uno que no use ningún coach.
        </p>

        <div className="flex gap-3 flex-wrap mb-4">
          {COLORES_COACH.map((c, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => { setColor(idx); setOk(false) }}
              className={`w-10 h-10 rounded-full transition-all ${
                color !== null && color !== undefined && Number(color) === idx
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-surface scale-110'
                  : 'opacity-60 hover:opacity-100 hover:scale-105'
              }`}
              style={{ background: c.border }}
              title={`Color ${idx + 1}`}
            />
          ))}
        </div>

        {previewColor && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4"
            style={{ background: previewColor.bg }}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: previewColor.border }} />
            <span className="text-xs" style={{ color: previewColor.text }}>
              Así se verán tus clases en el calendario
            </span>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2 mb-3">
            {error}
          </p>
        )}
        {ok && (
          <p className="text-xs text-green-400 bg-green-900/20 border border-green-900/30 rounded-lg px-3 py-2 mb-3">
            ✓ Color guardado correctamente
          </p>
        )}

        <button
          onClick={guardar}
          disabled={saving || color === profile?.color}
          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold px-6 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar color'}
        </button>
      </div>
    </div>
  )
}
