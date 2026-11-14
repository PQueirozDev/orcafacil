-- Índices sugeridos pelo Supabase Advisor (chaves estrangeiras sem índice).
create index if not exists compartilhamentos_usuario on public.compartilhamentos (user_id);
create index if not exists notificacoes_orcamento on public.notificacoes (orcamento_id);
