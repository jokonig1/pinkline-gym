import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { crearCategoriaRutinaSchema, parseBody } from '@/lib/schemas'

export async function GET(req) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { searchParams } = new URL(req.url)
  const coachId = searchParams.get('coach_id')
  if (!coachId) return Response.json([])

  const { data } = await supabaseAdmin
    .from('rutinas_categorias')
    .select('*')
    .eq('coach_id', coachId)
    .order('orden')
    .order('nombre')

  return Response.json(data || [])
}

export async function POST(req) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(crearCategoriaRutinaSchema, await req.json())
  if (validationError) return validationError

  const { data, error } = await supabaseAdmin
    .from('rutinas_categorias')
    .insert({ coach_id: body.coach_id, nombre: body.nombre.trim() })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return Response.json({ error: 'Ya tienes una categoría con ese nombre.' }, { status: 400 })
    return Response.json({ error: 'Error al crear la categoría' }, { status: 500 })
  }
  return Response.json(data)
}
