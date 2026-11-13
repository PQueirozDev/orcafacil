import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { assinar, obterPlano, precoTotal, useAuth, type Ciclo } from '../auth'
import { Campo, Icone, Marca, SimboloCartao, SimboloPix } from '../components/ui'
import { formatarMoeda } from '../lib/formato'

export function Checkout() {
  const { plano: idPlano } = useParams()
  const [params] = useSearchParams()
  const navegar = useNavigate()
  const { sessao } = useAuth()
  const plano = obterPlano(idPlano)
  const ciclo: Ciclo = params.get('ciclo') === 'anual' ? 'anual' : 'mensal'

  const [metodo, setMetodo] = useState<'cartao' | 'pix'>('pix')
  const [numero, setNumero] = useState('')
  const [processando, setProcessando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  if (!plano) return <Navigate to="/precos" replace />
  if (!sessao) {
    const aqui = `/checkout/${plano.id}?ciclo=${ciclo}`
    return <Navigate to={`/entrar?modo=cadastrar&voltar=${encodeURIComponent(aqui)}`} replace />
  }

  const total = precoTotal(plano, ciclo)

  function concluir(atraso: number) {
    setProcessando(true)
    setTimeout(() => {
      const final = metodo === 'cartao' ? numero.replace(/\D/g, '').slice(-4) || undefined : undefined
      assinar(plano!.id, ciclo, metodo, final)
      setConcluido(true)
      setTimeout(() => navegar('/app', { replace: true }), 1200)
    }, atraso)
  }

  function pagar(ev: FormEvent) {
    ev.preventDefault()
    concluir(1100)
  }

  const formatarCartao = (v: string) =>
    v
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(\d{4})(?=\d)/g, '$1 ')

  if (concluido) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="cartao max-w-sm p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <Icone nome="check" className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-xl font-bold text-slate-900">Assinatura ativada!</h1>
          <p className="mt-2 text-sm text-slate-500">Bem-vindo ao plano {plano.nome}. Abrindo o aplicativo…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Marca />
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icone nome="cadeado" className="h-3.5 w-3.5" /> Pagamento seguro (simulado)
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
        <form onSubmit={pagar} className="cartao p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-900">Finalizar assinatura</h1>
          <p className="mt-1 text-sm text-slate-500">Logado como {sessao.email}</p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            {(
              [
                ['pix', 'Pix', <SimboloPix className="h-6 w-6" />],
                ['cartao', 'Cartão de crédito', <SimboloCartao className="h-5 w-7" />],
              ] as const
            ).map(([valor, rotulo, simbolo]) => (
              <button
                type="button"
                key={valor}
                onClick={() => setMetodo(valor)}
                className={`flex items-center gap-2.5 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition ${
                  metodo === valor ? 'border-marca-600 bg-marca-50 text-marca-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                {simbolo} {rotulo}
              </button>
            ))}
          </div>

          {metodo === 'cartao' ? (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Campo
                className="col-span-2"
                rotulo="Número do cartão"
                inputMode="numeric"
                placeholder="4242 4242 4242 4242"
                value={numero}
                onChange={(e) => setNumero(formatarCartao(e.target.value))}
              />
              <Campo className="col-span-2" rotulo="Nome impresso no cartão" placeholder="Opcional no modo de testes" />
              <Campo rotulo="Validade" placeholder="MM/AA" maxLength={5} />
              <Campo rotulo="CVV" placeholder="123" inputMode="numeric" maxLength={4} />
            </div>
          ) : (
            <div className="mt-6 flex flex-col items-center gap-4 rounded-xl bg-slate-50 p-6 text-center sm:flex-row sm:text-left">
              <div className="grid h-32 w-32 shrink-0 grid-cols-8 gap-0.5 rounded-lg bg-white p-2 ring-1 ring-slate-200">
                {Array.from({ length: 64 }, (_, i) => (
                  <span key={i} className={(i * 37 + (i % 7) * 11) % 3 === 0 ? 'bg-slate-900' : 'bg-white'} />
                ))}
              </div>
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-900">QR Code Pix (ilustrativo)</p>
                <p className="mt-1">Em um sistema real, você escanearia este código no app do banco. Aqui, basta clicar em confirmar.</p>
              </div>
            </div>
          )}

          <button className="btn-primario mt-8 w-full py-3 text-base" disabled={processando}>
            {processando ? 'Processando pagamento…' : `Confirmar e pagar ${formatarMoeda(total)}`}
          </button>
          <button
            type="button"
            className="btn-fantasma mt-2 w-full text-marca-700"
            disabled={processando}
            onClick={() => concluir(300)}
          >
            Pular pagamento (modo de testes) <Icone nome="seta" />
          </button>
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
            Modo de testes: nenhum dado é enviado e nada é cobrado. Os campos são opcionais.
          </p>
        </form>

        <aside className="cartao h-fit p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Resumo</h2>
          <div className="mt-4 flex items-start justify-between">
            <div>
              <div className="font-semibold text-slate-900">Plano {plano.nome}</div>
              <div className="text-sm text-slate-500">Cobrança {ciclo}</div>
            </div>
            <Link to="/precos" className="text-xs font-semibold text-marca-600 hover:text-marca-700">
              Trocar
            </Link>
          </div>
          <ul className="mt-5 space-y-2 border-t border-slate-100 pt-5 text-sm text-slate-600">
            {plano.recursos.map((r) => (
              <li key={r} className="flex gap-2">
                <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-marca-600" /> {r}
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-baseline justify-between border-t border-slate-100 pt-5">
            <span className="font-semibold text-slate-900">Total hoje</span>
            <span className="text-2xl font-extrabold text-slate-900">{formatarMoeda(total)}</span>
          </div>
        </aside>
      </div>
    </div>
  )
}
