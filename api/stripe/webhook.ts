import { json, registrar, rpc, stripe, webhookValido, type Assinatura } from '../_comum.js'

/**
 * Avisos do Stripe (renovação, falha de pagamento, cancelamento).
 * Só aceita chamadas com assinatura válida (STRIPE_WEBHOOK_SECRET).
 */
export async function POST(req: Request) {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET ?? ''
  const corpo = await req.text()
  if (!webhookValido(corpo, req.headers.get('stripe-signature'), segredo)) return json({ erro: 'assinatura inválida' }, 400)

  const evento = JSON.parse(corpo) as { type: string; data: { object: Record<string, unknown> } }
  try {
    if (evento.type === 'checkout.session.completed') {
      const s = evento.data.object as { client_reference_id?: string; subscription?: string }
      if (s.client_reference_id && s.subscription) {
        await registrar(s.client_reference_id, await stripe<Assinatura>(`subscriptions/${s.subscription}`))
      }
    } else if (evento.type.startsWith('customer.subscription.')) {
      const a = evento.data.object as unknown as Assinatura
      const dono = a.metadata?.user_id ?? (await rpc<string | null>('assinatura_dono', { p_subscription: a.id }))
      if (dono) await registrar(dono, a)
    }
    return json({ recebido: true })
  } catch (e) {
    console.error(e)
    // 500 faz o Stripe tentar de novo mais tarde
    return json({ erro: 'falha ao processar' }, 500)
  }
}
