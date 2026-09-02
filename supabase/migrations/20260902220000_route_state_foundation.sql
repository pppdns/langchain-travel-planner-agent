-- Route State foundation: schemas, RLS, RAG, spend ledger, checkpoints, retention.

revoke all on function public.rls_auto_enable() from public;
revoke all on function public.rls_auto_enable() from anon, authenticated;

create extension if not exists vector with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists rag;
create schema if not exists internal;
create schema if not exists langgraph;
create schema if not exists ops;

revoke all on schema rag from public, anon, authenticated;
revoke all on schema internal from public, anon, authenticated;
revoke all on schema langgraph from public, anon, authenticated;
revoke all on schema ops from public, anon, authenticated;

grant usage on schema rag to postgres, service_role;
grant usage on schema internal to postgres, service_role;
grant usage on schema langgraph to postgres, service_role;
grant usage on schema ops to postgres, service_role;

-- Public owner-bound projections
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled trip',
  status text not null default 'active' check (status in ('active', 'completed', 'expired')),
  mode text not null default 'live' check (mode in ('live', 'replay', 'fake')),
  public_state jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index trips_user_id_idx on public.trips (user_id);
create index trips_expires_at_idx on public.trips (expires_at);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index messages_trip_id_idx on public.messages (trip_id, created_at);

create table public.preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete cascade,
  key text not null,
  value text not null,
  confirmed boolean not null default false,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  unique (user_id, trip_id, key)
);

create index preferences_user_id_idx on public.preferences (user_id);

create table public.trip_images (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 2097152),
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create index trip_images_trip_id_idx on public.trip_images (trip_id);

alter table public.trips enable row level security;
alter table public.messages enable row level security;
alter table public.preferences enable row level security;
alter table public.trip_images enable row level security;
alter table public.trips force row level security;
alter table public.messages force row level security;
alter table public.preferences force row level security;
alter table public.trip_images force row level security;

create policy trips_select_own on public.trips
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy trips_insert_own on public.trips
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy trips_update_own on public.trips
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy messages_select_own on public.messages
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy preferences_select_own on public.preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy preferences_update_own on public.preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy preferences_delete_own on public.preferences
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy trip_images_select_own on public.trip_images
  for select to authenticated
  using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on public.trips to authenticated;
grant select on public.messages to authenticated;
grant select, update, delete on public.preferences to authenticated;
grant select on public.trip_images to authenticated;
grant all on public.trips, public.messages, public.preferences, public.trip_images to service_role;

-- RAG
create table rag.destinations (
  slug text primary key,
  name text not null,
  country text not null,
  region text not null,
  traits jsonb not null default '{}'::jsonb,
  summary text not null,
  published boolean not null default true
);

create table rag.documents (
  id text primary key,
  destination_slug text not null references rag.destinations (slug) on delete cascade,
  title text not null,
  category text not null,
  language text not null default 'en',
  source_type text not null check (source_type in ('synthetic', 'wikivoyage', 'official')),
  body text not null,
  content_hash text not null,
  published boolean not null default true,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index documents_destination_idx on rag.documents (destination_slug, category);

create table rag.chunks (
  id text primary key,
  document_id text not null references rag.documents (id) on delete cascade,
  destination_slug text not null references rag.destinations (slug) on delete cascade,
  category text not null,
  language text not null default 'en',
  title text not null,
  body text not null,
  content_hash text not null,
  tsv tsvector generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))) stored,
  embedding extensions.vector(1536),
  published boolean not null default true
);

create index chunks_destination_idx on rag.chunks (destination_slug, category) where published;
create index chunks_tsv_idx on rag.chunks using gin (tsv);
create index chunks_embedding_hnsw_idx on rag.chunks
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create table rag.ingestion_manifest (
  content_hash text primary key,
  document_id text not null,
  embedding_model text,
  generated_at timestamptz not null default now()
);

