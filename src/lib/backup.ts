import { db, novoId, type Cliente, type Empresa, type Evento, type Orcamento } from '../db'

/** Backup em arquivo .json (todos os dados deste navegador/conta). */
interface ArquivoBackup {
  app: 'orcafacil'
  versao: 1 | 2
  geradoEm: number
  empresa: Empresa[]
  clientes: Cliente[]
  orcamentos: Orcamento[]
  eventos?: Evento[]
}

export async function exportarBackup() {
  const dados: ArquivoBackup = {
    app: 'orcafacil',
    versao: 2,
    geradoEm: Date.now(),
    empresa: await db.empresa.toArray(),
    clientes: await db.clientes.toArray(),
    orcamentos: await db.orcamentos.toArray(),
    eventos: await db.eventos.toArray(),
  }
  const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orcafacil-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Valida a estrutura do arquivo. Lança erro sem alterar nada se algo estiver errado. */
export function validarBackup(dados: unknown): ArquivoBackup {
  const d = dados as ArquivoBackup
  if (d?.app !== 'orcafacil') throw new Error('Este arquivo não é um backup do OrçaFácil.')
  if (d.versao !== 1 && d.versao !== 2) throw new Error('Versão de backup não suportada.')
  const valido =
    Array.isArray(d.empresa) &&
    Array.isArray(d.clientes) &&
    Array.isArray(d.orcamentos) &&
    d.empresa.every((e) => e?.id === 'principal' && typeof e.nome === 'string') &&
    d.clientes.every((c) => typeof c?.nome === 'string') &&
    d.orcamentos.every((o) => typeof o?.numero === 'number' && Array.isArray(o.itens) && Array.isArray(o.fotos) && !!o.cliente)
  if (!valido) throw new Error('Backup incompleto ou corrompido. Nenhum dado foi alterado.')
  return d
}

/**
 * Substitui os dados locais pelos do arquivo. Em uma conta, os registros importados ficam
 * "pendentes" e são enviados à nuvem; os que existiam e não estão no arquivo são excluídos lá também.
 */
export async function importarBackup(arquivo: File) {
  let bruto: unknown
  try {
    bruto = JSON.parse(await arquivo.text())
  } catch {
    throw new Error('Arquivo inválido: não é um JSON.')
  }
  const dados = validarBackup(bruto)

  // Backups da versão 1 não tinham identificadores estáveis
  const uidPorIdAntigo = new Map<number, string>()
  const clientes: Cliente[] = dados.clientes.map((c) => {
    const uid = c.uid ?? novoId()
    if (typeof c.id === 'number') uidPorIdAntigo.set(c.id, uid)
    const { id: _id, ...resto } = c
    void _id
    return { ...resto, uid, observacoes: c.observacoes ?? '', atualizadoEm: c.atualizadoEm ?? c.criadoEm ?? Date.now() }
  })
  const orcamentos: Orcamento[] = dados.orcamentos.map((o) => {
    const antigo = o as Omit<Orcamento, 'status'> & { clienteId?: number; status: string }
    const { id: _id, clienteId, ...resto } = antigo
    void _id
    return {
      ...resto,
      uid: o.uid ?? novoId(),
      clienteUid: o.clienteUid ?? (clienteId != null ? uidPorIdAntigo.get(clienteId) : undefined),
      status: (antigo.status === 'enviado' ? 'pendente' : antigo.status) as Orcamento['status'],
      impostoPercentual: o.impostoPercentual ?? 0,
      termos: o.termos ?? '',
    }
  })

  await db.transaction('rw', [db.empresa, db.clientes, db.orcamentos, db.eventos, db.excluidos], async () => {
    const [clientesAntigos, orcAntigos] = await Promise.all([db.clientes.toArray(), db.orcamentos.toArray()])
    const novosC = new Set(clientes.map((c) => c.uid))
    const novosO = new Set(orcamentos.map((o) => o.uid))
    await db.excluidos.bulkAdd([
      ...clientesAntigos.filter((c) => !novosC.has(c.uid)).map((c) => ({ tabela: 'clientes' as const, uid: c.uid })),
      ...orcAntigos.filter((o) => !novosO.has(o.uid)).map((o) => ({ tabela: 'orcamentos' as const, uid: o.uid })),
    ])
    await Promise.all([db.empresa.clear(), db.clientes.clear(), db.orcamentos.clear(), db.eventos.clear()])
    await db.empresa.bulkPut(dados.empresa.map((e) => ({ ...e, sujo: 1 })))
    await db.clientes.bulkAdd(clientes)
    await db.orcamentos.bulkAdd(orcamentos)
    if (dados.eventos) await db.eventos.bulkAdd(dados.eventos.map(({ id: _id, ...e }) => e))
  })
  return { orcamentos: orcamentos.length, clientes: clientes.length }
}

/** Apaga tudo deste navegador. Em uma conta, também exclui os registros na nuvem. */
export async function apagarTudo() {
  await db.transaction('rw', [db.empresa, db.clientes, db.orcamentos, db.eventos, db.excluidos], async () => {
    const [c, o] = await Promise.all([db.clientes.toArray(), db.orcamentos.toArray()])
    await db.excluidos.bulkAdd([
      ...c.map((x) => ({ tabela: 'clientes' as const, uid: x.uid })),
      ...o.map((x) => ({ tabela: 'orcamentos' as const, uid: x.uid })),
    ])
    await Promise.all([db.empresa.clear(), db.clientes.clear(), db.orcamentos.clear(), db.eventos.clear()])
  })
}
