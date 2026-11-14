import { liveQuery } from 'dexie'
import { useSyncExternalStore } from 'react'
import { usuarioAtual } from '../auth'
import {
  abrirBancoVisitante,
  db,
  marcarSync,
  normalizarEmpresa,
  novoId,
  obterEmpresa,
  type Cliente,
  type Empresa,
  type Evento,
  type Orcamento,
} from '../db'
import { calcularTotais } from './calculos'
import { supabase } from './supabase'

/**
 * Sincronização entre o banco local (IndexedDB) e o Supabase.
 * - Envio: registros com sujo=1 são gravados na nuvem; exclusões viram exclusão lógica (excluido_em).
 * - Recebimento: busca só o que mudou desde o último cursor (atualizado_em do servidor), em páginas.
 * - Conflitos: a última gravação vence; uma edição local ainda não enviada não é sobrescrita.
 *   Decisões do cliente (aprovado/recusado) vindas do servidor sempre prevalecem no status.
 */

export type Situacao = 'visitante' | 'sincronizando' | 'sincronizado' | 'pendente' | 'offline' | 'erro'

interface EstadoSync {
  situacao: Situacao
  ultima: number | null
  erro: string | null
}

let estado: EstadoSync = { situacao: 'visitante', ultima: null, erro: null }
const ouvintes = new Set<() => void>()
function definir(p: Partial<EstadoSync>) {
  estado = { ...estado, ...p }
  ouvintes.forEach((f) => f())
}

export function useSync() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => estado,
  )
}

const PAGINA = 500

// ------------------------------------------------------------------------------------------
// Conversões local <-> nuvem
// ------------------------------------------------------------------------------------------
const iso = (ms: number) => new Date(ms).toISOString()
const ms = (s: string | null | undefined) => (s ? new Date(s).getTime() : Date.now())

export function clienteParaNuvem(c: Cliente) {
  return {
    id: c.uid,
    nome: c.nome,
    documento: c.documento,
    email: c.email,
    telefone: c.telefone,
    endereco: c.endereco,
    observacoes: c.observacoes ?? '',
    criado_em: iso(c.criadoEm),
    editado_em: iso(c.atualizadoEm),
  }
}

interface LinhaCliente {
  id: string
  nome: string
  documento: string
  email: string
  telefone: string
  endereco: string
  observacoes: string
  criado_em: string
  editado_em: string
  atualizado_em: string
  excluido_em: string | null
}

export const clienteDaNuvem = (r: LinhaCliente): Omit<Cliente, 'id'> => ({
  uid: r.id,
  nome: r.nome,
  documento: r.documento,
  email: r.email,
  telefone: r.telefone,
  endereco: r.endereco,
  observacoes: r.observacoes,
  criadoEm: ms(r.criado_em),
  atualizadoEm: ms(r.editado_em),
  sujo: 0,
})

export function orcamentoParaNuvem(o: Orcamento) {
  return {
    id: o.uid,
    numero: o.numero,
    titulo: o.titulo,
    cliente_id: o.clienteUid ?? null,
    cliente: o.cliente,
    status: o.status,
    itens: o.itens,
    dados: {
      fotos: o.fotos,
      descontoTipo: o.descontoTipo,
      desconto: o.desconto,
      impostoPercentual: o.impostoPercentual,
      frete: o.frete,
      observacoes: o.observacoes,
      condicoesPagamento: o.condicoesPagamento,
      termos: o.termos,
      prazoEntrega: o.prazoEntrega,
      validadeDias: o.validadeDias,
    },
    total: calcularTotais(o).total,
    criado_em: iso(o.criadoEm),
    editado_em: iso(o.atualizadoEm),
  }
}

interface LinhaOrcamento {
  id: string
  numero: number
  titulo: string
  cliente_id: string | null
  cliente: Orcamento['cliente']
  status: Orcamento['status']
  itens: Orcamento['itens']
  dados: Partial<Orcamento>
  criado_em: string
  editado_em: string
  atualizado_em: string
  excluido_em: string | null
}

