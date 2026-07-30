import { supabaseAdmin } from '@/lib/supabase/admin'

function hoyStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * ¿Puede este coach ver la ficha/historial de este alumno?
 * Sí si es su propio alumno, o si hoy lo está cubriendo por un traspaso
 * temporal vigente (general o acotado a este alumno específico).
 */
export async function coachTieneAccesoAlumno(coachId, alumno) {
  if (alumno.coach_id === coachId) return true

  const hoy = hoyStr()
  const { data } = await supabaseAdmin
    .from('traspasos_coach')
    .select('alumno_id')
    .eq('coach_origen_id', alumno.coach_id)
    .eq('coach_destino_id', coachId)
    .lte('fecha_desde', hoy)
    .gte('fecha_hasta', hoy)

  return (data || []).some(t => t.alumno_id === null || t.alumno_id === alumno.id)
}
