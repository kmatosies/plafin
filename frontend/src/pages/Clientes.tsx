import { useState } from 'react'
import {
    Search, Plus, Phone, Mail, MoreHorizontal, TrendingUp,
    DollarSign, Calendar, Filter, X, User, Edit2, Trash2,
    CheckCircle, Clock, ArrowRight, ChevronDown
} from 'lucide-react'

interface Client {
    id: number
    name: string
    email: string
    phone: string
    status: 'ativo' | 'inativo'
    total: number
    sessions: number
    lastSession: string
    initials: string
    color: string
    address?: string
    notes?: string
    createdAt?: string
}

const initialClients: Client[] = [
    { id: 1, name: 'Mariana Silva', email: 'mariana.silva@email.com', phone: '(11) 98765-4321', status: 'ativo', total: 4200, sessions: 8, lastSession: '20/01/2025', initials: 'MS', color: '#2563eb', address: 'Rua das Flores, 123 - SP', notes: 'Cliente VIP. Prefere atendimento às terças.', createdAt: '10/06/2024' },
    { id: 2, name: 'Carlos Mendes', email: 'carlos.mendes@tech.com', phone: '(21) 99888-7766', status: 'ativo', total: 3600, sessions: 6, lastSession: '18/01/2025', initials: 'CM', color: '#8b5cf6', address: 'Av. Paulista, 500 - SP', notes: 'Área de tecnologia.', createdAt: '22/07/2024' },
    { id: 3, name: 'Julia Costa', email: 'julia.costa@adv.com', phone: '(31) 99123-4567', status: 'inativo', total: 1800, sessions: 3, lastSession: '05/12/2024', initials: 'JC', color: '#10b981', address: 'Rua XV de Novembro, 80 - MG', createdAt: '03/09/2024' },
    { id: 4, name: 'Roberto Almeida', email: 'roberto.almeida@mail.com', phone: '(41) 98877-6655', status: 'ativo', total: 5400, sessions: 9, lastSession: '22/01/2025', initials: 'RA', color: '#f59e0b', address: 'Rua Marechal, 45 - PR', createdAt: '15/05/2024' },
    { id: 5, name: 'Ana Souza', email: 'ana.souza@design.com', phone: '(11) 97766-5544', status: 'ativo', total: 2700, sessions: 5, lastSession: '17/01/2025', initials: 'AS', color: '#ef4444', address: 'Al. Santos, 200 - SP', createdAt: '01/08/2024' },
    { id: 6, name: 'Lucas Pereira', email: 'lucas.p@start.up', phone: '(51) 98899-0011', status: 'ativo', total: 1200, sessions: 2, lastSession: '23/01/2025', initials: 'LP', color: '#6366f1', address: 'Av. Beira-Rio, 10 - RS', createdAt: '10/11/2024' },
]

const COLORS = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6']

