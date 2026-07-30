-- Una rutina puede estar en más de una categoría: tabla puente en vez de
-- una sola columna categoria_id en rutinas_predefinidas.
CREATE TABLE IF NOT EXISTS rutinas_predefinidas_categorias (
  rutina_id    uuid NOT NULL REFERENCES rutinas_predefinidas(id) ON DELETE CASCADE,
  categoria_id uuid NOT NULL REFERENCES rutinas_categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (rutina_id, categoria_id)
);

ALTER TABLE rutinas_predefinidas_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_rutinas_predefinidas_categorias" ON rutinas_predefinidas_categorias
  FOR ALL USING (
    EXISTS (SELECT 1 FROM rutinas_predefinidas r WHERE r.id = rutina_id AND r.coach_id = auth.uid())
  );

-- Migra las asignaciones existentes (columna única categoria_id) antes de borrarla.
INSERT INTO rutinas_predefinidas_categorias (rutina_id, categoria_id)
SELECT id, categoria_id FROM rutinas_predefinidas WHERE categoria_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE rutinas_predefinidas DROP COLUMN IF EXISTS categoria_id;
