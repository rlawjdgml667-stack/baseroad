-- =============================================
-- 베이스로드 Supabase DB 세팅 SQL
-- Supabase → SQL Editor에서 전체 복붙 후 실행
-- =============================================

-- 1. profiles (회원 정보)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text,
  role text default 'player', -- player | parent | coach | admin
  status text default 'active', -- active | pending | suspended | rejected
  school_name text,
  phone text,
  created_at timestamptz default now()
);

-- 회원가입 시 자동으로 profiles 생성하는 트리거
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. schools (학교 정보)
create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  coach_user_id uuid references auth.users on delete set null,
  name text not null,
  region text,
  level text, -- little | elementary | middle | high | college
  address text,
  contact_phone text,
  contact_email text,
  director_name text,
  monthly_fee text,
  founded_year int,
  history text,
  youtube_url text,
  has_stadium boolean default false,
  has_indoor boolean default false,
  has_weight boolean default false,
  has_dormitory boolean default false,
  has_pitching_machine boolean default false,
  has_trainer boolean default false,
  bullpen_count int default 0,
  main_image_url text,
  director_photo_url text,
  coaches jsonb default '[]',
  notable_players jsonb default '[]',
  facility_images jsonb default '[]',
  status text default 'active',
  created_at timestamptz default now()
);

-- 3. players (선수 정보)
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text,
  birth_year int,
  position text, -- 투수 | 포수 | 내야수 | 외야수
  dominant_hand text,
  intro text,
  height int,
  weight int,
  highlight_url text,
  profile_image_url text,
  school_id uuid references schools on delete set null,
  school_name_text text,
  stats_verified boolean default false,
  status text default 'active',
  physical_records jsonb default '[]',
  created_at timestamptz default now()
);

-- 3-1. 기존에 이미 players 테이블이 있는 경우 컬럼만 추가
alter table players add column if not exists physical_records jsonb default '[]';

-- 4. player_season_stats (시즌 기록)
create table if not exists player_season_stats (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players on delete cascade,
  season int not null,
  raw_stats jsonb default '{}',
  computed_stats jsonb default '{}',
  stats_verified boolean default false,
  verified_by uuid references auth.users on delete set null,
  verified_at timestamptz,
  created_at timestamptz default now(),
  unique(player_id, season)
);

-- 5. school_connection_requests (학교 연결 요청)
create table if not exists school_connection_requests (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players on delete cascade,
  school_id uuid references schools on delete cascade,
  status text default 'pending', -- pending | approved | rejected | removed
  created_at timestamptz default now()
);

-- 6. notifications (알림)
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  type text,
  message text,
  link text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- 7. favorites (즐겨찾기)
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  target_id uuid not null,
  target_type text not null, -- school | player
  created_at timestamptz default now(),
  unique(user_id, target_id, target_type)
);

-- 8. posts (커뮤니티 게시글)
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  title text not null,
  content text,
  category text default '자유', -- 공지 | 자유 | 질문 | 정보공유 | 진학상담
  school_id uuid references schools on delete set null,
  view_count int default 0,
  created_at timestamptz default now()
);

-- 9. comments (댓글)
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts on delete cascade,
  user_id uuid references auth.users on delete set null,
  content text not null,
  created_at timestamptz default now()
);

-- 10. inquiries (문의)
create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  role text,
  message text,
  is_read boolean default false,
  admin_reply text,
  created_at timestamptz default now()
);

-- =============================================
-- RLS (Row Level Security) 설정
-- =============================================

-- profiles
alter table profiles enable row level security;
create policy "누구나 프로필 조회 가능" on profiles for select using (true);
create policy "본인 프로필만 수정" on profiles for update using (auth.uid() = id);
create policy "서비스롤만 삽입" on profiles for insert with check (auth.uid() = id);

-- schools
alter table schools enable row level security;
create policy "누구나 학교 조회" on schools for select using (true);
create policy "감독만 본인 학교 수정" on schools for update using (auth.uid() = coach_user_id);
create policy "감독만 학교 등록" on schools for insert with check (auth.uid() = coach_user_id);

-- players
alter table players enable row level security;
create policy "누구나 선수 조회" on players for select using (true);
create policy "본인만 수정" on players for update using (auth.uid() = user_id);
create policy "로그인 후 등록" on players for insert with check (auth.uid() = user_id);

-- player_season_stats
alter table player_season_stats enable row level security;
create policy "누구나 기록 조회" on player_season_stats for select using (true);
create policy "본인 기록만 수정" on player_season_stats for update using (
  exists (select 1 from players where id = player_id and user_id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role in ('coach','admin'))
);
create policy "본인만 기록 등록" on player_season_stats for insert with check (
  exists (select 1 from players where id = player_id and user_id = auth.uid())
);

-- school_connection_requests
alter table school_connection_requests enable row level security;
create policy "관계자만 조회" on school_connection_requests for select using (
  exists (select 1 from players where id = player_id and user_id = auth.uid())
  or exists (select 1 from schools where id = school_id and coach_user_id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "선수만 신청" on school_connection_requests for insert with check (
  exists (select 1 from players where id = player_id and user_id = auth.uid())
);
create policy "감독/어드민 승인" on school_connection_requests for update using (
  exists (select 1 from schools where id = school_id and coach_user_id = auth.uid())
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "본인 요청 삭제" on school_connection_requests for delete using (
  exists (select 1 from players where id = player_id and user_id = auth.uid())
);

-- notifications
alter table notifications enable row level security;
create policy "본인 알림만 조회" on notifications for select using (auth.uid() = user_id);
create policy "로그인 후 알림 생성" on notifications for insert with check (auth.role() = 'authenticated');
create policy "본인 알림 업데이트" on notifications for update using (auth.uid() = user_id);

-- favorites
alter table favorites enable row level security;
create policy "본인 즐겨찾기 조회" on favorites for select using (auth.uid() = user_id);
create policy "로그인 후 추가" on favorites for insert with check (auth.uid() = user_id);
create policy "본인것만 삭제" on favorites for delete using (auth.uid() = user_id);

-- posts
alter table posts enable row level security;
create policy "누구나 게시글 조회" on posts for select using (true);
create policy "로그인 후 작성" on posts for insert with check (auth.uid() = user_id);
create policy "본인/어드민 수정" on posts for update using (
  auth.uid() = user_id
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "본인/어드민 삭제" on posts for delete using (
  auth.uid() = user_id
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- comments
alter table comments enable row level security;
create policy "누구나 댓글 조회" on comments for select using (true);
create policy "로그인 후 댓글 작성" on comments for insert with check (auth.uid() = user_id);
create policy "본인/어드민 삭제" on comments for delete using (
  auth.uid() = user_id
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- inquiries
alter table inquiries enable row level security;
create policy "누구나 문의 작성" on inquiries for insert with check (true);
create policy "어드민만 조회" on inquiries for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "어드민만 수정(답변)" on inquiries for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
