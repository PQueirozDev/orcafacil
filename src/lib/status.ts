import type { Orcamento, StatusOrcamento } from '../db'
import { somarDias } from './formato'

/** Status exibido: "expirado" é derivado da validade (não é gravado). */
export type StatusExibido = StatusOrcamento | 'expirado'

export const ROTULO_STATUS: Record<StatusExibido, string> = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  visualizado: 'Visualizado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  expirado: 'Expirado',
  cancelado: 'Cancelado',
}

/**
 * Transições que o PROFISSIONAL pode fazer manualmente.
 * "visualizado" só nasce no portal do cliente; aprovado/recusado podem vir do portal ou ser
 * registrados à mão (ex.: o cliente respondeu por telefone). Decisões não voltam atrás: só cancelamento.
 */
export const TRANSICOES: Record<StatusOrcamento, StatusOrcamento[]> = {
  rascunho: ['pendente', 'cancelado'],
  pendente: ['rascunho', 'aprovado', 'recusado', 'cancelado'],
  visualizado: ['aprovado', 'recusado', 'cancelado'],
  aprovado: ['cancelado'],
  recusado: ['cancelado'],
  cancelado: ['rascunho'],
}

export const podeMudar = (de: StatusOrcamento, para: StatusOrcamento) => de === para || TRANSICOES[de].includes(para)

export const dataValidade = (o: Pick<Orcamento, 'criadoEm' | 'validadeDias'>) => somarDias(o.criadoEm, o.validadeDias || 0)

export function statusExibido(o: Pick<Orcamento, 'status' | 'criadoEm' | 'validadeDias'>, agora = Date.now()): StatusExibido {
  if ((o.status === 'pendente' || o.status === 'visualizado' || o.status === 'rascunho') && dataValidade(o) < agora) {
    return o.status === 'rascunho' ? 'rascunho' : 'expirado'
  }
  return o.status
}

/** Dias até o vencimento (negativo = vencido). */
export const diasParaVencer = (o: Pick<Orcamento, 'criadoEm' | 'validadeDias'>, agora = Date.now()) =>
  Math.ceil((dataValidade(o) - agora) / 86_400_000)

/** Pode editar o conteúdo? Depois de decidido ou cancelado, o documento fica congelado. */
export const editavel = (s: StatusOrcamento) => s === 'rascunho' || s === 'pendente' || s === 'visualizado'