export const orcamentoDaNuvem = (r: LinhaOrcamento): Omit<Orcamento, 'id'> => ({
  uid: r.id,
  numero: r.numero,
  titulo: r.titulo,
  clienteUid: r.cliente_id ?? undefined,
  cliente: r.cliente,
  status: r.status,
  itens: r.itens ?? [],
  fotos: r.dados.fotos ?? [],
  descontoTipo: r.dados.descontoTipo ?? 'percentual',
  desconto: r.dados.desconto ?? 0,
  impostoPercentual: r.dados.impostoPercentual ?? 0,
  frete: r.dados.frete ?? 0,
  observacoes: r.dados.observacoes ?? '',
  condicoesPagamento: r.dados.condicoesPagamento ?? '',
  termos: r.dados.termos ?? '',
  prazoEntrega: r.dados.prazoEntrega ?? '',
  validadeDias: r.dados.validadeDias ?? 15,
  criadoEm: ms(r.criado_em),
  atualizadoEm: ms(r.editado_em),
  sujo: 0,
})

// ------------------------------------------------------------------------------------------
// Imagens: dataURL local -> arquivo no Storage (endereço pelo hash do conteúdo)
// ------------------------------------------------------------------------------------------
async function enviarImagem(dataUrl: string, userId: string): Promise<string> {
  const [cabecalho, base64] = dataUrl.split(',')
  const tipo = /data:(image\/(?:jpeg|png|webp))/.exec(cabecalho)?.[1]
  if (!tipo || !base64) return dataUrl // SVG de exemplo ou formato não aceito: fica embutido
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const caminho = `${userId}/${hash}.${tipo.split('/')[1].replace('jpeg', 'jpg')}`
  const { error } = await supabase!.storage
    .from('arquivos')
    .upload(caminho, bytes, { contentType: tipo, cacheControl: '31536000', upsert: false })
  if (error && !/exists|duplicate/i.test(error.message)) throw error
  return supabase!.storage.from('arquivos').getPublicUrl(caminho).data.publicUrl
}

const ehDataUrl = (s?: string) => !!s && s.startsWith('data:image/') && !s.startsWith('data:image/svg')

async function enviarImagensPendentes(userId: string) {
  const cache = new Map<string, string>()
  const subir = async (src: string) => {
    if (!cache.has(src)) cache.set(src, await enviarImagem(src, userId))
    return cache.get(src)!
  }

  const empresa = await db.empresa.get('principal')
  if (empresa && ehDataUrl(empresa.logo)) {
    const url = await subir(empresa.logo!)
    await db.empresa.update('principal', { logo: url })
  }

  const orcs = await db.orcamentos.where('sujo').equals(1).toArray()
  for (const o of orcs) {
    if (!o.itens.some((i) => ehDataUrl(i.foto)) && !o.fotos.some((f) => ehDataUrl(f.src))) continue
    const itens = await Promise.all(o.itens.map(async (i) => (ehDataUrl(i.foto) ? { ...i, foto: await subir(i.foto!) } : i)))
    const fotos = await Promise.all(o.fotos.map(async (f) => (ehDataUrl(f.src) ? { ...f, src: await subir(f.src) } : f)))
    // Só troca se ninguém editou o orçamento enquanto as fotos subiam
    await db.transaction('rw', db.orcamentos, async () => {
      const atual = await db.orcamentos.get(o.id!)
      if (atual && atual.atualizadoEm === o.atualizadoEm) {
        await db.orcamentos.update(o.id!, { itens, fotos, atualizadoEm: o.atualizadoEm })
      }
    })
  }
}

// ------------------------------------------------------------------------------------------
// Envio
// ------------------------------------------------------------------------------------------
async function limparSujos<T extends { id?: number | string; atualizadoEm?: number }>(
  tabela: 'clientes' | 'orcamentos' | 'empresa',
  enviados: T[],
) {
  await db.transaction('rw', db.table(tabela), async (tx) => {
    marcarSync(tx)
    for (const e of enviados) {
      const atual = (await db.table(tabela).get(e.id!)) as T | undefined
      if (atual && atual.atualizadoEm === e.atualizadoEm) await db.table(tabela).update(e.id!, { sujo: 0 })
    }
  })
}

