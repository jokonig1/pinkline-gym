import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { actualizarRutinaSchema, uuid, parseBody } from '@/lib/schemas'

export async function PUT(req, { params }) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { id } = await params
  const idResult = uuid.safeParse(id)
  if (!idResult.success) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const { data: body, error: validationError } = parseBody(actualizarRutinaSchema, await req.json())
  if (validationError) return validationError

  const update = {}
  if (body.nombre     !== undefined) update.nombre     = body.nombre
  if (body.ejercicios !== undefined) update.ejercicios = body.ejercicios

  let data = null
  if (Object.keys(update).length > 0) {
    const res = await supabaseAdmin
      .from('rutinas_predefinidas')
      .update(update)
      .eq('id', idResult.data)
      .select()
      .single()
    if (res.error) return Response.json({ error: 'Error al actualizar la rutina' }, { status: 500 })
    data = res.data
  }

  // categoria_ids reemplaza por completo el conjunto de categorías asignadas.
  if (body.categoria_ids !== undefined) {
    await supabaseAdmin.from('rutinas_predefinidas_categorias').delete().eq('rutina_id', idResult.data)
    if (body.categoria_ids.length > 0) {
      const { error: errAsig } = await supabaseAdmin
        .from('rutinas_predefinidas_categorias')
        .insert(body.categoria_ids.map(categoria_id => ({ rutina_id: idResult.data, categoria_id })))
      if (errAsig) return Response.json({ error: 'Error al asignar las categorías' }, { status: 500 })
    }
  }

  if (!data) {
    const { data: fresh } = await supabaseAdmin.from('rutinas_predefinidas').select().eq('id', idResult.data).single()
    data = fresh
  }

  return Response.json(data)
}

export async function DELETE(req, { params }) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { id } = await params
  const idResult = uuid.safeParse(id)
  if (!idResult.success) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('rutinas_predefinidas')
    .update({ activo: false })
    .eq('id', idResult.data)

  if (error) return Response.json({ error: 'Error al eliminar la rutina' }, { status: 500 })
  return Response.json({ ok: true })
}
