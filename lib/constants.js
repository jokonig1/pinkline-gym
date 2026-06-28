// ── Días ──────────────────────────────────────────────────────────────────────
export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

// Etiquetas cortas (calendarios)
export const DIAS_LABEL = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié',
  jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb',
}

// Etiquetas largas (formularios)
export const DIAS_LABEL_LARGO = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado',
}

// ── Horas disponibles en el calendario ───────────────────────────────────────
export const HORAS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00',
]

// ── Días sugeridos por plan (para pre-llenar horarios) ───────────────────────
export const DIAS_POR_PLAN = {
  '1x/sem': ['lunes'],
  '2x/sem': ['lunes', 'miercoles'],
  '3x/sem': ['lunes', 'miercoles', 'viernes'],
  '4x/sem': ['lunes', 'martes', 'jueves', 'viernes'],
  '5x/sem': ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
  '6x/sem': ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'],
}

// ── Paleta de colores por coach ───────────────────────────────────────────────
// Índice 0-5 guardado en profiles.color → se mapea a este array
export const COLORES_COACH = [
  { bg: 'rgba(220,38,38,0.18)',  border: '#DC2626', text: '#f87171' }, // 0 rojo
  { bg: 'rgba(37,99,235,0.18)',  border: '#2563EB', text: '#60a5fa' }, // 1 azul
  { bg: 'rgba(22,163,74,0.18)',  border: '#16a34a', text: '#4ade80' }, // 2 verde
  { bg: 'rgba(217,119,6,0.18)', border: '#d97706', text: '#fbbf24' }, // 3 naranja
  { bg: 'rgba(124,58,237,0.18)', border: '#7c3aed', text: '#a78bfa' }, // 4 violeta
  { bg: 'rgba(6,182,212,0.18)',  border: '#06b6d4', text: '#67e8f9' }, // 5 cyan
]
