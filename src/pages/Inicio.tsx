import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DocumentoOrcamento } from '../components/DocumentoOrcamento'
import { PreviaA4 } from '../components/PreviaA4'
import { Icone, Simbolo } from '../components/ui'
import type { ModeloId } from '../db'
import { EMPRESA_EXEMPLO, orcamentoExemplo } from '../lib/exemplo'
import { layoutDoModelo, MODELOS } from '../lib/modelos'
import { nuvemDisponivel } from '../lib/supabase'

const PASSOS = [
  { icone: 'documento', titulo: 'Monte sua proposta', texto: 'Adicione cliente, serviços, fotos e valores. Os cálculos ficam por nossa conta.' },
  { icone: 'modelos', titulo: 'Deixe com a sua cara', texto: 'Escolha um modelo e use suas cores e sua logo. A prévia acompanha cada ajuste.' },
  { icone: 'enviar', titulo: 'Envie como preferir', texto: 'Compartilhe o link pelo WhatsApp ou e-mail, ou baixe o documento em PDF.' },
  { icone: 'check', titulo: 'Acompanhe a resposta', texto: 'Seu cliente aprova pelo celular, e você acompanha o status no painel.' },
]

const RECURSOS = [
  { icone: 'foto', titulo: 'Mostre o que está oferecendo', texto: 'Fotos dos produtos e serviços junto dos itens. Uma proposta mais clara para quem recebe.' },
  { icone: 'clientes', titulo: 'Seus clientes, organizados', texto: 'Cadastre uma vez e reutilize os dados. Consulte o histórico quando precisar.' },
  { icone: 'grafico', titulo: 'Veja como o trabalho anda', texto: 'Acompanhe valores, aprovações e propostas pendentes em um só painel.' },
  { icone: 'nuvem', titulo: 'Do computador ao celular', texto: 'Dados sincronizados entre aparelhos, com salvamento local para continuar offline.' },
  { icone: 'link', titulo: 'Um link, uma proposta', texto: 'O cliente recebe uma cópia fixa do que você enviou, com validade e aprovação registrada.' },
  { icone: 'sino', titulo: 'Fique por dentro das respostas', texto: 'Avisos no aplicativo quando uma proposta é aprovada, recusada ou está perto de vencer.' },
]

const PERGUNTAS = [
  ['Preciso pagar para usar?', 'Não. A conta é gratuita, sem cartão e sem plano pago. Você pode criar orçamentos, cadastrar clientes e gerar links de proposta.'],
  ['Meu cliente precisa criar uma conta?', 'Não. Ele abre o link no navegador, confere os itens e aprova ou recusa a proposta, informando o nome. Não precisa instalar nada.'],
  ['Posso usar minha logo e minhas cores?', 'Sim. Os cinco modelos permitem personalizar logo, cores, fonte, fotos e a ordem das seções.'],
  ['O que acontece se eu alterar uma proposta enviada?', 'O link preserva uma cópia do que foi enviado. Para compartilhar as alterações, gere um novo link.'],
  ['Funciona no celular?', 'Sim. Você pode usar no navegador do celular e instalar na tela inicial como aplicativo. Os dados da conta são sincronizados entre seus aparelhos.'],
  ['Como funciona o aceite pelo link?', 'O cliente informa seu nome e confirma a decisão. O app registra nome, data e horário. É um aceite eletrônico simples, sem assinatura digital certificada.'],
]

