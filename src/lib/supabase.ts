import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente do Supabase. Usa apenas a chave PUBLICÁVEL (segura no navegador):
 * quem garante o acesso são as políticas RLS do banco.
 * Sem as variáveis de ambiente o app continua funcionando só no modo visitante.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabase: SupabaseClient | null =
  url && chave
    ? createClient(url, chave, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
      })
    : null

export const nuvemDisponivel = supabase !== null

let provedores: Promise<{ google: boolean }> | null = null

/**
 * Pergunta ao Supabase quais logins externos estão ativos. O botão do Google só aparece
 * quando o provedor estiver configurado no painel (ou forçado com VITE_LOGIN_GOOGLE=true).
 */
export function provedoresAtivos(): Promise<{ google: boolean }> {
  if (import.meta.env.VITE_LOGIN_GOOGLE === 'true') return Promise.resolve({ google: true })
  if (!url || !chave) return Promise.resolve({ google: false })
  provedores ??= fetch(`${url}/auth/v1/settings`, { headers: { apikey: chave } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => ({ google: !!d?.external?.google }))
    .catch(() => ({ google: false }))
  return provedores
}

/** Traduz mensagens de erro comuns do Supabase Auth. */
export function mensagemDeErro(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e)
  const mapa: [RegExp, string][] = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada (e no spam).'],
    [/user already registered/i, 'Já existe uma conta com este e-mail.'],
    [/password should be at least (\d+)/i, 'A senha precisa ter pelo menos 8 caracteres.'],
    [/weak.?password|password is too weak/i, 'Escolha uma senha mais forte (misture letras e números).'],
    [/rate limit|too many requests|over_email_send_rate_limit/i, 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.'],
    [/unable to validate email|invalid email/i, 'Digite um e-mail válido.'],
    [/same password|should be different/i, 'A nova senha precisa ser diferente da atual.'],
    [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique sua internet.'],
    [/expired|invalid.*(token|link)|otp/i, 'Este link expirou ou já foi usado. Peça um novo.'],
  ]
  for (const [re, texto] of mapa) if (re.test(msg)) return texto
  return 'Não foi possível concluir. Tente novamente.'
}
