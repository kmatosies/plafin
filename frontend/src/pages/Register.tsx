import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../i18n/useTranslation'
import LegalModal from '../components/LegalModal'
import { Globe } from 'lucide-react'
import './Auth.css'

export default function Register() {
    const { register, isLoading, locale, setLocale } = useAuth()
    const { t } = useTranslation(locale)
    const navigate = useNavigate()

    const [fullName, setFullName] = useState('')
    const [businessName, setBusinessName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [legalDoc, setLegalDoc] = useState<'terms' | 'privacy' | null>(null)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.')
            return
        }
        if (password.length < 8) {
            setError('A senha deve ter pelo menos 8 caracteres.')
            return
        }

        try {
            await register({
                email,
                password,
                full_name: fullName,
                phone: phone || undefined,
                business_name: businessName || undefined,
            })
            navigate('/dashboard', { replace: true })
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao criar conta.')
        }
    }

    const passwordStrength = (() => {
        if (!password) return 0
        let score = 0
        if (password.length >= 8) score++
        if (/[A-Z]/.test(password)) score++
        if (/[0-9]/.test(password)) score++
        if (/[^A-Za-z0-9]/.test(password)) score++
        return score
    })()

    const pwTranslations = t('register', 'passwordStrength') as unknown as { label: string; weak: string; fair: string; good: string; strong: string }
    const strengthLabel = ['', pwTranslations.weak, pwTranslations.fair, pwTranslations.good, pwTranslations.strong][passwordStrength]
    const strengthClass = ['', 'weak', 'fair', 'good', 'strong'][passwordStrength]

    const isEn = locale === 'en-US'

    return (
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
                            {isEn ? 'Start free,' : 'Comece grátis,'}<br />
                            <span>{isEn ? 'grow without limits' : 'cresça sem limites'}</span>
                        </h2>
                        <p className="auth-side-desc">
                            {isEn
                                ? 'Join hundreds of professionals who already use Plafin to manage their business efficiently.'
                                : 'Junte-se a centenas de profissionais que já usam o Plafin para gerenciar seus negócios com eficiência.'}
                        </p>

                        <div className="auth-plan-badge">
                            <div className="auth-plan-badge-icon">•</div>
                            <div>
                                <strong>{isEn ? 'Free Plan included' : 'Plano Gratuito incluído'}</strong>
                                <p>{isEn ? 'No credit card. Cancel anytime.' : 'Sem cartão de crédito. Cancele quando quiser.'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="auth-blob auth-blob-1" />
                    <div className="auth-blob auth-blob-2" />
                </div>
            </div>

            {/* Painel direito formulário */}
            <div className="auth-form-side">
                <div style={{ position: 'absolute', top: 24, right: 32, zIndex: 10 }}>
                    <div className="locale-selector" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--hover)', padding: '6px 12px', borderRadius: 8 }}>
                        <Globe size={16} color="var(--text-2)" />
                        <select
                            value={locale}
                            onChange={(e) => setLocale(e.target.value as 'pt-BR' | 'en-US')}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-2)', fontSize: 13, fontWeight: 500, cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="pt-BR">PT-BR</option>
                            <option value="en-US">EN-US</option>
                        </select>
                    </div>
                </div>

                <div className="auth-form-wrapper auth-form-wrapper-wide">
                    <div className="auth-logo-mobile">
                        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                            <rect width="40" height="40" rx="12" fill="#2E294E" />
                            <path d="M20 8L32 14V26L20 32L8 26V14L20 8Z" fill="#10B981" fillOpacity=".9" />
                            <path d="M20 14L26 17V23L20 26L14 23V17L20 14Z" fill="white" />
                        </svg>
                        <span className="auth-logo-mobile-text">Plafin</span>
                    </div>

                    <div className="auth-header">
                        <h1 className="auth-title">{t('register', 'title')}</h1>
                        <p className="auth-subtitle">{t('register', 'subtitle')}</p>
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
                        <div className="auth-fields-row">
                            <div className="auth-field">
                                <label htmlFor="reg-name" className="auth-label">{t('register', 'fullNameLabel')} *</label>
                                <div className="auth-input-wrap">
                                    <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <input
                                        id="reg-name"
                                        type="text"
                                        className="auth-input"
                                        placeholder={t('register', 'fullNamePlaceholder')}
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="auth-field">
                                <label htmlFor="reg-business" className="auth-label">{t('register', 'businessNameLabel')}</label>
                                <div className="auth-input-wrap">
                                    <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                    <input
                                        id="reg-business"
                                        type="text"
                                        className="auth-input"
                                        placeholder={t('register', 'businessNamePlaceholder')}
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="auth-fields-row">
                            <div className="auth-field">
                                <label htmlFor="reg-email" className="auth-label">{t('register', 'emailLabel')} *</label>
                                <div className="auth-input-wrap">
                                    <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <path d="M2 8l10 6 10-6" />
                                    </svg>
                                    <input
                                        id="reg-email"
                                        type="email"
                                        className="auth-input"
                                        placeholder={t('register', 'emailPlaceholder')}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="auth-field">
                                <label htmlFor="reg-phone" className="auth-label">{t('register', 'phoneLabel')}</label>
                                <div className="auth-input-wrap">
                                    <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.61 4.88 2 2 0 0 1 3.58 2.67h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                    <input
                                        id="reg-phone"
                                        type="tel"
                                        className="auth-input"
                                        placeholder={t('register', 'phonePlaceholder')}
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="auth-fields-row">
                            <div className="auth-field">
                                <label htmlFor="reg-password" className="auth-label">{t('register', 'passwordLabel')} *</label>
                                <div className="auth-input-wrap">
                                    <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        id="reg-password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="auth-input auth-input-with-toggle"
                                        placeholder={t('register', 'passwordPlaceholder')}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        className="auth-toggle-pw"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label="Mostrar/ocultar senha"
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
                                {password && (
                                    <div className="auth-pw-strength">
                                        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{pwTranslations.label}</span>
                                        <div className={`auth-pw-bar auth-pw-bar-${strengthClass}`}>
                                            <div className="auth-pw-bar-fill" />
                                        </div>
                                        <span className={`auth-pw-label auth-pw-label-${strengthClass}`}>{strengthLabel}</span>
                                    </div>
                                )}
                            </div>

                            <div className="auth-field">
                                <label htmlFor="reg-confirm" className="auth-label">{t('register', 'confirmPasswordLabel')} *</label>
                                <div className="auth-input-wrap">
                                    <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                                    </svg>
                                    <input
                                        id="reg-confirm"
                                        type={showPassword ? 'text' : 'password'}
                                        className={`auth-input ${confirmPassword && confirmPassword !== password ? 'auth-input-error' : ''}`}
                                        placeholder={t('register', 'confirmPasswordPlaceholder')}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        autoComplete="new-password"
                                    />
                                </div>
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
                                    {t('register', 'submitting')}
                                </>
                            ) : (
                                <>
                                    {t('register', 'submitButton')}
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    <p className="auth-switch">
                        {t('register', 'hasAccount')}{' '}
                        <Link to="/login" className="auth-switch-link">{t('register', 'loginLink')}</Link>
                    </p>

                    <p className="auth-terms">
                        {t('register', 'termsText')}{' '}
                        <button type="button" className="auth-terms-link" onClick={() => setLegalDoc('terms')}>
                            {t('register', 'termsLink')}
                        </button>{' '}
                        {t('register', 'andText')}{' '}
                        <button type="button" className="auth-terms-link" onClick={() => setLegalDoc('privacy')}>
                            {t('register', 'privacyLink')}
                        </button>.
                    </p>

                    {legalDoc && (
                        <LegalModal
                            type={legalDoc}
                            locale={locale}
                            onClose={() => setLegalDoc(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
