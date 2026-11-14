-- OrçaFácil: estrutura inicial (contas, empresa, clientes, orçamentos, compartilhamento e aprovação).
-- Todas as tabelas têm RLS: cada usuário só enxerga as próprias linhas. O visitante de uma proposta
-- compartilhada nunca lê tabelas diretamente: ele usa as funções proposta_obter / proposta_decidir.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------------------------
create or replace function public.tocar_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Perfis (1:1 com auth.users)
-- ---------------------------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 120),
  criado_em timestamptz not null default now()
);
alter table public.perfis enable row level security;
create policy "perfil: ler o próprio" on public.perfis for select to authenticated using (id = (select auth.uid()));
create policy "perfil: editar o próprio" on public.perfis for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create or replace function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'nome', new.raw_user_meta_data ->> 'full_name', ''), 120))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger ao_criar_usuario after insert on auth.users for each row execute function public.criar_perfil();

-- ---------------------------------------------------------------------------------------------
-- Empresa (dados comerciais, padrões e modelo visual do orçamento)
-- ---------------------------------------------------------------------------------------------
create table public.empresas (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 160),
  -- demais campos (contato, padrões, layout/template, numeração): documento único editado em conjunto
  dados jsonb not null default '{}'::jsonb check (pg_column_size(dados) < 200000),
  atualizado_em timestamptz not null default now()
);
alter table public.empresas enable row level security;
create policy "empresa: dono" on public.empresas for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create trigger empresas_tocar before insert or update on public.empresas
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------------------------------
create table public.clientes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 160),
  documento text not null default '' check (char_length(documento) <= 40),
  email text not null default '' check (char_length(email) <= 160),
  telefone text not null default '' check (char_length(telefone) <= 40),
  endereco text not null default '' check (char_length(endereco) <= 300),
  observacoes text not null default '' check (char_length(observacoes) <= 2000),
  criado_em timestamptz not null default now(),
  editado_em timestamptz not null default now(),   -- relógio do dispositivo (exibição)
  atualizado_em timestamptz not null default now(), -- relógio do servidor (cursor de sincronização)
  excluido_em timestamptz
);
create index clientes_sync on public.clientes (user_id, atualizado_em);
alter table public.clientes enable row level security;
create policy "clientes: dono" on public.clientes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create trigger clientes_tocar before insert or update on public.clientes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------------------------------
-- Orçamentos
-- ---------------------------------------------------------------------------------------------
create table public.orcamentos (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  numero integer not null check (numero > 0),
  titulo text not null default '' check (char_length(titulo) <= 200),
  cliente_id uuid references public.clientes (id) on delete set null,
  -- cópia dos dados do cliente no momento do orçamento: editar o cadastro não altera propostas emitidas
  cliente jsonb not null default '{}'::jsonb,
  status text not null default 'rascunho'
    check (status in ('rascunho', 'pendente', 'visualizado', 'aprovado', 'recusado', 'cancelado')),
  -- itens ficam no próprio documento: são sempre lidos e gravados junto com o orçamento (escrita atômica)
  itens jsonb not null default '[]'::jsonb check (jsonb_typeof(itens) = 'array'),
  -- fotos (URLs), desconto, frete, imposto, prazos, condições, observações e termos
  dados jsonb not null default '{}'::jsonb,
  total numeric(14, 2) not null default 0,
  criado_em timestamptz not null default now(),
  editado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido_em timestamptz,
  check (pg_column_size(itens) + pg_column_size(dados) < 400000)
);
create index orcamentos_sync on public.orcamentos (user_id, atualizado_em);
create index orcamentos_cliente on public.orcamentos (cliente_id);
alter table public.orcamentos enable row level security;
create policy "orcamentos: dono" on public.orcamentos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Propostas finalizadas (aprovada/recusada) não voltam atrás por sincronização de um aparelho
-- desatualizado: só podem ser canceladas. A decisão do cliente entra pela função proposta_decidir.
create or replace function public.orcamentos_antes_de_gravar() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  if tg_op = 'UPDATE'
     and old.status in ('aprovado', 'recusado')
     and new.status not in (old.status, 'cancelado')
     and coalesce(current_setting('orcafacil.decisao', true), '') <> '1' then
    new.status := old.status;
  end if;
  return new;
end $$;
create trigger orcamentos_gravar before insert or update on public.orcamentos
  for each row execute function public.orcamentos_antes_de_gravar();

