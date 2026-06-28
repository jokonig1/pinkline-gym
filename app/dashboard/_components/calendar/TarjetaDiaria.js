'use client'
import { resolveColor } from './utils'

export default function TarjetaDiaria({
  slot, coaches, soloEditarCoachId,
  onAbrirAcciones,
}) {
  const color = resolveColor(slot, coaches)

  return (
    <div
      onClick={() => onAbrirAcciones(slot)}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 select-none transition-all w-full cursor-pointer hover:brightness-110 active:scale-[0.98]"
      style={{ background: color.bg, border: `1px solid ${color.border}30` }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
        style={{ background: color.border + '25', color: color.text }}
      >
        {slot.alumno?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>

      {/* Nombre + tipo */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold truncate leading-tight" style={{ color: color.border }}>
          {slot.alumno?.nombre}
        </div>
        <div className="text-[11px] truncate leading-tight mt-0.5" style={{ color: color.border + 'bb' }}>
          {slot.tipo === 'semipersonalizado' ? 'Semi Personalizado' : 'Personalizado'}
          {slot.coach?.nombre && <span> · {slot.coach.nombre.split(' ')[0]}</span>}
          {slot._movida && <span style={{ color: '#f59e0b' }}> · Reagendada</span>}
        </div>
      </div>

      {/* Indicador tap */}
      <span className="text-sm shrink-0 opacity-40" style={{ color: color.border }}>›</span>
    </div>
  )
}
