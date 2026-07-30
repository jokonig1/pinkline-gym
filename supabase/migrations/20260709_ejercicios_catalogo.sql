CREATE TABLE IF NOT EXISTS ejercicios_catalogo (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre     text        NOT NULL,
  activo     boolean     NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ejercicios_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaches_leen_y_agregan_ejercicios" ON ejercicios_catalogo
  FOR ALL USING (true);
