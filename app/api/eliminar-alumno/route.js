import { supabaseAdmin } from '@/lib/supabase/admin'

export async function DELETE(request) {
  const { id } = await request.json()

  if (!id) {
    return Response.json({ error: 'Falta el id del alumno' }, { status: 400 })
  }

  // Eliminar en orden para respetar foreign keys:
  // 1. Excepciones de horario
  const { error: e1 } = await supabaseAdmin
    .from('alumno_horarios_excepciones')
    .delete()
    .eq('alumno_id', id)

  if (e1) return Response.json({ error: e1.message, tabla: 'alumno_horarios_excepciones' }, { status: 500 })

  // 2. Horarios recurrentes
  const { error: e2 } = await supabaseAdmin
    .from('alumno_horarios')
    .delete()
    .eq('alumno_id', id)

  if (e2) return Response.json({ error: e2.message, tabla: 'alumno_horarios' }, { status: 500 })

  // 3. El alumno
  const { error: e3 } = await supabaseAdmin
    .from('alumnos')
    .delete()
    .eq('id', id)

  if (e3) return Response.json({ error: e3.message, tabla: 'alumnos' }, { status: 500 })

  return Response.json({ ok: true })
}
