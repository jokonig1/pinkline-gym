'use client'
import { useState, useEffect, useRef } from 'react'
import { cargarCatalogo, getCatalogoActual, suscribirCatalogo } from './ejerciciosCatalogo'

function normalizar(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function ExercisePicker({ value, onChange, placeholder = 'Nombre del ejercicio', className }) {
  const [catalogo, setCatalogo] = useState(getCatalogoActual())
  const [abierto,  setAbierto]  = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    cargarCatalogo().then(setCatalogo)
    return suscribirCatalogo(setCatalogo)
  }, [])

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const busqueda = value.trim()
  const sugerencias = busqueda
    ? catalogo.filter(e => normalizar(e.nombre).includes(normalizar(busqueda))).slice(0, 8)
    : []
  const esNuevo = busqueda.length > 1 && !catalogo.some(e => normalizar(e.nombre) === normalizar(busqueda))

  return (
    <div ref={wrapRef} className="relative flex-1 min-w-0">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setAbierto(true) }}
        onFocus={() => setAbierto(true)}
        placeholder={placeholder}
        className={`w-full ${className || ''}`}
      />
      {abierto && busqueda && (sugerencias.length > 0 || esNuevo) && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg divide-y divide-border">
          {sugerencias.map(ej => (
            <button
              key={ej.id}
              type="button"
              onClick={() => { onChange(ej.nombre); setAbierto(false) }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-hover transition-colors"
            >
              {ej.nombre}
            </button>
          ))}
          {esNuevo && (
            <div className="px-3 py-2 text-[11px] text-zinc-500 italic">
              "{busqueda}" se guardará como ejercicio nuevo
            </div>
          )}
        </div>
      )}
    </div>
  )
}
