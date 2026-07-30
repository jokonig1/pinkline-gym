import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { actualizarCoachSchema, parseBody } from '@/lib/schemas'

export async function PATCH(request) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(actualizarCoachSchema, await request.json())
  if (validationError) return validationError

  // Si cambia el correo, actualizar primero el login (auth) — si falla (ej. email
  // ya en uso), no se toca el perfil, para no dejarlos desincronizados.
  if (body.email !== undefined) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(body.id, { email: body.email })
    if (authError) {
      console.error('actualizar-coach (auth):', authError)
      return Response.json({ error: authError.message || 'No se pudo actualizar el correo' }, { status: 400 })
    }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      nombre: body.nombre ?? undefined,
      email:  body.email  ?? undefined,
      color:  body.color  ?? undefined,
      activo: body.activo ?? undefined,
    })
    .eq('id', body.id)

  if (error) {
    console.error('actualizar-coach:', error)
    return Response.json({ error: error.message || 'Error al actualizar el coach' }, { status: 500 })
  }
  return Response.json({ ok: true })
}
