-- Costos variables del mes (compras puntuales, gastos que cambian mes a mes),
-- separados de costos_mensuales (los costos FIJOS: sueldos, arriendo, etc.)
-- para no mezclar ni tocar esa tabla que ya tiene datos reales cargados.
-- A diferencia de los costos fijos, este NO hereda los items del mes anterior
-- como plantilla -- cada mes arranca vacío a propósito, porque son gastos
-- puntuales que no se repiten solos.
CREATE TABLE IF NOT EXISTS costos_variables_mensuales (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  año        integer     NOT NULL,
  mes        integer     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  items      jsonb       NOT NULL DEFAULT '[]',
  total      integer     NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (año, mes)
);

ALTER TABLE costos_variables_mensuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_costos_variables" ON costos_variables_mensuales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );
