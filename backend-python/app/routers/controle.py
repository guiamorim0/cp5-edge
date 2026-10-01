"""Rotas de comando: lampada e alertas manuais."""

from fastapi import APIRouter, HTTPException

from app.services import fiware

router = APIRouter(prefix="/api", tags=["controle"])


@router.post("/lamp/{acao}")
async def controlar_lampada(acao: str):
    """Liga ou desliga a lampada (acao = on ou off)."""
    if acao not in {"on", "off"}:
        raise HTTPException(400, "Acao invalida. Use on ou off")
    return await fiware.enviar_comando(acao)


@router.post("/alerts/{comando}")
async def acionar_alerta(comando: str):
    """Aciona ou encerra um alerta manualmente, sem passar pelos triggers.

    Serve para testar o buzzer e cada padrao de piscada na apresentacao.
    """
    permitidos = {"alerttemp", "alerthum", "alertlum", "alertoff"}
    if comando not in permitidos:
        raise HTTPException(400, f"Comando invalido. Use um destes: {sorted(permitidos)}")
    return await fiware.enviar_comando(comando)
