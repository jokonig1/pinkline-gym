import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { crearRutinaSchema, parseBody } from '@/lib/schemas'

export async function GET(req) {
  const { response } = await requireAuth(['admin', 'coach', 'alumno'])
  if (response) return response

  const { searchParams } = new URL(req.url)
  const coachId = searchParams.get('coach_id')
  if (!coachId) return Response.json([])

  const { data } = await supabaseAdmin
    .from('rutinas_predefinidas')
    .select('*')
    .eq('coach_id', coachId)
    .eq('activo', true)
    .order('orden')
    .order('created_at')

  const rutinas = data || []
  const ids = rutinas.map(r => r.id)

  let asignaciones = []
  if (ids.length > 0) {
    const { data: asig } = await supabaseAdmin
      .from('rutinas_predefinidas_categorias')
      .select('rutina_id, categoria_id')
      .in('rutina_id', ids)
    asignaciones = asig || []
  }

  const categoriasPorRutina = {}
  asignaciones.forEach(a => {
    if (!categoriasPorRutina[a.rutina_id]) categoriasPorRutina[a.rutina_id] = []
    categoriasPorRutina[a.rutina_id].push(a.categoria_id)
  })

  return Response.json(rutinas.map(r => ({ ...r, categoria_ids: categoriasPorRutina[r.id] || [] })))
}

export async function POST(req) {
  const { response } = await requireAuth(['admin', 'coach', 'alumno'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(crearRutinaSchema, await req.json())
  if (validationError) return validationError

  const { data, error } = await supabaseAdmin
    .from('rutinas_predefinidas')
    .insert({
      coach_id:   body.coach_id,
      nombre:     body.nombre,
      ejercicios: body.ejercicios,
      orden:      body.orden ?? 0,
    })
    .select()
    .single()

  if (error) return Response.json({ error: 'Error al crear la rutina' }, { status: 500 })

  const categoriaIds = body.categoria_ids || []
  if (categoriaIds.length > 0) {
    await supabaseAdmin
      .from('rutinas_predefinidas_categorias')
      .insert(categoriaIds.map(categoria_id => ({ rutina_id: data.id, categoria_id })))
  }

  return Response.json({ ...data, categoria_ids: categoriaIds })
}
