-- App 100% gratuito: o limite de links deixa de existir (função vira passagem direta).
create or replace function public.limitar_links_gratis() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  return new;
end $$;
-- Segredo do servidor não é mais usado por nenhuma função ativa: invalida o valor guardado.
update privado.config set valor = 'desativado' where chave = 'segredo_servidor';
