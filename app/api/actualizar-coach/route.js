import { supabaseAdmin } from '@/lib/supabase/admin'

export async function PATCH(request) {
  const { id, nombre, telefono, color } = await request.json()
  if (!id) return Response.json({ error: 'Falta el id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      nombre:   nombre   ?? undefined,
      telefono: telefono ?? undefined,
      color:    color    ?? null,
    })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
