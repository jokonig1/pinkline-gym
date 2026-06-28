import './globals.css'
import { ThemeProvider } from './providers'

export const metadata = {
  title: 'Pinkline Gimnasio',
  description: 'Entrenamiento personalizado exclusivo para mujeres.',
  icons: { icon: '/imagenes pinkline/Pinkline-iso-rosado.svg' },
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        {/* Previene el flash al cargar: aplica el tema guardado antes de que React hidrate */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark');}())` }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
