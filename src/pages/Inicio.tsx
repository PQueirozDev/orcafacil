import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DocumentoOrcamento } from '../components/DocumentoOrcamento'
import { PreviaA4 } from '../components/PreviaA4'
import { Icone } from '../components/ui'
import type { ModeloId } from '../db'
import { EMPRESA_EXEMPLO, orcamentoExemplo } from '../lib/exemplo'
import { layoutDoModelo, MODELOS } from '../lib/modelos'
import { nuvemDisponivel } from '../lib/supabase'

const PASSOS = [
  ['Monte', 'Cliente, itens com foto, desconto e impostos. A prévia acompanha o que você digita.'],
  ['Personalize', 'Escolha um dos cinco modelos e ajuste cor, fonte e a ordem das seções.'],
  ['Envie', 'Mande o link pelo WhatsApp ou e-mail, ou baixe o PDF em A4.'],
  ['Receba o “sim”', 'O cliente aprova pelo celular. O status muda no painel e você é avisado.'],
]

const RECURSOS = [
  ['Fotos no orçamento', 'Uma por item ou uma galeria: produto, local, projeto.'],
  ['Aprovação por link', 'Validade, revogação e decisão registrada com nome, data e hora.'],
  ['Painel de vendas', 'Valores propostos e aprovados por mês e taxa de aprovação.'],
  ['Clientes', 'Cadastre uma vez, preencha com um clique e veja o histórico.'],
  ['Avisos', 'Proposta aprovada, recusada ou perto de vencer.'],
  ['Nuvem e offline', 'Sincroniza entre aparelhos e continua salvando sem internet.'],
]

const PERGUNTAS = [
  ['Quanto custa?', 'Nada. Crie sua conta grátis com e-mail ou Google, sem cartão.'],
  ['Como o cliente aprova?', 'Você envia um link pelo WhatsApp ou e-mail. Ele abre no navegador, confere os itens e toca em aprovar ou recusar, informando o nome. Não precisa instalar nada nem criar conta.'],
  ['O aceite tem validade jurídica?', 'É um aceite eletrônico simples: registra nome, data e horário. Não substitui assinatura digital certificada (ICP-Brasil) quando ela for exigida.'],
  ['E se eu mudar o orçamento depois de enviar?', 'O link mostra uma cópia fixa do que foi enviado, para o cliente aprovar exatamente aquilo. Se mudar algo, gere um novo link.'],
  ['Funciona no celular?', 'Sim, no navegador do celular, e pode ser instalado na tela inicial como aplicativo.'],
]

