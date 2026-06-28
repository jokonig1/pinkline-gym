'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import AlumnosList    from '@/app/dashboard/_components/AlumnosList'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'

export default function CoachAlumnos() {
  const [coachId, setCoachId] = useState(null)

  useEffect(() => {
    const supabase = createClient()
    async function getCoach() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCoachId(user.id)
    }
    getCoach()
  }, [])

  if (!coachId) return <LoadingSpinner />

  return (
    <AlumnosList
      coachIdFiltro={coachId}
      mostrarAgregar={false}
      rutaVer={(id) => `/dashboard/admin/alumnos/${id}`}
    />
  )
}
