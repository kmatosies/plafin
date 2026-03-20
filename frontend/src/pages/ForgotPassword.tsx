import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../lib/api'
import './Auth.css'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    async function handleSubmit(e: FormEvent) {
        e.preventDefault()
        setStatus('sending')
        setErrorMsg(null)
        try {
            await authApi.resetPassword(email)
            setStatus('sent')
        } catch {
            setStatus('error')
            setErrorMsg('Não foi possível enviar o e-mail. Tente novamente.')
        }
    }

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
                            Recupere<br /><span>seu acesso</span>
                        </h2>
                        <p className="auth-side-desc">
                            Enviaremos um link seguro para você redefinir sua senha
                            e voltar a gerenciar seu negócio.
                        </p>
                    </div>
                    <div className="auth-blob auth-blob-1" />
                    <div className="auth-blob auth-blob-2" />
                </div>
            </div>

            {/* Painel direito formulário */}
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
                        <h1 className="auth-title">Esqueceu sua senha?</h1>
                        <p className="auth-subtitle">
                            Digite seu e-mail e enviaremos um link para redefinir sua senha.
                        </p>
                    </div>

                    {status === 'sent' ? (
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
                                E-mail enviado com sucesso!
                            </p>
                            <p style={{ color: 'var(--text-3)', fontSize: 14, marginBottom: 16 }}>
                                Verifique sua caixa de entrada (e a pasta de spam). O link é válido por 1 hora.
                            </p>
                            <Link to="/login" className="auth-btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>
                                Voltar para o login
                            </Link>
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

                            <form className="auth-form" onSubmit={handleSubmit}>
                                <div className="auth-field">
                                    <label htmlFor="forgot-email" className="auth-label">E-mail</label>
                                    <div className="auth-input-wrap">
                                        <svg className="auth-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="4" width="20" height="16" rx="2" />
                                            <path d="M2 8l10 6 10-6" />
                                        </svg>
                                        <input
                                            id="forgot-email"
                                            type="email"
                                            className="auth-input"
                                            placeholder="seu@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="auth-btn-primary"
                                    disabled={status === 'sending'}
                                >
                                    {status === 'sending' ? (
                                        <>
                                            <span className="auth-spinner" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            Enviar link de recuperação
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M5 12h14M12 5l7 7-7 7" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </form>

                            <p className="auth-switch">
                                Lembrou da senha?{' '}
                                <Link to="/login" className="auth-switch-link">Fazer login</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
