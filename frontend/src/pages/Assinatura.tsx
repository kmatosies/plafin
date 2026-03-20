import { useState } from 'react'
import { Check, Zap, Star, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from '../i18n/useTranslation'
import { subscriptionApi } from '../lib/api'

export default function Assinatura() {
    const { user, subscription, refreshSubscription, locale, setLocale } = useAuth()
    const { t } = useTranslation(locale)
    const isBR = locale === 'pt-BR'

    // Normaliza starter para free visualmente (já que deixaremos de usar o starter)
    const currentPlan = subscription?.plan ?? (user?.plan === 'pro' ? 'pro' : 'free')
    const [currency, setCurrency] = useState<'BRL' | 'USD'>(isBR ? 'BRL' : 'USD')
    const [isCheckingOut, setIsCheckingOut] = useState(false)
    const [isOpeningPortal, setIsOpeningPortal] = useState(false)

    // Textos do plano a partir das traduções
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plansInfo = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        free: t('plans', 'free') as any, // casting to any here since typescript signature returns string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        pro: t('plans', 'pro') as any,
    }

    const proPrice = currency === 'BRL' ? 'R$ 79,90' : 'US$ 19,90'

    const handleCheckout = async () => {
        setIsCheckingOut(true)
        try {
            const res = await subscriptionApi.createCheckout('pro', 'monthly')
            if (res.checkout_url) {
                window.location.href = res.checkout_url
            }
        } catch (err: unknown) {
            const error = err as Error
            alert(error.message || (isBR ? 'Erro ao iniciar checkout' : 'Error starting checkout'))
        } finally {
            setIsCheckingOut(false)
        }
    }

    const handlePortal = async () => {
        setIsOpeningPortal(true)
        try {
            const res = await subscriptionApi.createPortal()
            if (res.portal_url) {
                window.location.href = res.portal_url
            }
        } catch (err: unknown) {
            const error = err as Error
            alert(error.message || (isBR ? 'Erro ao abrir portal' : 'Error opening portal'))
        } finally {
            setIsOpeningPortal(false)
        }
    }

    const cardStyle = (highlight: boolean): React.CSSProperties => ({
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: `2px solid ${highlight ? 'var(--brand-green)' : 'var(--border)'}`,
        padding: '36px 32px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: highlight
            ? '0 16px 40px rgba(16, 185, 129, 0.15)'
            : 'var(--shadow-sm)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    })

    return (
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 40, textAlign: 'center' }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--brand-navy)', marginBottom: 8 }}>
                    {t('plans', 'title')}
                </h1>
                <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 24 }}>
                    {t('plans', 'subtitle')}
                </p>
                {subscription && (
                    <p style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 20 }}>
                        {isBR
                            ? `Plano atual: ${subscription.plan.toUpperCase()} • Status: ${subscription.subscription_status}`
                            : `Current plan: ${subscription.plan.toUpperCase()} • Status: ${subscription.subscription_status}`}
                    </p>
                )}

                {/* Seletor de Moeda */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'var(--hover)',
                    padding: '8px 16px',
                    borderRadius: 99,
                    fontSize: 14,
                }}>
                    <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>
                        {t('plans', 'currencyLabel')}
                    </span>
                    {(['BRL', 'USD'] as const).map(c => (
                        <button
                            key={c}
                            onClick={() => {
                                setCurrency(c)
                                if (c === 'USD' && locale !== 'en-US') setLocale('en-US')
                                if (c === 'BRL' && locale !== 'pt-BR') setLocale('pt-BR')
                            }}
                            style={{
                                padding: '4px 14px',
                                borderRadius: 99,
                                border: 'none',
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: 'pointer',
                                background: currency === c ? 'var(--brand-green)' : 'transparent',
                                color: currency === c ? 'white' : 'var(--text-3)',
                                transition: 'all 0.2s',
                            }}
                        >
                            {c === 'BRL' ? '🇧🇷 BRL' : '🇺🇸 USD'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cards dos Planos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 28 }}>

                {/* Plano Free */}
                <div style={cardStyle(false)}>
                    {currentPlan === 'free' && (
                        <div style={{
                            position: 'absolute', top: -14, left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'var(--hover)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-3)',
                            padding: '4px 16px', borderRadius: 99,
                            fontSize: 11, fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: 0.8,
                            whiteSpace: 'nowrap',
                        }}>
                            {t('plans', 'currentPlan').toUpperCase()}
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ padding: 10, borderRadius: 12, background: 'var(--hover)', color: 'var(--text-3)' }}>
                            <Star size={22} />
                        </div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{plansInfo.free.name}</h3>
                    </div>

                    <div style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 38, fontWeight: 900, color: 'var(--text)' }}>
                            {currency === 'BRL' ? 'R$ 0' : 'US$ 0'}
                        </span>
                        <span style={{ color: 'var(--text-3)', fontSize: 15, fontWeight: 500 }}>
                            {plansInfo.free.period}
                        </span>
                    </div>

                    <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                        {plansInfo.free.description}
                    </p>

                    <button
                        disabled
                        style={{
                            width: '100%', padding: '13px 24px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--hover)',
                            color: 'var(--text-3)',
                            fontWeight: 700, fontSize: 14,
                            border: 'none', cursor: 'not-allowed',
                            marginBottom: 28,
                        }}
                    >
                        {plansInfo.free.buttonText}
                    </button>

                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {isBR ? 'Incluso' : 'Included'}
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {plansInfo.free.features.map((f: string, i: number) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text-2)' }}>
                                <Check size={16} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 2 }} />
                                <span>{f}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Plano Pro */}
                <div
                    style={cardStyle(true)}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
                            ; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 24px 60px rgba(16,185,129,0.22)'
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
                            ; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(16, 185, 129, 0.15)'
                    }}
                >
                    {/* Badge Mais Popular */}
                    <div style={{
                        position: 'absolute', top: -14, left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(90deg, var(--brand-navy), var(--brand-green))',
                        color: 'white',
                        padding: '5px 18px', borderRadius: 99,
                        fontSize: 11, fontWeight: 800,
                        textTransform: 'uppercase', letterSpacing: 1,
                        whiteSpace: 'nowrap',
                    }}>
                        {plansInfo.pro.popular}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                        <div style={{ padding: 10, borderRadius: 12, background: 'var(--accent-soft)', color: 'var(--brand-green)' }}>
                            <Zap size={22} />
                        </div>
                        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{plansInfo.pro.name}</h3>
                    </div>

                    <div style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 38, fontWeight: 900, color: 'var(--text)' }}>
                            {proPrice}
                        </span>
                        <span style={{ color: 'var(--text-3)', fontSize: 15, fontWeight: 500 }}>
                            {plansInfo.pro.period}
                        </span>
                    </div>

                    <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                        {plansInfo.pro.description}
                    </p>

                    <button
                        onClick={currentPlan === 'pro' ? handlePortal : handleCheckout}
                        disabled={isCheckingOut || isOpeningPortal}
                        style={{
                            width: '100%', padding: '13px 24px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--brand-green)',
                            color: 'white',
                            fontWeight: 700, fontSize: 15,
                            border: 'none',
                            cursor: (isCheckingOut || isOpeningPortal) ? 'not-allowed' : 'pointer',
                            marginBottom: 28,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'opacity 0.2s',
                            opacity: (isCheckingOut || isOpeningPortal) ? 0.7 : 1,
                        }}
                    >
                        {isCheckingOut
                            ? (isBR ? 'Redirecionando...' : 'Redirecting...')
                            : isOpeningPortal
                                ? (isBR ? 'Abrindo portal...' : 'Opening portal...')
                            : currentPlan === 'pro'
                                ? (isBR ? 'Gerenciar Assinatura' : 'Manage Subscription')
                                : plansInfo.pro.buttonText
                        }
                        {!(isCheckingOut || isOpeningPortal) && <ChevronRight size={16} />}
                    </button>

                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        {isBR ? 'Tudo isso incluso' : 'Everything included'}
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {plansInfo.pro.features.map((f: string, i: number) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text-2)' }}>
                                <Check size={16} color="var(--brand-green)" style={{ flexShrink: 0, marginTop: 2 }} />
                                <span>{f}</span>
                            </li>
                        ))}
                    </ul>
                    <div style={{
                        marginTop: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        background: 'linear-gradient(135deg, rgba(37,211,102,0.12), rgba(37,211,102,0.05))',
                        border: '1px solid rgba(37,211,102,0.35)',
                        borderRadius: 10,
                        padding: '10px 14px',
                    }}>
                        <span style={{ fontSize: 20 }}>{'\U0001f916'}</span>
                        <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#25D366', margin: 0 }}>
                                {t('plans', 'whatsappExclusiveTitle')}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                                {t('plans', 'whatsappExclusiveSubtitle')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Nota de cancelamento */}
            <p style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, marginTop: 32 }}>
                {isBR
                    ? '🔒 Pagamento seguro via Stripe. Cancele quando quiser, sem multas.'
                    : '🔒 Secure payment via Stripe. Cancel anytime, no fees.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                <button className="btn btn-outline" onClick={() => void refreshSubscription()}>
                    {isBR ? 'Atualizar status do plano' : 'Refresh plan status'}
                </button>
            </div>
        </div>
    )
}
