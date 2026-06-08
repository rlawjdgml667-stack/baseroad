-- =============================================
-- BaseRoad (베이스로드) Database Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES
-- =============================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text,
  role text not null check (role in ('admin','coach','player','parent')),
  status text not null default 'active' check (status in ('active','pending','rejected')),
  school_name text,
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Public profiles read" on profiles for select using (true);
create policy "User update own profile" on profiles for update using (auth.uid() = id);
create policy "User insert own profile" on profiles for insert with check (auth.uid() = id);

-- =============================================
-- SCHOOLS
-- =============================================
create table if not exists schools (
  id uuid primary key default uuid_generate_v4(),
  coach_user_id uuid references profiles(id) on delete set null,
  name text not null,
  region text not null,
  level text not null check (level in ('elementary','middle','high','college')),
  address text,
  contact_phone text,
  contact_email text,
  director_name text,
  director_photo_url text,
  monthly_fee text,
  founded_year int,
  history text,
  youtube_url text,
  main_image_url text,
  facility_images jsonb default '[]',
  coaches jsonb default '[]',
  notable_players jsonb default '[]',
  has_stadium boolean default false,
  has_indoor boolean default false,
  has_weight boolean default false,
  has_dormitory boolean default false,
  has_pitching_machine boolean default false,
  has_trainer boolean default false,
  bullpen_count int default 0,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table schools enable row level security;
create policy "Public schools read" on schools for select using (true);
create policy "Coach insert school" on schools for insert with check (auth.uid() = coach_user_id);
create policy "Coach update school" on schools for update using (auth.uid() = coach_user_id);
create policy "Admin all schools" on schools for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- PLAYERS
-- =============================================
create table if not exists players (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  school_id uuid references schools(id) on delete set null,
  name text not null,
  birth_year int,
  position text check (position in ('투수','포수','내야수','외야수')),
  dominant_hand text,
  height numeric,
  weight numeric,
  intro text,
  profile_image_url text,
  play_images jsonb default '[]',
  highlight_url text,
  stats jsonb default '{}',
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table players enable row level security;
create policy "Public players read" on players for select using (true);
create policy "Player insert own" on players for insert with check (auth.uid() = user_id);
create policy "Player update own" on players for update using (auth.uid() = user_id);
create policy "Admin all players" on players for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- FAVORITES
-- =============================================
create table if not exists favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  target_type text not null check (target_type in ('school','player')),
  target_id uuid not null,
  created_at timestamptz default now(),
  unique(user_id, target_type, target_id)
);

alter table favorites enable row level security;
create policy "User CRUD own favorites" on favorites for all using (auth.uid() = user_id);

-- =============================================
-- QNA
-- =============================================
create table if not exists qna (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  school_id uuid references schools(id) on delete cascade not null,
  question text not null,
  answer text,
  answered_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table qna enable row level security;
create policy "Public qna read" on qna for select using (true);
create policy "User insert qna" on qna for insert with check (auth.uid() = user_id);
create policy "Coach answer qna" on qna for update using (
  exists (select 1 from schools where id = school_id and coach_user_id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin delete qna" on qna for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- STORAGE BUCKETS (run in Supabase dashboard or CLI)
-- =============================================
-- insert into storage.buckets (id, name, public) values ('school-images', 'school-images', true);
-- insert into storage.buckets (id, name, public) values ('player-images', 'player-images', true);
-- create policy "Public read" on storage.objects for select using (bucket_id in ('school-images','player-images'));
-- create policy "Auth upload" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id in ('school-images','player-images'));

-- =============================================
-- TRIGGER: update updated_at
-- =============================================
create or replace function set_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger schools_updated_at before update on schools for each row execute function set_updated_at();
create trigger players_updated_at before update on players for each row execute function set_updated_at();
create trigger qna_updated_at before update on qna for each row execute function set_updated_at();
