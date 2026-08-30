import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { crearCuentaAlumnoSchema, parseBody } from '@/lib/schemas'

// Contraseña = últimos 6 dígitos del RUT sin contar el dígito verificador
// (mismo esquema que ya usa el Google Form al onboardear alumnas).
function passwordDesdeRut(rut) {
  const limpio = (rut || '').replace(/[^0-9kK]/g, '')
  const cuerpo = limpio.slice(0, -1)
  return cuerpo.slice(-6)
}

export async function POST(request) {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  const { data: body, error: validationError } = parseBody(crearCuentaAlumnoSchema, await request.json())
  if (validationError) return validationError

  const { email, rut, nombre } = body
  const password = passwordDesdeRut(rut)

  if (!password || password.length < 6) {
    return Response.json(
      { error: 'El RUT no es válido para generar una contraseña (se necesitan al menos 6 dígitos antes del dígito verificador).' },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, rol: 'alumno' },
  })

  if (error) {
    console.error('Error al crear cuenta de alumno:', error)
    const yaExiste = /already.*registered|already exists|duplicate/i.test(error.message)
    return Response.json(
      { error: yaExiste ? 'Ya existe una cuenta con ese correo.' : `No se pudo crear la cuenta del alumno: ${error.message}` },
      { status: 400 }
    )
  }

  return Response.json({ ok: true, email, password })
}
