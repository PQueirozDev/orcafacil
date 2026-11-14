import { Link } from 'react-router-dom'
import { Icone } from '../components/ui'
import { nuvemDisponivel } from '../lib/supabase'

const RECURSOS = [
  'Orçamentos e clientes ilimitados',
  'Fotos, cinco modelos e personalização completa',
  'PDF em A4 com o nome do arquivo organizado',
  'Dados na nuvem, em todos os seus aparelhos',
  'Link de proposta com aprovação online',
  'Avisos de aprovação, recusa e vencimento',
  'Painel com gráficos e filtros',
]

export function Planos() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-5xl text-slate-900">Planos</h1>
        <p className="mt-3 text-slate-600">O OrçaFácil é gratuito. Basta criar uma conta.</p>
      </div>
      <div className="mx-auto mt-12 max-w-md rounded-xl border border-slate-900 bg-superficie p-7">
        <h2 className="text-lg font-semibold text-slate-900">Conta grátis</h2>
        <p className="mt-1 text-sm text-slate-500">Tudo o que o OrçaFácil faz, sem cartão de crédito.</p>
        <p className="mt-6 font-display text-5xl text-slate-900">R$ 0</p>
        <ul className="mt-6 space-y-3 text-sm text-slate-700">
          {RECURSOS.map((r) => (
            <li key={r} className="flex gap-2.5">
              <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-marca-600" />
              {r}
            </li>
          ))}
        </ul>
        <Link to={nuvemDisponivel ? '/entrar?modo=cadastrar' : '/app'} className="btn-primario mt-8 w-full">
          Criar conta grátis
        </Link>
      </div>
      <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-slate-500">
        O serviço roda em infraestrutura de plano gratuito, com limites de armazenamento e uso. Fotos são reduzidas automaticamente para
        economizar espaço.
      </p>
    </div>
  )
}
