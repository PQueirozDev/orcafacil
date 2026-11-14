import { lazy, StrictMode, Suspense, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import './index.css'
import './lib/tema'
import { Avisos } from './components/Avisos'
import { LayoutApp, LayoutPublico } from './components/Layouts'
import { Carregando } from './components/ui'
import { Inicio } from './pages/Inicio'

/** Carrega a página só quando ela é aberta (divide o código por rota). */
function sobDemanda<K extends string>(carregar: () => Promise<Record<K, ComponentType>>, nome: K) {
  const Pagina = lazy(() => carregar().then((m) => ({ default: m[nome] as ComponentType })))
  return (
    <Suspense fallback={<Carregando />}>
      <Pagina />
    </Suspense>
  )
}

const rotas = createBrowserRouter([
  {
    element: <LayoutPublico />,
    children: [
      { path: '/', element: <Inicio /> },
      { path: '/planos', element: sobDemanda(() => import('./pages/Planos'), 'Planos') },
      { path: '/precos', element: <Navigate to="/planos" replace /> },
      { path: '/termos', element: sobDemanda(() => import('./pages/Legal'), 'Termos') },
      { path: '/privacidade', element: sobDemanda(() => import('./pages/Legal'), 'Privacidade') },
      { path: '*', element: sobDemanda(() => import('./pages/Legal'), 'NaoEncontrada') },
    ],
  },
  { path: '/entrar', element: sobDemanda(() => import('./pages/Entrar'), 'Entrar') },
  { path: '/redefinir-senha', element: sobDemanda(() => import('./pages/Entrar'), 'RedefinirSenha') },
  { path: '/proposta/:token', element: sobDemanda(() => import('./pages/Proposta'), 'Proposta') },
  {
    path: '/app',
    element: <LayoutApp />,
    children: [
      { index: true, element: sobDemanda(() => import('./pages/app/Painel'), 'Painel') },
      { path: 'orcamentos/:id', element: sobDemanda(() => import('./pages/app/EditorOrcamento'), 'EditorOrcamento') },
      { path: 'orcamentos/:id/visualizar', element: sobDemanda(() => import('./pages/app/VisualizarOrcamento'), 'VisualizarOrcamento') },
      { path: 'modelo', element: sobDemanda(() => import('./pages/app/ModeloOrcamento'), 'ModeloOrcamento') },
      { path: 'clientes', element: sobDemanda(() => import('./pages/app/Clientes'), 'Clientes') },
      { path: 'configuracoes', element: sobDemanda(() => import('./pages/app/Configuracoes'), 'Configuracoes') },
      { path: 'conta', element: sobDemanda(() => import('./pages/app/Conta'), 'Conta') },
      { path: 'assinatura', element: <Navigate to="/app/conta" replace /> },
    ],
  },
])

// PWA: registra o service worker só no build de produção (no dev atrapalharia o recarregamento)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={rotas} />
    <Avisos />
  </StrictMode>,
)
