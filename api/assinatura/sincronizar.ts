import { configurado, json, registrar, rpc, stripe, usuarioDaRequisicao, type Assinatura } from '../_comum.js'

/**
 * Atualiza o plano do usuário a partir do Stripe.
 * - Depois do checkout: recebe o id da sessão e confirma que ela é deste usuário.
 * - Sem sessão: consulta a assinatura já registrada (renovações, cancelamentos).
 */
export async function POST(req: Request) {
  if (!configurado()) return json({ erro: 'Pagamentos ainda não configurados.' }, 503)
  const usuario = await usuarioDaRequisicao(req)
  if (!usuario) return json({ erro: 'Não autenticado.' }, 401)
  const { sessao } = (await req.json().catch(() => ({}))) as { sessao?: string }

  try {
    let assinaturaId: string | null = null
    if (sessao && /^cs_[A-Za-z0-9_]+$/.test(sessao)) {
      const s = await stripe<{ client_reference_id: string | null; subscription: string | null }>(`checkout/sessions/${sessao}`)
      // A sessão precisa ter sido criada para ESTE usuário
      if (s.client_reference_id !== usuario.id) return json({ erro: 'Sessão de pagamento inválida.' }, 403)
      assinaturaId = s.subscription
    } else {
      const [ids] = await rpc<{ stripe_subscription_id: string | null }[]>('assinatura_ids', { p_user: usuario.id })
      assinaturaId = ids?.stripe_subscription_id ?? null
    }
    if (!assinaturaId) return json({ plano: 'gratis' })

    const a = await stripe<Assinatura>(`subscriptions/${assinaturaId}`)
    if (a.metadata?.user_id && a.metadata.user_id !== usuario.id) return json({ erro: 'Assinatura de outra conta.' }, 403)
    await registrar(usuario.id, a)
    return json({ status: a.status, cancelaNoFim: a.cancel_at_period_end })
  } catch (e) {
    console.error(e)
    return json({ erro: 'Não foi possível consultar o pagamento agora.' }, 502)
  }
}
