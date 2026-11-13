import { useEffect, useState, type InputHTMLAttributes } from 'react'
import { lerNumero } from '../lib/formato'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  valor: number
  aoMudar: (n: number) => void
  casas?: number
}

// Sem separador de milhar: "1.250" seria lido de volta como 1,25 ao editar
const exibir = (n: number, casas: number) =>
  n ? n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas, useGrouping: false }) : ''

const arredondar = (n: number, casas: number) => Number(n.toFixed(casas))

/** Campo numérico que aceita vírgula decimal (padrão brasileiro) sem atrapalhar a digitação. */
export function CampoNumero({ valor, aoMudar, casas = 2, className = 'campo', ...props }: Props) {
  const [texto, setTexto] = useState(() => exibir(valor, casas))
  const [focado, setFocado] = useState(false)

  useEffect(() => {
    if (!focado) setTexto(exibir(valor, casas))
  }, [valor, casas, focado])

  return (
    <input
      {...props}
      inputMode="decimal"
      className={className}
      value={texto}
      placeholder={props.placeholder ?? '0'}
      onFocus={() => setFocado(true)}
      onBlur={() => setFocado(false)}
      onChange={(e) => {
        const t = e.target.value.replace(/[^\d.,-]/g, '')
        setTexto(t)
        aoMudar(arredondar(lerNumero(t), casas))
      }}
    />
  )
}
