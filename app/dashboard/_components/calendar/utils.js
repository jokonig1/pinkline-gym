import { COLORES_COACH } from '@/lib/constants'

/**
 * Convierte un Date a "YYYY-MM-DD" usando la zona horaria LOCAL.
 * No usar .toISOString() — en UTC-3/UTC-4 da el día anterior.
 */
export function toDateStr(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Nombre a mostrar de un slot: alumno registrado, o invitado sin ficha.
 */
export function nombreSlot(slot) {
  return slot.alumno?.nombre || slot.invitado_nombre || '—'
}

/**
 * Traspaso vigente para un horario en una fecha dada (o null si no aplica).
 * Uno acotado a ese alumno específico manda sobre uno general del mismo coach origen.
 */
export function coachEfectivo(h, fechaStr, traspasos) {
  const activos = (traspasos || []).filter(t =>
    t.coach_origen_id === h.coach_id && fechaStr >= t.fecha_desde && fechaStr <= t.fecha_hasta
  )
  return activos.find(t => t.alumno_id === h.alumno_id) || activos.find(t => t.alumno_id === null) || null
}

/**
 * Resuelve el color de un slot según:
 *  1. color guardado en el coach del slot (join directo — fuente de verdad)
 *  2. color guardado en el array de coaches cargado en la página
 *  3. fallback: posición del coach en el array `coaches` — el mismo criterio
 *     que usa la lista de Coaches, para que un coach sin color asignado se
 *     vea IGUAL en ambas pantallas (antes cada una usaba un cálculo distinto
 *     y podían no coincidir, o dos coaches distintos podían chocar de color)
 */
export function resolveColor(slot, coaches) {
  const coachId = slot?.coach_id

  // 1. Color del join (más confiable, incluye admins con color)
  const raw1 = slot?.coach?.color
  if (raw1 !== null && raw1 !== undefined)
    return COLORES_COACH[Number(raw1) % COLORES_COACH.length]

  // 2. Color del array coaches, o su posición si no tiene color asignado
  const idx = coaches.findIndex(c => c.id === coachId)
  if (idx !== -1) {
    const match = coaches[idx]
    const raw2 = match.color
    return raw2 !== null && raw2 !== undefined
      ? COLORES_COACH[Number(raw2) % COLORES_COACH.length]
      : COLORES_COACH[idx % COLORES_COACH.length]
  }

  return COLORES_COACH[0]
}
