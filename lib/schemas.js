/**
 * Schemas de validación Zod para todas las API routes.
 * Uso: const body = schema.parse(await req.json())
 *      catch (e) → return 400
 */
import { z } from 'zod'

// ── Primitivos reutilizables ──────────────────────────────────────────────────

export const uuid   = z.string().uuid('ID inválido')
export const fecha  = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')
export const hora   = z.string().regex(/^\d{2}:\d{2}/, 'Formato de hora inválido (HH:MM)')

// ── Coaches ───────────────────────────────────────────────────────────────────

export const crearCoachSchema = z.object({
  nombre:   z.string().min(1, 'El nombre es obligatorio').max(100),
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Contraseña mínimo 6 caracteres').max(100),
  color:    z.number().int().min(0).max(10).nullable().optional(),
})

export const actualizarCoachSchema = z.object({
  id:     uuid,
  nombre: z.string().min(1).max(100).optional(),
  email:  z.string().email('Email inválido').optional(),
  color:  z.number().int().min(0).max(10).nullable().optional(),
  activo: z.boolean().optional(),
})

// ── Alumnos ───────────────────────────────────────────────────────────────────

export const eliminarAlumnoSchema = z.object({
  id: uuid,
})

const horarioNuevoSchema = z.object({
  dia:  z.string().min(1),
  hora: z.string().min(1),
  tipo: z.enum(['personalizado', 'semipersonalizado']),
})

export const horariosAlumnoSchema = z.object({
  alumno_id:  uuid,
  eliminar:   z.array(uuid).optional(),
  nuevos:     z.array(horarioNuevoSchema).optional(),
  actualizar: z.array(horarioNuevoSchema.extend({ id: uuid })).optional(),
})

export const actualizarAlumnoSchema = z.object({
  id:                    uuid,
  nombre:                z.string().min(1).max(200).optional(),
  rut:                   z.string().max(20).optional().nullable(),
  telefono:              z.string().max(30).optional().nullable(),
  email:                 z.string().email('Email inválido').optional().nullable(),
  direccion:             z.string().max(300).optional().nullable(),
  fecha_nacimiento:      fecha.optional().nullable(),
  contacto_emergencia:   z.string().max(200).optional().nullable(),
  telefono_emergencia:   z.string().max(30).optional().nullable(),
  objetivos:             z.string().max(1000).optional().nullable(),
  restricciones_medicas: z.string().max(1000).optional().nullable(),
  plan:                  z.string().max(100).optional(),
  vencimiento_plan:      fecha.optional().nullable(),
  activo:                z.boolean().optional(),
})

// ── Asistencias ───────────────────────────────────────────────────────────────

export const asistenciaSchema = z.object({
  alumno_id:         uuid.nullable().optional(),
  coach_id:          uuid,
  alumno_horario_id: uuid.optional().nullable(),
  fecha,
  hora:              hora.optional().nullable(),
  asistio:           z.boolean(),
  notas:             z.string().max(500).optional().nullable(),
})

// ── Excepciones de horario ────────────────────────────────────────────────────

export const excepcionSchema = z.object({
  alumno_horario_id: uuid,
  alumno_id:         uuid.nullable().optional(),
  fecha_original:    fecha,
  fecha_nueva:       fecha.optional().nullable(),
  hora_nueva:        hora.optional().nullable(),
  motivo:            z.string().max(500).optional(),
  cancelado:         z.boolean().optional(),
})

export const deshacerExcepcionSchema = z.object({
  id: uuid,
})

// ── Traspasos de coach ────────────────────────────────────────────────────────

export const traspasoSchema = z.object({
  coach_origen_id:  uuid,
  coach_destino_id: uuid,
  fecha_desde:      fecha,
  fecha_hasta:      fecha,
  motivo:           z.string().max(300).optional().nullable(),
  // Si viene vacío/ausente, el traspaso aplica a todos los alumnos del coach origen.
  alumno_ids:       z.array(uuid).optional(),
})

export const cancelarTraspasoSchema = z.object({
  id: uuid,
})

export const traspasarAlumnosSchema = z.object({
  alumno_ids:     z.array(uuid).min(1, 'Elegí al menos un alumno.'),
  coach_nuevo_id: uuid,
})

// ── Rutinas predefinidas ──────────────────────────────────────────────────────

const ejercicioPredefinidoSchema = z.object({
  nombre: z.string().min(1).max(200),
  orden:  z.number().int().min(0).optional(),
})

export const crearRutinaSchema = z.object({
  coach_id:     uuid,
  nombre:       z.string().min(1, 'El nombre es obligatorio').max(200),
  categoria_ids: z.array(uuid).optional(),
  ejercicios:   z.array(ejercicioPredefinidoSchema).max(50),
  orden:        z.number().int().min(0).optional(),
})

export const actualizarRutinaSchema = z.object({
  nombre:        z.string().min(1).max(200).optional(),
  categoria_ids: z.array(uuid).optional(),
  ejercicios:    z.array(ejercicioPredefinidoSchema).max(50).optional(),
})

// ── Categorías de rutinas ─────────────────────────────────────────────────────

export const crearCategoriaRutinaSchema = z.object({
  coach_id: uuid,
  nombre:   z.string().min(1, 'El nombre es obligatorio').max(50),
})

export const actualizarCategoriaRutinaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(50),
})

// ── Sesiones de rutina ────────────────────────────────────────────────────────

const serieSchema = z.object({
  peso: z.union([z.number().min(0).max(999), z.string().max(10), z.null()]).optional(),
  reps: z.union([z.number().int().min(0).max(999), z.string().max(10), z.null()]).optional(),
})

const ejercicioSesionSchema = z.object({
  nombre: z.string().min(1).max(200),
  series: z.array(serieSchema).max(20).optional(),
})

export const sesionRutinaSchema = z.object({
  alumno_id:             uuid.nullable().optional(),
  coach_id:              uuid,
  alumno_horario_id:     uuid.optional().nullable(),
  fecha,
  rutina_nombre:         z.string().min(1).max(200),
  rutina_predefinida_id: uuid.optional().nullable(),
  ejercicios:            z.array(ejercicioSesionSchema).max(50),
  notas:                 z.string().max(1000).optional().nullable(),
})

// ── Catálogo de ejercicios ─────────────────────────────────────────────────────

export const ejercicioCatalogoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').max(200),
})

// ── Perfil de alumno ──────────────────────────────────────────────────────────

export const actualizarPerfilAlumnoSchema = z.object({
  email:    z.string().email('Email inválido'),
  coach_id: uuid.nullable().optional(),
})

// ── Peso corporal ─────────────────────────────────────────────────────────────

export const pesoSchema = z.object({
  alumno_id: uuid,
  fecha:     fecha.optional(),
  peso_kg:   z.number({ invalid_type_error: 'peso_kg debe ser un número' })
               .min(0.1, 'Peso mínimo 0.1 kg')
               .max(399.9, 'Peso máximo 399.9 kg'),
  notas:     z.string().max(500).optional().nullable(),
})

// ── Helper: parsear body y devolver 400 si falla ──────────────────────────────

export function parseBody(schema, data) {
  const result = schema.safeParse(data)
  if (!result.success) {
    const mensajes = result.error.errors.map(e => e.message).join(', ')
    return { data: null, error: Response.json({ error: mensajes }, { status: 400 }) }
  }
  return { data: result.data, error: null }
}
