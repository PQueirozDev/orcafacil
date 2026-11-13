import { useSyncExternalStore } from 'react'

/**
 * Autenticação e assinatura FICTÍCIAS (modo demonstração).
 * Tudo fica no localStorage — nenhuma cobrança ou servidor real.
 */

export type PlanoId = 'basico' | 'profissional' | 'empresa'
export type Ciclo = 'mensal' | 'anual'

export interface Sessao {
  nome: string
  email: string
}

export interface Assinatura {
  plano: PlanoId
  ciclo: Ciclo
  ativadaEm: number
  renovaEm: number
  metodo: 'cartao' | 'pix'
  final?: string
}

export interface Plano {
  id: PlanoId
  nome: string
  descricao: string
  precoMensal: number
  destaque?: boolean
  recursos: string[]
}

export const PLANOS: Plano[] = [
  {
    id: 'basico',
    nome: 'Básico',
    descricao: 'Para autônomos que estão começando.',
    precoMensal: 29.9,
    recursos: ['Até 30 orçamentos por mês', 'PDF com sua logo', 'Até 5 fotos por orçamento', 'Cadastro de clientes'],
  },
  {
    id: 'profissional',
    nome: 'Profissional',
    descricao: 'Para pequenas empresas que vendem todo dia.',
    precoMensal: 59.9,
    destaque: true,
    recursos: [
      'Orçamentos ilimitados',
      'Fotos ilimitadas e foto por item',
      'Cores personalizadas no PDF',
      'Backup e restauração',
      'Suporte por WhatsApp',
    ],
  },
  {
    id: 'empresa',
    nome: 'Empresa',
    descricao: 'Para equipes com vários vendedores.',
    precoMensal: 119.9,
    recursos: [
      'Tudo do Profissional',
      'Até 10 usuários',
      'Modelos de orçamento por equipe',
      'Relatórios de conversão',
      'Gerente de conta dedicado',
    ],
  },
]

export const DESCONTO_ANUAL = 0.2

export function precoPorMes(plano: Plano, ciclo: Ciclo) {
  return ciclo === 'anual' ? plano.precoMensal * (1 - DESCONTO_ANUAL) : plano.precoMensal
}

export function precoTotal(plano: Plano, ciclo: Ciclo) {
  return ciclo === 'anual' ? precoPorMes(plano, ciclo) * 12 : plano.precoMensal
}

export function obterPlano(id: string | undefined) {
  return PLANOS.find((p) => p.id === id)
}

const CHAVE_SESSAO = 'orcafacil:sessao'
const CHAVE_ASSINATURA = 'orcafacil:assinatura'
const ouvintes = new Set<() => void>()

function ler<T>(chave: string): T | null {
  try {
    const bruto = localStorage.getItem(chave)
    return bruto ? (JSON.parse(bruto) as T) : null
  } catch {
    return null
  }
}

let memoria: Record<string, unknown> = {}
let cache: { sessao: Sessao | null; assinatura: Assinatura | null } | undefined

function gravar(chave: string, valor: unknown) {
  memoria = { ...memoria, [chave]: valor }
  try {
    if (valor === null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* armazenamento indisponível — segue só em memória */
  }
  cache = undefined
  ouvintes.forEach((f) => f())
}

function lerComMemoria<T>(chave: string): T | null {
  if (chave in memoria) return memoria[chave] as T | null
  return ler<T>(chave)
}

function snapshot() {
  if (!cache) {
    cache = {
      sessao: lerComMemoria<Sessao>(CHAVE_SESSAO),
      assinatura: lerComMemoria<Assinatura>(CHAVE_ASSINATURA),
    }
  }
  return cache
}

function inscrever(f: () => void) {
  ouvintes.add(f)
  const aoMudarStorage = (e: StorageEvent) => {
    if (e.key?.startsWith('orcafacil:')) {
      memoria = {}
      cache = undefined
      f()
    }
  }
  window.addEventListener('storage', aoMudarStorage)
  return () => {
    ouvintes.delete(f)
    window.removeEventListener('storage', aoMudarStorage)
  }
}

export function useAuth() {
  return useSyncExternalStore(inscrever, snapshot)
}

export function entrar(sessao: Sessao) {
  gravar(CHAVE_SESSAO, sessao)
}

/** Modo de testes: entra sem preencher e-mail e senha. */
export function entrarComoVisitante() {
  entrar({ nome: 'Visitante', email: 'visitante@demo.orcafacil' })
}

/** Modo de testes: entra e ativa o plano Profissional sem passar pelo pagamento. */
export function testarSemCadastro() {
  if (!snapshot().sessao) entrarComoVisitante()
  if (!snapshot().assinatura) assinar('profissional', 'mensal', 'pix')
}

export function sair() {
  gravar(CHAVE_SESSAO, null)
}

export function assinar(plano: PlanoId, ciclo: Ciclo, metodo: Assinatura['metodo'], final?: string) {
  const agora = new Date()
  const renova = new Date(agora)
  renova.setMonth(renova.getMonth() + (ciclo === 'anual' ? 12 : 1))
  const assinatura: Assinatura = {
    plano,
    ciclo,
    metodo,
    final,
    ativadaEm: agora.getTime(),
    renovaEm: renova.getTime(),
  }
  gravar(CHAVE_ASSINATURA, assinatura)
}

export function cancelarAssinatura() {
  gravar(CHAVE_ASSINATURA, null)
}
