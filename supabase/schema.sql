-- Draft Era: Supabase schema
-- Run this in the Supabase SQL Editor for your project

-- ─── Profiles ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ─── Games ────────────────────────────────────────────────────────────────
create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade not null,
  game_mode   text not null,          -- '1p' | '2p' | 'contest'
  gm1_name    text,
  gm2_name    text,
  gm1_wins    int,
  gm2_wins    int,
  gm1_lineup  jsonb,                  -- { PG: {...}, SG: {...}, … }
  gm2_lineup  jsonb,
  winner      text,                   -- 'gm1' | 'gm2' | 'tie'
  created_at  timestamptz default now()
);

alter table public.games enable row level security;

create policy "Users can insert their own games"
  on public.games for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own games"
  on public.games for select
  using (auth.uid() = user_id);
