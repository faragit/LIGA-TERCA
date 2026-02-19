-- Liga da Terça - schema (Supabase / Postgres)
-- 1) Execute este script no SQL Editor do Supabase (uma vez).

create extension if not exists "uuid-ossp";

-- PROFILES (1-1 auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nick text unique not null,
  nome text not null,
  role text not null default 'jogador',
  elo int not null default 1000,
  created_at timestamptz not null default now()
);

create table if not exists public.seasons (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  dt_inicio date not null,
  dt_fim date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.mixes (
  id uuid primary key default uuid_generate_v4(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  dt_mix timestamptz not null,
  valor_por_jogador numeric(10,2) not null default 0,
  status text not null default 'agendado',
  created_at timestamptz not null default now()
);

create table if not exists public.maps (
  id uuid primary key default uuid_generate_v4(),
  nome text unique not null
);

create table if not exists public.mix_maps (
  mix_id uuid not null references public.mixes(id) on delete cascade,
  map_id uuid not null references public.maps(id) on delete cascade,
  ordem int not null default 1,
  primary key (mix_id, map_id)
);

create table if not exists public.mix_players (
  mix_id uuid not null references public.mixes(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  payment_status text not null default 'pendente',
  paid_value numeric(10,2) not null default 0,
  primary key (mix_id, player_id)
);

create table if not exists public.mix_player_map_stats (
  mix_id uuid not null references public.mixes(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  map_id uuid not null references public.maps(id) on delete cascade,
  kills int not null default 0,
  deaths int not null default 0,
  assists int not null default 0,
  mvps int not null default 0,
  primary key (mix_id, player_id, map_id)
);

create table if not exists public.mix_map_results (
  mix_id uuid not null references public.mixes(id) on delete cascade,
  map_id uuid not null references public.maps(id) on delete cascade,
  team_a_score int not null default 0,
  team_b_score int not null default 0,
  winner text not null default 'draw',
  created_at timestamptz not null default now(),
  primary key (mix_id, map_id)
);

create table if not exists public.mix_player_map_team (
  mix_id uuid not null references public.mixes(id) on delete cascade,
  map_id uuid not null references public.maps(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  team text not null,
  primary key (mix_id, map_id, player_id)
);

-- Seed mapas CS2 (edita à vontade)
insert into public.maps (nome) values
('Mirage'),('Inferno'),('Nuke'),('Ancient'),('Anubis'),('Vertigo'),('Overpass')
on conflict (nome) do nothing;

-- RLS (single-tenant: só usuários logados veem/alteram tudo)
alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.mixes enable row level security;
alter table public.maps enable row level security;
alter table public.mix_maps enable row level security;
alter table public.mix_players enable row level security;
alter table public.mix_player_map_stats enable row level security;
alter table public.mix_map_results enable row level security;
alter table public.mix_player_map_team enable row level security;

-- Policies: qualquer usuário autenticado pode ler/escrever.
-- (Se quiser travar admin-only depois, dá pra ajustar em 2 min.)
create policy "auth read profiles" on public.profiles for select to authenticated using (true);
create policy "auth write profiles" on public.profiles for insert to authenticated with check (true);
create policy "auth update profiles" on public.profiles for update to authenticated using (true) with check (true);

create policy "auth rw seasons" on public.seasons for all to authenticated using (true) with check (true);
create policy "auth rw mixes" on public.mixes for all to authenticated using (true) with check (true);
create policy "auth rw maps" on public.maps for all to authenticated using (true) with check (true);
create policy "auth rw mix_maps" on public.mix_maps for all to authenticated using (true) with check (true);
create policy "auth rw mix_players" on public.mix_players for all to authenticated using (true) with check (true);
create policy "auth rw stats" on public.mix_player_map_stats for all to authenticated using (true) with check (true);
create policy "auth rw results" on public.mix_map_results for all to authenticated using (true) with check (true);
create policy "auth rw teams" on public.mix_player_map_team for all to authenticated using (true) with check (true);
