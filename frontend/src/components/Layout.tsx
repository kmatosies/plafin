import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard, CalendarDays, DollarSign, Users,
    Bot, CreditCard, Settings, LogOut,
    Search, Bell, Moon, Menu, X, Check,
} from 'lucide-react'

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/agenda', icon: CalendarDays, label: 'Agenda' },
    { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
    { to: '/clientes', icon: Users, label: 'Clientes' },
    { to: '/assinatura', icon: CreditCard, label: 'Assinatura' },
]

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    // Estados para Notificações e Busca
    const [showNotifications, setShowNotifications] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [showSearchDropdown, setShowSearchDropdown] = useState(false)

    const notificationsRef = useRef<HTMLDivElement>(null)
    const searchRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()

    // Mock de notificações
    const notifications = [
        { id: 1, text: 'Nova transação recebida: R$ 1.500,00', time: 'Há 5 min', unread: true },
        { id: 2, text: 'Reunião com Maria Silva amanhã às 14h', time: 'Há 2 horas', unread: true },
        { id: 3, text: 'Fatura #1024 vence em 3 dias', time: 'Ontem', unread: false },
    ]

    // Mock de busca global
    const handleSearchItemClick = (type: string) => {
        setSearchQuery('')
        setShowSearchDropdown(false)
        if (type === 'Cliente') navigate('/clientes')
        else if (type === 'Agendamento') navigate('/agenda')
        else if (type === 'Despesa' || type === 'Receita') navigate('/financeiro')
    }

    const searchResults = [
        { id: 1, title: 'Maria Silva', type: 'Cliente' },
        { id: 2, title: 'João Pedro', type: 'Cliente' },
        { id: 3, title: 'Desenvolvimento Site', type: 'Receita' },
        { id: 4, title: 'Pagamento Hospedagem', type: 'Despesa' },
        { id: 5, title: 'Reunião de Alinhamento', type: 'Agendamento' },
    ].filter(item => item.title.toLowerCase().includes(searchQuery.toLowerCase()))

    // Fechar dropdowns ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setShowNotifications(false)
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="layout-root">
            {/* ─── OVERLAY MOBILE ─── */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* ─── SIDEBAR ─── */}
            <aside className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
                {/* Logo Plafin */}
                <div className="sidebar-logo-area">
                    <img
                        src="/plafin-logo.svg"
                        alt="Plafin"
                        className="sidebar-logo-img"
                    />
                    {/* Botão fechar no mobile */}
                    <button
                        className="sidebar-close-btn"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Fechar menu"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <Icon size={18} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Rodapé sidebar — só botão Sair */}
                <div className="sidebar-footer">
                    <button className="sidebar-logout-btn">
                        <LogOut size={16} />
                        <span>Sair</span>
                    </button>
                </div>
            </aside>

            {/* ─── MAIN ─── */}
            <div className="main-wrapper">
                {/* Topbar */}
                <header className="topbar">
                    {/* Botão hamburger (mobile) */}
                    <button
                        className="hamburger-btn"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Abrir menu"
                    >
                        <Menu size={22} />
                    </button>

                    {/* Barra de busca */}
                    <div className="topbar-search" ref={searchRef}>
                        <Search size={15} className="topbar-search-icon" />
                        <input
                            className="topbar-search-input"
                            placeholder="Buscar clientes, eventos, finanças..."
                            aria-label="Pesquisar"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                setShowSearchDropdown(true)
                            }}
                            onFocus={() => setShowSearchDropdown(true)}
                        />

                        {/* Dropdown de Busca */}
                        {showSearchDropdown && searchQuery && (
                            <div className="topbar-dropdown search-dropdown">
                                {searchResults.length > 0 ? (
                                    <div className="search-results-list">
                                        <div className="dropdown-header">Resultados</div>
                                        {searchResults.map(result => (
                                            <button
                                                key={result.id}
                                                className="search-result-item"
                                                onClick={() => handleSearchItemClick(result.type)}
                                            >
                                                <span className="search-result-title">{result.title}</span>
                                                <span className="search-result-type">{result.type}</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="search-no-results">
                                        Nenhum resultado encontrado.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Direita */}
                    <div className="topbar-right">
                        <div className="topbar-relative" ref={notificationsRef}>
                            <button
                                className="topbar-icon-btn notification-btn"
                                aria-label="Notificações"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <Bell size={19} />
                                <span className="notification-dot" />
                            </button>

                            {/* Dropdown de Notificações */}
                            {showNotifications && (
                                <div className="topbar-dropdown notifications-dropdown">
                                    <div className="dropdown-header">
                                        <span>Notificações</span>
                                        <button className="dropdown-header-action">Marcar lidas</button>
                                    </div>
                                    <div className="notifications-list">
                                        {notifications.map(notif => (
                                            <div key={notif.id} className={`notification-item ${notif.unread ? 'unread' : ''}`}>
                                                <div className="notification-icon">
                                                    {notif.unread ? <Bell size={14} /> : <Check size={14} />}
                                                </div>
                                                <div className="notification-content">
                                                    <p className="notification-text">{notif.text}</p>
                                                    <p className="notification-time">{notif.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="dropdown-footer">
                                        <button className="dropdown-footer-btn">Ver todas</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button className="topbar-icon-btn" aria-label="Modo escuro">
                            <Moon size={19} />
                        </button>
                        <div className="topbar-divider" />
                        <div className="topbar-user">
                            <div className="topbar-user-info">
                                <p className="topbar-user-name">Alex Silva</p>
                                <p className="topbar-user-role">PRO</p>
                            </div>
                            <div className="topbar-avatar" aria-label="Avatar do usuário">AS</div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="page-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
