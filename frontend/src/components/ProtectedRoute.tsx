/**
 * ProtectedRoute.tsx — Wrapper para rotas que exigem autenticação
 * 
 * Redireciona para /login se o usuário não estiver autenticado.
 */

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuth()

    // Enquanto carrega do localStorage, não redireciona ainda
    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                background: '#f8fafc',
            }}>
                <div style={{
                    width: 40,
                    height: 40,
                    border: '3px solid #e2e8f0',
                    borderTopColor: '#2E294E',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                }} />
            </div>
        )
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
