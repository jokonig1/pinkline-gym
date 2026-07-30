import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { actualizarCategoriaRutinaSchema, uuid, parseBody } from '@/lib/schemas'

export async function PUT(req, { params }) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { id } = await params
  const idResult = uuid.safeParse(id)
  if (!idResult.success) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const { data: body, error: validationError } = parseBody(actualizarCategoriaRutinaSchema, await req.json())
  if (validationError) return validationError

  const { data, error } = await supabaseAdmin
    .from('rutinas_categorias')
    .update({ nombre: body.nombre.trim() })
    .eq('id', idResult.data)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Ya tienes una categoría con ese nombre.' }, { status: 400 })
    return Response.json({ error: 'Error al renombrar la categoría' }, { status: 500 })
  }
  return Response.json(data)
}

export async function DELETE(req, { params }) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { id } = await params
  const idResult = uuid.safeParse(id)
  if (!idResult.success) return Response.json({ error: 'ID inválido' }, { status: 400 })

  // Las rutinas que estaban en esta categoría quedan sin categoría (ON DELETE SET NULL).
  const { error } = await supabaseAdmin.from('rutinas_categorias').delete().eq('id', idResult.data)

  if (error) return Response.json({ error: 'Error al eliminar la categoría' }, { status: 500 })
  return Response.json({ ok: true })
}