/** Mini ilustrações de cada passo (feitas com HTML, sem imagens). */
function IlustracaoPasso({ i }: { i: number }) {
  const caixa = 'mt-5 h-28 rounded-lg border border-slate-300 bg-fundo p-3'
  if (i === 0)
    return (
      <div className={caixa} aria-hidden="true">
        {[['Armário superior', '3,2 m', '4.000'], ['Gaveteiro', '2,8 m', '4.144'], ['Montagem', '1 serv.', '900']].map(([d, q, v]) => (
          <div key={d} className="flex items-center justify-between border-b border-dashed border-slate-300 py-1.5 font-mono text-[11px] last:border-0">
            <span className="text-slate-800">{d}</span>
            <span className="text-slate-500">{q}</span>
            <span className="font-semibold text-slate-900">{v}</span>
          </div>
        ))}
      </div>
    )
  if (i === 1)
    return (
      <div className={`${caixa} flex flex-col justify-between`} aria-hidden="true">
        <div className="flex gap-1.5">
          {['#1f6a58', '#2443c4', '#c2410c', '#db2777', '#161512'].map((c, k) => (
            <span key={c} className={`h-7 w-7 rounded-full ${k === 0 ? 'ring-2 ring-slate-900 ring-offset-2 ring-offset-fundo' : ''}`} style={{ background: c }} />
          ))}
        </div>
        <div className="flex gap-1.5 text-[11px]">
          <span className="rounded-md bg-slate-900 px-2 py-1 text-slate-50">Moderna</span>
          <span className="rounded-md border border-slate-300 px-2 py-1 font-serif">Clássica</span>
          <span className="rounded-md border border-slate-300 px-2 py-1">Neutra</span>
        </div>
      </div>
    )
  if (i === 2)
    return (
      <div className={`${caixa} flex flex-col justify-center gap-1.5 bg-[#e5ddd5] dark:bg-slate-100`} aria-hidden="true">
        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-[#d9fdd3] px-2.5 py-1.5 text-[11px] text-[#111b21] shadow-sm">
          Olá, Mariana! Segue a proposta #0042 no valor de R$ 8.591,80.
          <span className="mt-0.5 block truncate text-[#027eb5] underline">orcafacil…/proposta/Xk9…</span>
        </div>
        <span className="ml-auto font-mono text-[10px] text-slate-500">10:31 ✓✓</span>
      </div>
    )
  return (
    <div className={`${caixa} grid place-items-center`} aria-hidden="true">
      <div className="-rotate-6 rounded-md border-[3px] border-emerald-700 px-3 py-1 text-center font-display text-2xl font-bold tracking-widest text-emerald-700 uppercase">
        Aprovado
        <span className="block font-mono text-[9px] tracking-normal normal-case">14/11 · 10:42</span>
      </div>
    </div>
  )
}

/** Carimbo de "aprovado" sobre o documento de exemplo. */
function Carimbo() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-4 top-[46%] z-10 -rotate-12 rounded-md border-[3px] border-emerald-700 px-4 py-1.5 font-display text-3xl font-bold tracking-widest text-emerald-700 uppercase opacity-90 mix-blend-multiply sm:right-10 sm:text-4xl"
    >
      Aprovado
      <span className="block text-center font-mono text-[10px] tracking-normal normal-case">por Mariana Souza · 14/11 · 10:42</span>
    </div>
  )
}

