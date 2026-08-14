-- The first curator.
--
-- Curators are named by other curators, which leaves a chicken-and-egg problem:
-- with zero curators nobody can name anyone, and nothing ever gets published.
--
-- This resolves it at the only moment that works — profile creation — instead
-- of by a manual UPDATE that would have to be remembered again on every fresh
-- database. It is idempotent and it is versioned, so a new environment comes up
-- with exactly one curator and no ceremony.
--
-- The address is deliberately in the repo. It is not a secret and it is not a
-- credential: it grants nothing to whoever reads it, because the account still
-- has to pass Google. What it does buy is an auditable answer to "who made
-- themselves curator, and when".
--
-- Everyone else starts as 'contributor', as before.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  bootstrap_email constant text := 'luisgir827@gmail.com';
begin
  insert into public.profile (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email, 'Anónimo'),
    case
      when new.email = bootstrap_email then 'curator'::public.user_role
      else 'contributor'::public.user_role
    end
  );
  return new;
end;
$$;

-- create or replace resets the default grant to PUBLIC, which would undo
-- 20260814000000_revoke_public_rpc and hand anon an RPC endpoint again.
revoke execute on function handle_new_user() from public, anon, authenticated;
