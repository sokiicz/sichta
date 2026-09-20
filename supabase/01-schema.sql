-- Šichta — schéma. Spustit jako první v SQL editoru Supabase.
--
-- Zásada: klient nečte nic přímo. Všechno jde přes RPC get_my_view, která na
-- serveru spočítá, co ten konkrétní hráč smí vidět. Proto jsou tabulky zamčené
-- úplně a RLS nikomu nic nepovoluje. Viz docs/design.md §7.1.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- místnosti

create table if not exists rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_token    text not null,
  status        text not null default 'satna'
                  check (status in ('satna', 'hra', 'konec')),
  -- celý herní stav, tvaru Stav z src/game/types.ts
  state         jsonb not null default '{}'::jsonb,
  seed          bigint not null default floor(random() * 2147483647),
  phase         text not null default 'satna',
  round_no      int  not null default 0,
  phase_ends_at timestamptz,
  paused_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists rooms_code_idx on rooms (code);
-- místnosti starší než den se uklízejí, viz 03-cleanup.sql
create index if not exists rooms_updated_idx on rooms (updated_at);

-- ---------------------------------------------------------------- hráči

create table if not exists players (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references rooms(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 12),
  seat         int  not null,
  -- tajemství, které klient posílá místo přihlášení. Nikdy neopouští server
  -- jinak než při vzniku hráče.
  client_token text not null,
  is_host      boolean not null default false,
  alive        boolean not null default true,
  ghost_used   boolean not null default false,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (room_id, seat),
  unique (room_id, client_token)
);

create index if not exists players_room_idx on players (room_id);

-- ---------------------------------------------------------------- role

-- Oddělená tabulka schválně: ať se role nedostane do stejného řádku, jako
-- se posílá klientovi. Čte ji jen get_my_view.
create table if not exists roles (
  room_id    uuid not null references rooms(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  role       text not null check (role in ('pracant', 'saboter')),
  is_foreman boolean not null default false,
  primary key (room_id, player_id)
);

-- ---------------------------------------------------------------- akce

create table if not exists actions (
  id        bigserial primary key,
  room_id   uuid not null references rooms(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  round_no  int not null,
  phase     text not null,
  kind      text not null
              check (kind in ('shift_vote', 'nomination', 'council_vote',
                              'reward', 'night_proposal', 'foreman_decision',
                              'suspicion', 'ready')),
  payload   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- jeden hráč, jedno kolo, jeden druh akce: druhý pokus přepíše první
  unique (room_id, round_no, player_id, kind)
);

create index if not exists actions_room_round_idx on actions (room_id, round_no);

-- ---------------------------------------------------------------- RLS

-- Všechno zamčené. Anon klíč nesmí sám o sobě přečíst ani řádek.
-- Přístup dávají výhradně SECURITY DEFINER funkce z 02-functions.sql.
alter table rooms   enable row level security;
alter table players enable row level security;
alter table roles   enable row level security;
alter table actions enable row level security;

revoke all on rooms, players, roles, actions from anon, authenticated;

-- Realtime posílá jen upozornění "něco se změnilo", žádná data.
-- Klient si pak sám zavolá get_my_view.
alter publication supabase_realtime add table rooms;