function getInitials(name: string) {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ─── Modal Novo / Editar Cliente ───────────────────────────────────────
interface ClientModalProps {
    client?: Client | null
    onClose: () => void
    onSave: (c: Client) => void
    nextId: number
}

function ClientModal({ client, onClose, onSave, nextId }: ClientModalProps) {
    const [form, setForm] = useState({
        name: client?.name || '',
        email: client?.email || '',
        phone: client?.phone || '',
        address: client?.address || '',
        notes: client?.notes || '',
        status: client?.status || 'ativo' as 'ativo' | 'inativo',
    })
    const [error, setError] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) { setError('Nome é obrigatório.'); return }
        if (!form.email.trim()) { setError('E-mail é obrigatório.'); return }
        const saved: Client = {
            id: client?.id ?? nextId,
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            notes: form.notes.trim(),
            status: form.status,
            total: client?.total ?? 0,
            sessions: client?.sessions ?? 0,
            lastSession: client?.lastSession ?? '—',
            initials: getInitials(form.name),
            color: client?.color ?? COLORS[nextId % COLORS.length],
            createdAt: client?.createdAt ?? new Date().toLocaleDateString('pt-BR'),
        }
        onSave(saved)
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', animation: 'fadeIn 0.15s ease' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1E293B', margin: 0 }}>
                            {client ? 'Editar Cliente' : 'Novo Cliente'}
                        </h2>
                        <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                            {client ? 'Atualize os dados do cliente.' : 'Preencha os dados para cadastrar.'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ width: 32, height: 32, border: 'none', borderRadius: 8, background: '#F1F5F9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {error && <p style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#DC2626' }}>{error}</p>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label style={labelStyle}>Nome Completo *</label>
                            <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: João Silva" />
                        </div>
                        <div>
                            <label style={labelStyle}>Status</label>
                            <div style={{ position: 'relative' }}>
                                <select style={{ ...inputStyle, appearance: 'none', paddingRight: 32 }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'ativo' | 'inativo' }))}>
                                    <option value="ativo">Ativo</option>
                                    <option value="inativo">Inativo</option>
                                </select>
                                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>E-mail *</label>
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
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancelar
                        </button>
                        <button type="submit" style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: 8, background: '#1E3A8A', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                            {client ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Modal Perfil do Cliente ────────────────────────────────────────────
function ProfileModal({ client, onClose, onEdit }: { client: Client; onClose: () => void; onEdit: () => void }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                {/* Banner */}
                <div style={{ background: `linear-gradient(135deg, ${client.color}, ${client.color}99)`, borderRadius: '16px 16px 0 0', padding: '24px 24px 52px', position: 'relative' }}>
                    <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, width: 30, height: 30, border: 'none', borderRadius: 8, background: 'rgba(255,255,255,0.25)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <X size={15} />
                    </button>
                </div>
                {/* Avatar */}
                <div style={{ padding: '0 24px', marginTop: -36, marginBottom: 12 }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${client.color}, ${client.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff', border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                        {client.initials}
                    </div>
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1E293B', margin: 0 }}>{client.name}</h2>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: client.status === 'ativo' ? '#D1FAE5' : '#F1F5F9', color: client.status === 'ativo' ? '#065F46' : '#475569', marginTop: 4, display: 'inline-block', textTransform: 'uppercase' }}>
                                {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                            </span>
                        </div>
                        <button onClick={onEdit} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#1E3A8A', cursor: 'pointer', fontFamily: 'inherit' }}>
                            <Edit2 size={12} /> Editar
                        </button>
                    </div>

                    {/* Contato */}
                    <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <InfoRow icon={<Mail size={13} />} text={client.email} />
                        <InfoRow icon={<Phone size={13} />} text={client.phone} />
                        {client.address && <InfoRow icon={<User size={13} />} text={client.address} />}
                        <InfoRow icon={<Calendar size={13} />} text={`Cliente desde ${client.createdAt || '—'}`} />
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
                        {[
                            { label: 'Total gasto', value: `R$ ${client.total.toLocaleString('pt-BR')}`, color: '#10B981' },
                            { label: 'Sessões', value: String(client.sessions), color: '#6366F1' },
                            { label: 'Ticket Médio', value: `R$ ${Math.round(client.total / (client.sessions || 1)).toLocaleString('pt-BR')}`, color: '#F59E0B' },
                        ].map(s => (
                            <div key={s.label} style={{ background: '#F8FAFC', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                                <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {client.notes && (
                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 14 }}>
                            <strong>Obs:</strong> {client.notes}
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ flex: 1, padding: '9px 0', background: '#1E3A8A', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569' }}>
            <span style={{ color: '#94A3B8', flexShrink: 0 }}>{icon}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
        </div>
    )
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 5, letterSpacing: '0.3px', textTransform: 'uppercase' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#1E293B', fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }

// ─── Dropdown Menu ──────────────────────────────────────────────────────
function CardMenu({ onEdit, onToggleStatus, onDelete, isActive }: { onEdit: () => void; onToggleStatus: () => void; onDelete: () => void; isActive: boolean }) {
    const [open, setOpen] = useState(false)
    return (
        <div style={{ position: 'relative' }}>
            <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }} style={{ width: 30, height: 30, border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                <MoreHorizontal size={15} />
            </button>
            {open && (
                <>
                    <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                    <div style={{ position: 'absolute', right: 0, top: 36, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 99, minWidth: 160, overflow: 'hidden' }}>
                        {[
                            { icon: <Edit2 size={13} />, label: 'Editar', action: onEdit, color: '#1E293B' },
                            { icon: isActive ? <Clock size={13} /> : <CheckCircle size={13} />, label: isActive ? 'Inativar' : 'Ativar', action: onToggleStatus, color: isActive ? '#F59E0B' : '#10B981' },
                            { icon: <Trash2 size={13} />, label: 'Excluir', action: onDelete, color: '#EF4444' },
                        ].map(item => (
                            <button key={item.label} onClick={() => { item.action(); setOpen(false) }} style={{ width: '100%', padding: '9px 14px', border: 'none', background: 'none', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: item.color, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
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
export default function Clientes() {
    const [clients, setClients] = useState<Client[]>(initialClients)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'todos' | 'ativo' | 'inativo'>('todos')
    const [showModal, setShowModal] = useState(false)
    const [editingClient, setEditingClient] = useState<Client | null>(null)
    const [viewingClient, setViewingClient] = useState<Client | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 6

    const filtered = clients.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase()) ||
            c.phone.includes(search)
        const matchFilter = filter === 'todos' || c.status === filter
        return matchSearch && matchFilter
    })

    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginatedClients = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Resetar página ao filtrar ou buscar
    const handleSearch = (value: string) => { setSearch(value); setCurrentPage(1) }
    const handleFilter = (value: 'todos' | 'ativo' | 'inativo') => { setFilter(value); setCurrentPage(1) }

    const ativos = clients.filter(c => c.status === 'ativo').length
    const totalReceita = clients.reduce((s, c) => s + c.total, 0)
    const totalSessoes = clients.reduce((s, c) => s + c.sessions, 0)
    const ticketMedio = Math.round(totalReceita / (clients.length || 1))

    const handleSave = (c: Client) => {
        setClients(prev => {
            const idx = prev.findIndex(x => x.id === c.id)
            if (idx >= 0) { const arr = [...prev]; arr[idx] = c; return arr }
            return [...prev, c]
        })
        setShowModal(false)
        setEditingClient(null)
    }

    const handleDelete = (id: number) => {
        if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
            setClients(prev => prev.filter(c => c.id !== id))
        }
    }

    const handleToggleStatus = (id: number) => {
        setClients(prev => prev.map(c => c.id === id ? { ...c, status: c.status === 'ativo' ? 'inativo' : 'ativo' } : c))
    }

    const openEdit = (client: Client) => {
        setViewingClient(null)
        setEditingClient(client)
        setShowModal(true)
    }

    const nextId = Math.max(...clients.map(c => c.id), 0) + 1

    return (
        <div className="fade-in">
            {/* Modais */}
            {showModal && (
                <ClientModal
                    client={editingClient}
                    onClose={() => { setShowModal(false); setEditingClient(null) }}
                    onSave={handleSave}
                    nextId={nextId}
                />
            )}
            {viewingClient && (
                <ProfileModal
                    client={viewingClient}
                    onClose={() => setViewingClient(null)}
                    onEdit={() => openEdit(viewingClient)}
                />
            )}

            {/* Header */}
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 className="page-title">Gestão de Clientes</h1>
                    <p className="page-subtitle">Gerencie sua base de contatos e acompanhe o histórico financeiro</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingClient(null); setShowModal(true) }}>
                    <Plus size={15} /> Novo Cliente
                </button>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }} className="clients-kpi-grid">
                {[
                    { icon: <TrendingUp size={18} />, label: 'Total Clientes', value: clients.length, sub: `${ativos} ativos`, color: '#1E3A8A', bg: '#EFF6FF' },
                    { icon: <CheckCircle size={18} />, label: 'Ativos', value: ativos, sub: `${Math.round(ativos / (clients.length || 1) * 100)}% do total`, color: '#10B981', bg: '#F0FDF4' },
                    { icon: <DollarSign size={18} />, label: 'Ticket Médio', value: `R$ ${ticketMedio.toLocaleString('pt-BR')}`, sub: 'Por cliente', color: '#F59E0B', bg: '#FFFBEB' },
                    { icon: <Calendar size={18} />, label: 'Total Sessões', value: totalSessoes, sub: 'Acumulado', color: '#6366F1', bg: '#EEF2FF' },
                ].map(k => (
                    <div key={k.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color, flexShrink: 0 }}>
                            {k.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, marginBottom: 2 }}>{k.label}</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#1E293B', lineHeight: 1 }}>{k.value}</div>
                            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>{k.sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 12px' }}>
                    <Search size={14} color="#94A3B8" />
                    <input
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#1E293B', fontFamily: 'inherit', width: '100%' }}
                        placeholder="Buscar por nome, email ou telefone..."
                        value={search}
                        onChange={e => handleSearch(e.target.value)}
                    />
                    {search && <button onClick={() => handleSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex' }}><X size={13} /></button>}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 8, padding: 3, gap: 2 }}>
                        {(['todos', 'ativo', 'inativo'] as const).map(f => (
                            <button key={f} onClick={() => handleFilter(f)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: filter === f ? '#fff' : 'transparent', color: filter === f ? '#1E3A8A' : '#64748B', boxShadow: filter === f ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                                {f === 'todos' ? 'Todos' : f === 'ativo' ? 'Ativos' : 'Inativos'}
                            </button>
                        ))}
                    </div>
                    <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 600, color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Filter size={13} /> Filtros
                    </button>
                </div>
            </div>

            {/* Grid de Clientes */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94A3B8' }}>
                    <User size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ fontSize: 15, fontWeight: 600 }}>Nenhum cliente encontrado</p>
                    <p style={{ fontSize: 13, marginTop: 4 }}>Tente ajustar os filtros ou cadastre um novo cliente.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }} className="clients-grid">
                    {paginatedClients.map(c => (
                        <div key={c.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '18px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 14, cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                            onClick={() => setViewingClient(c)}
                            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#BFDBFE' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E8F0' }}
                        >
                            {/* Top: Avatar + Nome + Menu */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${c.color}, ${c.color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                                    {c.initials}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 9999, background: c.status === 'ativo' ? '#D1FAE5' : '#F1F5F9', color: c.status === 'ativo' ? '#065F46' : '#94A3B8', display: 'inline-block', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                        {c.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>
                                <div onClick={e => e.stopPropagation()}>
                                    <CardMenu
                                        isActive={c.status === 'ativo'}
                                        onEdit={() => openEdit(c)}
                                        onToggleStatus={() => handleToggleStatus(c.id)}
                                        onDelete={() => handleDelete(c.id)}
                                    />
                                </div>
                            </div>

                            {/* Contato */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <InfoRow icon={<Mail size={12} />} text={c.email} />
                                <InfoRow icon={<Phone size={12} />} text={c.phone} />
                                <InfoRow icon={<Calendar size={12} />} text={`Última sessão: ${c.lastSession}`} />
                            </div>

                            {/* Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, background: '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
                                {[
                                    { label: 'Total', value: `R$ ${(c.total / 1000).toFixed(1)}k`, color: '#10B981' },
                                    { label: 'Sessões', value: String(c.sessions), color: '#6366F1' },
                                    { label: 'Ticket', value: `R$ ${Math.round(c.total / (c.sessions || 1))}`, color: '#F59E0B' },
                                ].map(s => (
                                    <div key={s.label} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: s.color }}>{s.value}</div>
                                        <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Ações */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={e => { e.stopPropagation(); setViewingClient(c) }} style={{ flex: 1, padding: '8px 0', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#1E3A8A', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    Ver Perfil
                                </button>
                                <button onClick={e => { e.stopPropagation() }} style={{ flex: 1, padding: '8px 0', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#15803D', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    Agendar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer com Paginação */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, flexWrap: 'wrap', gap: 12 }}>
                <div style={{ color: '#94A3B8', fontSize: 12 }}>
                    Mostrando <strong style={{ color: '#475569' }}>{(currentPage - 1) * itemsPerPage + 1}</strong> a <strong style={{ color: '#475569' }}>{Math.min(currentPage * itemsPerPage, filtered.length)}</strong> de <strong style={{ color: '#475569' }}>{filtered.length}</strong> clientes
                </div>

                {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            style={{ padding: '6px 12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, fontWeight: 600, color: currentPage === 1 ? '#CBD5E1' : '#475569', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        >
                            Anterior
                        </button>

                        <div style={{ display: 'flex', gap: 4 }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    style={{ width: 30, height: 30, background: currentPage === page ? '#1E3A8A' : '#fff', border: currentPage === page ? 'none' : '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, fontWeight: 700, color: currentPage === page ? '#fff' : '#475569', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    {page}
                                </button>
                            ))}
                        </div>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            style={{ padding: '6px 12px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, fontWeight: 600, color: currentPage === totalPages ? '#CBD5E1' : '#475569', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        >
                            Próximo
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
