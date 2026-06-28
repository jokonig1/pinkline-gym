import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request) {
  const { nombre, email, password, color } = await request.json()

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol: 'coach' },
  })

  if (error) return Response.json({ error: error.message }, { status: 400 })

  const userId = data.user.id
  const colorVal = (color !== undefined && color !== null) ? color : 0

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: userId, nombre, email, rol: 'coach', color: colorVal })

  if (profileError) {
    // Revertir: eliminar el usuario auth si no se pudo crear el perfil
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return Response.json({ error: 'Error al crear perfil: ' + profileError.message }, { status: 500 })
  }

  return Response.json({ ok: true, id: userId })
}