-- La tabla peso_alumno se creó sin la columna notas (la migración 20260621
-- ya la declaraba, pero nunca llegó a aplicarse contra la base real).
ALTER TABLE peso_alumno ADD COLUMN IF NOT EXISTS notas text;
