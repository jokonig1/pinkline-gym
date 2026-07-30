-- Costos fijos mensuales del gimnasio (arriendo, sueldos, etc.), usados para
-- calcular margen y punto de equilibrio en /dashboard/admin/kpis.
CREATE TABLE IF NOT EXISTS costos_mensuales (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  año        integer     NOT NULL,
  mes        integer     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  items      jsonb       NOT NULL DEFAULT '[]',
  total      integer     NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (año, mes)
);

ALTER TABLE costos_mensuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_costos" ON costos_mensuales
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND rol = 'admin')
  );
