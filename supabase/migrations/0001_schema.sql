-- ============================================================
-- Banco Nacional de Buenas Aguas — 0001_schema.sql
-- Tipos y tablas base
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Tipos ----------
do $$ begin
  create type user_role as enum ('usuario', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_type as enum (
    'transferencia', 'salario', 'impuesto',
    'prestamo_desembolso', 'prestamo_cuota',
    'interes_ahorro', 'ajuste_manual'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type loan_status as enum ('pendiente', 'activo', 'pagado', 'rechazado', 'impagado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tax_kind as enum ('recurrente', 'puntual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tax_mode as enum ('porcentaje', 'fijo');
exception when duplicate_object then null; end $$;

-- ---------- Perfiles (extiende auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  account_number text unique not null,
  full_name text not null,
  role user_role not null default 'usuario',
  balance numeric(14,2) not null default 0,
  savings_balance numeric(14,2) not null default 0,
  salary_amount numeric(14,2) not null default 0,
  salary_frequency_days int not null default 7,
  last_salary_collected_at timestamptz,
  transfer_limit_per_tx numeric(14,2),
  transfer_limit_daily numeric(14,2),
  status text not null default 'activa', -- 'activa' | 'congelada'
  created_at timestamptz not null default now()
);

-- ---------- Transacciones (histórico inmutable) ----------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  from_account uuid references profiles(id),
  to_account uuid references profiles(id),
  amount numeric(14,2) not null,
  type transaction_type not null,
  description text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_transactions_from on transactions(from_account);
create index if not exists idx_transactions_to on transactions(to_account);
create index if not exists idx_transactions_created_at on transactions(created_at desc);

-- ---------- Impuestos ----------
create table if not exists taxes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind tax_kind not null,
  mode tax_mode not null,
  value numeric(14,2) not null,
  frequency_days int,
  target text not null default 'todos', -- 'todos' | 'seleccionados'
  target_accounts uuid[],
  active boolean not null default true,
  last_applied_at timestamptz,
  created_at timestamptz not null default now(),
  constraint chk_recurrente_frequency check (
    (kind = 'recurrente' and frequency_days is not null) or (kind = 'puntual')
  )
);

-- ---------- Préstamos ----------
create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references profiles(id) not null,
  principal numeric(14,2) not null,
  interest_rate numeric(5,2) not null,
  installments int not null default 1,
  installment_amount numeric(14,2),
  remaining_balance numeric(14,2) not null,
  status loan_status not null default 'pendiente',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  next_due_at timestamptz
);
create index if not exists idx_loans_account on loans(account_id);

create table if not exists loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references loans(id) not null,
  amount numeric(14,2) not null,
  paid_at timestamptz not null default now()
);

-- ---------- Configuración global de ahorro ----------
create table if not exists savings_config (
  id int primary key default 1,
  interest_rate numeric(5,2) not null default 1.0,
  frequency_days int not null default 7,
  active boolean not null default true,
  last_applied_at timestamptz,
  check (id = 1)
);
insert into savings_config (id) values (1) on conflict (id) do nothing;

-- ---------- Configuración global de límites por defecto ----------
create table if not exists app_config (
  id int primary key default 1,
  default_transfer_limit_per_tx numeric(14,2) not null default 5000,
  default_transfer_limit_daily numeric(14,2) not null default 20000,
  check (id = 1)
);
insert into app_config (id) values (1) on conflict (id) do nothing;

-- ---------- Tarjetas (representación virtual) ----------
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references profiles(id) not null,
  card_number text unique not null,
  status text not null default 'activa', -- 'activa' | 'bloqueada'
  created_at timestamptz not null default now()
);
create index if not exists idx_cards_account on cards(account_id);
