import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { testarSemCadastro } from '../auth'
import { DocumentoOrcamento } from '../components/DocumentoOrcamento'
import { PreviaA4 } from '../components/PreviaA4'
import { Icone } from '../components/ui'
import { EMPRESA_EXEMPLO, orcamentoExemplo } from '../lib/exemplo'

const RECURSOS = [
  { icone: 'foto', titulo: 'Fotos no orçamento', texto: 'Anexe fotos do projeto, do produto ou do local. Uma por item ou uma galeria inteira.' },
  { icone: 'documento', titulo: 'PDF profissional', texto: 'Sua logo, suas cores e seus dados em um documento bonito, pronto para enviar.' },
  { icone: 'raio', titulo: 'Pronto em minutos', texto: 'Cálculo automático de totais, descontos e frete. Duplique orçamentos parecidos.' },
  { icone: 'clientes', titulo: 'Cadastro de clientes', texto: 'Salve seus clientes e preencha os dados do orçamento com um clique.' },
  { icone: 'painel', titulo: 'Acompanhe o status', texto: 'Veja o que está em rascunho, enviado, aprovado ou recusado, e quanto já fechou.' },
  { icone: 'cadeado', titulo: 'Seus dados com você', texto: 'Tudo fica salvo no seu dispositivo, com backup em arquivo quando quiser.' },
]

const PASSOS = [
  { titulo: 'Escolha um plano', texto: 'Assine o plano ideal para o tamanho da sua empresa.' },
  { titulo: 'Configure sua marca', texto: 'Envie sua logo, escolha a cor e preencha os dados da empresa.' },
  { titulo: 'Crie e envie', texto: 'Monte o orçamento com itens e fotos e gere o PDF para o cliente.' },
]

export function Inicio() {
  const exemplo = useMemo(() => orcamentoExemplo(), [])
  const navegar = useNavigate()
  const testar = () => {
    testarSemCadastro()
    navegar('/app')
  }
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-marca-50 via-white to-white">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-marca-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-40 h-80 w-80 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-entrada">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-marca-700 shadow-sm ring-1 ring-marca-100">
              <Icone nome="raio" className="h-3.5 w-3.5" /> Novo: fotos em cada item do orçamento
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-6xl">
              Orçamentos bonitos, com fotos, <span className="bg-gradient-to-r from-marca-600 to-violeta-600 bg-clip-text text-transparent">em minutos</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">
              O Orçafácil ajuda sua empresa a criar orçamentos profissionais com a sua marca, fotos dos produtos e
              cálculo automático, e transforma tudo em PDF pronto para enviar ao cliente.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/precos" className="btn-primario px-6 py-3 text-base">
                Ver planos <Icone nome="seta" />
              </Link>
              <button onClick={testar} className="btn-secundario px-6 py-3 text-base">
                Testar sem cadastro
              </button>
            </div>
            <p className="mt-4 text-sm text-slate-500">Modo de testes: entre sem e-mail e sem pagamento</p>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 -z-0 rounded-[2rem] bg-gradient-to-tr from-marca-200/60 to-teal-100/60 blur-2xl" />
            <div className="relative mx-auto max-w-md animate-flutuar overflow-hidden rounded-xl shadow-2xl shadow-marca-900/20 ring-1 ring-slate-200">
              <PreviaA4>
                <DocumentoOrcamento orcamento={exemplo} empresa={EMPRESA_EXEMPLO} />
              </PreviaA4>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Tudo o que você precisa para vender mais</h2>
          <p className="mt-3 text-slate-600">Feito para marcenarias, construtoras, gráficas, oficinas, eventos e qualquer empresa que vive de orçamento.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map((r) => (
            <div key={r.titulo} className="cartao-interativo group p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-marca-500 to-violeta-600 text-white shadow-lg shadow-marca-600/25 transition duration-300 group-hover:scale-110 group-hover:-rotate-6">
                <Icone nome={r.icone} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{r.titulo}</h3>
              <p className="mt-1.5 text-sm text-slate-600">{r.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="scroll-mt-20 bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight">Como funciona</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <div key={p.titulo} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-marca-500 font-bold">{i + 1}</div>
                <h3 className="mt-4 text-lg font-semibold">{p.titulo}</h3>
                <p className="mt-1.5 text-sm text-slate-300">{p.texto}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link to="/precos" className="btn bg-white px-6 py-3 text-base text-slate-900 hover:bg-slate-100">
              Começar agora <Icone nome="seta" />
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
