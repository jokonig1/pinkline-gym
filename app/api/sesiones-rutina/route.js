import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * GET /api/sesiones-rutina?alumno_id=X[&rutina_nombre=Y][&limit=N]
 *
 * Sin rutina_nombre → devuelve TODAS las sesiones del alumno (historial completo).
 * Con rutina_nombre → devuelve solo la ÚLTIMA sesión de esa rutina (para pre-cargar form).
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const alumnoId     = searchParams.get('alumno_id')
  const rutinaNombre = searchParams.get('rutina_nombre')
  const limit        = parseInt(searchParams.get('limit') || '50')

  if (!alumnoId) return Response.json(rutinaNombre ? null : [])

  let query = supabaseAdmin
    .from('sesiones_rutina')
    .select('*')
    .eq('alumno_id', alumnoId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  if (rutinaNombre) {
    // Modo pre-carga: última sesión de esa rutina específica
    const { data } = await query.eq('rutina_nombre', rutinaNombre).limit(1).maybeSingle()
    return Response.json(data)
  }

  // Modo historial: todas las sesiones del alumno
  const { data } = await query.limit(limit)
  return Response.json(data || [])
}

/**
 * POST /api/sesiones-rutina
 * Guarda una nueva sesión de rutina para un alumno.
 * Body: { alumno_id, coach_id, alumno_horario_id, fecha, rutina_nombre,
 *          rutina_predefinida_id, ejercicios, notas }
 */
export async function POST(req) {
  const body = await req.json()
  const {
    alumno_id, coach_id, alumno_horario_id,
    fecha, rutina_nombre, rutina_predefinida_id,
    ejercicios, notas,
  } = body

  if (!alumno_id || !coach_id || !fecha || !rutina_nombre) {
    return Response.json(
      { error: 'alumno_id, coach_id, fecha y rutina_nombre son requeridos' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('sesiones_rutina')
    .insert({
      alumno_id,
      coach_id,
      alumno_horario_id: alumno_horario_id || null,
      fecha,
      rutina_nombre,
      rutina_predefinida_id: rutina_predefinida_id || null,
      ejercicios: ejercicios || [],
      notas: notas || null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
