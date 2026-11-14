import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { webhookValido } from '../api/_comum'

const segredo = 'whsec_teste_123'
const assinar = (corpo: string, t: number, s = segredo) => `t=${t},v1=${createHmac('sha256', s).update(`${t}.${corpo}`).digest('hex')}`

describe('webhook do Stripe', () => {
  const corpo = '{"type":"customer.subscription.updated"}'
  const agora = Math.floor(Date.now() / 1000)

  it('aceita assinatura válida e recente', () => {
    expect(webhookValido(corpo, assinar(corpo, agora), segredo)).toBe(true)
  })

  it('recusa corpo alterado, segredo errado, cabeçalho ausente e evento antigo', () => {
    expect(webhookValido(corpo + ' ', assinar(corpo, agora), segredo)).toBe(false)
    expect(webhookValido(corpo, assinar(corpo, agora, 'outro'), segredo)).toBe(false)
    expect(webhookValido(corpo, null, segredo)).toBe(false)
    expect(webhookValido(corpo, assinar(corpo, agora - 3600), segredo)).toBe(false)
    expect(webhookValido(corpo, assinar(corpo, agora), '')).toBe(false)
  })
})
