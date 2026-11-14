import type { ItemOrcamento, Orcamento } from '../db'

/** Arredonda para centavos (o que aparece no PDF é o que entra na soma). */
export const centavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

const positivo = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

export const totalItem = (item: Pick<ItemOrcamento, 'quantidade' | 'valorUnitario'>) =>
  centavos(positivo(item.quantidade) * positivo(item.valorUnitario))

export interface Totais {
  subtotal: number
  desconto: number
  imposto: number
  frete: number
  total: number
}

/**
 * Ordem do cálculo: subtotal dos itens → desconto (limitado ao subtotal) →
 * imposto sobre o valor já com desconto → frete (sem imposto).
 */
export function calcularTotais(
  orc: Pick<Orcamento, 'itens' | 'descontoTipo' | 'desconto' | 'frete'> & { impostoPercentual?: number },
): Totais {
  const subtotal = centavos(orc.itens.reduce((soma, item) => soma + totalItem(item), 0))
  const d = positivo(orc.desconto)
  const descontoBruto = orc.descontoTipo === 'percentual' ? subtotal * (Math.min(d, 100) / 100) : d
  const desconto = centavos(Math.min(descontoBruto, subtotal))
  const imposto = centavos((subtotal - desconto) * (Math.min(positivo(orc.impostoPercentual ?? 0), 100) / 100))
  const frete = centavos(positivo(orc.frete))
  return { subtotal, desconto, imposto, frete, total: centavos(subtotal - desconto + imposto + frete) }
}

export interface ProblemaValidacao {
  campo: string
  mensagem: string
}

/** Validação do orçamento antes de compartilhar ou exportar. */
export function validarOrcamento(o: Pick<Orcamento, 'cliente' | 'itens' | 'descontoTipo' | 'desconto' | 'validadeDias'>): ProblemaValidacao[] {
  const p: ProblemaValidacao[] = []
  if (!o.cliente.nome.trim()) p.push({ campo: 'cliente', mensagem: 'Informe o nome do cliente.' })
  if (o.cliente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.cliente.email)) p.push({ campo: 'email', mensagem: 'O e-mail do cliente parece inválido.' })
  const validos = o.itens.filter((i) => i.descricao.trim())
  if (!validos.length) p.push({ campo: 'itens', mensagem: 'Adicione pelo menos um item com descrição.' })
  if (o.itens.some((i) => i.descricao.trim() && (!(i.quantidade > 0) || i.valorUnitario < 0)))
    p.push({ campo: 'itens', mensagem: 'Há itens com quantidade zero ou preço negativo.' })
  if (o.descontoTipo === 'percentual' && o.desconto > 100) p.push({ campo: 'desconto', mensagem: 'O desconto não pode passar de 100%.' })
  if (!(o.validadeDias >= 1)) p.push({ campo: 'validade', mensagem: 'A validade precisa ser de pelo menos 1 dia.' })
  return p
}
