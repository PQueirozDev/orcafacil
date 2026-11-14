import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { orcamentoExemplo } from '../src/lib/exemplo'
import { clienteDaNuvem, clienteParaNuvem, orcamentoDaNuvem, orcamentoParaNuvem } from '../src/lib/sync'

describe('conversões da sincronização', () => {
  it('orçamento ida e volta preserva o conteúdo', () => {
    const o = { ...orcamentoExemplo(12), impostoPercentual: 3, termos: 'Termos', clienteUid: 'c1' }
    const linha = orcamentoParaNuvem(o)
    expect(linha.id).toBe(o.uid)
    expect(linha.total).toBeGreaterThan(0)
    const volta = orcamentoDaNuvem({ ...linha, atualizado_em: linha.editado_em, excluido_em: null } as never)
    expect(volta).toMatchObject({
      uid: o.uid,
      numero: 12,
      titulo: o.titulo,
      clienteUid: 'c1',
      itens: o.itens,
      fotos: o.fotos,
      impostoPercentual: 3,
      termos: 'Termos',
      status: o.status,
      sujo: 0,
    })
  })

  it('cliente ida e volta preserva o conteúdo', () => {
    const c = { uid: 'u1', nome: 'Ana', documento: '1', email: 'a@b.c', telefone: '2', endereco: 'R', observacoes: 'obs', criadoEm: 1000, atualizadoEm: 2000 }
    const volta = clienteDaNuvem({ ...clienteParaNuvem(c), atualizado_em: '', excluido_em: null })
    expect(volta).toMatchObject({ ...c, sujo: 0 })
  })
})

describe('banco local', () => {
  it('marca registros como pendentes, numera em sequência e registra exclusões', async () => {
    const { db, criarOrcamento, duplicarOrcamento, excluirOrcamento } = await import('../src/db')
    const id = await criarOrcamento()
    const o = await db.orcamentos.get(id)
    expect(o?.sujo).toBe(1)
    expect(o?.numero).toBe(1)

    const copia = await duplicarOrcamento(id)
    expect((await db.orcamentos.get(copia!))?.numero).toBe(2)
    expect((await db.empresa.get('principal'))?.proximoNumero).toBe(3)
    expect(await db.eventos.where('orcamentoUid').equals(o!.uid).count()).toBe(1)

    await excluirOrcamento(id)
    expect(await db.orcamentos.get(id)).toBeUndefined()
    expect(await db.excluidos.toArray()).toEqual([expect.objectContaining({ tabela: 'orcamentos', uid: o!.uid })])
  })

  it('gravação vinda da sincronização não marca o registro como pendente', async () => {
    const { db, marcarSync, novoId } = await import('../src/db')
    const uid = novoId()
    await db.transaction('rw', db.clientes, async (tx) => {
      marcarSync(tx)
      await db.clientes.add({ uid, nome: 'Da nuvem', documento: '', email: '', telefone: '', endereco: '', observacoes: '', criadoEm: 1, atualizadoEm: 1, sujo: 0 })
    })
    const c = await db.clientes.where('uid').equals(uid).first()
    expect(c?.sujo).toBe(0)
    await db.clientes.update(c!.id!, { nome: 'Editado aqui' })
    expect((await db.clientes.get(c!.id!))?.sujo).toBe(1)
  })
})