async function enviar(userId: string) {
  const sb = supabase!
  await enviarImagensPendentes(userId)

  const excluidos = await db.excluidos.toArray()
  for (const tabela of ['clientes', 'orcamentos'] as const) {
    const uids = excluidos.filter((e) => e.tabela === tabela).map((e) => e.uid)
    if (!uids.length) continue
    const { error } = await sb.from(tabela).update({ excluido_em: new Date().toISOString() }).in('id', uids)
    if (error) throw error
  }
  if (excluidos.length) await db.excluidos.bulkDelete(excluidos.map((e) => e.id!))

  const clientes = await db.clientes.where('sujo').equals(1).toArray()
  if (clientes.length) {
    const { error } = await sb.from('clientes').upsert(clientes.map(clienteParaNuvem))
    if (error) throw error
    await limparSujos('clientes', clientes)
  }

  const orcamentos = await db.orcamentos.where('sujo').equals(1).toArray()
  if (orcamentos.length) {
    const { error } = await sb.from('orcamentos').upsert(orcamentos.map(orcamentoParaNuvem))
    if (error) throw error
    await limparSujos('orcamentos', orcamentos)
  }

  const empresa = await db.empresa.get('principal')
  if (empresa?.sujo) {
    const { id: _i, sujo: _s, nome, ...dados } = empresa
    void _i, _s
    const { error } = await sb.from('empresas').upsert({ user_id: userId, nome, dados })
    if (error) throw error
    await limparSujos('empresa', [empresa])
  }

  const eventos = await db.eventos.where('sujo').equals(1).toArray()
  // Eventos de orçamentos que ainda não existem na nuvem ficam para a próxima rodada
  if (eventos.length) {
    const linhas = eventos
      .filter((e) => !['visualizacao', 'aprovacao', 'recusa'].includes(e.tipo))
      .map((e) => ({ id: e.uid, orcamento_id: e.orcamentoUid, tipo: e.tipo, dados: e.dados, criado_em: iso(e.criadoEm) }))
    if (linhas.length) {
      const { error } = await sb.from('eventos').upsert(linhas, { onConflict: 'id', ignoreDuplicates: true })
      if (error) throw error
    }
    await db.transaction('rw', db.eventos, async (tx) => {
      marcarSync(tx)
      await db.eventos.bulkUpdate(eventos.map((e) => ({ key: e.id!, changes: { sujo: 0 } })))
    })
  }
}

// ------------------------------------------------------------------------------------------
// Recebimento
// ------------------------------------------------------------------------------------------
async function lerCursor(chave: string) {
  return (await db.meta.get(chave))?.valor ?? '1970-01-01T00:00:00Z'
}

async function paginas<T>(tabela: string, colunaCursor: string, chaveCursor: string, aplicar: (linhas: T[]) => Promise<void>) {
  let cursor = await lerCursor(chaveCursor)
  for (;;) {
    const { data, error } = await supabase!
      .from(tabela)
      .select('*')
      .gt(colunaCursor, cursor)
      .order(colunaCursor, { ascending: true })
      .limit(PAGINA)
    if (error) throw error
    if (!data.length) return
    await aplicar(data as T[])
    cursor = (data[data.length - 1] as Record<string, string>)[colunaCursor]
    await db.meta.put({ chave: chaveCursor, valor: cursor })
    if (data.length < PAGINA) return
  }
}

