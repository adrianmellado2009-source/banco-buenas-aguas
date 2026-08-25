# Banco Nacional de Buenas Aguas

Web de gestión bancaria que sustituye al bot de Discord económico de la comunidad
"República de Buenas Aguas". Proyecto **independiente** del portal principal de
worldbuilding: identidad visual propia (neobank, indigo/grises, tipografía Inter).

## Stack

- **Frontend:** React + Vite + Tailwind CSS, desplegado en Netlify.
- **Backend:** Supabase (Auth + Postgres + RLS + Edge Functions con `pg_cron`).

## Puesta en marcha

### 1. Backend (Supabase)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta las migraciones en orden desde el SQL Editor (o con la CLI de Supabase):
   - `supabase/migrations/0001_schema.sql` — tablas y tipos
   - `supabase/migrations/0002_rls.sql` — Row Level Security
   - `supabase/migrations/0003_functions.sql` — funciones RPC de negocio
3. Despliega las Edge Functions:
   ```bash
   supabase functions deploy daily-jobs
   supabase functions deploy crear-usuario
   ```
4. Configura las variables de entorno de las Edge Functions (`SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `CRON_SECRET`).
5. Programa `daily-jobs` con `pg_cron` (una vez al día), pasando el header
   `x-cron-secret` con el mismo valor que `CRON_SECRET`.
6. Crea manualmente el primer usuario `admin`: crea el usuario en
   Authentication → Users, y luego inserta su fila en `profiles` con
   `role = 'admin'` (usa la función `crear_perfil` desde el SQL Editor, o
   un `insert` directo).

### 2. Frontend

```bash
npm install
cp .env.example .env   # rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Para producción en Netlify:
```bash
npm run build
```
Sube la carpeta `dist/` o conecta el repo a Netlify (build command:
`npm run build`, publish directory: `dist`). Añade las variables de entorno
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Netlify.

## Seguridad

- Todo movimiento de saldo pasa por funciones RPC `SECURITY DEFINER` en
  Postgres (nunca updates directos desde el cliente).
- RLS activado en todas las tablas.
- La creación de usuarios usa la service role key solo del lado servidor
  (Edge Function `crear-usuario`), nunca en el frontend.
- Los saldos son `numeric(14,2)`, nunca `float`.

## Estructura

```
supabase/
  migrations/        esquema, RLS y funciones RPC
  functions/
    daily-jobs/       cron diario: impuestos recurrentes + interés de ahorro
    crear-usuario/     creación de usuarios (solo admin, service role key)
src/
  pages/              Dashboard, Transferir, Historial, Préstamos, Ahorro, Tarjeta, Perfil
  pages/admin/        Panel general, Usuarios, Impuestos, Préstamos, Configuración, Transacciones
  components/         Layout, BalanceCard, TransactionList, ProtectedRoute
  context/            AuthContext (sesión + perfil)
```

## Pendiente / a definir en negocio

- Bloqueo/desbloqueo de tarjeta desde la UI de usuario (hoy solo se ve el estado).
- Notificaciones de cuotas de préstamo próximas a vencer (mencionado como opcional
  en la especificación).
- Emisión de tarjetas nuevas desde el panel de admin (hoy se asume que ya existen
  filas en `cards`; se puede añadir un botón de "emitir tarjeta" fácilmente).
