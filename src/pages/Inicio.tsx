import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DocumentoOrcamento } from '../components/DocumentoOrcamento'
import { PreviaA4 } from '../components/PreviaA4'
import { Icone } from '../components/ui'
import type { ModeloId } from '../db'
import { EMPRESA_EXEMPLO, orcamentoExemplo } from '../lib/exemplo'
import { layoutDoModelo, MODELOS } from '../lib/modelos'

const PASSOS = [
  ['Monte', 'Cliente, itens com foto, desconto e impostos. A prévia acompanha cada tecla.'],
  ['Personalize', 'Escolha um dos cinco modelos e ajuste cor, fonte e a ordem das seções.'],
  ['Envie', 'Mande o link pelo WhatsApp ou e-mail, ou baixe o PDF em A4.'],
  ['Acompanhe', 'O cliente aprova pelo celular. O status muda no painel e você é avisado.'],
]

const RECURSOS = [
  ['foto', 'Fotos no orçamento', 'Uma por item ou uma galeria inteira: produto, local, projeto.'],
  ['link', 'Aprovação por link', 'Link seguro com validade e revogação. O cliente responde sem criar conta.'],
  ['grafico', 'Painel de vendas', 'Valores propostos e aprovados por mês, taxa de aprovação e filtros.'],
  ['clientes', 'Clientes e histórico', 'Cadastre uma vez, preencha com um clique e veja tudo o que já foi proposto.'],
  ['sino', 'Avisos', 'Saiba quando uma proposta é aprovada, recusada ou está perto de vencer.'],
  ['nuvem', 'Nuvem e offline', 'Com conta, sincroniza entre aparelhos. Sem internet, continua salvando.'],
]

const PERGUNTAS = [
  ['Preciso criar conta para usar?', 'Não. Você cria e exporta orçamentos sem cadastro, e eles ficam salvos no seu navegador. A conta grátis libera a nuvem, o link de aprovação e os avisos.'],
  ['Como o cliente aprova?', 'Você envia um link pelo WhatsApp ou e-mail. Ele abre no navegador, confere os itens e toca em aprovar ou recusar, informando o nome. Não precisa instalar nada.'],
  ['O aceite tem validade jurídica?', 'É um aceite eletrônico simples: registra nome, data e horário. Não substitui assinatura digital certificada (ICP-Brasil) quando ela for exigida.'],
  ['E se eu mudar o orçamento depois de enviar?', 'O link mostra uma cópia fixa do que foi enviado, para o cliente aprovar exatamente aquilo. Se mudar algo, gere um novo link.'],
  ['Funciona no celular?', 'Sim, no navegador do celular, e pode ser instalado na tela inicial como um aplicativo.'],
]

export function Inicio() {
  const exemplo = useMemo(() => orcamentoExemplo(), [])
  const [modelo, setModelo] = useState<ModeloId>('moderno')

  return (
    <>
      {/* Abertura */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:pt-24">
        <div className="max-w-3xl animate-entrada">
          <p className="text-sm font-medium text-marca-700">Para autônomos, prestadores de serviço e pequenas empresas</p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-tight text-slate-900 sm:text-7xl">
            Crie orçamentos profissionais <em className="text-marca-700">em minutos.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            Organize seus clientes, personalize propostas e acompanhe aprovações em um só lugar.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/app" className="btn-primario px-5 py-2.5 text-[15px]">
              Criar orçamento grátis
            </Link>
            <a href="#recursos" className="btn-secundario px-5 py-2.5 text-[15px]">
              Conhecer funcionalidades
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-500">Sem cadastro e sem cartão. Crie uma conta só quando quiser salvar na nuvem.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20" aria-label="Captura de tela do editor">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-superficie shadow-[0_24px_48px_-24px_rgba(28,25,23,0.25)]">
          <div className="flex items-center gap-1.5 border-b border-slate-200 px-4 py-2.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="ml-3 font-mono text-[11px] text-slate-400">orcafacil.pqueirozdev.com.br/app</span>
          </div>
          <img
            src="/editor.webp"
            alt="Editor do OrçaFácil: formulário à esquerda e prévia do orçamento à direita"
            width={1440}
            height={900}
            decoding="async"
            className="w-full"
          />
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="scroll-mt-20 border-y border-slate-200 bg-superficie">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-4xl text-slate-900 sm:text-5xl">Do rascunho ao “aprovado”.</h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map(([titulo, texto], i) => (
              <li key={titulo} className="bg-superficie p-6">
                <span className="font-mono text-xs text-slate-400">0{i + 1}</span>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{titulo}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Modelos */}
      <section id="modelos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="lg:sticky lg:top-24">
            <h2 className="font-display text-4xl text-slate-900 sm:text-5xl">Cinco modelos. Todos seus.</h2>
            <p className="mt-4 max-w-md text-slate-600">
              Comece por um estilo e ajuste o resto: logo, cores, fonte, tamanho das fotos e a posição de cada parte.
            </p>
            <div role="tablist" aria-label="Modelos" className="mt-8 flex flex-col border-l border-slate-200">
              {(Object.keys(MODELOS) as ModeloId[]).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={modelo === m}
                  onClick={() => setModelo(m)}
                  className={`-ml-px border-l-2 py-2.5 pl-4 text-left transition-colors ${
                    modelo === m ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span className="block text-sm font-medium">{MODELOS[m].nome}</span>
                  {modelo === m && <span className="mt-0.5 block text-sm text-slate-500">{MODELOS[m].descricao}</span>}
                </button>
              ))}
            </div>
          </div>
          <div key={modelo} className="mx-auto w-full max-w-lg animate-escala overflow-hidden rounded-lg border border-slate-200 shadow-[0_24px_48px_-24px_rgba(28,25,23,0.25)]">
            <PreviaA4>
              <DocumentoOrcamento orcamento={exemplo} empresa={{ ...EMPRESA_EXEMPLO, corTema: MODELOS[modelo].cor, layout: layoutDoModelo(modelo) }} />
            </PreviaA4>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="scroll-mt-20 border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="font-display text-4xl text-slate-900 sm:text-5xl">O que vem junto.</h2>
          <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map(([icone, titulo, texto]) => (
              <div key={titulo}>
                <Icone nome={icone} className="h-5 w-5 text-marca-700" />
                <h3 className="mt-3 font-semibold text-slate-900">{titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Perguntas */}
      <section className="border-t border-slate-200" aria-labelledby="faq">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[1fr_1.6fr]">
          <h2 id="faq" className="font-display text-4xl text-slate-900 sm:text-5xl">Perguntas frequentes</h2>
          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {PERGUNTAS.map(([p, r]) => (
              <details key={p} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
                  {p}
                  <Icone nome="mais" className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-45" />
                </summary>
                <p className="mt-2 pr-8 text-sm leading-relaxed text-slate-600">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="bg-slate-900 text-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:flex-row sm:items-center">
          <h2 className="font-display text-4xl leading-tight sm:text-5xl">
            Seu próximo orçamento
            <br />
            em cinco minutos.
          </h2>
          <Link to="/app" className="btn shrink-0 bg-slate-50 px-5 py-2.5 text-[15px] text-slate-900 hover:bg-slate-200">
            Criar orçamento grátis <Icone nome="seta" />
          </Link>
        </div>
      </section>
    </>
  )
}
