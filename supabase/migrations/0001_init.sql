-- DBHS Wayfinder — reference schema (non-personal, read-only to the app).
-- Building ids MUST match the SVG building shape ids (hard rule). Resolution of a class location
-- is by teacher/room; master_schedule is a pickers data source only, never the join key.

create table if not exists buildings (
  id text primary key,
  label text not null,
  level int not null default 0,
  geometry jsonb,
  created_at timestamptz not null default now()
);

create table if not exists teachers (
  id text primary key,
  name text not null,
  home_room_id text, -- FK to rooms added below (circular teachers <-> rooms)
  created_at timestamptz not null default now()
);

create table if not exists rooms (
  id text primary key,
  building_id text not null references buildings (id),
  label text,
  teacher_id text references teachers (id),
  created_at timestamptz not null default now()
);

-- Resolve the circular teachers.home_room_id -> rooms.id now that rooms exists.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'teachers_home_room_id_fkey') then
    alter table teachers
      add constraint teachers_home_room_id_fkey foreign key (home_room_id) references rooms (id);
  end if;
end $$;

create table if not exists master_schedule (
  id text primary key,
  course text not null,
  period text not null,
  room_id text references rooms (id),
  teacher_id text references teachers (id),
  created_at timestamptz not null default now()
);

create table if not exists panoramas (
  id text primary key,
  image_url text not null,
  label text,
  initial_yaw double precision,
  initial_pitch double precision,
  hfov double precision,
  created_at timestamptz not null default now()
);

create table if not exists locker_sections (
  id text primary key,
  building_id text references buildings (id),
  panorama_id text references panoramas (id),
  number_start int not null,
  number_end int not null,
  map_coord jsonb,
  label text,
  created_at timestamptz not null default now(),
  constraint locker_sections_range_chk check (number_end >= number_start)
);

create table if not exists lockers (
  id text primary key,
  section_id text not null references locker_sections (id),
  number int,
  hotspot_yaw double precision,
  hotspot_pitch double precision,
  created_at timestamptz not null default now()
);

create index if not exists rooms_building_id_idx on rooms (building_id);
create index if not exists rooms_teacher_id_idx on rooms (teacher_id);
create index if not exists master_schedule_period_idx on master_schedule (period);
create index if not exists master_schedule_course_idx on master_schedule (course);
create index if not exists locker_sections_range_idx on locker_sections (number_start, number_end);
create index if not exists lockers_section_id_idx on lockers (section_id);
