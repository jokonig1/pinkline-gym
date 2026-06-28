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
 * Resuelve el color de un slot según:
 *  1. color guardado en el coach del slot (join directo — fuente de verdad)
 *  2. color guardado en el array de coaches cargado en la página
 *  3. fallback: hash del coach_id para que cada perfil sin color asignado
 *     tenga siempre el mismo color (no aleatorio por posición)
 */
export function resolveColor(slot, coaches) {
  const coachId = slot?.coach_id

  // 1. Color del join (más confiable, incluye admins con color)
  const raw1 = slot?.coach?.color
  if (raw1 !== null && raw1 !== undefined)
    return COLORES_COACH[Number(raw1) % COLORES_COACH.length]

  // 2. Color del array coaches (puede incluir admins si el API los devuelve)
  const match = coaches.find(c => c.id === coachId)
  if (match?.color !== null && match?.color !== undefined)
    return COLORES_COACH[Number(match.color) % COLORES_COACH.length]

  // 3. Fallback: hash estable del UUID para no cambiar de color entre renders
  if (coachId) {
    const hash = coachId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
    return COLORES_COACH[hash % COLORES_COACH.length]
  }

  return COLORES_COACH[0]
}
