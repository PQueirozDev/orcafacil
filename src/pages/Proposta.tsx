import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlternarTema } from '../components/Layouts'
import { DocumentoOrcamento } from '../components/DocumentoOrcamento'
import { PreviaA4 } from '../components/PreviaA4'
import { Icone } from '../components/ui'
import { decidirProposta, obterProposta, type PropostaPublica } from '../lib/compartilhar'
import { formatarData, formatarDataHora, formatarMoeda, formatarNumero, nomeDoArquivo } from '../lib/formato'
import { mensagemDeErro, nuvemDisponivel } from '../lib/supabase'

const MOTIVOS: Record<string, string> = {
  ja_decidida: 'Esta proposta já foi respondida.',
  expirada: 'O prazo para responder esta proposta terminou.',
  invalida: 'Este link não está mais disponível.',
  nome_obrigatorio: 'Informe seu nome completo.',
  comentario_longo: 'O comentário pode ter no máximo 1000 caracteres.',
  limite: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.',
  decisao_invalida: 'Escolha aprovar ou recusar.',
}

function Mensagem({ icone, cor, titulo, texto }: { icone: string; cor: string; titulo: string; texto: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className={`grid h-16 w-16 place-items-center rounded-2xl text-white shadow-xl ${cor}`}>
        <Icone nome={icone} className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-2xl font-semibold text-slate-900">{titulo}</h1>
      <p className="mt-2 text-slate-500">{texto}</p>
    </div>
  )
}

