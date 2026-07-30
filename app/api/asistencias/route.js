import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { asistenciaSchema, parseBody } from '@/lib/schemas'

/**
 * GET /api/asistencias?coach_id=X&fecha=YYYY-MM-DD[&alumno_horario_id=Y]
 */
export async function GET(req) {
  const { response } = await requireAuth(['admin', 'coach', 'alumno'])
  if (response) return response

  const { searchParams } = new URL(req.url)
  const coachId         = searchParams.get('coach_id')
  const alumnoHorarioId = searchParams.get('alumno_horario_id')
  const fecha           = searchParams.get('fecha')
  const alumnoId        = searchParams.get('alumno_id')

  // Historial completo de un alumno (usado por su propia vista "Mis clases")
  if (alumnoId && !coachId) {
    const { data } = await supabaseAdmin
      .from('asistencias')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('fecha')
    return Response.json(data || [])
  }

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
 */
export async function POST(req) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(asistenciaSchema, await req.json())
  if (validationError) return validationError

  const { alumno_id, coach_id, alumno_horario_id, fecha, hora, asistio, notas } = body

  let query = supabaseAdmin
    .from('asistencias')
    .select('id')
    .eq('coach_id', coach_id)
    .eq('fecha', fecha)

  query = alumno_id ? query.eq('alumno_id', alumno_id) : query.is('alumno_id', null)
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

  if (result.error) return Response.json({ error: 'Error al guardar la asistencia' }, { status: 500 })
  return Response.json(result.data)
}