async function receber() {
  const sb = supabase!

  const { data: emp, error: erroEmp } = await sb.from('empresas').select('nome, dados').maybeSingle()
  if (erroEmp) throw erroEmp
  if (emp) {
    await db.transaction('rw', db.empresa, async (tx) => {
      marcarSync(tx)
      const local = await db.empresa.get('principal')
      const remota = normalizarEmpresa({ ...(emp.dados as Partial<Empresa>), nome: emp.nome })
      // Numeração: nunca volta atrás, mesmo com dois aparelhos criando orçamentos
      const proximo = Math.max(remota.proximoNumero, local?.proximoNumero ?? 1)
      if (!local?.sujo) await db.empresa.put({ ...remota, proximoNumero: proximo, sujo: 0 })
      else if (proximo !== local.proximoNumero) await db.empresa.update('principal', { proximoNumero: proximo })
    })
  }

  await paginas<LinhaCliente>('clientes', 'atualizado_em', 'cursor:clientes', async (linhas) => {
    await db.transaction('rw', db.clientes, async (tx) => {
      marcarSync(tx)
      for (const r of linhas) {
        const local = await db.clientes.where('uid').equals(r.id).first()
        if (r.excluido_em) {
          if (local) await db.clientes.delete(local.id!)
          continue
        }
        if (local?.sujo) continue
        await db.clientes.put({ ...clienteDaNuvem(r), id: local?.id } as Cliente)
      }
    })
  })

  await paginas<LinhaOrcamento>('orcamentos', 'atualizado_em', 'cursor:orcamentos', async (linhas) => {
    await db.transaction('rw', db.orcamentos, async (tx) => {
      marcarSync(tx)
      for (const r of linhas) {
        const local = await db.orcamentos.where('uid').equals(r.id).first()
        if (r.excluido_em) {
          if (local) await db.orcamentos.delete(local.id!)
          continue
        }
        if (local?.sujo) {
          // Mantém a edição local, mas respeita a decisão do cliente e a visualização registradas no servidor
          if (['aprovado', 'recusado', 'visualizado'].includes(r.status) && local.status !== r.status) {
            if (r.status !== 'visualizado' || local.status === 'pendente') await db.orcamentos.update(local.id!, { status: r.status })
          }
          continue
        }
        await db.orcamentos.put({ ...orcamentoDaNuvem(r), id: local?.id } as Orcamento)
      }
    })
  })

  interface LinhaEvento {
    id: string
    orcamento_id: string
    tipo: Evento['tipo']
    dados: Evento['dados']
    criado_em: string
    registrado_em: string
  }
  await paginas<LinhaEvento>('eventos', 'registrado_em', 'cursor:eventos', async (linhas) => {
    await db.transaction('rw', db.eventos, async (tx) => {
      marcarSync(tx)
      for (const r of linhas) {
        if (await db.eventos.where('uid').equals(r.id).count()) continue
        await db.eventos.add({ uid: r.id, orcamentoUid: r.orcamento_id, tipo: r.tipo, dados: r.dados, criadoEm: ms(r.criado_em), sujo: 0 })
      }
    })
  })
}

// ------------------------------------------------------------------------------------------
// Orquestração
// ------------------------------------------------------------------------------------------
let rodando: Promise<void> | null = null
let deNovo = false

export function sincronizar(): Promise<void> {
  const usuario = usuarioAtual()
  if (!supabase || !usuario) {
    definir({ situacao: 'visitante', erro: null })
    return Promise.resolve()
  }
  if (rodando) {
    deNovo = true
    return rodando
  }
  if (!navigator.onLine) {
    definir({ situacao: 'offline' })
    return Promise.resolve()
  }
  definir({ situacao: 'sincronizando' })
  rodando = (async () => {
    try {
      await enviar(usuario.id)
      await receber()
      definir({ situacao: 'sincronizado', ultima: Date.now(), erro: null })
    } catch (e) {
      const offline = !navigator.onLine || /fetch|network/i.test(String((e as Error)?.message))
      definir({ situacao: offline ? 'offline' : 'erro', erro: offline ? null : String((e as Error)?.message ?? e) })
    } finally {
      rodando = null
      if (deNovo) {
        deNovo = false
        void sincronizar()
      }
    }
  })()
  return rodando
}

let parar: (() => void) | null = null

