import { X, Zap, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { t, type Locale, translations } from '../i18n/translations'

type LimitType = 'clients' | 'transactions' | 'generic' | 'ai'

interface UpgradeCardProps {
    limitType: LimitType
    limit?: number
    locale: Locale
    onDismiss: () => void
}

export default function UpgradeCard({ limitType, limit, locale, onDismiss }: UpgradeCardProps) {
    const navigate = useNavigate()
    const upgradeCopy = translations[locale].upgrade

    const titleKeyMap: Record<LimitType, keyof typeof translations['pt-BR']['upgrade']> = {
        clients: 'clientsTitle',
        transactions: 'transactionsTitle',
        generic: 'genericTitle',
        ai: 'aiTitle',
    }

    const title = t(locale, 'upgrade', titleKeyMap[limitType])
    const body = t(locale, 'upgrade', limitType as 'clients' | 'transactions' | 'generic' | 'ai').replace(
        '{limit}',
        String(limit || '')
    )
    const ctaText = t(locale, 'upgrade', 'cta')
    const dismissText = t(locale, 'upgrade', 'dismiss')

    return (
        <>
            {/* Overlay semitransparente */}
            <div
                onClick={onDismiss}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(3px)',
                    zIndex: 998,
                    animation: 'fadeIn 0.2s ease',
                }}
            />

            {/* Card central */}
            <div
                style={{
                    position: 'fixed',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'min(480px, 92vw)',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
                    zIndex: 999,
                    overflow: 'hidden',
                    animation: 'slideUp 0.25s ease',
                }}
            >
                {/* Faixa decorativa superior */}
                <div style={{
                    height: 5,
                    background: 'linear-gradient(90deg, var(--brand-navy), var(--brand-green))',
                }} />

                {/* Conteúdo */}
                <div style={{ padding: '32px 32px 28px' }}>
                    {/* Botão de fechar */}
                    <button
                        onClick={onDismiss}
                        style={{
                            position: 'absolute', top: 20, right: 20,
                            background: 'var(--hover)', border: 'none',
                            borderRadius: 8, padding: 6, cursor: 'pointer',
                            color: 'var(--text-3)', display: 'flex',
                        }}
                    >
                        <X size={16} />
                    </button>

                    {/* Ícone */}
                    <div style={{
                        width: 56, height: 56, borderRadius: 16,
                        background: 'linear-gradient(135deg, var(--brand-navy), #3d3278)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 20, boxShadow: '0 8px 24px rgba(46,41,78,0.3)',
                    }}>
                        <Zap size={28} color="white" fill="white" />
                    </div>

                    {/* Título */}
                    <h3 style={{
                        fontSize: 20, fontWeight: 800,
                        color: 'var(--text)', marginBottom: 10,
                    }}>
                        {title}
                    </h3>

                    {/* Mensagem */}
                    <p style={{
                        fontSize: 14, color: 'var(--text-2)',
                        lineHeight: 1.6, marginBottom: 8,
                    }}>
                        {body}
                    </p>
                    <p style={{
                        fontSize: 14, color: 'var(--text-2)',
                        lineHeight: 1.6, marginBottom: 28,
                    }}>
                        {upgradeCopy.proMessage}
                    </p>

                    {/* Benefícios rápidos */}
                    <div style={{
                        background: 'var(--hover)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '14px 18px',
                        marginBottom: 24,
                        display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                        {upgradeCopy.benefits.map((item, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)' }}>
                                <div style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: 'var(--brand-green)', flexShrink: 0,
                                }} />
                                {item}
                            </div>
                        ))}
                    </div>

                    {/* Preço */}
                    <div style={{
                        textAlign: 'center',
                        marginBottom: 20,
                        padding: '10px 0',
                        borderTop: '1px solid var(--border)',
                        borderBottom: '1px solid var(--border)',
                    }}>
                        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                            {upgradeCopy.startingAt}{' '}
                        </span>
                        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>
                            {upgradeCopy.price}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--text-3)' }}>{upgradeCopy.period}</span>
                    </div>

                    {/* Botões */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <button
                            onClick={() => { onDismiss(); navigate('/assinatura') }}
                            style={{
                                width: '100%', padding: '14px 24px',
                                background: 'var(--brand-green)',
                                color: 'white', border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: 700, fontSize: 15,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', gap: 8,
                                transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                        >
                            {ctaText}
                            <ArrowRight size={16} />
                        </button>
                        <button
                            onClick={onDismiss}
                            style={{
                                width: '100%', padding: '11px 24px',
                                background: 'transparent', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', color: 'var(--text-3)',
                                fontSize: 14, cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            {dismissText}
                        </button>
                    </div>
                </div>
            </div>
        </>
    )
}
