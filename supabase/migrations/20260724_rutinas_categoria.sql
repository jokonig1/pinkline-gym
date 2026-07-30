-- Categorías propias del coach para clasificar sus rutinas predefinidas
-- (ej. "Piernas", "Espalda/Bícep") — entidad manejable (crear, renombrar,
-- borrar) en vez de un texto suelto repetido en cada rutina.
CREATE TABLE IF NOT EXISTS rutinas_categorias (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nombre     text        NOT NULL,
  orden      int         NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (coach_id, nombre)
);

ALTER TABLE rutinas_categorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_rutinas_categorias" ON rutinas_categorias
  FOR ALL USING (coach_id = auth.uid());

-- Reemplaza el intento anterior de columna de texto libre por una referencia
-- a la categoría real. Al borrar una categoría, sus rutinas quedan sin
-- categoría (no se borran).
ALTER TABLE rutinas_predefinidas DROP COLUMN IF EXISTS categoria;
ALTER TABLE rutinas_predefinidas
  ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES rutinas_categorias(id) ON DELETE SET NULL;
