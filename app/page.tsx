'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ── Datos editables ───────────────────────────────────────────────────────────
const WHATSAPP = '+56973672191'   // ← cambiá esto por el número real
const INSTAGRAM = 'redlinehf'    // ← sin @
const DIRECCION = 'Av. Transversal Uno #845, Ciudad de los Valles, Pudahuel'

const TESTIMONIOS = [
  {
    imagen:   '/exp3.jpeg',
    texto:    'Llegué sin nunca haber entrenado y en 4 meses transformé mi cuerpo y mi energía. El seguimiento de mi profe marcó toda la diferencia.',
    nombre:   'Valentina R.',
    servicio: 'Plan Personalizado · 3x/sem',
  },
  {
    imagen:   '/exp4.jpeg',
    texto:    'Venía de una rotura de ligamentos. El equipo de RedLine me ayudó a volver a entrenar sin miedo y con un plan real de progresión.',
    nombre:   'Ignacio M.',
    servicio: 'Reintegro Deportivo',
  },
  {
    imagen:   '/exp5.jpeg',
    texto:    'El ambiente es increíble. Acá te conocen, te guían y celebran tus logros. No se siente como un gimnasio más, si no como una comunidad real.',
    nombre:   'Fernanda K.',
    servicio: 'Plan Semi Personalizado · 2x/sem',
  },
]

const HORARIOS_SIMULADOS = [
  { dia: 'Lunes',     mañana: '07:00 – 13:00', tarde: '16:00 – 22:00' },
  { dia: 'Martes',    mañana: '07:00 – 13:00', tarde: '16:00 – 22:00' },
  { dia: 'Miércoles', mañana: '07:00 – 13:00', tarde: '16:00 – 22:00' },
  { dia: 'Jueves',    mañana: '07:00 – 13:00', tarde: '16:00 – 22:00' },
  { dia: 'Viernes',   mañana: '07:00 – 13:00', tarde: '16:00 – 22:00' },
  { dia: 'Sábado',    mañana: '09:00 – 13:00', tarde: '—' },
]

