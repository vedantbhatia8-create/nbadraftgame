-- Admin additions — run this in Supabase SQL Editor AFTER schema.sql

-- Add banned column to profiles
alter table public.profiles add column if not exists is_banned boolean default false;

-- Allow admin to read ALL profiles (other users only see their own)
drop policy if exists "Admin can read all profiles" on public.profiles;
create policy "Admin can read all profiles"
  on public.profiles for select
  using (
    auth.jwt() ->> 'email' = 'vedantbhatia8@gmail.com'
    OR auth.uid() = id
  );

-- Allow admin to update any profile (for banning)
drop policy if exists "Admin can update any profile" on public.profiles;
create policy "Admin can update any profile"
  on public.profiles for update
  using (auth.jwt() ->> 'email' = 'vedantbhatia8@gmail.com');

-- Allow admin to read ALL games
drop policy if exists "Admin can read all games" on public.games;
create policy "Admin can read all games"
  on public.games for select
  using (
    auth.jwt() ->> 'email' = 'vedantbhatia8@gmail.com'
    OR auth.uid() = user_id
  );
