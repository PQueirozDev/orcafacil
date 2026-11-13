import type { ItemOrcamento, Orcamento } from '../db'

/** Arredonda para centavos (o que aparece no PDF é o que entra na soma). */
export const centavos = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const totalItem = (item: ItemOrcamento) => centavos((item.quantidade || 0) * (item.valorUnitario || 0))

export function calcularTotais(orc: Pick<Orcamento, 'itens' | 'descontoTipo' | 'desconto' | 'frete'>) {
  const subtotal = centavos(orc.itens.reduce((soma, item) => soma + totalItem(item), 0))
  const descontoBruto = orc.descontoTipo === 'percentual' ? subtotal * ((orc.desconto || 0) / 100) : orc.desconto || 0
  const desconto = centavos(Math.min(Math.max(descontoBruto, 0), subtotal))
  const frete = centavos(Math.max(orc.frete || 0, 0))
  return { subtotal, desconto, frete, total: centavos(subtotal - desconto + frete) }
}
