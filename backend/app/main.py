"""
SaaS Finance Agenda — Aplicação Principal.
FastAPI app com todos os routers e CORS configurado.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, dashboard, transactions, appointments, clients, subscriptions, ai

# --- Inicializar app ---
settings = get_settings()

app = FastAPI(
    title="Finance Agenda API",
    description="API do sistema SaaS de gestão financeira, agenda e automação com IA.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Registrar routers ---
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(transactions.router, prefix="/api")
app.include_router(appointments.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(subscriptions.router, prefix="/api")
app.include_router(ai.router, prefix="/api")


# --- Rota raiz ---
@app.get("/")
async def root():
    return {
        "app": settings.app_name,
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
