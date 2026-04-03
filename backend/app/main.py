"""
SaaS Finance Agenda — Aplicação Principal.
FastAPI app com todos os routers e CORS configurado.

🛠 DEBUG / LOGGING:
  Cada request HTTP é logado automaticamente com:
    - Método (GET, POST, ...)
    - Path da rota
    - Status code da resposta
    - Tempo de processamento em ms

  Para ver os logs:
    - Local: saída do terminal onde roda "uvicorn app.main:app --reload"
    - Render/Railway: painel de logs da plataforma
    - Logs de erro (4xx/5xx) aparecem em WARNING/ERROR para fácil filtragem.
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.routers import auth, dashboard, transactions, appointments, clients, subscriptions, ai, availability, stripe_webhook
from app.services.notification_service import notification_service
from app.limiter import limiter

# ─── Configuração de logging ──────────────────────────────────────────────────
# Formato: timestamp | nível | módulo | mensagem
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("plafin.api")

# --- Inicializar app ---
settings = get_settings()


def build_allowed_origins() -> list[str]:
    origins = {
        settings.frontend_url.rstrip("/"),
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    }

    if settings.frontend_origins:
        origins.update(
            origin.strip().rstrip("/")
            for origin in settings.frontend_origins.split(",")
            if origin.strip()
        )

    return sorted(origin for origin in origins if origin)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: iniciar worker de notificações em background
    logger.info("Iniciando worker de notificações...")
    task = asyncio.create_task(notification_worker_loop())
    yield
    # Shutdown: cancelar a task
    logger.info("Encerrando worker de notificações...")
    task.cancel()

async def notification_worker_loop():
    """Loop que processa notificações pendentes a cada 1 minuto."""
    while True:
        try:
            # Processar um lote de notificações
            result = notification_service.process_pending_notifications(batch_size=20)
            if result["total"] > 0:
                logger.info(f"Worker: Processadas {result['total']} notificações ({result['sent']} sucesso, {result['failed']} falha)")
        except Exception as e:
            # Condense error to avoid spamming the logs endlessly if key is just invalid
            logger.error(f"Erro no loop do notification_worker: {e}")
            await asyncio.sleep(300) # Dorme 5 min se deu erro grave para não 'floodar' com invalid key
        
        await asyncio.sleep(60) # Esperar 1 minuto

app = FastAPI(
    title="Finance Agenda API",
    description="API do sistema SaaS de gestão financeira, agenda e automação com IA.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Integrar SlowAPI
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── Middleware de logging de requests ───────────────────────────────────────
# 🛠 DEBUG: Este middleware grava uma linha de log para cada requisição recebida.
# Exemplo de saída:
#   2026-03-10 21:00:00 | INFO     | plafin.api | GET /api/dashboard/ → 200 (45ms)
#   2026-03-10 21:00:01 | WARNING  | plafin.api | POST /api/auth/login → 401 (12ms)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000)
    status = response.status_code
    msg = f"{request.method} {request.url.path} → {status} ({elapsed_ms}ms)"

    if status >= 500:
        logger.error(msg)
    elif status >= 400:
        logger.warning(msg)
    else:
        logger.info(msg)

    return response

# --- CORS ---
# Configuração dinâmica: aceita a URL do frontend do .env e localhost para desenvolvimento
origins = build_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
app.include_router(stripe_webhook.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(availability.router, tags=["Availability"], prefix="/api/availability")


# --- Rota raiz ---
@app.get("/")
async def root():
    logger.info("Health check via raiz (/)")
    return {
        "app": settings.app_name,
        "version": "1.0.0",
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "frontend_url": settings.frontend_url.rstrip("/"),
    }

