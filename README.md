# Redline Gym — Sistema de gestión integral

Aplicación web para la administración de un gimnasio. Permite gestionar alumnos, coaches, horarios, asistencias, rutinas y métricas operativas.

---

## Tecnologías

- **Next.js 16** (App Router)
- **Supabase** (base de datos PostgreSQL + autenticación)
- **Tailwind CSS 4**
- **React 19**

---

## Roles del sistema

| Rol | Acceso |
|---|---|
| `admin` | Panel completo: alumnos, coaches, horarios, métricas. También funciona como coach. |
| `coach` | Sus alumnos, sus horarios, registro de rutinas y asistencias. |
| `alumno` | Su progreso personal, historial de sesiones. |

---

## Requisitos previos

- Node.js 18 o superior
- Cuenta en [Supabase](https://supabase.com) con un proyecto creado

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/jokonig1/Redline-gym.git
cd Redline-gym
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Variables de entorno

Crear un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

Las encontrás en **Supabase Dashboard → Settings → API**.




### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

