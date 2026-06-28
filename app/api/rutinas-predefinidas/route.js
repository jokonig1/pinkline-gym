import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/rutinas-predefinidas?coach_id=X
 * Devuelve las rutinas predefinidas activas del coach.
 */
export async function GET(req) {
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

  return Response.json(data || [])
}

/**
 * POST /api/rutinas-predefinidas
 * Crea una nueva rutina predefinida.
 * Body: { coach_id, nombre, ejercicios, orden }
 */
export async function POST(req) {
  const body = await req.json()
  const { coach_id, nombre, ejercicios = [], orden = 0 } = body

  if (!coach_id || !nombre) {
    return Response.json({ error: 'coach_id y nombre son requeridos' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('rutinas_predefinidas')
    .insert({ coach_id, nombre, ejercicios, orden })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
