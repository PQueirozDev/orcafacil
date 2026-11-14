import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { DocumentoOrcamento } from '../../components/DocumentoOrcamento'
import { PreviaA4 } from '../../components/PreviaA4'
import { Carregando, Icone, Titulo } from '../../components/ui'
import { db, EMPRESA_PADRAO, layoutDe, normalizarEmpresa, SECOES, type Empresa, type LayoutDoc, type ModeloId, type SecaoId } from '../../db'
import { EMPRESA_EXEMPLO, orcamentoExemplo } from '../../lib/exemplo'
import { layoutDoModelo, MODELOS } from '../../lib/modelos'

const CORES = ['#4f46e5', '#0f766e', '#0369a1', '#b91c1c', '#c2410c', '#a16207', '#7e22ce', '#db2777', '#1e293b']

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="cartao p-4 sm:p-5">
      <h2 className="mb-4 font-semibold text-slate-900">{titulo}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Opcoes<T extends string | number>({ rotulo, valor, opcoes, aoMudar }: { rotulo: string; valor: T; opcoes: [T, string][]; aoMudar: (v: T) => void }) {
  return (
    <div>
      <span className="rotulo">{rotulo}</span>
      <div role="radiogroup" aria-label={rotulo} className="inline-flex flex-wrap rounded-lg bg-slate-100 p-1 text-xs font-medium">
        {opcoes.map(([v, r]) => (
          <button
            key={String(v)}
            role="radio"
            aria-checked={valor === v}
            onClick={() => aoMudar(v)}
            className={`rounded-md px-3 py-1.5 transition ${valor === v ? 'bg-superficie text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  )
}

function Deslizante({ rotulo, valor, min, max, passo = 1, unidade, aoMudar }: { rotulo: string; valor: number; min: number; max: number; passo?: number; unidade: string; aoMudar: (n: number) => void }) {
  return (
    <label className="block">
      <span className="rotulo flex justify-between">
        {rotulo}
        <span className="font-mono text-slate-400">
          {valor.toLocaleString('pt-BR')} {unidade}
        </span>
      </span>
      <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => aoMudar(Number(e.target.value))} className="w-full accent-marca-600" />
    </label>
  )
}

function Cor({ rotulo, valor, aoMudar }: { rotulo: string; valor: string; aoMudar: (c: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{rotulo}</span>
      <span className="flex items-center gap-2">
        <span className="font-mono text-xs uppercase text-slate-400">{valor}</span>
        <span className="relative h-8 w-8 overflow-hidden rounded-full ring-1 ring-slate-300" style={{ background: valor }}>
          <input type="color" aria-label={rotulo} value={valor} onChange={(e) => aoMudar(e.target.value)} className="absolute -inset-2 h-12 w-12 cursor-pointer opacity-0" />
        </span>
      </span>
    </label>
  )
}

export function ModeloOrcamento() {
  const salva = useLiveQuery(() => db.empresa.get('principal').then((e) => e ?? null))
  const ultimo = useLiveQuery(() => db.orcamentos.orderBy('atualizadoEm').last())
  const exemplo = useMemo(() => orcamentoExemplo(), [])
  const [empresa, setEmpresa] = useState<Empresa | null>(null)
  const [salvo, setSalvo] = useState(true)
  const [arrastando, setArrastando] = useState<SecaoId | null>(null)
  const [aba, setAba] = useState<'ajustar' | 'previa'>('ajustar')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (salva !== undefined && empresa === null) setEmpresa(normalizarEmpresa(salva))
  }, [salva, empresa])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!empresa) return <Carregando />
  const l = layoutDe(empresa)
  // Para a prévia, usa os dados reais da empresa quando existem
  const empresaPrevia = empresa.nome ? empresa : { ...EMPRESA_EXEMPLO, corTema: empresa.corTema, layout: empresa.layout }

  function aplicar(novo: Empresa) {
    setEmpresa(novo)
    setSalvo(false)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(async () => {
      await db.transaction('rw', db.empresa, async () => {
        const atual = normalizarEmpresa(await db.empresa.get('principal'))
        await db.empresa.put({ ...atual, layout: novo.layout, corTema: novo.corTema, atualizadoEm: Date.now() })
      })
      setSalvo(true)
    }, 400)
  }

  const mudar = (m: Partial<LayoutDoc>) => aplicar({ ...empresa, layout: { ...l, ...m } })

  function mover(secao: SecaoId, para: number) {
    const ordem = l.ordem.filter((s) => s !== secao)
    ordem.splice(Math.max(0, Math.min(para, ordem.length)), 0, secao)
    mudar({ ordem })
  }

  const alternarVisivel = (s: SecaoId) => mudar({ ocultas: l.ocultas.includes(s) ? l.ocultas.filter((x) => x !== s) : [...l.ocultas, s] })

  return (
    <>
      <Titulo
        titulo="Modelos do orçamento"
        subtitulo="Escolha um modelo e ajuste posição, tamanhos e cores. A prévia é exatamente o que vai para o PDF."
        acoes={
          <>
            <span role="status" className={`self-center text-xs ${salvo ? 'text-emerald-600' : 'text-slate-400'}`}>
              {salvo ? '✓ Salvo' : 'Salvando…'}
            </span>
            <button className="btn-secundario" onClick={() => aplicar({ ...empresa, layout: layoutDoModelo('moderno'), corTema: EMPRESA_PADRAO.corTema })}>
              Restaurar padrão
            </button>
          </>
        }
      />

      {/* Galeria */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.keys(MODELOS) as ModeloId[]).map((m) => {
          const ativo = l.modelo === m
          return (
            <button
              key={m}
              aria-pressed={ativo}
              onClick={() => aplicar({ ...empresa, corTema: MODELOS[m].cor, layout: layoutDoModelo(m) })}
              className={`group overflow-hidden rounded-2xl border-2 bg-superficie text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                ativo ? 'border-marca-500 shadow-lg shadow-marca-600/15' : 'border-slate-200'
              }`}
            >
              <div className="pointer-events-none h-36 overflow-hidden bg-slate-100 p-2" aria-hidden="true">
                <PreviaA4>
                  <DocumentoOrcamento orcamento={exemplo} empresa={{ ...empresaPrevia, corTema: MODELOS[m].cor, layout: layoutDoModelo(m) }} />
                </PreviaA4>
              </div>
              <div className="p-3">
                <span className="flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                  {MODELOS[m].nome}
                  {ativo && <Icone nome="check" className="h-4 w-4 text-marca-600" />}
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{MODELOS[m].descricao}</span>
              </div>
            </button>
          )
        })}
      </div>

      <div role="tablist" aria-label="Modo" className="mb-4 inline-flex rounded-xl bg-slate-200/60 p-1 text-sm font-medium xl:hidden">
        {(['ajustar', 'previa'] as const).map((a) => (
          <button key={a} role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className={`min-h-10 rounded-lg px-4 transition ${aba === a ? 'bg-superficie text-slate-900 shadow-sm' : 'text-slate-600'}`}>
            {a === 'ajustar' ? 'Ajustar' : 'Ver prévia'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className={`space-y-6 ${aba === 'previa' ? 'hidden xl:block' : ''}`}>
          <Grupo titulo="Posição das partes">
            <p className="-mt-2 text-xs text-slate-500">Arraste ou use as setas para mudar a ordem. O olho mostra ou esconde a parte.</p>
            <ol className="space-y-1.5">
              {l.ordem.map((s, i) => {
                const oculta = l.ocultas.includes(s)
                return (
                  <li
                    key={s}
                    draggable
                    onDragStart={() => setArrastando(s)}
                    onDragEnd={() => setArrastando(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (arrastando && arrastando !== s) mover(arrastando, i)
                      setArrastando(null)
                    }}
                    className={`flex cursor-grab items-center gap-2 rounded-lg border px-3 py-2 text-sm active:cursor-grabbing ${
                      arrastando === s ? 'border-marca-500 bg-marca-50' : 'border-slate-200 bg-superficie'
                    } ${oculta ? 'opacity-50' : ''}`}
                  >
                    <Icone nome="arrastar" className="h-4 w-4 text-slate-300" />
                    <span className="flex-1 font-medium text-slate-700">{SECOES[s]}</span>
                    <button aria-label={`Subir ${SECOES[s]}`} disabled={i === 0} onClick={() => mover(s, i - 1)} className="grid h-8 w-8 place-items-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                      <Icone nome="subir" className="h-3.5 w-3.5" />
                    </button>
                    <button aria-label={`Descer ${SECOES[s]}`} disabled={i === l.ordem.length - 1} onClick={() => mover(s, i + 1)} className="grid h-8 w-8 place-items-center rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                      <Icone nome="baixar" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label={oculta ? `Mostrar ${SECOES[s]}` : `Esconder ${SECOES[s]}`}
                      aria-pressed={!oculta}
                      onClick={() => alternarVisivel(s)}
                      className={`grid h-8 w-8 place-items-center rounded hover:bg-slate-100 ${oculta ? 'text-slate-300' : 'text-marca-600'}`}
                    >
                      <Icone nome="olho" className="h-4 w-4" />
                    </button>
                  </li>
                )
              })}
            </ol>
            <Opcoes rotulo="Logo e dados da empresa" valor={l.posicaoLogo} opcoes={[['esquerda', 'À esquerda'], ['centro', 'No centro'], ['direita', 'À direita']]} aoMudar={(posicaoLogo) => mudar({ posicaoLogo })} />
            <Opcoes rotulo="Cabeçalho" valor={l.estiloCabecalho} opcoes={[['linha', 'Com linha'], ['faixa', 'Faixa colorida']]} aoMudar={(estiloCabecalho) => mudar({ estiloCabecalho })} />
            <Opcoes rotulo="Caixa de totais" valor={l.alinhamentoTotais} opcoes={[['esquerda', 'À esquerda'], ['direita', 'À direita']]} aoMudar={(alinhamentoTotais) => mudar({ alinhamentoTotais })} />
          </Grupo>

          <Grupo titulo="Tamanhos">
            <Deslizante rotulo="Texto" valor={l.tamanhoFonte} min={8} max={13} passo={0.5} unidade="pt" aoMudar={(tamanhoFonte) => mudar({ tamanhoFonte })} />
            <Deslizante rotulo="Logo" valor={l.tamanhoLogo} min={32} max={120} unidade="px" aoMudar={(tamanhoLogo) => mudar({ tamanhoLogo })} />
            <Deslizante rotulo="Foto de cada item" valor={l.tamanhoFotoItem} min={32} max={120} unidade="px" aoMudar={(tamanhoFotoItem) => mudar({ tamanhoFotoItem })} />
            <Deslizante rotulo="Altura das fotos do orçamento" valor={l.alturaFotos} min={30} max={130} unidade="mm" aoMudar={(alturaFotos) => mudar({ alturaFotos })} />
            <Opcoes rotulo="Fotos por linha" valor={l.colunasFotos} opcoes={[[1, '1'], [2, '2'], [3, '3']]} aoMudar={(colunasFotos) => mudar({ colunasFotos })} />
          </Grupo>

          <Grupo titulo="Cores e estilo">
            <div>
              <span className="rotulo">Cor principal</span>
              <div className="flex flex-wrap items-center gap-2">
                {CORES.map((c) => (
                  <button
                    key={c}
                    aria-label={`Cor ${c}`}
                    aria-pressed={empresa.corTema === c}
                    onClick={() => aplicar({ ...empresa, corTema: c })}
                    className={`h-7 w-7 rounded-full ring-offset-2 ring-offset-superficie transition ${empresa.corTema === c ? 'ring-2 ring-slate-900' : ''}`}
                    style={{ background: c }}
                  />
                ))}
                <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full ring-1 ring-slate-300" title="Cor personalizada">
                  <input type="color" aria-label="Cor principal personalizada" value={empresa.corTema} onChange={(e) => aplicar({ ...empresa, corTema: e.target.value })} className="absolute -inset-2 h-12 w-12 cursor-pointer" />
                </label>
              </div>
            </div>
            <Cor rotulo="Cor secundária (degradês)" valor={l.corSecundaria} aoMudar={(corSecundaria) => mudar({ corSecundaria })} />
            <Cor rotulo="Cor do texto" valor={l.corTexto} aoMudar={(corTexto) => mudar({ corTexto })} />
            <Cor rotulo="Cor dos títulos" valor={l.corTitulos} aoMudar={(corTitulos) => mudar({ corTitulos })} />
            <Cor rotulo="Fundo das caixas" valor={l.corFundoCaixas} aoMudar={(corFundoCaixas) => mudar({ corFundoCaixas })} />
            <Opcoes rotulo="Tabela de itens" valor={l.estiloTabela} opcoes={[['solido', 'Colorida'], ['linhas', 'Só linha'], ['zebrado', 'Zebrada']]} aoMudar={(estiloTabela) => mudar({ estiloTabela })} />
            <Opcoes rotulo="Cantos" valor={l.cantos} opcoes={[['arredondados', 'Arredondados'], ['retos', 'Retos']]} aoMudar={(cantos) => mudar({ cantos })} />
            <Opcoes rotulo="Fonte" valor={l.fonte} opcoes={[['moderna', 'Moderna'], ['classica', 'Clássica'], ['neutra', 'Neutra']]} aoMudar={(fonte) => mudar({ fonte })} />
          </Grupo>
        </div>

        <div className={aba === 'ajustar' ? 'hidden xl:block' : ''}>
          <div className="sticky top-20">
            <div className="mb-2 text-xs font-medium text-slate-500">Prévia {ultimo ? `do orçamento ${ultimo.titulo || 'mais recente'}` : 'com dados de exemplo'}</div>
            <div className="max-h-[calc(100vh-7rem)] overflow-y-auto rounded-xl bg-slate-200/70 p-3">
              <PreviaA4>
                <DocumentoOrcamento orcamento={ultimo ?? exemplo} empresa={ultimo ? empresa : empresaPrevia} />
              </PreviaA4>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
