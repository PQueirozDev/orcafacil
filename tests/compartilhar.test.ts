import { describe, expect, it } from 'vitest'
import { estadoDoLink, gerarToken, montarSnapshot, type Link } from '../src/lib/compartilhar'
import { EMPRESA_EXEMPLO, orcamentoExemplo } from '../src/lib/exemplo'

const link = (p: Partial<Link>): Link => ({
  id: '1',
  token: 't',
  criado_em: '',
  expira_em: null,
  revogado_em: null,
  visualizado_em: null,
  decisao: null,
  decidido_em: null,
  decisor_nome: null,
  comentario: null,
  permite_pdf: true,
  ...p,
})

describe('links de proposta', () => {
  it('gera tokens de 256 bits em base64url, sem repetição', () => {
    const tokens = new Set(Array.from({ length: 500 }, gerarToken))
    expect(tokens.size).toBe(500)
    for (const t of tokens) expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it('calcula o estado do link', () => {
    const agora = Date.now()
    expect(estadoDoLink(link({}), agora)).toBe('ativo')
    expect(estadoDoLink(link({ revogado_em: new Date().toISOString() }), agora)).toBe('revogado')
    expect(estadoDoLink(link({ expira_em: new Date(agora - 1000).toISOString() }), agora)).toBe('expirado')
    expect(estadoDoLink(link({ decisao: 'aprovado', expira_em: new Date(agora - 1000).toISOString() }), agora)).toBe('aprovado')
  })

  it('snapshot não leva dados internos (numeração, configurações, id local)', () => {
    const o = { ...orcamentoExemplo(7), id: 99, sujo: 1 as const, clienteUid: 'abc' }
    const s = montarSnapshot(o, { ...EMPRESA_EXEMPLO, proximoNumero: 42, condicoesPadrao: 'interno' })
    expect(s.orcamento).not.toHaveProperty('id')
    expect(s.orcamento).not.toHaveProperty('sujo')
    expect(s.orcamento).not.toHaveProperty('clienteUid')
    expect(s.empresa).not.toHaveProperty('proximoNumero')
    expect(s.empresa).not.toHaveProperty('condicoesPadrao')
    expect(s.orcamento.numero).toBe(7)
    expect(s.total).toBeGreaterThan(0)
  })
})
