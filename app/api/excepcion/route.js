import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * POST — upsert una excepción de horario (mover clase a otra fecha/hora esta semana)
 * Body: { alumno_horario_id, alumno_id, fecha_original, fecha_nueva, hora_nueva, motivo }
 */
export async function POST(request) {
  const { alumno_horario_id, alumno_id, fecha_original, fecha_nueva, hora_nueva, motivo } =
    await request.json()

  if (!alumno_horario_id || !fecha_original) {
    return Response.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  // Ver si ya existe una excepción para ese horario en esa fecha
  const { data: existente } = await supabaseAdmin
    .from('alumno_horarios_excepciones')
    .select('id')
    .eq('alumno_horario_id', alumno_horario_id)
    .eq('fecha_original', fecha_original)
    .maybeSingle()

  const payload = {
    alumno_horario_id,
    alumno_id:      alumno_id  || null,
    fecha_original,
    fecha_nueva:    fecha_nueva || null,
    hora_nueva:     hora_nueva  || null,
    cancelado:      false,
    motivo:         motivo      || '',
  }

  let error
  if (existente) {
    ;({ error } = await supabaseAdmin
      .from('alumno_horarios_excepciones')
      .update(payload)
      .eq('id', existente.id))
  } else {
    ;({ error } = await supabaseAdmin
      .from('alumno_horarios_excepciones')
      .insert([payload]))
  }

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

/**
 * DELETE — elimina una excepción (restaurar al horario original)
 * Body: { id }
 */
export async function DELETE(request) {
  const { id } = await request.json()
  if (!id) return Response.json({ error: 'Falta el id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('alumno_horarios_excepciones')
    .delete()
    .eq('id', id)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
