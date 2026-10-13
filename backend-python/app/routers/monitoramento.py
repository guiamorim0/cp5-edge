"""Rotas de leitura: valores atuais e historico para os graficos."""

import asyncio

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Grandeza, Leitura, PontoHistorico
from app.services import dispositivos as servico_dispositivos
from app.services import fiware

router = APIRouter(prefix="/api", tags=["monitoramento"])

GRANDEZAS = ("temperature", "humidity", "luminosity")


def _dispositivo(db: Session, dispositivo_id: int | None):
    """Dispositivo pedido, ou o padrao quando o dashboard nao especifica."""
    if dispositivo_id is None:
        return servico_dispositivos.padrao(db)
    return servico_dispositivos.buscar(db, dispositivo_id)


@router.get("/status", response_model=Leitura)
async def status(dispositivo_id: int | None = None, db: Session = Depends(get_db)):
    """Valores atuais do dispositivo (estado, sensores e alerta ativo)."""
    dispositivo = _dispositivo(db, dispositivo_id)
    return await fiware.ler_status(dispositivo.entity_name)


@router.get("/history/{grandeza}", response_model=list[PontoHistorico])
async def historico(
    grandeza: Grandeza,
    dispositivo_id: int | None = None,
    last_n: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Historico de uma grandeza no STH-Comet, pronto para o grafico."""
    dispositivo = _dispositivo(db, dispositivo_id)
    return await fiware.ler_historico(
        dispositivo.entity_name, dispositivo.entity_type, grandeza, last_n
    )


@router.get("/history")
async def historico_completo(
    dispositivo_id: int | None = None,
    last_n: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """As tres grandezas de uma vez, ja alinhadas por horario.

    O STH guarda cada atributo separadamente e os horarios nao batem
    exatamente. Aqui as tres series sao juntadas pelo segundo da leitura,
    para que o grafico desenhe as linhas sobre o mesmo eixo de tempo.
    """
    dispositivo = _dispositivo(db, dispositivo_id)

    series = await asyncio.gather(
        *(
            fiware.ler_historico(
                dispositivo.entity_name, dispositivo.entity_type, grandeza, last_n
            )
            for grandeza in GRANDEZAS
        )
    )

    linha_do_tempo: dict[str, dict] = {}
    for grandeza, pontos in zip(GRANDEZAS, series):
        for ponto in pontos:
            momento = ponto.time[:19]
            linha_do_tempo.setdefault(momento, {"time": momento})[grandeza] = ponto.value

    return [linha_do_tempo[momento] for momento in sorted(linha_do_tempo)]
