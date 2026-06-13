-- Founder Brain: personal idea & business development hub
-- Only accessible to super_admin (owner)

create table if not exists founder_ideas (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  short_desc   text,
  description  text,
  category     text not null default 'Egyéb',
  priority     text not null default 'Közepes', -- Alacsony | Közepes | Magas | Kritikus
  status       text not null default 'Ötlet',   -- Ötlet | Kutatás alatt | Tervezett | Fejlesztés alatt | Tesztelés alatt | Megvalósítva | Elvetve
  tags         text[] default '{}',
  archived     boolean default false,
  task_id      uuid references tasks(id) on delete set null, -- linked task if converted
  ai_notes     jsonb,  -- future AI metadata
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- RLS disabled (owner-only access enforced in app layer)
alter table founder_ideas disable row level security;

-- Updated_at trigger
create or replace function set_founder_ideas_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists founder_ideas_updated_at on founder_ideas;
create trigger founder_ideas_updated_at
  before update on founder_ideas
  for each row execute function set_founder_ideas_updated_at();