-- ---------------------------------------------------------------------------------------------
-- Compartilhamentos: link público + cópia imutável (snapshot) do que foi enviado ao cliente
-- ---------------------------------------------------------------------------------------------
create table public.compartilhamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  token text not null unique check (char_length(token) between 40 and 64),
  snapshot jsonb not null check (pg_column_size(snapshot) < 500000),
  permite_pdf boolean not null default true,
  expira_em timestamptz,
  revogado_em timestamptz,
  visualizado_em timestamptz,
  decisao text check (decisao in ('aprovado', 'recusado')),
  decidido_em timestamptz,
  decisor_nome text check (char_length(decisor_nome) <= 120),
  comentario text check (char_length(comentario) <= 1000),
  criado_em timestamptz not null default now()
);
create index compartilhamentos_orcamento on public.compartilhamentos (orcamento_id, criado_em desc);
alter table public.compartilhamentos enable row level security;
create policy "links: dono lê" on public.compartilhamentos for select to authenticated
  using (user_id = (select auth.uid()));
create policy "links: dono cria para orçamento próprio" on public.compartilhamentos for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.user_id = (select auth.uid()))
  );
create policy "links: dono revoga" on public.compartilhamentos for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- O dono só pode alterar a revogação; snapshot, token e decisão são imutáveis pelo cliente da API.
revoke update on public.compartilhamentos from authenticated, anon;
grant update (revogado_em) on public.compartilhamentos to authenticated;
revoke delete on public.compartilhamentos from authenticated, anon;

-- ---------------------------------------------------------------------------------------------
-- Eventos (linha do tempo) e notificações
-- ---------------------------------------------------------------------------------------------
create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  tipo text not null check (tipo in ('criacao', 'edicao', 'status', 'compartilhamento', 'revogacao',
                                     'visualizacao', 'aprovacao', 'recusa', 'cancelamento', 'pdf')),
  dados jsonb not null default '{}'::jsonb check (pg_column_size(dados) < 4000),
  criado_em timestamptz not null default now(),
  registrado_em timestamptz not null default now()
);
create index eventos_sync on public.eventos (user_id, registrado_em);
create index eventos_orcamento on public.eventos (orcamento_id);
alter table public.eventos enable row level security;
create policy "eventos: dono lê" on public.eventos for select to authenticated using (user_id = (select auth.uid()));
create policy "eventos: dono registra em orçamento próprio" on public.eventos for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and tipo not in ('visualizacao', 'aprovacao', 'recusa') -- estes só nascem no servidor
    and exists (select 1 from public.orcamentos o where o.id = orcamento_id and o.user_id = (select auth.uid()))
  );
revoke update, delete on public.eventos from authenticated, anon;

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  orcamento_id uuid references public.orcamentos (id) on delete cascade,
  tipo text not null check (tipo in ('aprovacao', 'recusa')),
  titulo text not null,
  corpo text not null default '',
  lida_em timestamptz,
  criado_em timestamptz not null default now()
);
create index notificacoes_usuario on public.notificacoes (user_id, criado_em desc);
alter table public.notificacoes enable row level security;
create policy "notificações: dono lê" on public.notificacoes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notificações: dono marca como lida" on public.notificacoes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, update, delete on public.notificacoes from authenticated, anon;
grant update (lida_em) on public.notificacoes to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Limite de tentativas para as funções públicas (por IP, janela de 1 minuto)
-- ---------------------------------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from anon, authenticated, public;
create table privado.tentativas (
  chave text not null,
  janela timestamptz not null,
  n integer not null default 1,
  primary key (chave, janela)
);

