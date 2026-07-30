-- ─────────────────────────────────────────────────────────────────────────────
-- Columna fecha en alumno_horarios: NULL = clase recurrente semanal (default,
-- comportamiento actual). Con valor = clase extra/sobrecupo de UNA sola vez,
-- que solo debe aparecer en esa fecha exacta y nunca recurrir por día de semana.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE alumno_horarios ADD COLUMN IF NOT EXISTS fecha date;

COMMENT ON COLUMN alumno_horarios.fecha IS
  'NULL = horario recurrente semanal (matchea por dia todas las semanas). '
  'Con fecha = clase extra de una sola vez, matchea únicamente esa fecha exacta.';

CREATE INDEX IF NOT EXISTS alumno_horarios_fecha_idx ON alumno_horarios (fecha) WHERE fecha IS NOT NULL;
