const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dataLonga = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

export const formatarMoeda = (valor: number) => moeda.format(Number.isFinite(valor) ? valor : 0)
export const formatarData = (ms: number) => data.format(new Date(ms))
export const formatarDataLonga = (ms: number) => dataLonga.format(new Date(ms))
export const formatarNumero = (n: number) => `#${String(n).padStart(4, '0')}`

export function somarDias(ms: number, dias: number) {
  const d = new Date(ms)
  d.setDate(d.getDate() + dias)
  return d.getTime()
}

/** Converte texto digitado ("1.234,56" ou "1234.56") em número. */
export function lerNumero(texto: string): number {
  const limpo = texto.trim().replace(/\s/g, '')
  if (!limpo) return 0
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const n = Number(normalizado)
  return Number.isFinite(n) ? n : 0
}
