'use client'
import { resolveColor, nombreSlot } from './utils'

export default function TarjetaSemanal({
  slot, coaches, soloEditarCoachId,
  onAbrirAcciones,
}) {
  const color    = resolveColor(slot, coaches)
  const firstName = nombreSlot(slot).split(' ')[0]

  return (
    <div
      onClick={() => onAbrirAcciones(slot)}
      className="rounded p-0.5 mb-0.5 select-none transition-all cursor-pointer hover:brightness-110 active:scale-95"
      style={{ background: color.bg, borderLeft: `2px solid ${color.border}` }}
    >
      <div className="text-[8px] sm:text-[9px] font-bold leading-tight truncate"
        style={{ color: color.border }}>
        {firstName}
      </div>
      <div className="hidden sm:block text-[7px] leading-tight mt-0.5 truncate"
        style={{ color: color.border + 'cc' }}>
        {slot.tipo === 'semipersonalizado' ? 'Semi' : 'Personal'}
      </div>
    </div>
  )
}
