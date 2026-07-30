-- La pestaña de Coaches lee/escribe profiles.activo pero la columna nunca se
-- creó — por eso todos aparecían "Inactivo" y activarlos no tenía efecto.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;
