import { db, normalizarEmpresa, registrarEvento, type Empresa, type Orcamento } from '../db'
import { calcularTotais } from './calculos'
import { supabase } from './supabase'
import { sincronizar } from './sync'

/**
 * Links públicos de proposta. O token tem 256 bits aleatórios (crypto.getRandomValues) em base64url:
 * não é derivado de ids sequenciais. O visitante só acessa via funções do banco que validam token,
 * revogação e validade. O link aponta para uma CÓPIA (snapshot) do orçamento no momento do envio.
 */

export function gerarToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const urlDaProposta = (token: string) => `${window.location.origin}/proposta/${token}`

/** Dados da empresa que podem aparecer para o cliente (nada de numeração ou configurações internas). */
export function empresaPublica(e: Empresa) {
  return {
    nome: e.nome,
    razaoSocial: e.razaoSocial,
    documento: e.documento,
    email: e.email,
    telefone: e.telefone,
    whatsapp: e.whatsapp,
    endereco: e.endereco,
    site: e.site,
    responsavel: e.responsavel,
    logo: e.logo,
    corTema: e.corTema,
    layout: e.layout,
    dadosPagamento: e.dadosPagamento,
    rodape: e.rodape,
  }
}

export interface Snapshot {
  versao: 1
  orcamento: Omit<Orcamento, 'id' | 'sujo' | 'clienteUid'>
  empresa: ReturnType<typeof empresaPublica>
  total: number
  emitidoEm: number
  /** Plano grátis: mostra o selo do OrçaFácil no link */
  selo?: boolean
}

export function montarSnapshot(o: Orcamento, e: Empresa, selo = false): Snapshot {
  const { id: _id, sujo: _s, clienteUid: _c, ...orcamento } = o
  void _id, _s, _c
  return { versao: 1, orcamento, empresa: empresaPublica(e), total: calcularTotais(o).total, emitidoEm: Date.now(), selo }
}

export interface Link {
  id: string
  token: string
  criado_em: string
  expira_em: string | null
  revogado_em: string | null
  visualizado_em: string | null
  decisao: 'aprovado' | 'recusado' | null
  decidido_em: string | null
  decisor_nome: string | null
  comentario: string | null
  permite_pdf: boolean
}

export type EstadoLink = 'ativo' | 'revogado' | 'expirado' | 'aprovado' | 'recusado'

export function estadoDoLink(l: Link, agora = Date.now()): EstadoLink {
  if (l.decisao) return l.decisao
  if (l.revogado_em) return 'revogado'
  if (l.expira_em && new Date(l.expira_em).getTime() < agora) return 'expirado'
  return 'ativo'
}

function exigir() {
  if (!supabase) throw new Error('Compartilhamento indisponível: a nuvem não está configurada.')
  return supabase
}

export async function listarLinks(orcamentoUid: string): Promise<Link[]> {
  const { data, error } = await exigir()
    .from('compartilhamentos')
    .select('id, token, criado_em, expira_em, revogado_em, visualizado_em, decisao, decidido_em, decisor_nome, comentario, permite_pdf')
    .eq('orcamento_id', orcamentoUid)
    .order('criado_em', { ascending: false })
    .limit(20)
  if (error) throw error
  return data as Link[]
}

/** Cria um link novo. O orçamento é enviado à nuvem antes e passa a "pendente" (se era rascunho). */
export async function criarLink(orcamentoId: number, opcoes: { validadeDias: number | null; permitePdf: boolean; selo: boolean }) {
  const sb = exigir()
  const o = await db.orcamentos.get(orcamentoId)
  if (!o) throw new Error('Orçamento não encontrado.')
  if (o.status === 'rascunho') await db.orcamentos.update(orcamentoId, { status: 'pendente' })
  await sincronizar()
  const atual = (await db.orcamentos.get(orcamentoId))!
  if ((await db.orcamentos.get(orcamentoId))?.sujo) throw new Error('Não foi possível salvar o orçamento na nuvem. Verifique sua conexão.')

  const empresa = normalizarEmpresa(await db.empresa.get('principal'))
  const token = gerarToken()
  const expira = opcoes.validadeDias ? new Date(Date.now() + opcoes.validadeDias * 86_400_000).toISOString() : null
  const { error } = await sb.from('compartilhamentos').insert({
    orcamento_id: atual.uid,
    token,
    snapshot: montarSnapshot(atual, empresa, opcoes.selo),
    permite_pdf: opcoes.permitePdf,
    expira_em: expira,
  })
  if (error) {
    if (/limite_plano_gratis/.test(error.message)) throw new Error('LIMITE_PLANO')
    throw error
  }
  await registrarEvento(atual.uid, 'compartilhamento', { expira: expira ?? undefined })
  return token
}

export async function revogarLink(linkId: string, orcamentoUid: string) {
  const { error } = await exigir().from('compartilhamentos').update({ revogado_em: new Date().toISOString() }).eq('id', linkId)
  if (error) throw error
  await registrarEvento(orcamentoUid, 'revogacao')
}

// --------------------------------------------------------------------------------------------
// Portal do cliente (anônimo)
// --------------------------------------------------------------------------------------------
export interface PropostaPublica {
  estado: 'aberta' | 'aprovado' | 'recusado' | 'expirada' | 'invalida' | 'limite'
  snapshot?: Snapshot
  permite_pdf?: boolean
  expira_em?: string | null
  decidido_em?: string | null
  decisor_nome?: string | null
}

export async function obterProposta(token: string): Promise<PropostaPublica> {
  const { data, error } = await exigir().rpc('proposta_obter', { p_token: token })
  if (error) throw error
  return data as PropostaPublica
}

export async function decidirProposta(token: string, decisao: 'aprovado' | 'recusado', nome: string, comentario?: string) {
  const { data, error } = await exigir().rpc('proposta_decidir', {
    p_token: token,
    p_decisao: decisao,
    p_nome: nome,
    p_comentario: comentario ?? null,
  })
  if (error) throw error
  return data as { ok: boolean; motivo?: string; estado?: string }
}
