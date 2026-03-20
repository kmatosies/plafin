import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Wallet, Plus, Filter, DollarSign, ShoppingCart, Layers, X, AlertTriangle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import UpgradeCard from '../components/UpgradeCard'
import AIInsights from '../components/AIInsights'
import { Sparkles } from 'lucide-react'
import { transactionsApi, clientsApi, type Transaction, type TransactionCreate, type FinancialSummary, type Client } from '../lib/api'

// Mini bar chart CSS-based
function MiniBarChart({ color, data }: { color: string; data: number[] }) {
    const max = Math.max(...data, 1)
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 4, alignItems: 'flex-end', height: 48, marginTop: 8 }}>
            {data.map((v, i) => (
                <div key={i} style={{
                    borderRadius: 3,
                    background: i === data.length - 1 ? color : `${color}40`,
                    height: `${Math.max(6, Math.round((Math.max(v, 0) / max) * 100))}%`,
                    transition: 'height 0.3s',
                }} />
            ))}
        </div>
    )
}

// Ícone dinâmico por categoria
function CategoryIcon({ category, type }: { category?: string; type: 'receita' | 'despesa' }) {
    const iconMap: Record<string, React.ElementType> = {
        vendas: DollarSign,
        servicos: DollarSign,
        infra: Layers,
        software: Layers,
        impostos: ShoppingCart,
    }
    const Icon = iconMap[category ?? ''] ?? (type === 'receita' ? TrendingUp : TrendingDown)
    const bgColor = type === 'receita' ? 'var(--success-soft)' : 'var(--hover)'
    const iconColor = type === 'receita' ? 'var(--success)' : 'var(--text-2)'
    return (
        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} color={iconColor} />
        </div>
    )
}

