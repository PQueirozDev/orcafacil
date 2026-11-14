-- Corrige: a liberação de mudança de status valia até o fim da transação; agora vale só para a atualização da decisão.
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
  -- desliga a permissão logo após o uso (vale só para esta atualização)
  perform set_config('orcafacil.decisao', '', true);

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
