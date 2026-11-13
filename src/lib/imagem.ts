/**
 * Lê uma imagem enviada e devolve um dataURL redimensionado/comprimido,
 * para não lotar o armazenamento do navegador e deixar o PDF leve.
 */
export async function comprimirImagem(
  arquivo: File,
  { lado = 1600, qualidade = 0.82, manterTransparencia = false } = {},
): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('O arquivo selecionado não é uma imagem.')

  const url = URL.createObjectURL(arquivo)
  try {
    const img = await carregar(url)
    const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight))
    const largura = Math.round(img.naturalWidth * escala)
    const altura = Math.round(img.naturalHeight * escala)

    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível processar a imagem.')

    const png = manterTransparencia && /png|svg|webp/.test(arquivo.type)
    if (!png) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, largura, altura)
    }
    ctx.drawImage(img, 0, 0, largura, altura)
    return png ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', qualidade)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function carregar(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem.'))
    img.src = src
  })
}
