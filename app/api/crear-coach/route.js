import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { crearCoachSchema, parseBody } from '@/lib/schemas'

export async function POST(request) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(crearCoachSchema, await request.json())
  if (validationError) return validationError

  const { nombre, email, password, color } = body

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol: 'coach' },
  })

  if (error) return Response.json({ error: 'No se pudo crear la cuenta del coach' }, { status: 400 })

  const userId   = data.user.id
  const colorVal = (color !== undefined && color !== null) ? color : 0

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, nombre, email, rol: 'coach', color: colorVal })

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return Response.json({ error: 'Error al crear el perfil del coach' }, { status: 500 })
  }

  return Response.json({ ok: true, id: userId })
}