// ── Componente carrusel de testimonios con imagen de fondo ────────────────────
function Carrusel() {
  const [idx, setIdx] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  function siguiente() { setIdx(i => (i + 1) % TESTIMONIOS.length) }
  function anterior()  { setIdx(i => (i - 1 + TESTIMONIOS.length) % TESTIMONIOS.length) }

  function resetTimer() {
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(siguiente, 6000)
  }

  useEffect(() => {
    timer.current = setInterval(siguiente, 6000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [])

  const t = TESTIMONIOS[idx]

  return (
    <div className="relative max-w-3xl mx-auto">

      {/* Card con imagen de fondo */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Imagen completa sin recorte */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={t.imagen}
          alt=""
          className="w-full h-auto block"
          aria-hidden="true"
        />

        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Texto superpuesto */}
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
          <p className="text-white text-sm sm:text-base leading-relaxed italic mb-4 drop-shadow">
            &ldquo;{t.texto}&rdquo;
          </p>
          <div>
            <div className="text-white font-bold text-sm">{t.nombre}</div>
            <div className="text-red-400 text-[11px] font-medium mt-0.5">{t.servicio}</div>
          </div>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-center gap-4 mt-5">
        <button onClick={() => { anterior(); resetTimer() }}
          className="w-8 h-8 rounded-full border border-border text-zinc-500 hover:text-foreground hover:border-border-strong flex items-center justify-center transition-all text-sm">
          ←
        </button>
        <div className="flex gap-2">
          {TESTIMONIOS.map((_, i) => (
            <button key={i} onClick={() => { setIdx(i); resetTimer() }}
              className={`h-2 rounded-full transition-all ${i === idx ? 'bg-red-600 w-6' : 'bg-border-strong w-2'}`} />
          ))}
        </div>
        <button onClick={() => { siguiente(); resetTimer() }}
          className="w-8 h-8 rounded-full border border-border text-zinc-500 hover:text-foreground hover:border-border-strong flex items-center justify-center transition-all text-sm">
          →
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const waLink = `https://wa.me/${WHATSAPP.replace(/\D/g, '')}`

  return (
    <div className="dark min-h-screen bg-background text-foreground">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo — siempre oscuro en la landing */}
          <a href="#inicio" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_oscuro.png" alt="RedLine" className="h-8 sm:h-9 w-auto object-contain" />
          </a>

          {/* Links desktop */}
          <div className="hidden md:flex items-center gap-7">
            {[
              { label: 'Nosotros',  href: '#nosotros'  },
              { label: 'Servicios', href: '#servicios' },
              { label: 'Planes',    href: '#planes'    },
              { label: 'Horarios',  href: '#horarios'  },
              { label: 'Contacto',  href: '#contacto'  },
            ].map(({ label, href }) => (
              <a key={href} href={href}
                className="text-sm text-zinc-500 hover:text-foreground transition-colors font-medium">
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 border border-border text-foreground hover:bg-hover-md text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Clase de prueba gratis
            </a>
            <Link href="/login"
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
              Ingresar
            </Link>
            <button onClick={() => setMenuOpen(v => !v)}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-hover-md transition-colors text-foreground"
              aria-label="Menú">
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Menú móvil */}
        {menuOpen && (
          <div className="md:hidden border-t border-border bg-surface px-4 py-3 space-y-1">
            {[
              { label: 'Nosotros',  href: '#nosotros'  },
              { label: 'Servicios', href: '#servicios' },
              { label: 'Planes',    href: '#planes'    },
              { label: 'Horarios',  href: '#horarios'  },
              { label: 'Contacto',  href: '#contacto'  },
            ].map(({ label, href }) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}
                className="block py-2.5 text-sm font-medium text-zinc-500 hover:text-foreground transition-colors">
                {label}
              </a>
            ))}
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="block py-2.5 text-sm font-medium text-red-500">
              Clase de prueba gratis →
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="inicio" className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-16">
        {/* Imagen de fondo */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-bg.avif" alt="" className="w-full h-full object-cover" aria-hidden="true" />
          {/* Overlay oscuro para legibilidad del texto */}
          <div className="absolute inset-0 bg-black/65" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[3px] text-red-500 mb-8 px-4 py-2 rounded-full border border-red-500/40 bg-red-600/10">
            Entrenamiento · Rehabilitación · Bienestar
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none mb-6 text-foreground">
            No entrenas solo.<br />
            <span className="text-red-600">Te acompañamos en cada paso.</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Entrenamiento personalizado, seguimiento continuo y apoyo profesional para que avances con seguridad hacia tus objetivos.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#planes"
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-7 py-3.5 rounded-xl transition-colors text-sm">
              Conocé nuestros planes →
            </a>
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="border border-border-strong text-foreground hover:bg-hover-md font-medium px-7 py-3.5 rounded-xl transition-colors text-sm">
              Agenda tu clase de prueba
            </a>
          </div>
        </div>

        <div className="relative z-10 mt-16 text-zinc-400 text-xl animate-bounce">↓</div>
      </section>

      {/* ── SOBRE NOSOTROS ── */}
      <section id="nosotros" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[3px] text-red-600 mb-4">Sobre nosotros</div>
              <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-6 leading-tight">
                El progreso no es casualidad.
              </h2>
              <div className="space-y-4 text-zinc-500 leading-relaxed text-sm sm:text-base">
                <p>
                  Redline nació con la idea de crear un gimnasio donde cualquier persona pueda sentirse cómoda entrenando, sin importar su nivel de experiencia. Aquí valoramos el esfuerzo diario, el compañerismo y el progreso de cada alumno.
                </p>
                <p>
                  Nuestro objetivo es ayudarte a construir hábitos saludables, superar tus propios límites y disfrutar del proceso. Porque en Redline cada entrenamiento cuenta y cada avance importa.
                </p>
              </div>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-red-600 font-bold text-sm hover:text-red-500 transition-colors mt-6">
                Agenda tu primera clase gratuita →
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { valor: '100%',    label: 'Personalizado' },
                { valor: 'Coaches', label: 'Certificados'  },
                { valor: 'Todos',   label: 'Los niveles'   },
                { valor: '6 días',  label: 'A la semana'   },
              ].map(({ valor, label }) => (
                <div key={label} className="bg-surface border border-border rounded-2xl p-6 text-center">
                  <div className="text-2xl sm:text-3xl font-black text-red-600 mb-1">{valor}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section id="servicios" className="py-24 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[10px] font-bold uppercase tracking-[3px] text-red-600 mb-4">Servicios</div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">Un enfoque integral</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Musculación */}
            <div className="bg-background border border-border rounded-2xl p-7">
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-5 p-3">
                <Image src="/icono_musculacion.png" alt="Musculación" width={40} height={40} className="w-full h-full object-contain" />
              </div>
              <h3 className="text-lg font-black text-foreground mb-3">Musculación</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Entrenamiento de fuerza para mejorar tu composición corporal, ganar masa muscular y reducir grasa. Planificación progresiva para todos los niveles.</p>
            </div>

            {/* Reintegro Deportivo */}
            <div className="bg-background border border-border rounded-2xl p-7">
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-5 p-3">
                <Image src="/icono_reintegro_deportivo.png" alt="Reintegro Deportivo" width={40} height={40} className="w-full h-full object-contain" />
              </div>
              <h3 className="text-lg font-black text-foreground mb-3">Reintegro Deportivo</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">¿Vuelves de una lesión? Te guiamos paso a paso para retomar el movimiento de forma segura y sin recaídas. Protocolos adaptados a tu proceso y tus tiempos.</p>
            </div>

            {/* Kinesiología */}
            <div className="bg-background border border-border rounded-2xl p-7">
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-5 p-3">
                <Image src="/icono_kinesiologia.png" alt="Kinesiología" width={40} height={40} className="w-full h-full object-contain" />
              </div>
              <h3 className="text-lg font-black text-foreground mb-3">Kinesiología</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Apoyo profesional para recuperación, prevención y mejora del movimiento. Nuestro kinesiólogo trabaja integrado al entrenamiento para que tu proceso sea completo.</p>
            </div>

          </div>
        </div>
      </section>

      {/* ── PLANES ── */}
      <section id="planes" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-[10px] font-bold uppercase tracking-[3px] text-red-600 mb-4">Planes y precios</div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">Elige el que se adapta a ti</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Plan Personalizado */}
            <div className="bg-red-600 rounded-2xl p-7 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="text-[10px] font-bold uppercase tracking-widest text-red-200 mb-2">Más popular</div>
                <h3 className="text-xl font-black mb-1">Plan Personalizado</h3>
                <p className="text-red-100 text-sm mb-6">
                  Sesiones individuales de una hora. Trabajás solo con tu profesor, con dedicación exclusiva.
                </p>
                <div className="space-y-3 mb-6">
                  {[
                    { f: '2x por semana', p: '$160.000' },
                    { f: '3x por semana', p: '$190.000' },
                    { f: '4x por semana', p: '$250.000' },
                  ].map(({ f, p }) => (
                    <div key={f} className="flex items-center justify-between bg-white/10 rounded-xl px-4 py-2.5">
                      <span className="text-sm text-red-50">{f}</span>
                      <span className="text-sm font-black">{p}/mes</span>
                    </div>
                  ))}
                </div>
                <a href={waLink} target="_blank" rel="noopener noreferrer"
                  className="block text-center bg-white text-red-600 font-bold py-3 rounded-xl hover:bg-red-50 transition-colors text-sm">
                  Consultar →
                </a>
              </div>
            </div>

            {/* Plan Semi Personalizado */}
            <div className="bg-surface border border-border rounded-2xl p-7">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Semi Personalizado</div>
              <h3 className="text-xl font-black text-foreground mb-1">Plan Semi Personalizado</h3>
              <p className="text-zinc-500 text-sm mb-6">
                Grupos de máximo 8 personas. Cada alumno entrena con su propia pauta. Ambiente grupal con atención individual.
              </p>
              <div className="space-y-3 mb-6">
                {[
                  { f: '2x por semana', p: '$110.000' },
                  { f: '3x por semana', p: '$130.000' },
                  { f: '4x por semana', p: '$150.000' },
                ].map(({ f, p }) => (
                  <div key={f} className="flex items-center justify-between bg-hover border border-border rounded-xl px-4 py-2.5">
                    <span className="text-sm text-foreground">{f}</span>
                    <span className="text-sm font-black text-foreground">{p}/mes</span>
                  </div>
                ))}
              </div>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="block text-center border border-border-strong text-foreground hover:bg-hover-md font-bold py-3 rounded-xl transition-colors text-sm">
                Consultar →
              </a>
            </div>
          </div>

          <p className="text-center text-sm text-zinc-500 mt-6">
            ¿No sabes cuál elegir?{' '}
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="text-red-500 font-medium hover:text-red-400 transition-colors">
              Escribinos y te ayudamos →
            </a>
          </p>
        </div>
      </section>

      {/* ── EXPERIENCIAS ── */}
      <section className="py-24 px-4 bg-surface">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[10px] font-bold uppercase tracking-[3px] text-red-600 mb-4">Experiencias</div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">Lo que dicen nuestros alumnos</h2>
          </div>
          <Carrusel />
        </div>
      </section>

      {/* ── HORARIOS ── */}
      <section id="horarios" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[10px] font-bold uppercase tracking-[3px] text-red-600 mb-4">Horarios</div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground">Nos adaptamos a tu rutina</h2>
            <p className="text-zinc-500 mt-3 text-sm">
              Consultá disponibilidad por WhatsApp. Buscamos el horario que más te acomode.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 bg-raised border-b border-border px-5 py-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Día</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Mañana</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Tarde</div>
            </div>
            {HORARIOS_SIMULADOS.map((h, i) => (
              <div key={h.dia}
                className={`grid grid-cols-3 px-5 py-3.5 border-b border-border last:border-b-0 ${i % 2 === 0 ? '' : 'bg-hover/40'}`}>
                <div className="text-sm font-bold text-foreground">{h.dia}</div>
                <div className="text-sm text-zinc-500">{h.mañana}</div>
                <div className="text-sm text-zinc-500">{h.tarde}</div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-zinc-600 mt-4">
            * Horarios referenciales. Confirmá disponibilidad vía WhatsApp.
          </p>
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section id="contacto" className="py-24 px-4 bg-surface">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-[10px] font-bold uppercase tracking-[3px] text-red-600 mb-4">Contacto</div>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground mb-4">
            ¿Listo para empezar?
          </h2>
          <p className="text-zinc-500 text-sm mb-12 max-w-md mx-auto">
            Ven por tu clase de prueba totalmente gratis y conoce RedLine en persona.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">

            {/* Dirección */}
            <div className="bg-background border border-border rounded-2xl p-6 text-center hover:border-red-600/40 transition-colors">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3 border border-zinc-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Dirección</div>
              <span className="text-sm font-medium text-foreground">{DIRECCION}</span>
            </div>

            {/* WhatsApp */}
            <div className="bg-background border border-border rounded-2xl p-6 text-center hover:border-red-600/40 transition-colors">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3 border border-zinc-700">
                <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12 12 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">WhatsApp</div>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="text-sm font-medium text-foreground hover:text-red-600 transition-colors">
                {WHATSAPP}
              </a>
            </div>

            {/* Instagram */}
            <div className="bg-background border border-border rounded-2xl p-6 text-center hover:border-red-600/40 transition-colors">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3 border border-zinc-700">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.5" fill="white" stroke="none"/>
                </svg>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Instagram</div>
              <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer"
                className="text-sm font-medium text-foreground hover:text-red-600 transition-colors">
                @{INSTAGRAM}
              </a>
            </div>

          </div>

          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-4 rounded-xl transition-colors text-sm">
            Agenda tu clase de prueba gratis →
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo_oscuro.png" alt="RedLine" className="h-6 w-auto object-contain" />
          <span className="text-xs text-zinc-600 text-center">
            © {new Date().getFullYear()} RedLine · Entrenamiento · Rehabilitación · Bienestar
          </span>
          <Link href="/login"
            className="text-xs text-zinc-500 hover:text-foreground transition-colors font-medium">
            Ingresar al sistema →
          </Link>
        </div>
      </footer>

      {/* ── Botón flotante WhatsApp ── */}
      <a
        href={waLink}
        target="_blank"
        rel="noopener noreferrer"
        title="Chatear por WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95 hover:scale-105"
        style={{ background: '#25D366' }}
      >
        <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

    </div>
  )
}
