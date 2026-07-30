import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { traspasoSchema, cancelarTraspasoSchema, parseBody } from '@/lib/schemas'

/**
 * GET /api/traspasos?coach_id=X
 * Devuelve los traspasos donde el coach participa (como origen o destino),
 * con el nombre del otro coach para mostrar en la UI.
 */
export async function GET(req) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { searchParams } = new URL(req.url)
  const coachId = searchParams.get('coach_id')
  if (!coachId) return Response.json([])

  const { data } = await supabaseAdmin
    .from('traspasos_coach')
    .select('*, origen:coach_origen_id(id,nombre), destino:coach_destino_id(id,nombre), alumno:alumno_id(id,nombre)')
    .or(`coach_origen_id.eq.${coachId},coach_destino_id.eq.${coachId}`)
    .order('fecha_desde', { ascending: false })

  return Response.json(data || [])
}

/**
 * POST /api/traspasos — crear un traspaso temporal de clases.
 * Si viene alumno_ids, se crea una fila por alumno (cobertura acotada a esos
 * alumnos); si no, una sola fila con alumno_id null (cobertura de todos).
 */
export async function POST(req) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(traspasoSchema, await req.json())
  if (validationError) return validationError

  if (body.coach_origen_id === body.coach_destino_id) {
    return Response.json({ error: 'Elige un coach distinto para traspasar.' }, { status: 400 })
  }
  if (body.fecha_hasta < body.fecha_desde) {
    return Response.json({ error: 'La fecha hasta no puede ser anterior a la fecha desde.' }, { status: 400 })
  }

  const base = {
    coach_origen_id:  body.coach_origen_id,
    coach_destino_id: body.coach_destino_id,
    fecha_desde:      body.fecha_desde,
    fecha_hasta:      body.fecha_hasta,
    motivo:           body.motivo || null,
  }
  const filas = body.alumno_ids && body.alumno_ids.length > 0
    ? body.alumno_ids.map(alumno_id => ({ ...base, alumno_id }))
    : [{ ...base, alumno_id: null }]

  const { data, error } = await supabaseAdmin
    .from('traspasos_coach')
    .insert(filas)
    .select('*, origen:coach_origen_id(id,nombre), destino:coach_destino_id(id,nombre), alumno:alumno_id(id,nombre)')

  if (error) return Response.json({ error: 'Error al crear el traspaso' }, { status: 500 })
  return Response.json(data)
}

/**
 * DELETE /api/traspasos?id=X — cancelar un traspaso (ej. el coach vuelve antes).
 */
export async function DELETE(req) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { searchParams } = new URL(req.url)
  const idResult = cancelarTraspasoSchema.safeParse({ id: searchParams.get('id') })
  if (!idResult.success) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const { error } = await supabaseAdmin.from('traspasos_coach').delete().eq('id', idResult.data.id)
  if (error) return Response.json({ error: 'Error al cancelar el traspaso' }, { status: 500 })
  return Response.json({ ok: true })
}
