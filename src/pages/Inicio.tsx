import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DocumentoOrcamento } from '../components/DocumentoOrcamento'
import { PreviaA4 } from '../components/PreviaA4'
import { Icone } from '../components/ui'
import type { ModeloId } from '../db'
import { EMPRESA_EXEMPLO, orcamentoExemplo } from '../lib/exemplo'
import { layoutDoModelo, MODELOS } from '../lib/modelos'

const BENEFICIOS = [
  { icone: 'raio', titulo: 'Pronto em minutos', texto: 'Itens, fotos, descontos e impostos calculados na hora, com prévia ao vivo igual ao PDF.' },
  { icone: 'documento', titulo: 'Cara de empresa grande', texto: 'Sua logo, suas cores e cinco modelos profissionais. Nada de planilha improvisada.' },
  { icone: 'check', titulo: 'Aprovação sem papelada', texto: 'Envie um link: o cliente vê no celular e aprova ou recusa com um toque. Você é avisado.' },
]

const PASSOS = [
  { titulo: 'Monte o orçamento', texto: 'Escolha o cliente, adicione itens com fotos e ajuste valores. A prévia atualiza enquanto você digita.' },
  { titulo: 'Escolha o visual', texto: 'Aplique um modelo e personalize cores, fonte e a posição de cada parte.' },
  { titulo: 'Envie o link ou o PDF', texto: 'Compartilhe pelo WhatsApp ou e-mail, ou baixe o PDF em A4.' },
  { titulo: 'Receba a resposta', texto: 'O cliente aprova ou recusa online. O status muda no seu painel e você recebe uma notificação.' },
]

const FUNCIONALIDADES = [
  ['foto', 'Fotos por item e galeria', 'Mostre o produto, o local ou o projeto direto no orçamento.'],
  ['link', 'Link de proposta seguro', 'Token aleatório, validade opcional e revogação a qualquer momento.'],
  ['painel', 'Painel com gráficos', 'Valores propostos e aprovados por mês, taxa de aprovação e filtros.'],
  ['clientes', 'Cadastro de clientes', 'Histórico de propostas por cliente e preenchimento automático.'],
  ['sino', 'Notificações', 'Saiba quando uma proposta é aprovada, recusada ou está para vencer.'],
  ['nuvem', 'Na nuvem e offline', 'Com conta, sincroniza entre aparelhos. Sem internet, continua salvando no aparelho.'],
  ['relogio', 'Linha do tempo', 'Criação, envio, abertura do link e decisão registrados com data e hora.'],
  ['lua', 'Tema claro e escuro', 'Segue o seu sistema ou a sua preferência, no computador e no celular.'],
  ['cadeado', 'Seus dados protegidos', 'Cada conta só acessa os próprios dados, com regras aplicadas no banco.'],
] as const

const PERGUNTAS = [
  ['Preciso criar conta para usar?', 'Não. Você pode criar e exportar orçamentos em PDF sem cadastro: eles ficam salvos no seu navegador. A conta grátis libera a nuvem, o link de aprovação e as notificações.'],
  ['Quanto custa?', 'O OrçaFácil é gratuito. Não pedimos cartão de crédito.'],
  ['Como o cliente aprova a proposta?', 'Você gera um link e envia pelo WhatsApp ou e-mail. O cliente abre no navegador, confere os itens e clica em aprovar ou recusar, informando o nome. Não precisa instalar nada nem criar conta.'],
  ['O aceite tem validade jurídica?', 'É um aceite eletrônico simples: registra nome, data e horário da resposta. Ele não substitui uma assinatura digital certificada (ICP-Brasil) quando ela for exigida.'],
  ['Posso usar no celular?', 'Sim. O app funciona no navegador do celular e pode ser instalado na tela inicial como um aplicativo.'],
  ['E se eu editar o orçamento depois de enviar?', 'O link mostra uma cópia fixa do que foi enviado, para o cliente aprovar exatamente aquilo. Se mudar algo, gere um novo link.'],
]

