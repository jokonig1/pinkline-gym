-- Registro de pagos por alumna, para la sección de Contabilidad.
-- Cada fila es un pago real (no un casillero por mes): se carga la fecha en
-- que pagó y cuántos meses cubre ese pago, y se guarda la fecha de
-- vencimiento calculada (fecha_pago + meses_pagados). El monto se ingresa
-- siempre a mano (no hay tabla de precios por plan) porque las promos hacen
-- que varíe caso a caso.
CREATE TABLE IF NOT EXISTS public.pagos_alumnos (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id         uuid        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  fecha_pago        date        NOT NULL,
  meses_pagados     integer     NOT NULL DEFAULT 1 CHECK (meses_pagados BETWEEN 1 AND 12),
  fecha_vencimiento date        NOT NULL,
  monto             integer,
  notas             text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

ALTER TABLE public.pagos_alumnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_pagos_alumnos" ON public.pagos_alumnos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE INDEX IF NOT EXISTS pagos_alumnos_alumno_idx ON public.pagos_alumnos (alumno_id, fecha_vencimiento DESC);
