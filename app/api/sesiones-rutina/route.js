import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sesionRutinaSchema, parseBody } from '@/lib/schemas'
import { coachTieneAccesoAlumno } from '@/lib/traspasos'

export async function GET(req) {
  const { response, user, profile } = await requireAuth(['admin', 'coach', 'alumno'])
  if (response) return response

  const { searchParams } = new URL(req.url)
  const alumnoId     = searchParams.get('alumno_id')
  const rutinaNombre = searchParams.get('rutina_nombre')
  const fechaDesde   = searchParams.get('fecha_desde')
  const fechaHasta   = searchParams.get('fecha_hasta')
  const limit        = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  if (!alumnoId) return Response.json(rutinaNombre ? null : [])

  if (profile?.rol === 'coach') {
    const { data: alumno } = await supabaseAdmin.from('alumnos').select('id, coach_id').eq('id', alumnoId).single()
    if (!alumno || !(await coachTieneAccesoAlumno(user.id, alumno))) {
      return Response.json({ error: 'No tienes acceso a este alumno' }, { status: 403 })
    }
  }

  let query = supabaseAdmin
    .from('sesiones_rutina')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (rutinaNombre) {
    const { data } = await query.eq('rutina_nombre', rutinaNombre).limit(1).maybeSingle()
    return Response.json(data)
  }

  if (fechaDesde) query = query.gte('fecha', fechaDesde)
  if (fechaHasta) query = query.lte('fecha', fechaHasta)

  const { data } = await query.limit(limit)
  return Response.json(data || [])
}

export async function POST(req) {
  const { response } = await requireAuth(['admin', 'coach', 'alumno'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(sesionRutinaSchema, await req.json())
  if (validationError) return validationError

  // Una sesión por alumno/clase/día — si ya existe, se actualiza en vez de duplicar.
  let existeQuery = supabaseAdmin
    .from('sesiones_rutina')
    .select('id')
    .eq('coach_id', body.coach_id)
    .eq('fecha', body.fecha)
  existeQuery = body.alumno_id ? existeQuery.eq('alumno_id', body.alumno_id) : existeQuery.is('alumno_id', null)
  if (body.alumno_horario_id) existeQuery = existeQuery.eq('alumno_horario_id', body.alumno_horario_id)
  const { data: existente } = await existeQuery.maybeSingle()

  const fila = {
    alumno_id:             body.alumno_id,
    coach_id:              body.coach_id,
    alumno_horario_id:     body.alumno_horario_id || null,
    fecha:                 body.fecha,
    rutina_nombre:         body.rutina_nombre,
    rutina_predefinida_id: body.rutina_predefinida_id || null,
    ejercicios:            body.ejercicios || [],
    notas:                 body.notas || null,
  }

  let result
  if (existente?.id) {
    const { data, error } = await supabaseAdmin
      .from('sesiones_rutina').update(fila).eq('id', existente.id).select().single()
    result = { data, error }
  } else {
    const { data, error } = await supabaseAdmin
      .from('sesiones_rutina').insert(fila).select().single()
    result = { data, error }
  }

  if (result.error) return Response.json({ error: 'Error al guardar la sesión' }, { status: 500 })
  return Response.json(result.data)
}
