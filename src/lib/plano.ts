import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { supabase } from './supabase'

/** Plano da conta (grátis ou Pro) e uso do mês. O limite é validado no banco; aqui é só exibição. */
export const LIMITE_GRATIS = 10
export const PRECO = { mensal: 19.9, anual: 199 }

export interface EstadoPlano {
  carregando: boolean
  pro: boolean
  status: string | null
  ciclo: 'mensal' | 'anual' | null
  periodoFim: number | null
  cancelaNoFim: boolean
  linksNoMes: number
  limite: number | null
}

const INICIAL: EstadoPlano = { carregando: true, pro: false, status: null, ciclo: null, periodoFim: null, cancelaNoFim: false, linksNoMes: 0, limite: LIMITE_GRATIS }

const ouvintes = new Set<() => void>()
/** Força todos os componentes que usam o plano a recarregar (após pagar, cancelar, criar link). */
export const recarregarPlano = () => ouvintes.forEach((f) => f())

export function usePlano(): EstadoPlano & { recarregar: () => void } {
  const { usuario } = useAuth()
  const [estado, setEstado] = useState<EstadoPlano>(INICIAL)
  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    const f = () => setVersao((v) => v + 1)
    ouvintes.add(f)
    return () => {
      ouvintes.delete(f)
    }
  }, [])

  useEffect(() => {
    if (!supabase || !usuario) {
      setEstado({ ...INICIAL, carregando: false })
      return
    }
    let ativo = true
    Promise.all([
      supabase.from('assinaturas').select('plano, status, ciclo, periodo_fim, cancela_no_fim').maybeSingle(),
      supabase.rpc('uso_do_mes'),
    ]).then(([a, u]) => {
      if (!ativo) return
      const uso = (u.data ?? {}) as { links?: number; limite?: number | null; pro?: boolean }
      setEstado({
        carregando: false,
        pro: !!uso.pro,
        status: a.data?.status ?? null,
        ciclo: a.data?.ciclo ?? null,
        periodoFim: a.data?.periodo_fim ? new Date(a.data.periodo_fim).getTime() : null,
        cancelaNoFim: !!a.data?.cancela_no_fim,
        linksNoMes: uso.links ?? 0,
        limite: uso.pro ? null : (uso.limite ?? LIMITE_GRATIS),
      })
    })
    return () => {
      ativo = false
    }
  }, [usuario, versao])

  return { ...estado, recarregar }
}

async function chamar(caminho: string, corpo: Record<string, unknown> = {}) {
  const sessao = (await supabase?.auth.getSession())?.data.session
  if (!sessao) throw new Error('Entre na sua conta.')
  const r = await fetch(caminho, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${sessao.access_token}` },
    body: JSON.stringify(corpo),
  })
  const dados = (await r.json().catch(() => ({}))) as { erro?: string; url?: string }
  if (!r.ok) throw new Error(dados.erro ?? 'Não foi possível concluir agora.')
  return dados
}

/** Abre o checkout do Stripe (página segura do Stripe). */
export async function assinarPro(ciclo: 'mensal' | 'anual') {
  const { url } = await chamar('/api/assinatura/checkout', { ciclo })
  if (!url?.startsWith('https://checkout.stripe.com/')) throw new Error('Endereço de pagamento inválido.')
  window.location.assign(url)
}

export async function confirmarPagamento(sessao?: string) {
  await chamar('/api/assinatura/sincronizar', sessao ? { sessao } : {})
  recarregarPlano()
}

export async function alterarRenovacao(reativar: boolean) {
  await chamar('/api/assinatura/cancelar', { reativar })
  recarregarPlano()
}
