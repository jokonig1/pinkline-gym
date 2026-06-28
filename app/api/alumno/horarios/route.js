import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/alumno/horarios?alumno_id=X
 * Devuelve los horarios activos del alumno y las excepciones asociadas.
 * Usa supabaseAdmin para bypasear RLS (las tablas solo tienen permisos de coach/admin).
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const alumno_id = searchParams.get('alumno_id')
  if (!alumno_id) return Response.json({ horarios: [], excepciones: [] })

  const { data: horarios } = await supabaseAdmin
    .from('alumno_horarios')
    .select('id, dia, hora, tipo, coach_id, coach:coach_id(nombre)')
    .eq('alumno_id', alumno_id)
    .eq('activo', true)
    .order('dia').order('hora')

  const horarioIds = (horarios || []).map(h => h.id)

  let excepciones = []
  if (horarioIds.length > 0) {
    const { data: excs } = await supabaseAdmin
      .from('alumno_horarios_excepciones')
      .select('alumno_horario_id, fecha_original, fecha_nueva, hora_nueva, cancelado, motivo')
      .in('alumno_horario_id', horarioIds)
    excepciones = excs || []
  }

  return Response.json({ horarios: horarios || [], excepciones })
}
