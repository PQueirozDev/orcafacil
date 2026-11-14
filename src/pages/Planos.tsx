import { Link } from 'react-router-dom'
import { Icone } from '../components/ui'
import { nuvemDisponivel } from '../lib/supabase'

const PLANOS = [
  {
    nome: 'Sem cadastro',
    preco: 'Grátis',
    descricao: 'Para testar ou fazer orçamentos de vez em quando.',
    recursos: ['Orçamentos ilimitados', 'Fotos, modelos e personalização', 'PDF em A4', 'Clientes e painel com gráficos', 'Dados salvos só neste navegador', 'Backup em arquivo'],
    cta: { texto: 'Começar agora', para: '/app' },
  },
  {
    nome: 'Conta grátis',
    preco: 'Grátis',
    destaque: true,
    descricao: 'Para quem envia propostas toda semana.',
    recursos: [
      'Tudo do modo sem cadastro',
      'Dados na nuvem, em todos os seus aparelhos',
      'Link de proposta com aprovação online',
      'Notificações de aprovação e recusa',
      'Linha do tempo de cada proposta',
      'Leve os orçamentos já criados para a conta',
    ],
    cta: { texto: 'Criar conta grátis', para: '/entrar?modo=cadastrar' },
  },
]

export function Planos() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Planos</h1>
        <p className="mt-3 text-slate-600">O OrçaFácil é gratuito. Você escolhe se quer usar com ou sem conta.</p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {PLANOS.filter((p) => nuvemDisponivel || !p.destaque).map((p) => (
          <div key={p.nome} className={`relative flex flex-col rounded-2xl bg-superficie p-7 ${p.destaque ? 'shadow-xl ring-2 ring-marca-600' : 'shadow-sm ring-1 ring-slate-200'}`}>
            {p.destaque && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-marca-600 px-3 py-1 text-xs font-semibold text-white">Recomendado</span>
            )}
            <h2 className="text-lg font-semibold text-slate-900">{p.nome}</h2>
            <p className="mt-1 text-sm text-slate-500">{p.descricao}</p>
            <p className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900">{p.preco}</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
              {p.recursos.map((r) => (
                <li key={r} className="flex gap-2.5">
                  <Icone nome="check" className="mt-0.5 h-4 w-4 shrink-0 text-marca-600" />
                  {r}
                </li>
              ))}
            </ul>
            <Link to={p.cta.para} className={`${p.destaque ? 'btn-primario' : 'btn-secundario'} mt-8 w-full`}>
              {p.cta.texto}
            </Link>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-10 max-w-2xl text-center text-xs text-slate-500">
        O serviço roda em infraestrutura de plano gratuito, com limites de armazenamento e uso. Fotos são reduzidas automaticamente para
        economizar espaço.
      </p>
    </div>
  )
}
