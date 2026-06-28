export default function StatusBadge({ activo }) {
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
      activo ? 'bg-green-500/10 text-green-500' : 'bg-zinc-500/10 text-zinc-500'
    }`}>
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  )
}
