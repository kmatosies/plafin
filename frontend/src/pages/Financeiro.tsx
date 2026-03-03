import { useState } from 'react'
import { TrendingUp, TrendingDown, Wallet, Plus, Filter, Cloud, User, CreditCard, Home, Monitor, X } from 'lucide-react'

// Mini bar chart CSS-based
function MiniBarChart({ color, data }: { color: string; data: number[] }) {
    const max = Math.max(...data)
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 4, alignItems: 'flex-end', height: 48, marginTop: 8 }}>
            {data.map((v, i) => (
                <div key={i} style={{
                    borderRadius: 3,
                    background: i === data.length - 1 ? color : `${color}40`,
                    height: `${Math.max(10, Math.round((v / max) * 100))}%`,
                    transition: 'height 0.3s',
                }} />
            ))}
        </div>
    )
}

const transactions = [
    { id: 1, icon: Cloud, iconBg: 'var(--hover)', iconColor: 'var(--text-2)', desc: 'Assinatura Mensal AWS', cat: 'Infraestrutura', date: '22 Mai 2024', status: 'pago', value: -1250 },
    { id: 2, icon: User, iconBg: 'var(--hover)', iconColor: 'var(--text-2)', desc: 'Consultoria Marketing', cat: 'Serviços', date: '20 Mai 2024', status: 'pendente', value: -3400 },
    { id: 3, icon: CreditCard, iconBg: 'var(--success-soft)', iconColor: 'var(--success)', desc: 'Recebimento Projeto X', cat: 'Vendas', date: '18 Mai 2024', status: 'pago', value: 12000 },
    { id: 4, icon: Home, iconBg: 'var(--hover)', iconColor: 'var(--text-2)', desc: 'Aluguel Escritório', cat: 'Fixos', date: '15 Mai 2024', status: 'pago', value: -4500 },
    { id: 5, icon: Monitor, iconBg: 'var(--hover)', iconColor: 'var(--text-2)', desc: 'Licença Adobe Suite', cat: 'Software', date: '12 Mai 2024', status: 'pendente', value: -224 },
]

