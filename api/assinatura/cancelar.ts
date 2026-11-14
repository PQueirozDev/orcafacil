import { configurado, json, registrar, rpc, stripe, usuarioDaRequisicao, type Assinatura } from '../_comum.js'

/** Cancela (ou reativa) a renovação automática. O Pro continua até o fim do período já pago. */
export async function POST(req: Request) {
  if (!configurado()) return json({ erro: 'Pagamentos ainda não configurados.' }, 503)
  const usuario = await usuarioDaRequisicao(req)
  if (!usuario) return json({ erro: 'Não autenticado.' }, 401)
  const { reativar } = (await req.json().catch(() => ({}))) as { reativar?: boolean }

  try {
    const [ids] = await rpc<{ stripe_subscription_id: string | null }[]>('assinatura_ids', { p_user: usuario.id })
    if (!ids?.stripe_subscription_id) return json({ erro: 'Nenhuma assinatura encontrada.' }, 404)
    const a = await stripe<Assinatura>(`subscriptions/${ids.stripe_subscription_id}`, 'POST', {
      cancel_at_period_end: reativar ? 'false' : 'true',
    })
    await registrar(usuario.id, a)
    return json({ status: a.status, cancelaNoFim: a.cancel_at_period_end })
  } catch (e) {
    console.error(e)
    return json({ erro: 'Não foi possível alterar a assinatura agora.' }, 502)
  }
}
