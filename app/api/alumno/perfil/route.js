import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/alumno/perfil?email=X
 * Devuelve el registro de alumnos que coincide con el email del alumno autenticado.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const email = searchParams.get('email')
  if (!email) return Response.json(null)

  const { data } = await supabaseAdmin
    .from('alumnos')
    .select('id, nombre, rut, email, telefono, plan, activo, created_at, vencimiento_plan, altura_cm, coach_id, coach:coach_id(id, nombre)')
    .ilike('email', email.trim())  // case-insensitive — evita fallos por mayúsculas/minúsculas
    .maybeSingle()

  return Response.json(data)
}

/**
 * PUT /api/alumno/perfil
 * Actualiza el coach asignado del alumno identificado por su email.
 * Body: { email, coach_id }
 */
export async function PUT(req) {
  const { email, coach_id } = await req.json()
  if (!email) return Response.json({ error: 'email requerido' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('alumnos')
    .update({ coach_id: coach_id || null })
    .ilike('email', email.trim())
    .select('id, nombre, coach_id, coach:coach_id(id, nombre)')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