/** Página pública que o CLIENTE abre. Não exige conta e não mostra dados internos do profissional. */
export function Proposta() {
  const { token = '' } = useParams()
  const [dados, setDados] = useState<PropostaPublica | null>(null)
  const [erro, setErro] = useState('')
  const [modo, setModo] = useState<'aprovar' | 'recusar' | null>(null)
  const [nome, setNome] = useState('')
  const [comentario, setComentario] = useState('')
  const [concordo, setConcordo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  // Propostas são privadas: não devem aparecer em buscadores
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    // O token está na URL: não pode vazar para outros sites via cabeçalho Referer
    const referrer = document.createElement('meta')
    referrer.name = 'referrer'
    referrer.content = 'no-referrer'
    document.head.append(meta, referrer)
    return () => {
      meta.remove()
      referrer.remove()
    }
  }, [])

  useEffect(() => {
    if (!nuvemDisponivel) return
    obterProposta(token)
      .then((d) => {
        setDados(d)
        if (d.snapshot) document.title = `Proposta ${formatarNumero(d.snapshot.orcamento.numero)} · ${d.snapshot.empresa.nome || 'OrçaFácil'}`
      })
      .catch((e) => setErro(mensagemDeErro(e)))
  }, [token])

  async function enviar(ev: FormEvent) {
    ev.preventDefault()
    if (!modo) return
    setErroForm('')
    if (nome.trim().length < 2) return setErroForm(MOTIVOS.nome_obrigatorio)
    if (modo === 'aprovar' && !concordo) return setErroForm('Marque a caixa confirmando que leu e concorda com a proposta.')
    setEnviando(true)
    try {
      const r = await decidirProposta(token, modo === 'aprovar' ? 'aprovado' : 'recusado', nome.trim(), comentario.trim() || undefined)
      if (!r.ok) {
        setErroForm(MOTIVOS[r.motivo ?? ''] ?? 'Não foi possível registrar a resposta.')
        if (r.motivo === 'ja_decidida' || r.motivo === 'expirada') setDados(await obterProposta(token))
        return
      }
      setDados(await obterProposta(token))
      setModo(null)
    } catch (e) {
      setErroForm(mensagemDeErro(e))
    } finally {
      setEnviando(false)
    }
  }

  if (!nuvemDisponivel) return <Mensagem icone="alerta" cor="bg-slate-400" titulo="Indisponível" texto="Este ambiente não está configurado para propostas online." />
  if (erro) return <Mensagem icone="nuvemOff" cor="bg-amber-500" titulo="Não foi possível abrir" texto={erro} />
  if (!dados)
    return (
      <div aria-busy="true" className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <span className="sr-only">Carregando proposta…</span>
        <div className="h-24 animate-pulse rounded-xl bg-slate-200/60" />
        <div className="h-[60vh] animate-pulse rounded-xl bg-slate-200/50" />
      </div>
    )
  if (dados.estado === 'limite') return <Mensagem icone="relogio" cor="bg-amber-500" titulo="Aguarde um instante" texto={MOTIVOS.limite} />
  if (dados.estado === 'invalida' || !dados.snapshot)
    return <Mensagem icone="cadeado" cor="bg-slate-400" titulo="Link indisponível" texto="Este link não existe, foi revogado pelo remetente ou digitado incorretamente. Peça um novo a quem enviou a proposta." />

  const { orcamento: o, empresa: e, total } = dados.snapshot
  const aberta = dados.estado === 'aberta'
  const cor = e.corTema || '#4f46e5'

  return (
    <div className="min-h-screen bg-fundo">
      <header className="nao-imprimir border-b border-slate-200 bg-superficie">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            {e.logo ? (
              <img src={e.logo} alt="" className="h-10 w-auto max-w-28 rounded-lg bg-white object-contain p-0.5" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-xl font-semibold text-white" style={{ background: cor }}>
                {(e.nome || 'E').slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{e.nome || 'Proposta comercial'}</p>
              <p className="truncate text-xs text-slate-500">Proposta {formatarNumero(o.numero)}</p>
            </div>
          </div>
          <AlternarTema compacto />
        </div>
      </header>

      <main className="nao-imprimir mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="order-2 min-w-0 lg:order-1">
            <div className="overflow-hidden rounded-xl bg-slate-200/70 p-2 sm:p-3">
              <PreviaA4>
                <DocumentoOrcamento orcamento={o} empresa={e} selo={dados.snapshot.selo !== false} />
              </PreviaA4>
            </div>
          </div>

          <aside className="order-1 space-y-4 lg:order-2">
            <div className="cartao p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{o.titulo || 'Proposta comercial'}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{formatarMoeda(total)}</p>
              <p className="mt-1 text-sm text-slate-500">
                Para {o.cliente.nome || 'você'} · emitida em {formatarData(o.criadoEm)}
              </p>
              {dados.expira_em && aberta && <p className="mt-1 text-sm text-slate-500">Responda até {formatarData(new Date(dados.expira_em).getTime())}</p>}
              {dados.permite_pdf && (
                <button
                  className="btn-secundario mt-4 w-full"
                  onClick={() => {
                    const anterior = document.title
                    document.title = nomeDoArquivo(o.numero, o.cliente.nome)
                    window.print()
                    document.title = anterior
                  }}
                >
                  <Icone nome="download" /> Baixar PDF
                </button>
              )}
            </div>

            {dados.estado === 'aprovado' || dados.estado === 'recusado' ? (
              <div
                role="status"
                className={`cartao animate-escala p-5 ${dados.estado === 'aprovado' ? 'ring-2 ring-emerald-300' : 'ring-2 ring-rose-200'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-full text-white ${dados.estado === 'aprovado' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    <Icone nome={dados.estado === 'aprovado' ? 'check' : 'x'} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">Proposta {dados.estado === 'aprovado' ? 'aprovada' : 'recusada'}</p>
                    {dados.decidido_em && (
                      <p className="text-xs text-slate-500">
                        por {dados.decisor_nome} em {formatarDataHora(new Date(dados.decidido_em).getTime())}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {dados.estado === 'aprovado'
                    ? `${e.nome || 'O responsável'} já foi avisado e deve entrar em contato para os próximos passos.`
                    : `${e.nome || 'O responsável'} foi avisado. Obrigado pela resposta.`}
                </p>
              </div>
            ) : dados.estado === 'expirada' ? (
              <div className="cartao p-5 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Prazo encerrado</p>
                <p className="mt-1">O prazo para responder terminou. Fale com {e.nome || 'quem enviou'} para receber uma proposta atualizada.</p>
              </div>
            ) : modo ? (
              <form onSubmit={enviar} className="cartao animate-escala space-y-4 p-5" noValidate>
                <h2 className="font-semibold text-slate-900">{modo === 'aprovar' ? 'Aprovar proposta' : 'Recusar proposta'}</h2>
                <label className="block">
                  <span className="rotulo">Seu nome completo *</span>
                  <input className="campo" value={nome} onChange={(ev) => setNome(ev.target.value)} maxLength={120} autoComplete="name" autoFocus required aria-invalid={!!erroForm && nome.trim().length < 2} />
                </label>
                <label className="block">
                  <span className="rotulo">{modo === 'aprovar' ? 'Comentário (opcional)' : 'Motivo da recusa (opcional)'}</span>
                  <textarea className="campo min-h-20" value={comentario} onChange={(ev) => setComentario(ev.target.value)} maxLength={1000} />
                </label>
                {modo === 'aprovar' && (
                  <label className="flex gap-2.5 text-sm text-slate-700">
                    <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" checked={concordo} onChange={(ev) => setConcordo(ev.target.checked)} />
                    Li a proposta e concordo com os itens, valores e condições apresentados.
                  </label>
                )}
                {erroForm && (
                  <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {erroForm}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="btn-secundario" onClick={() => setModo(null)}>
                    Voltar
                  </button>
                  <button
                    className={modo === 'aprovar' ? 'btn bg-emerald-600 text-white hover:bg-emerald-700' : 'btn bg-rose-600 text-white hover:bg-rose-700'}
                    disabled={enviando}
                  >
                    {enviando ? 'Enviando…' : modo === 'aprovar' ? 'Confirmar aprovação' : 'Confirmar recusa'}
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Registramos seu nome, a data e o horário da resposta. Este é um aceite eletrônico simples, não uma assinatura digital
                  certificada.
                </p>
              </form>
            ) : (
              <div className="cartao space-y-2 p-5">
                <p className="text-sm text-slate-600">Revise a proposta e responda:</p>
                <button className="btn w-full bg-emerald-600 py-3 text-white hover:bg-emerald-700" onClick={() => setModo('aprovar')}>
                  <Icone nome="check" /> Aprovar proposta
                </button>
                <button className="btn-secundario w-full" onClick={() => setModo('recusar')}>
                  Recusar
                </button>
              </div>
            )}
          </aside>
        </div>
        {dados.snapshot.selo !== false && (
          <p className="mt-10 text-center text-xs text-slate-400">
            Proposta criada com <Link to="/" className="font-semibold hover:text-slate-600">OrçaFácil</Link>
          </p>
        )}
      </main>

      <div className="area-impressao hidden print:block">
        <DocumentoOrcamento orcamento={o} empresa={e} selo={dados.snapshot.selo !== false} />
      </div>
    </div>
  )
}
