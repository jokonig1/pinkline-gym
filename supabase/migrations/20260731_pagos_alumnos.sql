-- Registro mensual de pagos por alumna, para la sección de Contabilidad.
-- Un registro por alumna+mes+año. El monto se ingresa siempre a mano (no hay
-- tabla de precios por plan) porque las promos hacen que varíe caso a caso.
CREATE TABLE IF NOT EXISTS public.pagos_alumnos (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id   uuid        NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  año         integer     NOT NULL,
  mes         integer     NOT NULL CHECK (mes BETWEEN 1 AND 12),
  pagado      boolean     NOT NULL DEFAULT false,
  monto       integer,
  fecha_pago  date,
  notas       text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (alumno_id, año, mes)
);

ALTER TABLE public.pagos_alumnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_pagos_alumnos" ON public.pagos_alumnos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE INDEX IF NOT EXISTS pagos_alumnos_periodo_idx ON public.pagos_alumnos (año, mes);
