import { DIAS } from '@/lib/constants'

/**
 * Devuelve los 6 días laborales (lunes–sábado) de la semana
 * desplazada por `semanaOffset` semanas desde hoy.
 */
export function getSemana(semanaOffset) {
  const hoy = new Date()
  hoy.setDate(hoy.getDate() + semanaOffset * 7)
  const dia   = hoy.getDay()
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - (dia === 0 ? 6 : dia - 1))

  return DIAS.map((d, i) => {
    const fecha = new Date(lunes)
    fecha.setDate(lunes.getDate() + i)
    return { dia: d, fecha }
  })
}
