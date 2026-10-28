-- Run after setup.sql in the Supabase SQL Editor. All changes roll back.
begin;

select set_config('saraai.test_user', gen_random_uuid()::text, true);
select set_config('saraai.other_user', gen_random_uuid()::text, true);
select set_config('saraai.test_message', gen_random_uuid()::text, true);
insert into auth.users (id) values
  (current_setting('saraai.test_user')::uuid),
  (current_setting('saraai.other_user')::uuid);
update saraai_private.chat_password
set password_hash = extensions.crypt('test-only-group-password', extensions.gen_salt('bf', 4)),
    version = gen_random_uuid()
where id = true;
insert into public.saraai_live_messages (id, sender_id, sender_name, role, body)
values (current_setting('saraai.test_message')::uuid, current_setting('saraai.test_user')::uuid,
        'Test', 'user', 'Public reading fixture');

set local role anon;
do $$
begin
  if not exists (select 1 from public.saraai_live_messages where id = current_setting('saraai.test_message')::uuid) then
    raise exception 'FAIL: signed-out visitors cannot read messages';
  end if;
  if public.saraai_can_write() then raise exception 'FAIL: signed-out visitor has write access'; end if;
  begin
    perform password_hash from saraai_private.chat_password;
    raise exception 'FAIL: password hashes are exposed';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.saraai_live_messages (sender_id, sender_name, role, body)
    values (current_setting('saraai.test_user')::uuid, 'Test', 'user', 'Should fail');
    raise exception 'FAIL: signed-out visitor can post';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('saraai.test_user'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
begin
  if public.saraai_can_write() then raise exception 'FAIL: anonymous session bypasses the password'; end if;
  begin
    insert into public.saraai_live_messages (sender_id, sender_name, role, body)
    values (auth.uid(), 'Test', 'user', 'Should fail');
    raise exception 'FAIL: locked session can post directly';
  exception when insufficient_privilege then null;
  end;
  for attempt in 1..5 loop
    if public.saraai_unlock_chat('wrong') <> 'denied' then raise exception 'FAIL: incorrect password accepted'; end if;
  end loop;
  if public.saraai_unlock_chat('test-only-group-password') <> 'locked' then
    raise exception 'FAIL: attempt limit not enforced';
  end if;
end;
$$;
reset role;

update saraai_private.chat_access set attempt_window = now() - interval '16 minutes'
where user_id = current_setting('saraai.test_user')::uuid;
set local role authenticated;
do $$
begin
  if public.saraai_unlock_chat('test-only-group-password') <> 'unlocked' or not public.saraai_can_write() then
    raise exception 'FAIL: correct password does not unlock after cooldown';
  end if;
  insert into public.saraai_live_messages (sender_id, sender_name, role, body)
  values (auth.uid(), 'Test', 'user', 'Allowed after unlock');
  begin
    insert into public.saraai_live_messages (sender_id, sender_name, role, body)
    values (current_setting('saraai.other_user')::uuid, 'Test', 'user', 'Should fail');
    raise exception 'FAIL: writer can impersonate another session';
  exception when insufficient_privilege then null;
  end;
  begin
    update saraai_private.chat_access set expires_at = now() + interval '100 years';
    raise exception 'FAIL: writer can grant themselves access';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('saraai.other_user'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
begin
  if public.saraai_can_write() then raise exception 'FAIL: one session unlocks other visitors'; end if;
end;
$$;
reset role;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('saraai.test_user'), 'role', 'authenticated')::text, true);
update saraai_private.chat_access set expires_at = now() - interval '1 second'
where user_id = current_setting('saraai.test_user')::uuid;
set local role authenticated;
do $$
begin
  if public.saraai_can_write() then raise exception 'FAIL: expired unlock still works'; end if;
  if public.saraai_unlock_chat('test-only-group-password') <> 'unlocked' then raise exception 'FAIL: cannot renew access'; end if;
end;
$$;
reset role;

update saraai_private.chat_password set version = gen_random_uuid() where id = true;
set local role authenticated;
do $$
begin
  if public.saraai_can_write() then raise exception 'FAIL: password rotation did not revoke access'; end if;
  begin
    insert into public.saraai_live_messages (sender_id, sender_name, role, body)
    values (auth.uid(), 'Test', 'assistant', 'Should fail after rotation');
    raise exception 'FAIL: rotated session can still post';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

select 'Chat access database checks passed' as result;
rollback;
