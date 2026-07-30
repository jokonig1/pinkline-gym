/**
 * Helper de autenticación para API routes del servidor.
 *
 * Uso:
 *   const { response, user, profile } = await requireAuth(['admin'])
 *   if (response) return response   // 401 o 403 automático
 *
 * Roles válidos: 'admin' | 'coach' | 'alumno'
 * Si requiredRoles está vacío, solo verifica que haya sesión activa.
 */
import { createClient } from '@/lib/supabase/server'

export async function requireAuth(requiredRoles = []) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user || error) {
    return {
      user:     null,
      profile:  null,
      response: Response.json({ error: 'No autorizado' }, { status: 401 }),
    }
  }

  // Sin restricción de rol — solo verifica sesión
  if (requiredRoles.length === 0) {
    return { user, profile: null, response: null }
  }

  // Obtener rol del usuario
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, rol')
    .eq('id', user.id)
    .single()

  if (!profile || !requiredRoles.includes(profile.rol)) {
    return {
      user,
      profile,
      response: Response.json({ error: 'Acceso denegado' }, { status: 403 }),
    }
  }

  return { user, profile, response: null }
}
