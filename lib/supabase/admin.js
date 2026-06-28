import { createClient } from '@supabase/supabase-js'

// Cliente con service_role — bypasa RLS completamente.
// Usar solo en API routes (servidor), nunca en cliente.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
