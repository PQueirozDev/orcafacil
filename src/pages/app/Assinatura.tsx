import { Link, useNavigate } from 'react-router-dom'
import { cancelarAssinatura, obterPlano, precoTotal, useAuth } from '../../auth'
import { Icone, Titulo } from '../../components/ui'
import { formatarDataLonga, formatarMoeda } from '../../lib/formato'
import { confirmar } from '../../components/Avisos'

export function Assinatura() {
  const { sessao, assinatura } = useAuth()
  const navegar = useNavigate()
  if (!assinatura || !sessao) return null
  const plano = obterPlano(assinatura.plano)!

  const faturas = [{ data: assinatura.ativadaEm, valor: precoTotal(plano, assinatura.ciclo) }]

  return (
    <>
      <Titulo titulo="Assinatura" subtitulo="Gerencie seu plano e pagamentos." />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="cartao p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                Ativa
              </span>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">Plano {plano.nome}</h2>
              <p className="text-sm text-slate-500">
                {formatarMoeda(precoTotal(plano, assinatura.ciclo))} / {assinatura.ciclo === 'anual' ? 'ano' : 'mês'}
              </p>
            </div>
            <Link to="/precos" className="btn-secundario">
              Mudar de plano
            </Link>
          </div>
          <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-500">Assinante desde</dt>
              <dd className="font-medium text-slate-900">{formatarDataLonga(assinatura.ativadaEm)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Próxima cobrança</dt>
              <dd className="font-medium text-slate-900">{formatarDataLonga(assinatura.renovaEm)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Forma de pagamento</dt>
              <dd className="font-medium text-slate-900">
                {assinatura.metodo === 'pix' ? 'Pix' : `Cartão •••• ${assinatura.final || '0000'}`}
              </dd>
            </div>
          </dl>
          <ul className="mt-6 grid gap-2 border-t border-slate-100 pt-6 text-sm text-slate-600 sm:grid-cols-2">
            {plano.recursos.map((r) => (
              <li key={r} className="flex gap-2">
                <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-marca-600" /> {r}
              </li>
            ))}
          </ul>
        </section>

        <section className="cartao p-6">
          <h2 className="font-semibold text-slate-900">Faturas</h2>
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {faturas.map((f) => (
              <li key={f.data} className="flex items-center justify-between py-2.5">
                <span className="text-slate-600">{formatarDataLonga(f.data)}</span>
                <span className="font-medium text-slate-900">{formatarMoeda(f.valor)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Modo demonstração: nenhuma cobrança real foi feita.
          </p>
          <button
            className="btn-perigo mt-6 w-full"
            onClick={async () => {
              if (await confirmar({ titulo: 'Cancelar assinatura?', mensagem: 'Você perde o acesso ao app. Seus orçamentos continuam salvos neste navegador.', botao: 'Cancelar assinatura', perigo: true })) {
                cancelarAssinatura()
                navegar('/precos')
              }
            }}
          >
            Cancelar assinatura
          </button>
        </section>
      </div>
    </>
  )
}
