-- =============================================================================
-- SCHEMA INICIAL - pinkline-gym
-- Pegar completo en el SQL Editor del nuevo proyecto Supabase
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles (extiende auth.users — se crea manualmente al crear coach/admin)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text        NOT NULL,
  email       text        NOT NULL,
  rol         text        NOT NULL,
  activo      boolean     DEFAULT true,
  color       integer     DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuarios_ven_su_perfil" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "admin_manage_profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- -----------------------------------------------------------------------------
-- 2. clases (tipos de clase: musculación, kinesiología, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clases (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre      text        NOT NULL,
  descripcion text,
  color       text        DEFAULT '#DC2626',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados_ven_clases" ON public.clases
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_manage_clases" ON public.clases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- -----------------------------------------------------------------------------
-- 3. alumnos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alumnos (
  id                    uuid            DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid            REFERENCES auth.users(id),
  nombre                text            NOT NULL,
  rut                   text,
  fecha_nacimiento      date,
  telefono              text,
  email                 text,
  contacto_emergencia   text,
  telefono_emergencia   text,
  fecha_ingreso         date            DEFAULT CURRENT_DATE,
  activo                boolean         DEFAULT true,
  objetivos             text,
  restricciones_medicas text,
  plan                  text            DEFAULT '3x/sem',
  coach_id              uuid            REFERENCES public.profiles(id),
  altura_cm             integer,
  tipo_clase            character varying(20),
  vencimiento_plan      date,
  created_at            timestamptz     DEFAULT now()
);

ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_alumnos" ON public.alumnos
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "admin_manage_alumnos" ON public.alumnos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "alumno_ve_su_perfil" ON public.alumnos
  FOR SELECT USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. horarios (plantilla de clases por coach)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.horarios (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  clase_id    uuid        REFERENCES public.clases(id),
  coach_id    uuid        REFERENCES public.profiles(id),
  dia         text        NOT NULL,
  hora_inicio time        NOT NULL,
  hora_fin    time        NOT NULL,
  cupos_max   integer     DEFAULT 12,
  activo      boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticados_ven_horarios" ON public.horarios
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_manage_horarios" ON public.horarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- -----------------------------------------------------------------------------
-- 5. alumno_horarios (horario asignado a cada alumno)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alumno_horarios (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id   uuid        REFERENCES public.alumnos(id) ON DELETE CASCADE,
  coach_id    uuid        REFERENCES public.profiles(id),
  dia         text        NOT NULL,
  hora        time        NOT NULL,
  tipo        text        DEFAULT 'grupal',
  activo      boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.alumno_horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_alumno_horarios" ON public.alumno_horarios
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "admin_manage_alumno_horarios" ON public.alumno_horarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- -----------------------------------------------------------------------------
-- 6. alumno_horarios_excepciones (cambios puntuales de horario)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alumno_horarios_excepciones (
  id                  uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_horario_id   uuid    REFERENCES public.alumno_horarios(id) ON DELETE CASCADE,
  alumno_id           uuid    REFERENCES public.alumnos(id) ON DELETE CASCADE,
  fecha_original      date    NOT NULL,
  fecha_nueva         date,
  hora_nueva          time,
  cancelado           boolean DEFAULT false,
  motivo              text,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE public.alumno_horarios_excepciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_excepciones" ON public.alumno_horarios_excepciones
  FOR ALL USING (
    alumno_horario_id IN (
      SELECT id FROM public.alumno_horarios WHERE coach_id = auth.uid()
    )
  );

CREATE POLICY "admin_manage_excepciones" ON public.alumno_horarios_excepciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- -----------------------------------------------------------------------------
-- 7. rutinas (cabecera de rutina semanal)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rutinas (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id     uuid        REFERENCES public.alumnos(id) ON DELETE CASCADE,
  coach_id      uuid        REFERENCES public.profiles(id),
  semana_inicio date        NOT NULL,
  observaciones text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.rutinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_rutinas_base" ON public.rutinas
  FOR ALL USING (coach_id = auth.uid());

CREATE POLICY "admin_manage_rutinas_base" ON public.rutinas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- -----------------------------------------------------------------------------
-- 8. rutina_ejercicios (detalle de ejercicios por rutina)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rutina_ejercicios (
  id            uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  rutina_id     uuid    REFERENCES public.rutinas(id) ON DELETE CASCADE,
  nombre        text    NOT NULL,
  series        integer,
  repeticiones  text,
  peso_kg       numeric,
  descanso_seg  integer,
  notas         text,
  orden         integer DEFAULT 0
);

ALTER TABLE public.rutina_ejercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_ejercicios" ON public.rutina_ejercicios
  FOR ALL USING (
    rutina_id IN (SELECT id FROM public.rutinas WHERE coach_id = auth.uid())
  );

CREATE POLICY "admin_manage_ejercicios" ON public.rutina_ejercicios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- -----------------------------------------------------------------------------
-- 9. rutinas_predefinidas (plantillas reutilizables por coach)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rutinas_predefinidas (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id    uuid    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nombre      text    NOT NULL,
  ejercicios  jsonb   NOT NULL DEFAULT '[]',
  orden       integer NOT NULL DEFAULT 0,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.rutinas_predefinidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_rutinas" ON public.rutinas_predefinidas
  FOR ALL USING (coach_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 10. sesiones_rutina (registro de rutinas ejecutadas)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sesiones_rutina (
  id                    uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id             uuid    NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  coach_id              uuid    NOT NULL REFERENCES public.profiles(id),
  alumno_horario_id     uuid    REFERENCES public.alumno_horarios(id),
  fecha                 date    NOT NULL DEFAULT CURRENT_DATE,
  rutina_nombre         text    NOT NULL,
  rutina_predefinida_id uuid    REFERENCES public.rutinas_predefinidas(id),
  ejercicios            jsonb   NOT NULL DEFAULT '[]',
  notas                 text,
  created_at            timestamptz DEFAULT now()
);

ALTER TABLE public.sesiones_rutina ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_sesiones" ON public.sesiones_rutina
  FOR ALL USING (coach_id = auth.uid());

CREATE INDEX sesiones_rutina_alumno_rutina_idx
  ON public.sesiones_rutina (alumno_id, rutina_nombre, fecha DESC);

-- -----------------------------------------------------------------------------
-- 11. asistencias
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asistencias (
  id                uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id         uuid    NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  coach_id          uuid    NOT NULL REFERENCES public.profiles(id),
  alumno_horario_id uuid    REFERENCES public.alumno_horarios(id),
  fecha             date    NOT NULL DEFAULT CURRENT_DATE,
  hora              time,
  asistio           boolean NOT NULL DEFAULT true,
  notas             text,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_asistencias" ON public.asistencias
  FOR ALL USING (coach_id = auth.uid());

CREATE UNIQUE INDEX asistencias_unique_idx
  ON public.asistencias (alumno_id, alumno_horario_id, fecha)
  WHERE alumno_horario_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 12. peso_alumno
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.peso_alumno (
  id          uuid            DEFAULT gen_random_uuid() PRIMARY KEY,
  alumno_id   uuid            NOT NULL REFERENCES public.alumnos(id) ON DELETE CASCADE,
  fecha       date            NOT NULL DEFAULT CURRENT_DATE,
  peso_kg     numeric(5,2)    NOT NULL CHECK (peso_kg > 0 AND peso_kg < 400),
  notas       text,
  created_at  timestamptz     DEFAULT now(),
  UNIQUE (alumno_id, fecha)
);

ALTER TABLE public.peso_alumno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_manage_peso" ON public.peso_alumno
  FOR ALL USING (
    alumno_id IN (SELECT id FROM public.alumnos WHERE coach_id = auth.uid())
  );

CREATE POLICY "admin_manage_peso" ON public.peso_alumno
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE INDEX IF NOT EXISTS peso_alumno_idx
  ON public.peso_alumno (alumno_id, fecha DESC);
