import { configurado, json, PRECOS, rpc, stripe, usuarioDaRequisicao, type Ciclo } from '../_comum.js'

/** Cria a sessão de checkout do Stripe para o plano Pro e devolve a URL de pagamento. */
export async function POST(req: Request) {
  if (!configurado()) return json({ erro: 'Pagamentos ainda não configurados.' }, 503)
  const usuario = await usuarioDaRequisicao(req)
  if (!usuario) return json({ erro: 'Entre na sua conta para assinar.' }, 401)

  const { ciclo } = (await req.json().catch(() => ({}))) as { ciclo?: Ciclo }
  const preco = PRECOS[ciclo === 'anual' ? 'anual' : 'mensal']
  const origem = new URL(req.url).origin

  const [ids] = await rpc<{ stripe_customer_id: string | null }[]>('assinatura_ids', { p_user: usuario.id })
  const dados: Record<string, string> = {
    mode: 'subscription',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'brl',
    'line_items[0][price_data][unit_amount]': String(preco.centavos),
    'line_items[0][price_data][recurring][interval]': preco.intervalo,
    'line_items[0][price_data][product_data][name]': 'OrçaFácil Pro',
    'line_items[0][price_data][product_data][description]': 'Links de proposta ilimitados e documentos sem a marca OrçaFácil.',
    client_reference_id: usuario.id,
    'metadata[user_id]': usuario.id,
    'subscription_data[metadata][user_id]': usuario.id,
    locale: 'pt-BR',
    allow_promotion_codes: 'true',
    success_url: `${origem}/app/plano?status=sucesso&sessao={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origem}/app/plano?status=cancelado`,
  }
  if (ids?.stripe_customer_id) dados.customer = ids.stripe_customer_id
  else if (usuario.email) dados.customer_email = usuario.email

  try {
    const sessao = await stripe<{ url: string }>('checkout/sessions', 'POST', dados)
    return json({ url: sessao.url })
  } catch (e) {
    console.error(e)
    return json({ erro: 'Não foi possível iniciar o pagamento. Tente de novo em instantes.' }, 502)
  }
}
