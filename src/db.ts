import Dexie, { type EntityTable, type Transaction } from 'dexie'

/**
 * Banco local (IndexedDB). É a fonte de verdade da interface: funciona sem login e offline.
 * Quando há uma conta, src/lib/sync.ts replica estes dados com o Supabase.
 * Cada conta usa um banco separado no navegador; o visitante usa o banco "orcafacil".
 */

export type StatusOrcamento = 'rascunho' | 'pendente' | 'visualizado' | 'aprovado' | 'recusado' | 'cancelado'

export type SecaoId = 'cliente' | 'itens' | 'totais' | 'fotos' | 'condicoes' | 'assinaturas'
export type ModeloId = 'moderno' | 'classico' | 'criativo' | 'tecnico' | 'comercial'

/** Aparência do orçamento impresso (posição, tamanho e cores). */
export interface LayoutDoc {
  modelo: ModeloId
  ordem: SecaoId[]
  ocultas: SecaoId[]
  posicaoLogo: 'esquerda' | 'centro' | 'direita'
  tamanhoLogo: number // altura em px
  tamanhoFonte: number // pt
  tamanhoFotoItem: number // px
  colunasFotos: 1 | 2 | 3
  alturaFotos: number // mm
  alinhamentoTotais: 'esquerda' | 'direita'
  estiloTabela: 'solido' | 'linhas' | 'zebrado'
  estiloCabecalho: 'linha' | 'faixa'
  cantos: 'retos' | 'arredondados'
  fonte: 'moderna' | 'classica' | 'neutra'
  corSecundaria: string
  corTexto: string
  corTitulos: string
  corFundoCaixas: string
}

export const SECOES: Record<SecaoId, string> = {
  cliente: 'Cliente e referência',
  itens: 'Tabela de itens',
  totais: 'Totais',
  fotos: 'Fotos',
  condicoes: 'Condições, observações e termos',
  assinaturas: 'Assinaturas',
}

export const LAYOUT_PADRAO: LayoutDoc = {
  modelo: 'moderno',
  ordem: ['cliente', 'itens', 'totais', 'fotos', 'condicoes', 'assinaturas'],
  ocultas: [],
  posicaoLogo: 'esquerda',
  tamanhoLogo: 64,
  tamanhoFonte: 10.5,
  tamanhoFotoItem: 56,
  colunasFotos: 2,
  alturaFotos: 58,
  alinhamentoTotais: 'direita',
  estiloTabela: 'solido',
  estiloCabecalho: 'linha',
  cantos: 'arredondados',
  fonte: 'moderna',
  corSecundaria: '#0f172a',
  corTexto: '#1e293b',
  corTitulos: '#0f172a',
  corFundoCaixas: '#f8fafc',
}

/** Junta o layout salvo com o padrão (cobre dados salvos antes de uma opção existir). */
export function layoutDe(e: Pick<Empresa, 'layout'>): LayoutDoc {
  const l = { ...LAYOUT_PADRAO, ...e.layout }
  const ordem = (Array.isArray(l.ordem) ? l.ordem : []).filter((s) => s in SECOES)
  for (const s of LAYOUT_PADRAO.ordem) if (!ordem.includes(s)) ordem.push(s)
  return { ...l, ordem, ocultas: Array.isArray(l.ocultas) ? l.ocultas : [] }
}

export interface Empresa {
  id: 'principal'
  nome: string
  razaoSocial: string
  documento: string
  email: string
  telefone: string
  whatsapp: string
  endereco: string
  site: string
  responsavel: string
  logo?: string
  corTema: string
  layout?: Partial<LayoutDoc>
  proximoNumero: number
  validadePadraoDias: number
  condicoesPadrao: string
  observacoesPadrao: string
  termosPadrao: string
  dadosPagamento: string
  rodape: string
  atualizadoEm?: number
  sujo?: 0 | 1
}

export interface DadosCliente {
  nome: string
  documento: string
  email: string
  telefone: string
  endereco: string
}

export interface Cliente extends DadosCliente {
  id?: number
  uid: string
  observacoes: string
  criadoEm: number
  atualizadoEm: number
  sujo?: 0 | 1
}

export interface ItemOrcamento {
  id: string
  descricao: string
  detalhes: string
  quantidade: number
  unidade: string
  valorUnitario: number
  foto?: string
}

export interface FotoOrcamento {
  id: string
  src: string
  legenda: string
}

