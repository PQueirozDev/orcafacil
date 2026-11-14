import { LAYOUT_PADRAO, type LayoutDoc, type ModeloId } from '../db'

/** Modelos visuais prontos. Cada um é um ponto de partida: tudo continua personalizável. */
export const MODELOS: Record<ModeloId, { nome: string; descricao: string; cor: string; layout: Partial<LayoutDoc> }> = {
  moderno: {
    nome: 'Moderno',
    descricao: 'Minimalista e elegante, cantos arredondados.',
    cor: '#1f6a58',
    layout: {},
  },
  classico: {
    nome: 'Clássico',
    descricao: 'Empresarial tradicional: serifa, logo centralizada e linhas finas.',
    cor: '#1e293b',
    layout: {
      fonte: 'classica',
      cantos: 'retos',
      posicaoLogo: 'centro',
      estiloTabela: 'linhas',
      corFundoCaixas: '#ffffff',
      corSecundaria: '#475569',
    },
  },
  criativo: {
    nome: 'Criativo',
    descricao: 'Cabeçalho em faixa colorida e fotos em destaque. Para designers e freelancers.',
    cor: '#db2777',
    layout: {
      estiloCabecalho: 'faixa',
      corSecundaria: '#7c3aed',
      colunasFotos: 2,
      alturaFotos: 70,
      tamanhoFotoItem: 64,
      corFundoCaixas: '#fdf2f8',
      ordem: ['cliente', 'fotos', 'itens', 'totais', 'condicoes', 'assinaturas'],
    },
  },
  tecnico: {
    nome: 'Técnico',
    descricao: 'Compacto, tabela zebrada e fonte neutra. Para manutenção e instalações.',
    cor: '#0f766e',
    layout: {
      fonte: 'neutra',
      cantos: 'retos',
      estiloTabela: 'zebrado',
      tamanhoFonte: 9.5,
      tamanhoFotoItem: 44,
      colunasFotos: 3,
      alturaFotos: 42,
      tamanhoLogo: 52,
      corSecundaria: '#334155',
      corFundoCaixas: '#f1f5f9',
    },
  },
  comercial: {
    nome: 'Comercial',
    descricao: 'Faixa no topo, total em destaque e foto grande. Para lojas e prestadores de serviço.',
    cor: '#c2410c',
    layout: {
      estiloCabecalho: 'faixa',
      tamanhoFonte: 11,
      colunasFotos: 1,
      alturaFotos: 90,
      tamanhoFotoItem: 72,
      corSecundaria: '#9a3412',
      corFundoCaixas: '#fff7ed',
    },
  },
}

export const layoutDoModelo = (id: ModeloId): LayoutDoc => ({ ...LAYOUT_PADRAO, ...MODELOS[id].layout, modelo: id })
