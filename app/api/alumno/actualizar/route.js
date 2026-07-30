import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { actualizarAlumnoSchema, parseBody } from '@/lib/schemas'

/**
 * POST /api/alumno/actualizar — editar datos de un alumno o marcarlo activo/inactivo.
 * Solo el coach dueño del alumno (no vale cobertura temporal por traspaso) o el
 * admin pueden hacerlo.
 */
export async function POST(req) {
  const { response, user, profile } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(actualizarAlumnoSchema, await req.json())
  if (validationError) return validationError

  const { data: alumno } = await supabaseAdmin.from('alumnos').select('id, coach_id').eq('id', body.id).single()
  if (!alumno) return Response.json({ error: 'Alumno no encontrado' }, { status: 404 })

  const esAdmin = profile.rol === 'admin'
  if (!esAdmin && alumno.coach_id !== user.id) {
    return Response.json({ error: 'No puedes editar este alumno' }, { status: 403 })
  }

  const { id, ...cambios } = body
  const { data, error } = await supabaseAdmin
    .from('alumnos')
    .update(cambios)
    .eq('id', id)
    .select('*, coach:coach_id(nombre)')
    .single()

  if (error) return Response.json({ error: 'Error al guardar los cambios' }, { status: 500 })
  return Response.json(data)
}
