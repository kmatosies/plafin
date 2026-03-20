import { X, FileText, Shield } from 'lucide-react'
import type { Locale } from '../i18n/translations'

interface LegalModalProps {
    type: 'terms' | 'privacy'
    locale: Locale
    onClose: () => void
}

const TERMS_CONTENT = {
    title: { 'pt-BR': 'Termos de Uso', 'en-US': 'Terms of Use' },
    body: {
        'pt-BR': `
**Última atualização: 16 de março de 2026**

Bem-vindo ao Plafin! Ao utilizar nossos serviços, você concorda com os seguintes termos:

**1. Aceitação dos Termos**
Ao acessar ou usar o Plafin, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis.

**2. Descrição do Serviço**
O Plafin é uma plataforma SaaS para gestão financeira e agenda, oferecendo diferentes planos (Free e Pro) com variadas capacidades de armazenamento e funcionalidades de IA.

**3. Contas de Usuário**
Você é responsável por manter a confidencialidade de sua conta e senha. Notifique-nos imediatamente sobre qualquer uso não autorizado da sua conta.

**4. Plano Free**
O plano gratuito inclui até 20 clientes e 20 transações por mês. Ao atingir os limites, será necessário fazer upgrade para o plano Pro para continuar usando todas as funcionalidades.

**5. Assinaturas e Pagamentos**
As assinaturas são processadas com segurança via Stripe. O cancelamento pode ser feito a qualquer momento através do portal do cliente, sem taxas de cancelamento.

**6. Propriedade Intelectual**
Todo o conteúdo e software do Plafin são de propriedade exclusiva da Plafin ou de seus licenciadores.

**7. Limitação de Responsabilidade**
O Plafin não será responsável por quaisquer danos indiretos, incidentais ou consequentes resultantes do uso do sistema.

**8. Alterações nos Termos**
Reservamo-nos o direito de modificar estes termos a qualquer momento. O uso continuado da plataforma após alterações constitui aceitação dos novos termos.

**9. Contato**
Para dúvidas sobre estes termos, entre em contato conosco através do suporte.
    `,
        'en-US': `
**Last updated: March 16, 2026**

Welcome to Plafin! By using our services, you agree to the following terms:

**1. Acceptance of Terms**
By accessing or using Plafin, you agree to comply with these Terms of Use and all applicable laws and regulations.

**2. Service Description**
Plafin is a SaaS platform for financial management and scheduling, offering different plans (Free and Pro) with varying storage capacities and AI features.

**3. User Accounts**
You are responsible for maintaining the confidentiality of your account and password. Notify us immediately of any unauthorized use of your account.

**4. Free Plan**
The free plan includes up to 20 clients and 20 transactions per month. When limits are reached, an upgrade to the Pro plan is required.

**5. Subscriptions and Payments**
Subscriptions are securely processed via Stripe. Cancellation can be done at any time through the customer portal, with no cancellation fees.

**6. Intellectual Property**
All content and software of Plafin are the exclusive property of Plafin or its licensors.

**7. Limitation of Liability**
Plafin shall not be liable for any indirect, incidental, or consequential damages resulting from the use of the system.

**8. Changes to Terms**
We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.

**9. Contact**
For questions about these terms, please contact us through our support.
    `,
    },
}

