import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { coachTieneAccesoAlumno } from '@/lib/traspasos'

/**
 * GET /api/alumno/detalle?id=X
 * Ficha completa de un alumno (datos, horario fijo) para coach/admin.
 * El admin ve cualquier alumno; un coach solo el suyo o uno que esté
 * cubriendo hoy por un traspaso temporal vigente.
 */
export async function GET(req) {
  const { response, user, profile } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 })

  const { data: alumno } = await supabaseAdmin
    .from('alumnos')
    .select('*, coach:coach_id(nombre)')
    .eq('id', id)
    .single()

  if (!alumno) return Response.json({ error: 'Alumno no encontrado' }, { status: 404 })

  const esAdmin = profile.rol === 'admin'
  if (!esAdmin && !(await coachTieneAccesoAlumno(user.id, alumno))) {
    return Response.json({ error: 'No tienes acceso a este alumno' }, { status: 403 })
  }

  // Solo el horario fijo de inscripción: las clases extra/sobrecupo (fecha
  // puntual) no forman parte del horario semanal fijo del alumno.
  const { data: horarios } = await supabaseAdmin
    .from('alumno_horarios')
    .select('id, dia, hora, tipo, coach_id')
    .eq('alumno_id', id)
    .eq('activo', true)
    .is('fecha', null)
    .order('dia')
    .order('hora')

  return Response.json({
    alumno,
    horarios: horarios || [],
    soloLectura: !esAdmin && alumno.coach_id !== user.id,
  })
}
