import { supabaseAdmin } from '@/lib/supabase/admin'

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

/**
 * GET /api/mis-clases-hoy?coach_id=UUID
 * Devuelve las clases de hoy para el coach (horarios fijos + excepciones movidas a hoy).
 * También incluye asistencias ya registradas para hoy.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const coachId = searchParams.get('coach_id')
  if (!coachId) return Response.json({ error: 'coach_id requerido' }, { status: 400 })

  const hoy     = new Date()
  const diaHoy  = DIAS[hoy.getDay()]
  const fechaHoy = hoy.toISOString().split('T')[0]

  // 1. Horarios fijos del coach para hoy
  const { data: horarios } = await supabaseAdmin
    .from('alumno_horarios')
    .select('*, alumno:alumno_id(id, nombre, plan)')
    .eq('coach_id', coachId)
    .eq('dia', diaHoy)
    .eq('activo', true)
    .order('hora')

  const horariosActivos = horarios || []
  const horarioIds      = horariosActivos.map(h => h.id)

  // 2. Excepciones que afectan estos horarios HOY (cancelados o movidos)
  const { data: excepciones } = horarioIds.length > 0
    ? await supabaseAdmin
        .from('alumno_horarios_excepciones')
        .select('*')
        .in('alumno_horario_id', horarioIds)
        .eq('fecha_original', fechaHoy)
    : { data: [] }

  // 3. Clases de OTROS coaches/días movidas a hoy para ESTE coach
  const { data: movidasHoy } = await supabaseAdmin
    .from('alumno_horarios_excepciones')
    .select('*, horario:alumno_horario_id(*, alumno:alumno_id(id, nombre, plan))')
    .eq('fecha_nueva', fechaHoy)
    .eq('cancelado', false)
    .filter('horario.coach_id', 'eq', coachId)

  // 4. Asistencias ya registradas para hoy en este coach
  const { data: asistencias } = await supabaseAdmin
    .from('asistencias')
    .select('*')
    .eq('coach_id', coachId)
    .eq('fecha', fechaHoy)

  return Response.json({
    horarios:    horariosActivos,
    excepciones: excepciones || [],
    movidasHoy:  (movidasHoy || []).filter(m => m.horario),
    asistencias: asistencias || [],
    fechaHoy,
    diaHoy,
  })
}
