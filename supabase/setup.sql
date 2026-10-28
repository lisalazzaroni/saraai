-- SaraAI public live chat setup
-- Run this once in Supabase Dashboard > SQL Editor.
-- Safe to rerun: the group password and existing messages are preserved.

begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists saraai_private;
revoke all on schema saraai_private from public, anon, authenticated;

create table if not exists saraai_private.chat_password (
  id boolean primary key default true check (id),
  password_hash text,
  version uuid not null default gen_random_uuid()
);
insert into saraai_private.chat_password (id) values (true) on conflict do nothing;

create table if not exists saraai_private.chat_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  password_version uuid,
  expires_at timestamptz,
  attempts integer not null default 0,
  attempt_window timestamptz not null default now()
);
alter table saraai_private.chat_password enable row level security;
alter table saraai_private.chat_access enable row level security;
revoke all on all tables in schema saraai_private from public, anon, authenticated;

create or replace function public.saraai_can_write()
returns boolean
language sql stable security definer set search_path = ''
as $function$
  select exists (
    select 1 from saraai_private.chat_access a
    join saraai_private.chat_password p on p.version = a.password_version
    where a.user_id = auth.uid() and a.expires_at > now()
      and p.password_hash is not null
  );
$function$;
revoke all on function public.saraai_can_write() from public, anon, authenticated;
grant execute on function public.saraai_can_write() to anon, authenticated;

create or replace function public.saraai_unlock_chat(password text)
returns text
language plpgsql security definer set search_path = ''
as $function$
declare
  caller uuid := auth.uid();
  access_row saraai_private.chat_access%rowtype;
  settings saraai_private.chat_password%rowtype;
begin
  if caller is null then return 'denied'; end if;
  select * into settings from saraai_private.chat_password where id = true;
  if settings.password_hash is null then return 'not_configured'; end if;

  insert into saraai_private.chat_access (user_id) values (caller) on conflict do nothing;
  select * into access_row from saraai_private.chat_access where user_id = caller for update;
  if access_row.attempt_window <= now() - interval '15 minutes' then
    update saraai_private.chat_access set attempts = 0, attempt_window = now() where user_id = caller;
    access_row.attempts := 0;
  end if;
  if access_row.attempts >= 5 then return 'locked'; end if;

  update saraai_private.chat_access set attempts = attempts + 1 where user_id = caller;
  -- bcrypt supports at most 72 bytes. Reject longer values rather than truncating.
  if password is null or octet_length(password) > 72 or octet_length(password) = 0 then
    return 'denied';
  end if;
  if extensions.crypt(password, settings.password_hash) <> settings.password_hash then
    return 'denied';
  end if;

  update saraai_private.chat_access
  set password_version = settings.version, expires_at = now() + interval '7 days', attempts = 0
  where user_id = caller;
  return 'unlocked';
end;
$function$;
revoke all on function public.saraai_unlock_chat(text) from public, anon, authenticated;
grant execute on function public.saraai_unlock_chat(text) to authenticated;

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
    and (select public.saraai_can_write())
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

commit;
