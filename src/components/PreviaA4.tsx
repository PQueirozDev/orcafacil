import { useEffect, useRef, useState, type ReactNode } from 'react'

const LARGURA_A4 = 794 // 210mm em px (96 dpi)

/** Mostra uma folha A4 reduzida para caber na largura disponível. */
export function PreviaA4({ children, className = '' }: { children: ReactNode; className?: string }) {
  const caixa = useRef<HTMLDivElement>(null)
  const conteudo = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(0.5)
  const [altura, setAltura] = useState(1123)

  useEffect(() => {
    const atualizar = () => {
      if (caixa.current) setEscala(Math.min(1, caixa.current.clientWidth / LARGURA_A4))
      if (conteudo.current) setAltura(conteudo.current.offsetHeight)
    }
    atualizar()
    const obs = new ResizeObserver(atualizar)
    if (caixa.current) obs.observe(caixa.current)
    if (conteudo.current) obs.observe(conteudo.current)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={caixa} className={`w-full overflow-hidden ${className}`} style={{ height: altura * escala }}>
      <div ref={conteudo} style={{ width: LARGURA_A4, transform: `scale(${escala})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}
