import { describe, expect, it } from 'vitest'
import { validarBackup } from '../src/lib/backup'
import { formatarData, formatarMoeda, lerNumero, nomeDoArquivo, telefoneWhatsApp } from '../src/lib/formato'

describe('formatação brasileira', () => {
  it('formata moeda e data', () => {
    expect(formatarMoeda(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50')
    expect(formatarData(new Date(2026, 10, 14).getTime())).toBe('14/11/2026')
  })

  it('lê números digitados com vírgula ou ponto', () => {
    expect(lerNumero('1.234,56')).toBe(1234.56)
    expect(lerNumero('1234.56')).toBe(1234.56)
    expect(lerNumero('')).toBe(0)
    expect(lerNumero('abc')).toBe(0)
  })

  it('gera nome de arquivo organizado e sem acentos', () => {
    expect(nomeDoArquivo(124, 'Maria José Ação Ltda.')).toBe('Orcamento-0124-Maria-Jose-Acao-Ltda')
    expect(nomeDoArquivo(5, '')).toBe('Orcamento-0005')
  })

  it('prepara telefone para o WhatsApp', () => {
    expect(telefoneWhatsApp('(11) 91234-5678')).toBe('5511912345678')
    expect(telefoneWhatsApp('+55 11 91234-5678')).toBe('5511912345678')
    expect(telefoneWhatsApp('')).toBe('')
  })
})

describe('validação de backup', () => {
  const valido = { app: 'orcafacil', versao: 2, geradoEm: 0, empresa: [{ id: 'principal', nome: 'X' }], clientes: [], orcamentos: [] }

  it('aceita um backup completo', () => {
    expect(() => validarBackup(valido)).not.toThrow()
  })

  it('recusa arquivos de outro app, sem versão ou incompletos', () => {
    expect(() => validarBackup({ ...valido, app: 'outro' })).toThrow()
    expect(() => validarBackup({ ...valido, versao: 9 })).toThrow()
    expect(() => validarBackup({ app: 'orcafacil', versao: 2, orcamentos: [] })).toThrow()
    expect(() => validarBackup({ ...valido, orcamentos: [{ numero: 'x' }] })).toThrow()
  })
})
