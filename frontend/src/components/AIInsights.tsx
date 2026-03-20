import { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, MessageSquare, Send, Loader2, X, RefreshCw } from 'lucide-react'
import { aiApi } from '../lib/api'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../contexts/AuthContext'

interface AIInsightsProps {
    onClose: () => void
}

interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
}

export default function AIInsights({ onClose }: AIInsightsProps) {
    const { showUpgrade } = useAuth()
    const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis')
    const [analysis, setAnalysis] = useState<string | null>(null)
    const [loadingAnalysis, setLoadingAnalysis] = useState(false)
    const [messages, setMessages] = useState<ChatMessage[]>([{ id: '1', role: 'assistant', content: 'Olá! Sou seu Assistente Financeiro IA. Como posso ajudar com os números do seu negócio hoje?' }])
    const [input, setInput] = useState('')
    const [loadingChat, setLoadingChat] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const fetchAnalysis = useCallback(async (force = false) => {
        if (analysis && !force) return
        setLoadingAnalysis(true)
        try {
            const res = await aiApi.analyzeFinance('full')
            setAnalysis(res.analysis)
        } catch (error: unknown) {
            const err = error as Error
            if (err.message?.includes('Pro')) {
                showUpgrade('ai', Infinity)
                onClose()
            } else {
                setAnalysis('Não foi possível carregar a análise no momento. Tente novamente mais tarde.')
            }
        } finally {
            setLoadingAnalysis(false)
        }
    }, [analysis, showUpgrade, onClose])

    useEffect(() => {
        if (activeTab === 'analysis') {
            fetchAnalysis()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])

    const handleSendMessage = async () => {
        if (!input.trim() || loadingChat) return

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input }
        setMessages(prev => [...prev, userMsg])
        setInput('')
        setLoadingChat(true)

        try {
            const res = await aiApi.chatFinance(userMsg.content)
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: res.response }])
        } catch (error: unknown) {
            const err = error as Error
            if (err.message?.includes('Pro')) {
                showUpgrade('ai', Infinity)
                onClose()
            } else {
                setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Desculpe, ocorreu um erro ao processar sua mensagem.' }])
            }
        } finally {
            setLoadingChat(false)
        }
    }

    useEffect(() => {
        if (activeTab === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, activeTab])

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start',
            justifyContent: 'flex-end', zIndex: 1000
        }} onClick={onClose}>
            <div style={{
                width: 450, maxWidth: '100%', height: '100vh', background: 'var(--bg)',
                boxShadow: '-10px 0 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column',
                animation: 'slideInRight 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Consultor IA</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, marginTop: 2 }}>Alimentado por Gemini 2.0</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'var(--hover)', border: 'none', width: 32, height: 32,
                        borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'var(--text-2)', cursor: 'pointer'
                    }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
                    <button onClick={() => setActiveTab('analysis')} style={{
                        flex: 1, padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 14, fontWeight: 700, color: activeTab === 'analysis' ? 'var(--primary)' : 'var(--text-3)',
                        borderBottom: activeTab === 'analysis' ? '2px solid var(--primary)' : '2px solid transparent',
                        transition: 'all 0.2s'
                    }}>
                        Análise Geral
                    </button>
                    <button onClick={() => setActiveTab('chat')} style={{
                        flex: 1, padding: '16px 0', background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 14, fontWeight: 700, color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-3)',
                        borderBottom: activeTab === 'chat' ? '2px solid var(--primary)' : '2px solid transparent',
                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}>
                        Chat Interativo
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-alt)', padding: '24px' }}>

                    {activeTab === 'analysis' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Diagnóstico 360º</h4>
                                <button onClick={() => fetchAnalysis(true)} disabled={loadingAnalysis} style={{
                                    background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600
                                }}>
                                    <RefreshCw size={14} className={loadingAnalysis ? 'spin' : ''} />
                                    Atualizar
                                </button>
                            </div>

                            {loadingAnalysis ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', color: 'var(--text-3)' }}>
                                    <Loader2 size={32} className="spin" style={{ marginBottom: 16, color: 'var(--primary)' }} />
                                    <p style={{ fontSize: 14, fontWeight: 500 }}>Analisando seus dados financeiros...</p>
                                </div>
                            ) : (
                                <div className="markdown-body" style={{
                                    background: 'var(--bg)', padding: '20px', borderRadius: 'var(--radius)',
                                    border: '1px solid var(--border)', fontSize: 14, color: 'var(--text)', lineHeight: 1.6
                                }}>
                                    {analysis ? (
                                        <ReactMarkdown>{analysis}</ReactMarkdown>
                                    ) : (
                                        <p style={{ color: 'var(--text-3)', textAlign: 'center' }}>Nenhuma análise disponível.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'chat' && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16 }}>
                                {messages.map((m) => (
                                    <div key={m.id} style={{
                                        display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
                                    }}>
                                        <div style={{
                                            maxWidth: '85%', padding: '12px 16px', borderRadius: '16px',
                                            background: m.role === 'user' ? 'var(--primary)' : 'var(--bg)',
                                            color: m.role === 'user' ? '#fff' : 'var(--text)',
                                            border: m.role === 'user' ? 'none' : '1px solid var(--border)',
                                            boxShadow: m.role === 'user' ? '0 4px 12px rgba(99, 102, 241, 0.2)' : '0 2px 8px rgba(0,0,0,0.02)',
                                            borderBottomRightRadius: m.role === 'user' ? '4px' : '16px',
                                            borderBottomLeftRadius: m.role === 'assistant' ? '4px' : '16px',
                                        }}>
                                            {m.role === 'user' ? (
                                                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{m.content}</p>
                                            ) : (
                                                <div className="markdown-body" style={{ fontSize: 14, lineHeight: 1.5 }}>
                                                    <ReactMarkdown>{m.content}</ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {loadingChat && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <div style={{
                                            padding: '12px 16px', borderRadius: '16px', borderBottomLeftRadius: '4px',
                                            background: 'var(--bg)', border: '1px solid var(--border)', display: 'flex', gap: 6, alignItems: 'center'
                                        }}>
                                            <Loader2 size={16} className="spin" color="var(--primary)" />
                                            <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>Digitando...</span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat Input */}
                {activeTab === 'chat' && (
                    <div style={{ padding: '16px 24px', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', background: 'var(--bg-alt)', borderRadius: '100px',
                            border: '1px solid var(--border)', padding: '6px 6px 6px 16px', transition: 'border-color 0.2s',
                        }}>
                            <MessageSquare size={18} color="var(--text-3)" style={{ flexShrink: 0 }} />
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                placeholder="Pergunte algo sobre suas finanças..."
                                style={{
                                    flex: 1, background: 'none', border: 'none', outline: 'none', padding: '0 12px',
                                    fontSize: 14, color: 'var(--text)', fontFamily: 'inherit'
                                }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!input.trim() || loadingChat}
                                style={{
                                    background: input.trim() && !loadingChat ? 'var(--primary)' : 'var(--text-3)',
                                    border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: input.trim() && !loadingChat ? 'pointer' : 'default',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Send size={16} style={{ marginLeft: -2, marginTop: 2 }} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
