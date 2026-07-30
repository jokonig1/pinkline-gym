import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const { response } = await requireAuth()
  if (response) return response
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, nombre, email, color, rol, activo')
    .in('rol', ['coach', 'admin'])
    .order('created_at', { ascending: true })

  if (error) return Response.json({ error: 'Error al obtener los coaches' }, { status: 500 })
  return Response.json(data || [])
}