const PRIVACY_CONTENT = {
    title: { 'pt-BR': 'Política de Privacidade', 'en-US': 'Privacy Policy' },
    body: {
        'pt-BR': `
**Última atualização: 16 de março de 2026**

Sua privacidade é importante para nós. Esta política explica como coletamos e usamos seus dados.

**1. Dados Coletados**
Coletamos: nome, e-mail, telefone, dados financeiros inseridos por você, e dados de uso da plataforma.

**2. Uso dos Dados**
Usamos seus dados para:
- Fornecer e manter o serviço Plafin
- Processar pagamentos via Stripe (de forma segura, não armazenamos dados de cartão)
- Gerar insights financeiros com IA (Gemini API)
- Melhorar a experiência do usuário

**3. Compartilhamento**
Não vendemos seus dados. Compartilhamos somente com:
- Stripe (processamento de pagamentos)
- Supabase (hospedagem segura de dados)
- Google (IA, somente dados anonimizados)

**4. Segurança**
Seus dados são protegidos por criptografia em trânsito (HTTPS) e em repouso. Utilizamos tokens de autenticação seguros (JWT) com expiração automática.

**5. Seus Direitos**
Você tem direito a:
- Acessar seus dados pessoais
- Solicitar correção ou exclusão
- Exportar seus dados
- Revogar seu consentimento a qualquer momento

**6. Retenção de Dados**
Mantemos seus dados enquanto sua conta estiver ativa. Após exclusão da conta, os dados são removidos em até 30 dias.

**7. Cookies**
Utilizamos cookies essenciais para manter sua sessão ativa. Não utilizamos cookies de rastreamento de terceiros.

**8. Contato**
Para exercer seus direitos ou tirar dúvidas, entre em contato com nossa equipe de privacidade.
    `,
        'en-US': `
**Last updated: March 16, 2026**

Your privacy is important to us. This policy explains how we collect and use your data.

**1. Data Collected**
We collect: name, email, phone, financial data you input, and platform usage data.

**2. Use of Data**
We use your data to:
- Provide and maintain the Plafin service
- Process payments via Stripe (securely, we never store card data)
- Generate financial insights with AI (Gemini API)
- Improve user experience

**3. Sharing**
We do not sell your data. We share only with:
- Stripe (payment processing)
- Supabase (secure data hosting)
- Google (AI, only anonymized data)

**4. Security**
Your data is protected by in-transit (HTTPS) and at-rest encryption. We use secure JWT tokens with automatic expiration.

**5. Your Rights**
You have the right to:
- Access your personal data
- Request correction or deletion
- Export your data
- Revoke consent at any time

**6. Data Retention**
We keep your data while your account is active. After account deletion, data is removed within 30 days.

**7. Cookies**
We use essential cookies to maintain your session. We do not use third-party tracking cookies.

**8. Contact**
To exercise your rights or ask questions, contact our privacy team.
    `,
    },
}

export default function LegalModal({ type, locale, onClose }: LegalModalProps) {
    const content = type === 'terms' ? TERMS_CONTENT : PRIVACY_CONTENT
    const title = content.title[locale]
    const body = content.body[locale]
    const Icon = type === 'terms' ? FileText : Shield

    const renderBody = (text: string) => {
        return text
            .trim()
            .split('\n')
            .map((line, i) => {
                if (!line.trim()) return <br key={i} />

                if (line.startsWith('**') && line.endsWith('**')) {
                    return (
                        <p key={i} style={{ fontWeight: 700, color: 'var(--text)', margin: '20px 0 6px' }}>
                            {line.replace(/\*\*/g, '')}
                        </p>
                    )
                }

                const parts = line.split(/\*\*(.*?)\*\*/g)
                return (
                    <p key={i} style={{ margin: '4px 0', color: 'var(--text-2)', lineHeight: 1.7, fontSize: 14 }}>
                        {parts.map((part, j) =>
                            j % 2 === 1 ? <strong key={j} style={{ color: 'var(--text)' }}>{part}</strong> : part
                        )}
                    </p>
                )
            })
    }

    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 999,
                    animation: 'fadeIn 0.2s ease',
                }}
            />

            <div
                style={{
                    position: 'fixed',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'min(680px, 95vw)',
                    maxHeight: '80vh',
                    background: 'var(--surface)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'slideUp 0.25s ease',
                    overflow: 'hidden',
                }}
            >
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '24px 28px',
                    borderBottom: '1px solid var(--border)',
                    flexShrink: 0,
                }}>
                    <div style={{
                        padding: 10, borderRadius: 10,
                        background: 'var(--accent-soft)',
                        color: 'var(--brand-green)',
                        display: 'flex',
                    }}>
                        <Icon size={20} />
                    </div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{
                            marginLeft: 'auto',
                            background: 'var(--hover)', border: 'none',
                            borderRadius: 8, padding: 8, cursor: 'pointer',
                            color: 'var(--text-3)', display: 'flex',
                            transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--hover)')}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div style={{
                    overflowY: 'auto',
                    padding: '24px 28px',
                    flex: 1,
                }}>
                    {renderBody(body)}
                </div>

                <div style={{
                    padding: '16px 28px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    flexShrink: 0,
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 24px',
                            background: 'var(--brand-green)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: 14,
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                        {locale === 'pt-BR' ? 'Fechar' : 'Close'}
                    </button>
                </div>
            </div>
        </>
    )
}
