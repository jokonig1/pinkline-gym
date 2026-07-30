import { requireAuth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { ejercicioCatalogoSchema, parseBody } from '@/lib/schemas'

// Quita tildes/mayúsculas y la "s" final (singular/plural), para detectar duplicados.
function normalizarEjercicio(s) {
  let n = (s || '').trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (n.length > 3 && n.endsWith('s')) n = n.slice(0, -1)
  return n
}

/**
 * GET /api/ejercicios — catálogo completo, compartido entre todos los coaches.
 */
export async function GET() {
  const { response } = await requireAuth(['admin', 'coach', 'alumno'])
  if (response) return response

  const { data } = await supabaseAdmin
    .from('ejercicios_catalogo')
    .select('*')
    .eq('activo', true)
    .order('nombre')

  return Response.json(data || [])
}

/**
 * POST /api/ejercicios — get-or-create: si ya existe un ejercicio equivalente
 * (mismo nombre normalizado, ignorando singular/plural), devuelve ese; si no,
 * crea uno nuevo con el nombre tal como se escribió.
 */
export async function POST(req) {
  const { response } = await requireAuth(['admin', 'coach', 'alumno'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(ejercicioCatalogoSchema, await req.json())
  if (validationError) return validationError

  const nombre = body.nombre.trim()
  const normalizado = normalizarEjercicio(nombre)

  const { data: catalogo } = await supabaseAdmin
    .from('ejercicios_catalogo')
    .select('id, nombre')
    .eq('activo', true)

  const existente = (catalogo || []).find(e => normalizarEjercicio(e.nombre) === normalizado)
  if (existente) return Response.json(existente)

  const { data, error } = await supabaseAdmin
    .from('ejercicios_catalogo')
    .insert({ nombre })
    .select('id, nombre')
    .single()

  if (error) return Response.json({ error: 'Error al crear el ejercicio' }, { status: 500 })
  return Response.json(data)
}
