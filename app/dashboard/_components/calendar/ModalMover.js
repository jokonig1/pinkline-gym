'use client'

export default function ModalMover({
  slot, form, setForm,
  guardando, error,
  onGuardar, onDeshacer, onClose,
}) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-surface border border-border-strong rounded-2xl p-6 w-full max-w-md shadow-2xl">

        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-foreground font-bold text-base">Mover clase</h3>
            <p className="text-xs text-zinc-500 mt-1">
              <span className="text-foreground-2">{slot.alumno?.nombre}</span>
              {' · '}
              <span className="capitalize">{slot.dia}</span>
              {' '}{slot.hora?.slice(0, 5)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-foreground w-8 h-8 flex items-center justify-center rounded-lg hover:bg-hover-md transition-all"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">Nueva fecha</label>
              <input
                type="date"
                value={form.fecha_nueva}
                onChange={e => setForm(f => ({ ...f, fecha_nueva: e.target.value }))}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">Nueva hora</label>
              <input
                type="time"
                value={form.hora_nueva}
                onChange={e => setForm(f => ({ ...f, hora_nueva: e.target.value }))}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider block mb-1.5">
              Motivo <span className="normal-case text-zinc-600">(opcional)</span>
            </label>
            <input
              type="text"
              value={form.motivo}
              onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))}
              placeholder="Ej: Feriado, viaje, lesión..."
              className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 placeholder-zinc-600 transition-colors"
            />
          </div>

          <p className="text-[11px] text-zinc-600 bg-raised rounded-lg px-3 py-2.5 leading-relaxed">
            ℹ Solo aplica esta semana. La siguiente vuelve al horario habitual automáticamente.
          </p>

          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {slot.excepcion && (
            <button
              onClick={onDeshacer}
              className="w-full text-sm text-zinc-500 hover:text-foreground py-2.5 rounded-xl border border-border hover:bg-hover-md transition-all"
            >
              ↩ Restaurar al horario original
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={onGuardar}
              disabled={guardando}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
            >
              {guardando ? 'Guardando...' : 'Mover clase'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
