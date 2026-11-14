import { Link } from 'react-router-dom'
import { Icone } from '../components/ui'
import { formatarMoeda } from '../lib/formato'
import { LIMITE_GRATIS, PRECO } from '../lib/plano'
import { nuvemDisponivel } from '../lib/supabase'

const PLANOS = [
  {
    nome: 'Grátis',
    preco: formatarMoeda(0),
    periodo: '',
    nota: 'Para sempre, sem cartão.',
    recursos: ['Orçamentos e clientes ilimitados', 'Cinco modelos, fotos e PDF em A4', 'Painel, avisos e nuvem', `${LIMITE_GRATIS} links de aprovação por mês`, 'Selo discreto “Feito com OrçaFácil”'],
    cta: 'Criar conta grátis',
    destaque: false,
  },
  {
    nome: 'Pro',
    preco: formatarMoeda(PRECO.mensal),
    periodo: '/mês',
    nota: `ou ${formatarMoeda(PRECO.anual)} por ano (2 meses grátis)`,
    recursos: ['Tudo do grátis', 'Links de aprovação ilimitados', 'PDF e link sem o selo do OrçaFácil', 'Cancele quando quiser'],
    cta: 'Começar e assinar depois',
    destaque: true,
  },
]

export function Planos() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-5xl font-bold tracking-tight text-slate-900 uppercase sm:text-6xl">Planos</h1>
      <p className="mt-3 max-w-xl text-slate-600">Comece grátis. Assine o Pro quando enviar mais propostas por mês.</p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {PLANOS.map((p) => (
          <div key={p.nome} className={`flex flex-col border bg-superficie p-7 ${p.destaque ? 'border-slate-900 shadow-[6px_6px_0_0_var(--color-slate-900)]' : 'border-slate-300'}`}>
            <p className="etiqueta">{p.nome}</p>
            <p className="mt-4 font-display text-6xl font-bold text-slate-900">
              {p.preco}
              <span className="text-xl font-medium text-slate-500">{p.periodo}</span>
            </p>
            <p className="mt-1 text-sm text-slate-500">{p.nota}</p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-slate-800">
              {p.recursos.map((r) => (
                <li key={r} className="flex gap-2.5">
                  <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  {r}
                </li>
              ))}
            </ul>
            <Link to={nuvemDisponivel ? '/entrar?modo=cadastrar' : '/app'} className={`${p.destaque ? 'btn-destaque' : 'btn-secundario'} mt-8 w-full py-2.5`}>
              {p.cta}
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-8 max-w-2xl text-xs text-slate-500">
        Pagamento com cartão processado pelo Stripe. A assinatura renova automaticamente e pode ser cancelada a qualquer momento em
        “Plano”; o Pro continua até o fim do período já pago.
      </p>
    </div>
  )
}
