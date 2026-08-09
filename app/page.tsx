'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ── Datos editables ───────────────────────────────────────────────────────────
const WHATSAPP  = '+56986934684'   // ← número real de Pinkline
const INSTAGRAM = 'pinkline.gym'   // ← sin @
const DIRECCION = 'Doña Isabel 742, Lomas de lo Aguirre.'

const IMAGENES_EXPERIENCIA = [
  { imagen: '/experiencia-1.jpg', posicion: 'center 55%' },
  { imagen: '/experiencia-2.jpg', posicion: 'center 50%' },
  { imagen: '/experiencia-3.jpg', posicion: 'center' },
  { imagen: '/experiencia-4.jpg', posicion: 'center 20%' },
  { imagen: '/experiencia-5.jpg', posicion: 'center' },
  { imagen: '/experiencia-6.jpg', posicion: 'center' },
  { imagen: '/experiencia-7.jpg', posicion: 'center 22%' },
  { imagen: '/experiencia-8.jpg', posicion: 'center 55%' },
  { imagen: '/experiencia-9.jpg', posicion: 'center 28%' },
]

// ── Carrusel ──────────────────────────────────────────────────────────────────
function Carrusel() {
  const [idx, setIdx] = useState(0)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  function siguiente() { setIdx(i => (i + 1) % IMAGENES_EXPERIENCIA.length) }
  function anterior()  { setIdx(i => (i - 1 + IMAGENES_EXPERIENCIA.length) % IMAGENES_EXPERIENCIA.length) }
  function resetTimer() {
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(siguiente, 6000)
  }

  useEffect(() => {
    timer.current = setInterval(siguiente, 6000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [])

  return (
    <div className="relative max-w-3xl mx-auto">
      <div className="relative rounded-2xl overflow-hidden aspect-4/3 sm:aspect-video">
        <div
          className="absolute inset-0 flex bg-zinc-900 transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {IMAGENES_EXPERIENCIA.map((t, i) => (
            <div key={i} className="relative w-full h-full shrink-0 bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.imagen} alt="" className="w-full h-full object-cover block" style={{ objectPosition: t.posicion }} aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 mt-5">
        <button onClick={() => { anterior(); resetTimer() }}
          className="w-8 h-8 rounded-full border border-zinc-200 text-zinc-400 hover:text-zinc-700 hover:border-zinc-400 flex items-center justify-center transition-all text-sm">
          ←
        </button>
        <div className="flex gap-2">
          {IMAGENES_EXPERIENCIA.map((_, i) => (
            <button key={i} onClick={() => { setIdx(i); resetTimer() }}
              className={`h-2 rounded-full transition-all ${i === idx ? 'bg-pink-500 w-6' : 'bg-zinc-300 w-2'}`} />
          ))}
        </div>
        <button onClick={() => { siguiente(); resetTimer() }}
          className="w-8 h-8 rounded-full border border-zinc-200 text-zinc-400 hover:text-zinc-700 hover:border-zinc-400 flex items-center justify-center transition-all text-sm">
          →
        </button>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const waLink   = `https://wa.me/${WHATSAPP.replace(/\D/g, '')}`
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Doña Isabel 742')}`

  return (
    <div className="min-h-screen" style={{ background: '#fff', color: '#111' }}>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-zinc-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-3 h-20 grid grid-cols-[auto_1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-4 lg:gap-10">
          <button onClick={() => setMenuOpen(v => !v)}
            className="md:hidden shrink-0 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors text-zinc-700"
            aria-label="Menú">
            {menuOpen ? '✕' : '☰'}
          </button>

          <a href="#inicio" className="shrink-0 justify-self-center lg:-ml-16 xl:-ml-24">
            {/* El PNG tiene mucho espacio transparente arriba/abajo del logo real;
                se recorta visualmente con un contenedor fijo + la imagen escalada
                y desplazada para que solo se vea la franja del logo.
                Tres tamaños: chico en mobile, mediano en tablet (md), grande en
                desktop (lg, "la versión de computador" que ya quedó perfecta). */}
            <div className="relative overflow-hidden w-[106.4px] h-[19.2px] md:w-[141.6px] md:h-[25.6px] lg:w-[195.2px] lg:h-[35.2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/imagenes pinkline/logosinfondo.png"
                alt="Pinkline"
                className="absolute max-w-none h-[93.6px] w-[140.8px] top-[-35.2px] left-[-17.6px] md:h-[124.8px] md:w-[187.2px] md:top-[-46.4px] md:left-[-23.2px] lg:h-[172px] lg:w-[257.6px] lg:top-[-64px] lg:left-[-32px]"
              />
            </div>
          </a>

          <div className="hidden md:flex items-center gap-4 lg:gap-10 justify-self-center">
            {[
              { label: 'Nosotras',  href: '#nosotras'  },
              { label: 'Servicios', href: '#servicios' },
              { label: 'Planes',    href: '#planes'    },
              { label: 'Horarios',  href: '#horarios'  },
              { label: 'Contacto',  href: '#contacto'  },
            ].map(({ label, href }) => (
              <a key={href} href={href}
                className="group relative text-sm lg:text-base text-zinc-500 hover:text-zinc-900 transition-colors font-medium py-1">
                {label}
                <span className="absolute left-0 -bottom-0.5 h-0.5 w-0 bg-pink-500 rounded-full transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 justify-self-end shrink-0">
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 border border-zinc-200 text-zinc-700 hover:border-pink-200 hover:bg-pink-50/50 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors">
              Clase de prueba gratis
            </a>
            <Link href="/login"
              className="bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold px-3.5 py-2 rounded-lg shadow-sm shadow-pink-500/30 hover:shadow-md hover:shadow-pink-500/40 transition-all">
              Ingresar
            </Link>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-zinc-100 bg-white px-4 py-3 space-y-1">
            {[
              { label: 'Nosotras',  href: '#nosotras'  },
              { label: 'Servicios', href: '#servicios' },
              { label: 'Planes',    href: '#planes'    },
              { label: 'Horarios',  href: '#horarios'  },
              { label: 'Contacto',  href: '#contacto'  },
            ].map(({ label, href }) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)}
                className="block py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors">
                {label}
              </a>
            ))}
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="block py-2.5 text-sm font-medium text-pink-500">
              Clase de prueba gratis →
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="inicio" className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20 pb-6">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-bg.png" alt="" className="w-full h-full object-cover" aria-hidden="true" />
          <div className="absolute inset-0 bg-black/72" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/imagenes pinkline/Pinkline-blanco-tagline.svg"
            alt="Pinkline"
            className="h-40 sm:h-52 w-auto mx-auto mb-2 object-contain"
          />


          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-none mb-4 text-white">
            Tu mejor versión<br />
            <span className="text-pink-400">empieza acá.</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-300 max-w-xl mx-auto mb-6 leading-relaxed">
            Entrenamiento personalizado en un espacio exclusivo para mujeres. Seguimiento continuo y apoyo profesional para que avances segura hacia tus objetivos.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="#planes"
              className="bg-pink-500 hover:bg-pink-600 text-white font-bold px-7 py-3.5 rounded-xl transition-colors text-sm">
              Conoce nuestros planes →
            </a>
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="border border-white/30 text-white hover:bg-white/10 font-medium px-7 py-3.5 rounded-xl transition-colors text-sm">
              Agenda tu clase de prueba
            </a>
          </div>
        </div>
      </section>

      {/* ── SOBRE NOSOTRAS ── */}
      <section id="nosotras" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-sm sm:text-base font-extrabold uppercase tracking-[4px] text-pink-600 mb-4">Sobre nosotras</div>
              <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 mb-6 leading-tight">
                Un espacio diseñado<br />para ti.
              </h2>
              <div className="space-y-4 text-zinc-500 leading-relaxed text-sm sm:text-base">
                <p>
                  En Pinkline creemos que entrenar debe sentirse como un espacio propio: cómodo, seguro y pensado exclusivamente para mujeres. No importa si estás empezando o ya tienes experiencia, siempre vas a contar con acompañamiento profesional real.
                </p>
                <p>
                  Trabajamos para que construyas hábitos que te duren, avances a tu propio ritmo y disfrutes cada etapa del camino. Acá no entrenas sola: cada logro se celebra en comunidad.
                </p>
              </div>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors mt-6">
                Agenda tu primera clase gratuita →
              </a>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { valor: '100%',   label: 'Personalizado' },
                { valor: 'Solo',   label: 'Para mujeres'  },
                { valor: 'Todos',  label: 'Los niveles'   },
                { valor: '6 días', label: 'A la semana'   },
              ].map(({ valor, label }) => (
                <div key={label} className="bg-pink-50 border border-pink-100 rounded-2xl p-6 text-center">
                  <div className="text-2xl sm:text-3xl font-black text-pink-500 mb-1">{valor}</div>
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section id="servicios" className="py-24 px-4 bg-zinc-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm sm:text-base font-extrabold uppercase tracking-[4px] text-pink-600 mb-4">Servicios</div>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900">Un enfoque integral</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-100 rounded-2xl p-7 hover:border-pink-200 transition-colors">
              <div className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center mb-5 p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/musculacion_icon.png" alt="Musculación" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">Musculación</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Entrena con rutinas personalizadas enfocadas en fuerza e hipertrofia. Progresa de forma segura y efectiva sin importar tu nivel de experiencia.</p>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-7 hover:border-pink-200 transition-colors">
              <div className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center mb-5 p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gap_icon.png" alt="GAP" className="w-[120%] h-[120%] object-contain" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">GAP</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Clases dirigidas a tonificar y fortalecer glúteos, abdomen y piernas. Ejercicios específicos y progresivos enfocados en las zonas más demandadas.</p>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-7 hover:border-pink-200 transition-colors">
              <div className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center mb-5 p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/flexibilidad_icon.png" alt="Movilidad y Flexibilidad" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">Movilidad y Flexibilidad</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Trabaja tu rango de movimiento, postura y elasticidad. Ideal para complementar cualquier tipo de entrenamiento y prevenir lesiones a largo plazo.</p>
            </div>

            <div className="bg-white border border-zinc-100 rounded-2xl p-7 hover:border-pink-200 transition-colors">
              <div className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center mb-5 p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/kine_icon.png" alt="Kinesiología" className="w-full h-full object-contain" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 mb-2">Kinesiología</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">Atención kinesiológica integrada al entrenamiento para la recuperación de lesiones y reintegro deportivo seguro.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLANES ── */}
      <section id="planes" className="py-24 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-sm sm:text-base font-extrabold uppercase tracking-[4px] text-pink-600 mb-4">Planes y precios</div>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900">Elige el que se adapta a ti</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Plan Personalizado */}
            <div className="bg-pink-500 rounded-2xl p-7 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <div className="text-[10px] font-bold uppercase tracking-widest text-pink-100 mb-2">Más popular</div>
                <h3 className="text-xl font-black mb-1">Plan Personalizado</h3>
                <p className="text-pink-100 text-sm mb-6">
                  Sesiones individuales de una hora. Trabajás sola con tu profesora, con dedicación exclusiva.
                </p>
                <div className="space-y-3 mb-6">
                  {[
                    { f: '2x por semana', p: '$160.000' },
                    { f: '3x por semana', p: '$190.000' },
                    { f: '4x por semana', p: '$250.000' },
                  ].map(({ f, p }) => (
                    <div key={f} className="flex items-center justify-between bg-white/15 rounded-xl px-4 py-2.5">
                      <span className="text-sm text-pink-50">{f}</span>
                      <span className="text-sm font-black">{p}/mes</span>
                    </div>
                  ))}
                </div>
                <a href={waLink} target="_blank" rel="noopener noreferrer"
                  className="block text-center bg-white text-pink-500 font-bold py-3 rounded-xl hover:bg-pink-50 transition-colors text-sm">
                  Consultar →
                </a>
              </div>
            </div>

            {/* Plan Semi Personalizado */}
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-7">
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Semi Personalizado</div>
              <h3 className="text-xl font-black text-zinc-900 mb-1">Plan Semi Personalizado</h3>
              <p className="text-zinc-500 text-sm mb-6">
                Grupos reducidos de mujeres. Cada una entrena con su propia pauta. Ambiente grupal con atención individual.
              </p>
              <div className="space-y-3 mb-6">
                {[
                  { f: '2x por semana', p: '$110.000' },
                  { f: '3x por semana', p: '$130.000' },
                  { f: '4x por semana', p: '$160.000' },
                ].map(({ f, p }) => (
                  <div key={f} className="flex items-center justify-between bg-white border border-zinc-100 rounded-xl px-4 py-2.5">
                    <span className="text-sm text-zinc-700">{f}</span>
                    <span className="text-sm font-black text-zinc-900">{p}/mes</span>
                  </div>
                ))}
              </div>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                className="block text-center border border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-bold py-3 rounded-xl transition-colors text-sm">
                Consultar →
              </a>
            </div>
          </div>

          <p className="text-center text-base sm:text-lg text-zinc-700 mt-6 font-medium">
            ¿No sabes cuál elegir?{' '}
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="text-pink-600 font-bold hover:text-pink-700 transition-colors">
              Escríbenos y te ayudamos →
            </a>
          </p>
        </div>
      </section>

      {/* ── EXPERIENCIAS ── */}
      <section className="py-24 px-4 bg-zinc-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-sm sm:text-base font-extrabold uppercase tracking-[4px] text-pink-600 mb-4">Experiencias</div>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-900">Momentos Pinkline</h2>
          </div>
          <Carrusel />
        </div>
      </section>

      {/* ── HORARIOS ── */}
      <section id="horarios" className="py-24 px-4 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-sm sm:text-base font-extrabold uppercase tracking-[4px] text-pink-600 mb-4">Horarios</div>
          <h2 className="text-3xl sm:text-5xl font-black text-zinc-900 leading-tight mb-6">
            Ven con nosotras<br />
            <span className="text-pink-500">y consulta tu horario ideal</span>
          </h2>
          <p className="text-zinc-500 text-sm sm:text-base max-w-lg mx-auto mb-10 leading-relaxed">
            Abrimos de lunes a sábado y armamos contigo el horario que mejor se acomode a tu rutina.
            Escríbenos por WhatsApp y te confirmamos disponibilidad enseguida.
          </p>
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold px-8 py-4 rounded-xl transition-colors text-sm sm:text-base">
            Consultar mi horario →
          </a>
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section id="contacto" className="py-24 px-4 bg-zinc-100">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm sm:text-base font-extrabold uppercase tracking-[4px] text-pink-600 mb-4">Contacto</div>
          <h2 className="text-3xl sm:text-4xl font-black text-zinc-900 mb-4">
            ¿Lista para empezar?
          </h2>
          <p className="text-zinc-500 text-sm mb-12 max-w-md mx-auto">
            Ven por tu clase de prueba totalmente gratis y conoce Pinkline en persona.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">

            <a href={mapsLink} target="_blank" rel="noopener noreferrer"
              className="block bg-white border border-zinc-100 rounded-2xl p-6 text-center hover:border-pink-200 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-3 border border-pink-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Dirección</div>
              <span className="text-sm font-medium text-zinc-700">{DIRECCION}</span>
            </a>

            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="block bg-white border border-zinc-100 rounded-2xl p-6 text-center hover:border-pink-200 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-3 border border-pink-100">
                <svg viewBox="0 0 24 24" fill="#ec4899" width="22" height="22">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12 12 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">WhatsApp</div>
              <span className="text-sm font-medium text-zinc-700">{WHATSAPP}</span>
            </a>

            <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer"
              className="block bg-white border border-zinc-100 rounded-2xl p-6 text-center hover:border-pink-200 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-3 border border-pink-100">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.5" fill="#ec4899" stroke="none"/>
                </svg>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Instagram</div>
              <span className="text-sm font-medium text-zinc-700">@{INSTAGRAM}</span>
            </a>
          </div>

          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-pink-500 hover:bg-pink-600 text-white font-bold px-8 py-4 rounded-xl transition-colors text-sm">
            Agenda tu clase de prueba gratis →
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-zinc-900 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/imagenes pinkline/Pinkline-blanco.svg" alt="Pinkline" className="h-6 w-auto object-contain" />
          <span className="text-xs text-zinc-400 text-center">
            © {new Date().getFullYear()} Pinkline · Entrenamiento exclusivo para mujeres
          </span>
          <div className="flex items-center gap-4">
            <Link href="/privacidad"
              className="text-xs text-zinc-400 hover:text-white transition-colors">
              Política de privacidad
            </Link>
            <Link href="/login"
              className="text-xs text-zinc-400 hover:text-white transition-colors font-medium">
              Ingresar al sistema →
            </Link>
          </div>
        </div>
      </footer>

      {/* ── Botón flotante WhatsApp ── */}
      <a href={waLink} target="_blank" rel="noopener noreferrer"
        title="Chatear por WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all active:scale-95 hover:scale-105"
        style={{ background: '#25D366' }}>
        <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>

    </div>
  )
}
