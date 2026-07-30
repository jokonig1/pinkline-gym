import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { horariosAlumnoSchema, parseBody } from '@/lib/schemas'

/**
 * GET /api/alumno/horarios?alumno_id=X
 * Devuelve los horarios activos del alumno y las excepciones asociadas.
 * Usa supabaseAdmin para bypasear RLS (las tablas solo tienen permisos de coach/admin).
 */
export async function GET(req) {
  const { response } = await requireAuth()
  if (response) return response
  const { searchParams } = new URL(req.url)
  const alumno_id = searchParams.get('alumno_id')
  if (!alumno_id) return Response.json({ horarios: [], excepciones: [] })

  const { data: horarios } = await supabaseAdmin
    .from('alumno_horarios')
    .select('id, dia, hora, tipo, coach_id, fecha, coach:coach_id(nombre)')
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

/**
 * POST /api/alumno/horarios — editar el horario semanal fijo de un alumno
 * (agregar día, cambiar día/hora/tipo, quitar día). Solo el coach dueño del
 * alumno (no vale cobertura temporal por traspaso) o el admin.
 */
export async function POST(req) {
  const { response, user, profile } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(horariosAlumnoSchema, await req.json())
  if (validationError) return validationError

  const { data: alumno } = await supabaseAdmin.from('alumnos').select('id, coach_id').eq('id', body.alumno_id).single()
  if (!alumno) return Response.json({ error: 'Alumno no encontrado' }, { status: 404 })

  const esAdmin = profile.rol === 'admin'
  if (!esAdmin && alumno.coach_id !== user.id) {
    return Response.json({ error: 'No puedes editar el horario de este alumno' }, { status: 403 })
  }

  const { eliminar = [], nuevos = [], actualizar = [] } = body

  await Promise.all([
    eliminar.length > 0
      ? supabaseAdmin.from('alumno_horarios').update({ activo: false }).in('id', eliminar).eq('alumno_id', alumno.id)
      : Promise.resolve(),
    nuevos.length > 0
      ? supabaseAdmin.from('alumno_horarios').insert(nuevos.map(h => ({
          alumno_id: alumno.id,
          coach_id:  alumno.coach_id,
          dia:       h.dia,
          hora:      h.hora,
          tipo:      h.tipo,
          activo:    true,
        })))
      : Promise.resolve(),
    ...actualizar.map(h =>
      supabaseAdmin.from('alumno_horarios')
        .update({ dia: h.dia, hora: h.hora, tipo: h.tipo })
        .eq('id', h.id).eq('alumno_id', alumno.id)
    ),
  ])

  const { data: horariosFrescos } = await supabaseAdmin
    .from('alumno_horarios')
    .select('id, dia, hora, tipo, coach_id')
    .eq('alumno_id', alumno.id)
    .eq('activo', true)
    .is('fecha', null)
    .order('dia')
    .order('hora')

  return Response.json({ horarios: horariosFrescos || [] })
}
