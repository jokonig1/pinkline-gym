'use client'
import AlumnosList from '@/app/dashboard/_components/AlumnosList'

export default function AdminAlumnosPage() {
  return (
    <AlumnosList
      mostrarAgregar={true}
      rutaNuevo="/dashboard/admin/alumnos/nuevo"
      rutaVer={(id) => `/dashboard/admin/alumnos/${id}`}
    />
  )
}
