import type { Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { trocarBanco } from './db'
import { supabase } from './lib/supabase'

/**
 * Sessão de usuário com Supabase Auth.
 * Sem login o app funciona como "visitante" (dados só neste navegador).
 * Com login, os dados da conta ficam num banco local próprio e são sincronizados com a nuvem.
 */

export interface Usuario {
  id: string
  email: string
  nome: string
}

interface Estado {
  carregando: boolean
  usuario: Usuario | null
  /** Incrementa quando o banco local é trocado (entrar/sair): força remontar as telas. */
  versaoBanco: number
}

let estado: Estado = { carregando: !!supabase, usuario: null, versaoBanco: 0 }
const ouvintes = new Set<() => void>()

function definir(parcial: Partial<Estado>) {
  estado = { ...estado, ...parcial }
  ouvintes.forEach((f) => f())
}

function usuarioDaSessao(s: Session | null): Usuario | null {
  if (!s?.user) return null
  const meta = s.user.user_metadata ?? {}
  return {
    id: s.user.id,
    email: s.user.email ?? '',
    nome: String(meta.nome ?? meta.full_name ?? s.user.email?.split('@')[0] ?? ''),
  }
}

function aplicarSessao(s: Session | null) {
  const usuario = usuarioDaSessao(s)
  const mudouBanco = trocarBanco(usuario?.id ?? null)
  definir({
    carregando: false,
    usuario,
    versaoBanco: mudouBanco ? estado.versaoBanco + 1 : estado.versaoBanco,
  })
}

let ultimoEvento = ''
if (supabase) {
  supabase.auth.getSession().then(({ data }) => aplicarSessao(data.session))
  supabase.auth.onAuthStateChange((evento, sessao) => {
    ultimoEvento = evento
    // Evita trabalho em renovações de token que não mudam o usuário
    if (evento === 'TOKEN_REFRESHED' && sessao?.user.id === estado.usuario?.id) return
    aplicarSessao(sessao)
  })
}

/** Último evento de autenticação (ex.: PASSWORD_RECOVERY ao abrir o link de redefinição). */
export const eventoDeAuth = () => ultimoEvento

export function useAuth() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => estado,
  )
}

export const usuarioAtual = () => estado.usuario

function exigirSupabase() {
  if (!supabase) throw new Error('A conta na nuvem não está configurada neste ambiente.')
  return supabase
}

const origem = () => window.location.origin

export async function cadastrar(nome: string, email: string, senha: string) {
  const { data, error } = await exigirSupabase().auth.signUp({
    email,
    password: senha,
    options: { data: { nome }, emailRedirectTo: `${origem()}/app` },
  })
  if (error) throw error
  // Sem sessão = o projeto exige confirmação por e-mail
  return { precisaConfirmar: !data.session }
}

export async function entrar(email: string, senha: string) {
  const { error } = await exigirSupabase().auth.signInWithPassword({ email, password: senha })
  if (error) throw error
}

export async function entrarComGoogle() {
  const { error } = await exigirSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${origem()}/app` },
  })
  if (error) throw error
}

export async function reenviarConfirmacao(email: string) {
  const { error } = await exigirSupabase().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${origem()}/app` },
  })
  if (error) throw error
}

export async function recuperarSenha(email: string) {
  const { error } = await exigirSupabase().auth.resetPasswordForEmail(email, {
    redirectTo: `${origem()}/redefinir-senha`,
  })
  if (error) throw error
}

export async function redefinirSenha(novaSenha: string) {
  const { error } = await exigirSupabase().auth.updateUser({ password: novaSenha })
  if (error) throw error
}

export async function sair() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function atualizarNome(nome: string) {
  const sb = exigirSupabase()
  const { error } = await sb.auth.updateUser({ data: { nome } })
  if (error) throw error
  if (estado.usuario) {
    await sb.from('perfis').update({ nome }).eq('id', estado.usuario.id)
    definir({ usuario: { ...estado.usuario, nome } })
  }
}

/** Regras mínimas de senha (o Supabase também valida no servidor). */
export function problemaNaSenha(senha: string): string | null {
  if (senha.length < 8) return 'Use pelo menos 8 caracteres.'
  if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) return 'Misture letras e números.'
  return null
}
