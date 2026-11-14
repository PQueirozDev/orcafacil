import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { avisar } from '../../components/Avisos'
import { CampoNumero } from '../../components/CampoNumero'
import { DocumentoOrcamento } from '../../components/DocumentoOrcamento'
import { EnviarFoto } from '../../components/EnviarFoto'
import { PreviaA4 } from '../../components/PreviaA4'
import { AreaTexto, Campo, Carregando, Icone, SeloStatus } from '../../components/ui'
import {
  db,
  duplicarOrcamento,
  layoutDe,
  normalizarEmpresa,
  novoId,
  novoItem,
  registrarEvento,
  type DadosCliente,
  type ItemOrcamento,
  type ModeloId,
  type Orcamento,
  type StatusOrcamento,
} from '../../db'
import { calcularTotais, totalItem, validarOrcamento } from '../../lib/calculos'
import { formatarMoeda, formatarNumero } from '../../lib/formato'
import { layoutDoModelo, MODELOS } from '../../lib/modelos'
import { editavel, podeMudar, ROTULO_STATUS, statusExibido } from '../../lib/status'

const LIMITE_HISTORICO = 60

function Secao({ titulo, descricao, acoes, children }: { titulo: string; descricao?: string; acoes?: ReactNode; children: ReactNode }) {
  return (
    <section className="cartao p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          {descricao && <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>}
        </div>
        {acoes}
      </div>
      {children}
    </section>
  )
}

const botaoIcone = 'grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30'

