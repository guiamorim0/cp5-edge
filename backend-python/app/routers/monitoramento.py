"""Rotas de leitura: valores atuais e historico para os graficos."""

from fastapi import APIRouter, Query

from app.models import Grandeza, Leitura, PontoHistorico
from app.services import fiware

router = APIRouter(prefix="/api", tags=["monitoramento"])


@router.get("/status", response_model=Leitura)
async def status():
    """Valores atuais do dispositivo (estado, sensores e alerta ativo)."""
    return await fiware.ler_status()


@router.get("/history/{grandeza}", response_model=list[PontoHistorico])
async def historico(grandeza: Grandeza, last_n: int = Query(100, ge=1, le=100)):
    """Historico da grandeza no STH-Comet, pronto para o grafico.

    O limite de 100 pontos evita respostas gigantes: sao tres leituras a
    cada 5 segundos, entao o historico cresce rapido.
    """
    return await fiware.ler_historico(grandeza, last_n)
