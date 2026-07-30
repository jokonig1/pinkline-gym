import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/horarios
 * Devuelve todos los horarios activos con sus excepciones.
 * Usa service_role para bypassar RLS — los coaches ven todos los alumnos,
 * pero los permisos de edición se controlan en el frontend (soloEditarCoachId).
 */
export async function GET() {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response
  // Horarios con join a alumno y coach
  let { data: horarios, error: hErr } = await supabaseAdmin
    .from('alumno_horarios')
    .select('*, alumno:alumno_id(id, nombre, plan), coach:coach_id(id, nombre, color)')
    .eq('activo', true)

  if (hErr) {
    // Fallback si la columna color no existe aún en el schema
    const { data: fallback } = await supabaseAdmin
      .from('alumno_horarios')
      .select('*, alumno:alumno_id(id, nombre, plan), coach:coach_id(id, nombre)')
      .eq('activo', true)
    horarios = fallback
  }

  horarios = horarios || []

  // Excepciones de todos los horarios en paralelo
  let excepciones = []
  if (horarios.length > 0) {
    const { data: exc } = await supabaseAdmin
      .from('alumno_horarios_excepciones')
      .select('*')
      .in('alumno_horario_id', horarios.map(h => h.id))
    excepciones = exc || []
  }

  // Traspasos temporales (todos, no solo los de hoy — el calendario navega a
  // otras semanas/meses) para resolver qué coach cubre cada clase en cada fecha.
  const { data: traspasos } = await supabaseAdmin
    .from('traspasos_coach')
    .select('*, origen:coach_origen_id(id,nombre), destino:coach_destino_id(id,nombre)')

  return Response.json({ horarios, excepciones, traspasos: traspasos || [] })
}
