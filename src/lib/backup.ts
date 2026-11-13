import { db, type Cliente, type Empresa, type Orcamento } from '../db'

interface ArquivoBackup {
  app: 'orcafacil'
  versao: 1
  geradoEm: number
  empresa: Empresa[]
  clientes: Cliente[]
  orcamentos: Orcamento[]
}

export async function exportarBackup() {
  const dados: ArquivoBackup = {
    app: 'orcafacil',
    versao: 1,
    geradoEm: Date.now(),
    empresa: await db.empresa.toArray(),
    clientes: await db.clientes.toArray(),
    orcamentos: await db.orcamentos.toArray(),
  }
  const blob = new Blob([JSON.stringify(dados)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `orcafacil-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function importarBackup(arquivo: File) {
  let dados: ArquivoBackup
  try {
    dados = JSON.parse(await arquivo.text())
  } catch {
    throw new Error('Arquivo inválido: não é um JSON.')
  }
  if (dados?.app !== 'orcafacil') throw new Error('Este arquivo não é um backup do Orçafácil.')
  if (dados.versao !== 1) throw new Error('Versão de backup não suportada.')
  const valido =
    Array.isArray(dados.empresa) &&
    Array.isArray(dados.clientes) &&
    Array.isArray(dados.orcamentos) &&
    dados.empresa.every((e) => e?.id === 'principal' && typeof e.nome === 'string') &&
    dados.clientes.every((c) => typeof c?.id === 'number' && typeof c.nome === 'string') &&
    dados.orcamentos.every(
      (o) => typeof o?.id === 'number' && typeof o.numero === 'number' && Array.isArray(o.itens) && Array.isArray(o.fotos) && o.cliente,
    )
  if (!valido) throw new Error('Backup incompleto ou corrompido. Nenhum dado foi alterado.')
  await db.transaction('rw', db.empresa, db.clientes, db.orcamentos, async () => {
    await Promise.all([db.empresa.clear(), db.clientes.clear(), db.orcamentos.clear()])
    await db.empresa.bulkPut(dados.empresa)
    await db.clientes.bulkPut(dados.clientes)
    await db.orcamentos.bulkPut(dados.orcamentos)
  })
  return { orcamentos: dados.orcamentos.length, clientes: dados.clientes.length }
}

export async function apagarTudo() {
  await db.transaction('rw', db.empresa, db.clientes, db.orcamentos, async () => {
    await Promise.all([db.empresa.clear(), db.clientes.clear(), db.orcamentos.clear()])
  })
}
