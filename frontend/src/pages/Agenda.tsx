import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Filter, Bot, CalendarDays, CalendarRange, Loader2 } from 'lucide-react'
import { appointmentsApi, clientsApi } from '../lib/api'
import type { Appointment, Client } from '../lib/api'

const DAYS_HEADER = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

type EventStatus = 'confirmado' | 'pendente' | 'cancelado'
interface DayEvent {
    id: string;
    timeStart: string; timeEnd: string;
    name: string; subtitle: string;
    value?: string; status: EventStatus;
    avatarBg?: string; initials?: string;
    teamAvatars?: string[];
}

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number) { return new Date(y, m, 1).getDay() }

// Helpers para cor de status
const getStatusColor = (status: EventStatus) => {
    switch (status) {
        case 'confirmado': return 'var(--brand-green)'
        case 'pendente': return '#F59E0B'
        case 'cancelado': return 'var(--text-3)'
        default: return 'var(--brand-navy)'
    }
}

/* ─── Picker de Mês/Ano em dropdown ─────────────────────────────────── */
function MonthYearPicker({ cur, onChange, onClose }: {
    cur: { y: number; m: number };
    onChange: (y: number, m: number) => void;
    onClose: () => void;
}) {
    const [year, setYear] = useState(cur.y)
    return (
        <div className="card" style={{ position: 'absolute', top: 46, left: 0, zIndex: 200, padding: '16px', minWidth: 260 }}>
            {/* Controle de Ano */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <button onClick={() => setYear(y => y - 1)} style={navBtnStyle}><ChevronLeft size={15} /></button>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{year}</span>
                <button onClick={() => setYear(y => y + 1)} style={navBtnStyle}><ChevronRight size={15} /></button>
            </div>
            {/* Grid de meses */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {MONTHS.map((m, i) => {
                    const isActive = year === cur.y && i === cur.m
                    return (
                        <button key={m} onClick={() => { onChange(year, i); onClose() }} style={{
                            padding: '8px 4px', border: isActive ? '2px solid var(--brand-navy)' : '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                            background: isActive ? 'var(--primary-soft)' : 'var(--bg)', color: isActive ? 'var(--brand-navy)' : 'var(--text-2)',
                            transition: 'all 0.12s',
                        }}>
                            {m.slice(0, 3)}
                        </button>
                    )
                })}
            </div>
            <button className="btn btn-outline" onClick={onClose} style={{ marginTop: 12, width: '100%', justifyContent: 'center', padding: '7px 0', fontSize: 12 }}>
                Fechar
            </button>
        </div>
    )
}

const navBtnStyle: React.CSSProperties = {
    width: 30, height: 30, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)',
}

/* ─── Modal de Novo Evento ───────────────────────────────────────────── */
function EventModal({ onClose, onSuccess, clients }: { onClose: () => void, onSuccess: () => void, clients: Client[] }) {
    // Como os endpoints pedem clientId, apenas um form visual por enquanto ou adaptar depois:
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '', date: '', start_time: '', end_time: '', status: 'confirmado' as EventStatus, client_id: ''
    })
    useEffect(() => {
        if (!formData.client_id && clients.length > 0) {
            setFormData(prev => ({ ...prev, client_id: clients[0].id }))
        }
    }, [clients, formData.client_id])

    const handleCreate = async () => {
        // Exemplo simplificado (você pode melhorar para buscar clients do BD)
        if (!formData.title || !formData.date || !formData.start_time || !formData.end_time || !formData.client_id) return
        setLoading(true)
        try {
            // Nota: Para criar compromisso real, precisamos de um client_id válido.
            // Para efeitos de UX, simularemos se não houver backend validando chave-estrangeira.
            // Opcional: Se a API falhar sem client_id, teremos que tratar.
            await appointmentsApi.create({
                client_id: formData.client_id,
                date: formData.date,
                start_time: formData.start_time,
                end_time: formData.end_time,
                status: formData.status,
                title: formData.title,
                notes: formData.title,
            })
            onSuccess()
            onClose()
        } catch (error) {
            console.error(error)
            alert('Não foi possível criar o evento. Certifique-se que o banco de dados tem clientes válidos.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1000, padding: 20
        }} onClick={onClose}>
            <div className="card" style={{
                width: 440, maxWidth: '100%',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>Novo Evento</h3>
                        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>Agende um novo compromisso.</p>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg)', border: 'none', width: 32, height: 32, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', cursor: 'pointer' }}>
                        &times;
                    </button>
                </div>

                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Título do Evento *</label>
                        <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Reunião de Alinhamento" style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data *</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</label>
                            <select style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }}>
                                <option>Reunião</option>
                                <option>Consultoria</option>
                                <option>Pessoal</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Início</label>
                            <input type="time" value={formData.start_time} onChange={e => setFormData({ ...formData, start_time: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Término</label>
                            <input type="time" value={formData.end_time} onChange={e => setFormData({ ...formData, end_time: e.target.value })} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Convidados / Clientes</label>
                        <input type="text" placeholder="Adicione e-mails ou nomes" style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: 'var(--bg)', color: 'var(--text)' }} />
                    </div>
                </div>

                <div style={{ padding: '16px 24px', background: 'var(--hover)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button className="btn btn-outline" onClick={onClose} disabled={loading}>
                        Cancelar
                    </button>
                    <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                        {loading ? <Loader2 size={16} className="spin" /> : 'Criar Evento'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function Agenda() {
    const today = new Date()
    const [cur, setCur] = useState({ y: today.getFullYear(), m: today.getMonth() })
    const [selected, setSelected] = useState(today.getDate())
    const [pickerOpen, setPickerOpen] = useState(false)
    const [showEventModal, setShowEventModal] = useState(false)
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

    // Server data state
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchAppointments = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await appointmentsApi.list(cur.m + 1, cur.y)
            setAppointments(data)
        } catch (error) {
            console.error('Failed to fetch appointments:', error)
            setError('Nao foi possivel carregar a agenda. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }, [cur])

    useEffect(() => {
        fetchAppointments()
    }, [fetchAppointments])

    useEffect(() => {
        clientsApi.list().then(setClients).catch(() => setClients([]))
    }, [])

    const daysInMonth = getDaysInMonth(cur.y, cur.m)
    const firstDay = getFirstDay(cur.y, cur.m)
    const daysInPrev = getDaysInMonth(cur.y, cur.m - 1)

    const prev = () => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 })
    const next = () => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 })

    const cells: { day: number; cur: boolean }[] = []

    if (viewMode === 'month') {
        for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, cur: false })
        for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, cur: true })
        while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - firstDay + 1, cur: false })
    } else {
        const dataAtual = new Date(cur.y, cur.m, selected);
        const diaDaSemana = dataAtual.getDay();
        const primeiroDiaDaSemana = new Date(dataAtual);
        primeiroDiaDaSemana.setDate(dataAtual.getDate() - diaDaSemana);

        for (let i = 0; i < 7; i++) {
            const dia = new Date(primeiroDiaDaSemana);
            dia.setDate(primeiroDiaDaSemana.getDate() + i);
            cells.push({ day: dia.getDate(), cur: dia.getMonth() === cur.m })
        }
    }

    // Processar os appointments em um map para exibição
    const scheduleData: Record<string, DayEvent[]> = {}
    const eventDots: Record<string, string[]> = {}

    appointments.forEach(app => {
        // App date needs to match "YYYY-MM-DD"
        // Safely extract the date part only in case it's a full DateTime
        const dateKey = app.date.split('T')[0]

        if (!scheduleData[dateKey]) scheduleData[dateKey] = []
        scheduleData[dateKey].push({
            id: app.id,
            timeStart: app.start_time.slice(0, 5), // 'HH:MM'
            timeEnd: app.end_time.slice(0, 5),
            name: app.client_name || 'Cliente Oculto',
            subtitle: app.notes || 'Consulta',
            status: app.status as EventStatus,
            value: app.value ? `R$ ${app.value}` : undefined,
            initials: app.client_name ? app.client_name.substring(0, 2).toUpperCase() : 'C',
            avatarBg: getStatusColor(app.status as EventStatus),
        })

        if (!eventDots[dateKey]) eventDots[dateKey] = []
        eventDots[dateKey].push(getStatusColor(app.status as EventStatus))
    })

    const selectedKey = `${cur.y}-${String(cur.m + 1).padStart(2, '0')}-${String(selected).padStart(2, '0')}`
    const dayEvents = scheduleData[selectedKey] || []

    return (
        <div>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 4 }}>
                        Agenda Inteligente
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                        Visualize e organize seus <span style={{ color: 'var(--brand-green)', fontWeight: 600 }}>compromissos mensais</span>.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ display: 'flex', background: 'var(--border)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
                        <button onClick={() => setViewMode('month')} style={{ padding: '6px 12px', background: viewMode === 'month' ? 'var(--surface)' : 'transparent', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, color: viewMode === 'month' ? 'var(--text)' : 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: viewMode === 'month' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s' }}>
                            <CalendarDays size={14} /> Mês
                        </button>
                        <button onClick={() => setViewMode('week')} style={{ padding: '6px 12px', background: viewMode === 'week' ? 'var(--surface)' : 'transparent', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, color: viewMode === 'week' ? 'var(--text)' : 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: viewMode === 'week' ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s' }}>
                            <CalendarRange size={14} /> Semana
                        </button>
                    </div>
                    <button className="btn btn-outline" style={{ padding: '9px 16px' }}>
                        <Filter size={14} /> Filtros
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowEventModal(true)}>
                        <Plus size={14} /> Novo Evento
                    </button>
                </div>
            </div>

            <div className="agenda-layout">
                {/* ─── CALENDÁRIO ─── */}
                <div className="card" style={{ padding: '20px 20px 24px' }}>

                    {/* Navegação mês/ano */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, position: 'relative' }}>
                        {/* Título clicável */}
                        {loading ? <Loader2 size={16} className="spin" color="var(--brand-navy)" /> : (
                            <button
                                onClick={() => setPickerOpen(o => !o)}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}
                            >
                                <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                                    {MONTHS[cur.m]} {cur.y}
                                </h2>
                                {pickerOpen ? <ChevronUp size={16} color="var(--brand-navy)" /> : <ChevronDown size={16} color="var(--brand-navy)" />}
                            </button>
                        )}
                        {/* Picker dropdown */}
                        {pickerOpen && (
                            <>
                                <div onClick={() => setPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 190 }} />
                                <MonthYearPicker
                                    cur={cur}
                                    onChange={(y, m) => { setCur({ y, m }); setSelected(1) }}
                                    onClose={() => setPickerOpen(false)}
                                />
                            </>
                        )}

                        {/* Setas prev/next */}
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={prev} style={navBtnStyle}><ChevronLeft size={16} /></button>
                            <button onClick={next} style={navBtnStyle}><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    {/* Cabeçalho dias da semana */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: 8 }}>
                        {DAYS_HEADER.map(d => (
                            <div key={d} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', padding: '4px 0', letterSpacing: '0.5px' }}>{d}</div>
                        ))}
                    </div>

                    {/* Grid de dias */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px 2px' }}>
                        {cells.map((cell, i) => {
                            const key = `${cur.y}-${String(cur.m + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
                            const dots = eventDots[key] || []
                            const isSelected = cell.cur && cell.day === selected

                            return (
                                <div
                                    key={i}
                                    onClick={() => cell.cur && setSelected(cell.day)}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        padding: '6px 2px 8px',
                                        cursor: cell.cur ? 'pointer' : 'default',
                                        opacity: cell.cur ? 1 : 0.28,
                                        borderRadius: 10,
                                        background: isSelected ? 'var(--primary-soft)' : 'transparent',
                                        transition: 'background 0.12s',
                                    }}
                                    onMouseEnter={e => { if (cell.cur && !isSelected) e.currentTarget.style.background = 'var(--hover)' }}
                                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                                >
                                    {/* Número do dia */}
                                    <div style={{
                                        width: 36, height: 36,
                                        borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 14, fontWeight: isSelected ? 800 : 500,
                                        background: isSelected ? 'var(--brand-navy)' : 'transparent',
                                        color: isSelected ? 'white' : cell.cur ? 'var(--text)' : 'var(--text-3)',
                                        boxShadow: isSelected ? '0 4px 10px rgba(46,41,78,0.35)' : 'none',
                                        transition: 'all 0.12s',
                                    }}>
                                        {cell.day}
                                    </div>
                                    {/* Dots de eventos */}
                                    <div style={{ display: 'flex', gap: 2, marginTop: 4, height: 6, alignItems: 'center' }}>
                                        {dots.slice(0, 3).map((c, di) => (
                                            <div key={di} style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
                                        ))}
                                        {dots.length === 0 && <div style={{ width: 5, height: 5 }} />}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {error && (
                        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--danger-soft)', border: '1px solid #fecdd3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>
                            <button className="btn btn-outline" style={{ padding: '6px 10px', fontSize: 12 }} onClick={fetchAppointments}>
                                Tentar novamente
                            </button>
                        </div>
                    )}

                    {/* Legenda eventos */}
                    <div style={{ display: 'flex', gap: 14, marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                        {[
                            { color: 'var(--brand-navy)', label: 'Pessoal' },
                            { color: 'var(--brand-green)', label: 'Trabalho' },
                            { color: '#F59E0B', label: 'Financeiro' },
                        ].map(leg => (
                            <div key={leg.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: leg.color }} />
                                <span style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>{leg.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ─── DAILY SCHEDULE ─── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                            {selected && `${String(selected).padStart(2, '0')} de ${MONTHS[cur.m]}`}
                        </h3>
                        <span style={{ fontSize: 11, color: 'var(--brand-navy)', fontWeight: 700, background: 'var(--primary-soft)', padding: '3px 10px', borderRadius: 20 }}>
                            {dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {dayEvents.length === 0 ? (
                        <div className="card" style={{ padding: 28, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
                            Nenhum compromisso neste dia.
                        </div>
                    ) : (
                        dayEvents.map((ev, i) => (
                            <div key={i} className="card" style={{
                                padding: '12px 14px',
                                display: 'flex', alignItems: 'center', gap: 12,
                                borderLeft: `4px solid ${ev.status === 'confirmado' ? 'var(--brand-green)' : '#F59E0B'}`,
                                cursor: 'pointer',
                                borderTopLeftRadius: 'var(--radius-sm)',
                                borderBottomLeftRadius: 'var(--radius-sm)',
                            }}>
                                {ev.teamAvatars ? (
                                    <div style={{ display: 'flex' }}>
                                        {ev.teamAvatars.map((bg, ti) => (
                                            <div key={ti} style={{ width: 28, height: 28, borderRadius: '50%', background: bg, border: '2px solid white', marginLeft: ti > 0 ? -8 : 0 }} />
                                        ))}
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg)', border: '2px solid white', marginLeft: -8, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--text-2)' }}>+2</div>
                                    </div>
                                ) : (
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: ev.avatarBg || 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text)', flexShrink: 0 }}>
                                        {ev.initials}
                                    </div>
                                )}

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 1 }}>
                                        {ev.timeStart} – {ev.timeEnd}
                                    </p>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.name}</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-2)' }}>{ev.subtitle}</p>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                    <span className={`badge ${ev.status === 'confirmado' ? 'badge-success' : 'badge-warning'}`}>
                                        {ev.status === 'confirmado' ? 'CONFIRMADO' : 'PENDENTE'}
                                    </span>
                                    {ev.value && <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{ev.value}</p>}
                                </div>
                            </div>
                        ))
                    )}

                    {/* IA Sugestão */}
                    <div style={{ background: 'var(--primary-soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', marginTop: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--brand-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={14} color="#fff" />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-navy)' }}>IA Sugestão</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                            Baseado no histórico do mês passado, as <strong>terças e quintas</strong> são seus dias mais produtivos.
                            Tente agrupar consultorias nestes dias.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal Novo Evento */}
            {showEventModal && <EventModal onClose={() => setShowEventModal(false)} onSuccess={fetchAppointments} clients={clients} />}
        </div>
    )
}
