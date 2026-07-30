'use client'

// Íconos para estados vacíos (sin clases, sin sesiones, etc.) en vez de
// emojis — mismo criterio que el toggle de tema y los inputs de fecha:
// un ícono SVG se ve igual en cualquier dispositivo, un emoji no.
const PATHS = {
  calendario: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  advertencia: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  pesas: (
    <>
      <rect x="1" y="9" width="4" height="6" rx="1" />
      <rect x="19" y="9" width="4" height="6" rx="1" />
      <rect x="5" y="7" width="3" height="10" rx="1" />
      <rect x="16" y="7" width="3" height="10" rx="1" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  lista: (
    <>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="16" y2="15" />
    </>
  ),
}

export default function EmptyIcon({ tipo, className = 'w-9 h-9' }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round"
      className={`mx-auto ${className}`}
    >
      {PATHS[tipo]}
    </svg>
  )
}
