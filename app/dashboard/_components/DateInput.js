'use client'

// Input de fecha con ícono propio (SVG) en vez del ícono nativo del navegador,
// que en mobile se ve como emoji a color y en desktop como ícono monocromo —
// mismo problema que tenía el toggle de tema, mismo tipo de solución.
export default function DateInput({ value, onChange, min, max, required, className, wrapperClassName }) {
  return (
    <div className={wrapperClassName || 'relative'}>
      <input
        type="date"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        required={required}
        className={`${className || ''} pr-8 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
      />
      <svg
        width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    </div>
  )
}