export function Inicio() {
  const exemplo = useMemo(() => orcamentoExemplo(), [])
  const [modelo, setModelo] = useState<ModeloId>('moderno')
  const cadastro = nuvemDisponivel ? '/entrar?modo=cadastrar' : '/app'

  return (
    <>
      {/* Abertura */}
      <section className="papel-quadriculado border-b border-slate-900">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div className="animate-entrada">
            <p className="etiqueta">Orçamentos · propostas · aprovação</p>
            <h1 className="mt-4 font-display text-[3.4rem] leading-[0.95] font-bold tracking-tight text-slate-900 uppercase sm:text-[5.2rem]">
              Crie orçamentos profissionais <span className="grifo">em minutos.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-slate-700">Organize seus clientes, personalize propostas e acompanhe aprovações em um só lugar.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={cadastro} className="btn-destaque px-5 py-3 text-[15px]">
                Criar conta grátis <Icone nome="seta" />
              </Link>
              <a href="#como-funciona" className="btn-secundario px-5 py-3 text-[15px]">
                Conhecer funcionalidades
              </a>
            </div>
            <p className="mt-4 font-mono text-xs text-slate-500">grátis · sem cartão · entre com e-mail ou Google</p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="relative rotate-[1.5deg] overflow-hidden rounded-xl border border-slate-900 bg-white shadow-[6px_6px_0_0_var(--color-slate-900)]">
              <PreviaA4>
                <DocumentoOrcamento orcamento={exemplo} empresa={EMPRESA_EXEMPLO} />
              </PreviaA4>
            </div>
            <Carimbo />
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="scroll-mt-14 border-b border-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900 uppercase sm:text-5xl">Do rascunho ao “aprovado”</h2>
          <ol className="mt-10 grid border-t-2 border-slate-900 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map(([titulo, texto], i) => (
              <li key={titulo} className="border-b border-slate-300 py-6 pr-6 lg:border-b-0 lg:border-r lg:pl-6 lg:first:pl-0 lg:last:border-r-0">
                <span className="font-mono text-sm font-semibold text-marca-600">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{texto}</p>
                <IlustracaoPasso i={i} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Editor real */}
      <section className="border-b border-slate-900 bg-superficie">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900 uppercase sm:text-5xl">Você digita, o PDF aparece</h2>
            <p className="max-w-sm text-sm text-slate-600">À esquerda o formulário, à direita o documento final, igualzinho ao que vai para o cliente.</p>
          </div>
          <div className="mt-8 overflow-hidden rounded-xl border border-slate-900 shadow-[6px_6px_0_0_var(--color-slate-900)]">
            <img src="/editor.webp" alt="Editor do OrçaFácil com o formulário à esquerda e a prévia do orçamento à direita" width={1440} height={900} loading="lazy" decoding="async" className="w-full" />
          </div>
        </div>
      </section>

      {/* Modelos */}
      <section id="modelos" className="scroll-mt-14 border-b border-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900 uppercase sm:text-5xl">Cinco modelos</h2>
          <div role="tablist" aria-label="Modelos" className="mt-8 flex flex-wrap gap-2">
            {(Object.keys(MODELOS) as ModeloId[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={modelo === m}
                onClick={() => setModelo(m)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  modelo === m ? 'border-slate-900 bg-slate-900 text-slate-50' : 'border-slate-300 bg-superficie text-slate-700 hover:border-slate-900'
                }`}
              >
                {MODELOS[m].nome}
              </button>
            ))}
          </div>
          <div className="mt-8 grid items-start gap-8 md:grid-cols-[1fr_1.3fr]">
            <div>
              <p className="text-lg text-slate-800">{MODELOS[modelo].descricao}</p>
              <p className="mt-3 text-sm text-slate-600">Todos aceitam sua logo, suas cores, três fontes, fotos em uma, duas ou três colunas e a ordem das seções que você preferir.</p>
              <Link to={cadastro} className="btn-primario mt-6">Usar este modelo</Link>
            </div>
            <div key={modelo} className="mx-auto w-full max-w-md animate-escala overflow-hidden rounded-xl border border-slate-900 bg-white shadow-[6px_6px_0_0_var(--color-slate-900)]">
              <PreviaA4>
                <DocumentoOrcamento orcamento={exemplo} empresa={{ ...EMPRESA_EXEMPLO, corTema: MODELOS[modelo].cor, layout: layoutDoModelo(modelo) }} />
              </PreviaA4>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="scroll-mt-14 border-b border-slate-900 bg-superficie">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900 uppercase sm:text-5xl">O que vem junto</h2>
          <dl className="grid gap-px overflow-hidden rounded-xl border border-slate-300 bg-slate-300 sm:grid-cols-2">
            {RECURSOS.map(([titulo, texto]) => (
              <div key={titulo} className="bg-superficie p-5">
                <dt className="font-semibold text-slate-900">{titulo}</dt>
                <dd className="mt-1 text-sm text-slate-600">{texto}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Perguntas */}
      <section className="border-b border-slate-900" aria-labelledby="faq">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_2fr]">
          <h2 id="faq" className="font-display text-4xl font-bold tracking-tight text-slate-900 uppercase sm:text-5xl">Perguntas</h2>
          <div className="border-t-2 border-slate-900">
            {PERGUNTAS.map(([p, r]) => (
              <details key={p} className="group border-b border-slate-300 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
                  {p}
                  <span className="font-mono text-lg text-slate-500 group-open:hidden">+</span>
                  <span className="hidden font-mono text-lg text-slate-500 group-open:inline">−</span>
                </summary>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">{r}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Chamada final */}
      <section className="bg-destaque-400 text-[#161512]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:flex-row sm:items-center">
          <h2 className="font-display text-4xl leading-none font-bold tracking-tight uppercase sm:text-6xl">Próximo orçamento: 5 minutos.</h2>
          <Link to={cadastro} className="btn shrink-0 border-[#161512] bg-[#161512] px-5 py-3 text-[15px] text-[#faf8f3] hover:bg-[#2b2822]">
            Criar conta grátis <Icone nome="seta" />
          </Link>
        </div>
      </section>
    </>
  )
}
