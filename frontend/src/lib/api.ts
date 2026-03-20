/**
 * api.ts — Cliente HTTP centralizado do Plafin
 *
 * Todas as chamadas à API passam por aqui.
 * O token JWT é automaticamente incluído no header Authorization.
 *
 * 🛠 DEBUG:
 *   Em ambiente de desenvolvimento (npm run dev), cada chamada HTTP é
 *   logada automaticamente no console com: método, URL, status e tempo.
 *   Erros de API também são logados com o detalhe completo retornado pelo backend.
 *   Para ver os logs: abra o DevTools do navegador → aba "Console".
 */

const RAW_BASE_URL = import.meta.env.VITE_API_URL?.trim()
const IS_DEV = import.meta.env.DEV

function resolveBaseUrl(): string {
    if (RAW_BASE_URL) {
        return RAW_BASE_URL.replace(/\/+$/, '')
    }

    if (IS_DEV) {
        return 'http://localhost:8000'
    }

    return ''
}

function buildUrl(path: string): string {
    const baseUrl = resolveBaseUrl()

    if (!baseUrl) {
        throw new ApiRequestError(
            'VITE_API_URL nao configurada para este ambiente.',
        )
    }

    return `${baseUrl}${path}`
}

// ─── Tipos base ────────────────────────────────────────────────────────────────

export interface ApiError {
    detail: string
}

export class ApiRequestError extends Error {
    status?: number

    constructor(message: string, status?: number) {
        super(message)
        this.name = 'ApiRequestError'
        this.status = status
    }
}

// ─── Debug logger ──────────────────────────────────────────────────────────────
// Só imprime no console em modo desenvolvimento (npm run dev).
// Em produção (npm run build), todos os logs são silenciados automaticamente.

function logRequest(method: string, url: string, startTime: number, status: number) {
    if (!IS_DEV) return
    const elapsed = Math.round(performance.now() - startTime)
    const emoji = status >= 400 ? '❌' : status >= 300 ? '🔀' : '✅'
    console.debug(
        `%c[API] ${emoji} ${method} ${url} → ${status} (${elapsed}ms)`,
        `color: ${status >= 400 ? '#ef4444' : '#6366f1'}; font-weight: 600;`
    )
}

function logError(method: string, url: string, error: unknown) {
    if (!IS_DEV) return
    console.group(`%c[API] ❌ ERRO em ${method} ${url}`, 'color: #ef4444; font-weight: 700;')
    console.error('Detalhes:', error)
    console.groupEnd()
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getToken(): string | null {
    return localStorage.getItem('plafin_token')
}

function buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const token = getToken()
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extra,
    }
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }
    return headers
}

async function parseErrorMessage(res: Response): Promise<string> {
    const fallback = `HTTP ${res.status}`
    const contentType = res.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
        const err = await res.json().catch(() => null) as ApiError | null
        return err?.detail || fallback
    }

    const text = (await res.text().catch(() => '')).trim()
    return text || fallback
}

async function handleResponse<T>(res: Response, method: string, url: string, startTime: number): Promise<T> {
    logRequest(method, url, startTime, res.status)
    if (!res.ok) {
        const message = await parseErrorMessage(res)
        logError(method, url, message)
        throw new ApiRequestError(message, res.status)
    }
    if (res.status === 204) {
        return undefined as T
    }

    const text = await res.text()
    if (!text) {
        return undefined as T
    }

    try {
        return JSON.parse(text) as T
    } catch {
        return text as T
    }
}

// ─── Métodos ───────────────────────────────────────────────────────────────────

