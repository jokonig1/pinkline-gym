-- Permite acotar un traspaso temporal a un alumno específico en vez de "todas
-- las clases del coach". NULL = aplica a todos los alumnos del coach origen
-- (comportamiento actual); con valor = aplica solo a las clases de ese alumno.
ALTER TABLE traspasos_coach
  ADD COLUMN IF NOT EXISTS alumno_id uuid REFERENCES alumnos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS traspasos_coach_alumno_idx ON traspasos_coach (alumno_id);
