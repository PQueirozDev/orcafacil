import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { avisar, confirmar } from '../../components/Avisos'
import { Carregando, Icone, Titulo } from '../../components/ui'
import { formatarDataLonga, formatarMoeda } from '../../lib/formato'
import { alterarRenovacao, assinarPro, confirmarPagamento, LIMITE_GRATIS, PRECO, usePlano } from '../../lib/plano'

const GRATIS = [
  'Orçamentos e clientes ilimitados',
  'Modelos, fotos e PDF em A4',
  `${LIMITE_GRATIS} links de aprovação por mês`,
  'Pequeno selo “Feito com OrçaFácil” no PDF e no link',
]
const PRO = ['Tudo do grátis', 'Links de aprovação ilimitados', 'PDF e link sem o selo do OrçaFácil', 'Ajuda o OrçaFácil a continuar no ar']

export function Plano() {
  const plano = usePlano()
  const [params, setParams] = useSearchParams()
  const [ciclo, setCiclo] = useState<'mensal' | 'anual'>('anual')
  const [ocupado, setOcupado] = useState(false)
  const confirmou = useRef(false)

  // Volta do checkout do Stripe
  useEffect(() => {
    const status = params.get('status')
    if (!status || confirmou.current) return
    confirmou.current = true
    const sessao = params.get('sessao') ?? undefined
    setParams({}, { replace: true })
    if (status === 'cancelado') {
      avisar('Pagamento não concluído. Nada foi cobrado.', 'info')
      return
    }
    setOcupado(true)
    confirmarPagamento(sessao)
      .then(() => avisar('Pagamento confirmado. Bem-vindo ao Pro!'))
      .catch((e) => avisar(e instanceof Error ? e.message : 'Não foi possível confirmar agora.', 'erro'))
      .finally(() => setOcupado(false))
  }, [params, setParams])

  if (plano.carregando) return <Carregando />

  async function assinar() {
    setOcupado(true)
    try {
      await assinarPro(ciclo)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível abrir o pagamento.', 'erro')
      setOcupado(false)
    }
  }

  async function renovacao(reativar: boolean) {
    if (!reativar) {
      const ok = await confirmar({
        titulo: 'Cancelar a renovação?',
        mensagem: `Você continua no Pro até ${plano.periodoFim ? formatarDataLonga(plano.periodoFim) : 'o fim do período pago'}. Depois volta para o plano grátis, sem perder nada.`,
        botao: 'Cancelar renovação',
        perigo: true,
      })
      if (!ok) return
    }
    setOcupado(true)
    try {
      await alterarRenovacao(reativar)
      avisar(reativar ? 'Renovação reativada.' : 'Renovação cancelada.')
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível alterar.', 'erro')
    } finally {
      setOcupado(false)
    }
  }

  const uso = plano.limite ? Math.min(100, (plano.linksNoMes / plano.limite) * 100) : 0

  return (
    <>
      <Titulo titulo="Plano" subtitulo={plano.pro ? 'Você está no OrçaFácil Pro.' : 'Você está no plano grátis.'} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="cartao p-5 sm:p-6">
          <p className="etiqueta">Uso neste mês</p>
          <p className="mt-2 font-display text-4xl font-bold text-slate-900">
            {plano.linksNoMes}
            <span className="text-xl font-medium text-slate-500"> {plano.limite ? `de ${plano.limite} links` : 'links (ilimitado)'}</span>
          </p>
          {plano.limite && (
            <div className="mt-3 h-2 overflow-hidden rounded-full border border-slate-900 bg-superficie" role="progressbar" aria-valuemin={0} aria-valuemax={plano.limite} aria-valuenow={plano.linksNoMes}>
              <div className={`h-full ${uso >= 100 ? 'bg-red-600' : 'bg-slate-900'}`} style={{ width: `${uso}%` }} />
            </div>
          )}
          <p className="mt-3 text-sm text-slate-600">Links de aprovação gerados desde o dia 1º. O contador zera todo mês.</p>

          {plano.pro && (
            <dl className="mt-6 space-y-2 border-t border-slate-300 pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Ciclo</dt>
                <dd className="font-medium text-slate-900">{plano.ciclo === 'anual' ? 'Anual' : 'Mensal'}</dd>
              </div>
              {plano.periodoFim && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{plano.cancelaNoFim ? 'Pro até' : 'Próxima cobrança'}</dt>
                  <dd className="font-medium text-slate-900">{formatarDataLonga(plano.periodoFim)}</dd>
                </div>
              )}
              {plano.status === 'past_due' && <p className="text-red-700">O último pagamento falhou. Atualize o cartão no e-mail enviado pelo Stripe.</p>}
            </dl>
          )}
          {plano.pro && (
            <button className={plano.cancelaNoFim ? 'btn-primario mt-5' : 'btn-secundario mt-5'} disabled={ocupado} onClick={() => void renovacao(plano.cancelaNoFim)}>
              {plano.cancelaNoFim ? 'Reativar renovação' : 'Cancelar renovação'}
            </button>
          )}
        </section>

        {!plano.pro && (
          <section className="cartao p-5 shadow-[6px_6px_0_0_var(--color-slate-900)] sm:p-6" style={{ borderColor: 'var(--color-slate-900)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-3xl font-bold tracking-tight text-slate-900 uppercase">OrçaFácil Pro</p>
              <div role="radiogroup" aria-label="Ciclo de cobrança" className="flex overflow-hidden rounded-full border border-slate-900 text-sm font-medium">
                {(['mensal', 'anual'] as const).map((c) => (
                  <button
                    key={c}
                    role="radio"
                    aria-checked={ciclo === c}
                    onClick={() => setCiclo(c)}
                    className={`px-3 py-1.5 ${ciclo === c ? 'bg-slate-900 text-slate-50' : 'text-slate-700'}`}
                  >
                    {c === 'mensal' ? 'Mensal' : 'Anual'}
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-4 font-display text-5xl font-bold text-slate-900">
              {formatarMoeda(ciclo === 'anual' ? PRECO.anual : PRECO.mensal)}
              <span className="text-lg font-medium text-slate-500">/{ciclo === 'anual' ? 'ano' : 'mês'}</span>
            </p>
            {ciclo === 'anual' && <p className="mt-1 text-sm text-emerald-700">Equivale a {formatarMoeda(PRECO.anual / 12)} por mês (2 meses grátis).</p>}
            <ul className="mt-5 space-y-2 text-sm text-slate-800">
              {PRO.map((r) => (
                <li key={r} className="flex gap-2.5">
                  <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /> {r}
                </li>
              ))}
            </ul>
            <button className="btn-destaque mt-6 w-full py-3 text-[15px]" disabled={ocupado} onClick={() => void assinar()}>
              {ocupado ? 'Abrindo o pagamento…' : 'Assinar o Pro'}
            </button>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <Icone nome="cadeado" className="h-3.5 w-3.5" /> Pagamento com cartão na página segura do Stripe. Cancele quando quiser.
            </p>
          </section>
        )}
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {[
          ['Grátis', GRATIS],
          ['Pro', PRO],
        ].map(([nome, lista]) => (
          <div key={nome as string} className="border-t-2 border-slate-900 pt-4">
            <p className="etiqueta">{nome as string}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
              {(lista as string[]).map((r) => (
                <li key={r}>— {r}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </>
  )
}
