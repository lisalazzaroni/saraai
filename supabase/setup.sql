-- SaraAI public live chat setup
-- Run this once in Supabase Dashboard > SQL Editor.

create table if not exists public.saraai_live_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  sender_name text not null check (char_length(sender_name) between 1 and 24),
  role text not null check (role in ('user', 'assistant')),
  body text not null check (char_length(btrim(body)) between 1 and 600),
  created_at timestamptz not null default now()
);

create index if not exists saraai_live_messages_created_at_idx
  on public.saraai_live_messages (created_at desc);

create index if not exists saraai_live_messages_sender_created_idx
  on public.saraai_live_messages (sender_id, created_at desc);

alter table public.saraai_live_messages enable row level security;

revoke all on table public.saraai_live_messages from anon, authenticated;
grant select on table public.saraai_live_messages to anon, authenticated;
grant insert on table public.saraai_live_messages to authenticated;

drop policy if exists "Anyone can read SaraAI messages" on public.saraai_live_messages;
create policy "Anyone can read SaraAI messages"
  on public.saraai_live_messages
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Visitors can post their own SaraAI messages" on public.saraai_live_messages;
create policy "Visitors can post their own SaraAI messages"
  on public.saraai_live_messages
  for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and char_length(sender_name) between 1 and 24
    and role in ('user', 'assistant')
    and char_length(btrim(body)) between 1 and 600
  );

create or replace function public.saraai_limit_live_chat_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  -- Leave room for the multiple chat events emitted during a full quiz round.
  if exists (
    select 1
    from public.saraai_live_messages as existing
    where existing.sender_id = new.sender_id
      and existing.created_at > pg_catalog.now() - interval '10 seconds'
    group by existing.sender_id
    having count(*) >= 40
  ) then
    raise exception 'Please wait before sending another message.';
  end if;

  return new;
end;
$function$;

revoke all on function public.saraai_limit_live_chat_rate() from public, anon, authenticated;

drop trigger if exists saraai_limit_live_chat_rate on public.saraai_live_messages;
create trigger saraai_limit_live_chat_rate
  before insert on public.saraai_live_messages
  for each row execute function public.saraai_limit_live_chat_rate();

do $publication$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'saraai_live_messages'
  ) then
    alter publication supabase_realtime add table public.saraai_live_messages;
  end if;
end;
$publication$;