export function Inicio() {
  const exemplo = useMemo(() => orcamentoExemplo(), [])
  const [modelo, setModelo] = useState<ModeloId>('moderno')

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-marca-50 via-fundo to-fundo">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-marca-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-40 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-entrada">
            <span className="inline-flex items-center gap-2 rounded-full bg-superficie px-3 py-1 text-xs font-semibold text-marca-700 shadow-sm ring-1 ring-marca-100">
              <Icone nome="check" className="h-3.5 w-3.5" /> Grátis · sem cartão de crédito
            </span>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-6xl">
              Crie orçamentos profissionais <span className="bg-gradient-to-r from-marca-600 to-violeta-600 bg-clip-text text-transparent">em minutos.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-600">Organize seus clientes, personalize propostas e acompanhe aprovações em um só lugar.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/app" className="btn-primario px-6 py-3 text-base">
                Criar orçamento grátis <Icone nome="seta" />
              </Link>
              <a href="#funcionalidades" className="btn-secundario px-6 py-3 text-base">
                Conhecer funcionalidades
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">Funciona sem cadastro. Crie uma conta quando quiser salvar na nuvem.</p>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-marca-200/60 to-teal-100/60 blur-2xl dark:opacity-30" />
            <div className="relative mx-auto max-w-md animate-flutuar overflow-hidden rounded-xl shadow-2xl shadow-marca-900/20 ring-1 ring-slate-200">
              <PreviaA4>
                <DocumentoOrcamento orcamento={exemplo} empresa={EMPRESA_EXEMPLO} />
              </PreviaA4>
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">Orçamento de exemplo gerado no OrçaFácil</p>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="beneficios">
        <h2 id="beneficios" className="sr-only">Benefícios</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="cartao-interativo group p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-marca-500 to-violeta-600 text-white shadow-lg shadow-marca-600/25 transition duration-300 group-hover:-rotate-6 group-hover:scale-110">
                <Icone nome={b.icone} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{b.titulo}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{b.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="scroll-mt-20 bg-slate-900 py-20 text-white dark:bg-slate-50">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold tracking-tight dark:text-slate-900">Como funciona</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 dark:bg-superficie dark:ring-slate-200">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-marca-500 font-bold text-white">{i + 1}</div>
                <h3 className="mt-4 text-lg font-semibold dark:text-slate-900">{p.titulo}</h3>
                <p className="mt-1.5 text-sm text-slate-300 dark:text-slate-600">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Prévia do editor (captura real do app) */}
      <section className="mx-auto max-w-6xl px-4 py-20" aria-labelledby="editor">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="editor" className="text-3xl font-bold tracking-tight text-slate-900">Editor com prévia em tempo real</h2>
          <p className="mt-3 text-slate-600">À esquerda você preenche; à direita aparece o documento final, exatamente como vai para o PDF.</p>
        </div>
        <div className="mt-10 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-slate-200">
          <img src="/editor.webp" alt="Tela do editor do OrçaFácil com o formulário à esquerda e a prévia do orçamento à direita" width={1440} height={900} loading="lazy" decoding="async" className="w-full" />
        </div>
      </section>

      {/* Modelos */}
      <section id="modelos" className="scroll-mt-20 border-y border-slate-200 bg-superficie py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Cinco modelos, todos personalizáveis</h2>
            <p className="mt-3 text-slate-600">Escolha um ponto de partida e ajuste cores, fonte, tamanhos e a posição de cada parte.</p>
          </div>
          <div role="tablist" aria-label="Modelos" className="mt-8 flex flex-wrap justify-center gap-2">
            {(Object.keys(MODELOS) as ModeloId[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={modelo === m}
                onClick={() => setModelo(m)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${modelo === m ? 'bg-marca-600 text-white shadow-md shadow-marca-600/25' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {MODELOS[m].nome}
              </button>
            ))}
          </div>
          <div className="mt-8 grid items-center gap-8 md:grid-cols-[1fr_1.2fr]">
            <div>
              <h3 className="text-2xl font-bold text-slate-900">{MODELOS[modelo].nome}</h3>
              <p className="mt-2 text-slate-600">{MODELOS[modelo].descricao}</p>
              <Link to="/app" className="btn-primario mt-6">
                Usar este modelo <Icone nome="seta" />
              </Link>
            </div>
            <div key={modelo} className="mx-auto w-full max-w-md animate-escala overflow-hidden rounded-xl shadow-xl ring-1 ring-slate-200">
              <PreviaA4>
                <DocumentoOrcamento orcamento={exemplo} empresa={{ ...EMPRESA_EXEMPLO, corTema: MODELOS[modelo].cor, layout: layoutDoModelo(modelo) }} />
              </PreviaA4>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Tudo o que você precisa para vender mais</h2>
          <p className="mt-3 text-slate-600">Para freelancers, autônomos, prestadores de serviço e pequenas empresas.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FUNCIONALIDADES.map(([icone, titulo, texto]) => (
            <div key={titulo} className="flex gap-4 rounded-2xl p-4 transition hover:bg-superficie hover:shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-marca-50 text-marca-600">
                <Icone nome={icone} className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">{titulo}</span>
                <span className="mt-0.5 block text-sm text-slate-600">{texto}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="mx-auto max-w-3xl px-4 pb-20" aria-labelledby="faq">
        <h2 id="faq" className="text-center text-3xl font-bold tracking-tight text-slate-900">Perguntas frequentes</h2>
        <div className="mt-8 divide-y divide-slate-200 rounded-2xl bg-superficie ring-1 ring-slate-200">
          {PERGUNTAS.map(([p, r]) => (
            <details key={p} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
                {p}
                <Icone nome="mais" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-45" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{r}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="px-4 pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-marca-600 to-violeta-600 px-6 py-14 text-center text-white shadow-2xl shadow-marca-600/20">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-xl" />
          <h2 className="relative text-3xl font-bold tracking-tight">Seu próximo orçamento pode sair em 5 minutos.</h2>
          <p className="relative mt-3 text-marca-100">Comece agora, sem cadastro e sem cartão.</p>
          <Link to="/app" className="btn relative mt-8 bg-white px-6 py-3 text-base text-marca-700 hover:bg-marca-50">
            Criar orçamento grátis <Icone nome="seta" />
          </Link>
        </div>
      </section>
    </>
  )
}
