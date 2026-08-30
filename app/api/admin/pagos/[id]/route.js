import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { actualizarPagoAlumnoSchema, uuid, parseBody } from '@/lib/schemas'

// Suma `meses` a una fecha "YYYY-MM-DD" y devuelve el resultado en el mismo formato.
function sumarMeses(fechaStr, meses) {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const venc = new Date(y, m - 1 + meses, d)
  return `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, '0')}-${String(venc.getDate()).padStart(2, '0')}`
}

/**
 * PUT /api/admin/pagos/[id] — corregir un pago ya cargado (fecha, meses, monto, notas).
 * Recalcula fecha_vencimiento si cambia la fecha de pago o los meses.
 */
export async function PUT(req, { params }) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  const { id } = await params
  const idResult = uuid.safeParse(id)
  if (!idResult.success) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const { data: body, error: validationError } = parseBody(actualizarPagoAlumnoSchema, await req.json())
  if (validationError) return validationError

  const { data: actual } = await supabaseAdmin.from('pagos_alumnos').select('*').eq('id', idResult.data).single()
  if (!actual) return Response.json({ error: 'Pago no encontrado' }, { status: 404 })

  const fecha_pago    = body.fecha_pago ?? actual.fecha_pago
  const meses_pagados = body.meses_pagados ?? actual.meses_pagados

  const update = {
    fecha_pago,
    meses_pagados,
    fecha_vencimiento: sumarMeses(fecha_pago, meses_pagados),
    updated_at: new Date().toISOString(),
  }
  if (body.monto !== undefined) update.monto = body.monto
  if (body.notas !== undefined) update.notas = body.notas

  const { data, error } = await supabaseAdmin
    .from('pagos_alumnos')
    .update(update)
    .eq('id', idResult.data)
    .select()
    .single()

  if (error) return Response.json({ error: 'Error al actualizar el pago' }, { status: 500 })
  return Response.json({ ok: true, pago: data })
}

/**
 * DELETE /api/admin/pagos/[id] — borrar un pago cargado por error.
 */
export async function DELETE(req, { params }) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  const { id } = await params
  const idResult = uuid.safeParse(id)
  if (!idResult.success) return Response.json({ error: 'ID inválido' }, { status: 400 })

  const { error } = await supabaseAdmin.from('pagos_alumnos').delete().eq('id', idResult.data)
  if (error) return Response.json({ error: 'Error al eliminar el pago' }, { status: 500 })
  return Response.json({ ok: true })
}
