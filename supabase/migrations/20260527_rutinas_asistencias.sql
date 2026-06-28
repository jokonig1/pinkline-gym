-- ──────────────────────────────────────────────────────────────────────────────
-- Rutinas predefinidas por coach (plantillas reutilizables)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rutinas_predefinidas (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  ejercicios  jsonb       NOT NULL DEFAULT '[]',
  -- ejercicios: [{ "nombre": "Press de banca", "orden": 1 }, ...]
  orden       int         NOT NULL DEFAULT 0,
  activo      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE rutinas_predefinidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_rutinas" ON rutinas_predefinidas
  FOR ALL USING (coach_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────
-- Sesiones de rutina registradas por alumno y fecha
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sesiones_rutina (
  id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id             uuid        NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  coach_id              uuid        NOT NULL REFERENCES profiles(id),
  alumno_horario_id     uuid        REFERENCES alumno_horarios(id),
  fecha                 date        NOT NULL DEFAULT current_date,
  rutina_nombre         text        NOT NULL,
  rutina_predefinida_id uuid        REFERENCES rutinas_predefinidas(id),
  ejercicios            jsonb       NOT NULL DEFAULT '[]',
  -- ejercicios: [{ "nombre": "Press de banca", "series": [{"peso": 60, "reps": 10}] }]
  notas                 text,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE sesiones_rutina ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_sesiones" ON sesiones_rutina
  FOR ALL USING (coach_id = auth.uid());

CREATE INDEX sesiones_rutina_alumno_rutina_idx
  ON sesiones_rutina (alumno_id, rutina_nombre, fecha DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- Asistencias por clase y fecha
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS asistencias (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id         uuid        NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  coach_id          uuid        NOT NULL REFERENCES profiles(id),
  alumno_horario_id uuid        REFERENCES alumno_horarios(id),
  fecha             date        NOT NULL DEFAULT current_date,
  hora              time,
  asistio           boolean     NOT NULL DEFAULT true,
  notas             text,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_asistencias" ON asistencias
  FOR ALL USING (coach_id = auth.uid());

CREATE UNIQUE INDEX asistencias_unique_idx
  ON asistencias (alumno_id, alumno_horario_id, fecha)
  WHERE alumno_horario_id IS NOT NULL;
