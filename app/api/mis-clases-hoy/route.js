import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

/**
 * GET /api/mis-clases-hoy?coach_id=UUID
 * Devuelve las clases de hoy para el coach (horarios fijos + excepciones movidas a hoy).
 * También incluye asistencias ya registradas para hoy.
 */
export async function GET(req) {
  const { response } = await requireAuth(['admin', 'coach'])
  if (response) return response
  const { searchParams } = new URL(req.url)
  const coachId = searchParams.get('coach_id')
  if (!coachId) return Response.json({ error: 'coach_id requerido' }, { status: 400 })

  const hoy     = new Date()
  const diaHoy  = DIAS[hoy.getDay()]
  // Fecha local (no toISOString/UTC): a la noche en Chile, UTC ya es "mañana".
  const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  // 0. Traspasos activos hoy que me involucran (como origen o destino)
  const { data: traspasosHoy } = await supabaseAdmin
    .from('traspasos_coach')
    .select('*')
    .lte('fecha_desde', fechaHoy)
    .gte('fecha_hasta', fechaHoy)
    .or(`coach_origen_id.eq.${coachId},coach_destino_id.eq.${coachId}`)

  // Coaches "origen" cuyas clases hoy me toca cubrir a mí (total o parcialmente).
  const origenesQueCubro = [...new Set(
    (traspasosHoy || []).filter(t => t.coach_destino_id === coachId).map(t => t.coach_origen_id)
  )]
  const coachIdsVer = [...new Set([coachId, ...origenesQueCubro])]

  // Resuelve, para un horario dado, qué coach lo ve efectivamente hoy: un
  // traspaso acotado a ESE alumno manda sobre uno general del mismo coach origen.
  function coachEfectivo(h) {
    const especifico = (traspasosHoy || []).find(
      t => t.coach_origen_id === h.coach_id && t.alumno_id === h.alumno_id
    )
    if (especifico) return especifico.coach_destino_id
    const general = (traspasosHoy || []).find(
      t => t.coach_origen_id === h.coach_id && t.alumno_id === null
    )
    if (general) return general.coach_destino_id
    return h.coach_id
  }

  // 1. Horarios fijos de hoy (los míos + los de quien cubro), filtrados a los
  // que efectivamente me corresponden a mí una vez resuelta la cobertura.
  const { data: horariosCandidatos } = await supabaseAdmin
    .from('alumno_horarios')
    .select('*, alumno:alumno_id(id, nombre, plan), coach:coach_id(id, nombre)')
    .in('coach_id', coachIdsVer)
    .eq('dia', diaHoy)
    .eq('activo', true)
    .or(`fecha.is.null,fecha.eq.${fechaHoy}`)
    .order('hora')

  const horariosActivos = (horariosCandidatos || []).filter(h => coachEfectivo(h) === coachId)
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
