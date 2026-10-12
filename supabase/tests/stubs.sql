-- Minimal stand-ins for what Supabase provides (auth, storage, realtime, roles),
-- so our migrations can run on a plain local Postgres for testing.
-- Used by scripts/test-db.sh. Never run this on the real Supabase project.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema storage;
grant usage on schema public, auth, storage to anon, authenticated;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, banned_until timestamptz);
-- In tests, "who is signed in" comes from: set request.jwt.claim.sub = '<user id>';
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;
create publication supabase_realtime;
alter default privileges in schema public grant all on tables to anon, authenticated;
grant all on storage.objects to authenticated;

-- Test helpers -------------------------------------------------------------
create schema test;
grant usage on schema test to anon, authenticated;

-- test.ok(condition, name): PASS if true, otherwise stop with FAIL.
create function test.ok(condition boolean, name text) returns text language plpgsql as $$
begin
  if condition is not true then
    raise exception 'FAIL: %', name;
  end if;
  return 'PASS: ' || name;
end;
$$;

-- test.fails(sql, name): PASS if running the SQL raises an error (the change is undone).
create function test.fails(statement text, name text) returns text language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    return 'PASS: ' || name || '  (' || sqlerrm || ')';
  end;
  raise exception 'FAIL: % (it was allowed)', name;
end;
$$;

-- test.as(user_id): act as this signed-in user. Use after `set role authenticated;`.
create function test.as(user_id uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', user_id::text, false);
$$;
grant execute on all functions in schema test to anon, authenticated;
