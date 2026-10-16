import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppError, toArabicError } from '../../lib/errors'
import { getSupabase } from '../../lib/supabase'

export type AuthStatus = 'loading' | 'signed_out' | 'signed_in' | 'not_admin' | 'not_configured'

interface AuthContextValue {
  status: AuthStatus
  session: Session | null
  user: User | null
  /** صار في جلسة استرجاع كلمة سر (من رابط الإيميل) */
  recovery: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase()
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(supabase ? 'loading' : 'not_configured')
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false

    async function resolve(next: Session | null) {
      if (cancelled) return
      setSession(next)
      if (!next) {
        setStatus('signed_out')
        return
      }
      const { data, error } = await supabase!.rpc('is_admin')
      if (cancelled) return
      setStatus(!error && data === true ? 'signed_in' : 'not_admin')
    }

    supabase.auth.getSession().then(({ data }) => resolve(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') setRecovery(false)
      void resolve(next)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new AppError('Supabase مش مجهّز')
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw new AppError(toArabicError(error))
    },
    [supabase],
  )

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setRecovery(false)
  }, [supabase])

  const sendPasswordReset = useCallback(
    async (email: string) => {
      if (!supabase) throw new AppError('Supabase مش مجهّز')
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw new AppError(toArabicError(error))
    },
    [supabase],
  )

  const updatePassword = useCallback(
    async (password: string) => {
      if (!supabase) throw new AppError('Supabase مش مجهّز')
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw new AppError(toArabicError(error))
      setRecovery(false)
    },
    [supabase],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, user: session?.user ?? null, recovery, signIn, signOut, sendPasswordReset, updatePassword }),
    [status, session, recovery, signIn, signOut, sendPasswordReset, updatePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth لازم يكون جوا AuthProvider')
  return ctx
}