export interface Orcamento {
  id?: number
  uid: string
  numero: number
  titulo: string
  clienteUid?: string
  /** Cópia dos dados do cliente: editar o cadastro depois não altera orçamentos já feitos. */
  cliente: DadosCliente
  itens: ItemOrcamento[]
  fotos: FotoOrcamento[]
  descontoTipo: 'percentual' | 'valor'
  desconto: number
  impostoPercentual: number
  frete: number
  observacoes: string
  condicoesPagamento: string
  termos: string
  prazoEntrega: string
  validadeDias: number
  status: StatusOrcamento
  criadoEm: number
  atualizadoEm: number
  sujo?: 0 | 1
}

export type TipoEvento =
  | 'criacao'
  | 'edicao'
  | 'status'
  | 'compartilhamento'
  | 'revogacao'
  | 'visualizacao'
  | 'aprovacao'
  | 'recusa'
  | 'cancelamento'
  | 'pdf'

export interface Evento {
  id?: number
  uid: string
  orcamentoUid: string
  tipo: TipoEvento
  dados: Record<string, string | number | undefined>
  criadoEm: number
  sujo?: 0 | 1
}

/** Registro de algo apagado localmente que ainda precisa ser apagado na nuvem. */
export interface Excluido {
  id?: number
  tabela: 'clientes' | 'orcamentos'
  uid: string
}

export interface Meta {
  chave: string
  valor: string
}

export type Banco = Dexie & {
  empresa: EntityTable<Empresa, 'id'>
  clientes: EntityTable<Cliente, 'id'>
  orcamentos: EntityTable<Orcamento, 'id'>
  eventos: EntityTable<Evento, 'id'>
  excluidos: EntityTable<Excluido, 'id'>
  meta: EntityTable<Meta, 'chave'>
}

export function novoId() {
  return crypto.randomUUID()
}

type TxSync = Transaction & { _sync?: boolean }

/** Marca a transação atual como "vinda da sincronização": não suja os registros de novo. */
export function marcarSync(tx: Transaction) {
  ;(tx as TxSync)._sync = true
}

function abrir(nome: string): Banco {
  const b = new Dexie(nome) as Banco

  b.version(1).stores({
    empresa: 'id',
    clientes: '++id, nome, criadoEm',
    orcamentos: '++id, numero, status, clienteId, atualizadoEm',
  })

  b.version(2)
    .stores({
      empresa: 'id',
      clientes: '++id, &uid, nome, criadoEm, sujo',
      orcamentos: '++id, &uid, numero, status, clienteUid, atualizadoEm, sujo',
      eventos: '++id, &uid, orcamentoUid, criadoEm, sujo',
      excluidos: '++id',
      meta: 'chave',
    })
    .upgrade(async (tx) => {
      const uidDoCliente = new Map<number, string>()
      await tx
        .table('clientes')
        .toCollection()
        .modify((c) => {
          c.uid ??= novoId()
          c.observacoes ??= ''
          c.atualizadoEm ??= c.criadoEm ?? Date.now()
          c.sujo = 1
          uidDoCliente.set(c.id, c.uid)
        })
      await tx
        .table('orcamentos')
        .toCollection()
        .modify((o) => {
          o.uid ??= novoId()
          if (o.status === 'enviado') o.status = 'pendente'
          if (o.clienteId != null) o.clienteUid = uidDoCliente.get(o.clienteId)
          delete o.clienteId
          o.impostoPercentual ??= 0
          o.termos ??= ''
          o.sujo = 1
        })
      await tx
        .table('empresa')
        .toCollection()
        .modify((e) => {
          e.sujo = 1
        })
    })

  // Qualquer gravação feita pelo app marca o registro como "sujo" (pendente de envio à nuvem).
  for (const tabela of [b.empresa, b.clientes, b.orcamentos, b.eventos]) {
    tabela.hook('creating', (_pk, obj, tx) => {
      if (!(tx as TxSync)._sync) (obj as { sujo?: 0 | 1 }).sujo = 1
    })
    tabela.hook('updating', (mods, _pk, _obj, tx) => {
      if ((tx as TxSync)._sync || 'sujo' in mods) return undefined
      return 'atualizadoEm' in mods ? { sujo: 1 } : { sujo: 1, atualizadoEm: Date.now() }
    })
  }

  return b
}

const BANCO_VISITANTE = 'orcafacil'
export const nomeDoBanco = (userId: string | null) => (userId ? `${BANCO_VISITANTE}-${userId}` : BANCO_VISITANTE)

