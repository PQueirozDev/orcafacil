import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth'
import { avisar, confirmar } from '../../components/Avisos'
import { DocumentoOrcamento } from '../../components/DocumentoOrcamento'
import { PreviaA4 } from '../../components/PreviaA4'
import { Carregando, Icone, SeloStatus } from '../../components/ui'
import { db, normalizarEmpresa, registrarEvento, type Evento, type Orcamento } from '../../db'
import { calcularTotais, validarOrcamento } from '../../lib/calculos'
import { criarLink, estadoDoLink, listarLinks, revogarLink, urlDaProposta, type Link as LinkProposta } from '../../lib/compartilhar'
import { formatarData, formatarDataHora, formatarMoeda, formatarNumero, nomeDoArquivo, telefoneWhatsApp } from '../../lib/formato'
import { mensagemDeErro, nuvemDisponivel } from '../../lib/supabase'
import { statusExibido } from '../../lib/status'

/** Abre a janela de impressão com o nome de arquivo organizado (o navegador usa o título como nome do PDF). */
export function imprimirOrcamento(o: Pick<Orcamento, 'numero' | 'cliente' | 'uid'>, registrar = true) {
  const anterior = document.title
  document.title = nomeDoArquivo(o.numero, o.cliente.nome)
  const restaurar = () => {
    document.title = anterior
    window.removeEventListener('afterprint', restaurar)
  }
  window.addEventListener('afterprint', restaurar)
  window.print()
  if (registrar) void registrarEvento(o.uid, 'pdf')
}

const EVENTOS: Record<Evento['tipo'], { rotulo: string; icone: string; cor: string }> = {
  criacao: { rotulo: 'Orçamento criado', icone: 'mais', cor: 'bg-slate-400' },
  edicao: { rotulo: 'Orçamento editado', icone: 'editar', cor: 'bg-slate-400' },
  status: { rotulo: 'Status alterado', icone: 'atualizar', cor: 'bg-sky-500' },
  compartilhamento: { rotulo: 'Link de proposta gerado', icone: 'link', cor: 'bg-marca-500' },
  revogacao: { rotulo: 'Link revogado', icone: 'x', cor: 'bg-slate-500' },
  visualizacao: { rotulo: 'Link aberto pela primeira vez', icone: 'olho', cor: 'bg-marca-400' },
  aprovacao: { rotulo: 'Proposta aprovada pelo cliente', icone: 'check', cor: 'bg-emerald-500' },
  recusa: { rotulo: 'Proposta recusada pelo cliente', icone: 'x', cor: 'bg-rose-500' },
  cancelamento: { rotulo: 'Orçamento cancelado', icone: 'x', cor: 'bg-slate-500' },
  pdf: { rotulo: 'PDF gerado', icone: 'imprimir', cor: 'bg-slate-400' },
}

