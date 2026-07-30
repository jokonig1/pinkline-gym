import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const DEFAULT_ITEMS = [
  { nombre: 'Sueldos 3 coaches',   monto: 1660659 },
  { nombre: 'Arriendo',             monto: 1200000 },
  { nombre: 'Servicios básicos',    monto: 70000   },
  { nombre: 'Mantención máquinas',  monto: 100000  },
  { nombre: 'Internet',             monto: 30000   },
  { nombre: 'Contador',             monto: 80000   },
  { nombre: 'Publicidad',           monto: 50000   },
]

const DEFAULT_TOTAL = DEFAULT_ITEMS.reduce((s, i) => s + i.monto, 0)

export async function GET(request) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  const { searchParams } = new URL(request.url)
  const año = parseInt(searchParams.get('año')) || new Date().getFullYear()
  const mes  = parseInt(searchParams.get('mes')) || new Date().getMonth() + 1

  const { data: exact } = await supabaseAdmin
    .from('costos_mensuales')
    .select('*')
    .eq('año', año)
    .eq('mes', mes)
    .maybeSingle()

  if (exact) return Response.json(exact)

  // Mes anterior más reciente como plantilla
  const { data: registros } = await supabaseAdmin
    .from('costos_mensuales')
    .select('*')
    .order('año', { ascending: false })
    .order('mes', { ascending: false })
    .limit(1)

  const prev = registros?.[0]
  if (prev) {
    return Response.json({ id: null, año, mes, items: prev.items, total: prev.total })
  }

  return Response.json({ id: null, año, mes, items: DEFAULT_ITEMS, total: DEFAULT_TOTAL })
}

const bodySchema = z.object({
  año:   z.number().int().min(2020).max(2100),
  mes:   z.number().int().min(1).max(12),
  items: z.array(z.object({
    nombre: z.string().min(1).max(100),
    monto:  z.number().int().min(0),
  })).min(1),
})

export async function POST(request) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  let body
  try { body = await request.json() }
  catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }) }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 })

  const { año, mes, items } = parsed.data
  const total = items.reduce((s, i) => s + i.monto, 0)

  const { data, error } = await supabaseAdmin
    .from('costos_mensuales')
    .upsert(
      { año, mes, items, total, updated_at: new Date().toISOString() },
      { onConflict: 'año,mes' }
    )
    .select()
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}
