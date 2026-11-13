import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { criarOrcamento, db, duplicarOrcamento, type StatusOrcamento } from '../../db'
import { Carregando, Icone, SeloStatus, STATUS, Titulo } from '../../components/ui'
import { calcularTotais } from '../../lib/calculos'
import { carregarExemplos } from '../../lib/exemplo'
import { formatarData, formatarMoeda, formatarNumero } from '../../lib/formato'
import { avisar, confirmar } from '../../components/Avisos'

export function Painel() {
  const navegar = useNavigate()
  const orcamentos = useLiveQuery(() => db.orcamentos.orderBy('atualizadoEm').reverse().toArray())
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<StatusOrcamento | 'todos'>('todos')

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (orcamentos ?? [])
      .filter((o) => filtro === 'todos' || o.status === filtro)
      .filter(
        (o) =>
          !termo ||
          o.titulo.toLowerCase().includes(termo) ||
          o.cliente.nome.toLowerCase().includes(termo) ||
          String(o.numero).includes(termo),
      )
  }, [orcamentos, busca, filtro])

  const resumo = useMemo(() => {
    const todos = orcamentos ?? []
    const soma = (s?: StatusOrcamento) =>
      todos.filter((o) => !s || o.status === s).reduce((t, o) => t + calcularTotais(o).total, 0)
    const decididos = todos.filter((o) => o.status === 'aprovado' || o.status === 'recusado').length
    const aprovados = todos.filter((o) => o.status === 'aprovado').length
    return {
      total: todos.length,
      emAberto: soma('enviado'),
      aprovado: soma('aprovado'),
      conversao: decididos ? Math.round((aprovados / decididos) * 100) : 0,
    }
  }, [orcamentos])

  async function novo() {
    const id = await criarOrcamento()
    navegar(`/app/orcamentos/${id}`)
  }

  async function duplicar(id: number) {
    const novoId = await duplicarOrcamento(id)
    if (novoId) navegar(`/app/orcamentos/${novoId}`)
  }

  async function excluir(id: number, numero: number) {
    if (await confirmar({ titulo: `Excluir o orçamento ${formatarNumero(numero)}?`, mensagem: 'Essa ação não pode ser desfeita.', botao: 'Excluir', perigo: true })) {
      await db.orcamentos.delete(id)
      avisar('Orçamento excluído.')
    }
  }

  if (!orcamentos) return <Carregando />

  return (
    <>
      <Titulo
        titulo="Orçamentos"
        subtitulo="Crie, acompanhe e envie seus orçamentos."
        acoes={
          <button className="btn-primario" onClick={novo}>
            <Icone nome="mais" /> Novo orçamento
          </button>
        }
      />

      <div className="cascata mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { rotulo: 'Orçamentos criados', valor: String(resumo.total), icone: 'documento', cor: 'from-marca-500 to-violeta-600' },
          { rotulo: 'Aguardando resposta', valor: formatarMoeda(resumo.emAberto), icone: 'raio', cor: 'from-sky-500 to-cyan-500' },
          { rotulo: 'Total aprovado', valor: formatarMoeda(resumo.aprovado), icone: 'check', cor: 'from-emerald-500 to-teal-500' },
          { rotulo: 'Taxa de aprovação', valor: `${resumo.conversao}%`, icone: 'painel', cor: 'from-amber-500 to-orange-500' },
        ].map((c, i) => (
          <div key={c.rotulo} style={{ '--i': i } as CSSProperties} className="cartao-interativo flex items-center gap-4 p-5">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${c.cor}`}>
              <Icone nome={c.icone} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium text-slate-500">{c.rotulo}</span>
              <span className="block truncate text-xl font-bold tracking-tight text-slate-900 tabular-nums">{c.valor}</span>
            </span>
          </div>
        ))}
      </div>

      {orcamentos.length === 0 ? (
        <div className="cartao relative flex flex-col items-center overflow-hidden px-6 py-16 text-center">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-marca-50 to-transparent" />
          <div className="relative grid h-16 w-16 animate-flutuar place-items-center rounded-3xl bg-white text-marca-600 shadow-xl shadow-marca-600/15 ring-1 ring-marca-100">
            <Icone nome="documento" className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Nenhum orçamento ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Crie seu primeiro orçamento ou carregue dados de exemplo para ver como fica.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button className="btn-primario" onClick={novo}>
              <Icone nome="mais" /> Criar orçamento
            </button>
            <button className="btn-secundario" onClick={() => carregarExemplos()}>
              Carregar exemplos
            </button>
          </div>
        </div>
      ) : (
        <div className="cartao overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative sm:w-72">
              <Icone nome="busca" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="campo pl-9"
                placeholder="Buscar por cliente, título ou nº"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {(['todos', ...Object.keys(STATUS)] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFiltro(s as StatusOrcamento | 'todos')}
                  aria-pressed={filtro === s}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition duration-200 ${
                    filtro === s ? 'bg-marca-600 text-white shadow-md shadow-marca-600/25' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {s === 'todos' ? 'Todos' : STATUS[s as StatusOrcamento].rotulo}
                </button>
              ))}
            </div>
          </div>

          <ul className="cascata divide-y divide-slate-100">
            {lista.map((o, i) => (
              <li
                key={o.id}
                style={{ '--i': i } as CSSProperties}
                className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3.5 transition hover:bg-marca-50/40 md:grid-cols-[minmax(0,1fr)_auto_9rem_auto]"
              >
                <Link to={`/app/orcamentos/${o.id}`} className="col-span-2 flex min-w-0 items-center gap-4 md:col-span-1">
                  <span className="grid h-10 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 font-mono text-[11px] font-semibold text-slate-500 transition group-hover:bg-white group-hover:text-marca-600 group-hover:shadow-sm">
                    {formatarNumero(o.numero)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{o.titulo || 'Sem título'}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {o.cliente.nome || 'Cliente não informado'} · {formatarData(o.atualizadoEm)}
                    </span>
                  </span>
                </Link>
                <SeloStatus status={o.status} />
                <span className="text-right font-semibold whitespace-nowrap text-slate-900 tabular-nums">
                  {formatarMoeda(calcularTotais(o).total)}
                </span>
                <span className="col-span-2 flex justify-end gap-0.5 md:col-span-1">
                  <Link to={`/app/orcamentos/${o.id}/visualizar`} title="Visualizar / PDF" aria-label="Visualizar e gerar PDF" className="grid h-10 w-10 place-items-center rounded-xl transition text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <Icone nome="olho" />
                  </Link>
                  <button title="Duplicar" aria-label="Duplicar orçamento" onClick={() => duplicar(o.id!)} className="grid h-10 w-10 place-items-center rounded-xl transition text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <Icone nome="copiar" />
                  </button>
                  <button title="Excluir" aria-label="Excluir orçamento" onClick={() => excluir(o.id!, o.numero)} className="grid h-10 w-10 place-items-center rounded-xl transition text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Icone nome="lixo" />
                  </button>
                </span>
              </li>
            ))}
            {lista.length === 0 && (
              <li className="px-4 py-12 text-center text-sm text-slate-500">
                Nenhum orçamento encontrado.{' '}
                <button
                  className="font-semibold text-marca-600 hover:text-marca-700"
                  onClick={() => {
                    setBusca('')
                    setFiltro('todos')
                  }}
                >
                  Limpar filtros
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </>
  )
}
