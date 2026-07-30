/**
 * Helpers de cliente para llamar a /api/excepcion.
 * Ambas funciones lanzan un Error si la respuesta no es ok,
 * para que el llamador pueda capturarlo y mostrarlo al usuario.
 */

export async function guardarExcepcion(slot, form) {
  const res = await fetch('/api/excepcion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      alumno_horario_id: slot.id,
      alumno_id:         slot.alumno_id,
      fecha_original:    slot.fechaStr,
      fecha_nueva:       form.fecha_nueva || null,
      hora_nueva:        form.hora_nueva  || null,
      motivo:            form.motivo      || '',
      cancelado:         form.cancelado   || false,
    }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || `Error ${res.status} al guardar`)
  }
}

export async function deshacerExcepcion(excId) {
  const res = await fetch('/api/excepcion', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: excId }),
  })
  if (!res.ok) {
    const json = await res.json().catch(() => ({}))
    throw new Error(json.error || `Error ${res.status} al restaurar`)
  }
}
