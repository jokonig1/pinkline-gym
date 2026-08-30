import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { pagoAlumnoSchema, parseBody } from '@/lib/schemas'

const DIA_MS = 24 * 60 * 60 * 1000

// Suma `meses` a una fecha "YYYY-MM-DD" y devuelve el resultado en el mismo formato.
function sumarMeses(fechaStr, meses) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const venc = new Date(y, m - 1 + meses, d)
  return `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, '0')}-${String(venc.getDate()).padStart(2, '0')}`
}

function hoyStr() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`
}

// Estado de una alumna según su pago más reciente:
// - sin_registro: nunca pagó
// - vencido: su cobertura ya pasó
// - por_vencer: vence en 3 días o menos
// - al_dia: todo bien
function calcularEstado(pago) {
  if (!pago) return { estado: 'sin_registro', diasParaVencer: null }
  const hoy = new Date(hoyStr() + 'T00:00:00')
  const venc = new Date(pago.fecha_vencimiento + 'T00:00:00')
  const dias = Math.round((venc - hoy) / DIA_MS)
  if (dias < 0)  return { estado: 'vencido',    diasParaVencer: dias }
  if (dias <= 3) return { estado: 'por_vencer', diasParaVencer: dias }
  return { estado: 'al_dia', diasParaVencer: dias }
}

/**
 * GET /api/admin/pagos?alumno_id=X
 * Con alumno_id: devuelve el historial completo de pagos de esa alumna
 * (más reciente primero).
 * Sin alumno_id: devuelve todas las alumnas activas con su pago más
 * reciente y el estado calculado: sin_registro / vencido / por_vencer / al_dia.
 */
export async function GET(request) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  const { searchParams } = new URL(request.url)
  const alumnoId = searchParams.get('alumno_id')

  if (alumnoId) {
    const { data: historial } = await supabaseAdmin
      .from('pagos_alumnos')
      .select('*')
      .eq('alumno_id', alumnoId)
      .order('fecha_pago', { ascending: false })
    return Response.json({ pagos: historial || [] })
  }

  const { data: alumnas } = await supabaseAdmin
    .from('alumnos')
    .select('id, nombre, plan, tipo_clase')
    .eq('activo', true)
    .order('nombre')

  const { data: pagos } = await supabaseAdmin
    .from('pagos_alumnos')
    .select('*')
    .order('fecha_vencimiento', { ascending: false })

  // Último pago (mayor fecha_vencimiento) por alumna.
  const ultimoPagoPorAlumno = {}
  ;(pagos || []).forEach(p => {
    if (!ultimoPagoPorAlumno[p.alumno_id]) ultimoPagoPorAlumno[p.alumno_id] = p
  })

  const resultado = (alumnas || []).map(a => {
    const pago = ultimoPagoPorAlumno[a.id] || null
    const { estado, diasParaVencer } = calcularEstado(pago)
    return { ...a, pago, estado, diasParaVencer }
  })

  return Response.json({ alumnas: resultado })
}

/**
 * POST /api/admin/pagos
 * Registra un nuevo pago para una alumna. Calcula fecha_vencimiento a partir
 * de fecha_pago + meses_pagados.
 */
export async function POST(request) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(pagoAlumnoSchema, await request.json())
  if (validationError) return validationError

  const { alumno_id, fecha_pago, meses_pagados, monto, notas } = body
  const fecha_vencimiento = sumarMeses(fecha_pago, meses_pagados)

  const { data, error } = await supabaseAdmin
    .from('pagos_alumnos')
    .insert({
      alumno_id,
      fecha_pago,
      meses_pagados,
      fecha_vencimiento,
      monto: monto ?? null,
      notas: notas || null,
    })
    .select()
    .single()

  if (error) return Response.json({ error: 'Error al guardar el pago' }, { status: 500 })
  return Response.json({ ok: true, pago: data })
}
