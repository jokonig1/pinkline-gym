'use client'

// Store compartido en memoria del catálogo de ejercicios. Todos los
// ExercisePicker de la sesión leen de acá, así que cuando se resuelve
// un ejercicio nuevo (resolverEjercicio) todos se enteran al instante,
// sin esperar a un refresh de página.

let catalogo = null
const listeners = new Set()

function notificar() {
  listeners.forEach(fn => fn(catalogo || []))
}

export function suscribirCatalogo(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getCatalogoActual() {
  return catalogo || []
}

export async function cargarCatalogo() {
  if (catalogo) return catalogo
  const res = await fetch('/api/ejercicios')
  catalogo = res.ok ? await res.json() : []
  notificar()
  return catalogo
}

// Get-or-create contra /api/ejercicios: devuelve {id, nombre} canónico
// (existente o recién creado) y actualiza el store compartido.
export async function resolverEjercicio(nombre) {
  const res = await fetch('/api/ejercicios', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ nombre }),
  })
  const data = res.ok ? await res.json() : null
  if (data && catalogo && !catalogo.some(e => e.id === data.id)) {
    catalogo = [...catalogo, data].sort((a, b) => a.nombre.localeCompare(b.nombre))
    notificar()
  }
  return data
}
