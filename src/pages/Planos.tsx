import { Link } from 'react-router-dom'
import { Icone } from '../components/ui'
import { nuvemDisponivel } from '../lib/supabase'

const RECURSOS = [
  'Orçamentos e clientes ilimitados',
  'Cinco modelos, fotos e PDF em A4',
  'Links de aprovação ilimitados',
  'Dados na nuvem, em todos os seus aparelhos',
  'Avisos de aprovação, recusa e vencimento',
  'Painel com gráficos e filtros',
]

export function Planos() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-5xl font-bold tracking-tight text-slate-900 uppercase sm:text-6xl">Planos</h1>
      <p className="mt-3 max-w-xl text-slate-600">Tem um só, e ele é grátis. Basta criar uma conta.</p>
      <div className="mt-10 max-w-md rounded-xl border border-slate-900 bg-superficie p-7 shadow-[6px_6px_0_0_var(--color-slate-900)]">
        <p className="etiqueta">Conta grátis</p>
        <p className="mt-4 font-display text-6xl font-bold text-slate-900">R$ 0</p>
        <p className="mt-1 text-sm text-slate-500">Sem cartão, sem limite de tempo.</p>
        <ul className="mt-6 space-y-2.5 text-sm text-slate-800">
          {RECURSOS.map((r) => (
            <li key={r} className="flex gap-2.5">
              <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              {r}
            </li>
          ))}
        </ul>
        <Link to={nuvemDisponivel ? '/entrar?modo=cadastrar' : '/app'} className="btn-destaque mt-8 w-full py-2.5">
          Criar conta grátis
        </Link>
      </div>
    </div>
  )
}
