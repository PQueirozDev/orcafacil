import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DESCONTO_ANUAL, PLANOS, precoPorMes, testarSemCadastro, useAuth, type Ciclo } from '../auth'
import { Icone } from '../components/ui'
import { formatarMoeda } from '../lib/formato'

const PERGUNTAS = [
  ['Preciso instalar alguma coisa?', 'Não. O Orçafácil funciona direto no navegador, no computador ou no celular.'],
  ['Posso cancelar quando quiser?', 'Sim. Sem multa e sem fidelidade no plano mensal.'],
  ['Onde ficam meus orçamentos?', 'No seu próprio dispositivo. Você pode exportar um backup a qualquer momento.'],
  ['Esta é uma cobrança real?', 'Não. Este site é um protótipo de demonstração e nenhum valor é cobrado.'],
]

export function Precos() {
  const [ciclo, setCiclo] = useState<Ciclo>('mensal')
  const [params] = useSearchParams()
  const { assinatura } = useAuth()
  const navegar = useNavigate()

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      {params.get('motivo') === 'assinatura' && (
        <div className="mx-auto mb-8 max-w-xl rounded-lg bg-amber-50 px-4 py-3 text-center text-sm text-amber-800 ring-1 ring-amber-200">
          Para acessar o aplicativo, escolha um plano abaixo.
        </div>
      )}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Planos simples, sem surpresa</h1>
        <p className="mt-3 text-slate-600">Assine e tenha acesso completo ao gerador de orçamentos.</p>
        {!assinatura && (
          <button
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-marca-600 hover:text-marca-700"
            onClick={() => {
              testarSemCadastro()
              navegar('/app')
            }}
          >
            Só quero testar: pular cadastro e pagamento <Icone nome="seta" />
          </button>
        )}

        <div className="mt-8 inline-flex rounded-full bg-slate-100 p-1 text-sm font-medium">
          {(['mensal', 'anual'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCiclo(c)}
              className={`rounded-full px-5 py-2 transition ${ciclo === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              {c === 'mensal' ? 'Mensal' : 'Anual'}
              {c === 'anual' && (
                <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                  −{DESCONTO_ANUAL * 100}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PLANOS.map((p) => {
          const atual = assinatura?.plano === p.id
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl bg-white p-7 ${
                p.destaque ? 'shadow-xl ring-2 ring-marca-600' : 'shadow-sm ring-1 ring-slate-200'
              }`}
            >
              {p.destaque && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-marca-600 px-3 py-1 text-xs font-semibold text-white">
                  Mais escolhido
                </span>
              )}
              <h2 className="text-lg font-semibold text-slate-900">{p.nome}</h2>
              <p className="mt-1 text-sm text-slate-500">{p.descricao}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                  {formatarMoeda(precoPorMes(p, ciclo))}
                </span>
                <span className="text-sm text-slate-500">/mês</span>
              </div>
              <p className="mt-1 h-5 text-xs text-slate-500">
                {ciclo === 'anual' ? `cobrado ${formatarMoeda(precoPorMes(p, ciclo) * 12)} por ano` : ''}
              </p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
                {p.recursos.map((r) => (
                  <li key={r} className="flex gap-2.5">
                    <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-marca-600" />
                    {r}
                  </li>
                ))}
              </ul>
              {atual ? (
                <Link to="/app" className="btn-secundario mt-8 w-full">
                  Seu plano atual · abrir o app
                </Link>
              ) : (
                <Link
                  to={`/checkout/${p.id}?ciclo=${ciclo}`}
                  className={`${p.destaque ? 'btn-primario' : 'btn-secundario'} mt-8 w-full`}
                >
                  Assinar {p.nome}
                </Link>
              )}
            </div>
          )
        })}
      </div>

      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-slate-900">Perguntas frequentes</h2>
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl bg-white ring-1 ring-slate-200">
          {PERGUNTAS.map(([p, r]) => (
            <details key={p} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-slate-900">
                {p}
                <Icone nome="mais" className="h-4 w-4 text-slate-400 transition group-open:rotate-45" />
              </summary>
              <p className="mt-2 text-sm text-slate-600">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  )
}