export const api = {
    async get<T>(path: string): Promise<T> {
        const t = performance.now()
        const url = buildUrl(path)
        const res = await fetch(url, { method: 'GET', headers: buildHeaders() })
        return handleResponse<T>(res, 'GET', path, t)
    },

    async post<T>(path: string, body?: unknown): Promise<T> {
        const t = performance.now()
        const url = buildUrl(path)
        const res = await fetch(url, {
            method: 'POST',
            headers: buildHeaders(),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        })
        return handleResponse<T>(res, 'POST', path, t)
    },

    async put<T>(path: string, body?: unknown): Promise<T> {
        const t = performance.now()
        const url = buildUrl(path)
        const res = await fetch(url, {
            method: 'PUT',
            headers: buildHeaders(),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        })
        return handleResponse<T>(res, 'PUT', path, t)
    },

    async patch<T>(path: string, body?: unknown): Promise<T> {
        const t = performance.now()
        const url = buildUrl(path)
        const res = await fetch(url, {
            method: 'PATCH',
            headers: buildHeaders(),
            body: body !== undefined ? JSON.stringify(body) : undefined,
        })
        return handleResponse<T>(res, 'PATCH', path, t)
    },

    async delete<T>(path: string): Promise<T> {
        const t = performance.now()
        const url = buildUrl(path)
        const res = await fetch(url, { method: 'DELETE', headers: buildHeaders() })
        return handleResponse<T>(res, 'DELETE', path, t)
    },
}

// ─── Auth API ──────────────────────────────────────────────────────────────────

export interface LoginPayload {
    email: string
    password: string
}

export interface RegisterPayload {
    email: string
    password: string
    full_name: string
    phone?: string
    business_name?: string
}

export interface UserProfile {
    id: string
    email: string
    full_name: string
    phone?: string
    business_name?: string
    plan: 'free' | 'pro'
    subscription_status?: string
}

export interface AuthResponse {
    access_token: string
    user: UserProfile
}

export const authApi = {
    login: (data: LoginPayload) =>
        api.post<AuthResponse>('/api/auth/login', data),

    register: (data: RegisterPayload) =>
        api.post<AuthResponse>('/api/auth/register', data),

    logout: () =>
        api.post<{ message: string }>('/api/auth/logout'),

    resetPassword: (email: string) =>
        api.post<{ message: string }>('/api/auth/reset-password', { email }),
}

// ─── Subscriptions API ─────────────────────────────────────────────────────────

export const subscriptionApi = {
    getStatus: () =>
        api.get<SubscriptionStatus>('/api/subscriptions/status'),

    createCheckout: (plan: 'pro', billing_cycle: 'monthly' = 'monthly') =>
        api.post<{ checkout_url: string; plan: 'pro'; billing_cycle: 'monthly' }>(
            '/api/subscriptions/create-checkout',
            { plan, billing_cycle },
        ),

    createPortal: () =>
        api.post<{ portal_url: string }>('/api/subscriptions/portal'),
}

export interface SubscriptionStatus {
    plan: 'free' | 'pro'
    subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing' | string
    subscription_expires_at?: string | null
    stripe_subscription_id?: string | null
    limits: {
        max_clients: number | null
        max_transactions_per_month: number | null
    }
    features: string[]
    usage: {
        clients_total: number
        transactions_month: number
        period: string
    }
}

// ─── AI API ────────────────────────────────────────────────────────────────────

export interface AnalysisResponse {
    analysis: string
    type: string
}

export interface ChatResponse {
    response: string
}

export const aiApi = {
    analyzeFinance: (type: 'finance' | 'clients' | 'full' = 'full') =>
        api.post<AnalysisResponse>('/api/ai/finance/analyze', { type }),

    chatFinance: (message: string) =>
        api.post<ChatResponse>('/api/ai/finance/chat', { message }),
}

// ─── Appointments API ──────────────────────────────────────────────────────────

export interface Appointment {
    id: string
    client_id: string
    client_name?: string
    date: string
    start_time: string
    end_time: string
    status: 'confirmado' | 'pendente' | 'cancelado' | 'concluido'
    notes?: string
    title?: string
    payment_status?: string
    value?: number
}

export interface AppointmentCreate {
    client_id: string
    date: string
    start_time: string
    end_time: string
    status?: 'confirmado' | 'pendente' | 'cancelado' | 'concluido'
    notes?: string
    title?: string
    payment_status?: string
    value?: number
}

