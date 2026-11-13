import type { CSSProperties, ReactNode } from 'react'
import { layoutDe, type Empresa, type Orcamento, type SecaoId } from '../db'
import { calcularTotais, totalItem } from '../lib/calculos'
import { formatarData, formatarMoeda, formatarNumero, somarDias } from '../lib/formato'

/**
 * Orçamento renderizado em formato A4, usado na prévia e na impressão/PDF.
 * Os tamanhos de texto são em "em", relativos ao tamanho de fonte escolhido no modelo.
 */
export function DocumentoOrcamento({ orcamento: o, empresa: e }: { orcamento: Orcamento; empresa: Empresa }) {
  const l = layoutDe(e)
  const cor = e.corTema || '#4f46e5'
  const r = l.cantos === 'arredondados'
  const caixa = r ? 'rounded-lg' : ''
  const totais = calcularTotais(o)
  const itens = o.itens.filter((i) => i.descricao.trim() || i.valorUnitario)
  const temFotoItem = itens.some((i) => i.foto)
  const validade = somarDias(o.criadoEm, o.validadeDias || 0)
  const contatoEmpresa = [e.telefone, e.email, e.site].filter(Boolean).join('  ·  ')

  const estiloRaiz: CSSProperties = {
    fontSize: `${l.tamanhoFonte}pt`,
    color: l.corTexto,
    fontFamily: l.fonte === 'classica' ? "Georgia, 'Times New Roman', serif" : undefined,
  }
  const titulo = { color: l.corTitulos }
  const rotuloSecao = (texto: string) => (
    <h3 className="mb-[0.3em] text-[0.76em] font-semibold uppercase tracking-wider" style={{ color: cor }}>
      {texto}
    </h3>
  )

  const logo = e.logo ? (
    <img src={e.logo} alt="" className="object-contain" style={{ maxHeight: l.tamanhoLogo, maxWidth: l.tamanhoLogo * 2.6 }} />
  ) : (
    <div
      className={`grid shrink-0 place-items-center font-bold text-white ${r ? 'rounded-xl' : ''}`}
      style={{ background: cor, width: l.tamanhoLogo * 0.9, height: l.tamanhoLogo * 0.9, fontSize: l.tamanhoLogo * 0.36 }}
    >
      {(e.nome || 'E').slice(0, 1).toUpperCase()}
    </div>
  )

  const dadosEmpresa = (
    <div>
      <div className="text-[1.43em] font-bold leading-tight" style={titulo}>
        {e.nome || 'Sua empresa'}
      </div>
      {e.documento && <div className="text-[0.857em] opacity-70">CNPJ/CPF: {e.documento}</div>}
      {e.endereco && <div className="text-[0.857em] opacity-70">{e.endereco}</div>}
      {contatoEmpresa && <div className="text-[0.857em] opacity-70">{contatoEmpresa}</div>}
    </div>
  )

  const numero = (alinhar: 'left' | 'right' | 'center') => (
    <div className="shrink-0" style={{ textAlign: alinhar }}>
      <div className="text-[0.857em] font-semibold uppercase tracking-[0.2em]" style={{ color: cor }}>
        Orçamento
      </div>
      <div className="text-[1.9em] font-extrabold leading-none" style={titulo}>
        {formatarNumero(o.numero)}
      </div>
      <div className="mt-[0.4em] text-[0.857em] opacity-70">Emitido em {formatarData(o.criadoEm)}</div>
      <div className="text-[0.857em] opacity-70">Válido até {formatarData(validade)}</div>
    </div>
  )

  const cabecalho =
    l.posicaoLogo === 'centro' ? (
      <header className="flex flex-col items-center gap-[0.8em] border-b-2 pb-[1.2em] text-center" style={{ borderColor: cor }}>
        {logo}
        {dadosEmpresa}
        {numero('center')}
      </header>
    ) : (
      <header
        className={`flex items-start justify-between gap-6 border-b-2 pb-[1.2em] ${l.posicaoLogo === 'direita' ? 'flex-row-reverse' : ''}`}
        style={{ borderColor: cor }}
      >
        <div className={`flex items-center gap-4 ${l.posicaoLogo === 'direita' ? 'flex-row-reverse text-right' : ''}`}>
          {logo}
          {dadosEmpresa}
        </div>
        {numero(l.posicaoLogo === 'direita' ? 'left' : 'right')}
      </header>
    )

  const estiloCabecalhoTabela: CSSProperties =
    l.estiloTabela === 'linhas' ? { color: cor, borderBottom: `2px solid ${cor}` } : { background: cor, color: '#fff' }

  const secoes: Record<SecaoId, ReactNode> = {
    cliente: (
      <section className="grid grid-cols-2 gap-5">
        <div className={`${caixa} p-[0.9em]`} style={{ background: l.corFundoCaixas }}>
          <div className="mb-[0.2em] text-[0.76em] font-semibold uppercase tracking-wider opacity-50">Cliente</div>
          <div className="font-semibold" style={titulo}>
            {o.cliente.nome || '—'}
          </div>
          {o.cliente.documento && <div className="text-[0.857em] opacity-80">{o.cliente.documento}</div>}
          {o.cliente.endereco && <div className="text-[0.857em] opacity-80">{o.cliente.endereco}</div>}
          {(o.cliente.telefone || o.cliente.email) && (
            <div className="text-[0.857em] opacity-80">{[o.cliente.telefone, o.cliente.email].filter(Boolean).join('  ·  ')}</div>
          )}
        </div>
        <div className={`${caixa} p-[0.9em]`} style={{ background: l.corFundoCaixas }}>
          <div className="mb-[0.2em] text-[0.76em] font-semibold uppercase tracking-wider opacity-50">Referente a</div>
          <div className="font-semibold" style={titulo}>
            {o.titulo || 'Orçamento de produtos/serviços'}
          </div>
          {o.prazoEntrega && <div className="text-[0.857em] opacity-80">Prazo de entrega: {o.prazoEntrega}</div>}
        </div>
      </section>
    ),

    itens: (
      <table className="w-full border-collapse text-[0.905em]">
        <thead>
          <tr className="text-left text-[0.84em] uppercase tracking-wider" style={estiloCabecalhoTabela}>
            <th className={`px-3 py-2 font-semibold ${r && l.estiloTabela !== 'linhas' ? 'rounded-l-md' : ''}`}>Descrição</th>
            <th className="px-2 py-2 text-center font-semibold">Qtd.</th>
            <th className="px-2 py-2 text-right font-semibold">Unitário</th>
            <th className={`px-3 py-2 text-right font-semibold ${r && l.estiloTabela !== 'linhas' ? 'rounded-r-md' : ''}`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center opacity-50">
                Nenhum item adicionado.
              </td>
            </tr>
          )}
          {itens.map((item, i) => (
            <tr
              key={item.id}
              className="evitar-quebra border-b border-slate-100 align-top"
              style={l.estiloTabela === 'zebrado' && i % 2 === 1 ? { background: l.corFundoCaixas } : undefined}
            >
              <td className="px-3 py-[0.6em]">
                <div className="flex gap-3">
                  {temFotoItem &&
                    (item.foto ? (
                      <img
                        src={item.foto}
                        alt=""
                        className={`shrink-0 object-cover ${r ? 'rounded-md' : ''}`}
                        style={{ width: l.tamanhoFotoItem, height: l.tamanhoFotoItem }}
                      />
                    ) : (
                      <div className="shrink-0" style={{ width: l.tamanhoFotoItem }} />
                    ))}
                  <div>
                    <div className="font-medium" style={titulo}>
                      <span className="mr-1.5 opacity-40">{i + 1}.</span>
                      {item.descricao || 'Item sem descrição'}
                    </div>
                    {item.detalhes && <div className="mt-0.5 whitespace-pre-line text-[0.9em] opacity-60">{item.detalhes}</div>}
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-2 py-[0.6em] text-center">
                {item.quantidade} {item.unidade}
              </td>
              <td className="whitespace-nowrap px-2 py-[0.6em] text-right">{formatarMoeda(item.valorUnitario)}</td>
              <td className="whitespace-nowrap px-3 py-[0.6em] text-right font-semibold" style={titulo}>
                {formatarMoeda(totalItem(item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ),

    totais: (
      <section className={`evitar-quebra flex ${l.alinhamentoTotais === 'direita' ? 'justify-end' : 'justify-start'}`}>
        <dl className="w-[27em] max-w-full text-[0.905em]">
          <div className="flex justify-between py-1">
            <dt className="opacity-60">Subtotal</dt>
            <dd>{formatarMoeda(totais.subtotal)}</dd>
          </div>
          {totais.desconto > 0 && (
            <div className="flex justify-between py-1">
              <dt className="opacity-60">Desconto{o.descontoTipo === 'percentual' ? ` (${o.desconto}%)` : ''}</dt>
              <dd className="text-emerald-700">− {formatarMoeda(totais.desconto)}</dd>
            </div>
          )}
          {totais.frete > 0 && (
            <div className="flex justify-between py-1">
              <dt className="opacity-60">Frete / deslocamento</dt>
              <dd>{formatarMoeda(totais.frete)}</dd>
            </div>
          )}
          <div className={`mt-1.5 flex items-center justify-between px-3 py-[0.6em] text-white ${caixa}`} style={{ background: cor }}>
            <dt className="text-[0.95em] font-semibold uppercase tracking-wider">Total</dt>
            <dd className="text-[1.5em] font-extrabold">{formatarMoeda(totais.total)}</dd>
          </div>
        </dl>
      </section>
    ),

    fotos:
      o.fotos.length > 0 ? (
        <section>
          {rotuloSecao('Imagens de referência')}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(l.colunasFotos, o.fotos.length)}, minmax(0, 1fr))` }}>
            {o.fotos.map((f) => (
              <figure key={f.id} className="evitar-quebra">
                <img src={f.src} alt={f.legenda} className={`w-full object-cover ${caixa}`} style={{ height: `${l.alturaFotos}mm` }} />
                {f.legenda && <figcaption className="mt-1 text-[0.81em] opacity-60">{f.legenda}</figcaption>}
              </figure>
            ))}
          </div>
        </section>
      ) : null,

    condicoes:
      o.condicoesPagamento || o.observacoes ? (
        <section className="evitar-quebra grid grid-cols-2 gap-5 text-[0.857em]">
          {o.condicoesPagamento && (
            <div>
              {rotuloSecao('Condições de pagamento')}
              <p className="whitespace-pre-line opacity-80">{o.condicoesPagamento}</p>
            </div>
          )}
          {o.observacoes && (
            <div>
              {rotuloSecao('Observações')}
              <p className="whitespace-pre-line opacity-80">{o.observacoes}</p>
            </div>
          )}
        </section>
      ) : null,

    assinaturas: (
      <section className="evitar-quebra mt-[2.5em] grid grid-cols-2 gap-10 text-center text-[0.857em] opacity-70">
        <div>
          <div className="border-t border-slate-300 pt-1.5">{e.responsavel || e.nome || 'Empresa'}</div>
          <div className="text-[0.9em]">{e.nome}</div>
        </div>
        <div>
          <div className="border-t border-slate-300 pt-1.5">{o.cliente.nome || 'Cliente'}</div>
          <div className="text-[0.9em]">De acordo</div>
        </div>
      </section>
    ),
  }

  return (
    <article className="folha-a4 shadow-xl" style={estiloRaiz}>
      {cabecalho}
      {l.ordem
        .filter((s) => !l.ocultas.includes(s) && secoes[s])
        .map((s) => (
          <div key={s} className="mt-[1.6em]">
            {secoes[s]}
          </div>
        ))}
    </article>
  )
}
