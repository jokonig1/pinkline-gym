import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * PUT /api/rutinas-predefinidas/[id]
 * Actualiza nombre y/o ejercicios de la rutina.
 */
export async function PUT(req, { params }) {
  const { id } = params
  const body   = await req.json()
  const { nombre, ejercicios, orden } = body

  const update = {}
  if (nombre    !== undefined) update.nombre     = nombre
  if (ejercicios !== undefined) update.ejercicios = ejercicios
  if (orden     !== undefined) update.orden      = orden

  const { data, error } = await supabaseAdmin
    .from('rutinas_predefinidas')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

/**
 * DELETE /api/rutinas-predefinidas/[id]
 * Marca la rutina como inactiva (soft delete).
 */
export async function DELETE(req, { params }) {
  const { id } = params

  const { error } = await supabaseAdmin
    .from('rutinas_predefinidas')
    .update({ activo: false })
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
