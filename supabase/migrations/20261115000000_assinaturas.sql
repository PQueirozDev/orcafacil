-- Plano Pro (Stripe): assinatura por usuário + limite do plano grátis.
-- O navegador só LÊ a própria assinatura. Quem grava são as funções do servidor (Vercel),
-- que se identificam com um segredo compartilhado guardado em privado.config.

create table if not exists privado.config (
  chave text primary key,
  valor text not null
);
revoke all on privado.config from anon, authenticated, public;

create table public.assinaturas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plano text not null default 'gratis' check (plano in ('gratis', 'pro')),
  status text not null default 'inativa',
  ciclo text check (ciclo in ('mensal', 'anual')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  periodo_fim timestamptz,
  cancela_no_fim boolean not null default false,
  atualizado_em timestamptz not null default now()
);
alter table public.assinaturas enable row level security;
create policy "assinatura: dono lê" on public.assinaturas for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.assinaturas from anon, authenticated;

create or replace function privado.segredo_valido(p_segredo text) returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (select 1 from privado.config where chave = 'segredo_servidor' and valor = p_segredo and char_length(p_segredo) >= 32)
$$;
revoke execute on function privado.segredo_valido(text) from public, anon, authenticated;

/** O usuário tem o Pro ativo agora? */
create or replace function privado.eh_pro(p_user uuid) returns boolean
language sql security definer set search_path = '' stable as $$
  select exists (
    select 1 from public.assinaturas a
    where a.user_id = p_user and a.plano = 'pro'
      and a.status in ('active', 'trialing', 'past_due')
      and (a.periodo_fim is null or a.periodo_fim > now() - interval '3 days')
  )
$$;
revoke execute on function privado.eh_pro(uuid) from public, anon, authenticated;

-- Chamada pelo servidor (com o segredo) para gravar o estado vindo do Stripe.
create or replace function public.assinatura_registrar(
  p_segredo text, p_user uuid, p_status text, p_ciclo text, p_customer text, p_subscription text,
  p_periodo_fim timestamptz, p_cancela_no_fim boolean
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.segredo_valido(p_segredo) then
    raise exception 'não autorizado' using errcode = '42501';
  end if;
  insert into public.assinaturas as a (user_id, plano, status, ciclo, stripe_customer_id, stripe_subscription_id, periodo_fim, cancela_no_fim, atualizado_em)
  values (p_user, case when p_status in ('active', 'trialing', 'past_due') then 'pro' else 'gratis' end,
          p_status, p_ciclo, p_customer, p_subscription, p_periodo_fim, coalesce(p_cancela_no_fim, false), now())
  on conflict (user_id) do update set
    plano = excluded.plano, status = excluded.status, ciclo = coalesce(excluded.ciclo, a.ciclo),
    stripe_customer_id = coalesce(excluded.stripe_customer_id, a.stripe_customer_id),
    stripe_subscription_id = coalesce(excluded.stripe_subscription_id, a.stripe_subscription_id),
    periodo_fim = excluded.periodo_fim, cancela_no_fim = excluded.cancela_no_fim, atualizado_em = now();
end $$;

-- Chamada pelo servidor (com o segredo) para achar os ids do Stripe de um usuário.
create or replace function public.assinatura_ids(p_segredo text, p_user uuid)
returns table (stripe_customer_id text, stripe_subscription_id text)
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.segredo_valido(p_segredo) then
    raise exception 'não autorizado' using errcode = '42501';
  end if;
  return query select a.stripe_customer_id, a.stripe_subscription_id from public.assinaturas a where a.user_id = p_user;
end $$;

-- Achar o usuário pelo id da assinatura (webhook).
create or replace function public.assinatura_dono(p_segredo text, p_subscription text) returns uuid
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.segredo_valido(p_segredo) then
    raise exception 'não autorizado' using errcode = '42501';
  end if;
  return (select a.user_id from public.assinaturas a where a.stripe_subscription_id = p_subscription);
end $$;

revoke execute on function public.assinatura_registrar(text, uuid, text, text, text, text, timestamptz, boolean) from public;
revoke execute on function public.assinatura_ids(text, uuid) from public;
revoke execute on function public.assinatura_dono(text, text) from public;
grant execute on function public.assinatura_registrar(text, uuid, text, text, text, text, timestamptz, boolean) to anon, authenticated;
grant execute on function public.assinatura_ids(text, uuid) to anon, authenticated;
grant execute on function public.assinatura_dono(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Limite do plano grátis: 10 links de proposta por mês (validado no banco, não só na tela)
-- ---------------------------------------------------------------------------------------------
create or replace function public.uso_do_mes() returns jsonb
language sql security definer set search_path = '' stable as $$
  select jsonb_build_object(
    'links', (select count(*) from public.compartilhamentos c
              where c.user_id = (select auth.uid()) and c.criado_em >= date_trunc('month', now())),
    'limite', case when privado.eh_pro((select auth.uid())) then null else 10 end,
    'pro', privado.eh_pro((select auth.uid()))
  )
$$;
revoke execute on function public.uso_do_mes() from public, anon;
grant execute on function public.uso_do_mes() to authenticated;

create or replace function public.limitar_links_gratis() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  n integer;
begin
  if privado.eh_pro(new.user_id) then
    return new;
  end if;
  select count(*) into n from public.compartilhamentos c
   where c.user_id = new.user_id and c.criado_em >= date_trunc('month', now());
  if n >= 10 then
    raise exception 'limite_plano_gratis' using errcode = 'P0001', hint = 'O plano grátis permite 10 links por mês.';
  end if;
  return new;
end $$;
create trigger compartilhamentos_limite before insert on public.compartilhamentos
  for each row execute function public.limitar_links_gratis();
