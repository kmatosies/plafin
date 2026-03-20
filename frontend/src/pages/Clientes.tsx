import { useState, useEffect, useCallback } from 'react'
import {
    Search, Plus, Phone, Mail, MoreHorizontal, TrendingUp,
    DollarSign, Calendar, Filter, X, User, Edit2, Trash2,
    CheckCircle, Clock, ArrowRight, ChevronDown, AlertTriangle, Loader2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import UpgradeCard from '../components/UpgradeCard'
import { clientsApi } from '../lib/api'
import type { Client, ClientCreate } from '../lib/api'

const COLORS = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6']

function getInitials(name: string) {
    const safe = name?.trim() || 'Cliente'
    return safe.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function getColor(id: string) {
    // Determinístico por ID para cor consistente:
    const sum = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    return COLORS[sum % COLORS.length]
}

// ─── Modal Novo / Editar Cliente ───────────────────────────────────────
interface ClientModalProps {
    client?: Client | null
    onClose: () => void
    onSave: () => void
}

function ClientModal({ client, onClose, onSave }: ClientModalProps) {
    const [form, setForm] = useState<ClientCreate>({
        full_name: client?.full_name || '',
        email: client?.email || '',
        phone: client?.phone || '',
        address: client?.address || '',
        notes: client?.notes || '',
        status: client?.status || 'ativo',
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.full_name?.trim()) { setError('Nome é obrigatório.'); return }
        setLoading(true)
        setError('')
        try {
            if (client) {
                await clientsApi.update(client.id, form)
            } else {
                await clientsApi.create(form)
            }
            onSave()
            onClose()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Erro ao salvar cliente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--surface, #fff)', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeIn 0.15s ease' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border, #E2E8F0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                            {client ? 'Editar Cliente' : 'Novo Cliente'}
                        </h2>
                        <p style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                            {client ? 'Atualize os dados do cliente.' : 'Preencha os dados para cadastrar.'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: 'var(--hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <p style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626' }}>{error}</p>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Nome Completo *</label>
                            <input style={inputStyle} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Ex: João Silva" />
                        </div>
                        <div>
                            <label style={labelStyle}>Status</label>
                            <div style={{ position: 'relative' }}>
                                <select style={{ ...inputStyle, appearance: 'none', paddingRight: 32 }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'ativo' | 'inativo' }))}>
                                    <option value="ativo">Ativo</option>
                                    <option value="inativo">Inativo</option>
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>E-mail</label>
                        <input style={inputStyle} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Telefone</label>
                            <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(11) 99999-9999" />
                        </div>
                        <div>
                            <label style={labelStyle}>Endereço</label>
                            <input style={inputStyle} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, nº - Cidade" />
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Observações</label>
                        <textarea style={{ ...inputStyle, height: 72, resize: 'vertical', fontFamily: 'inherit' }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anotações sobre o cliente..." />
                    </div>

                    <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: 'var(--brand-navy, #1E3A8A)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {loading ? <Loader2 size={14} className="spin" /> : (client ? 'Salvar Alterações' : 'Cadastrar Cliente')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Modal Perfil do Cliente ────────────────────────────────────────────
function ProfileModal({ client, onClose, onEdit }: { client: Client; onClose: () => void; onEdit: () => void }) {
    const color = getColor(client.id)
    const initials = getInitials(client.full_name)
    const total = client.total_spent ?? 0
    const sessions = client.total_sessions ?? 0
    const ticketMedio = sessions > 0 ? Math.round(total / sessions) : 0

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--surface, #fff)', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                <div style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, borderRadius: '16px 16px 0 0', padding: '24px 24px 52px', position: 'relative' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, border: 'none', borderRadius: 8, background: 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <X size={15} />
                    </button>
                </div>
                <div style={{ padding: '0 24px', marginTop: -36, marginBottom: 12 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', border: '4px solid var(--surface, #fff)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                        {initials}
                    </div>
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{client.full_name}</h2>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: client.status === 'ativo' ? '#D1FAE5' : '#F1F5F9', color: client.status === 'ativo' ? '#065F46' : '#475569', marginTop: 4, display: 'inline-block', textTransform: 'uppercase' }}>
                                {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                        <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--primary-soft)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: 'var(--brand-navy)', cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Edit2 size={12} /> Editar
                        </button>
                    </div>

                    <div style={{ background: 'var(--hover)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {client.email && <InfoRow icon={<Mail size={13} />} text={client.email} />}
                        {client.phone && <InfoRow icon={<Phone size={13} />} text={client.phone} />}
                        {client.address && <InfoRow icon={<User size={13} />} text={client.address} />}
                        {client.created_at && <InfoRow icon={<Calendar size={13} />} text={`Cliente desde ${new Date(client.created_at).toLocaleDateString('pt-BR')}`} />}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                        {[
                            { label: 'Total gasto', value: `R$ ${total.toLocaleString('pt-BR')}`, color: '#10B981' },
                            { label: 'Sessões', value: String(sessions), color: '#6366F1' },
                            { label: 'Ticket Médio', value: `R$ ${ticketMedio.toLocaleString('pt-BR')}`, color: '#F59E0B' },
                        ].map(s => (
                            <div key={s.label} style={{ background: 'var(--hover)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {client.notes && (
                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 14 }}>
                            <strong>Obs:</strong> {client.notes}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ flex: 1, padding: '9px 0', background: 'var(--brand-navy)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <Calendar size={13} /> Agendar Sessão
                        </button>
                        <button style={{ flex: 1, padding: '9px 0', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#15803D', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <ArrowRight size={13} /> Ver Histórico
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
            <span style={{ color: 'var(--text-3)', flexShrink: 0 }}>{icon}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
        </div>
    )
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 5, letterSpacing: '0.3px', textTransform: 'uppercase' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', boxSizing: 'border-box' }

// ─── Dropdown Menu ──────────────────────────────────────────────────────
function CardMenu({ onEdit, onToggleStatus, onDelete, isActive }: { onEdit: () => void; onToggleStatus: () => void; onDelete: () => void; isActive: boolean }) {
    const [open, setOpen] = useState(false)
    return (
        <div style={{ position: 'relative' }}>
            <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }} style={{ width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
                <MoreHorizontal size={15} />
            </button>
            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                    <div style={{ position: 'absolute', right: 0, top: 36, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 99, minWidth: 160, overflow: 'hidden' }}>
                        {[
                            { icon: <Edit2 size={13} />, label: 'Editar', action: onEdit, color: 'var(--text)' },
                            { icon: isActive ? <Clock size={13} /> : <CheckCircle size={13} />, label: isActive ? 'Arquivar' : 'Reativar', action: onToggleStatus, color: isActive ? '#F59E0B' : '#10B981' },
                            { icon: <Trash2 size={13} />, label: 'Excluir', action: onDelete, color: '#EF4444' },
                        ].map(item => (
                            <button key={item.label} onClick={() => { item.action(); setOpen(false) }} style={{ width: '100%', padding: '9px 14px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: item.color, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

// ─── Componente Principal ────────────────────────────────────────────────
const FREE_CLIENT_LIMIT = 20

export default function Clientes() {
    const { upgrade, showUpgrade, hideUpgrade, locale, subscription } = useAuth()
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [apiError, setApiError] = useState<string | null>(null)

    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos')
    const [showModal, setShowModal] = useState(false)
    const [editingClient, setEditingClient] = useState<Client | null>(null)
    const [viewingClient, setViewingClient] = useState<Client | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 6

    const clientLimit = subscription?.limits.max_clients ?? FREE_CLIENT_LIMIT
    const isFreePlan = (subscription?.plan ?? 'free') === 'free'
    const atLimit = isFreePlan && clientLimit !== null && clients.length >= clientLimit
    const nearLimit = isFreePlan && clientLimit !== null && clients.length >= Math.max(clientLimit - 3, 0)

    const fetchClients = useCallback(async () => {
        setLoading(true)
        setApiError(null)
        try {
            const data = await clientsApi.list()
            setClients(Array.isArray(data) ? data : [])
        } catch (err: unknown) {
            console.error('Erro ao buscar clientes:', err)
            setApiError('Não foi possível carregar os clientes. Verifique se o backend está rodando.')
            setClients([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchClients() }, [fetchClients])

    const handleNewClient = () => {
        if (atLimit) { showUpgrade('clients', clientLimit ?? FREE_CLIENT_LIMIT); return }
        setEditingClient(null)
        setShowModal(true)
    }

    const filtered = clients.filter(c => {
        const matchSearch = c.full_name.toLowerCase().includes(search.toLowerCase()) ||
            (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.phone || '').includes(search)
        const matchFilter = filter === 'todos' || c.status === filter
        return matchSearch && matchFilter
    })

    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginatedClients = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const handleSearch = (value: string) => { setSearch(value); setCurrentPage(1) }
    const handleFilter = (value: 'todos' | 'ativo' | 'inativo') => { setFilter(value); setCurrentPage(1) }

    const ativos = clients.filter(c => c.status === 'ativo').length
    const totalReceita = clients.reduce((s, c) => s + (c.total_spent ?? 0), 0)
    const totalSessoes = clients.reduce((s, c) => s + (c.total_sessions ?? 0), 0)
    const ticketMedio = Math.round(totalReceita / (clients.length || 1))

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este cliente? Esta ação é permanente.')) {
            try {
                await clientsApi.delete(id)
                fetchClients()
            } catch {
                alert('Erro ao excluir cliente.')
            }
        }
    }

    const handleToggleStatus = async (client: Client) => {
        try {
            if (client.status === 'ativo') {
                await clientsApi.archive(client.id)
            } else {
                await clientsApi.reactivate(client.id)
            }
            fetchClients()
        } catch {
            alert('Erro ao alterar status do cliente.')
        }
    }

    const openEdit = (client: Client) => {
        setViewingClient(null)
        setEditingClient(client)
        setShowModal(true)
    }

    return (
        <div className="fade-in">
            {/* Modais */}
            {showModal && (
                <ClientModal
                    client={editingClient}
                    onClose={() => { setShowModal(false); setEditingClient(null) }}
                    onSave={fetchClients}
                />
            )}
            {viewingClient && (
                <ProfileModal
                    client={viewingClient}
                    onClose={() => setViewingClient(null)}
                    onEdit={() => openEdit(viewingClient)}
                />
            )}
            {upgrade.visible && <UpgradeCard limitType={upgrade.limitType} limit={upgrade.limit} locale={locale} onDismiss={hideUpgrade} />}

            {/* Header */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Gestão de Clientes</h1>
                    <p className="page-subtitle">Gerencie sua base de contatos e acompanhe o histórico financeiro</p>
                </div>
                <button
                    className={`btn ${atLimit ? 'btn-outline' : 'btn-primary'}`}
                    onClick={handleNewClient}
                    style={atLimit ? { borderColor: '#F59E0B', color: '#92400E', background: '#FFFBEB' } : {}}
                >
                    <Plus size={15} /> {atLimit ? 'Limite Atingido — Upgrade' : 'Novo Cliente'}
                </button>
            </div>

            {/* Banner aviso */}
            {nearLimit && !atLimit && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400E', fontWeight: 500 }}>
                    <AlertTriangle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
                    <span>
                        Você está usando <strong>{clients.length}/{clientLimit}</strong> clientes.{' '}
                        <button onClick={() => showUpgrade('clients', clientLimit ?? FREE_CLIENT_LIMIT)} style={{ background: 'none', border: 'none', color: '#D97706', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline', fontFamily: 'inherit', fontSize: 13 }}>Faça upgrade para Pro</button>.
                    </span>
                </div>
            )}

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }} className="clients-kpi-grid">
                {[
                    { icon: <TrendingUp size={18} />, label: 'Total Clientes', value: clients.length, sub: `${ativos} ativos`, color: 'var(--brand-navy)', bg: 'var(--primary-soft)' },
                    { icon: <CheckCircle size={18} />, label: 'Ativos', value: ativos, sub: `${Math.round(ativos / (clients.length || 1) * 100)}% do total`, color: '#10B981', bg: '#F0FDF4' },
                    { icon: <DollarSign size={18} />, label: 'Ticket Médio', value: `R$ ${ticketMedio.toLocaleString('pt-BR')}`, sub: 'Por cliente', color: '#F59E0B', bg: '#FFFBEB' },
                    { icon: <Calendar size={18} />, label: 'Total Sessões', value: totalSessoes, sub: 'Acumulado', color: '#6366F1', bg: '#EEF2FF' },
                ].map(k => (
                    <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: 'var(--shadow-sm)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
                            {k.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 2 }}>{k.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{loading ? '—' : k.value}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{k.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                    <Search size={14} color="var(--text-3)" />
                    <input
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text)', fontFamily: 'inherit', width: '100%' }}
                        placeholder="Buscar por nome, email ou telefone..."
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                    />
                    {search && <button onClick={() => handleSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><X size={13} /></button>}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: 'var(--hover)', borderRadius: 8, padding: 3, gap: 2 }}>
                        {(['todos', 'ativo', 'inativo'] as const).map(f => (
                            <button key={f} onClick={() => handleFilter(f)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: filter === f ? 'var(--surface)' : 'transparent', color: filter === f ? 'var(--brand-navy)' : 'var(--text-2)', boxShadow: filter === f ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s' }}>
                                {f === 'todos' ? 'Todos' : f === 'ativo' ? 'Ativos' : 'Inativos'}
                            </button>
                        ))}
                    </div>
                    <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Filter size={13} /> Filtros
                    </button>
                </div>
            </div>

            {/* Estado de carregamento / erro */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
                    <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px', color: 'var(--brand-navy)' }} />
                    <p style={{ fontSize: 14, fontWeight: 500 }}>Carregando clientes...</p>
                </div>
            ) : apiError ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#DC2626' }}>
                    <AlertTriangle size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{apiError}</p>
                    <button onClick={fetchClients} className="btn btn-outline" style={{ marginTop: 12 }}>Tentar Novamente</button>
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-3)' }}>
                    <User size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ fontSize: 15, fontWeight: 600 }}>Nenhum cliente encontrado</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Tente ajustar os filtros ou cadastre um novo cliente.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="clients-grid">
                    {paginatedClients.map(c => {
                        const color = getColor(c.id)
                        const initials = getInitials(c.full_name)
                        const total = c.total_spent ?? 0
                        const sessions = c.total_sessions ?? 0
                        return (
                            <div key={c.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14, cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                                onClick={() => setViewingClient(c)}
                                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--brand-navy)' }}
                                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                        {initials}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</div>
                                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9999, background: c.status === 'ativo' ? '#D1FAE5' : 'var(--hover)', color: c.status === 'ativo' ? '#065F46' : 'var(--text-3)', display: 'inline-block', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                            {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </div>
                                    <div onClick={e => e.stopPropagation()}>
                                        <CardMenu
                                            isActive={c.status === 'ativo'}
                                            onEdit={() => openEdit(c)}
                                            onToggleStatus={() => handleToggleStatus(c)}
                                            onDelete={() => handleDelete(c.id)}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {c.email && <InfoRow icon={<Mail size={12} />} text={c.email} />}
                                    {c.phone && <InfoRow icon={<Phone size={12} />} text={c.phone} />}
                                    {c.last_session_date && <InfoRow icon={<Calendar size={12} />} text={`Última sessão: ${new Date(c.last_session_date).toLocaleDateString('pt-BR')}`} />}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, background: 'var(--hover)', borderRadius: 10, padding: '10px 12px' }}>
                                    {[
                                        { label: 'Total', value: total >= 1000 ? `R$ ${(total / 1000).toFixed(1)}k` : `R$ ${total}`, color: '#10B981' },
                                        { label: 'Sessões', value: String(sessions), color: '#6366F1' },
                                        { label: 'Ticket', value: sessions > 0 ? `R$ ${Math.round(total / sessions)}` : '—', color: '#F59E0B' },
                                    ].map(s => (
                                        <div key={s.label} style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={e => { e.stopPropagation(); setViewingClient(c) }} style={{ flex: 1, padding: '8px 0', background: 'var(--primary-soft)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--brand-navy)', cursor: 'pointer', fontFamily: 'inherit' }}>
                                        Ver Perfil
                                    </button>
                                    <button onClick={e => { e.stopPropagation() }} style={{ flex: 1, padding: '8px 0', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#15803D', cursor: 'pointer', fontFamily: 'inherit' }}>
                                        Agendar
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Paginação */}
            {!loading && !apiError && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ color: 'var(--text-3)', fontSize: 12 }}>
                        Mostrando <strong style={{ color: 'var(--text-2)' }}>{filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong> a <strong style={{ color: 'var(--text-2)' }}>{Math.min(currentPage * itemsPerPage, filtered.length)}</strong> de <strong style={{ color: 'var(--text-2)' }}>{filtered.length}</strong> clientes
                    </div>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: currentPage === 1 ? 'var(--text-3)' : 'var(--text-2)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                Anterior
                            </button>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button key={page} onClick={() => setCurrentPage(page)} style={{ width: 30, height: 30, background: currentPage === page ? 'var(--brand-navy)' : 'var(--surface)', border: currentPage === page ? 'none' : '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 700, color: currentPage === page ? '#fff' : 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {page}
                                    </button>
                                ))}
                            </div>
                            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} style={{ padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: currentPage === totalPages ? 'var(--text-3)' : 'var(--text-2)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                                Próximo
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