export function Inicio() {
  const exemplo = useMemo(() => orcamentoExemplo(), [])
  const [modelo, setModelo] = useState<ModeloId>('moderno')
  const cadastro = nuvemDisponivel ? '/entrar?modo=cadastrar' : '/app'

  return (
    <>
      <section className="abertura-site border-b border-slate-200">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:py-24">
          <div className="min-w-0 animate-entrada">
            <span className="inline-flex items-center gap-2 rounded-full border border-marca-200 bg-marca-50 px-3 py-1.5 text-xs font-medium text-marca-700">
              <span className="h-1.5 w-1.5 rounded-full bg-marca-500" aria-hidden="true" />Seu trabalho merece uma boa proposta
            </span>
            <h1 className="mt-6 max-w-xl font-display text-[2.7rem] leading-[1.08] font-semibold tracking-[-0.045em] text-slate-900 sm:text-6xl lg:text-[3.8rem]">
              Orçamentos que dão <span className="text-marca-600">gosto de enviar.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">Apresente seu trabalho com clareza. Crie propostas com a sua marca, envie para o cliente e acompanhe cada resposta.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to={cadastro} className="btn-destaque min-h-12 px-6 text-[15px]">Criar minha conta grátis <Icone nome="seta" /></Link>
              <a href="#como-funciona" className="btn-secundario min-h-12 px-5 text-[15px]">Ver como funciona</a>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              {['100% gratuito', 'Sem cartão de crédito', 'Feito para o seu negócio'].map((texto) => <span key={texto} className="inline-flex items-center gap-1.5"><Icone nome="check" className="h-3.5 w-3.5 text-emerald-700" />{texto}</span>)}
            </div>
          </div>
          <div className="relative min-w-0 lg:pl-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-superficie shadow-[0_20px_70px_-25px_rgba(30,50,90,0.3)]">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Simbolo className="h-6 w-6" />Sua próxima proposta</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">Exemplo</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-2"><Icone nome="documento" className="h-4 w-4" />Orçamento #0042</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-700"><Icone nome="check" className="h-3.5 w-3.5" />Salvo</span>
              </div>
              <div className="max-h-[24rem] overflow-hidden bg-slate-100 px-4 pt-5 sm:px-7">
                <div className="overflow-hidden rounded-t-md border border-slate-200 bg-white shadow-sm"><PreviaA4><DocumentoOrcamento orcamento={exemplo} empresa={EMPRESA_EXEMPLO} /></PreviaA4></div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3.5">
                <span className="text-xs text-slate-500">Sua marca. Seu jeito de trabalhar.</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-marca-50 px-3 py-2 text-xs font-medium text-marca-700"><Icone nome="enviar" className="h-3.5 w-3.5" />Pronto para enviar</span>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">Uma prévia real de um orçamento criado no OrçaFácil.</p>
          </div>
        </div>
      </section>
      <section id="como-funciona" className="scroll-mt-24 border-b border-slate-200 bg-superficie">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl"><p className="etiqueta text-marca-600">Simples do começo ao fim</p><h2 className="titulo-secao mt-3">Menos tempo montando.<br />Mais tempo fazendo.</h2><p className="mt-4 text-base leading-relaxed text-slate-600">Um fluxo direto para transformar o que você faz em uma proposta profissional.</p></div>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7">
            {PASSOS.map((passo, i) => (
              <li key={passo.titulo}>
                <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-marca-50 text-marca-600"><Icone nome={passo.icone} className="h-5 w-5" /></span><span className="text-xs font-medium text-slate-400">0{i + 1}</span><span className="h-px flex-1 bg-slate-200" aria-hidden="true" /></div>
                <h3 className="mt-5 text-base font-semibold text-slate-900">{passo.titulo}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{passo.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section id="modelos" className="scroll-mt-24 border-b border-slate-200">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div className="min-w-0">
            <p className="etiqueta text-marca-600">A sua marca vem primeiro</p><h2 className="titulo-secao mt-3">Profissional por fora.<br />Do seu jeito por dentro.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-slate-600">Cinco pontos de partida para a sua proposta. Escolha um modelo e veja como ele fica.</p>
            <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Escolher modelo de orçamento">
              {(Object.keys(MODELOS) as ModeloId[]).map((id) => (
                <button key={id} type="button" aria-pressed={modelo === id} aria-controls="previa-modelo" onClick={() => setModelo(id)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${modelo === id ? 'border-marca-300 bg-marca-50 text-marca-700' : 'border-slate-200 bg-superficie text-slate-600 hover:border-slate-400'}`}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MODELOS[id].cor }} aria-hidden="true" />{MODELOS[id].nome}
                </button>
              ))}
            </div>
            <p className="mt-5 min-h-12 text-sm leading-relaxed text-slate-600" aria-live="polite">{MODELOS[modelo].descricao}</p>
            <Link to={cadastro} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-marca-600 hover:text-marca-700">Personalizar meu orçamento <Icone nome="seta" /></Link>
          </div>
          <div id="previa-modelo" role="region" aria-label={`Prévia do modelo ${MODELOS[modelo].nome}`} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100 p-5 sm:p-8">
            <div key={modelo} className="mx-auto max-w-sm animate-escala overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"><PreviaA4><DocumentoOrcamento orcamento={exemplo} empresa={{ ...EMPRESA_EXEMPLO, corTema: MODELOS[modelo].cor, layout: layoutDoModelo(modelo) }} /></PreviaA4></div>
          </div>
        </div>
      </section>
      <section id="recursos" className="scroll-mt-24 border-b border-slate-200 bg-superficie">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl"><p className="etiqueta text-marca-600">Tudo no mesmo lugar</p><h2 className="titulo-secao mt-3">Cuide das propostas.<br />E do próximo passo.</h2></div>
          <dl className="mt-10 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {RECURSOS.map((recurso) => <div key={recurso.titulo}><Icone nome={recurso.icone} className="mb-4 h-6 w-6 text-marca-600" /><dt className="text-base font-semibold text-slate-900">{recurso.titulo}</dt><dd className="mt-2 text-sm leading-relaxed text-slate-600">{recurso.texto}</dd></div>)}
          </dl>
        </div>
      </section>
      <section aria-labelledby="faq" className="mx-auto grid max-w-6xl gap-8 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <div><p className="etiqueta text-marca-600">Antes de começar</p><h2 id="faq" className="titulo-secao mt-3">Ficou alguma dúvida?</h2><p className="mt-4 max-w-xs leading-relaxed text-slate-600">O essencial para você conhecer o OrçaFácil e criar sua primeira proposta.</p></div>
        <div className="border-t border-slate-200">
          {PERGUNTAS.map(([pergunta, resposta]) => <details key={pergunta} className="group border-b border-slate-200 py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-sm font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">{pergunta}<span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500"><Icone nome="mais" className="h-3.5 w-3.5 transition-transform group-open:rotate-45" /></span></summary><p className="mt-3 pr-8 text-sm leading-relaxed text-slate-600">{resposta}</p></details>)}
        </div>
      </section>
      <section className="px-5 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-3xl bg-[#142442] px-7 py-10 text-white sm:px-12 sm:py-12 lg:flex-row lg:items-center">
          <div><p className="text-xs font-medium text-[#a8bde7]">GRATUITO, DO PRIMEIRO ORÇAMENTO EM DIANTE</p><h2 className="mt-3 max-w-lg font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">Seu trabalho já é bom.<br />Sua proposta pode mostrar isso.</h2><p className="mt-4 text-sm text-[#bac8df]">Crie sua conta e prepare o próximo orçamento.</p></div>
          <Link to={cadastro} className="btn min-h-12 shrink-0 border-white bg-white px-6 text-[15px] font-semibold text-[#142442] hover:bg-[#eaf0ff]">Começar gratuitamente <Icone nome="seta" /></Link>
        </div>
      </section>
    </>
  )
}
