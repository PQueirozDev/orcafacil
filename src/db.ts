import Dexie, { type EntityTable } from 'dexie'

export type StatusOrcamento = 'rascunho' | 'enviado' | 'aprovado' | 'recusado'

export type SecaoId = 'cliente' | 'itens' | 'totais' | 'fotos' | 'condicoes' | 'assinaturas'

/** Aparência do orçamento impresso (posição, tamanho e cores). */
export interface LayoutDoc {
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
  cantos: 'retos' | 'arredondados'
  fonte: 'moderna' | 'classica'
  corTexto: string
  corTitulos: string
  corFundoCaixas: string
}

export const SECOES: Record<SecaoId, string> = {
  cliente: 'Cliente e referência',
  itens: 'Tabela de itens',
  totais: 'Totais',
  fotos: 'Fotos',
  condicoes: 'Condições e observações',
  assinaturas: 'Assinaturas',
}

export const LAYOUT_PADRAO: LayoutDoc = {
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
  cantos: 'arredondados',
  fonte: 'moderna',
  corTexto: '#1e293b',
  corTitulos: '#0f172a',
  corFundoCaixas: '#f8fafc',
}

/** Junta o layout salvo com o padrão (cobre empresas salvas antes desta opção existir). */
export function layoutDe(e: Pick<Empresa, 'layout'>): LayoutDoc {
  const l = { ...LAYOUT_PADRAO, ...e.layout }
  const ordem = l.ordem.filter((s) => s in SECOES)
  for (const s of LAYOUT_PADRAO.ordem) if (!ordem.includes(s)) ordem.push(s)
  return { ...l, ordem }
}

export interface Empresa {
  layout?: Partial<LayoutDoc>
  id: 'principal'
  nome: string
  documento: string
  email: string
  telefone: string
  endereco: string
  site: string
  responsavel: string
  logo?: string
  corTema: string
  proximoNumero: number
  validadePadraoDias: number
  condicoesPadrao: string
}

export interface Cliente {
  id?: number
  nome: string
  documento: string
  email: string
  telefone: string
  endereco: string
  criadoEm: number
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

export interface DadosCliente {
  nome: string
  documento: string
  email: string
  telefone: string
  endereco: string
}

export interface Orcamento {
  id?: number
  numero: number
  titulo: string
  clienteId?: number
  cliente: DadosCliente
  itens: ItemOrcamento[]
  fotos: FotoOrcamento[]
  descontoTipo: 'percentual' | 'valor'
  desconto: number
  frete: number
  observacoes: string
  condicoesPagamento: string
  prazoEntrega: string
  validadeDias: number
  status: StatusOrcamento
  criadoEm: number
  atualizadoEm: number
}

export const db = new Dexie('orcafacil') as Dexie & {
  empresa: EntityTable<Empresa, 'id'>
  clientes: EntityTable<Cliente, 'id'>
  orcamentos: EntityTable<Orcamento, 'id'>
}

db.version(1).stores({
  empresa: 'id',
  clientes: '++id, nome, criadoEm',
  orcamentos: '++id, numero, status, clienteId, atualizadoEm',
})

export const EMPRESA_PADRAO: Empresa = {
  id: 'principal',
  nome: 'Minha Empresa',
  documento: '',
  email: '',
  telefone: '',
  endereco: '',
  site: '',
  responsavel: '',
  corTema: '#4f46e5',
  proximoNumero: 1,
  validadePadraoDias: 15,
  condicoesPadrao: '50% de entrada e 50% na entrega. Pix, transferência ou cartão.',
}

export async function obterEmpresa(): Promise<Empresa> {
  return (await db.empresa.get('principal')) ?? EMPRESA_PADRAO
}

export const CLIENTE_VAZIO: DadosCliente = {
  nome: '',
  documento: '',
  email: '',
  telefone: '',
  endereco: '',
}

export function novoId() {
  return crypto.randomUUID()
}

export function novoItem(): ItemOrcamento {
  return { id: novoId(), descricao: '', detalhes: '', quantidade: 1, unidade: 'un', valorUnitario: 0 }
}

/** Cria um orçamento novo reservando o próximo número da empresa. */
export async function criarOrcamento(): Promise<number> {
  return db.transaction('rw', db.empresa, db.orcamentos, async () => {
    const empresa = await obterEmpresa()
    const agora = Date.now()
    const id = await db.orcamentos.add({
      numero: empresa.proximoNumero,
      titulo: '',
      cliente: { ...CLIENTE_VAZIO },
      itens: [novoItem()],
      fotos: [],
      descontoTipo: 'percentual',
      desconto: 0,
      frete: 0,
      observacoes: '',
      condicoesPagamento: empresa.condicoesPadrao,
      prazoEntrega: '',
      validadeDias: empresa.validadePadraoDias,
      status: 'rascunho',
      criadoEm: agora,
      atualizadoEm: agora,
    })
    await db.empresa.put({ ...empresa, proximoNumero: empresa.proximoNumero + 1 })
    return id as number
  })
}

export async function duplicarOrcamento(id: number): Promise<number | undefined> {
  return db.transaction('rw', db.empresa, db.orcamentos, async () => {
    const original = await db.orcamentos.get(id)
    if (!original) return undefined
    const empresa = await obterEmpresa()
    const agora = Date.now()
    const copia: Orcamento = {
      ...original,
      numero: empresa.proximoNumero,
      titulo: original.titulo ? `${original.titulo} (cópia)` : '',
      status: 'rascunho',
      criadoEm: agora,
      atualizadoEm: agora,
    }
    delete copia.id
    const novo = await db.orcamentos.add(copia)
    await db.empresa.put({ ...empresa, proximoNumero: empresa.proximoNumero + 1 })
    return novo as number
  })
}
