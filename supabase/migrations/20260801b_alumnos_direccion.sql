-- El formulario de alumnos (nuevo y editar) siempre tuvo un campo "Dirección"
-- que nunca se agregó a la tabla, así que al crear un alumno nuevo la base
-- rechazaba el insert. Se agrega la columna que faltaba.
ALTER TABLE public.alumnos ADD COLUMN IF NOT EXISTS direccion text;
