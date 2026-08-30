import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { pagoAlumnoSchema, parseBody } from '@/lib/schemas'

/**
 * GET /api/admin/pagos?año=2026&mes=7
 * Devuelve todas las alumnas activas con su registro de pago de ese mes
 * (o null si todavía no se cargó ninguno).
 */
export async function GET(request) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  const { searchParams } = new URL(request.url)
  const año = parseInt(searchParams.get('año')) || new Date().getFullYear()
  const mes = parseInt(searchParams.get('mes')) || new Date().getMonth() + 1

  const { data: alumnas } = await supabaseAdmin
    .from('alumnos')
    .select('id, nombre, plan, tipo_clase')
    .eq('activo', true)
    .order('nombre')

  const { data: pagos } = await supabaseAdmin
    .from('pagos_alumnos')
    .select('*')
    .eq('año', año)
    .eq('mes', mes)

  const pagoPorAlumno = {}
  ;(pagos || []).forEach(p => { pagoPorAlumno[p.alumno_id] = p })

  const resultado = (alumnas || []).map(a => ({
    ...a,
    pago: pagoPorAlumno[a.id] || null,
  }))

  return Response.json({ alumnas: resultado, año, mes })
}

/**
 * POST /api/admin/pagos
 * Crea o actualiza el registro de pago de una alumna para un mes dado.
 * Si mesesQueCubre > 1, replica el mismo pago (pagado/monto/fecha/notas)
 * en los meses consecutivos siguientes (ej: pagó 2 meses juntos).
 */
export async function POST(request) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(pagoAlumnoSchema, await request.json())
  if (validationError) return validationError

  const { alumno_id, pagado, monto, fecha_pago, notas, mesesQueCubre = 1 } = body

  const periodos = []
  let { año, mes } = body
  for (let i = 0; i < mesesQueCubre; i++) {
    periodos.push({ año, mes })
    mes += 1
    if (mes > 12) { mes = 1; año += 1 }
  }

  const filas = periodos.map(p => ({
    alumno_id,
    año:        p.año,
    mes:        p.mes,
    pagado,
    monto:      monto ?? null,
    fecha_pago: fecha_pago || null,
    notas:      notas || null,
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await supabaseAdmin
    .from('pagos_alumnos')
    .upsert(filas, { onConflict: 'alumno_id,año,mes' })
    .select()

  if (error) return Response.json({ error: 'Error al guardar el pago' }, { status: 500 })
  return Response.json({ ok: true, pagos: data })
}
