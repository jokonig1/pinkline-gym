import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { traspasarAlumnosSchema, parseBody } from '@/lib/schemas'

/**
 * POST /api/traspasos/alumnos — traspaso permanente de uno o varios alumnos
 * a otro coach. Usa supabaseAdmin (bypasea RLS) porque reasignar el coach de
 * un alumno a un coach DISTINTO del propio no siempre pasa las políticas de
 * fila pensadas para "cada coach gestiona lo suyo".
 */
export async function POST(req) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(traspasarAlumnosSchema, await req.json())
  if (validationError) return validationError

  const { alumno_ids, coach_nuevo_id } = body

  const { error: errAlumnos } = await supabaseAdmin
    .from('alumnos')
    .update({ coach_id: coach_nuevo_id })
    .in('id', alumno_ids)

  if (errAlumnos) return Response.json({ error: 'Error al traspasar los alumnos' }, { status: 500 })

  const { error: errHorarios } = await supabaseAdmin
    .from('alumno_horarios')
    .update({ coach_id: coach_nuevo_id })
    .in('alumno_id', alumno_ids)
    .eq('activo', true)

  if (errHorarios) return Response.json({ error: 'Error al traspasar los horarios' }, { status: 500 })

  return Response.json({ ok: true, traspasados: alumno_ids.length })
}
