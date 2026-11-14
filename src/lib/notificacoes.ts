import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth'
import { db } from '../db'
import { formatarNumero } from './formato'
import { diasParaVencer } from './status'
import { supabase } from './supabase'
import { useSync } from './sync'

export interface Notificacao {
  id: string
  tipo: 'aprovacao' | 'recusa' | 'vencendo' | 'expirada'
  titulo: string
  corpo: string
  orcamentoUid?: string
  criadoEm: number
  lida: boolean
  /** Alertas calculados no aparelho (vencimento) não ficam salvos na nuvem. */
  local?: boolean
}

const CHAVE_LIDAS = 'orcafacil:alertas-lidos'
function alertasLidos(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE_LIDAS) ?? '[]'))
  } catch {
    return new Set()
  }
}
function salvarLidos(s: Set<string>) {
  try {
    localStorage.setItem(CHAVE_LIDAS, JSON.stringify([...s].slice(-200)))
  } catch {
    /* ignora */
  }
}

/**
 * Central de notificações: decisões dos clientes (vindas do banco, criadas pela função de aprovação)
 * e alertas de vencimento calculados a partir da validade dos orçamentos pendentes.
 * Atualiza junto com a sincronização (a cada 2 min com a aba aberta), sem polling próprio.
 */
export function useNotificacoes() {
  const { usuario } = useAuth()
  const { ultima } = useSync()
  const [remotas, setRemotas] = useState<Notificacao[]>([])
  const [lidosLocais, setLidosLocais] = useState(alertasLidos)

  useEffect(() => {
    if (!supabase || !usuario) {
      setRemotas([])
      return
    }
    let ativo = true
    supabase
      .from('notificacoes')
      .select('id, tipo, titulo, corpo, orcamento_id, criado_em, lida_em')
      .order('criado_em', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!ativo || !data) return
        setRemotas(
          data.map((n) => ({
            id: n.id,
            tipo: n.tipo,
            titulo: n.titulo,
            corpo: n.corpo,
            orcamentoUid: n.orcamento_id ?? undefined,
            criadoEm: new Date(n.criado_em).getTime(),
            lida: !!n.lida_em,
          })),
        )
      })
    return () => {
      ativo = false
    }
  }, [usuario, ultima])

  const alertas =
    useLiveQuery(async () => {
      const abertos = await db.orcamentos.where('status').anyOf('pendente', 'visualizado').toArray()
      const lista: Notificacao[] = []
      for (const o of abertos) {
        const dias = diasParaVencer(o)
        if (dias < 0 && dias >= -30) {
          lista.push({
            id: `expirada:${o.uid}`,
            tipo: 'expirada',
            titulo: `Orçamento ${formatarNumero(o.numero)} expirou`,
            corpo: `${o.cliente.nome || 'Cliente'} não respondeu dentro da validade.`,
            orcamentoUid: o.uid,
            criadoEm: o.criadoEm + o.validadeDias * 86_400_000,
            lida: false,
            local: true,
          })
        } else if (dias >= 0 && dias <= 3) {
          lista.push({
            id: `vencendo:${o.uid}`,
            tipo: 'vencendo',
            titulo: `Orçamento ${formatarNumero(o.numero)} vence ${dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `em ${dias} dias`}`,
            corpo: `Aguardando resposta de ${o.cliente.nome || 'cliente'}.`,
            orcamentoUid: o.uid,
            criadoEm: Date.now() - 1,
            lida: false,
            local: true,
          })
        }
      }
      return lista
    }, []) ?? []

  const todas = [...remotas, ...alertas.map((a) => ({ ...a, lida: lidosLocais.has(a.id) }))].sort((a, b) => b.criadoEm - a.criadoEm)

  const marcarLida = useCallback(async (n: Notificacao) => {
    if (n.lida) return
    if (n.local) {
      setLidosLocais((s) => {
        const novo = new Set(s).add(n.id)
        salvarLidos(novo)
        return novo
      })
      return
    }
    setRemotas((l) => l.map((x) => (x.id === n.id ? { ...x, lida: true } : x)))
    await supabase?.from('notificacoes').update({ lida_em: new Date().toISOString() }).eq('id', n.id)
  }, [])

  const marcarTodas = useCallback(async () => {
    for (const n of todas.filter((x) => !x.lida)) await marcarLida(n)
  }, [todas, marcarLida])

  return { notificacoes: todas, naoLidas: todas.filter((n) => !n.lida).length, marcarLida, marcarTodas }
}
