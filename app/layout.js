import './globals.css'
import { ThemeProvider } from './providers'

export const metadata = {
  title: 'RedLine Gimnasio',
  description: 'Plataforma de gestión integral',
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
