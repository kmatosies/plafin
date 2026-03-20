/**
 * AuthContext.tsx — Contexto global de autenticação do Plafin
 *
 * Gerencia: token JWT, dados do usuário logado, login, logout, registro,
 *           locale de idioma (PT-BR / EN-US) e estado de upgrade (paywall).
 * O estado persiste via localStorage entre recarregamentos.
 */

import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    type ReactNode,
} from 'react'
import {
    authApi,
    subscriptionApi,
    type UserProfile,
    type LoginPayload,
    type RegisterPayload,
    type SubscriptionStatus,
} from '../lib/api'
import type { Locale } from '../i18n/translations'

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface UpgradeState {
    visible: boolean
    limitType: 'clients' | 'transactions' | 'generic' | 'ai'
    limit?: number
}

interface AuthState {
    user: UserProfile | null
    subscription: SubscriptionStatus | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    locale: Locale
    upgrade: UpgradeState
}

interface AuthContextValue extends AuthState {
    login: (data: LoginPayload) => Promise<void>
    register: (data: RegisterPayload) => Promise<void>
    logout: () => Promise<void>
    refreshSubscription: () => Promise<void>
    setLocale: (locale: Locale) => void
    showUpgrade: (limitType: UpgradeState['limitType'], limit?: number) => void
    hideUpgrade: () => void
}

// ─── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'plafin_token'
const USER_KEY = 'plafin_user'
const LOCALE_KEY = 'plafin_locale'
const SUBSCRIPTION_KEY = 'plafin_subscription'

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(() => {
        try {
            const raw = localStorage.getItem(USER_KEY)
            return raw ? (JSON.parse(raw) as UserProfile) : null
        } catch {
            return null
        }
    })
    const [token, setToken] = useState<string | null>(() =>
        localStorage.getItem(TOKEN_KEY),
    )
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(() => {
        try {
            const raw = localStorage.getItem(SUBSCRIPTION_KEY)
            return raw ? (JSON.parse(raw) as SubscriptionStatus) : null
        } catch {
            return null
        }
    })
    const [isLoading, setIsLoading] = useState(false)
    const [locale, setLocaleState] = useState<Locale>(() => {
        const saved = localStorage.getItem(LOCALE_KEY)
        return (saved === 'en-US' ? 'en-US' : 'pt-BR') as Locale
    })
    const [upgrade, setUpgrade] = useState<UpgradeState>({
        visible: false,
        limitType: 'generic',
    })

    // Sincroniza token e user com localStorage
    useEffect(() => {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token)
        } else {
            localStorage.removeItem(TOKEN_KEY)
        }
    }, [token])

    useEffect(() => {
        if (user) {
            localStorage.setItem(USER_KEY, JSON.stringify(user))
        } else {
            localStorage.removeItem(USER_KEY)
        }
    }, [user])

    useEffect(() => {
        if (subscription) {
            localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(subscription))
        } else {
            localStorage.removeItem(SUBSCRIPTION_KEY)
        }
    }, [subscription])

    const refreshSubscription = useCallback(async () => {
        if (!localStorage.getItem(TOKEN_KEY)) return
        try {
            const status = await subscriptionApi.getStatus()
            setSubscription(status)
            setUser(prev => (prev ? {
                ...prev,
                plan: status.plan,
                subscription_status: status.subscription_status,
            } : prev))
        } catch {
            // Manter sessão local mesmo se o status falhar momentaneamente
        }
    }, [])

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale)
        localStorage.setItem(LOCALE_KEY, newLocale)
    }, [])

    const showUpgrade = useCallback((limitType: UpgradeState['limitType'], limit?: number) => {
        setUpgrade({ visible: true, limitType, limit })
    }, [])

    const hideUpgrade = useCallback(() => {
        setUpgrade(prev => ({ ...prev, visible: false }))
    }, [])

    const login = useCallback(async (data: LoginPayload) => {
        setIsLoading(true)
        try {
            const res = await authApi.login(data)
            setToken(res.access_token)
            setUser(res.user)
            setSubscription(null)
            localStorage.setItem(TOKEN_KEY, res.access_token)
            void (async () => {
                try {
                    const status = await subscriptionApi.getStatus()
                    setSubscription(status)
                    setUser({
                        ...res.user,
                        plan: status.plan,
                        subscription_status: status.subscription_status,
                    })
                } catch {
                    // Login deve continuar mesmo se o endpoint de assinatura falhar.
                }
            })()
        } finally {
            setIsLoading(false)
        }
    }, [])

    const register = useCallback(async (data: RegisterPayload) => {
        setIsLoading(true)
        try {
            const res = await authApi.register(data)
            setToken(res.access_token)
            setUser(res.user)
            setSubscription(null)
            localStorage.setItem(TOKEN_KEY, res.access_token)
            void (async () => {
                try {
                    const status = await subscriptionApi.getStatus()
                    setSubscription(status)
                    setUser({
                        ...res.user,
                        plan: status.plan,
                        subscription_status: status.subscription_status,
                    })
                } catch {
                    // Registro deve continuar mesmo se o endpoint de assinatura falhar.
                }
            })()
        } finally {
            setIsLoading(false)
        }
    }, [])

    const logout = useCallback(async () => {
        setIsLoading(true)
        try {
            await authApi.logout()
        } catch {
            // Ignorar erros de rede no logout — limpar estado local de qualquer forma
        } finally {
            setToken(null)
            setUser(null)
            setSubscription(null)
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        if (token) {
            void refreshSubscription()
        }
    }, [token, refreshSubscription])

    const value: AuthContextValue = {
        user,
        subscription,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        locale,
        upgrade,
        login,
        register,
        logout,
        refreshSubscription,
        setLocale,
        showUpgrade,
        hideUpgrade,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
    }
    return ctx
}
