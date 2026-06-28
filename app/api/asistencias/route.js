import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/asistencias?coach_id=X&fecha=YYYY-MM-DD[&alumno_horario_id=Y]
 * Sin alumno_horario_id → devuelve array de todas las asistencias del coach en esa fecha.
 * Con alumno_horario_id  → devuelve el objeto único de ese slot (o null).
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const coachId         = searchParams.get('coach_id')
  const alumnoHorarioId = searchParams.get('alumno_horario_id')
  const fecha           = searchParams.get('fecha')

  if (!coachId || !fecha) return Response.json(alumnoHorarioId ? null : [])

  let query = supabaseAdmin
    .from('asistencias')
    .select('*')
    .eq('coach_id', coachId)
    .eq('fecha', fecha)

  if (alumnoHorarioId) {
    query = query.eq('alumno_horario_id', alumnoHorarioId)
    const { data } = await query.maybeSingle()
    return Response.json(data)
  }

  const { data } = await query
  return Response.json(data || [])
}

/**
 * POST /api/asistencias
 * Crea o actualiza (upsert) un registro de asistencia.
 * Body: { alumno_id, coach_id, alumno_horario_id, fecha, hora, asistio, notas }
 */
export async function POST(req) {
  const body = await req.json()
  const { alumno_id, coach_id, alumno_horario_id, fecha, hora, asistio, notas } = body

  if (!alumno_id || !coach_id || !fecha) {
    return Response.json({ error: 'alumno_id, coach_id y fecha son requeridos' }, { status: 400 })
  }

  // Buscar si ya existe para hacer upsert
  let query = supabaseAdmin
    .from('asistencias')
    .select('id')
    .eq('alumno_id', alumno_id)
    .eq('coach_id', coach_id)
    .eq('fecha', fecha)

  if (alumno_horario_id) query = query.eq('alumno_horario_id', alumno_horario_id)
  const { data: existing } = await query.maybeSingle()

  let result
  if (existing?.id) {
    const { data, error } = await supabaseAdmin
      .from('asistencias')
      .update({ asistio, notas })
      .eq('id', existing.id)
      .select()
      .single()
    result = { data, error }
  } else {
    const { data, error } = await supabaseAdmin
      .from('asistencias')
      .insert({ alumno_id, coach_id, alumno_horario_id, fecha, hora, asistio, notas })
      .select()
      .single()
    result = { data, error }
  }

  if (result.error) return Response.json({ error: result.error.message }, { status: 500 })
  return Response.json(result.data)
}
