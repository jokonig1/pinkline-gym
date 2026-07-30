'use client'
import Link from 'next/link'

const CONTACTO_EMAIL = 'gympinkline@gmail.com'
const GIMNASIO_NOMBRE = 'Pinkline'
const GIMNASIO_DIRECCION = 'Doña Isabel 742, Lomas de lo Aguirre.'
const VIGENCIA_LEY = '1 de diciembre de 2026'

export default function PoliticaPrivacidad() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">

      {/* Navbar mínimo */}
      <nav className="border-b border-border px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-widest text-pink-600">
            PINK<span className="text-foreground">LINE</span>
          </Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-foreground transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        {/* Encabezado */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[3px] text-pink-600 mb-3">
            Documento legal
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-3">
            Política de Privacidad
          </h1>
          <p className="text-zinc-500 text-sm">
            <strong className="text-foreground">{GIMNASIO_NOMBRE}</strong> —
            Última actualización: julio de 2026.
            Cumple con la <strong className="text-foreground">Ley N° 21.719</strong> sobre
            Protección de Datos Personales (vigente desde el {VIGENCIA_LEY}).
          </p>
        </div>

        <hr className="border-border" />

        {/* 1. Responsable */}
        <Section title="1. Responsable del tratamiento">
          <p>
            El responsable del tratamiento de sus datos personales es:
          </p>
          <InfoBox>
            <Item label="Nombre">{GIMNASIO_NOMBRE}</Item>
            <Item label="Dirección">{GIMNASIO_DIRECCION}</Item>
            <Item label="Contacto"><a href={`mailto:${CONTACTO_EMAIL}`} className="text-pink-500 hover:text-pink-400">{CONTACTO_EMAIL}</a></Item>
          </InfoBox>
        </Section>

        {/* 2. Datos que recopilamos */}
        <Section title="2. Datos personales que recopilamos">
          <p>Recopilamos los siguientes datos cuando se inscribe a través de nuestro formulario:</p>
          <ul className="space-y-1 mt-3">
            {[
              'Nombre completo y RUT',
              'Fecha de nacimiento',
              'Teléfono y correo electrónico',
              'Información de contacto de emergencia',
              'Datos de salud relevantes: restricciones médicas, lesiones (categoría de datos sensibles)',
              'Medidas corporales: peso y altura (con fines de seguimiento deportivo)',
              'Información sobre su plan de entrenamiento y objetivos',
            ].map(item => (
              <li key={item} className="flex gap-2 text-zinc-400 text-sm">
                <span className="text-pink-500 shrink-0">·</span>{item}
              </li>
            ))}
          </ul>
        </Section>

        {/* 3. Finalidad */}
        <Section title="3. Finalidad del tratamiento">
          <p>Sus datos se utilizan exclusivamente para:</p>
          <ul className="space-y-1 mt-3">
            {[
              'Gestionar su inscripción y membresía en el gimnasio',
              'Asignar un coach y horarios de entrenamiento',
              'Registrar asistencia y seguimiento de progreso físico',
              'Coordinar clases y comunicaciones operativas',
              'Cumplir con obligaciones legales aplicables',
            ].map(item => (
              <li key={item} className="flex gap-2 text-zinc-400 text-sm">
                <span className="text-pink-500 shrink-0">·</span>{item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-zinc-500 text-sm">
            <strong className="text-foreground">No compartimos</strong> sus datos con terceros con fines comerciales
            ni publicitarios. Sus datos no son vendidos ni cedidos a empresas externas.
          </p>
        </Section>

        {/* 4. Base de legitimación */}
        <Section title="4. Base legal del tratamiento">
          <p>
            El tratamiento de sus datos se basa en el <strong className="text-foreground">consentimiento
            expreso</strong> que usted otorga al momento de completar el formulario de inscripción,
            y en la <strong className="text-foreground">ejecución de la relación contractual</strong> de
            membresía. Los datos de salud (categoría sensible) son tratados con su consentimiento explícito
            para la correcta planificación del entrenamiento.
          </p>
        </Section>

        {/* 5. Plazo de conservación */}
        <Section title="5. Plazo de conservación">
          <p>
            Sus datos se conservan mientras mantenga una relación activa con {GIMNASIO_NOMBRE} y,
            posteriormente, durante el plazo mínimo exigido por la legislación chilena vigente
            (generalmente 5 años para efectos contables y legales). Transcurrido dicho plazo,
            los datos serán eliminados o anonimizados de forma irreversible.
          </p>
        </Section>

        {/* 6. ARCOP — Derechos */}
        <Section title="6. Sus derechos (ARCOP + Portabilidad)">
          <p className="mb-4">
            De acuerdo con la Ley N° 21.719, usted tiene los siguientes derechos sobre sus datos personales:
          </p>

          <div className="space-y-4">
            <Derecho letra="A" titulo="Acceso">
              Solicitar información sobre qué datos personales suyos tenemos, de dónde provienen,
              con qué finalidad los usamos y si los hemos compartido con terceros.
            </Derecho>
            <Derecho letra="R" titulo="Rectificación">
              Solicitar la corrección de datos inexactos, incompletos o desactualizados.
            </Derecho>
            <Derecho letra="C" titulo="Cancelación (Supresión)">
              Solicitar la eliminación de sus datos cuando ya no sean necesarios para la finalidad
              con que fueron recogidos, haya revocado su consentimiento, u otros supuestos legales.
            </Derecho>
            <Derecho letra="O" titulo="Oposición">
              Oponerse al tratamiento de sus datos en determinadas circunstancias, incluyendo
              el tratamiento con fines de marketing o cuando el tratamiento se base en un interés legítimo.
            </Derecho>
            <Derecho letra="P" titulo="Portabilidad">
              Recibir sus datos personales en un formato estructurado, de uso común y lectura mecánica,
              y transmitirlos a otro responsable del tratamiento cuando sea técnicamente posible.
            </Derecho>
          </div>

          <div className="mt-6 bg-pink-600/10 border border-pink-600/20 rounded-xl p-4">
            <p className="text-sm font-bold text-foreground mb-1">¿Cómo ejercer sus derechos?</p>
            <p className="text-sm text-zinc-400">
              Envíe su solicitud a{' '}
              <a href={`mailto:${CONTACTO_EMAIL}`} className="text-pink-500 hover:text-pink-400 font-medium">
                {CONTACTO_EMAIL}
              </a>{' '}
              indicando su nombre completo, RUT y el derecho que desea ejercer. Responderemos
              dentro del plazo legal de <strong className="text-foreground">30 días hábiles</strong>.
            </p>
          </div>
        </Section>

        {/* 7. Seguridad */}
        <Section title="7. Medidas de seguridad">
          <p>
            Implementamos medidas técnicas y organizativas para proteger sus datos personales,
            incluyendo cifrado de comunicaciones (HTTPS/TLS), control de acceso basado en roles,
            autenticación con contraseña y almacenamiento seguro en servidores con certificaciones
            de seguridad. El acceso a los datos está limitado únicamente al personal necesario
            para prestar el servicio.
          </p>
        </Section>

        {/* 8. Cookies */}
        <Section title="8. Cookies y tecnologías de rastreo">
          <p>
            Este sitio web utiliza únicamente <strong className="text-foreground">cookies técnicas
            estrictamente necesarias</strong> para el funcionamiento de la sesión de usuario.
            No utilizamos cookies de publicidad, perfiles de comportamiento ni tecnologías
            de rastreo de terceros (Google Analytics, Meta Pixel u otros).
          </p>
        </Section>

        {/* 9. Modificaciones */}
        <Section title="9. Modificaciones a esta política">
          <p>
            Podemos actualizar esta política de privacidad para reflejar cambios legales o en
            nuestras prácticas. Las modificaciones relevantes serán notificadas por correo
            electrónico al titular de los datos. La versión vigente siempre estará disponible
            en esta página.
          </p>
        </Section>

        {/* 10. Autoridad */}
        <Section title="10. Autoridad de control">
          <p>
            Si considera que el tratamiento de sus datos no cumple con la legislación vigente,
            tiene derecho a presentar una reclamación ante el{' '}
            <strong className="text-foreground">Consejo para la Transparencia</strong> (mientras
            no entre en funciones la Agencia de Protección de Datos Personales contemplada en la
            Ley N° 21.719) o ante los tribunales de justicia competentes.
          </p>
        </Section>

        <hr className="border-border" />

        <p className="text-xs text-zinc-600 text-center pb-8">
          {GIMNASIO_NOMBRE} · {GIMNASIO_DIRECCION} · {CONTACTO_EMAIL}
          <br />
          Política vigente desde julio de 2026 · Ley N° 21.719 (en vigor desde {VIGENCIA_LEY})
        </p>
      </main>
    </div>
  )
}

// ── Componentes de apoyo ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-foreground">{title}</h2>
      <div className="text-zinc-400 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 bg-surface border border-border rounded-xl p-4 space-y-2">
      {children}
    </div>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-zinc-500 w-24 shrink-0">{label}:</span>
      <span className="text-foreground">{children}</span>
    </div>
  )
}

function Derecho({ letra, titulo, children }: { letra: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 bg-surface border border-border rounded-xl p-4">
      <div className="w-9 h-9 rounded-full bg-pink-600/15 border border-pink-600/30 flex items-center justify-center text-sm font-black text-pink-500 shrink-0">
        {letra}
      </div>
      <div>
        <div className="text-sm font-bold text-foreground mb-0.5">Derecho de {titulo}</div>
        <div className="text-xs text-zinc-500 leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
