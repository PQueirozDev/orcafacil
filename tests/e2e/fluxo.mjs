// Teste de ponta a ponta com a nuvem real (Supabase):
// login → criar orçamento → sincronizar → gerar link → cliente abre em outro navegador → aprova
// → o painel do profissional recebe o status "aprovado" e a notificação.
//
// Uso:  E2E_EMAIL=... E2E_SENHA=... [E2E_BASE=http://localhost:5173] [CHROME_PATH=...] npm run test:e2e
// Requer uma conta de teste já confirmada no projeto Supabase configurado no .env.local.
import { existsSync } from 'node:fs'
import { chromium } from 'playwright-core'

const base = process.env.E2E_BASE ?? 'http://localhost:5173'
const email = process.env.E2E_EMAIL
const senha = process.env.E2E_SENHA
const executablePath =
  process.env.CHROME_PATH ??
  ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)

if (!email || !senha) {
  console.error('Defina E2E_EMAIL e E2E_SENHA (conta de teste confirmada).')
  process.exit(2)
}

let falhas = 0
const ok = (cond, msg) => {
  if (!cond) falhas++
  console.log(`${cond ? 'ok   ' : 'FALHA'} ${msg}`)
}

const browser = await chromium.launch({ executablePath, headless: true })
try {
  // ---------------- Profissional ----------------
  const pro = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
  const erros = []
  pro.on('pageerror', (e) => erros.push(e.message))

  await pro.goto(`${base}/entrar`)
  await pro.getByLabel('E-mail').fill(email)
  await pro.getByLabel('Senha').fill(senha)
  await pro.getByRole('button', { name: 'Entrar', exact: true }).click()
  await pro.waitForURL(/\/app$/, { timeout: 20000 })
  ok(true, 'login com e-mail e senha')

  await pro.getByRole('button', { name: 'Novo orçamento' }).first().click()
  await pro.waitForURL(/\/app\/orcamentos\/\d+$/)
  const titulo = `E2E ${Date.now()}`
  await pro.getByLabel('Título do orçamento').fill(titulo)
  await pro.getByLabel('Nome / Razão social *').fill('Cliente E2E')
  await pro.getByLabel('Descrição do item 1').fill('Serviço de teste')
  await pro.getByLabel('Preço unitário (R$)').first().fill('250')
  await pro.waitForTimeout(1500)

  await pro.getByRole('button', { name: /Enviar \/ PDF/ }).click()
  await pro.waitForURL(/\/visualizar$/)
  await pro.getByRole('button', { name: 'Gerar link da proposta' }).click()
  const campoLink = pro.getByLabel('Link da proposta')
  await campoLink.waitFor({ timeout: 30000 })
  const url = await campoLink.inputValue()
  ok(/\/proposta\/[A-Za-z0-9_-]{43}$/.test(url), 'link gerado com token aleatório de 43 caracteres')

  // ---------------- Cliente (navegador separado, sem login) ----------------
  const cli = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await cli.goto(url, { waitUntil: 'networkidle' })
  ok((await cli.getByText(titulo).count()) > 0, 'cliente vê a proposta sem login')
  ok((await cli.getByText('R$ 250,00').count()) > 0, 'cliente vê o valor')
  const robots = await cli.locator('meta[name="robots"]').getAttribute('content')
  ok(robots?.includes('noindex'), 'proposta marcada como noindex')

  await cli.getByRole('button', { name: 'Aprovar proposta' }).click()
  await cli.getByRole('button', { name: 'Confirmar aprovação' }).click()
  ok((await cli.getByRole('alert').textContent())?.includes('nome'), 'aprovação sem nome é bloqueada')
  await cli.getByLabel('Seu nome completo *').fill('Maria Cliente E2E')
  await cli.getByRole('button', { name: 'Confirmar aprovação' }).click()
  ok((await cli.getByRole('alert').textContent())?.includes('caixa'), 'aprovação exige confirmar que leu')
  await cli.getByRole('checkbox').check()
  await cli.getByRole('button', { name: 'Confirmar aprovação' }).click()
  await cli.getByText('Proposta aprovada').waitFor({ timeout: 15000 })
  ok(true, 'cliente aprova a proposta')

  await cli.reload({ waitUntil: 'networkidle' })
  ok((await cli.getByRole('button', { name: 'Aprovar proposta' }).count()) === 0, 'proposta decidida não pode ser aprovada de novo')

  // Link adulterado
  await cli.goto(url.slice(0, -3) + 'abc', { waitUntil: 'networkidle' })
  ok((await cli.getByText('Link indisponível').count()) > 0, 'token alterado não abre proposta')

  // ---------------- Profissional recebe a decisão ----------------
  await pro.goto(`${base}/app`, { waitUntil: 'networkidle' })
  await pro.getByRole('button', { name: /Tudo salvo|Sincroniz|Alterações|Sem conexão|Falha/ }).click()
  await pro.waitForTimeout(4000)
  const linha = pro.locator('li', { hasText: titulo })
  ok((await linha.getByText('Aprovado').count()) > 0, 'status aprovado chega ao painel pela sincronização')
  await pro.getByRole('button', { name: /Notificações/ }).click()
  ok((await pro.getByText(/aprovado/i).count()) > 0, 'notificação de aprovação aparece')

  // Editor bloqueado após decisão
  await linha.getByRole('link', { name: /Editar/ }).click()
  await pro.waitForURL(/\/app\/orcamentos\/\d+$/)
  ok(await pro.getByLabel('Título do orçamento').isDisabled(), 'orçamento aprovado fica bloqueado para edição')

  ok(erros.length === 0, `sem erros de JavaScript${erros.length ? ': ' + erros.join(' | ') : ''}`)
} finally {
  await browser.close()
}

console.log(falhas ? `\n${falhas} falha(s)` : '\nTodos os passos passaram.')
process.exit(falhas ? 1 : 0)