export function EditorOrcamento() {
  const { id } = useParams()
  const idNum = Number(id)
  const navegar = useNavigate()
  const empresaSalva = useLiveQuery(() => db.empresa.get('principal'))
  const clientes = useLiveQuery(() => db.clientes.orderBy('nome').toArray())
  const statusNoBanco = useLiveQuery(() => db.orcamentos.get(idNum).then((o) => o?.status), [idNum])
  const [orc, setOrc] = useState<Orcamento | null | undefined>(undefined)
  const [salvo, setSalvo] = useState(true)
  const [erroSalvar, setErroSalvar] = useState(false)
  const [aba, setAba] = useState<'editar' | 'previa'>('editar')
  const timer = useRef<number | undefined>(undefined)
  const pendente = useRef<Orcamento | null>(null)
  const fila = useRef<Promise<void>>(Promise.resolve())
  const historico = useRef<{ passado: Orcamento[]; futuro: Orcamento[]; ultimo: number }>({ passado: [], futuro: [], ultimo: 0 })
  const [, forcar] = useState(0)

  useEffect(() => {
    db.orcamentos.get(idNum).then((o) => setOrc(o ?? null))
  }, [idNum])

  // Status pode mudar fora daqui (aprovação do cliente vinda da nuvem): reflete na tela
  useEffect(() => {
    if (statusNoBanco && orc && statusNoBanco !== orc.status) setOrc({ ...orc, status: statusNoBanco })
  }, [statusNoBanco]) // eslint-disable-line react-hooks/exhaustive-deps

  /** Grava em fila. O status nunca é gravado por aqui: ele tem fluxo próprio (mudarStatus / portal). */
  const gravar = useCallback(() => {
    window.clearTimeout(timer.current)
    fila.current = fila.current
      .catch(() => {})
      .then(async () => {
        const alvo = pendente.current
        if (!alvo) return
        try {
          await db.transaction('rw', db.orcamentos, async () => {
            const atual = await db.orcamentos.get(alvo.id!)
            if (!atual) return
            await db.orcamentos.put({ ...alvo, status: atual.status, sujo: 1 })
          })
        } catch {
          setErroSalvar(true)
          return
        }
        setErroSalvar(false)
        if (pendente.current === alvo) {
          pendente.current = null
          setSalvo(true)
        }
      })
    return fila.current
  }, [])

  useEffect(() => {
    const aoEsconder = () => document.visibilityState === 'hidden' && void gravar()
    const aoSair = (e: BeforeUnloadEvent) => {
      if (!pendente.current) return
      void gravar()
      e.preventDefault()
    }
    document.addEventListener('visibilitychange', aoEsconder)
    window.addEventListener('pagehide', gravar)
    window.addEventListener('beforeunload', aoSair)
    return () => {
      document.removeEventListener('visibilitychange', aoEsconder)
      window.removeEventListener('pagehide', gravar)
      window.removeEventListener('beforeunload', aoSair)
      void gravar()
    }
  }, [gravar])

  const aplicar = useCallback(
    (novo: Orcamento) => {
      pendente.current = novo
      setSalvo(false)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(gravar, 500)
      setOrc(novo)
    },
    [gravar],
  )

  const atualizar = useCallback(
    (mudanca: Partial<Orcamento> | ((o: Orcamento) => Partial<Orcamento>)) => {
      setOrc((atual) => {
        if (!atual || !editavel(atual.status)) return atual
        const parcial = typeof mudanca === 'function' ? mudanca(atual) : mudanca
        const novo = { ...atual, ...parcial, atualizadoEm: Date.now() }
        // Histórico para desfazer: digitação contínua (< 800 ms) vira um único passo
        const h = historico.current
        if (Date.now() - h.ultimo > 800) {
          h.passado = [...h.passado, atual].slice(-LIMITE_HISTORICO)
        }
        h.futuro = []
        h.ultimo = Date.now()
        pendente.current = novo
        setSalvo(false)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(gravar, 500)
        return novo
      })
    },
    [gravar],
  )

  const desfazer = useCallback(() => {
    const h = historico.current
    if (!orc || !h.passado.length) return
    const anterior = h.passado[h.passado.length - 1]
    h.passado = h.passado.slice(0, -1)
    h.futuro = [orc, ...h.futuro]
    h.ultimo = 0
    aplicar({ ...anterior, status: orc.status, atualizadoEm: Date.now() })
    forcar((n) => n + 1)
  }, [orc, aplicar])

  const refazer = useCallback(() => {
    const h = historico.current
    if (!orc || !h.futuro.length) return
    const [proximo, ...resto] = h.futuro
    h.futuro = resto
    h.passado = [...h.passado, orc]
    h.ultimo = 0
    aplicar({ ...proximo, status: orc.status, atualizadoEm: Date.now() })
    forcar((n) => n + 1)
  }, [orc, aplicar])

  // Ctrl+Z / Ctrl+Shift+Z fora dos campos de texto (dentro deles vale o desfazer do próprio campo)
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement
      if (alvo.closest('input, textarea, select, [contenteditable]')) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) refazer()
        else desfazer()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        refazer()
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [desfazer, refazer])

  const atualizarItem = (idItem: string, mudanca: Partial<ItemOrcamento>) =>
    atualizar((o) => ({ itens: o.itens.map((i) => (i.id === idItem ? { ...i, ...mudanca } : i)) }))

  const atualizarCliente = (mudanca: Partial<DadosCliente>) => atualizar((o) => ({ cliente: { ...o.cliente, ...mudanca } }))

  const moverItem = (indice: number, direcao: -1 | 1) =>
    atualizar((o) => {
      const itens = [...o.itens]
      const alvo = indice + direcao
      if (alvo < 0 || alvo >= itens.length) return {}
      ;[itens[indice], itens[alvo]] = [itens[alvo], itens[indice]]
      return { itens }
    })

  const duplicarItem = (indice: number) =>
    atualizar((o) => {
      const itens = [...o.itens]
      itens.splice(indice + 1, 0, { ...o.itens[indice], id: novoId() })
      return { itens }
    })

  async function mudarStatus(novo: StatusOrcamento) {
    if (!orc || !podeMudar(orc.status, novo)) return
    await gravar()
    await db.orcamentos.update(orc.id!, { status: novo })
    await registrarEvento(orc.uid, novo === 'cancelado' ? 'cancelamento' : 'status', { de: orc.status, para: novo })
    setOrc({ ...orc, status: novo })
    avisar(`Status alterado para ${ROTULO_STATUS[novo]}.`)
  }

  async function salvarComoCliente() {
    if (!orc?.cliente.nome.trim()) return avisar('Preencha o nome do cliente primeiro.', 'erro')
    const agora = Date.now()
    const uid = novoId()
    await db.clientes.add({ ...orc.cliente, uid, observacoes: '', criadoEm: agora, atualizadoEm: agora })
    atualizar({ clienteUid: uid })
    avisar('Cliente salvo na sua lista.')
  }

  async function trocarModelo(modelo: ModeloId) {
    const empresa = normalizarEmpresa(await db.empresa.get('principal'))
    await db.empresa.put({ ...empresa, corTema: MODELOS[modelo].cor, layout: layoutDoModelo(modelo), atualizadoEm: Date.now() })
    avisar(`Modelo ${MODELOS[modelo].nome} aplicado a todos os orçamentos.`)
  }

  async function duplicarComoNovo() {
    await gravar()
    const novo = await duplicarOrcamento(idNum)
    if (novo) navegar(`/app/orcamentos/${novo}`)
  }

  if (orc === undefined) return <Carregando />
  if (orc === null)
    return (
      <div className="cartao p-10 text-center">
        <p className="text-slate-600">Orçamento não encontrado.</p>
        <Link to="/app" className="btn-secundario mt-4">
          Voltar ao painel
        </Link>
      </div>
    )

  const empresa = normalizarEmpresa(empresaSalva)
  const totais = calcularTotais(orc)
  const problemas = validarOrcamento(orc)
  const bloqueado = !editavel(orc.status)
  const exibido = statusExibido(orc)
  const opcoesStatus = (Object.keys(ROTULO_STATUS) as (keyof typeof ROTULO_STATUS)[]).filter(
    (s): s is StatusOrcamento => s !== 'expirado' && s !== 'visualizado' && podeMudar(orc.status, s as StatusOrcamento),
  )
  if (orc.status === 'visualizado' && !opcoesStatus.includes('visualizado')) opcoesStatus.unshift('visualizado')

  return (
    <>
      {/* Barra superior */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/app" aria-label="Voltar ao painel" className={botaoIcone}>
            <Icone nome="voltar" className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Orçamento {formatarNumero(orc.numero)}</h1>
              <SeloStatus status={exibido} />
              {erroSalvar ? (
                <button role="status" onClick={() => void gravar()} className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100">
                  Erro ao salvar · tentar de novo
                </button>
              ) : (
                !bloqueado && (
                  <span
                    role="status"
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                      salvo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${salvo ? 'bg-emerald-500' : 'animate-pulse bg-slate-400'}`} />
                    {salvo ? 'Salvo neste aparelho' : 'Alterações não salvas…'}
                  </span>
                )
              )}
            </div>
            <p className="text-sm text-slate-500">
              Total: <strong className="tabular-nums text-slate-700">{formatarMoeda(totais.total)}</strong>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!bloqueado && (
            <div className="flex rounded-xl bg-slate-100 p-0.5">
              <button aria-label="Desfazer (Ctrl+Z)" title="Desfazer (Ctrl+Z)" className={botaoIcone} disabled={!historico.current.passado.length} onClick={desfazer}>
                <Icone nome="desfazer" />
              </button>
              <button aria-label="Refazer (Ctrl+Shift+Z)" title="Refazer (Ctrl+Shift+Z)" className={botaoIcone} disabled={!historico.current.futuro.length} onClick={refazer}>
                <Icone nome="refazer" />
              </button>
            </div>
          )}
          <label className="sr-only" htmlFor="status">Status</label>
          <select id="status" className="campo w-auto" value={orc.status} onChange={(e) => void mudarStatus(e.target.value as StatusOrcamento)}>
            {opcoesStatus.map((s) => (
              <option key={s} value={s} disabled={s === 'visualizado'}>
                {ROTULO_STATUS[s]}
              </option>
            ))}
          </select>
          <button
            className="btn-primario"
            onClick={async () => {
              await gravar()
              navegar(`/app/orcamentos/${orc.id}/visualizar`)
            }}
          >
            <Icone nome="link" /> Enviar / PDF
          </button>
        </div>
      </div>

      {bloqueado && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Este orçamento está <strong>{ROTULO_STATUS[orc.status].toLowerCase()}</strong> e não pode mais ser editado, para preservar o
            que foi decidido. Para propor outra versão, crie uma cópia.
          </p>
          <button className="btn-secundario shrink-0" onClick={() => void duplicarComoNovo()}>
            <Icone nome="copiar" /> Duplicar como novo
          </button>
        </div>
      )}

      {/* Alternador (celular/tablet) */}
      <div role="tablist" aria-label="Modo" className="mb-4 inline-flex rounded-xl bg-slate-200/60 p-1 text-sm font-medium xl:hidden">
        {(['editar', 'previa'] as const).map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={`min-h-10 rounded-lg px-5 transition ${aba === a ? 'bg-superficie text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            {a === 'editar' ? 'Editar orçamento' : 'Visualizar'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)]">
        <fieldset disabled={bloqueado} className={`min-w-0 space-y-6 ${aba === 'previa' ? 'hidden xl:block' : ''}`}>
          <Secao titulo="Dados gerais">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                className="sm:col-span-2"
                rotulo="Título do orçamento"
                placeholder="Ex.: Cozinha planejada, manutenção do ar-condicionado…"
                value={orc.titulo}
                maxLength={200}
                onChange={(e) => atualizar({ titulo: e.target.value })}
              />
              <Campo
                rotulo="Prazo de entrega"
                placeholder="Ex.: 20 dias úteis"
                value={orc.prazoEntrega}
                maxLength={120}
                onChange={(e) => atualizar({ prazoEntrega: e.target.value })}
              />
              <label className="block">
                <span className="rotulo">Validade (dias)</span>
                <CampoNumero
                  casas={0}
                  valor={orc.validadeDias}
                  aria-invalid={!(orc.validadeDias >= 1)}
                  aoMudar={(n) => atualizar({ validadeDias: Math.max(0, Math.round(n)) })}
                />
              </label>
            </div>
          </Secao>

          <Secao
            titulo="Cliente"
            descricao="Os dados ficam copiados neste orçamento: editar o cadastro depois não altera o que foi enviado."
            acoes={
              <div className="flex flex-wrap items-center gap-2">
                {!!clientes?.length && (
                  <>
                    <label className="sr-only" htmlFor="cliente-salvo">Escolher cliente salvo</label>
                    <select
                      id="cliente-salvo"
                      className="campo w-auto max-w-56 py-1.5"
                      value={orc.clienteUid ?? ''}
                      onChange={(e) => {
                        const c = clientes.find((x) => x.uid === e.target.value)
                        if (c)
                          atualizar({
                            clienteUid: c.uid,
                            cliente: { nome: c.nome, documento: c.documento, email: c.email, telefone: c.telefone, endereco: c.endereco },
                          })
                      }}
                    >
                      <option value="">Escolher cliente salvo…</option>
                      {clientes.map((c) => (
                        <option key={c.uid} value={c.uid}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                {!orc.clienteUid && orc.cliente.nome.trim() && (
                  <button type="button" className="btn-fantasma px-2 py-1.5 text-xs" onClick={salvarComoCliente}>
                    <Icone nome="mais" /> Salvar na lista
                  </button>
                )}
              </div>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome / Razão social *" value={orc.cliente.nome} maxLength={160} aria-invalid={!orc.cliente.nome.trim()} onChange={(e) => atualizarCliente({ nome: e.target.value })} />
              <Campo rotulo="CPF / CNPJ" value={orc.cliente.documento} maxLength={40} inputMode="numeric" onChange={(e) => atualizarCliente({ documento: e.target.value })} />
              <Campo rotulo="Telefone" type="tel" value={orc.cliente.telefone} maxLength={40} onChange={(e) => atualizarCliente({ telefone: e.target.value })} />
              <Campo rotulo="E-mail" type="email" value={orc.cliente.email} maxLength={160} onChange={(e) => atualizarCliente({ email: e.target.value })} />
              <Campo className="sm:col-span-2" rotulo="Endereço" value={orc.cliente.endereco} maxLength={300} onChange={(e) => atualizarCliente({ endereco: e.target.value })} />
            </div>
          </Secao>

          <Secao titulo="Produtos e serviços" descricao={`${orc.itens.length} ${orc.itens.length === 1 ? 'item' : 'itens'}`}>
            <ol className="space-y-3">
              {orc.itens.map((item, i) => (
                <li key={item.id} className="animate-entrada rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="shrink-0">
                      {item.foto ? (
                        <div className="group relative">
                          <img src={item.foto} alt={`Foto do item ${i + 1}`} className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />
                          <button
                            type="button"
                            aria-label={`Remover foto do item ${i + 1}`}
                            className="absolute -right-1.5 -top-1.5 rounded-full bg-superficie p-1 text-red-600 shadow ring-1 ring-slate-200 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                            onClick={() => atualizarItem(item.id, { foto: undefined })}
                          >
                            <Icone nome="x" className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <EnviarFoto
                          titulo={`Adicionar foto ao item ${i + 1}`}
                          lado={800}
                          aoEnviar={([f]) => atualizarItem(item.id, { foto: f })}
                          className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-slate-300 bg-superficie text-slate-400 transition hover:border-marca-500 hover:text-marca-600 disabled:cursor-default"
                        >
                          <span className="flex flex-col items-center gap-1 text-[10px] font-medium">
                            <Icone nome="foto" className="h-5 w-5" /> Foto
                          </span>
                        </EnviarFoto>
                      )}
                    </div>

                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-12">
                      <input
                        aria-label={`Descrição do item ${i + 1}`}
                        className="campo sm:col-span-12"
                        placeholder={`Item ${i + 1}: descrição`}
                        value={item.descricao}
                        maxLength={300}
                        onChange={(e) => atualizarItem(item.id, { descricao: e.target.value })}
                      />
                      <input
                        aria-label={`Detalhes do item ${i + 1}`}
                        className="campo text-xs sm:col-span-12"
                        placeholder="Detalhes (opcional): material, cor, medidas…"
                        value={item.detalhes}
                        maxLength={600}
                        onChange={(e) => atualizarItem(item.id, { detalhes: e.target.value })}
                      />
                      <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2 sm:col-span-5">
                        <label className="block">
                          <span className="rotulo">Quantidade</span>
                          <CampoNumero casas={3} valor={item.quantidade} aria-invalid={!(item.quantidade > 0)} aoMudar={(n) => atualizarItem(item.id, { quantidade: n })} />
                        </label>
                        <label className="block">
                          <span className="rotulo">Unidade</span>
                          <input className="campo" value={item.unidade} maxLength={12} onChange={(e) => atualizarItem(item.id, { unidade: e.target.value })} />
                        </label>
                      </div>
                      <label className="block sm:col-span-4">
                        <span className="rotulo">Preço unitário (R$)</span>
                        <CampoNumero valor={item.valorUnitario} aoMudar={(n) => atualizarItem(item.id, { valorUnitario: Math.max(0, n) })} />
                      </label>
                      <div className="flex items-end justify-end pb-2.5 text-sm font-semibold tabular-nums text-slate-900 sm:col-span-3">
                        {formatarMoeda(totalItem(item))}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-row justify-end gap-0.5 sm:flex-col">
                      <button type="button" aria-label={`Mover item ${i + 1} para cima`} disabled={i === 0} onClick={() => moverItem(i, -1)} className={botaoIcone}>
                        <Icone nome="subir" className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" aria-label={`Mover item ${i + 1} para baixo`} disabled={i === orc.itens.length - 1} onClick={() => moverItem(i, 1)} className={botaoIcone}>
                        <Icone nome="baixar" className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" aria-label={`Duplicar item ${i + 1}`} onClick={() => duplicarItem(i)} className={botaoIcone}>
                        <Icone nome="copiar" className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remover item ${i + 1}`}
                        onClick={() => atualizar((o) => ({ itens: o.itens.filter((x) => x.id !== item.id) }))}
                        className={`${botaoIcone} hover:bg-red-50 hover:text-red-600`}
                      >
                        <Icone nome="lixo" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" className="btn-secundario mt-3 w-full border-dashed" onClick={() => atualizar((o) => ({ itens: [...o.itens, novoItem()] }))}>
              <Icone nome="mais" /> Adicionar item
            </button>

            <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-3">
              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <label className="block">
                  <span className="rotulo">Desconto</span>
                  <CampoNumero valor={orc.desconto} aoMudar={(n) => atualizar({ desconto: Math.max(0, n) })} />
                </label>
                <select
                  aria-label="Tipo de desconto"
                  className="campo w-auto"
                  value={orc.descontoTipo}
                  onChange={(e) => atualizar({ descontoTipo: e.target.value as Orcamento['descontoTipo'] })}
                >
                  <option value="percentual">%</option>
                  <option value="valor">R$</option>
                </select>
              </div>
              <label className="block">
                <span className="rotulo">Impostos (%) — opcional</span>
                <CampoNumero valor={orc.impostoPercentual} aoMudar={(n) => atualizar({ impostoPercentual: Math.min(100, Math.max(0, n)) })} />
              </label>
              <label className="block">
                <span className="rotulo">Frete / deslocamento (R$)</span>
                <CampoNumero valor={orc.frete} aoMudar={(n) => atualizar({ frete: Math.max(0, n) })} />
              </label>
              <dl className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm tabular-nums sm:col-span-3">
                <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatarMoeda(totais.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Desconto</dt><dd>− {formatarMoeda(totais.desconto)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Impostos</dt><dd>{formatarMoeda(totais.imposto)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Frete</dt><dd>{formatarMoeda(totais.frete)}</dd></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold text-slate-900"><dt>Total</dt><dd>{formatarMoeda(totais.total)}</dd></div>
              </dl>
            </div>
          </Secao>

          <Secao
            titulo="Fotos do orçamento"
            descricao="Projeto, local, produtos ou referências. Aparecem no PDF e no link."
            acoes={
              <EnviarFoto
                multiplo
                className="btn-secundario"
                aoEnviar={(fotos) => atualizar((o) => ({ fotos: [...o.fotos, ...fotos.map((src) => ({ id: novoId(), src, legenda: '' }))] }))}
              >
                <Icone nome="foto" /> Adicionar fotos
              </EnviarFoto>
            }
          >
            {orc.fotos.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">Nenhuma foto adicionada.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {orc.fotos.map((f, i) => (
                  <div key={f.id} className="group relative">
                    <img src={f.src} alt={f.legenda || `Foto ${i + 1}`} className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-slate-200" />
                    <button
                      type="button"
                      aria-label={`Remover foto ${i + 1}`}
                      className="absolute right-1.5 top-1.5 rounded-full bg-superficie/90 p-1.5 text-red-600 shadow transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      onClick={() => atualizar((o) => ({ fotos: o.fotos.filter((x) => x.id !== f.id) }))}
                    >
                      <Icone nome="lixo" className="h-3.5 w-3.5" />
                    </button>
                    <input
                      aria-label={`Legenda da foto ${i + 1}`}
                      className="campo mt-1.5 py-1 text-xs"
                      placeholder="Legenda (opcional)"
                      value={f.legenda}
                      maxLength={140}
                      onChange={(e) => atualizar((o) => ({ fotos: o.fotos.map((x) => (x.id === f.id ? { ...x, legenda: e.target.value } : x)) }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </Secao>

          <Secao titulo="Condições, observações e termos" descricao="Os textos padrão vêm de Empresa e podem ser ajustados aqui.">
            <div className="grid gap-4 sm:grid-cols-2">
              <AreaTexto rotulo="Condições de pagamento" value={orc.condicoesPagamento} maxLength={2000} onChange={(e) => atualizar({ condicoesPagamento: e.target.value })} />
              <AreaTexto rotulo="Observações" value={orc.observacoes} maxLength={2000} onChange={(e) => atualizar({ observacoes: e.target.value })} />
              <AreaTexto className="sm:col-span-2" rotulo="Termos e condições" value={orc.termos} maxLength={5000} onChange={(e) => atualizar({ termos: e.target.value })} />
            </div>
          </Secao>

          <Secao
            titulo="Sua empresa e aparência"
            acoes={
              <Link to="/app/configuracoes" className="btn-fantasma px-2 py-1.5 text-xs">
                <Icone nome="editar" /> Editar dados
              </Link>
            }
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="text-sm">
                <div className="font-semibold text-slate-900">{empresa.nome || 'Empresa sem nome'}</div>
                <div className="text-slate-500">{[empresa.telefone, empresa.email].filter(Boolean).join(' · ') || 'Adicione telefone e e-mail em Empresa.'}</div>
              </div>
              <label className="block sm:w-56">
                <span className="rotulo">Modelo visual</span>
                <select className="campo" value={layoutDe(empresa).modelo} onChange={(e) => void trocarModelo(e.target.value as ModeloId)}>
                  {(Object.keys(MODELOS) as ModeloId[]).map((m) => (
                    <option key={m} value={m}>
                      {MODELOS[m].nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </Secao>
        </fieldset>

        {/* Prévia */}
        <div className={aba === 'editar' ? 'hidden xl:block' : ''}>
          <div className="sticky top-20 space-y-3">
            {problemas.length > 0 && !bloqueado && (
              <div role="status" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-amber-200">
                <p className="font-semibold">Antes de enviar:</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {problemas.map((p) => (
                    <li key={p.mensagem}>{p.mensagem}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Prévia ao vivo (igual ao PDF)</span>
              <Link to="/app/modelo" className="hover:text-slate-900">Personalizar aparência →</Link>
            </div>
            <div className="max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl bg-slate-200/70 p-3">
              <PreviaA4>
                <DocumentoOrcamento orcamento={orc} empresa={empresa} />
              </PreviaA4>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
