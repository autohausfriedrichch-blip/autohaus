-- ============================================================
-- Document Center – documents table
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists documents (
  id              uuid primary key default gen_random_uuid(),

  -- Auto-generated readable ID
  doc_id          text unique not null default (
    'DOC-' || to_char(now(), 'YYYY') || '-' ||
    lpad(nextval('documents_seq')::text, 6, '0')
  ),

  -- Core metadata
  name            text not null,
  doc_type        text not null default 'other',
  category        text not null default 'other',
  description     text,
  file_url        text,
  file_type       text,
  file_size       bigint,
  version         integer not null default 1,
  notes           text,

  -- Source module (where was it created from)
  source_module   text, -- workorder | quote | checkin | checkout | vehicle | customer | pickup | manual

  -- Relation IDs (all optional)
  customer_id     uuid references customers(id) on delete set null,
  vehicle_id      uuid references vehicles(id) on delete set null,
  work_order_id   uuid references work_orders(id) on delete set null,
  quote_id        uuid,
  invoice_id      uuid,
  pickup_id       uuid,
  fleet_id        uuid,

  -- Audit
  uploaded_by     uuid references auth.users(id) on delete set null,
  uploaded_by_name text,
  needs_review    boolean default false,

  -- AI-ready fields
  ai_tags         text[] default '{}',
  ai_summary      text,
  ocr_text        text,

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Sequence for DOC-YYYY-NNNNNN
create sequence if not exists documents_seq start 1;

-- Updated_at trigger
create or replace function set_documents_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists documents_updated_at on documents;
create trigger documents_updated_at
  before update on documents
  for each row execute function set_documents_updated_at();

-- RLS
alter table documents disable row level security;

-- Indexes for fast search
create index if not exists documents_customer_id_idx  on documents(customer_id);
create index if not exists documents_vehicle_id_idx   on documents(vehicle_id);
create index if not exists documents_work_order_id_idx on documents(work_order_id);
create index if not exists documents_category_idx     on documents(category);
create index if not exists documents_doc_id_idx       on documents(doc_id);
