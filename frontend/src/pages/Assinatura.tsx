import { useState } from 'react'
import { Check, Star, Zap, Shield } from 'lucide-react'

export default function Assinatura() {
    const [currentPlan] = useState('Starter')

    const plans = [
        {
            name: 'Free',
            price: 'R$ 0',
            period: '/mês',
            description: 'Para quem está começando e precisa do básico.',
            features: ['Até 50 clientes', 'Agenda básica', 'Controle financeiro simples'],
            icon: Star,
            buttonText: 'Plano Atual',
            disabled: currentPlan === 'Free'
        },
        {
            name: 'Starter',
            price: 'R$ 49,90',
            period: '/mês',
            description: 'Ideal para profissionais independentes em crescimento.',
            features: ['Clientes ilimitados', 'Agenda completa com lembretes', 'Relatórios financeiros avançados', 'Suporte por email'],
            icon: Zap,
            buttonText: currentPlan === 'Starter' ? 'Plano Atual' : 'Assinar Starter',
            disabled: currentPlan === 'Starter',
            highlight: true
        },
        {
            name: 'Pro',
            price: 'R$ 99,90',
            period: '/mês',
            description: 'Para clínicas e equipes que precisam de mais poder.',
            features: ['Tudo do plano Starter', 'Multi-usuários (até 5)', 'Integração com WhatsApp', 'Suporte prioritário 24/7'],
            icon: Shield,
            buttonText: currentPlan === 'Pro' ? 'Plano Atual' : 'Assinar Pro',
            disabled: currentPlan === 'Pro'
        }
    ]

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ marginBottom: 40, textAlign: 'center' }}>
                <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand-navy)', marginBottom: 8 }}>Planos e Assinatura</h1>
                <p style={{ color: 'var(--text-2)', fontSize: 15 }}>Gerencie o plano da sua clínica e libere novas funcionalidades.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        style={{
                            background: 'var(--surface)',
                            borderRadius: 'var(--radius-lg)',
                            border: `2px solid ${plan.highlight ? 'var(--brand-green)' : 'var(--border)'}`,
                            padding: 32,
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: plan.highlight ? '0 8px 24px rgba(16, 185, 129, 0.15)' : 'var(--shadow-sm)'
                        }}
                    >
                        {plan.highlight && (
                            <div style={{
                                position: 'absolute',
                                top: -14,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'var(--brand-green)',
                                color: 'white',
                                padding: '4px 16px',
                                borderRadius: 99,
                                fontSize: 12,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                            }}>
                                Mais Popular
                            </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{
                                padding: 12,
                                borderRadius: 'var(--radius-sm)',
                                background: plan.highlight ? 'var(--accent-soft)' : 'var(--hover)',
                                color: plan.highlight ? 'var(--brand-green)' : 'var(--text-3)'
                            }}>
                                <plan.icon size={24} />
                            </div>
                            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{plan.name}</h3>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text)' }}>{plan.price}</span>
                            <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{plan.period}</span>
                        </div>

                        <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 24, minHeight: 42 }}>
                            {plan.description}
                        </p>

                        <button
                            disabled={plan.disabled}
                            style={{
                                width: '100%',
                                padding: '14px 24px',
                                borderRadius: 'var(--radius-sm)',
                                background: plan.highlight ? 'var(--brand-green)' : (plan.disabled ? 'var(--hover)' : 'white'),
                                color: plan.highlight ? 'white' : (plan.disabled ? 'var(--text-3)' : 'var(--text)'),
                                fontWeight: 700,
                                fontSize: 15,
                                cursor: plan.disabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                border: plan.highlight ? 'none' : (plan.disabled ? 'none' : '1px solid var(--border)'),
                                marginBottom: 32
                            }}
                        >
                            {plan.buttonText}
                        </button>

                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>Funcionalidades</p>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {plan.features.map((feature, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--text-2)' }}>
                                        <Check size={18} color="var(--brand-green)" style={{ flexShrink: 0, marginTop: 2 }} />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
