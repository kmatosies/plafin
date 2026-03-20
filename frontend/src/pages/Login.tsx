import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../i18n/useTranslation'
import LegalModal from '../components/LegalModal'
import { ApiRequestError } from '../lib/api'
import './Auth.css'

export default function Login() {
    const { login, isLoading, locale, setLocale } = useAuth()
    const { t } = useTranslation(locale)
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [showPassword, setShowPassword] = useState(false)
    const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError(null)
        try {
            await login({ email, password })
            navigate('/dashboard', { replace: true })
        } catch (err: unknown) {
            if (err instanceof ApiRequestError) {
                if (err.status === 401) {
                    setError(t('login', 'errorInvalid'))
                    return
                }
                if ((err.status ?? 0) >= 500) {
                    setError(locale === 'pt-BR'
                        ? 'Servidor indisponível no momento. Tente novamente em instantes.'
                        : 'Server unavailable right now. Please try again shortly.')
                    return
                }
                setError(err.message)
                return
            }
            setError(locale === 'pt-BR'
                ? 'Falha de conexão com o servidor. Verifique sua rede e tente novamente.'
                : 'Unable to reach the server. Check your connection and try again.')
        }
    }

    return (
        <>
            {legalModal && <LegalModal type={legalModal} locale={locale} onClose={() => setLegalModal(null)} />}
            <div className="auth-root">
                {/* Painel esquerdo decorativo */}
                <div className="auth-side">
                    <div className="auth-side-inner">
                        <div className="auth-logo-mark">
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                                <rect width="40" height="40" rx="12" fill="white" fillOpacity=".15" />
                                <path d="M20 8L32 14V26L20 32L8 26V14L20 8Z" fill="white" fillOpacity=".9" />
                                <path d="M20 14L26 17V23L20 26L14 23V17L20 14Z" fill="white" />
                            </svg>
                            <span className="auth-logo-text">Plafin</span>
                        </div>

                        <div className="auth-side-content">
                            <h2 className="auth-side-title">
                                Gestão financeira<br />
                                <span>para profissionais</span>
                            </h2>
                            <p className="auth-side-desc">
                                Controle finanças, agenda e clientes em um único lugar.
                                Simples, rápido e inteligente.
                            </p>

                            <ul className="auth-side-features">
                                {[
                                    { icon: '•', text: 'Dashboard com IA integrada' },
                                    { icon: '•', text: 'Agenda inteligente' },
                                    { icon: '•', text: 'Gestão de pagamentos' },
                                    { icon: '•', text: 'CRM de clientes' },
                                ].map((f) => (
                                    <li key={f.text} className="auth-side-feature">
                                        <span className="auth-feature-icon">{f.icon}</span>
                                        <span>{f.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Blobs decorativos */}
                        <div className="auth-blob auth-blob-1" />
                        <div className="auth-blob auth-blob-2" />
                    </div>
                </div>

                {/* Painel direito formulário */}
                <div className="auth-form-side">
                    <div className="auth-form-wrapper">
                        {/* Logo mobile */}
                        <div className="auth-logo-mobile">
                            <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                                <rect width="40" height="40" rx="12" fill="#2E294E" />
                                <path d="M20 8L32 14V26L20 32L8 26V14L20 8Z" fill="#10B981" fillOpacity=".9" />
                                <path d="M20 14L26 17V23L20 26L14 23V17L20 14Z" fill="white" />
                            </svg>
                            <span className="auth-logo-mobile-text">Plafin</span>
                        </div>

                        <div className="auth-header">
                            {/* Seletor de idioma */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                                <div style={{ display: 'flex', gap: 4, background: 'var(--hover)', padding: '4px 6px', borderRadius: 99 }}>
                                    {(['pt-BR', 'en-US'] as const).map((loc) => (
                                        <button
                                            key={loc}
                                            onClick={() => setLocale(loc)}
                                            style={{
                                                padding: '4px 10px', borderRadius: 99, border: 'none',
                                                background: locale === loc ? 'white' : 'transparent',
                                                boxShadow: locale === loc ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                                color: locale === loc ? 'var(--brand-navy)' : 'var(--text-3)',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {loc === 'pt-BR' ? 'PT' : 'EN'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <h1 className="auth-title">{t('login', 'title')}</h1>
                            <p className="auth-subtitle">{t('login', 'subtitle')}</p>
                        </div>

                        {error && (
                            <div className="auth-alert">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="12" />
                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                </svg>
                                <span>{error}</span>
                            </div>
                        )}

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="auth-field">
                                <label htmlFor="login-email" className="auth-label">{t('login', 'emailLabel')}</label>
                                <div className="auth-input-wrap">
                                    <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <path d="M2 8l10 6 10-6" />
                                    </svg>
                                    <input
                                        id="login-email"
                                        type="email"
                                        className="auth-input"
                                        placeholder={t('login', 'emailPlaceholder')}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="auth-field">
                                <div className="auth-label-row">
                                    <label htmlFor="login-password" className="auth-label">{t('login', 'passwordLabel')}</label>
                                    <Link to="/forgot-password" className="auth-forgot-link">{t('login', 'forgotPassword')}</Link>
                                </div>
                                <div className="auth-input-wrap">
                                    <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="auth-input auth-input-with-toggle"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        className="auth-toggle-pw"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                    >
                                        {showPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="auth-btn-primary"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="auth-spinner" />
                                        {t('login', 'submitting')}
                                    </>
                                ) : (
                                    <>
                                        {t('login', 'submitButton')}
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="auth-switch">
                            {t('login', 'noAccount')}{' '}
                            <Link to="/register" className="auth-switch-link">{t('login', 'registerLink')}</Link>
                        </p>

                        <p className="auth-terms">
                            {t('login', 'termsText')}{' '}
                            <button onClick={() => setLegalModal('terms')} className="auth-terms-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                                {t('login', 'termsLink')}
                            </button>{' '}
                            {t('login', 'andText')}{' '}
                            <button onClick={() => setLegalModal('privacy')} className="auth-terms-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                                {t('login', 'privacyLink')}
                            </button>.
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
