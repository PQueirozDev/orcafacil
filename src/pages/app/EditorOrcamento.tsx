import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CampoNumero } from '../../components/CampoNumero'
import { DocumentoOrcamento } from '../../components/DocumentoOrcamento'
import { EnviarFoto } from '../../components/EnviarFoto'
import { PreviaA4 } from '../../components/PreviaA4'
import { AreaTexto, Campo, Carregando, Icone, STATUS } from '../../components/ui'
import {
  db,
  EMPRESA_PADRAO,
  novoId,
  novoItem,
  type DadosCliente,
  type ItemOrcamento,
  type Orcamento,
  type StatusOrcamento,
} from '../../db'
import { calcularTotais, totalItem } from '../../lib/calculos'
import { formatarMoeda, formatarNumero } from '../../lib/formato'
import { avisar } from '../../components/Avisos'

export function EditorOrcamento() {
  const { id } = useParams()
  const idNum = Number(id)
  const navegar = useNavigate()
  const empresa = useLiveQuery(() => db.empresa.get('principal'))
  const clientes = useLiveQuery(() => db.clientes.orderBy('nome').toArray())
  const [orc, setOrc] = useState<Orcamento | null | undefined>(undefined)
  const [salvo, setSalvo] = useState(true)
  const [erroSalvar, setErroSalvar] = useState(false)
  const [aba, setAba] = useState<'editar' | 'previa'>('editar')
  const timer = useRef<number | undefined>(undefined)
  const pendente = useRef<Orcamento | null>(null)

  useEffect(() => {
    db.orcamentos.get(idNum).then((o) => setOrc(o ?? null))
  }, [idNum])

  const fila = useRef<Promise<void>>(Promise.resolve())

  // Gravações em fila: uma edição feita durante o put() não é descartada
  const gravar = useCallback(() => {
    window.clearTimeout(timer.current)
    // .catch antes do .then: uma falha não trava as gravações seguintes
    fila.current = fila.current
      .catch(() => {})
      .then(async () => {
        const alvo = pendente.current
        if (!alvo) return
        try {
          await db.orcamentos.put(alvo)
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

  // Salva o que estiver pendente ao sair da página, ao trocar de aba ou ao fechar/recarregar
  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') void gravar()
    }
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

  const atualizar = useCallback(
    (mudanca: Partial<Orcamento> | ((o: Orcamento) => Partial<Orcamento>)) => {
      setOrc((atual) => {
        if (!atual) return atual
        const parcial = typeof mudanca === 'function' ? mudanca(atual) : mudanca
        const novo = { ...atual, ...parcial, atualizadoEm: Date.now() }
        pendente.current = novo
        setSalvo(false)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(gravar, 500)
        return novo
      })
    },
    [gravar],
  )

  const atualizarItem = (idItem: string, mudanca: Partial<ItemOrcamento>) =>
    atualizar((o) => ({ itens: o.itens.map((i) => (i.id === idItem ? { ...i, ...mudanca } : i)) }))

  const atualizarCliente = (mudanca: Partial<DadosCliente>) =>
    atualizar((o) => ({ cliente: { ...o.cliente, ...mudanca }, clienteId: undefined }))

  const moverItem = (indice: number, direcao: -1 | 1) =>
    atualizar((o) => {
      const itens = [...o.itens]
      const alvo = indice + direcao
      if (alvo < 0 || alvo >= itens.length) return {}
      ;[itens[indice], itens[alvo]] = [itens[alvo], itens[indice]]
      return { itens }
    })

  async function salvarComoCliente() {
    if (!orc?.cliente.nome.trim()) return avisar('Preencha o nome do cliente primeiro.', 'erro')
    const idCliente = await db.clientes.add({ ...orc.cliente, criadoEm: Date.now() })
    atualizar({ clienteId: idCliente as number })
    avisar('Cliente salvo na sua lista.')
  }

  if (orc === undefined) return <Carregando />
  if (orc === null)
    return (
      <div className="cartao p-10 text-center">
        <p className="text-slate-600">Orçamento não encontrado.</p>
        <Link to="/app" className="btn-secundario mt-4">
          Voltar
        </Link>
      </div>
    )

  const totais = calcularTotais(orc)
  const emp = empresa ?? EMPRESA_PADRAO

  return (
    <>
      {/* Barra superior */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/app" className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900">
            <Icone nome="voltar" className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Orçamento {formatarNumero(orc.numero)}</h1>
              {erroSalvar ? (
                <button role="status" onClick={() => void gravar()} className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100">
                  Erro ao salvar · tentar de novo
                </button>
              ) : (
                <span
                  role="status"
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                    salvo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${salvo ? 'bg-emerald-500' : 'animate-pulse bg-slate-400'}`} />
                  {salvo ? 'Salvo' : 'Salvando…'}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">Total: {formatarMoeda(totais.total)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="campo w-auto"
            value={orc.status}
            onChange={(e) => atualizar({ status: e.target.value as StatusOrcamento })}
          >
            {Object.entries(STATUS).map(([v, s]) => (
              <option key={v} value={v}>
                {s.rotulo}
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
            <Icone nome="imprimir" /> Gerar PDF
          </button>
        </div>
      </div>

      {/* Abas (celular/tablet) */}
      <div className="mb-4 inline-flex rounded-lg bg-slate-200/60 p-1 text-sm font-medium xl:hidden">
        {(['editar', 'previa'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`rounded-md px-4 py-1.5 ${aba === a ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
          >
            {a === 'editar' ? 'Editar' : 'Prévia'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
        <div className={`space-y-6 ${aba === 'previa' ? 'hidden xl:block' : ''}`}>
          {/* Dados gerais */}
          <section className="cartao p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Dados gerais</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                className="sm:col-span-2"
                rotulo="Título do orçamento"
                placeholder="Ex.: Cozinha planejada, Reforma do banheiro…"
                value={orc.titulo}
                onChange={(e) => atualizar({ titulo: e.target.value })}
              />
              <Campo
                rotulo="Prazo de entrega"
                placeholder="Ex.: 20 dias úteis"
                value={orc.prazoEntrega}
                onChange={(e) => atualizar({ prazoEntrega: e.target.value })}
              />
              <label className="block">
                <span className="rotulo">Validade (dias)</span>
                <CampoNumero casas={0} valor={orc.validadeDias} aoMudar={(n) => atualizar({ validadeDias: Math.round(n) })} />
              </label>
            </div>
          </section>

          {/* Cliente */}
          <section className="cartao p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Cliente</h2>
              <div className="flex items-center gap-2">
                {!!clientes?.length && (
                  <select
                    className="campo w-auto py-1.5"
                    value={orc.clienteId ?? ''}
                    onChange={(e) => {
                      const c = clientes.find((x) => x.id === Number(e.target.value))
                      if (c)
                        atualizar({
                          clienteId: c.id,
                          cliente: { nome: c.nome, documento: c.documento, email: c.email, telefone: c.telefone, endereco: c.endereco },
                        })
                    }}
                  >
                    <option value="">Escolher cliente salvo…</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                )}
                {!orc.clienteId && orc.cliente.nome.trim() && (
                  <button className="btn-fantasma px-2 py-1.5 text-xs" onClick={salvarComoCliente}>
                    Salvar cliente
                  </button>
                )}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome / Razão social" value={orc.cliente.nome} onChange={(e) => atualizarCliente({ nome: e.target.value })} />
              <Campo rotulo="CPF / CNPJ" value={orc.cliente.documento} onChange={(e) => atualizarCliente({ documento: e.target.value })} />
              <Campo rotulo="Telefone" value={orc.cliente.telefone} onChange={(e) => atualizarCliente({ telefone: e.target.value })} />
              <Campo rotulo="E-mail" type="email" value={orc.cliente.email} onChange={(e) => atualizarCliente({ email: e.target.value })} />
              <Campo className="sm:col-span-2" rotulo="Endereço" value={orc.cliente.endereco} onChange={(e) => atualizarCliente({ endereco: e.target.value })} />
            </div>
          </section>

          {/* Itens */}
          <section className="cartao p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Itens</h2>
            <div className="space-y-3">
              {orc.itens.map((item, i) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {/* Foto do item */}
                    <div className="shrink-0">
                      {item.foto ? (
                        <div className="group relative">
                          <img src={item.foto} alt="" className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-200" />
                          <button
                            title="Remover foto"
                            aria-label="Remover foto do item" className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-1 text-red-600 shadow ring-1 ring-slate-200 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                            onClick={() => atualizarItem(item.id, { foto: undefined })}
                          >
                            <Icone nome="x" className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <EnviarFoto
                          titulo="Adicionar foto ao item"
                          lado={800}
                          aoEnviar={([f]) => atualizarItem(item.id, { foto: f })}
                          className="grid h-20 w-20 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-400 transition hover:border-marca-500 hover:text-marca-600"
                        >
                          <span className="flex flex-col items-center gap-1 text-[10px] font-medium">
                            <Icone nome="foto" className="h-5 w-5" /> Foto
                          </span>
                        </EnviarFoto>
                      )}
                    </div>

                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-12">
                      <input
                        className="campo sm:col-span-12"
                        placeholder={`Item ${i + 1} — descrição`}
                        value={item.descricao}
                        onChange={(e) => atualizarItem(item.id, { descricao: e.target.value })}
                      />
                      <input
                        className="campo text-xs sm:col-span-12"
                        placeholder="Detalhes (opcional): material, cor, medidas…"
                        value={item.detalhes}
                        onChange={(e) => atualizarItem(item.id, { detalhes: e.target.value })}
                      />
                      <div className="flex gap-2 sm:col-span-5">
                        <CampoNumero
                          aria-label="Quantidade"
                          className="campo w-full"
                          casas={3}
                          valor={item.quantidade}
                          aoMudar={(n) => atualizarItem(item.id, { quantidade: n })}
                        />
                        <input
                          aria-label="Unidade"
                          className="campo w-20"
                          value={item.unidade}
                          onChange={(e) => atualizarItem(item.id, { unidade: e.target.value })}
                        />
                      </div>
                      <div className="relative sm:col-span-4">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">R$</span>
                        <CampoNumero
                          aria-label="Valor unitário"
                          className="campo pl-9"
                          valor={item.valorUnitario}
                          aoMudar={(n) => atualizarItem(item.id, { valorUnitario: n })}
                        />
                      </div>
                      <div className="flex items-center justify-end text-sm font-semibold text-slate-900 sm:col-span-3">
                        {formatarMoeda(totalItem(item))}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-row justify-end gap-1 sm:flex-col sm:gap-0.5">
                      <button title="Subir" disabled={i === 0} onClick={() => moverItem(i, -1)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30">
                        <Icone nome="subir" className="h-3.5 w-3.5" />
                      </button>
                      <button title="Descer" disabled={i === orc.itens.length - 1} onClick={() => moverItem(i, 1)} className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700 disabled:opacity-30">
                        <Icone nome="baixar" className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Remover item"
                        onClick={() => atualizar((o) => ({ itens: o.itens.filter((x) => x.id !== item.id) }))}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Icone nome="lixo" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn-secundario mt-3 w-full border-dashed" onClick={() => atualizar((o) => ({ itens: [...o.itens, novoItem()] }))}>
              <Icone nome="mais" /> Adicionar item
            </button>

            {/* Totais */}
            <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-2">
              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <label className="block">
                  <span className="rotulo">Desconto</span>
                  <CampoNumero valor={orc.desconto} aoMudar={(n) => atualizar({ desconto: n })} />
                </label>
                <select
                  className="campo w-auto"
                  value={orc.descontoTipo}
                  onChange={(e) => atualizar({ descontoTipo: e.target.value as Orcamento['descontoTipo'] })}
                >
                  <option value="percentual">%</option>
                  <option value="valor">R$</option>
                </select>
              </div>
              <label className="block">
                <span className="rotulo">Frete / deslocamento (R$)</span>
                <CampoNumero valor={orc.frete} aoMudar={(n) => atualizar({ frete: n })} />
              </label>
              <dl className="space-y-1 rounded-xl bg-slate-50 p-4 text-sm sm:col-span-2">
                <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd>{formatarMoeda(totais.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Desconto</dt><dd>− {formatarMoeda(totais.desconto)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Frete</dt><dd>{formatarMoeda(totais.frete)}</dd></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900"><dt>Total</dt><dd>{formatarMoeda(totais.total)}</dd></div>
              </dl>
            </div>
          </section>

          {/* Fotos */}
          <section className="cartao p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Fotos do orçamento</h2>
                <p className="text-xs text-slate-500">Projeto, local, produtos ou referências. Aparecem no PDF.</p>
              </div>
              <EnviarFoto
                multiplo
                className="btn-secundario"
                aoEnviar={(fotos) =>
                  atualizar((o) => ({ fotos: [...o.fotos, ...fotos.map((src) => ({ id: novoId(), src, legenda: '' }))] }))
                }
              >
                <Icone nome="foto" /> Adicionar fotos
              </EnviarFoto>
            </div>
            {orc.fotos.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
                Nenhuma foto adicionada.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {orc.fotos.map((f) => (
                  <div key={f.id} className="group relative">
                    <img src={f.src} alt="" className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-slate-200" />
                    <button
                      title="Remover foto"
                      aria-label="Remover foto" className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1.5 text-red-600 shadow transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                      onClick={() => atualizar((o) => ({ fotos: o.fotos.filter((x) => x.id !== f.id) }))}
                    >
                      <Icone nome="lixo" className="h-3.5 w-3.5" />
                    </button>
                    <input
                      className="campo mt-1.5 py-1 text-xs"
                      placeholder="Legenda (opcional)"
                      value={f.legenda}
                      onChange={(e) =>
                        atualizar((o) => ({ fotos: o.fotos.map((x) => (x.id === f.id ? { ...x, legenda: e.target.value } : x)) }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Condições */}
          <section className="cartao grid gap-4 p-5 sm:grid-cols-2">
            <AreaTexto rotulo="Condições de pagamento" value={orc.condicoesPagamento} onChange={(e) => atualizar({ condicoesPagamento: e.target.value })} />
            <AreaTexto rotulo="Observações" value={orc.observacoes} onChange={(e) => atualizar({ observacoes: e.target.value })} />
          </section>
        </div>

        {/* Prévia */}
        <div className={aba === 'editar' ? 'hidden xl:block' : ''}>
          <div className="sticky top-6">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Prévia ao vivo</span>
              <Link to="/app/modelo" className="hover:text-slate-900">Personalizar aparência →</Link>
            </div>
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl bg-slate-200/70 p-3">
              <PreviaA4>
                <DocumentoOrcamento orcamento={orc} empresa={emp} />
              </PreviaA4>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
