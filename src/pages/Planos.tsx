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
    <div className="mx-auto max-w-5xl px-5 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center"><p className="etiqueta text-marca-600">Simples também no preço</p><h1 className="titulo-secao mt-3">Tudo o que você precisa.<br />Gratuito para começar e continuar.</h1><p className="mt-4 text-slate-600">Uma conta completa para cuidar das suas propostas. Sem assinatura, sem cartão.</p></div>
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-marca-200 bg-superficie p-7 shadow-[0_12px_40px_-20px_rgba(30,50,90,0.2)] sm:p-9">
        <p className="text-sm font-semibold text-marca-600">Sua conta OrçaFácil</p>
        <p className="mt-4 font-display text-5xl font-semibold tracking-tight text-slate-900">R$ 0<span className="ml-2 text-sm font-normal tracking-normal text-slate-500">para usar o app</span></p>
        <p className="mt-2 text-sm text-slate-500">Todos os recursos abaixo estão incluídos.</p>
        <ul className="mt-6 space-y-2.5 text-sm text-slate-800">
          {RECURSOS.map((r) => (
            <li key={r} className="flex gap-2.5">
              <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
              {r}
            </li>
          ))}
        </ul>
        <Link to={nuvemDisponivel ? '/entrar?modo=cadastrar' : '/app'} className="btn-destaque mt-8 min-h-12 w-full py-2.5">
          Criar conta grátis <Icone nome="seta" />
        </Link>
      </div>
    </div>
  )
}
