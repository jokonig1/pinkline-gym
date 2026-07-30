'use client'
import { useEffect, useState } from 'react'
import HorariosCalendar from '@/app/dashboard/_components/HorariosCalendar'
import LoadingSpinner   from '@/app/dashboard/_components/LoadingSpinner'
import { getSemana }    from '@/lib/getSemana'
import { guardarExcepcion, deshacerExcepcion } from '@/lib/excepciones'

export default function AdminHorariosPage() {
  const [horarios,     setHorarios]     = useState([])
  const [excepciones,  setExcepciones]  = useState([])
  const [traspasos,    setTraspasos]    = useState([])
  const [coaches,      setCoaches]      = useState([])
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [loading,      setLoading]      = useState(true)
  const [tick,         setTick]         = useState(0)

  useEffect(() => {
    async function load() {
      const [horariosRes, coachesRes] = await Promise.all([
        fetch('/api/horarios'),
        fetch('/api/coaches'),
      ])

      const { horarios: h, excepciones: exc, traspasos: tr } = horariosRes.ok
        ? await horariosRes.json()
        : { horarios: [], excepciones: [], traspasos: [] }

      setHorarios(h)
      setExcepciones(exc)
      setTraspasos(tr || [])
      setCoaches(coachesRes.ok ? await coachesRes.json() : [])
      setLoading(false)
    }
    load()
  }, [semanaOffset, tick])

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
      traspasos={traspasos}
      coaches={coaches}
      semana={getSemana(semanaOffset)}
      semanaOffset={semanaOffset}
      setSemanaOffset={setSemanaOffset}
      onGuardar={handleGuardar}
      onDeshacer={handleDeshacer}
      rutasAdmin={true}
    />
  )
}
