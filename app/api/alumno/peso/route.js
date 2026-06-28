import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/alumno/peso?alumno_id=X
 * Devuelve el historial de peso del alumno ordenado por fecha.
 */
export async function GET(req) {
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

/**
 * POST /api/alumno/peso
 * Agrega o actualiza el peso del alumno para una fecha.
 * Body: { alumno_id, fecha, peso_kg, notas? }
 */
export async function POST(req) {
  const { alumno_id, fecha, peso_kg, notas } = await req.json()
  if (!alumno_id || !peso_kg) {
    return Response.json({ error: 'alumno_id y peso_kg son requeridos' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('peso_alumno')
    .upsert(
      { alumno_id, fecha: fecha || new Date().toISOString().split('T')[0], peso_kg, notas: notas || null },
      { onConflict: 'alumno_id,fecha' }
    )
    .select('id, fecha, peso_kg, notas')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

/**
 * DELETE /api/alumno/peso?id=X
 * Elimina un registro de peso.
 */
export async function DELETE(req) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await supabaseAdmin.from('peso_alumno').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
