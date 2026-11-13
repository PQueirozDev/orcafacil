import { useRef, useState, type ReactNode } from 'react'
import { comprimirImagem } from '../lib/imagem'
import { avisar } from './Avisos'

interface Props {
  aoEnviar: (fotos: string[]) => void
  multiplo?: boolean
  manterTransparencia?: boolean
  lado?: number
  className?: string
  children: ReactNode
  titulo?: string
}

/** Botão que abre o seletor de arquivos e devolve as imagens já comprimidas. */
export function EnviarFoto({ aoEnviar, multiplo, manterTransparencia, lado, className, children, titulo }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [ocupado, setOcupado] = useState(false)

  async function selecionar(arquivos: FileList | null) {
    if (!arquivos?.length) return
    setOcupado(true)
    try {
      const fotos = await Promise.all(
        Array.from(arquivos).map((f) => comprimirImagem(f, { manterTransparencia, lado })),
      )
      aoEnviar(fotos)
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível carregar a imagem.', 'erro')
    } finally {
      setOcupado(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <>
      <button
        type="button"
        title={titulo}
        className={className}
        disabled={ocupado}
        onClick={() => input.current?.click()}
      >
        {ocupado ? <span className="text-xs">Carregando…</span> : children}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiplo}
        hidden
        onChange={(e) => selecionar(e.target.files)}
      />
    </>
  )
}
