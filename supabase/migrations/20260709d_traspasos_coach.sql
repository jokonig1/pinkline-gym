-- Traspaso temporal de clases entre coaches (ej. cobertura por vacaciones).
-- No modifica alumno_horarios: la cobertura se resuelve en tiempo de consulta
-- según el rango de fechas, así que revertir es solo borrar la fila.
CREATE TABLE IF NOT EXISTS traspasos_coach (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_origen_id  uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_destino_id uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  fecha_desde      date        NOT NULL,
  fecha_hasta      date        NOT NULL,
  motivo           text,
  created_at       timestamptz DEFAULT now(),
  CHECK (fecha_hasta >= fecha_desde),
  CHECK (coach_origen_id <> coach_destino_id)
);

ALTER TABLE traspasos_coach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "involucrados_ven_y_gestionan" ON traspasos_coach
  FOR ALL USING (coach_origen_id = auth.uid() OR coach_destino_id = auth.uid());

CREATE POLICY "admin_todo_traspasos" ON traspasos_coach
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE INDEX IF NOT EXISTS traspasos_coach_rango_idx ON traspasos_coach (fecha_desde, fecha_hasta);