/** Liga a sincronização automática para o usuário logado (chamado ao trocar de sessão). */
export function iniciarSincronizacao() {
  parar?.()
  parar = null
  if (!supabase || !usuarioAtual()) {
    definir({ situacao: 'visitante', erro: null, ultima: null })
    return
  }

  let timer: number | undefined
  const agendar = (atraso = 2000) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => void sincronizar(), atraso)
  }

  // Quando algo fica "sujo" localmente, envia depois de 2 s de calma
  const assinatura = liveQuery(async () => {
    const [c, o, e, v, x] = await Promise.all([
      db.clientes.where('sujo').equals(1).count(),
      db.orcamentos.where('sujo').equals(1).count(),
      db.empresa.where('id').equals('principal').filter((r) => r.sujo === 1).count(),
      db.eventos.where('sujo').equals(1).count(),
      db.excluidos.count(),
    ])
    return c + o + e + v + x
  }).subscribe((pendentes) => {
    if (pendentes > 0) {
      if (estado.situacao === 'sincronizado') definir({ situacao: 'pendente' })
      agendar()
    }
  })

  const aoVoltar = () => agendar(300)
  const aoFocar = () => document.visibilityState === 'visible' && agendar(300)
  window.addEventListener('online', aoVoltar)
  document.addEventListener('visibilitychange', aoFocar)
  // Busca decisões de clientes periodicamente, sem exagero (plano gratuito)
  const intervalo = window.setInterval(() => document.visibilityState === 'visible' && void sincronizar(), 120_000)

  agendar(0)
  parar = () => {
    assinatura.unsubscribe()
    window.clearTimeout(timer)
    window.clearInterval(intervalo)
    window.removeEventListener('online', aoVoltar)
    document.removeEventListener('visibilitychange', aoFocar)
  }
}

// ------------------------------------------------------------------------------------------
// Trazer os dados do modo visitante para a conta
// ------------------------------------------------------------------------------------------
export async function resumoVisitante() {
  const v = abrirBancoVisitante()
  try {
    const [orcamentos, clientes] = await Promise.all([v.orcamentos.count(), v.clientes.count()])
    return { orcamentos, clientes, importado: (await db.meta.get('importou-visitante')) != null }
  } catch {
    return { orcamentos: 0, clientes: 0, importado: false }
  } finally {
    v.close()
  }
}

/** Copia clientes e orçamentos deste navegador (modo visitante) para a conta, com numeração da conta. */
export async function importarVisitante() {
  const v = abrirBancoVisitante()
  try {
    const [clientes, orcamentos, eventos, empresaV] = await Promise.all([
      v.clientes.toArray(),
      v.orcamentos.orderBy('numero').toArray(),
      v.eventos.toArray(),
      v.empresa.get('principal'),
    ])
    await db.transaction('rw', [db.clientes, db.orcamentos, db.eventos, db.empresa, db.meta], async () => {
      const empresa = await obterEmpresa()
      const temEmpresa = !!(await db.empresa.get('principal'))?.nome
      const mapaCliente = new Map<string, string>()
      for (const c of clientes) {
        const uid = (await db.clientes.where('uid').equals(c.uid).count()) ? novoId() : c.uid
        mapaCliente.set(c.uid, uid)
        const { id: _id, ...resto } = c
        void _id
        await db.clientes.add({ ...resto, uid })
      }
      let numero = empresa.proximoNumero
      const mapaOrc = new Map<string, string>()
      for (const o of orcamentos) {
        const uid = (await db.orcamentos.where('uid').equals(o.uid).count()) ? novoId() : o.uid
        mapaOrc.set(o.uid, uid)
        const { id: _id, ...resto } = o
        void _id
        await db.orcamentos.add({
          ...resto,
          uid,
          numero: numero++,
          clienteUid: o.clienteUid ? mapaCliente.get(o.clienteUid) : undefined,
          // propostas do visitante nunca foram compartilhadas: voltam a rascunho se estavam "decididas" à mão
          status: o.status === 'aprovado' || o.status === 'recusado' ? o.status : o.status === 'cancelado' ? 'cancelado' : 'rascunho',
        })
      }
      for (const e of eventos) {
        const orc = mapaOrc.get(e.orcamentoUid)
        if (!orc || ['visualizacao', 'aprovacao', 'recusa'].includes(e.tipo)) continue
        const { id: _id, ...resto } = e
        void _id
        await db.eventos.add({ ...resto, uid: novoId(), orcamentoUid: orc })
      }
      const base = temEmpresa ? empresa : normalizarEmpresa({ ...empresaV, proximoNumero: numero })
      await db.empresa.put({ ...base, proximoNumero: numero, atualizadoEm: Date.now() })
      await db.meta.put({ chave: 'importou-visitante', valor: new Date().toISOString() })
    })
    return { orcamentos: orcamentos.length, clientes: clientes.length }
  } finally {
    v.close()
  }
}
