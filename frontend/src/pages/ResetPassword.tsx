import { useState, type FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import './Auth.css'

export default function ResetPassword() {
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)

    useEffect(() => {
        const hash = window.location.hash
        const params = new URLSearchParams(hash.slice(1))
        const token = params.get('access_token')
        const type = params.get('type')
        if (token && type === 'recovery') {
            setAccessToken(token)
        } else {
            setErrorMsg('Link inválido ou expirado. Solicite um novo link de recuperação.')
            setStatus('error')
        }
    }, [])

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (password !== confirmPassword) {
            setErrorMsg('As senhas não coincidem.')
            return
        }
        if (password.length < 8) {
            setErrorMsg('A senha deve ter no mínimo 8 caracteres.')
            return
        }

        setStatus('submitting')
        setErrorMsg(null)

        try {
            await api.post('/api/auth/update-password', {
                access_token: accessToken,
                new_password: password,
            })
            setStatus('success')
            setTimeout(() => navigate('/login', { replace: true }), 3000)
        } catch (err: unknown) {
            setStatus('error')
            setErrorMsg(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.')
            setStatus('idle')
        }
    }

    return (
        <div className="auth-root">
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
                            Nova senha,<br /><span>novo começo</span>
                        </h2>
                        <p className="auth-side-desc">
                            Defina uma senha forte para proteger sua conta e continuar gerenciando seu negócio.
                        </p>
                    </div>
                    <div className="auth-blob auth-blob-1" />
                    <div className="auth-blob auth-blob-2" />
                </div>
            </div>

            <div className="auth-form-side">
                <div className="auth-form-wrapper">
                    <div className="auth-logo-mobile">
                        <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                            <rect width="40" height="40" rx="12" fill="#2E294E" />
                            <path d="M20 8L32 14V26L20 32L8 26V14L20 8Z" fill="#10B981" fillOpacity=".9" />
                            <path d="M20 14L26 17V23L20 26L14 23V17L20 14Z" fill="white" />
                        </svg>
                        <span className="auth-logo-mobile-text">Plafin</span>
                    </div>

                    <div className="auth-header">
                        <h1 className="auth-title">Redefinir senha</h1>
                        <p className="auth-subtitle">Digite sua nova senha abaixo.</p>
                    </div>

                    {status === 'success' ? (
                        <div style={{
                            background: 'rgba(16,185,129,0.1)',
                            border: '1px solid rgba(16,185,129,0.3)',
                            borderRadius: 12,
                            padding: '20px 24px',
                            textAlign: 'center',
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" style={{ margin: '0 auto 12px', display: 'block' }}>
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                            </svg>
                            <p style={{ color: '#10B981', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                                Senha redefinida com sucesso!
                            </p>
                            <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
                                Redirecionando para o login em alguns segundos...
                            </p>
                        </div>
                    ) : (
                        <>
                            {errorMsg && (
                                <div className="auth-alert">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {accessToken && (
                                <form className="auth-form" onSubmit={handleSubmit}>
                                    <div className="auth-field">
                                        <label htmlFor="new-password" className="auth-label">Nova senha</label>
                                        <div className="auth-input-wrap">
                                            <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                            </svg>
                                            <input
                                                id="new-password"
                                                type={showPassword ? 'text' : 'password'}
                                                className="auth-input auth-input-with-toggle"
                                                placeholder="Mínimo 8 caracteres"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                minLength={8}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                className="auth-toggle-pw"
                                                onClick={() => setShowPassword(v => !v)}
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

                                    <div className="auth-field">
                                        <label htmlFor="confirm-password" className="auth-label">Confirmar nova senha</label>
                                        <div className="auth-input-wrap">
                                            <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                            </svg>
                                            <input
                                                id="confirm-password"
                                                type="password"
                                                className="auth-input"
                                                placeholder="Repita a senha"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                autoComplete="new-password"
                                            />
                                        </div>
                                    </div>

                                    {password.length > 0 && (
                                        <div style={{ marginBottom: 16 }}>
                                            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                                {[1, 2, 3, 4].map(i => {
                                                    const strength = Math.min(4, Math.floor(password.length / 3) + (
                                                        /[A-Z]/.test(password) ? 1 : 0
                                                    ) + (/[0-9!@#$%]/.test(password) ? 1 : 0))
                                                    const colors = ['#ef4444', '#f97316', '#eab308', '#10B981']
                                                    return (
                                                        <div key={i} style={{
                                                            flex: 1, height: 4, borderRadius: 2,
                                                            background: i <= strength ? colors[strength - 1] : 'var(--hover)',
                                                            transition: 'background 0.3s',
                                                        }} />
                                                    )
                                                })}
                                            </div>
                                            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                                                Use letras maiúsculas, números e símbolos para uma senha mais forte.
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className="auth-btn-primary"
                                        disabled={status === 'submitting'}
                                    >
                                        {status === 'submitting' ? (
                                            <>
                                                <span className="auth-spinner" />
                                                Salvando...
                                            </>
                                        ) : (
                                            <>
                                                Salvar nova senha
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            <p className="auth-switch">
                                <Link to="/forgot-password" className="auth-switch-link">Solicitar novo link</Link>
                                {' '}·{' '}
                                <Link to="/login" className="auth-switch-link">Voltar ao login</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
