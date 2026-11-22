create extension if not exists pgcrypto;

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  set_name text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists one_active_competition
  on public.competitions (active) where active = true;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  puuid text not null unique,
  game_name text not null,
  tag_line text not null,
  platform text not null default 'euw1',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.competition_players (
  competition_id uuid not null references public.competitions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (competition_id, player_id)
);

create table if not exists public.rank_snapshots (
  id bigint generated always as identity primary key,
  player_id uuid not null references public.players(id) on delete cascade,
  competition_id uuid not null references public.competitions(id) on delete cascade,
  tier text not null,
  division text,
  league_points integer not null check (league_points >= 0),
  wins integer not null default 0,
  losses integer not null default 0,
  fetched_at timestamptz not null default now()
);

create index if not exists rank_snapshots_latest_idx
  on public.rank_snapshots (competition_id, player_id, fetched_at desc);

create or replace view public.leaderboard_current as
select distinct on (rp.competition_id, rp.player_id)
  rp.competition_id,
  p.id as player_id,
  p.game_name,
  p.tag_line,
  rp.tier,
  rp.division,
  rp.league_points,
  rp.wins,
  rp.losses,
  rp.fetched_at
from public.rank_snapshots rp
join public.players p on p.id = rp.player_id
join public.competition_players cp
  on cp.player_id = rp.player_id and cp.competition_id = rp.competition_id
where p.active = true
order by rp.competition_id, rp.player_id, rp.fetched_at desc;

-- Private MVP: all reads/writes happen through server routes using the service-role key.
-- Do not expose SUPABASE_SERVICE_ROLE_KEY to the browser.
alter table public.competitions enable row level security;
alter table public.players enable row level security;
alter table public.competition_players enable row level security;
alter table public.rank_snapshots enable row level security;

insert into public.competitions (name, set_name, starts_at, active)
values ('TFT Friends Ladder', 'Set 19', now(), true)
on conflict do nothing;
