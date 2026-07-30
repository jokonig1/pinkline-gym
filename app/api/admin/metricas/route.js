import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET() {
  const { response } = await requireAuth(['admin'])
  if (response) return response

  // Semana actual (lunes → sábado)
  const today = new Date()
  const dow   = today.getDay()
  const lunes = new Date(today)
  lunes.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1))
  const sabado = new Date(lunes)
  sabado.setDate(lunes.getDate() + 5)

  // Primer día del mes
  const inicioMes = new Date(today.getFullYear(), today.getMonth(), 1)

  const semanaInicio = toDateStr(lunes)
  const semanaFin    = toDateStr(sabado)
  const mesInicio    = toDateStr(inicioMes)
  const mesActual    = toDateStr(today)

  // Últimos 6 meses para comparación histórica
  const hace6meses    = new Date(today.getFullYear(), today.getMonth() - 5, 1)
  const hace6mesesStr = toDateStr(hace6meses)

  const [
    { data: alumnos },
    { data: horarios },
    { data: excepciones },
    { data: asistencias },
    { data: coaches },
    { data: sesiones },
    { data: alumnosNuevosMes },
    { data: asistenciasHistoricas },
    { data: costosRegistros },
  ] = await Promise.all([
    supabaseAdmin.from('alumnos').select('id, activo, plan, tipo_clase, coach_id, created_at'),
    supabaseAdmin.from('alumno_horarios').select('alumno_id, dia, hora').eq('activo', true).is('fecha', null),
    supabaseAdmin.from('alumno_horarios_excepciones')
      .select('cancelado, fecha_nueva')
      .gte('fecha_original', mesInicio)
      .lte('fecha_original', mesActual),
    supabaseAdmin.from('asistencias')
      .select('asistio')
      .gte('fecha', mesInicio)
      .lte('fecha', mesActual),
    supabaseAdmin.from('profiles').select('id, nombre, color').in('rol', ['coach', 'admin']),
    supabaseAdmin.from('sesiones_rutina')
      .select('id')
      .gte('fecha', mesInicio)
      .lte('fecha', mesActual),
    supabaseAdmin.from('alumnos')
      .select('id')
      .eq('activo', true)
      .gte('created_at', mesInicio)
      .lte('created_at', mesActual + 'T23:59:59'),
    supabaseAdmin.from('asistencias')
      .select('fecha, asistio')
      .gte('fecha', hace6mesesStr)
      .lte('fecha', mesActual),
    supabaseAdmin.from('costos_mensuales')
      .select('año, mes, total')
      .order('año', { ascending: true })
      .order('mes', { ascending: true })
      .then(({ data }) => ({ data }))
      .catch(() => ({ data: null })),
  ])

  // Asistencias de la semana para la tasa semanal
  const { data: asistenciasSemana } = await supabaseAdmin
    .from('asistencias')
    .select('asistio')
    .gte('fecha', semanaInicio)
    .lte('fecha', semanaFin)

  const activos   = (alumnos || []).filter(a => a.activo)
  const inactivos = (alumnos || []).filter(a => !a.activo)

  // Ocupación: alumnos activos con al menos 1 horario asignado
  const conHorario = new Set((horarios || []).map(h => h.alumno_id))
  const alumnosConHorario = activos.filter(a => conHorario.has(a.id)).length

  // Ocupación por horario (hora + día) — solo alumnos activos
  const alumnosActivosIds = new Set(activos.map(a => a.id))
  const horariosActivos   = (horarios || []).filter(h => alumnosActivosIds.has(h.alumno_id))

  // Agrupar por (dia, hora) para calcular promedio real por bloque
  const porDiaHora = {}
  const porHoraAcum = {} // { hora: { total, dias: Set } }

  horariosActivos.forEach(h => {
    const hora = h.hora?.slice(0, 5)
    const dia  = h.dia
    if (!hora || !dia) return

    const key = `${dia}|${hora}`
    porDiaHora[key] = (porDiaHora[key] || 0) + 1

    if (!porHoraAcum[hora]) porHoraAcum[hora] = { total: 0, dias: new Set() }
    porHoraAcum[hora].total++
    porHoraAcum[hora].dias.add(dia)
  })

  // Promedio por día: total alumnos ÷ cantidad de días en que existe ese bloque
  const ocupacionPorHora = Object.entries(porHoraAcum)
    .map(([hora, { total, dias }]) => ({
      hora,
      count: Math.round(total / dias.size), // promedio por día
    }))
    .sort((a, b) => a.hora.localeCompare(b.hora))

  const ocupacionPorDiaHora = Object.entries(porDiaHora)
    .map(([key, count]) => {
      const [dia, hora] = key.split('|')
      return { dia, hora, count }
    })
    .sort((a, b) => a.hora.localeCompare(b.hora) || a.dia.localeCompare(b.dia))

  // Por plan
  const PLANES = ['1x/sem', '2x/sem', '3x/sem', '4x/sem', '5x/sem', '6x/sem', 'Personalizado']
  const porPlan = {}
  PLANES.forEach(p => { porPlan[p] = 0 })
  activos.forEach(a => {
    const plan = a.plan || 'Sin plan'
    porPlan[plan] = (porPlan[plan] || 0) + 1
  })

  // Por coach
  const porCoach = {}
  activos.forEach(a => {
    const key = a.coach_id || '__sin_coach__'
    porCoach[key] = (porCoach[key] || 0) + 1
  })
  const porCoachArr = Object.entries(porCoach).map(([coachId, count]) => {
    const coach = (coaches || []).find(c => c.id === coachId)
    return { nombre: coach?.nombre || 'Sin coach', color: coach?.color ?? null, count }
  }).sort((a, b) => b.count - a.count)

  // Asistencia semanal (para el ring de tasa)
  const totalAsistSem = (asistenciasSemana || []).length
  const asistieronSem = (asistenciasSemana || []).filter(a => a.asistio).length
  const tasaAsist     = totalAsistSem > 0 ? Math.round(asistieronSem / totalAsistSem * 100) : null

  // Asistencia mensual (para clases realizadas y el histórico)
  const totalAsist  = (asistencias || []).length
  const asistieron  = (asistencias || []).filter(a => a.asistio).length

  // Excepciones
  const cancelaciones   = (excepciones || []).filter(e => e.cancelado).length
  const reagendamientos = (excepciones || []).filter(e => !e.cancelado && e.fecha_nueva).length

  // Ingresos estimados del mes — precios de la landing
  const PRECIOS = {
    personalizado:     { '2x/sem': 160000, '3x/sem': 190000, '4x/sem': 250000 },
    semipersonalizado: { '2x/sem': 110000, '3x/sem': 130000, '4x/sem': 150000 },
  }

  function precioAlumno(a) {
    const tipoKey = (a.tipo_clase || '').toLowerCase() === 'personalizado'
      ? 'personalizado' : 'semipersonalizado'
    return PRECIOS[tipoKey]?.[a.plan] || 0
  }

  const ingresosMes = activos.reduce((sum, a) => sum + precioAlumno(a), 0)

  // Mes anterior: todos los alumnos que existían antes del inicio de este mes (incluyendo los que se dieron de baja)
  const alumnosMesAnterior = (alumnos || []).filter(a => new Date(a.created_at) < inicioMes)
  const ingresosMesAnterior = alumnosMesAnterior.reduce((sum, a) => sum + precioAlumno(a), 0)

  const CAPACIDAD_MAX  = 300
  const COSTOS_DEFAULT = 3190659  // suma de ítems predeterminados

  function getCostosForMonth(año, mes, registros) {
    if (!registros || registros.length === 0) return COSTOS_DEFAULT
    const exact = registros.find(r => r.año === año && r.mes === mes)
    if (exact) return exact.total
    // Registro previo más reciente (registros ya vienen ordenados asc)
    const prev = registros
      .filter(r => r.año < año || (r.año === año && r.mes < mes))
      .slice(-1)[0]
    return prev?.total ?? COSTOS_DEFAULT
  }

  // ── Histórico mensual (últimos 6 meses) ──────────────────────────────────────
  const mesesLabel = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

  const historico = Array.from({ length: 6 }, (_, i) => {
    const fecha = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
    const year  = fecha.getFullYear()
    const month = fecha.getMonth() // 0-based
    const key   = `${year}-${String(month + 1).padStart(2, '0')}`

    // Alumnos nuevos ese mes
    const nuevos = (alumnos || []).filter(a => {
      const d = new Date(a.created_at)
      return d.getFullYear() === year && d.getMonth() === month
    }).length

    // Asistencias ese mes
    const asistMes = (asistenciasHistoricas || []).filter(a => a.fecha?.startsWith(key))
    const clasesRealizadas = asistMes.filter(a => a.asistio).length
    const inasistencias    = asistMes.filter(a => !a.asistio).length

    // Alumnos al final de ese mes
    const fin = new Date(year, month + 1, 0) // último día del mes
    const alumnosMes = (alumnos || []).filter(a => new Date(a.created_at) <= fin)
    const esActual = year === today.getFullYear() && month === today.getMonth()
    const acumulados = esActual ? activos.length : alumnosMes.length

    // Ingresos estimados ese mes (mes actual: solo activos; meses pasados: todos los registrados)
    const ingresos = esActual ? ingresosMes : alumnosMes.reduce((sum, a) => sum + precioAlumno(a), 0)

    const costos = getCostosForMonth(year, month + 1, costosRegistros)
    return {
      mes:    mesesLabel[month],
      key,
      nuevos,
      clasesRealizadas,
      inasistencias,
      acumulados,
      ingresos,
      costos,
      margen: ingresos - costos,
    }
  })

  const COSTOS_FIJOS = getCostosForMonth(today.getFullYear(), today.getMonth() + 1, costosRegistros)

  // ── Financiero ───────────────────────────────────────────────────────────────
  const margen        = ingresosMes - COSTOS_FIJOS
  const margenPct     = ingresosMes > 0 ? Math.round((margen / ingresosMes) * 100) : 0
  const precioPromedio = activos.length > 0 ? Math.round(ingresosMes / activos.length) : 0
  const puntoEquilibrio = precioPromedio > 0 ? Math.ceil(COSTOS_FIJOS / precioPromedio) : null

  // ── Tasa de retención = activos / total ───────────────────────────────────────
  const tasaRetencion = (alumnos || []).length > 0
    ? Math.round((activos.length / (alumnos || []).length) * 100)
    : null

  // ── Margen por coach ─────────────────────────────────────────────────────────
  const nCoaches = (coaches || []).length || 1
  const costoPorCoach = Math.round(COSTOS_FIJOS / nCoaches)

  const margenPorCoach = porCoachArr.map(c => {
    const coachProfile = (coaches || []).find(co => co.nombre === c.nombre)
    const revenueCoach = activos
      .filter(a => a.coach_id === coachProfile?.id)
      .reduce((sum, a) => sum + precioAlumno(a), 0)
    return {
      ...c,
      revenue:     revenueCoach,
      costo:       costoPorCoach,
      margen:      revenueCoach - costoPorCoach,
      margenPct:   revenueCoach > 0 ? Math.round(((revenueCoach - costoPorCoach) / revenueCoach) * 100) : 0,
    }
  }).sort((a, b) => b.margen - a.margen)

  // ── Adherencia a rutina = sesiones / asistencias confirmadas ─────────────────
  const adherenciaRutina = asistieron > 0
    ? Math.round(((sesiones || []).length / asistieron) * 100)
    : null

  return Response.json({
    semana:        { inicio: semanaInicio, fin: semanaFin },
    capacidadMax:  CAPACIDAD_MAX,

    // Bloque Alumnos
    alumnos: {
      total:         (alumnos || []).length,
      activos:       activos.length,
      inactivos:     inactivos.length,
      conHorario:    alumnosConHorario,
      nuevosEsteMes: (alumnosNuevosMes || []).length,
    },
    tasaRetencion,

    // Bloque Financiero
    ingresosMes,
    ingresosMesAnterior,
    costosFijos:    COSTOS_FIJOS,
    margen,
    margenPct,
    precioPromedio,
    puntoEquilibrio,

    // Bloque Coaches
    porCoach:       margenPorCoach,
    coaches:        (coaches || []).length,

    // Bloque Planes
    porPlan:        Object.entries(porPlan).map(([plan, count]) => ({ plan, count })),

    // Bloque Operación
    asistencia:     { total: totalAsistSem, asistieron: asistieronSem, tasa: tasaAsist },
    excepciones:    { cancelaciones, reagendamientos, total: cancelaciones + reagendamientos },
    clasesEstaSemana: asistieron,
    ocupacionPorHora,
    ocupacionPorDiaHora,
    capacidadPorBloque: 16,

    // Bloque Progreso
    sesionesRutina: (sesiones || []).length,
    adherenciaRutina,
    asistieronMes:  asistieron,

    // Histórico
    historico,
  })
}
