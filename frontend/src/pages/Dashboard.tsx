import { Plus, TrendingUp, TrendingDown, Wallet, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react'

// Mini sparkline SVG inline
function Sparkline({ color, data }: { color: string; data: number[] }) {
    const w = 200; const h = 64;
    const min = Math.min(...data), max = Math.max(...data);
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / (max - min || 1)) * h * 0.85 - 4;
        return `${x},${y}`;
    }).join(' ');

    const pathD = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / (max - min || 1)) * h * 0.85 - 4;
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

    const areaD = pathD + ` L${w},${h} L0,${h} Z`;

    return (
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" preserveAspectRatio="none">
            <defs>
                <linearGradient id={`grad-${color.replace('#', '').replace('var(--', '').replace(')', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#grad-${color.replace('#', '').replace('var(--', '').replace(')', '')})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function Dashboard() {
    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Cabeçalho */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.8px', marginBottom: 4 }}>
                        Bem-vindo, Alex
                    </h1>
                    <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Aqui está o resumo das suas finanças hoje.</p>
                </div>
                <button className="btn btn-primary">
                    <Plus size={16} />
                    Novo Lançamento
                </button>
            </div>

            {/* 3 KPI Cards com Sparkline */}
            <div className="kpi-grid" style={{ marginBottom: 32 }}>
                {/* Receitas */}
                <div className="card" style={{ height: 180, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24 }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Receitas</span>
                            <div style={{ padding: '4px 6px', background: 'var(--success-soft)', color: 'var(--success)', borderRadius: 6 }}>
                                <TrendingUp size={16} />
                            </div>
                        </div>
                        <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>R$ 4.650,00</p>
                        <p style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <TrendingUp size={12} />
                            +12.5% <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 2 }}>vs mês passado</span>
                        </p>
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, opacity: 0.6 }}>
                        <Sparkline color="var(--success)" data={[3000, 3200, 3800, 3500, 4200, 4000, 4650]} />
                    </div>
                </div>

                {/* Despesas */}
                <div className="card" style={{ height: 180, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24 }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Despesas</span>
                            <div style={{ padding: '4px 6px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 6 }}>
                                <TrendingDown size={16} />
                            </div>
                        </div>
                        <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>R$ 3.300,00</p>
                        <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <TrendingDown size={12} />
                            -4.2% <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 2 }}>vs mês passado</span>
                        </p>
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, opacity: 0.6 }}>
                        <Sparkline color="var(--danger)" data={[3800, 3500, 3200, 3400, 3100, 3400, 3300]} />
                    </div>
                </div>

                {/* Saldo Líquido */}
                <div className="card" style={{ height: 180, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 24 }}>
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Saldo Líquido</span>
                            <div style={{ padding: '4px 6px', background: 'var(--primary-soft)', color: 'var(--primary)', borderRadius: 6 }}>
                                <Wallet size={16} />
                            </div>
                        </div>
                        <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>R$ 1.350,00</p>
                        <p style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <TrendingUp size={12} />
                            +8.1% <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 2 }}>vs mês passado</span>
                        </p>
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, opacity: 0.6 }}>
                        <Sparkline color="var(--primary)" data={[800, 950, 1100, 1000, 1200, 1150, 1350]} />
                    </div>
                </div>
            </div>

            {/* Plafin AI Insights */}
            <div className="card" style={{ overflow: 'hidden', borderColor: 'var(--brand-green)' }}>
                {/* Barra verde no topo */}
                <div style={{ height: 4, background: 'var(--brand-green)' }} />

                <div style={{ padding: '28px 32px' }}>
                    {/* Título */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                        <div style={{
                            background: 'var(--accent-soft)', padding: '10px', borderRadius: 'var(--radius-sm)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-green)'
                        }}>
                            <Sparkles size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>Plafin AI Insights</h2>
                            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Recomendações baseadas nos seus dados recentes.</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                        {/* Saldo box */}
                        <div style={{
                            background: 'var(--bg)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)', padding: '20px',
                        }}>
                            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                                Situação do Caixa
                            </h3>
                            <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                                <strong style={{ color: 'var(--primary)' }}>Saldo Positivo:</strong>{' '}
                                Você tem <strong>R$ 1.350,00</strong> em caixa hoje. As receitas pagas (R$ 4.650) estão cobrindo as despesas (R$ 3.300).
                            </p>
                        </div>

                        {/* Alerta */}
                        <div style={{
                            background: 'var(--warning-soft)', border: `1px solid var(--warning)`,
                            borderRadius: 'var(--radius)', padding: '20px',
                        }}>
                            <h3 style={{ fontSize: 12, fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertTriangle size={15} />
                                Oportunidade
                            </h3>
                            <p style={{ fontSize: 14, color: '#78350f', lineHeight: 1.6 }}>
                                Você possui <strong>R$ 1.200</strong> em contas a receber atrasadas esta semana. Enviar lembretes pode aumentar seu fluxo de caixa consideravelmente.
                            </p>
                        </div>
                    </div>

                    {/* Botões */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="btn btn-primary">
                            Agir Agora
                            <ArrowRight size={16} />
                        </button>
                        <button className="btn btn-outline">
                            Ver Análise Completa
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