// --- Modal de Nova Transação ---
function TransactionModal({
    onClose,
    onCreated,
    clients,
}: {
    onClose: () => void
    onCreated: () => void
    clients: Client[]
}) {
    const today = new Date().toISOString().split('T')[0]
    const [form, setForm] = useState<TransactionCreate>({
        type: 'despesa',
        description: '',
        amount: 0,
        date: today,
        category: '',
        status: 'pendente',
        payment_method: '',
        client_id: undefined,
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const set = (field: keyof TransactionCreate, value: string | number | undefined) =>
        setForm(prev => ({ ...prev, [field]: value }))

    const handleSubmit = async () => {
        if (!form.description.trim()) { setError('Preencha a descrição.'); return }
        if (!form.amount || form.amount <= 0) { setError('Informe um valor válido.'); return }
        if (!form.date) { setError('Selecione a data.'); return }
        setLoading(true)
        setError(null)
        try {
            await transactionsApi.create({
                ...form,
                category: form.category || undefined,
                payment_method: form.payment_method || undefined,
                client_id: form.client_id || undefined,
            })
            onCreated()
            onClose()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar transação.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: 20
        }} onClick={onClose}>
            <div className="card" style={{
                width: 500, maxWidth: '100%',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>Nova Transação</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>Preencha os dados do lançamento financeiro.</p>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'var(--hover)', border: 'none', width: 32, height: 32,
                        borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'var(--text-2)', cursor: 'pointer'
                    }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {error && (
                        <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600 }}>
                            {error}
                        </div>
                    )}

                    {/* Tipo */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo de Lançamento *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {(['receita', 'despesa'] as const).map(t => (
                                <button key={t} onClick={() => set('type', t)} style={{
                                    padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize',
                                    background: form.type === t ? (t === 'receita' ? 'var(--success-soft)' : 'var(--danger-soft)') : 'var(--bg)',
                                    color: form.type === t ? (t === 'receita' ? 'var(--success)' : 'var(--danger)') : 'var(--text-2)',
                                    border: form.type === t ? `1.5px solid ${t === 'receita' ? 'var(--success)' : 'var(--danger)'}` : '1.5px solid var(--border)',
                                }}>
                                    {t === 'receita' ? 'Receita' : 'Despesa'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Descrição e Valor */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição *</label>
                            <input type="text" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ex: Manutenção Servidor" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor (R$) *</label>
                            <input type="number" min="0" step="0.01" value={form.amount || ''} onChange={e => set('amount', parseFloat(e.target.value) || 0)} placeholder="0,00" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }} />
                        </div>
                    </div>

                    {/* Cliente e Categoria */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cliente</label>
                            <select value={form.client_id ?? ''} onChange={e => set('client_id', e.target.value || undefined)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--bg)' }}>
                                <option value="">Selecione um cliente...</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria</label>
                            <select value={form.category ?? ''} onChange={e => set('category', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--bg)' }}>
                                <option value="">Selecione...</option>
                                <option value="vendas">Vendas / Honorários</option>
                                <option value="infra">Infraestrutura</option>
                                <option value="servicos">Serviços</option>
                                <option value="impostos">Impostos</option>
                                <option value="pessoal">Pessoal</option>
                                <option value="outros">Outros</option>
                            </select>
                        </div>
                    </div>

                    {/* Data e Pagamento */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data de Vencimento *</label>
                            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--bg)' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Método de Pagamento</label>
                            <select value={form.payment_method ?? ''} onChange={e => set('payment_method', e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--bg)' }}>
                                <option value="">Selecione...</option>
                                <option value="pix">PIX</option>
                                <option value="boleto">Boleto</option>
                                <option value="cartao">Cartão de Crédito</option>
                                <option value="dinheiro">Dinheiro</option>
                                <option value="transferencia">Transferência</option>
                            </select>
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                            {(['pendente', 'pago', 'atrasado'] as const).map(s => (
                                <button key={s} onClick={() => set('status', s)} style={{
                                    padding: '9px', borderRadius: 'var(--radius-sm)', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize',
                                    background: form.status === s ? (s === 'pago' ? 'var(--success-soft)' : s === 'atrasado' ? 'var(--danger-soft)' : 'rgba(245, 158, 11, 0.1)') : 'var(--bg)',
                                    color: form.status === s ? (s === 'pago' ? 'var(--success)' : s === 'atrasado' ? 'var(--danger)' : '#92400E') : 'var(--text-2)',
                                    border: form.status === s ? `1.5px solid ${s === 'pago' ? 'var(--success)' : s === 'atrasado' ? 'var(--danger)' : '#F59E0B'}` : '1.5px solid var(--border)',
                                }}>
                                    {s === 'pago' ? 'Pago' : s === 'pendente' ? 'Pendente' : 'Atrasado'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 28px', background: 'var(--bg)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button onClick={onClose} className="btn btn-outline" disabled={loading}>Cancelar</button>
                    <button onClick={handleSubmit} className="btn btn-primary" disabled={loading}>
                        {loading ? 'Salvando...' : 'Salvar Transação'}
                    </button>
                </div>
            </div>
        </div>
    )
}

const FREE_TRANSACTION_LIMIT = 20
const PAGE_SIZE = 10

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function Financeiro() {
    const { upgrade, showUpgrade, hideUpgrade, locale, subscription } = useAuth()
    const [showModal, setShowModal] = useState(false)
    const [showAI, setShowAI] = useState(false)

    // Mês/Ano selecionado
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())

    // Dados
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [summary, setSummary] = useState<FinancialSummary | null>(null)
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [filterType, setFilterType] = useState<'' | 'receita' | 'despesa'>('')
    const [filterStatus, setFilterStatus] = useState('')
    const [showFilter, setShowFilter] = useState(false)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [txs, sum] = await Promise.all([
                transactionsApi.list(month, year, filterType || undefined, filterStatus || undefined),
                transactionsApi.summary(month, year),
            ])
            setTransactions(txs)
            setSummary(sum)
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar dados financeiros.')
        } finally {
            setLoading(false)
        }
    }, [month, year, filterType, filterStatus])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        clientsApi.list().then(setClients).catch(() => { })
    }, [])

    const transactionLimit = subscription?.limits.max_transactions_per_month ?? FREE_TRANSACTION_LIMIT
    const isFreePlan = (subscription?.plan ?? 'free') === 'free'
    const transactionCount = summary?.transaction_count ?? transactions.length
    const atLimit = isFreePlan && transactionLimit !== null && transactionCount >= transactionLimit
    const nearLimit = isFreePlan && transactionLimit !== null && transactionCount >= Math.max(transactionLimit - 4, 0)
    const handleNewTransaction = () => {
        if (atLimit) { showUpgrade('transactions', transactionLimit ?? FREE_TRANSACTION_LIMIT); return }
        setShowModal(true)
    }

    // Paginação local
    const paginated = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const totalPages = Math.ceil(transactions.length / PAGE_SIZE)

    // Navegar meses
    const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1); setPage(1) }
    const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1); setPage(1) }

    // Delete
    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta transação?')) return
        try {
            await transactionsApi.delete(id)
            fetchData()
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Erro ao deletar.')
        }
    }

    const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Modais */}
            {upgrade.visible && <UpgradeCard limitType={upgrade.limitType} limit={upgrade.limit} locale={locale} onDismiss={hideUpgrade} />}
            {showModal && <TransactionModal onClose={() => setShowModal(false)} onCreated={fetchData} clients={clients} />}
            {showAI && <AIInsights onClose={() => setShowAI(false)} />}

            {/* Cabeçalho */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: nearLimit || atLimit ? 16 : 32, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.8px', marginBottom: 4 }}>Financeiro</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Gerencie suas receitas, despesas e fluxo de caixa.</p>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button onClick={() => setShowAI(true)} className="btn btn-outline" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)', borderColor: 'var(--primary-soft)', color: 'var(--primary)', fontWeight: 700 }}>
                        <Sparkles size={16} />
                        Consultor IA
                    </button>
                    <button className="btn btn-outline" onClick={() => setShowFilter(f => !f)}>
                        <Filter size={16} />
                        Filtrar
                    </button>
                    <button onClick={handleNewTransaction} className={`btn ${atLimit ? 'btn-outline' : 'btn-primary'}`} style={atLimit ? { borderColor: '#F59E0B', color: '#92400E', background: '#FFFBEB' } : {}}>
                        <Plus size={16} />
                        {atLimit ? 'Limite Atingido — Upgrade' : 'Nova Transação'}
                    </button>
                </div>
            </div>

            {/* Painel de filtros */}
            {showFilter && (
                <div className="card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</label>
                        <select value={filterType} onChange={e => { setFilterType(e.target.value as '' | 'receita' | 'despesa'); setPage(1) }} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)' }}>
                            <option value="">Todos</option>
                            <option value="receita">Receita</option>
                            <option value="despesa">Despesa</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} style={{ padding: '8px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)' }}>
                            <option value="">Todos</option>
                            <option value="pago">Pago</option>
                            <option value="pendente">Pendente</option>
                            <option value="atrasado">Atrasado</option>
                        </select>
                    </div>
                    <button onClick={() => { setFilterType(''); setFilterStatus('') }} className="btn btn-outline" style={{ alignSelf: 'flex-end', fontSize: 12 }}>Limpar</button>
                </div>
            )}

            {error && (
                <div className="card" style={{ padding: '12px 16px', marginBottom: 20, borderColor: '#fecaca', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#b91c1c' }}>{error}</span>
                    <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} onClick={fetchData}>
                        Tentar novamente
                    </button>
                </div>
            )}

            {/* Banners de limite */}
            {nearLimit && !atLimit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: 13, color: '#92400E', fontWeight: 500 }}>
                    <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
                    <span>Você usou <strong>{transactionCount}/{transactionLimit}</strong> transações este mês (plano Free).{' '}<button onClick={() => showUpgrade('transactions', transactionLimit ?? FREE_TRANSACTION_LIMIT)} style={{ background: 'none', border: 'none', color: '#D97706', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'inherit', fontSize: 13 }}>Faça upgrade para Pro</button> e tenha transações ilimitadas.</span>
                </div>
            )}
            {atLimit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 16px', marginBottom: 24, fontSize: 13, color: '#DC2626', fontWeight: 500 }}>
                    <AlertTriangle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
                    <span>Limite de <strong>{transactionLimit} transações/mês</strong> do plano Free atingido.{' '}<button onClick={() => showUpgrade('transactions', transactionLimit ?? FREE_TRANSACTION_LIMIT)} style={{ background: 'none', border: 'none', color: '#DC2626', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'inherit', fontSize: 13 }}>Assine o Pro</button> para lançamentos ilimitados.</span>
                </div>
            )}

            {/* Navegação de Mês */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <button onClick={prevMonth} className="btn btn-outline" style={{ padding: '6px 10px' }}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', minWidth: 140, textAlign: 'center' }}>{MONTHS[month - 1]} {year}</span>
                <button onClick={nextMonth} className="btn btn-outline" style={{ padding: '6px 10px' }}><ChevronRight size={16} /></button>
            </div>

            {/* 3 KPI Cards */}
            <div className="kpi-grid" style={{ marginBottom: 32 }}>
                {/* Receita */}
                <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 180, border: '1px solid var(--success-soft)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, background: 'var(--success-soft)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingUp size={20} /></div>
                        <span className="badge badge-success">Receitas</span>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Receita Total</p>
                        <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>
                            {loading ? '—' : fmt(summary?.total_revenue ?? 0)}
                        </h3>
                    </div>
                    <MiniBarChart color="var(--success)" data={[20, 40, 30, 60, 80, 50, summary?.total_revenue ?? 0]} />
                </div>

                {/* Despesa */}
                <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 180, border: '1px solid var(--danger-soft)', boxShadow: '0 4px 20px rgba(244, 63, 94, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrendingDown size={20} /></div>
                        <span className="badge badge-danger">Despesas</span>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Despesa Total</p>
                        <h3 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>
                            {loading ? '—' : fmt(summary?.total_expenses ?? 0)}
                        </h3>
                    </div>
                    <MiniBarChart color="var(--danger)" data={[50, 30, 70, 40, 20, 60, summary?.total_expenses ?? 0]} />
                </div>

                {/* Saldo Líquido */}
                <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 180, border: '1px solid var(--primary-soft)', boxShadow: '0 4px 20px rgba(46, 41, 78, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={20} /></div>
                        <span className="badge badge-primary">Saldo</span>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Saldo Líquido</p>
                        <h3 style={{ fontSize: 28, fontWeight: 800, color: summary && summary.net_profit < 0 ? 'var(--danger)' : 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>
                            {loading ? '—' : fmt(summary?.net_profit ?? 0)}
                        </h3>
                    </div>
                    <MiniBarChart color="var(--primary)" data={[10, 30, 40, 50, 60, 30, Math.max(0, summary?.net_profit ?? 0)]} />
                </div>
            </div>

            {/* Tabela de Transações */}
            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                        Transações — {MONTHS[month - 1]} {year}
                        {!loading && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-3)', marginLeft: 8 }}>({transactions.length} registros)</span>}
                    </h4>
                    <button style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'inherit' }}>
                        Exportar CSV
                    </button>
                </div>

                {/* Cabeçalho colunas */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px', padding: '12px 24px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Descrição', 'Categoria', 'Data', 'Status', 'Valor', ''].map((h, i) => (
                        <div key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: i === 4 ? 'right' : 'left' }}>{h}</div>
                    ))}
                </div>

                {/* Linhas */}
                {loading ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>Carregando transações...</div>
                ) : paginated.length === 0 ? (
                    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)' }}>
                        <DollarSign size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <p style={{ fontSize: 15, fontWeight: 600 }}>Nenhuma transação em {MONTHS[month - 1]}.</p>
                        <p style={{ fontSize: 13, marginTop: 4 }}>Clique em "Nova Transação" para começar.</p>
                    </div>
                ) : (
                    paginated.map(t => (
                        <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 40px', padding: '14px 24px', borderBottom: '1px solid var(--border)', alignItems: 'center', transition: 'background 0.15s', cursor: 'default' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                            {/* Descrição */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <CategoryIcon category={t.category} type={t.type} />
                                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t.description}</span>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{t.category ?? '—'}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                            <div>
                                {t.status === 'pago' ? <span className="badge badge-success">Pago</span>
                                    : t.status === 'atrasado' ? <span className="badge badge-danger">Atrasado</span>
                                        : <span className="badge badge-warning">Aberto</span>}
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: t.type === 'receita' ? 'var(--success)' : 'var(--danger)' }}>
                                {t.type === 'receita' ? '+' : '-'} {fmt(t.amount)}
                            </div>
                            <button onClick={() => handleDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, transition: 'opacity 0.2s' }}
                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '0.5')}>
                                <Trash2 size={15} />
                            </button>
                        </div>
                    ))
                )}

                {/* Rodapé paginação */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', background: 'var(--bg)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
                        {transactions.length === 0 ? 'Nenhuma transação' : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, transactions.length)} de ${transactions.length} transações`}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
                        <button className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próximo</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
