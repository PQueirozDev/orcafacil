import { describe, expect, it } from 'vitest'
import { diasParaVencer, editavel, podeMudar, statusExibido } from '../src/lib/status'

const DIA = 86_400_000

describe('fluxo de status', () => {
  it('permite apenas transições coerentes', () => {
    expect(podeMudar('rascunho', 'pendente')).toBe(true)
    expect(podeMudar('pendente', 'aprovado')).toBe(true)
    expect(podeMudar('aprovado', 'recusado')).toBe(false)
    expect(podeMudar('recusado', 'aprovado')).toBe(false)
    expect(podeMudar('aprovado', 'rascunho')).toBe(false)
    expect(podeMudar('aprovado', 'cancelado')).toBe(true)
    expect(podeMudar('rascunho', 'visualizado')).toBe(false)
  })

  it('bloqueia edição de propostas finalizadas', () => {
    expect(editavel('rascunho')).toBe(true)
    expect(editavel('visualizado')).toBe(true)
    expect(editavel('aprovado')).toBe(false)
    expect(editavel('cancelado')).toBe(false)
  })

  it('marca como expirado só propostas enviadas após a validade', () => {
    const agora = Date.now()
    const vencido = { criadoEm: agora - 20 * DIA, validadeDias: 15 }
    expect(statusExibido({ ...vencido, status: 'pendente' }, agora)).toBe('expirado')
    expect(statusExibido({ ...vencido, status: 'visualizado' }, agora)).toBe('expirado')
    expect(statusExibido({ ...vencido, status: 'rascunho' }, agora)).toBe('rascunho')
    expect(statusExibido({ ...vencido, status: 'aprovado' }, agora)).toBe('aprovado')
    expect(statusExibido({ criadoEm: agora, validadeDias: 15, status: 'pendente' }, agora)).toBe('pendente')
  })

  it('conta dias para vencer', () => {
    const agora = Date.now()
    expect(diasParaVencer({ criadoEm: agora, validadeDias: 3 }, agora)).toBe(3)
    expect(diasParaVencer({ criadoEm: agora - 5 * DIA, validadeDias: 3 }, agora)).toBe(-2)
  })
})
