create extension if not exists pgcrypto;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_he text not null,
  short_name_he text,
  accent_color text not null default '#FFFFFF',
  crest_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9_.]{3,24}$'),
  display_name text not null,
  avatar_url text,
  birth_date date,
  favorite_club_id uuid references public.clubs(id),
  fan_since_year int,
  last_club_change_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (id uuid primary key default gen_random_uuid(), key text unique not null, name_he text not null);
create table public.permissions (id uuid primary key default gen_random_uuid(), key text unique not null, description text);
create table public.role_permissions (role_id uuid references public.roles on delete cascade, permission_id uuid references public.permissions on delete cascade, primary key(role_id,permission_id));
create table public.staff_memberships (
 id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade,
 role_id uuid references public.roles(id), approval_level int not null default 1 check(approval_level between 1 and 4),
 public_badge text, suspended_at timestamptz, unique(user_id,role_id)
);
create table public.staff_club_scopes (membership_id uuid references public.staff_memberships(id) on delete cascade, club_id uuid references public.clubs(id) on delete cascade, primary key(membership_id,club_id));

create table public.audit_log (
 id bigint generated always as identity primary key, actor_id uuid references public.profiles(id),
 action text not null, entity_type text not null, entity_id text, club_id uuid references public.clubs(id),
 before_data jsonb, after_data jsonb, created_at timestamptz not null default now()
);

alter table public.clubs enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;
create policy "clubs readable" on public.clubs for select using (active = true);
create policy "profiles own read" on public.profiles for select using (auth.uid() = id);
create policy "profiles own update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

insert into public.clubs(slug,name_he,short_name_he,accent_color) values
('hapoel-beer-sheva','הפועל באר שבע','ב״ש','#E31E24'),
('maccabi-tel-aviv','מכבי תל אביב','מכבי ת״א','#F7D117'),
('maccabi-haifa','מכבי חיפה','מכבי חיפה','#19A34A'),
('beitar-jerusalem','בית״ר ירושלים','בית״ר','#F4D51C'),
('hapoel-tel-aviv','הפועל תל אביב','הפועל ת״א','#E11B22'),
('maccabi-netanya','מכבי נתניה','נתניה','#F1D21A'),
('hapoel-haifa','הפועל חיפה','הפועל חיפה','#E4232A'),
('hapoel-jerusalem','הפועל ירושלים','הפועל י-ם','#D9272E'),
('bnei-sakhnin','בני סכנין','סכנין','#E61E2A'),
('hapoel-petah-tikva','הפועל פתח תקווה','הפועל פ״ת','#1B66B1');