export const appointmentsApi = {
    list: (month?: number, year?: number, status?: string) => {
        const params = new URLSearchParams()
        if (month) params.append('month', month.toString())
        if (year) params.append('year', year.toString())
        if (status) params.append('status', status)
        const query = params.toString()
        return api.get<Appointment[]>(`/api/appointments/${query ? `?${query}` : ''}`)
    },

    listToday: () =>
        api.get<Appointment[]>('/api/appointments/today'),

    getById: (id: string) =>
        api.get<Appointment>(`/api/appointments/${id}`),

    create: (data: AppointmentCreate) =>
        api.post<Appointment>('/api/appointments/', data),

    update: (id: string, data: Partial<AppointmentCreate>) =>
        api.put<Appointment>(`/api/appointments/${id}`, data),

    delete: (id: string) =>
        api.delete<{ message: string }>(`/api/appointments/${id}`),
}

// ─── Transactions API ──────────────────────────────────────────────────────────

export interface Transaction {
    id: string
    user_id: string
    type: 'receita' | 'despesa'
    description: string
    amount: number
    date: string
    category?: string
    status: 'pago' | 'pendente' | 'atrasado'
    payment_method?: string
    client_id?: string
    notes?: string
}

export interface TransactionCreate {
    type: 'receita' | 'despesa'
    description: string
    amount: number
    date: string
    category?: string
    status?: 'pago' | 'pendente' | 'atrasado'
    payment_method?: string
    client_id?: string
    notes?: string
}

export interface FinancialSummary {
    total_revenue: number
    total_expenses: number
    net_profit: number
    pending_receivables: number
    pending_payables: number
    transaction_count: number
}

export const transactionsApi = {
    list: (month?: number, year?: number, type?: string, status?: string) => {
        const params = new URLSearchParams()
        if (month) params.append('month', month.toString())
        if (year) params.append('year', year.toString())
        if (type) params.append('type', type)
        if (status) params.append('status', status)
        const query = params.toString()
        return api.get<Transaction[]>(`/api/transactions/${query ? `?${query}` : ''}`)
    },

    summary: (month: number, year: number) =>
        api.get<FinancialSummary>(`/api/transactions/summary?month=${month}&year=${year}`),

    getById: (id: string) =>
        api.get<Transaction>(`/api/transactions/${id}`),

    create: (data: TransactionCreate) =>
        api.post<Transaction>('/api/transactions/', data),

    update: (id: string, data: Partial<TransactionCreate>) =>
        api.put<Transaction>(`/api/transactions/${id}`, data),

    delete: (id: string) =>
        api.delete<void>(`/api/transactions/${id}`),
}

// ─── Clients API ───────────────────────────────────────────────────────────────

export interface Client {
    id: string
    full_name: string
    email?: string
    phone?: string
    address?: string
    notes?: string
    status?: 'ativo' | 'inativo'
    archived?: boolean
    total_spent?: number
    total_sessions?: number
    last_session_date?: string
    created_at?: string
}

export interface ClientCreate {
    full_name: string
    email?: string
    phone?: string
    address?: string
    notes?: string
    status?: 'ativo' | 'inativo'
}

export const clientsApi = {
    list: (search?: string, archived = false) => {
        const params = new URLSearchParams()
        if (search) params.append('search', search)
        params.append('archived', String(archived))
        return api.get<Client[]>(`/api/clients/?${params.toString()}`)
    },

    getById: (id: string) =>
        api.get<Client>(`/api/clients/${id}`),

    create: (data: ClientCreate) =>
        api.post<Client>('/api/clients/', data),

    update: (id: string, data: Partial<ClientCreate>) =>
        api.put<Client>(`/api/clients/${id}`, data),

    delete: (id: string) =>
        api.delete<void>(`/api/clients/${id}`),

    archive: (id: string) =>
        api.patch<{ message: string }>(`/api/clients/${id}/archive`, {}),

    reactivate: (id: string) =>
        api.patch<{ message: string }>(`/api/clients/${id}/reactivate`, {}),
}

// ─── Availability API ─────────────────────────────────────────────────────────

export interface AvailabilitySlot {
    start_time: string
    end_time: string
}

export const availabilityApi = {
    getSlots: (date: string) =>
        api.get<AvailabilitySlot[]>(`/api/availability/slots?date=${date}`),

    getConfig: () =>
        api.get<any>('/api/availability/config'),

    updateConfig: (data: any) =>
        api.post<any>('/api/availability/config', data),
}
