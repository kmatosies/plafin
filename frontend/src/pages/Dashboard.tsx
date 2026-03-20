/**
 * Dashboard.tsx
 *
 * Integrado ao endpoint GET /api/dashboard/?month=M&year=Y
 * Dados reais: resumo financeiro, agendamentos de hoje,
 *              alertas de vencimento, tendência semanal.
 *
 * 🛠 DEBUG: O api.ts imprime cada chamada no console do navegador (DevTools).
 *   Se este componente não carregar, abra Console → procure por "[API] ❌"
 *   para ver exatamente qual endpoint falhou e por quê.
 */

import { useState, useEffect, useCallback } from 'react'
import {
    Plus, TrendingUp, TrendingDown, Wallet, AlertTriangle,
    ArrowRight, Sparkles, Calendar, Users, Loader2, RefreshCw,
    CheckCircle, Clock
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../lib/api'

// ─── Tipos da resposta do backend ────────────────────────────────────────────

interface FinancialSummary {
    total_revenue: number
    total_expenses: number
    net_profit: number
    pending_total: number
    transaction_count: number
}

interface WeeklyPoint {
    week: string
    revenue: number
    expenses: number
}

interface AppointmentToday {
    id: string
    client_name?: string
    start_time: string
    end_time: string
    status: string
    value?: number
}

interface AlertItem {
    id: string
    description: string
    amount: number
    date: string
    type: string
}

interface DashboardData {
    financial_summary: FinancialSummary
    weekly_trend: WeeklyPoint[]
    latest_transactions: Array<{
        id: string
        description: string
        amount: number
        type: string
        status: string
        date: string
    }>
    active_clients: number
    appointments_today: AppointmentToday[]
    upcoming_alerts: AlertItem[]
}

// ─── Mini Sparkline SVG ────────────────────────────────────────────────────────

function Sparkline({ color, data }: { color: string; data: number[] }) {
    if (!data || data.length < 2) return null
    const w = 200; const h = 64
    const min = Math.min(...data), max = Math.max(...data)
    const range = max - min || 1
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w
        const y = h - ((v - min) / range) * h * 0.85 - 4
        return `${x},${y}`
    }).join(' ')
    const pathD = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w
        const y = h - ((v - min) / range) * h * 0.85 - 4
        return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ')
    const areaD = pathD + ` L${w},${h} L0,${h} Z`
    const gradId = `grad-${color.replace(/[^a-z0-9]/gi, '')}`

    return (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#${gradId})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value: number) {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function statusColor(status: string) {
    if (status === 'confirmado' || status === 'pago') return { bg: '#D1FAE5', color: '#065F46' }
    if (status === 'pendente') return { bg: '#FEF3C7', color: '#92400E' }
    return { bg: '#FEE2E2', color: '#991B1B' }
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function Dashboard() {
    const { user } = useAuth()
    const now = new Date()
    const [month] = useState(now.getMonth() + 1)
    const [year] = useState(now.getFullYear())

    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchDashboard = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            // 🛠 DEBUG: esta chamada aparece como "[API] ✅ GET /api/dashboard/..." no Console
            const result = await api.get<DashboardData>(
                `/api/dashboard/?month=${month}&year=${year}`
            )
            setData(result)
            // 🛠 DEBUG: inspecione os dados retornados pelo backend:
            if (import.meta.env.DEV) {
                console.debug('[Dashboard] Dados recebidos:', result)
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Erro ao carregar dashboard'
            setError(msg)
            // 🛠 DEBUG: o api.ts já loga detalhes do erro — aqui só guardamos no state
        } finally {
            setLoading(false)
        }
    }, [month, year])

    useEffect(() => { fetchDashboard() }, [fetchDashboard])

    // Dados financeiros com fallback zero
    const summary = data?.financial_summary
    const revenue = summary?.total_revenue ?? 0
    const expenses = summary?.total_expenses ?? 0
    const netProfit = summary?.net_profit ?? 0
    const pending = summary?.pending_total ?? 0

    // Tendência semanal para sparklines
    const weeklyRevenue = data?.weekly_trend?.map(w => w.revenue) ?? [0, 0, 0, 0]
    const weeklyExpenses = data?.weekly_trend?.map(w => w.expenses) ?? [0, 0, 0, 0]
    const weeklyNet = data?.weekly_trend?.map(w => w.revenue - w.expenses) ?? [0, 0, 0, 0]

    const firstName = user?.full_name?.split(' ')[0] ?? 'Usuário'

    // ── Loading ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 16 }}>
                <Loader2 size={36} style={{ color: 'var(--brand-navy, #1E3A8A)', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: 14, color: 'var(--text-2)', fontWeight: 500 }}>Carregando dashboard...</p>
            </div>
        )
    }

    // ── Erro ─────────────────────────────────────────────────────────────────
    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 360, gap: 16 }}>
                <AlertTriangle size={40} style={{ color: '#EF4444', opacity: 0.7 }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Falha ao carregar dados</p>
                <p style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 360, textAlign: 'center' }}>{error}</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>
                    💡 Dica: abra o DevTools (F12) → Console e procure por <code>[API]</code> para ver o erro detalhado.
                </p>
                <button onClick={fetchDashboard} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <RefreshCw size={14} /> Tentar Novamente
                </button>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }} className="fade-in">

            {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.6px', marginBottom: 4 }}>
                        Olá, {firstName} 👋
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                        Resumo de {now.toLocaleString('pt-BR', { month: 'long' })} de {year}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={fetchDashboard} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <RefreshCw size={14} /> Atualizar
                    </button>
                    <button className="btn btn-primary">
                        <Plus size={16} /> Novo Lançamento
                    </button>
                </div>
            </div>

            {/* ── KPI Cards com Sparkline ────────────────────────────────────── */}
            <div className="kpi-grid" style={{ marginBottom: 28 }}>
                {/* Receitas */}
                <KpiCard
                    label="Receitas"
                    value={`R$ ${fmt(revenue)}`}
                    trend={null}
                    icon={<TrendingUp size={16} />}
                    iconBg="var(--success-soft)"
                    iconColor="var(--success)"
                    sparkData={weeklyRevenue}
                    sparkColor="var(--success)"
                />
                {/* Despesas */}
                <KpiCard
                    label="Despesas"
                    value={`R$ ${fmt(expenses)}`}
                    trend={null}
                    icon={<TrendingDown size={16} />}
                    iconBg="var(--danger-soft)"
                    iconColor="var(--danger)"
                    sparkData={weeklyExpenses}
                    sparkColor="var(--danger)"
                />
                {/* Saldo Líquido */}
                <KpiCard
                    label="Saldo Líquido"
                    value={`R$ ${fmt(netProfit)}`}
                    trend={netProfit >= 0 ? 'positive' : 'negative'}
                    icon={<Wallet size={16} />}
                    iconBg="var(--primary-soft)"
                    iconColor="var(--primary)"
                    sparkData={weeklyNet}
                    sparkColor={netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}
                />
            </div>

            {/* ── Segunda linha: stats rápidas ──────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
                <QuickStat icon={<Users size={16} />} label="Clientes Ativos" value={String(data?.active_clients ?? 0)} color="#6366F1" bg="#EEF2FF" />
                <QuickStat icon={<Calendar size={16} />} label="Agendamentos Hoje" value={String(data?.appointments_today?.length ?? 0)} color="#F59E0B" bg="#FFFBEB" />
                <QuickStat icon={<AlertTriangle size={16} />} label="Alertas Pendentes" value={String(data?.upcoming_alerts?.length ?? 0)} color="#EF4444" bg="#FEF2F2" />
            </div>

            {/* ── Linha principal: transações + agendamentos ────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>

                {/* Últimas transações */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Últimas Transações</h2>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{summary?.transaction_count ?? 0} este mês</span>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                        {data?.latest_transactions?.length ? data.latest_transactions.map(tx => (
                            <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ width: 34, height: 34, borderRadius: 9, background: tx.type === 'receita' ? '#D1FAE5' : '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {tx.type === 'receita'
                                        ? <TrendingUp size={14} color="#065F46" />
                                        : <TrendingDown size={14} color="#991B1B" />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{new Date(tx.date).toLocaleDateString('pt-BR')}</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: tx.type === 'receita' ? '#10B981' : '#EF4444' }}>
                                        {tx.type === 'receita' ? '+' : '-'}R$ {fmt(tx.amount)}
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 9999, ...statusColor(tx.status) }}>
                                        {tx.status}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                                Nenhuma transação neste mês.
                            </div>
                        )}
                    </div>
                </div>

                {/* Agendamentos de hoje */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Agenda de Hoje</h2>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
                            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
                        </span>
                    </div>
                    <div style={{ padding: '8px 0' }}>
                        {data?.appointments_today?.length ? data.appointments_today.map(apt => (
                            <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Clock size={14} color="#6366F1" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{apt.client_name ?? 'Cliente'}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{apt.start_time} – {apt.end_time}</div>
                                </div>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9999, ...statusColor(apt.status) }}>
                                    {apt.status}
                                </span>
                            </div>
                        )) : (
                            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                                <CheckCircle size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                                Sem agendamentos hoje.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Alertas de vencimento + AI Insights ──────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: pending > 0 ? '1fr 1fr' : '1fr', gap: 18 }}>

                {/* Alertas (só exibe se houver) */}
                {(data?.upcoming_alerts?.length ?? 0) > 0 && (
                    <div className="card" style={{ padding: 0, overflow: 'hidden', borderColor: '#FDE68A' }}>
                        <div style={{ height: 4, background: '#F59E0B' }} />
                        <div style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <AlertTriangle size={16} color="#F59E0B" />
                                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#92400E', margin: 0 }}>Vencimentos Próximos (7 dias)</h3>
                            </div>
                            {(data?.upcoming_alerts ?? []).map(alert => (
                                <div key={alert.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #FDE68A', fontSize: 13 }}>
                                    <span style={{ color: '#78350F', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{alert.description}</span>
                                    <span style={{ fontWeight: 700, color: '#B45309', flexShrink: 0 }}>R$ {fmt(alert.amount)}</span>
                                </div>
                            ))}
                            <div style={{ marginTop: 10, fontSize: 12, color: '#92400E' }}>
                                Total pendente: <strong>R$ {fmt(pending)}</strong>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Insights */}
                <div className="card" style={{ overflow: 'hidden', borderColor: 'var(--brand-green)' }}>
                    <div style={{ height: 4, background: 'var(--brand-green)' }} />
                    <div style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{ background: 'var(--accent-soft)', padding: 8, borderRadius: 8, display: 'flex', color: 'var(--brand-green)' }}>
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>Plafin AI Insights</h2>
                                <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Recomendações baseadas nos dados do mês.</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
                                <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                                    Situação do Caixa
                                </h3>
                                <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                                    {netProfit >= 0
                                        ? <><strong style={{ color: 'var(--success)' }}>Saldo Positivo </strong> — Receitas estão cobrindo as despesas. Saldo líquido de <strong>R$ {fmt(netProfit)}</strong>.</>
                                        : <><strong style={{ color: 'var(--danger)' }}>Atenção! </strong> — Despesas superam as receitas. Déficit de <strong>R$ {fmt(Math.abs(netProfit))}</strong> neste mês.</>
                                    }
                                </p>
                            </div>
                            {pending > 0 && (
                                <div style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning)', borderRadius: 10, padding: '14px 16px' }}>
                                    <h3 style={{ fontSize: 11, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <AlertTriangle size={13} /> Oportunidade
                                    </h3>
                                    <p style={{ fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
                                        Você possui <strong>R$ {fmt(pending)}</strong> em contas pendentes. Enviar lembretes pode aumentar seu fluxo de caixa.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary" style={{ fontSize: 13 }}>
                                Agir Agora <ArrowRight size={14} />
                            </button>
                            <button className="btn btn-outline" style={{ fontSize: 13 }}>
                                Ver Análise Completa
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, trend, icon, iconBg, iconColor, sparkData, sparkColor }: {
    label: string; value: string; trend: 'positive' | 'negative' | null
    icon: React.ReactNode; iconBg: string; iconColor: string
    sparkData: number[]; sparkColor: string
}) {
    return (
        <div className="card" style={{ height: 180, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24 }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
                    <div style={{ padding: '4px 6px', background: iconBg, color: iconColor, borderRadius: 6 }}>{icon}</div>
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>{value}</p>
                {trend && (
                    <p style={{ fontSize: 12, color: trend === 'positive' ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {trend === 'positive' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {trend === 'positive' ? 'Positivo' : 'Negativo'}{' '}
                        <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>este mês</span>
                    </p>
                )}
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, opacity: 0.6 }}>
                <Sparkline color={sparkColor} data={sparkData} />
            </div>
        </div>
    )
}

function QuickStat({ icon, label, value, color, bg }: { icon: React.ReactNode; label: string; value: string; color: string; bg: string }) {
    return (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2 }}>{value}</div>
            </div>
        </div>
    )
}