create or replace function rag.search_chunks(
  query_text text,
  query_embedding extensions.vector(1536) default null,
  destination_filter text default null,
  category_filter text default null,
  language_filter text default 'en',
  match_count integer default 8
)
returns table (
  id text,
  document_id text,
  destination_slug text,
  category text,
  title text,
  source_excerpt text,
  source_type text,
  lexical_rank real,
  vector_rank real,
  rrf real
)
language sql
stable
security definer
set search_path = rag, public, extensions
as $$
  with lexical as (
    select
      c.id,
      c.document_id,
      c.destination_slug,
      c.category,
      c.title,
      left(c.body, 240) as source_excerpt,
      d.source_type,
      ts_rank_cd(c.tsv, websearch_to_tsquery('simple', query_text)) as lexical_rank
    from rag.chunks c
    join rag.documents d on d.id = c.document_id
    where c.published
      and d.published
      and (destination_filter is null or c.destination_slug = destination_filter)
      and (category_filter is null or c.category = category_filter)
      and (language_filter is null or c.language = language_filter)
      and (
        query_text is null
        or query_text = ''
        or c.tsv @@ websearch_to_tsquery('simple', query_text)
      )
    order by lexical_rank desc
    limit 20
  ),
  semantic as (
    select
      c.id,
      c.document_id,
      c.destination_slug,
      c.category,
      c.title,
      left(c.body, 240) as source_excerpt,
      d.source_type,
      case
        when query_embedding is null or c.embedding is null then 0::real
        else (1 - (c.embedding <=> query_embedding))::real
      end as vector_rank
    from rag.chunks c
    join rag.documents d on d.id = c.document_id
    where c.published
      and d.published
      and query_embedding is not null
      and c.embedding is not null
      and (destination_filter is null or c.destination_slug = destination_filter)
      and (category_filter is null or c.category = category_filter)
      and (language_filter is null or c.language = language_filter)
    order by c.embedding <=> query_embedding
    limit 20
  )
  select
    coalesce(l.id, s.id) as id,
    coalesce(l.document_id, s.document_id) as document_id,
    coalesce(l.destination_slug, s.destination_slug) as destination_slug,
    coalesce(l.category, s.category) as category,
    coalesce(l.title, s.title) as title,
    coalesce(l.source_excerpt, s.source_excerpt) as source_excerpt,
    coalesce(l.source_type, s.source_type) as source_type,
    coalesce(l.lexical_rank, 0)::real as lexical_rank,
    coalesce(s.vector_rank, 0)::real as vector_rank,
    (
      coalesce(1.0 / (60 + row_number() over (order by coalesce(l.lexical_rank, 0) desc)), 0)
      + coalesce(1.0 / (60 + row_number() over (order by coalesce(s.vector_rank, 0) desc)), 0)
    )::real as rrf
  from lexical l
  full outer join semantic s on s.id = l.id
  order by rrf desc
  limit match_count;
$$;

revoke all on function rag.search_chunks(text, extensions.vector, text, text, text, integer) from public, anon, authenticated;
grant execute on function rag.search_chunks(text, extensions.vector, text, text, text, integer) to service_role;

grant all on all tables in schema rag to service_role;
grant all on all functions in schema rag to service_role;

-- Internal operational tables
create table internal.spend_ledger (
  id bigint generated always as identity primary key,
  trip_id uuid references public.trips (id) on delete set null,
  user_id uuid,
  kind text not null check (kind in ('reserve', 'settle', 'release')),
  cents integer not null,
  model_tier text,
  day date not null default ((timezone('utc', now()))::date),
  created_at timestamptz not null default now()
);

create index spend_ledger_day_idx on internal.spend_ledger (day);
create index spend_ledger_trip_idx on internal.spend_ledger (trip_id);

create table internal.run_leases (
  trip_id uuid primary key references public.trips (id) on delete cascade,
  lease_id uuid not null,
  idempotency_key text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table internal.public_traces (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  event jsonb not null,
  created_at timestamptz not null default now()
);

create index public_traces_trip_idx on internal.public_traces (trip_id, created_at);

create table internal.replay_runs (
  id text primary key,
  starter_id text not null,
  events jsonb not null
);

grant all on all tables in schema internal to service_role;
grant usage, select on all sequences in schema internal to service_role;

-- Official LangGraph checkpoint tables
create table langgraph.checkpoint_migrations (
  v integer primary key
);

create table langgraph.checkpoints (
  thread_id text not null,
  checkpoint_ns text not null default '',
  checkpoint_id text not null,
  parent_checkpoint_id text,
  type text,
  checkpoint jsonb not null,
  metadata jsonb not null default '{}'::jsonb,
  primary key (thread_id, checkpoint_ns, checkpoint_id)
);

create table langgraph.checkpoint_blobs (
  thread_id text not null,
  checkpoint_ns text not null default '',
  channel text not null,
  version text not null,
  type text not null,
  blob bytea,
  primary key (thread_id, checkpoint_ns, channel, version)
);

create table langgraph.checkpoint_writes (
  thread_id text not null,
  checkpoint_ns text not null default '',
  checkpoint_id text not null,
  task_id text not null,
  idx integer not null,
  channel text not null,
  type text,
  blob bytea not null,
  primary key (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

insert into langgraph.checkpoint_migrations (v) values (0), (1), (2), (3), (4)
on conflict do nothing;

revoke all on all tables in schema langgraph from public, anon, authenticated;
grant all on all tables in schema langgraph to service_role;

-- Retention / cleanup lives outside exposed schemas
create or replace function ops.cleanup_expired_demo_data()
returns void
language plpgsql
security definer
set search_path = ops, public, langgraph, storage
as $$
begin
  delete from langgraph.checkpoint_writes
  where thread_id in (
    select id::text from public.trips where expires_at < now()
  );
  delete from langgraph.checkpoint_blobs
  where thread_id in (
    select id::text from public.trips where expires_at < now()
  );
  delete from langgraph.checkpoints
  where thread_id in (
    select id::text from public.trips where expires_at < now()
  );
  delete from storage.objects
  where bucket_id = 'trip-images'
    and name in (select storage_path from public.trip_images ti join public.trips t on t.id = ti.trip_id where t.expires_at < now());
  delete from public.trips where expires_at < now();
  delete from public.preferences where expires_at < now();
end;
$$;

revoke all on function ops.cleanup_expired_demo_data() from public, anon, authenticated;
grant execute on function ops.cleanup_expired_demo_data() to service_role;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'route-state-expire-anon') then
    perform cron.schedule(
      'route-state-expire-anon',
      '15 * * * *',
      'select ops.cleanup_expired_demo_data()'
    );
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-images',
  'trip-images',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy trip_images_storage_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trip-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