create or replace function privado.dentro_do_limite(p_acao text, p_max integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_ip text;
  v_n integer;
begin
  begin
    v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  exception when others then
    v_ip := '';
  end;
  if v_ip = '' then v_ip := 'desconhecido'; end if;
  insert into privado.tentativas as t (chave, janela) values (p_acao || ':' || v_ip, date_trunc('minute', now()))
  on conflict (chave, janela) do update set n = t.n + 1
  returning n into v_n;
  if random() < 0.02 then
    delete from privado.tentativas where janela < now() - interval '1 hour';
  end if;
  return v_n <= p_max;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Portal do cliente: ler a proposta pelo token
-- ---------------------------------------------------------------------------------------------
create or replace function public.proposta_obter(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.compartilhamentos;
  v_estado text;
begin
  if not privado.dentro_do_limite('obter', 60) then
    return jsonb_build_object('estado', 'limite');
  end if;
  if p_token is null or char_length(p_token) not between 40 and 64 then
    return jsonb_build_object('estado', 'invalida');
  end if;
  select * into c from public.compartilhamentos where token = p_token;
  if not found or c.revogado_em is not null then
    -- link inexistente e link revogado respondem igual: não confirma a existência de propostas
    return jsonb_build_object('estado', 'invalida');
  end if;

  v_estado := case
    when c.decisao is not null then c.decisao
    when c.expira_em is not null and c.expira_em < now() then 'expirada'
    else 'aberta'
  end;

  if v_estado = 'aberta' and c.visualizado_em is null then
    update public.compartilhamentos set visualizado_em = now() where id = c.id;
    insert into public.eventos (user_id, orcamento_id, tipo) values (c.user_id, c.orcamento_id, 'visualizacao');
    update public.orcamentos set status = 'visualizado' where id = c.orcamento_id and status = 'pendente';
  end if;

  return jsonb_build_object(
    'estado', v_estado,
    'snapshot', c.snapshot,
    'permite_pdf', c.permite_pdf,
    'expira_em', c.expira_em,
    'decidido_em', c.decidido_em,
    'decisor_nome', c.decisor_nome
  );
end $$;

-- ---------------------------------------------------------------------------------------------
-- Portal do cliente: aprovar ou recusar (uma única vez)
-- ---------------------------------------------------------------------------------------------
create or replace function public.proposta_decidir(p_token text, p_decisao text, p_nome text, p_comentario text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c public.compartilhamentos;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_comentario text := nullif(btrim(coalesce(p_comentario, '')), '');
  v_numero integer;
begin
  if not privado.dentro_do_limite('decidir', 10) then
    return jsonb_build_object('ok', false, 'motivo', 'limite');
  end if;
  if p_decisao is null or p_decisao not in ('aprovado', 'recusado') then
    return jsonb_build_object('ok', false, 'motivo', 'decisao_invalida');
  end if;
  if p_token is null or char_length(p_token) not between 40 and 64 then
    return jsonb_build_object('ok', false, 'motivo', 'invalida');
  end if;
  if char_length(v_nome) < 2 or char_length(v_nome) > 120 then
    return jsonb_build_object('ok', false, 'motivo', 'nome_obrigatorio');
  end if;
  if char_length(coalesce(v_comentario, '')) > 1000 then
    return jsonb_build_object('ok', false, 'motivo', 'comentario_longo');
  end if;

  -- trava a linha: duas respostas simultâneas não passam juntas
  select * into c from public.compartilhamentos where token = p_token for update;
  if not found or c.revogado_em is not null then
    return jsonb_build_object('ok', false, 'motivo', 'invalida');
  end if;
  if c.decisao is not null then
    return jsonb_build_object('ok', false, 'motivo', 'ja_decidida', 'estado', c.decisao);
  end if;
  if c.expira_em is not null and c.expira_em < now() then
    return jsonb_build_object('ok', false, 'motivo', 'expirada');
  end if;

  update public.compartilhamentos
     set decisao = p_decisao, decidido_em = now(), decisor_nome = v_nome, comentario = v_comentario,
         visualizado_em = coalesce(visualizado_em, now())
   where id = c.id;

  perform set_config('orcafacil.decisao', '1', true);
  update public.orcamentos set status = p_decisao
   where id = c.orcamento_id and status in ('rascunho', 'pendente', 'visualizado')
  returning numero into v_numero;

  insert into public.eventos (user_id, orcamento_id, tipo, dados)
  values (c.user_id, c.orcamento_id, case p_decisao when 'aprovado' then 'aprovacao' else 'recusa' end,
          jsonb_strip_nulls(jsonb_build_object('nome', v_nome, 'comentario', v_comentario)));

  insert into public.notificacoes (user_id, orcamento_id, tipo, titulo, corpo)
  values (c.user_id, c.orcamento_id, case p_decisao when 'aprovado' then 'aprovacao' else 'recusa' end,
          'Orçamento #' || lpad(coalesce(v_numero, (c.snapshot -> 'orcamento' ->> 'numero')::integer)::text, 4, '0')
            || case p_decisao when 'aprovado' then ' aprovado' else ' recusado' end,
          v_nome || case when v_comentario is not null then ': ' || v_comentario else '' end);

  return jsonb_build_object('ok', true, 'estado', p_decisao);
end $$;

revoke execute on function public.proposta_obter(text) from public;
revoke execute on function public.proposta_decidir(text, text, text, text) from public;
grant execute on function public.proposta_obter(text) to anon, authenticated;
grant execute on function public.proposta_decidir(text, text, text, text) to anon, authenticated;
revoke execute on function public.criar_perfil() from public, anon, authenticated;
revoke execute on function privado.dentro_do_limite(text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Arquivos (logo e fotos dos orçamentos)
-- Bucket público de leitura: o endereço contém o id do usuário e o hash do conteúdo (não listável).
-- Só o dono grava e apaga dentro da própria pasta.
-- ---------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('arquivos', 'arquivos', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "arquivos: dono envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'arquivos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "arquivos: dono apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'arquivos' and (storage.foldername(name))[1] = (select auth.uid())::text);
