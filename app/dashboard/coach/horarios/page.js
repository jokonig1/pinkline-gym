'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import HorariosCalendar from '@/app/dashboard/_components/HorariosCalendar'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'
import { getSemana } from '@/lib/getSemana'
import { guardarExcepcion, deshacerExcepcion } from '@/lib/excepciones'

export default function CoachHorariosPage() {
  const [horarios,     setHorarios]     = useState([])
  const [excepciones,  setExcepciones]  = useState([])
  const [coaches,      setCoaches]      = useState([])
  const [coachSelf,    setCoachSelf]    = useState(null)
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [tick,         setTick]         = useState(0)

  // Phase 1: identificar al coach actual (necesita sesión del cliente)
  useEffect(() => {
    const supabase = createClient()
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, nombre, color')
        .eq('id', user.id)
        .single()

      if (pErr) {
        const { data: fallback } = await supabase
          .from('profiles')
          .select('id, nombre')
          .eq('id', user.id)
          .single()
        profile = fallback
      }

      setCoachSelf(profile)
    }
    init()
  }, [])

  // Phase 2: cargar datos del calendario via service_role (bypasea RLS)
  useEffect(() => {
    if (!coachSelf) return
    async function load() {
      const [horariosRes, coachesRes] = await Promise.all([
        fetch('/api/horarios'),
        fetch('/api/coaches'),
      ])

      const { horarios: h, excepciones: exc } = horariosRes.ok
        ? await horariosRes.json()
        : { horarios: [], excepciones: [] }

      setHorarios(h)
      setExcepciones(exc)
      setCoaches(coachesRes.ok ? await coachesRes.json() : [])
      setLoading(false)
    }
    load()
  }, [coachSelf, semanaOffset, tick])

  function refetch() { setTick(t => t + 1) }

  async function handleGuardar(slot, form) {
    await guardarExcepcion(slot, form)
    refetch()
  }

  async function handleDeshacer(excId) {
    await deshacerExcepcion(excId)
    refetch()
  }

  if (loading) return <LoadingSpinner />

  return (
    <HorariosCalendar
      horarios={horarios}
      excepciones={excepciones}
      coaches={coaches}
      semana={getSemana(semanaOffset)}
      semanaOffset={semanaOffset}
      setSemanaOffset={setSemanaOffset}
      onGuardar={handleGuardar}
      onDeshacer={handleDeshacer}
      soloEditarCoachId={coachSelf?.id}
      rutasAdmin={false}
    />
  )
}
