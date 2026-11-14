/**
 * Utilitários das funções de servidor (Vercel Functions).
 * - A chave secreta do Stripe só existe aqui (variável de ambiente do servidor).
 * - Gravações no banco usam funções do Supabase protegidas por um segredo compartilhado,
 *   para não precisar da service role key.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_CHAVE = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
const SEGREDO = process.env.ORCAFACIL_SEGREDO_SERVIDOR ?? ''
const STRIPE = process.env.STRIPE_SECRET_KEY ?? ''

export const PRECOS = {
  mensal: { centavos: 1990, intervalo: 'month' },
  anual: { centavos: 19900, intervalo: 'year' },
} as const
export type Ciclo = keyof typeof PRECOS

export const json = (dados: unknown, status = 200) =>
  new Response(JSON.stringify(dados), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

export function configurado() {
  return !!(SUPABASE_URL && SUPABASE_CHAVE && SEGREDO && STRIPE)
}

/** Valida o token de sessão do Supabase enviado pelo app e devolve o usuário. */
export async function usuarioDaRequisicao(req: Request): Promise<{ id: string; email: string } | null> {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_CHAVE, authorization: `Bearer ${token}` } })
  if (!r.ok) return null
  const u = (await r.json()) as { id?: string; email?: string }
  return u.id ? { id: u.id, email: u.email ?? '' } : null
}

/** Chama uma função (RPC) do Supabase como servidor, enviando o segredo compartilhado. */
export async function rpc<T>(nome: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nome}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_CHAVE, authorization: `Bearer ${SUPABASE_CHAVE}`, 'content-type': 'application/json' },
    body: JSON.stringify({ p_segredo: SEGREDO, ...args }),
  })
  if (!r.ok) throw new Error(`rpc ${nome}: ${r.status}`)
  const texto = await r.text()
  return (texto ? JSON.parse(texto) : null) as T
}

/** Chamada à API do Stripe (form-urlencoded), sem SDK. */
export async function stripe<T = Record<string, unknown>>(caminho: string, metodo: 'GET' | 'POST' = 'GET', dados?: Record<string, string>): Promise<T> {
  const r = await fetch(`https://api.stripe.com/v1/${caminho}`, {
    method: metodo,
    headers: { authorization: `Bearer ${STRIPE}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: dados ? new URLSearchParams(dados).toString() : undefined,
  })
  const corpo = (await r.json()) as T & { error?: { message?: string } }
  if (!r.ok) throw new Error(`stripe ${caminho}: ${corpo.error?.message ?? r.status}`)
  return corpo
}

export interface Assinatura {
  id: string
  status: string
  customer: string
  cancel_at_period_end: boolean
  current_period_end?: number
  items?: { data: { current_period_end?: number; price: { recurring?: { interval?: string } } }[] }
  metadata?: Record<string, string>
}

/** Grava no banco o estado atual de uma assinatura do Stripe. */
export async function registrar(userId: string, a: Assinatura) {
  const item = a.items?.data[0]
  const fim = a.current_period_end ?? item?.current_period_end
  await rpc('assinatura_registrar', {
    p_user: userId,
    p_status: a.status,
    p_ciclo: item?.price.recurring?.interval === 'year' ? 'anual' : 'mensal',
    p_customer: a.customer,
    p_subscription: a.id,
    p_periodo_fim: fim ? new Date(fim * 1000).toISOString() : null,
    p_cancela_no_fim: a.cancel_at_period_end,
  })
}

/** Verifica a assinatura do webhook do Stripe (cabeçalho Stripe-Signature). */
export function webhookValido(corpo: string, cabecalho: string | null, segredo: string, tolerancia = 300): boolean {
  if (!cabecalho || !segredo) return false
  const partes = Object.fromEntries(cabecalho.split(',').map((p) => p.split('=') as [string, string]))
  const t = Number(partes.t)
  const assinaturas = cabecalho
    .split(',')
    .filter((p) => p.startsWith('v1='))
    .map((p) => p.slice(3))
  if (!t || !assinaturas.length || Math.abs(Date.now() / 1000 - t) > tolerancia) return false
  const esperado = createHmac('sha256', segredo).update(`${t}.${corpo}`).digest('hex')
  return assinaturas.some((s) => s.length === esperado.length && timingSafeEqual(Buffer.from(s), Buffer.from(esperado)))
}
