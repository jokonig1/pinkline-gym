import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { excepcionSchema, deshacerExcepcionSchema, parseBody } from '@/lib/schemas'

export async function POST(request) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(excepcionSchema, await request.json())
  if (validationError) return validationError

  const { alumno_horario_id, alumno_id, fecha_original, fecha_nueva, hora_nueva, motivo, cancelado } = body

  const { data: existente } = await supabaseAdmin
    .from('alumno_horarios_excepciones')
    .select('id')
    .eq('alumno_horario_id', alumno_horario_id)
    .eq('fecha_original', fecha_original)
    .maybeSingle()

  const payload = {
    alumno_horario_id,
    alumno_id:   alumno_id   || null,
    fecha_original,
    fecha_nueva: fecha_nueva || null,
    hora_nueva:  hora_nueva  || null,
    cancelado:   cancelado   || false,
    motivo:      motivo      || '',
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

  if (error) return Response.json({ error: 'Error al guardar la excepción' }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(request) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(deshacerExcepcionSchema, await request.json())
  if (validationError) return validationError

  const { error } = await supabaseAdmin
    .from('alumno_horarios_excepciones')
    .delete()
    .eq('id', body.id)

  if (error) return Response.json({ error: 'Error al restaurar el horario' }, { status: 500 })
  return Response.json({ ok: true })
}
