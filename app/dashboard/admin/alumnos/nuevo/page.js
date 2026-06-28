'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DIAS, DIAS_LABEL_LARGO, DIAS_POR_PLAN } from '@/lib/constants'

function horariosParaPlan(plan) {
  return (DIAS_POR_PLAN[plan] || ['lunes']).map(dia => ({
    dia, hora: '08:00', tipo: 'semipersonalizado',
  }))
}

function Field({ label, name, type = 'text', required = false, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type} name={name} value={value} onChange={onChange} required={required}
        className="w-full bg-raised border border-border text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors"
      />
    </div>
  )
}

export default function NuevoAlumno() {
  const router  = useRouter()
  const [loading,    setLoading]    = useState(false)
  const [coaches,    setCoaches]    = useState([])
  const [error,      setError]      = useState('')
  const [capWarning, setCapWarning] = useState(null) // { items, onConfirmar }
  const [form,    setForm]    = useState({
    nombre: '', rut: '', fecha_nacimiento: '', telefono: '',
    email: '', direccion: '', contacto_emergencia: '',
    telefono_emergencia: '', objetivos: '',
    restricciones_medicas: '', tipo_clase: 'Semi Personalizado', plan: '3x/sem', coach_id: '',
  })
  const [horarios, setHorarios] = useState(() => horariosParaPlan('3x/sem'))

  useEffect(() => {
    fetch('/api/coaches')
      .then(r => r.ok ? r.json() : [])
      .then(data => setCoaches(data))
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (name === 'plan') setHorarios(horariosParaPlan(value))
  }

  function handleHorarioChange(index, field, value) {
    setHorarios(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h))
  }

  function agregarHorario() {
    setHorarios(prev => [...prev, { dia: 'lunes', hora: '08:00', tipo: 'semipersonalizado' }])
  }

  function eliminarHorario(index) {
    setHorarios(prev => prev.filter((_, i) => i !== index))
  }

  async function checkCapacidadBloques(horariosValidos) {
    const supabase = createClient()
    const items = []
    for (const h of horariosValidos) {
      const { data } = await supabase
        .from('alumno_horarios')
        .select('hora')
        .eq('activo', true)
        .eq('dia', h.dia)
      const count = (data || []).filter(r => (r.hora || '').startsWith(h.hora)).length
      if (count >= 16) items.push({ dia: h.dia, hora: h.hora.slice(0, 5), count })
    }
    return items
  }

  async function ejecutarGuardar() {
    setCapWarning(null)
    setLoading(true)
    setError('')
    const supabase = createClient()

    const { data: alumno, error: alumnoError } = await supabase
      .from('alumnos')
      .insert([{ ...form, coach_id: form.coach_id || null }])
      .select()
      .single()

    if (alumnoError) {
      setError('Error al guardar: ' + alumnoError.message)
      setLoading(false)
      return
    }

    const horariosValidos = horarios.filter(h => h.dia && h.hora)
    if (horariosValidos.length > 0) {
      await supabase.from('alumno_horarios').insert(
        horariosValidos.map(h => ({
          alumno_id: alumno.id,
          coach_id:  form.coach_id || null,
          dia:       h.dia,
          hora:      h.hora,
          tipo:      h.tipo,
          activo:    true,
        }))
      )
    }

    router.push('/dashboard/admin/alumnos')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const horariosValidos = horarios.filter(h => h.dia && h.hora)
    const bloquesSaturados = await checkCapacidadBloques(horariosValidos)
    if (bloquesSaturados.length > 0) {
      setCapWarning({ items: bloquesSaturados, onConfirmar: ejecutarGuardar })
      return
    }
    await ejecutarGuardar()
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-foreground transition-colors text-sm">
          ← Volver
        </button>
        <h2 className="text-foreground font-bold">Nuevo Alumno</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Datos personales */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Datos personales</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre completo"  name="nombre"           required value={form.nombre}           onChange={handleChange} />
            <Field label="RUT"              name="rut"                       value={form.rut}               onChange={handleChange} />
            <Field label="Fecha nacimiento" name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} />
            <Field label="Teléfono"         name="telefono"                  value={form.telefono}          onChange={handleChange} />
            <Field label="Correo"           name="email"            type="email" value={form.email}         onChange={handleChange} />
            <Field label="Dirección"        name="direccion"                 value={form.direccion}         onChange={handleChange} />
          </div>
        </div>

        {/* Contacto emergencia */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Contacto de emergencia</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nombre contacto"   name="contacto_emergencia"  value={form.contacto_emergencia}  onChange={handleChange} />
            <Field label="Teléfono contacto" name="telefono_emergencia"  value={form.telefono_emergencia}  onChange={handleChange} />
          </div>
        </div>

        {/* Info gimnasio */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Información del gimnasio</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Tipo de clase */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Tipo de clase</label>
              <div className="flex gap-2">
                {['Personalizado', 'Semi Personalizado'].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, tipo_clase: t }))}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.tipo_clase === t
                        ? 'bg-red-600/15 border-red-600/40 text-red-500'
                        : 'border-border text-zinc-500 hover:text-foreground bg-raised'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Frecuencia semanal */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Días por semana</label>
              <select name="plan" value={form.plan} onChange={handleChange}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-600">
                <option value="1x/sem">1 día</option>
                <option value="2x/sem">2 días</option>
                <option value="3x/sem">3 días</option>
                <option value="4x/sem">4 días</option>
                <option value="5x/sem">5 días</option>
                <option value="6x/sem">6 días</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Coach asignado</label>
              <select name="coach_id" value={form.coach_id} onChange={handleChange}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-600">
                <option value="">Sin asignar</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Objetivos</label>
              <textarea name="objetivos" value={form.objetivos} onChange={handleChange} rows={3}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Restricciones médicas</label>
              <textarea name="restricciones_medicas" value={form.restricciones_medicas} onChange={handleChange} rows={3}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-red-600 resize-none" />
            </div>
          </div>
        </div>

        {/* Horarios */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-zinc-500 uppercase tracking-widest">Horario semanal fijo</div>
            <button type="button" onClick={agregarHorario}
              className="text-xs text-red-500 hover:text-red-400 transition-colors font-medium">
              + Agregar día
            </button>
          </div>
          <p className="text-[11px] text-zinc-600 mb-4">
            Los días se pre-completan según el plan elegido. Podés cambiar el día y la hora de cada uno.
          </p>

          <div className="space-y-3">
            {horarios.map((h, i) => (
              <div key={i} className="bg-raised rounded-xl border border-border p-3">
                {/* Encabezado de la fila */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    Día {i + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => eliminarHorario(i)}
                    className="text-zinc-600 hover:text-red-400 transition-colors w-6 h-6 flex items-center justify-center rounded text-sm"
                    title="Eliminar este día"
                  >
                    ✕
                  </button>
                </div>
                {/* Campos en grid 2 + 1 */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Día</label>
                    <select
                      value={h.dia}
                      onChange={e => handleHorarioChange(i, 'dia', e.target.value)}
                      className="w-full bg-surface border border-border text-foreground rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-red-600"
                    >
                      {DIAS.map(d => <option key={d} value={d}>{DIAS_LABEL_LARGO[d]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Hora</label>
                    <input
                      type="time"
                      value={h.hora}
                      onChange={e => handleHorarioChange(i, 'hora', e.target.value)}
                      className="w-full bg-surface border border-border text-foreground rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-red-600"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Tipo de clase</label>
                    <div className="flex gap-2">
                      {[
                        { val: 'personalizado',     label: 'Personalizado'    },
                        { val: 'semipersonalizado', label: 'Semi Personalizado' },
                      ].map(({ val, label }) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => handleHorarioChange(i, 'tipo', val)}
                          className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                            h.tipo === val
                              ? 'bg-red-600/15 border-red-600/40 text-red-500'
                              : 'border-border text-zinc-500 hover:text-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg border border-border-strong text-zinc-500 hover:text-foreground text-sm transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-8 py-2.5 rounded-lg transition-colors text-sm">
            {loading ? 'Guardando...' : 'Guardar alumno'}
          </button>
        </div>
      </form>

      {/* Modal advertencia de capacidad */}
      {capWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-surface border border-border-strong rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-amber-500 text-xl">⚠</span>
            </div>
            <h3 className="text-foreground font-bold text-base text-center mb-1">
              Bloque al límite de capacidad
            </h3>
            <p className="text-sm text-zinc-500 text-center mb-3">
              Los siguientes bloques ya tienen 16 alumnos:
            </p>
            <div className="space-y-1.5 mb-5">
              {capWarning.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-foreground capitalize">
                    {item.dia} {item.hora}
                  </span>
                  <span className="text-xs font-bold text-amber-500">{item.count}/16</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 text-center mb-5">
              Podés agregar el alumno igual, pero el bloque superará el límite recomendado.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCapWarning(null)}
                className="flex-1 border border-border-strong text-zinc-500 hover:text-foreground text-sm py-2.5 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={capWarning.onConfirmar}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
              >
                Agregar igual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
