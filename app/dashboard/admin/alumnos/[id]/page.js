'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DIAS, DIAS_LABEL_LARGO, HORAS } from '@/lib/constants'
import LoadingSpinner from '@/app/dashboard/_components/LoadingSpinner'
import StatusBadge from '@/app/dashboard/_components/StatusBadge'
import DateInput from '@/app/dashboard/_components/DateInput'
import HistorialRutinas from '@/app/dashboard/_components/HistorialRutinas'

// ── Helpers de fecha ──────────────────────────────────────────────────────────

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  const [y, m, d] = fechaStr.split('-')
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`
}

// ── Campo editable ────────────────────────────────────────────────────────────

function Field({ label, field, type = 'text', editando, form, alumno, onChange }) {
  return (
    <div>
      <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">{label}</label>
      {editando ? (
        type === 'date' ? (
          <DateInput
            value={form[field] || ''}
            onChange={e => onChange(field, e.target.value)}
            className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600"
          />
        ) : (
          <input
            type={type}
            value={form[field] || ''}
            onChange={e => onChange(field, e.target.value)}
            className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600"
          />
        )
      ) : (
        <div className="text-sm text-foreground">{alumno[field] || <span className="text-zinc-500">—</span>}</div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function DetalleAlumno() {
  const router = useRouter()
  const { id } = useParams()
  const [alumno,    setAlumno]    = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [editando,  setEditando]  = useState(false)
  const [form,      setForm]      = useState({})
  const [errorSave, setErrorSave] = useState('')
  const [sesiones,  setSesiones]  = useState([])
  const [horarios,  setHorarios]  = useState([]) // horarios actuales del alumno
  const [horForm,   setHorForm]   = useState([]) // copia editable
  const [menuAbierto, setMenuAbierto] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    async function fetchData() {
      const [{ data: a }, sesRes, { data: hrs }] = await Promise.all([
        supabase.from('alumnos').select('*, coach:coach_id(nombre)').eq('id', id).single(),
        fetch(`/api/sesiones-rutina?alumno_id=${id}`),
        supabase.from('alumno_horarios')
          .select('id, dia, hora, tipo, coach_id')
          .eq('alumno_id', id)
          .eq('activo', true)
          .is('fecha', null)
          .order('dia').order('hora'),
      ])
      setAlumno(a)
      setForm(a)
      setSesiones(sesRes.ok ? await sesRes.json() : [])
      const h = (hrs || []).map(x => ({ ...x, _nuevo: false, _eliminar: false }))
      setHorarios(h)
      setHorForm(h)
      setLoading(false)
    }
    fetchData()
  }, [id])

  function handleFieldChange(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setErrorSave('')
    const supabase = createClient()

    // Guardar datos del alumno
    const { error } = await supabase.from('alumnos').update({
      nombre:                form.nombre,
      rut:                   form.rut,
      telefono:              form.telefono,
      email:                 form.email,
      direccion:             form.direccion,
      contacto_emergencia:   form.contacto_emergencia,
      telefono_emergencia:   form.telefono_emergencia,
      objetivos:             form.objetivos,
      restricciones_medicas: form.restricciones_medicas,
      plan:                  form.plan,
      coach_id:              form.coach_id,
      vencimiento_plan:      form.vencimiento_plan || null,
    }).eq('id', id)

    if (error) { setErrorSave(error.message); setSaving(false); return }

    // Guardar cambios de horarios
    const aEliminar  = horForm.filter(h => h._eliminar && h.id)
    const aNuevos    = horForm.filter(h => h._nuevo && !h._eliminar && h.dia && h.hora)
    const aActualizar = horForm.filter(h => !h._nuevo && !h._eliminar && h.id)

    await Promise.all([
      ...aEliminar.map(h => supabase.from('alumno_horarios').update({ activo: false }).eq('id', h.id)),
      aNuevos.length > 0
        ? supabase.from('alumno_horarios').insert(aNuevos.map(h => ({
            alumno_id: id,
            coach_id:  form.coach_id || null,
            dia:       h.dia,
            hora:      h.hora,
            tipo:      h.tipo,
            activo:    true,
          })))
        : Promise.resolve(),
      ...aActualizar.map(h =>
        supabase.from('alumno_horarios')
          .update({ dia: h.dia, hora: h.hora, tipo: h.tipo })
          .eq('id', h.id)
      ),
    ])

    // Recargar horarios frescos
    const { data: hrsNew } = await supabase
      .from('alumno_horarios')
      .select('id, dia, hora, tipo, coach_id')
      .eq('alumno_id', id).eq('activo', true)
      .is('fecha', null)
      .order('dia').order('hora')
    const hFresh = (hrsNew || []).map(x => ({ ...x, _nuevo: false, _eliminar: false }))
    setHorarios(hFresh)
    setHorForm(hFresh)

    setSaving(false)
    setEditando(false)
    setAlumno(form)
  }

  function setHorario(idx, field, value) {
    setHorForm(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h))
  }

  function agregarHorario() {
    setHorForm(prev => [...prev, {
      dia: 'lunes', hora: '08:00',
      tipo: form.tipo_clase?.toLowerCase() === 'personalizado' ? 'personalizado' : 'semipersonalizado',
      coach_id: form.coach_id || null,
      _nuevo: true, _eliminar: false,
    }])
  }

  async function toggleActivo() {
    setMenuAbierto(false)
    const supabase = createClient()
    const nuevoActivo = !alumno.activo
    const { error } = await supabase.from('alumnos').update({ activo: nuevoActivo }).eq('id', id)
    if (!error) { setAlumno(a => ({ ...a, activo: nuevoActivo })); setForm(f => ({ ...f, activo: nuevoActivo })) }
  }

  function marcarEliminar(idx) {
    setHorForm(prev => prev.map((h, i) => {
      if (i !== idx) return h
      return h._nuevo ? null : { ...h, _eliminar: !h._eliminar }
    }).filter(Boolean))
  }

  if (loading) return <LoadingSpinner />

  if (!alumno) return (
    <div className="text-zinc-500 text-center py-12">Alumno no encontrado</div>
  )

  const fieldProps = { editando, form, alumno, onChange: handleFieldChange }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-zinc-500 hover:text-foreground transition-colors text-sm">
          ← Volver
        </button>
      </div>

      {/* Header alumno */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-pink-900/30 flex items-center justify-center text-xl font-black text-pink-400">
          {alumno.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-foreground font-bold text-lg">{alumno.nombre}</h2>
          <div className="flex gap-3 mt-1">
            <StatusBadge activo={alumno.activo} />
            <span className="text-xs text-zinc-500">{alumno.plan}</span>
            <span className="text-xs text-zinc-500">Coach: {alumno.coach?.nombre || '—'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {editando ? (
            <>
              <button onClick={() => { setEditando(false); setErrorSave('') }}
                className="text-sm text-zinc-500 hover:text-foreground px-4 py-2 rounded-lg border border-border-strong transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          ) : (
            <div className="relative">
              <button onClick={() => setMenuAbierto(m => !m)} aria-label="Más opciones"
                className="text-zinc-500 hover:text-foreground w-9 h-9 flex items-center justify-center rounded-lg border border-border-strong hover:bg-hover-md transition-colors text-lg leading-none">
                ⋮
              </button>
              {menuAbierto && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuAbierto(false)} />
                  <div className="absolute right-0 top-10 z-20 bg-surface border border-border-strong rounded-xl shadow-xl py-1 w-44">
                    <button onClick={() => { setEditando(true); setMenuAbierto(false) }}
                      className="w-full text-left px-3.5 py-2.5 text-sm text-foreground hover:bg-hover-md transition-colors">
                      Editar
                    </button>
                    <button onClick={toggleActivo}
                      className="w-full text-left px-3.5 py-2.5 text-sm text-foreground hover:bg-hover-md transition-colors">
                      {alumno.activo ? 'Marcar inactivo' : 'Marcar activo'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {errorSave && (
        <p className="text-pink-500 text-sm mb-4 bg-pink-900/20 border border-pink-900/30 rounded-lg px-4 py-2">
          {errorSave}
        </p>
      )}

      {/* Datos personales */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Datos personales</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo" field="nombre" {...fieldProps} />
          <Field label="RUT" field="rut" {...fieldProps} />
          <Field label="Teléfono" field="telefono" {...fieldProps} />
          <Field label="Correo" field="email" type="email" {...fieldProps} />
          <Field label="Dirección" field="direccion" {...fieldProps} />
          <Field label="Fecha nacimiento" field="fecha_nacimiento" type="date" {...fieldProps} />
        </div>
      </div>

      {/* Contacto emergencia */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Contacto de emergencia</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre contacto" field="contacto_emergencia" {...fieldProps} />
          <Field label="Teléfono contacto" field="telefono_emergencia" {...fieldProps} />
        </div>
      </div>

      {/* Info gimnasio */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4">
        <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Información del gimnasio</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Field label="Plan" field="plan" {...fieldProps} />
          <Field label="Vencimiento del plan" field="vencimiento_plan" type="date" {...fieldProps} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Objetivos</label>
            {editando ? (
              <textarea
                value={form.objetivos || ''}
                onChange={e => handleFieldChange('objetivos', e.target.value)}
                rows={3}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600 resize-none"
              />
            ) : (
              <div className="text-sm text-foreground">{alumno.objetivos || <span className="text-zinc-500">—</span>}</div>
            )}
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Restricciones médicas</label>
            {editando ? (
              <textarea
                value={form.restricciones_medicas || ''}
                onChange={e => handleFieldChange('restricciones_medicas', e.target.value)}
                rows={3}
                className="w-full bg-raised border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-600 resize-none"
              />
            ) : (
              <div className="text-sm text-foreground">{alumno.restricciones_medicas || <span className="text-zinc-500">—</span>}</div>
            )}
          </div>
        </div>
      </div>

      {/* Horario semanal fijo */}
      <div className="bg-surface border border-border rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest">Horario semanal fijo</div>
          {editando && (
            <button type="button" onClick={agregarHorario}
              className="text-xs text-pink-500 hover:text-pink-400 transition-colors font-medium">
              + Agregar día
            </button>
          )}
        </div>

        {(editando ? horForm : horarios).filter(h => !h._eliminar).length === 0 && !editando ? (
          <p className="text-sm text-zinc-500">Sin horarios asignados</p>
        ) : (
          <div className="space-y-2">
            {(editando ? horForm : horarios).map((h, idx) => (
              <div key={idx} className={`transition-opacity ${h._eliminar ? 'opacity-30' : ''}`}>
                {editando ? (
                  <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                    <select value={h.dia} disabled={h._eliminar}
                      onChange={e => setHorario(idx, 'dia', e.target.value)}
                      className="bg-raised border border-border text-foreground rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-pink-600 disabled:text-zinc-500">
                      {DIAS.map(d => <option key={d} value={d}>{DIAS_LABEL_LARGO[d]}</option>)}
                    </select>
                    <div className="flex gap-2 items-center">
                      <select value={h.hora?.slice(0,5) || ''} disabled={h._eliminar}
                        onChange={e => setHorario(idx, 'hora', e.target.value)}
                        className="flex-1 bg-raised border border-border text-foreground rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-pink-600 disabled:text-zinc-500">
                        {HORAS.map(ho => <option key={ho} value={ho}>{ho}</option>)}
                      </select>
                      <button type="button" onClick={() => marcarEliminar(idx)}
                        className="sm:hidden w-7 h-7 flex items-center justify-center rounded-lg text-sm shrink-0 text-zinc-600 hover:text-pink-400">
                        {h._eliminar ? '↩' : '✕'}
                      </button>
                    </div>
                    <select value={h.tipo} disabled={h._eliminar}
                      onChange={e => setHorario(idx, 'tipo', e.target.value)}
                      className="col-span-2 sm:col-span-1 bg-raised border border-border text-foreground rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-pink-600 disabled:text-zinc-500">
                      <option value="personalizado">Personalizado</option>
                      <option value="semipersonalizado">Semi Personalizado</option>
                    </select>
                    <button type="button" onClick={() => marcarEliminar(idx)}
                      className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg text-sm transition-all text-zinc-600 hover:text-pink-400 hover:bg-pink-900/20"
                      title={h._eliminar ? 'Restaurar' : 'Eliminar'}>
                      {h._eliminar ? '↩' : '✕'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-2 border-b border-border last:border-b-0">
                    <span className="text-sm font-medium text-foreground capitalize w-24 shrink-0">{h.dia}</span>
                    <span className="text-sm font-bold text-pink-500 w-14 shrink-0">{h.hora?.slice(0,5)}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      h.tipo === 'personalizado'
                        ? 'bg-purple-500/10 text-purple-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {h.tipo === 'personalizado' ? 'Personalizado' : 'Semi'}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de rutinas */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-zinc-500 uppercase tracking-widest">Historial de rutinas</div>
          <span className="text-xs text-zinc-600">{sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''}</span>
        </div>
        <HistorialRutinas sesiones={sesiones} />
      </div>

    </div>
  )
}