const ESTADO_LINK = {
  ativo: ['Ativo', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
  revogado: ['Revogado', 'bg-slate-100 text-slate-500 ring-slate-200'],
  expirado: ['Expirado', 'bg-amber-50 text-amber-700 ring-amber-200'],
  aprovado: ['Aprovado', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
  recusado: ['Recusado', 'bg-rose-50 text-rose-700 ring-rose-200'],
} as const

function PainelCompartilhar({ orc }: { orc: Orcamento }) {
  const { usuario } = useAuth()
  const [links, setLinks] = useState<LinkProposta[] | null>(null)
  const [erro, setErro] = useState('')
  const [criando, setCriando] = useState(false)
  const [validade, setValidade] = useState<string>('15')
  const [permitePdf, setPermitePdf] = useState(true)

  const carregar = useCallback(async () => {
    try {
      setLinks(await listarLinks(orc.uid))
      setErro('')
    } catch (e) {
      setErro(mensagemDeErro(e))
      setLinks([])
    }
  }, [orc.uid])

  useEffect(() => {
    if (usuario) void carregar()
  }, [usuario, carregar, orc.status])

  if (!nuvemDisponivel) return null

  if (!usuario) {
    return (
      <div className="cartao p-5">
        <h2 className="font-semibold text-slate-900">Enviar por link e receber a aprovação</h2>
        <p className="mt-1 text-sm text-slate-500">
          Com uma conta grátis você gera um link seguro: o cliente vê a proposta no celular e aprova ou recusa com um toque.
        </p>
        <Link to={`/entrar?modo=cadastrar&voltar=/app/conta`} className="btn-primario mt-4 w-full">
          Criar conta grátis
        </Link>
      </div>
    )
  }

  const problemas = validarOrcamento(orc)
  const ativo = links?.find((l) => estadoDoLink(l) === 'ativo')
  const finalizado = orc.status === 'aprovado' || orc.status === 'recusado' || orc.status === 'cancelado'
  const texto = (url: string) =>
    `Olá${orc.cliente.nome ? `, ${orc.cliente.nome.split(' ')[0]}` : ''}! Segue a proposta ${formatarNumero(orc.numero)}` +
    `${orc.titulo ? ` (${orc.titulo})` : ''} no valor de ${formatarMoeda(calcularTotais(orc).total)}. ` +
    `Você pode ver os detalhes e aprovar por aqui: ${url}`

  async function gerar() {
    if (problemas.length) {
      avisar(problemas[0].mensagem, 'erro')
      return
    }
    setCriando(true)
    try {
      await criarLink(orc.id!, { validadeDias: validade ? Number(validade) : null, permitePdf })
      avisar('Link criado! Agora é só enviar ao cliente.')
      await carregar()
    } catch (e) {
      avisar(e instanceof Error && !/fetch/i.test(e.message) ? e.message : mensagemDeErro(e), 'erro')
    } finally {
      setCriando(false)
    }
  }

  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      avisar('Link copiado!')
    } catch {
      avisar('Não foi possível copiar. Selecione o link e copie manualmente.', 'erro')
    }
  }

  return (
    <div className="cartao p-5">
      <h2 className="font-semibold text-slate-900">Compartilhar proposta</h2>
      <p className="mt-1 text-xs text-slate-500">
        O link mostra uma cópia fixa do orçamento no momento do envio. Se você editar depois, gere um novo link.
      </p>

      {ativo ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
            <input readOnly aria-label="Link da proposta" value={urlDaProposta(ativo.token)} className="min-w-0 flex-1 bg-transparent px-2 text-xs text-slate-600 outline-none" onFocus={(e) => e.target.select()} />
            <button className="btn-secundario shrink-0 px-3 py-1.5 text-xs" onClick={() => void copiar(urlDaProposta(ativo.token))}>
              <Icone nome="copiar" /> Copiar
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              className="btn bg-[#25d366] text-white shadow-md shadow-emerald-600/20 hover:bg-[#1fb757]"
              href={`https://wa.me/${telefoneWhatsApp(orc.cliente.telefone)}?text=${encodeURIComponent(texto(urlDaProposta(ativo.token)))}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icone nome="whatsapp" /> WhatsApp
            </a>
            <a
              className="btn-secundario"
              href={`mailto:${encodeURIComponent(orc.cliente.email)}?subject=${encodeURIComponent(`Proposta ${formatarNumero(orc.numero)}`)}&body=${encodeURIComponent(texto(urlDaProposta(ativo.token)))}`}
            >
              <Icone nome="email" /> E-mail
            </a>
          </div>
          <p className="text-xs text-slate-500">
            {ativo.expira_em ? `Válido até ${formatarData(new Date(ativo.expira_em).getTime())}` : 'Sem data de expiração'}
            {ativo.visualizado_em && ` · aberto em ${formatarDataHora(new Date(ativo.visualizado_em).getTime())}`}
          </p>
        </div>
      ) : finalizado ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Este orçamento já foi finalizado. Não é possível gerar novos links.</p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="rotulo">Link expira em</span>
              <select className="campo" value={validade} onChange={(e) => setValidade(e.target.value)}>
                <option value="7">7 dias</option>
                <option value="15">15 dias</option>
                <option value="30">30 dias</option>
                <option value="">Não expira</option>
              </select>
            </label>
            <label className="flex items-end gap-2 pb-2.5 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-marca-600" checked={permitePdf} onChange={(e) => setPermitePdf(e.target.checked)} />
              Cliente pode baixar PDF
            </label>
          </div>
          <button className="btn-primario w-full" disabled={criando} onClick={() => void gerar()}>
            <Icone nome="link" /> {criando ? 'Salvando e gerando…' : 'Gerar link da proposta'}
          </button>
        </div>
      )}

      {erro && <p className="mt-3 text-xs text-red-600">{erro}</p>}

      {!!links?.length && (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Links gerados</h3>
          <ul className="mt-2 space-y-2">
            {links.map((l) => {
              const estado = estadoDoLink(l)
              return (
                <li key={l.id} className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ring-1 ring-inset ${ESTADO_LINK[estado][1]}`}>{ESTADO_LINK[estado][0]}</span>
                    <span className="ml-2 text-slate-500">criado em {formatarDataHora(new Date(l.criado_em).getTime())}</span>
                    {l.decisao && (
                      <p className="mt-1 text-slate-600">
                        {l.decisao === 'aprovado' ? 'Aprovado' : 'Recusado'} por <strong>{l.decisor_nome}</strong> em {formatarDataHora(new Date(l.decidido_em!).getTime())}
                        {l.comentario && <span className="block italic">“{l.comentario}”</span>}
                      </p>
                    )}
                  </div>
                  {estado === 'ativo' && (
                    <button
                      className="shrink-0 font-semibold text-red-600 hover:text-red-700"
                      onClick={async () => {
                        const ok = await confirmar({ titulo: 'Revogar este link?', mensagem: 'O cliente não conseguirá mais abrir nem responder a proposta por ele.', botao: 'Revogar', perigo: true })
                        if (!ok) return
                        try {
                          await revogarLink(l.id, orc.uid)
                          avisar('Link revogado.')
                          await carregar()
                        } catch (e) {
                          avisar(mensagemDeErro(e), 'erro')
                        }
                      }}
                    >
                      Revogar
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function LinhaDoTempo({ uid }: { uid: string }) {
  const eventos = useLiveQuery(() => db.eventos.where('orcamentoUid').equals(uid).sortBy('criadoEm'), [uid])
  if (!eventos) return null
  return (
    <div className="cartao p-5">
      <h2 className="font-semibold text-slate-900">Linha do tempo</h2>
      {eventos.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Nenhum evento registrado.</p>
      ) : (
        <ol className="relative mt-4 space-y-4 border-l border-slate-200 pl-6">
          {[...eventos].reverse().map((e) => {
            const info = EVENTOS[e.tipo]
            return (
              <li key={e.uid} className="relative">
                <span className={`absolute -left-[33px] top-0 grid h-5 w-5 place-items-center rounded-full text-white ring-4 ring-superficie ${info.cor}`}>
                  <Icone nome={info.icone} className="h-3 w-3" />
                </span>
                <p className="text-sm font-medium text-slate-800">
                  {info.rotulo}
                  {e.tipo === 'status' && e.dados.para ? `: ${String(e.dados.para)}` : ''}
                </p>
                {(e.tipo === 'aprovacao' || e.tipo === 'recusa') && e.dados.nome && (
                  <p className="text-xs text-slate-600">
                    por {String(e.dados.nome)}
                    {e.dados.comentario && <span className="block italic">“{String(e.dados.comentario)}”</span>}
                  </p>
                )}
                {e.tipo === 'visualizacao' && <p className="text-[11px] text-slate-400">Indica acesso ao link; não garante que uma pessoa leu.</p>}
                <time className="text-xs text-slate-500">{formatarDataHora(e.criadoEm)}</time>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

export function VisualizarOrcamento() {
  const { id } = useParams()
  const orc = useLiveQuery(() => db.orcamentos.get(Number(id)).then((o) => o ?? null), [id])
  const empresa = useLiveQuery(() => db.empresa.get('principal'))
  const [params, setParams] = useSearchParams()
  const jaImprimiu = useRef(false)

  // Vindo do botão "Exportar PDF" do painel: abre a impressão assim que o documento carregar
  useEffect(() => {
    if (!orc || params.get('pdf') !== '1' || jaImprimiu.current) return
    jaImprimiu.current = true
    setParams({}, { replace: true })
    window.setTimeout(() => imprimirOrcamento(orc), 500)
  }, [orc, params, setParams])

  if (orc === undefined) return <Carregando />
  if (orc === null)
    return (
      <div className="cartao p-10 text-center">
        <p className="text-slate-600">Orçamento não encontrado.</p>
        <Link to="/app" className="btn-secundario mt-4">Voltar ao painel</Link>
      </div>
    )

  const emp = normalizarEmpresa(empresa)

  return (
    <>
      <div className="nao-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={`/app/orcamentos/${orc.id}`} aria-label="Voltar ao editor" className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <Icone nome="voltar" className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Orçamento {formatarNumero(orc.numero)}</h1>
              <SeloStatus status={statusExibido(orc)} />
            </div>
            <p className="truncate text-sm text-slate-500">
              {orc.cliente.nome || 'Cliente não informado'} · {formatarMoeda(calcularTotais(orc).total)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/app/orcamentos/${orc.id}`} className="btn-secundario">
            <Icone nome="editar" /> Editar
          </Link>
          <button className="btn-primario" onClick={() => imprimirOrcamento(orc)}>
            <Icone nome="baixar" /> Baixar PDF
          </button>
        </div>
      </div>

      <div className="nao-imprimir grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <p className="mb-3 rounded-xl bg-marca-50 px-4 py-2.5 text-xs text-marca-800">
            Na janela que abrir, escolha <strong>“Salvar como PDF”</strong> como destino. O arquivo já vem com o nome{' '}
            <code className="font-semibold">{nomeDoArquivo(orc.numero, orc.cliente.nome)}.pdf</code>.
          </p>
          <div className="mx-auto max-w-[794px] overflow-hidden rounded-xl bg-slate-200/70 p-3">
            <PreviaA4>
              <DocumentoOrcamento orcamento={orc} empresa={emp} />
            </PreviaA4>
          </div>
        </div>
        <div className="space-y-6">
          <PainelCompartilhar orc={orc} />
          <LinhaDoTempo uid={orc.uid} />
        </div>
      </div>

      {/* Impressão: folha em tamanho real */}
      <div className="area-impressao hidden print:block">
        <DocumentoOrcamento orcamento={orc} empresa={emp} />
      </div>
    </>
  )
}
