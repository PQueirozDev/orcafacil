import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DocumentoOrcamento } from '../../components/DocumentoOrcamento'
import { PreviaA4 } from '../../components/PreviaA4'
import { Carregando, Icone } from '../../components/ui'
import { db, EMPRESA_PADRAO } from '../../db'
import { calcularTotais } from '../../lib/calculos'
import { formatarMoeda, formatarNumero } from '../../lib/formato'
import { avisar } from '../../components/Avisos'

export function VisualizarOrcamento() {
  const { id } = useParams()
  const orc = useLiveQuery(() => db.orcamentos.get(Number(id)).then((o) => o ?? null), [id])
  const empresa = useLiveQuery(() => db.empresa.get('principal'))
  const [copiado, setCopiado] = useState(false)

  // Nome do arquivo sugerido ao salvar o PDF
  useEffect(() => {
    if (!orc) return
    const anterior = document.title
    const cliente = orc.cliente.nome ? ` - ${orc.cliente.nome}` : ''
    document.title = `Orçamento ${formatarNumero(orc.numero).replace('#', '')}${cliente}`
    return () => {
      document.title = anterior
    }
  }, [orc])

  if (orc === undefined) return <Carregando />
  if (orc === null) return <p className="text-slate-600">Orçamento não encontrado.</p>

  const emp = empresa ?? EMPRESA_PADRAO

  async function copiarMensagem() {
    const total = formatarMoeda(calcularTotais(orc!).total)
    const texto =
      `Olá${orc!.cliente.nome ? `, ${orc!.cliente.nome.split(' ')[0]}` : ''}! ` +
      `Segue o orçamento ${formatarNumero(orc!.numero)}${orc!.titulo ? ` (${orc!.titulo})` : ''} ` +
      `no valor de ${total}. Qualquer dúvida, estou à disposição. — ${emp.nome}`
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      avisar('Mensagem copiada! Cole no WhatsApp do cliente.')
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      avisar('Não foi possível copiar automaticamente. Selecione e copie o texto.', 'erro')
    }
  }

  async function marcarEnviado() {
    if (orc!.status === 'rascunho') await db.orcamentos.update(orc!.id!, { status: 'enviado', atualizadoEm: Date.now() })
  }

  return (
    <>
      <div className="nao-imprimir mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/app/orcamentos/${orc.id}`} className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-slate-900">
            <Icone nome="voltar" className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Orçamento {formatarNumero(orc.numero)}</h1>
            <p className="text-sm text-slate-500">Confira e salve como PDF para enviar ao cliente.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/app/orcamentos/${orc.id}`} className="btn-secundario">
            Editar
          </Link>
          <button className="btn-secundario" onClick={copiarMensagem}>
            <Icone nome="whatsapp" /> {copiado ? 'Mensagem copiada!' : 'Copiar mensagem'}
          </button>
          <button
            className="btn-primario"
            onClick={() => {
              void marcarEnviado()
              window.print()
            }}
          >
            <Icone nome="imprimir" /> Salvar PDF / Imprimir
          </button>
        </div>
      </div>

      <p className="nao-imprimir mb-4 rounded-lg bg-marca-50 px-4 py-2.5 text-xs text-marca-800">
        Dica: na janela de impressão, escolha <strong>“Salvar como PDF”</strong> como destino e deixe as margens em
        “Nenhuma”.
      </p>

      {/* Tela: folha reduzida para caber */}
      <div className="nao-imprimir mx-auto max-w-[794px]">
        <PreviaA4>
          <DocumentoOrcamento orcamento={orc} empresa={emp} />
        </PreviaA4>
      </div>

      {/* Impressão: folha em tamanho real */}
      <div className="area-impressao hidden print:block">
        <DocumentoOrcamento orcamento={orc} empresa={emp} />
      </div>
    </>
  )
}