/** Banco em uso. É trocado ao entrar/sair da conta; importe sempre `db` (ligação viva do módulo). */
export let db: Banco = abrir(BANCO_VISITANTE)

/** Troca para o banco da conta (ou do visitante). Retorna true se mudou. */
export function trocarBanco(userId: string | null): boolean {
  const nome = nomeDoBanco(userId)
  if (db.name === nome) return false
  db.close()
  db = abrir(nome)
  return true
}

/** Abre outro banco sem torná-lo o atual (usado para importar os dados do visitante para a conta). */
export function abrirBancoVisitante(): Banco {
  return abrir(BANCO_VISITANTE)
}

export const EMPRESA_PADRAO: Empresa = {
  id: 'principal',
  nome: '',
  razaoSocial: '',
  documento: '',
  email: '',
  telefone: '',
  whatsapp: '',
  endereco: '',
  site: '',
  responsavel: '',
  corTema: '#1f6a58',
  proximoNumero: 1,
  validadePadraoDias: 15,
  condicoesPadrao: '',
  observacoesPadrao: '',
  termosPadrao: '',
  dadosPagamento: '',
  rodape: '',
}

/** Completa uma empresa salva em versões antigas com os campos novos. */
export const normalizarEmpresa = (e?: Partial<Empresa> | null): Empresa => ({ ...EMPRESA_PADRAO, ...e, id: 'principal' })

export async function obterEmpresa(): Promise<Empresa> {
  return normalizarEmpresa(await db.empresa.get('principal'))
}

export const CLIENTE_VAZIO: DadosCliente = { nome: '', documento: '', email: '', telefone: '', endereco: '' }

export function novoItem(): ItemOrcamento {
  return { id: novoId(), descricao: '', detalhes: '', quantidade: 1, unidade: 'un', valorUnitario: 0 }
}

export async function registrarEvento(orcamentoUid: string, tipo: TipoEvento, dados: Evento['dados'] = {}) {
  await db.eventos.add({ uid: novoId(), orcamentoUid, tipo, dados, criadoEm: Date.now() })
}

/** Cria um orçamento novo reservando o próximo número da empresa. */
export async function criarOrcamento(base?: Partial<Orcamento>): Promise<number> {
  return db.transaction('rw', db.empresa, db.orcamentos, db.eventos, async () => {
    const empresa = await obterEmpresa()
    const agora = Date.now()
    const uid = novoId()
    const id = await db.orcamentos.add({
      titulo: '',
      cliente: { ...CLIENTE_VAZIO },
      itens: [novoItem()],
      fotos: [],
      descontoTipo: 'percentual',
      desconto: 0,
      impostoPercentual: 0,
      frete: 0,
      observacoes: empresa.observacoesPadrao,
      condicoesPagamento: empresa.condicoesPadrao,
      termos: empresa.termosPadrao,
      prazoEntrega: '',
      validadeDias: empresa.validadePadraoDias,
      ...base,
      uid,
      numero: empresa.proximoNumero,
      status: 'rascunho',
      criadoEm: agora,
      atualizadoEm: agora,
    })
    await db.empresa.put({ ...empresa, proximoNumero: empresa.proximoNumero + 1, atualizadoEm: agora })
    await registrarEvento(uid, 'criacao')
    return id as number
  })
}

export async function duplicarOrcamento(id: number): Promise<number | undefined> {
  const original = await db.orcamentos.get(id)
  if (!original) return undefined
  const { id: _id, uid: _uid, sujo: _sujo, ...resto } = original
  void _id, _uid, _sujo
  return criarOrcamento({
    ...resto,
    titulo: original.titulo ? `${original.titulo} (cópia)` : '',
    itens: original.itens.map((i) => ({ ...i, id: novoId() })),
    fotos: original.fotos.map((f) => ({ ...f, id: novoId() })),
  })
}

export async function excluirOrcamento(id: number) {
  await db.transaction('rw', db.orcamentos, db.eventos, db.excluidos, async () => {
    const o = await db.orcamentos.get(id)
    if (!o) return
    await db.orcamentos.delete(id)
    await db.eventos.where('orcamentoUid').equals(o.uid).delete()
    await db.excluidos.add({ tabela: 'orcamentos', uid: o.uid })
  })
}

export async function excluirCliente(id: number) {
  await db.transaction('rw', db.clientes, db.excluidos, async () => {
    const c = await db.clientes.get(id)
    if (!c) return
    await db.clientes.delete(id)
    await db.excluidos.add({ tabela: 'clientes', uid: c.uid })
  })
}
