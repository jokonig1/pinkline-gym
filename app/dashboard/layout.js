'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { COLORES_COACH } from '@/lib/constants'
import { useTheme } from '@/app/providers'

export default function DashboardLayout({ children }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [profile,     setProfile]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [avisoAlumnosSinHorario, setAvisoAlumnosSinHorario] = useState(false)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    const supabase = createClient()
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()

      // Si es alumno, completar el nombre desde la tabla alumnos
      if (prof?.rol === 'alumno' && user.email) {
        const res = await fetch(`/api/alumno/perfil?email=${encodeURIComponent(user.email)}`)
        if (res.ok) {
          const alumnoData = await res.json()
          if (alumnoData?.nombre) {
            setProfile({ ...prof, nombre: alumnoData.nombre })
            setLoading(false)
            return
          }
        }
      }

      setProfile(prof)
      setLoading(false)
    }
    getProfile()
  }, [router])

  // Aviso en el menú lateral: ¿hay alumnos activos sin ningún horario cargado?
  // Admin ve todos, coach solo los suyos.
  useEffect(() => {
    if (!profile || (profile.rol !== 'admin' && profile.rol !== 'coach')) return
    const supabase = createClient()
    async function checkSinHorario() {
      let query = supabase.from('alumnos').select('id').eq('activo', true)
      if (profile.rol === 'coach') query = query.eq('coach_id', profile.id)
      const { data: activos } = await query
      const ids = (activos || []).map(a => a.id)
      if (ids.length === 0) { setAvisoAlumnosSinHorario(false); return }

      const { data: horarios } = await supabase
        .from('alumno_horarios')
        .select('alumno_id')
        .eq('activo', true)
        .in('alumno_id', ids)
      const conHorario = new Set((horarios || []).map(h => h.alumno_id))
      setAvisoAlumnosSinHorario(ids.some(id => !conHorario.has(id)))
    }
    checkSinHorario()
  }, [profile])

  void pathname

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-pink-600 text-2xl font-black tracking-widest animate-pulse">PINKLINE</div>
    </div>
  )

  const navItems = {
    admin: [
      { label: 'Inicio',     icon: '⌂', href: '/dashboard/admin' },
      { label: 'Alumnos',   icon: '◉', href: '/dashboard/admin/alumnos' },
      { label: 'Coaches',   icon: '◈', href: '/dashboard/admin/coaches' },
      { label: 'Horarios',  icon: '▦', href: '/dashboard/admin/horarios' },
      { label: 'Rutinas',   icon: '◈', href: '/dashboard/admin/rutinas' },
      { label: 'Traspasos', icon: '⇄', href: '/dashboard/admin/traspasos' },
      { label: 'Métricas',  icon: '▲', href: '/dashboard/admin/kpis' },
      { label: 'Mi perfil', icon: '●', href: '/dashboard/admin/perfil' },
    ],
    coach: [
      { label: 'Inicio',       icon: '⌂', href: '/dashboard/coach' },
      { label: 'Mis alumnos',  icon: '◉', href: '/dashboard/coach/alumnos' },
      { label: 'Mis horarios', icon: '▦', href: '/dashboard/coach/horarios' },
      { label: 'Rutinas',      icon: '◈', href: '/dashboard/coach/rutinas' },
      { label: 'Traspasos',    icon: '⇄', href: '/dashboard/coach/traspasos' },
    ],
    alumno: [
      { label: 'Inicio',      icon: '⌂', href: '/dashboard/alumno' },
      { label: 'Mi Progreso', icon: '◈', href: '/dashboard/alumno/progreso' },
      { label: 'Mis Clases',  icon: '▦', href: '/dashboard/alumno/clases' },
      { label: 'Mi Perfil',   icon: '●', href: '/dashboard/alumno/perfil' },
    ],
  }

  const items    = navItems[profile?.rol] || []
  const initials = profile?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const avatarColor = profile?.color !== null && profile?.color !== undefined
    ? COLORES_COACH[Number(profile.color) % COLORES_COACH.length]
    : null

  return (
    <div className="min-h-screen bg-background flex">

      {/* Backdrop — solo móvil cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={[
        'fixed left-0 top-0 h-full flex flex-col z-50',
        'bg-surface border-r border-border',
        'w-72 lg:w-52',
        'transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      ].join(' ')}>

        {/* Logo + botón cerrar (solo móvil) */}
        <div className="relative p-5 border-b border-border flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={theme === 'dark' ? '/imagenes pinkline/Pinkline-blanco-rosado.svg' : '/imagenes pinkline/Pinkline.svg'}
            alt="Pinkline"
            className="h-14 w-auto object-contain"
          />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md transition-colors"
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {items.map(item => {
            const isActive = pathname === item.href
            const esItemAlumnos = item.href === '/dashboard/admin/alumnos' || item.href === '/dashboard/coach/alumnos'
            const mostrarAviso = esItemAlumnos && avisoAlumnosSinHorario
            return (
              <button
                key={item.href}
                onClick={() => { setSidebarOpen(false); router.push(item.href) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                  ${isActive
                    ? 'bg-pink-600/15 text-foreground'
                    : 'text-zinc-500 hover:text-foreground hover:bg-hover-md'
                  }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {mostrarAviso && (
                  <span className="text-sm" title="Hay alumnos sin horario asignado">🚨</span>
                )}
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-600" />}
              </button>
            )
          })}
        </nav>

        {/* Footer — avatar con el color del perfil */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={avatarColor
                ? { background: avatarColor.bg, color: avatarColor.text, border: `1.5px solid ${avatarColor.border}40` }
                : { background: 'rgba(220,38,38,0.15)', color: '#f87171' }
              }
            >
              {initials}
            </div>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-medium text-foreground truncate">{profile?.nombre}</div>
              <div className="text-[10px] text-zinc-500 capitalize">{profile?.rol}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-1 text-xs text-zinc-600 hover:text-pink-500 transition-colors py-1.5 text-left px-2"
          >
            Cerrar sesión →
          </button>
        </div>
      </aside>

      {/* ── Área principal ── */}
      <div className="flex-1 lg:ml-52 flex flex-col min-h-screen">

        {/* Topbar */}
        <header className="h-14 bg-surface border-b border-border flex items-center px-4 lg:px-6 gap-3 sticky top-0 z-10">

          {/* Hamburger — solo visible en móvil/tablet */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden shrink-0 text-zinc-400 hover:text-foreground w-9 h-9 flex items-center justify-center rounded-lg hover:bg-hover-md transition-colors"
            aria-label="Abrir menú"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="6" width="18" height="2" rx="1" fill="currentColor"/>
              <rect y="12" width="18" height="2" rx="1" fill="currentColor"/>
            </svg>
          </button>

          <h1 className="font-black tracking-widest text-foreground uppercase text-sm lg:text-base truncate flex-1">
            {items.find(i => i.href === pathname)?.label || 'Dashboard'}
          </h1>

          <div className="flex items-center gap-1.5 lg:gap-3 shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse hidden sm:block" />
            <span className="text-xs text-green-500 font-medium hidden md:block">En línea</span>

            {/* Toggle de tema */}
            <button
              onClick={toggle}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-foreground hover:bg-hover-md transition-colors"
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="22" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="2" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="22" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <span className="bg-pink-600 text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap hidden xs:inline-block sm:inline-block">
              {new Date().toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}
            </span>
          </div>
        </header>

        {/* Contenido — pb-20 deja espacio al botón + flotante en móvil */}
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>

      </div>
    </div>
  )
}
