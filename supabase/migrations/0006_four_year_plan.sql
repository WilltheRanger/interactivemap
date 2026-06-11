-- Phase 3 Chunk 1: reference data for the 4-year plan / credit tracker.
-- Personal plans live ONLY in localStorage (privacy model unchanged). These two tables are
-- non-personal reference data, read-only to the app — same RLS shape as every other table.

create table if not exists graduation_requirements (
  id uuid primary key default gen_random_uuid(),
  pathway text not null,          -- 'graduation' | 'uc' | 'brahma_tech'
  subject_area text not null,     -- e.g. 'English', 'Mathematics', 'Science'
  credits_required numeric not null,
  notes text,                     -- e.g. 'UC a-g: 3 years required, 4 recommended'
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject_area text not null,
  credits numeric not null,
  satisfies_uc boolean not null default false,
  satisfies_brahma_tech boolean not null default false,
  grade_levels int[],             -- e.g. [9,10] = available to freshmen and sophomores
  created_at timestamptz not null default now()
);

create index if not exists courses_subject_area_idx on courses (subject_area);
create index if not exists grad_req_pathway_idx on graduation_requirements (pathway);

alter table graduation_requirements enable row level security;
alter table courses enable row level security;

create policy "read graduation_requirements" on graduation_requirements for select using (true);
create policy "read courses" on courses for select using (true);
