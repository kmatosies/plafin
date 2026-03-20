from slowapi import Limiter
from slowapi.util import get_remote_address

# Inicializando Rate Limiter globalmente (Limita requests por IP)
limiter = Limiter(key_func=get_remote_address)
