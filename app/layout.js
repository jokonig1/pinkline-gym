import './globals.css'
import { ThemeProvider } from './providers'

export const metadata = {
  metadataBase: new URL('https://pinklinegym.com'),
  title: 'Pinkline Gimnasio',
  description: 'Entrenamiento personalizado exclusivo para mujeres.',
  icons: { icon: '/imagenes pinkline/Pinkline-iso-rosado.svg' },
  openGraph: {
    title: 'Pinkline Gimnasio',
    description: 'Entrenamiento personalizado exclusivo para mujeres.',
    images: ['/foto.wsp.jpeg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pinkline Gimnasio',
    description: 'Entrenamiento personalizado exclusivo para mujeres.',
    images: ['/foto.wsp.jpeg'],
  },
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