// --- Modal de Nova Transação ---
function TransactionModal({ onClose }: { onClose: () => void }) {
    const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa')

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
                    {/* Tipo */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo de Lançamento *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <button
                                onClick={() => setTipo('receita')}
                                style={{
                                    padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.2s',
                                    background: tipo === 'receita' ? 'var(--success-soft)' : 'var(--bg)',
                                    color: tipo === 'receita' ? 'var(--success)' : 'var(--text-2)',
                                    border: tipo === 'receita' ? '1.5px solid var(--success)' : '1.5px solid var(--border)',
                                }}>
                                Receita
                            </button>
                            <button
                                onClick={() => setTipo('despesa')}
                                style={{
                                    padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.2s',
                                    background: tipo === 'despesa' ? 'var(--danger-soft)' : 'var(--bg)',
                                    color: tipo === 'despesa' ? 'var(--danger)' : 'var(--text-2)',
                                    border: tipo === 'despesa' ? '1.5px solid var(--danger)' : '1.5px solid var(--border)',
                                }}>
                                Despesa
                            </button>
                        </div>
                    </div>

                    {/* Descrição e Valor */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição *</label>
                            <input type="text" placeholder="Ex: Manutenção Servidor" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s', background: 'var(--bg)' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor (R$) *</label>
                            <input type="number" placeholder="0,00" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s', background: 'var(--bg)' }} />
                        </div>
                    </div>

                    {/* Cliente e Categoria */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cliente</label>
                            <select style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--bg)' }}>
                                <option value="">Selecione um cliente...</option>
                                <option value="1">Mariana Silva</option>
                                <option value="2">Carlos Mendes</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria *</label>
                            <select style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--bg)' }}>
                                <option value="">Selecione...</option>
                                <option value="vendas">Vendas / Honorários</option>
                                <option value="infra">Infraestrutura</option>
                                <option value="servicos">Serviços</option>
                                <option value="impostos">Impostos</option>
                            </select>
                        </div>
                    </div>

                    {/* Data e Pagamento */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data de Vencimento *</label>
                            <input type="date" style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--bg)' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Método de Pagamento</label>
                            <select style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: 13, fontFamily: 'inherit', outline: 'none', color: 'var(--text)', background: 'var(--bg)' }}>
                                <option value="">Selecione...</option>
                                <option value="pix">PIX</option>
                                <option value="boleto">Boleto</option>
                                <option value="cartao">Cartão de Crédito</option>
                                <option value="dinheiro">Dinheiro</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ padding: '16px 28px', background: 'var(--bg)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button onClick={onClose} className="btn btn-outline">
                        Cancelar
                    </button>
                    <button onClick={onClose} className="btn btn-primary">
                        Salvar Transação
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function Financeiro() {
    const [showModal, setShowModal] = useState(false)

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.8px', marginBottom: 4 }}>Financeiro</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Gerencie suas receitas, despesas e fluxo de caixa.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-outline">
                        <Filter size={16} />
                        Filtrar
                    </button>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary">
                        <Plus size={16} />
                        Nova Transação
                    </button>
                </div>
            </div>

            {/* 3 KPI Cards (Receita / Despesa / Saldo Líquido) */}
            <div className="kpi-grid" style={{ marginBottom: 32 }}>
                {/* Receita */}
                <div className="card" style={{
                    padding: 24, display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', height: 180,
                    border: '1px solid var(--success-soft)',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, background: 'var(--success-soft)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={20} />
                        </div>
                        <span className="badge badge-success">+12.5%</span>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Receita Total</p>
                        <h3 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>R$ 48.250,00</h3>
                    </div>
                    <MiniBarChart color="var(--success)" data={[40, 60, 30, 80, 100, 50, 70]} />
                </div>

                {/* Despesa */}
                <div className="card" style={{
                    padding: 24, display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', height: 180,
                    border: '1px solid var(--danger-soft)',
                    boxShadow: '0 4px 20px rgba(244, 63, 94, 0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingDown size={20} />
                        </div>
                        <span className="badge badge-danger">-4.2%</span>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Despesa Total</p>
                        <h3 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>R$ 15.420,00</h3>
                    </div>
                    <MiniBarChart color="var(--danger)" data={[50, 30, 70, 90, 40, 20, 60]} />
                </div>

                {/* Saldo Líquido */}
                <div className="card" style={{
                    padding: 24, display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', height: 180,
                    border: '1px solid var(--primary-soft)',
                    boxShadow: '0 4px 20px rgba(46, 41, 78, 0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Wallet size={20} />
                        </div>
                        <span className="badge badge-primary">+8.1%</span>
                    </div>
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Saldo Líquido</p>
                        <h3 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>R$ 32.830,00</h3>
                    </div>
                    <MiniBarChart color="var(--primary)" data={[10, 30, -40, 50, 60, 30, 10]} />
                </div>
            </div>

            {/* Tabela de Transações */}
            <div className="card" style={{ overflow: 'hidden' }}>
                {/* Cabeçalho tabela */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '18px 24px', borderBottom: '1px solid var(--border)',
                    background: 'var(--bg)',
                }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Transações Recentes</h4>
                    <button style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'inherit' }}>
                        Exportar CSV
                    </button>
                </div>

                {/* Cabeçalho colunas */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '12px 24px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                    {['Descrição', 'Categoria', 'Data', 'Status', 'Valor'].map((h, i) => (
                        <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', textAlign: i === 4 ? 'right' : 'left' }}>{h}</div>
                    ))}
                </div>

                {/* Linhas */}
                {transactions.map(t => (
                    <div key={t.id} style={{
                        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                        padding: '16px 24px', borderBottom: '1px solid var(--border)',
                        alignItems: 'center', transition: 'background 0.15s', cursor: 'pointer',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        {/* Descrição com ícone */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                                background: t.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <t.icon size={18} color={t.iconColor} />
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{t.desc}</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{t.cat}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{t.date}</div>
                        <div>
                            {t.status === 'pago' ? (
                                <span className="badge badge-success">Pago</span>
                            ) : (
                                <span className="badge badge-warning">Aberto</span>
                            )}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 700, color: t.value > 0 ? 'var(--success)' : 'var(--danger)' }}>
                            {t.value > 0 ? '+' : ''} R$ {Math.abs(t.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                ))}

                {/* Rodapé paginação */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 24px', background: 'var(--bg)',
                }}>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>Mostrando 5 de 42 transações</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {['Anterior', 'Próximo'].map(label => (
                            <button key={label} className="btn btn-outline" style={{ padding: '6px 14px', fontSize: 12 }}>{label}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && <TransactionModal onClose={() => setShowModal(false)} />}
        </div>
    )
}
