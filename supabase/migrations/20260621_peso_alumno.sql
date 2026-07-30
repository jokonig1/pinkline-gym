-- ─────────────────────────────────────────────────────────────────────────────
-- Fecha de vencimiento del plan (admin la puede actualizar desde el perfil del alumno)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS vencimiento_plan date;

-- ─────────────────────────────────────────────────────────────────────────────
-- Registro de peso corporal del alumno
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS peso_alumno (
  id         uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id  uuid         NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  fecha      date         NOT NULL DEFAULT current_date,
  peso_kg    decimal(5,2) NOT NULL CHECK (peso_kg > 0 AND peso_kg < 400),
  notas      text,
  created_at timestamptz  DEFAULT now(),
  UNIQUE (alumno_id, fecha)
);

ALTER TABLE peso_alumno ENABLE ROW LEVEL SECURITY;

-- Coach puede gestionar el peso de sus alumnos
CREATE POLICY "coach_manage_peso" ON peso_alumno
  FOR ALL USING (
    alumno_id IN (SELECT id FROM alumnos WHERE coach_id = auth.uid())
  );

-- Admin puede gestionar todo
CREATE POLICY "admin_manage_peso" ON peso_alumno
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE INDEX IF NOT EXISTS peso_alumno_idx ON peso_alumno (alumno_id, fecha DESC);
