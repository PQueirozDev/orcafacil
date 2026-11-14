import { describe, expect, it } from 'vitest'
import { calcularTotais, centavos, totalItem, validarOrcamento } from '../src/lib/calculos'

const item = (quantidade: number, valorUnitario: number) => ({ id: 'x', descricao: 'Item', detalhes: '', unidade: 'un', quantidade, valorUnitario })
const base = { descontoTipo: 'percentual' as const, desconto: 0, frete: 0, impostoPercentual: 0 }

describe('cálculos do orçamento', () => {
  it('multiplica quantidade por preço e arredonda em centavos', () => {
    expect(totalItem(item(3, 19.99))).toBe(59.97)
    expect(totalItem(item(0.5, 0.01))).toBe(0.01)
    expect(totalItem(item(3.2, 1250))).toBe(4000)
  })

  it('ignora quantidades e preços negativos ou inválidos', () => {
    expect(totalItem(item(-2, 10))).toBe(0)
    expect(totalItem(item(2, -10))).toBe(0)
    expect(totalItem(item(Number.NaN, 10))).toBe(0)
  })

  it('subtotal é a soma dos itens já arredondados (bate com o PDF)', () => {
    const t = calcularTotais({ ...base, itens: [item(0.5, 0.01), item(0.5, 0.01)] })
    expect(t.subtotal).toBe(0.02)
  })

  it('aplica desconto percentual e em reais, limitado ao subtotal', () => {
    expect(calcularTotais({ ...base, itens: [item(1, 200)], desconto: 10 }).total).toBe(180)
    expect(calcularTotais({ ...base, itens: [item(1, 200)], descontoTipo: 'valor', desconto: 50 }).total).toBe(150)
    expect(calcularTotais({ ...base, itens: [item(1, 200)], descontoTipo: 'valor', desconto: 999 }).total).toBe(0)
    expect(calcularTotais({ ...base, itens: [item(1, 200)], desconto: 150 }).desconto).toBe(200)
  })

  it('calcula imposto sobre o valor com desconto e soma frete sem imposto', () => {
    const t = calcularTotais({ ...base, itens: [item(1, 1000)], desconto: 10, impostoPercentual: 5, frete: 50 })
    expect(t).toEqual({ subtotal: 1000, desconto: 100, imposto: 45, frete: 50, total: 995 })
  })

  it('arredonda corretamente casos de ponto flutuante', () => {
    expect(centavos(1.005)).toBe(1.01)
    expect(centavos(0.1 + 0.2)).toBe(0.3)
    const t = calcularTotais({ ...base, itens: [item(3, 33.33)], impostoPercentual: 7.5 })
    expect(t.subtotal).toBe(99.99)
    expect(t.imposto).toBe(7.5)
    expect(t.total).toBe(107.49)
  })

  it('valida campos obrigatórios antes de enviar', () => {
    const vazio = {
      cliente: { nome: '', documento: '', email: 'x', telefone: '', endereco: '' },
      itens: [],
      descontoTipo: 'percentual' as const,
      desconto: 120,
      validadeDias: 0,
    }
    const campos = validarOrcamento(vazio).map((p) => p.campo)
    expect(campos).toEqual(expect.arrayContaining(['cliente', 'email', 'itens', 'desconto', 'validade']))
    const ok = { ...vazio, cliente: { ...vazio.cliente, nome: 'Ana', email: 'ana@exemplo.com' }, itens: [item(1, 10)], desconto: 0, validadeDias: 15 }
    expect(validarOrcamento(ok)).toEqual([])
  })
})
