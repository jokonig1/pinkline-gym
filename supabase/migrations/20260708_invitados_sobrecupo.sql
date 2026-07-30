-- Permite registrar clases extra/sobrecupo para invitados sin ficha de alumno.
ALTER TABLE alumno_horarios ALTER COLUMN alumno_id DROP NOT NULL;
ALTER TABLE alumno_horarios ADD COLUMN IF NOT EXISTS invitado_nombre text;
ALTER TABLE alumno_horarios ADD COLUMN IF NOT EXISTS invitado_telefono text;
ALTER TABLE alumno_horarios ADD CONSTRAINT alumno_horarios_alumno_o_invitado
  CHECK (alumno_id IS NOT NULL OR invitado_nombre IS NOT NULL);

-- Permite marcar asistencia y registrar rutina para esos invitados.
ALTER TABLE asistencias ALTER COLUMN alumno_id DROP NOT NULL;
ALTER TABLE sesiones_rutina ALTER COLUMN alumno_id DROP NOT NULL;
