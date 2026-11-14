import { useLiveQuery } from 'dexie-react-hooks'
import { useDeferredValue, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth'
import { avisar, confirmar } from '../../components/Avisos'
import { CampoNumero } from '../../components/CampoNumero'
import { Distribuicao, GraficoBarras } from '../../components/Graficos'
import { Carregando, Icone, SeloStatus, Titulo } from '../../components/ui'
import { criarOrcamento, db, duplicarOrcamento, excluirOrcamento, type Orcamento } from '../../db'
import { calcularTotais } from '../../lib/calculos'
import { carregarExemplos } from '../../lib/exemplo'
import { formatarData, formatarMoeda, formatarNumero } from '../../lib/formato'
import { ROTULO_STATUS, statusExibido, type StatusExibido } from '../../lib/status'
import { resumoVisitante } from '../../lib/sync'

const POR_PAGINA = 20
type Periodo = '30' | '90' | '365' | 'tudo'

const moedaCurta = (n: number) =>
  n >= 1000 ? `R$ ${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : formatarMoeda(n)

/** Últimos N meses (rótulo "nov/26") com a chave "2026-10". */
function ultimosMeses(n: number) {
  const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const agora = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (n - 1 - i), 1)
    return { chave: `${d.getFullYear()}-${d.getMonth()}`, rotulo: `${meses[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` }
  })
}
const chaveMes = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${d.getMonth()}`
}

export function Painel() {
  const navegar = useNavigate()
  const { usuario } = useAuth()
  const orcamentos = useLiveQuery(() => db.orcamentos.orderBy('atualizadoEm').reverse().toArray())
  const visitante = useLiveQuery(() => (usuario ? resumoVisitante() : Promise.resolve(null)), [usuario?.id])
  const [busca, setBusca] = useState('')
  const buscaAdiada = useDeferredValue(busca)
  const [status, setStatus] = useState<StatusExibido | 'todos'>('todos')
  const [periodo, setPeriodo] = useState<Periodo>('tudo')
  const [cliente, setCliente] = useState('')
  const [minimo, setMinimo] = useState(0)
  const [maximo, setMaximo] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  const comTotais = useMemo(
    () => (orcamentos ?? []).map((o) => ({ o, total: calcularTotais(o).total, status: statusExibido(o) })),
    [orcamentos],
  )

  const clientes = useMemo(() => [...new Set(comTotais.map((x) => x.o.cliente.nome).filter(Boolean))].sort(), [comTotais])

  // Período, cliente e valor valem para indicadores, gráficos e lista; busca e status só para a lista
  const noPeriodo = useMemo(() => {
    const desde = periodo === 'tudo' ? 0 : Date.now() - Number(periodo) * 86_400_000
    return comTotais.filter(
      (x) =>
        x.o.criadoEm >= desde &&
        (!cliente || x.o.cliente.nome === cliente) &&
        (!minimo || x.total >= minimo) &&
        (!maximo || x.total <= maximo),
    )
  }, [comTotais, periodo, cliente, minimo, maximo])

  const lista = useMemo(() => {
    const termo = buscaAdiada.trim().toLowerCase()
    return noPeriodo.filter(
      (x) =>
        (status === 'todos' || x.status === status) &&
        (!termo || x.o.titulo.toLowerCase().includes(termo) || x.o.cliente.nome.toLowerCase().includes(termo) || String(x.o.numero).includes(termo)),
    )
  }, [noPeriodo, buscaAdiada, status])

  const resumo = useMemo(() => {
    const ativos = noPeriodo.filter((x) => x.status !== 'cancelado')
    const conta = (s: StatusExibido[]) => ativos.filter((x) => s.includes(x.status))
    const soma = (l: typeof ativos) => l.reduce((t, x) => t + x.total, 0)
    const aprovados = conta(['aprovado'])
    const recusados = conta(['recusado'])
    const decididos = aprovados.length + recusados.length
    return {
      total: ativos.length,
      pendentes: conta(['pendente', 'visualizado']).length,
      aprovados: aprovados.length,
      recusados: recusados.length,
      valorTotal: soma(ativos),
      valorAprovado: soma(aprovados),
      taxa: decididos ? Math.round((aprovados.length / decididos) * 100) : null,
    }
  }, [noPeriodo])

  const graficos = useMemo(() => {
    const meses = ultimosMeses(6)
    const criados = meses.map((m) => {
      const doMes = noPeriodo.filter((x) => chaveMes(x.o.criadoEm) === m.chave)
      return { rotulo: m.rotulo, valor: doMes.length, destaque: doMes.filter((x) => x.status === 'aprovado').length }
    })
    const valores = meses.map((m) => {
      const doMes = noPeriodo.filter((x) => chaveMes(x.o.criadoEm) === m.chave && x.status !== 'cancelado')
      return {
        rotulo: m.rotulo,
        valor: doMes.reduce((t, x) => t + x.total, 0),
        destaque: doMes.filter((x) => x.status === 'aprovado').reduce((t, x) => t + x.total, 0),
      }
    })
    const cores: Record<StatusExibido, string> = {
      rascunho: 'bg-slate-400',
      pendente: 'bg-amber-500',
      visualizado: 'bg-sky-700',
      aprovado: 'bg-emerald-500',
      recusado: 'bg-rose-500',
      expirado: 'bg-slate-500',
      cancelado: 'bg-slate-300',
    }
    const distribuicao = (Object.keys(ROTULO_STATUS) as StatusExibido[]).map((s) => ({
      rotulo: ROTULO_STATUS[s],
      valor: noPeriodo.filter((x) => x.status === s).length,
      cor: cores[s],
    }))
    return { criados, valores, distribuicao }
  }, [noPeriodo])

  async function novo() {
    const id = await criarOrcamento()
    navegar(`/app/orcamentos/${id}`)
  }

  async function excluir(o: Orcamento) {
    const ok = await confirmar({
      titulo: `Excluir o orçamento ${formatarNumero(o.numero)}?`,
      mensagem: usuario ? 'Ele será removido deste aparelho e da nuvem. Links enviados deixam de funcionar.' : 'Essa ação não pode ser desfeita.',
      botao: 'Excluir',
      perigo: true,
    })
    if (!ok) return
    await excluirOrcamento(o.id!)
    avisar('Orçamento excluído.')
  }

  function limparTudo() {
    setBusca('')
    setStatus('todos')
    setPeriodo('tudo')
    setCliente('')
    setMinimo(0)
    setMaximo(0)
    setPagina(1)
  }

  if (!orcamentos) return <Carregando />

  const filtrosAtivos = periodo !== 'tudo' || !!cliente || !!minimo || !!maximo
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const visiveis = lista.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)
  const botaoAcao = 'grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900'

  return (
    <>
      <Titulo
        titulo={usuario?.nome ? `Olá, ${usuario.nome.split(' ')[0]}` : 'Painel'}
        subtitulo="Acompanhe suas propostas, valores e aprovações."
        acoes={
          <button className="btn-primario" onClick={novo}>
            <Icone nome="mais" /> Novo orçamento
          </button>
        }
      />

      {visitante && visitante.orcamentos > 0 && !visitante.importado && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl bg-marca-50 p-4 text-sm text-marca-800 ring-1 ring-marca-100 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Encontramos <strong>{visitante.orcamentos} orçamento(s)</strong> criados neste navegador antes de você entrar.
          </p>
          <Link to="/app/conta" className="btn-secundario shrink-0">Trazer para a conta</Link>
        </div>
      )}

      {orcamentos.length === 0 ? (
        <div className="cartao relative flex flex-col items-center overflow-hidden px-6 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-slate-200 text-slate-500">
            <Icone nome="documento" className="h-8 w-8" />
          </div>
          <h2 className="mt-5 text-lg font-semibold text-slate-900">Crie seu primeiro orçamento</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Adicione itens com fotos, veja a prévia em tempo real e gere o PDF. Se quiser, carregue exemplos para conhecer o app.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button className="btn-primario" onClick={novo}>
              <Icone nome="mais" /> Criar orçamento
            </button>
            <button className="btn-secundario" onClick={() => void carregarExemplos()}>
              Carregar exemplos
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <div role="radiogroup" aria-label="Período" className="inline-flex flex-wrap rounded-xl bg-slate-200/60 p-1 text-xs font-semibold">
              {(
                [
                  ['30', '30 dias'],
                  ['90', '90 dias'],
                  ['365', '12 meses'],
                  ['tudo', 'Tudo'],
                ] as [Periodo, string][]
              ).map(([v, r]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={periodo === v}
                  onClick={() => {
                    setPeriodo(v)
                    setPagina(1)
                  }}
                  className={`min-h-9 rounded-lg px-3 transition ${periodo === v ? 'bg-superficie text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              className={`btn-secundario min-h-10 py-1.5 text-xs ${filtrosAtivos ? 'border-marca-300 text-marca-700' : ''}`}
              aria-expanded={filtrosAbertos}
              onClick={() => setFiltrosAbertos((a) => !a)}
            >
              <Icone nome="filtro" /> Mais filtros{filtrosAtivos ? ' (ativos)' : ''}
            </button>
            {filtrosAtivos && (
              <button className="text-xs font-semibold text-marca-600 hover:text-marca-700" onClick={limparTudo}>
                Limpar filtros
              </button>
            )}
          </div>
          {filtrosAbertos && (
            <div className="cartao mb-6 grid animate-escala gap-4 p-4 sm:grid-cols-3">
              <label className="block">
                <span className="rotulo">Cliente</span>
                <select className="campo" value={cliente} onChange={(e) => setCliente(e.target.value)}>
                  <option value="">Todos os clientes</option>
                  {clientes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="rotulo">Valor mínimo (R$)</span>
                <CampoNumero valor={minimo} aoMudar={setMinimo} />
              </label>
              <label className="block">
                <span className="rotulo">Valor máximo (R$)</span>
                <CampoNumero valor={maximo} aoMudar={setMaximo} />
              </label>
            </div>
          )}

          <div className="cascata mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {[
              { rotulo: 'Orçamentos', valor: String(resumo.total), detalhe: `${resumo.pendentes} aguardando resposta`, icone: 'documento' },
              { rotulo: 'Valor total', valor: formatarMoeda(resumo.valorTotal), detalhe: 'sem os cancelados', icone: 'painel' },
              { rotulo: 'Valor aprovado', valor: formatarMoeda(resumo.valorAprovado), detalhe: `${resumo.aprovados} aprovados · ${resumo.recusados} recusados`, icone: 'check' },
              { rotulo: 'Taxa de aprovação', valor: resumo.taxa == null ? '—' : `${resumo.taxa}%`, detalhe: 'entre os já respondidos', icone: 'grafico' },
            ].map((c, i) => (
              <div key={c.rotulo} style={{ '--i': i } as CSSProperties} className="cartao flex p-4 sm:p-5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-[13px] text-slate-500">
                    {c.rotulo}
                    <Icone nome={c.icone} className="h-4 w-4 shrink-0 text-slate-400" />
                  </span>
                  <span className="mt-2 block truncate text-xl font-semibold tracking-tight tabular-nums text-slate-900 sm:text-2xl">{c.valor}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{c.detalhe}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <GraficoBarras titulo="Orçamentos por mês" dados={graficos.criados} formatar={(n) => String(n)} legenda={['Criados', 'Aprovados']} />
            <GraficoBarras titulo="Valores por mês" dados={graficos.valores} formatar={moedaCurta} legenda={['Propostos', 'Aprovados']} />
            <Distribuicao titulo="Distribuição por status" dados={graficos.distribuicao} />
          </div>

          <div className="cartao overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative lg:w-80">
                <Icone nome="busca" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  aria-label="Buscar orçamentos"
                  className="campo pl-9"
                  placeholder="Buscar por cliente, título ou nº"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value)
                    setPagina(1)
                  }}
                />
              </div>
              <div role="radiogroup" aria-label="Status" className="flex flex-wrap gap-1">
                {(['todos', 'rascunho', 'pendente', 'visualizado', 'aprovado', 'recusado', 'expirado', 'cancelado'] as const).map((s) => (
                  <button
                    key={s}
                    role="radio"
                    aria-checked={status === s}
                    onClick={() => {
                      setStatus(s)
                      setPagina(1)
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      status === s ? 'bg-slate-900 text-slate-50' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {s === 'todos' ? 'Todos' : ROTULO_STATUS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden grid-cols-[4.5rem_minmax(0,1fr)_6rem_8rem_7.5rem_14rem] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 lg:grid">
              <span>Nº</span>
              <span>Cliente / título</span>
              <span>Data</span>
              <span className="text-right">Valor</span>
              <span>Status</span>
              <span className="text-right">Ações</span>
            </div>
            <ul className="cascata divide-y divide-slate-100">
              {visiveis.map(({ o, total, status: st }, i) => (
                <li
                  key={o.uid}
                  style={{ '--i': i } as CSSProperties}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition hover:bg-slate-50 lg:grid-cols-[4.5rem_minmax(0,1fr)_6rem_8rem_7.5rem_14rem]"
                >
                  <span className="hidden font-mono text-xs font-semibold text-slate-500 lg:block">{formatarNumero(o.numero)}</span>
                  <Link to={`/app/orcamentos/${o.id}`} className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{o.cliente.nome || 'Cliente não informado'}</span>
                    <span className="block truncate text-xs text-slate-500">
                      <span className="lg:hidden">{formatarNumero(o.numero)} · {formatarData(o.criadoEm)} · </span>
                      {o.titulo || 'Sem título'}
                    </span>
                  </Link>
                  <span className="hidden text-sm text-slate-500 lg:block">{formatarData(o.criadoEm)}</span>
                  <span className="text-right text-sm font-semibold whitespace-nowrap tabular-nums text-slate-900">{formatarMoeda(total)}</span>
                  <span>
                    <SeloStatus status={st} />
                  </span>
                  <span className="flex justify-end gap-0.5">
                    <Link to={`/app/orcamentos/${o.id}/visualizar`} aria-label={`Visualizar e compartilhar ${formatarNumero(o.numero)}`} title="Visualizar e compartilhar" className={botaoAcao}>
                      <Icone nome="link" />
                    </Link>
                    <Link to={`/app/orcamentos/${o.id}`} aria-label={`Editar ${formatarNumero(o.numero)}`} title="Editar" className={botaoAcao}>
                      <Icone nome="editar" />
                    </Link>
                    <Link to={`/app/orcamentos/${o.id}/visualizar?pdf=1`} aria-label={`Exportar PDF de ${formatarNumero(o.numero)}`} title="Exportar PDF" className={botaoAcao}>
                      <Icone nome="download" />
                    </Link>
                    <button
                      aria-label={`Duplicar ${formatarNumero(o.numero)}`}
                      title="Duplicar"
                      className={botaoAcao}
                      onClick={async () => {
                        const novoId = await duplicarOrcamento(o.id!)
                        if (novoId) navegar(`/app/orcamentos/${novoId}`)
                      }}
                    >
                      <Icone nome="copiar" />
                    </button>
                    <button aria-label={`Excluir ${formatarNumero(o.numero)}`} title="Excluir" className={`${botaoAcao} hover:bg-red-50 hover:text-red-600`} onClick={() => void excluir(o)}>
                      <Icone nome="lixo" />
                    </button>
                  </span>
                </li>
              ))}
              {lista.length === 0 && (
                <li className="px-4 py-12 text-center text-sm text-slate-500">
                  Nenhum orçamento encontrado.{' '}
                  <button className="font-semibold text-marca-600 hover:text-marca-700" onClick={limparTudo}>
                    Limpar filtros
                  </button>
                </li>
              )}
            </ul>
            {totalPaginas > 1 && (
              <nav aria-label="Paginação" className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
                <span className="text-slate-500">
                  {lista.length} orçamentos · página {paginaAtual} de {totalPaginas}
                </span>
                <span className="flex gap-2">
                  <button className="btn-secundario px-3 py-1.5" disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>
                    Anterior
                  </button>
                  <button className="btn-secundario px-3 py-1.5" disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>
                    Próxima
                  </button>
                </span>
              </nav>
            )}
          </div>
        </>
      )}
    </>
  )
}
