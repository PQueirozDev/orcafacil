import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { Avisos } from './components/Avisos'
import { LayoutApp, LayoutPublico } from './components/Layouts'
import { Checkout } from './pages/Checkout'
import { Entrar } from './pages/Entrar'
import { Inicio } from './pages/Inicio'
import { NaoEncontrada, Privacidade, Termos } from './pages/Legal'
import { Precos } from './pages/Precos'
import { Assinatura } from './pages/app/Assinatura'
import { Clientes } from './pages/app/Clientes'
import { Configuracoes } from './pages/app/Configuracoes'
import { EditorOrcamento } from './pages/app/EditorOrcamento'
import { ModeloOrcamento } from './pages/app/ModeloOrcamento'
import { Painel } from './pages/app/Painel'
import { VisualizarOrcamento } from './pages/app/VisualizarOrcamento'

const rotas = createBrowserRouter([
  {
    element: <LayoutPublico />,
    children: [
      { path: '/', element: <Inicio /> },
      { path: '/precos', element: <Precos /> },
      { path: '/termos', element: <Termos /> },
      { path: '/privacidade', element: <Privacidade /> },
      { path: '*', element: <NaoEncontrada /> },
    ],
  },
  { path: '/entrar', element: <Entrar /> },
  { path: '/checkout/:plano', element: <Checkout /> },
  {
    path: '/app',
    element: <LayoutApp />,
    children: [
      { index: true, element: <Painel /> },
      { path: 'orcamentos/:id', element: <EditorOrcamento /> },
      { path: 'orcamentos/:id/visualizar', element: <VisualizarOrcamento /> },
      { path: 'modelo', element: <ModeloOrcamento /> },
      { path: 'clientes', element: <Clientes /> },
      { path: 'configuracoes', element: <Configuracoes /> },
      { path: 'assinatura', element: <Assinatura /> },
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
