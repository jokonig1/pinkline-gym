import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { pesoSchema, uuid, parseBody } from '@/lib/schemas'

export async function GET(req) {
  const { response } = await requireAuth()
  if (response) return response

  const { searchParams } = new URL(req.url)
  const alumno_id = searchParams.get('alumno_id')
  if (!alumno_id) return Response.json([], { status: 400 })

  const { data } = await supabaseAdmin
    .from('peso_alumno')
    .select('id, fecha, peso_kg, notas')
    .eq('alumno_id', alumno_id)
    .order('fecha', { ascending: true })

  return Response.json(data || [])
}

export async function POST(req) {
  const { response } = await requireAuth(['admin', 'coach', 'alumno'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(pesoSchema, await req.json())
  if (validationError) return validationError

  const { data, error } = await supabaseAdmin
    .from('peso_alumno')
    .upsert(
      {
        alumno_id: body.alumno_id,
        fecha:     body.fecha || new Date().toISOString().split('T')[0],
        peso_kg:   body.peso_kg,
        notas:     body.notas || null,
      },
      { onConflict: 'alumno_id,fecha' }
    )
    .select('id, fecha, peso_kg, notas')
    .single()

  if (error) return Response.json({ error: 'Error al guardar el peso' }, { status: 500 })
  return Response.json(data)
}

export async function DELETE(req) {
  const { response } = await requireAuth(['admin', 'coach', 'alumno'])
  if (response) return response

  const { searchParams } = new URL(req.url)
  const idResult = uuid.safeParse(searchParams.get('id'))
  if (!idResult.success) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const { error } = await supabaseAdmin.from('peso_alumno').delete().eq('id', idResult.data)
  if (error) return Response.json({ error: 'Error al eliminar el registro' }, { status: 500 })
  return Response.json({ ok: true })
}
