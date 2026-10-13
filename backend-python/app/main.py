"""Aplicacao FastAPI do sistema de monitoramento de vinherias.

Camada de aplicacao: conecta o dashboard ao FIWARE, resolve o CORS (o Orion
nao devolve os headers necessarios), guarda limites, estoque e historico no
banco, e roda a logica de alerta e de acionamento dos atuadores. Tambem serve
o build do React em producao, para que o sistema inteiro fique acessivel numa
unica URL.
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import criar_tabelas
from app.routers import (
    controle,
    dispositivos,
    monitoramento,
    relatorios,
    simulacao,
    triggers,
    vinhos,
)


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    """Cria as tabelas que faltarem antes de aceitar requisicoes."""
    criar_tabelas()
    yield


app = FastAPI(
    title="API - Monitoramento de Vinherias",
    description=(
        "Integracao entre o dashboard e o FIWARE (Orion, IoT Agent e STH-Comet), "
        "com limites por dispositivo, estoque de vinhos, indice de saude e relatorios."
    ),
    version="2.0.0",
    lifespan=ciclo_de_vida,
)

# Liberado durante o desenvolvimento, quando o React roda na porta 5173.
# Em producao o front e servido por esta mesma aplicacao e o CORS deixa de importar.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(monitoramento.router)
app.include_router(controle.router)
app.include_router(triggers.router)
app.include_router(dispositivos.router)
app.include_router(vinhos.router)
app.include_router(relatorios.router)
app.include_router(simulacao.router)


@app.get("/api/health", tags=["monitoramento"])
async def health():
    """Verifica se a API esta no ar e para qual FIWARE ela aponta."""
    return {"status": "ok", "orion": settings.orion_url, "sth": settings.sth_url}


# Build do React (gerado por npm run build). So e montado se a pasta existir,
# para nao atrapalhar quem esta rodando so a API no desenvolvimento.
PASTA_FRONT = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if PASTA_FRONT.exists():
    app.mount("/assets", StaticFiles(directory=PASTA_FRONT / "assets"), name="assets")

    @app.get("/{caminho:path}", include_in_schema=False)
    async def servir_front(caminho: str):
        """Entrega o index.html para qualquer rota do SPA."""
        arquivo = PASTA_FRONT / caminho
        if caminho and arquivo.is_file():
            return FileResponse(arquivo)
        return FileResponse(PASTA_FRONT / "index.html")
