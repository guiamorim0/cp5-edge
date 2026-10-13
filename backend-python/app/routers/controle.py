"""Rotas de comando: lampada, alertas manuais e atuadores."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ComandoOut
from app.services import comandos as servico_comandos
from app.services import dispositivos as servico_dispositivos
from app.services import fiware

router = APIRouter(prefix="/api", tags=["controle"])


def _dispositivo(db: Session, dispositivo_id: int | None):
    if dispositivo_id is None:
        return servico_dispositivos.padrao(db)
    return servico_dispositivos.buscar(db, dispositivo_id)


@router.post("/lamp/{acao}")
async def controlar_lampada(
    acao: str, dispositivo_id: int | None = None, db: Session = Depends(get_db)
):
    """Liga ou desliga a lampada (acao = on ou off)."""
    if acao not in fiware.COMANDOS_LAMPADA:
        raise HTTPException(400, "Acao invalida. Use on ou off")
    return await servico_comandos.enviar(db, _dispositivo(db, dispositivo_id), acao)


@router.post("/alerts/{comando}")
async def acionar_alerta(
    comando: str, dispositivo_id: int | None = None, db: Session = Depends(get_db)
):
    """Aciona ou encerra um alerta manualmente, sem passar pelos triggers.

    Serve para demonstrar cada cor e cada som na apresentacao.
    """
    if comando not in fiware.COMANDOS_ALERTA:
        raise HTTPException(400, f"Comando invalido. Use: {sorted(fiware.COMANDOS_ALERTA)}")
    return await servico_comandos.enviar(db, _dispositivo(db, dispositivo_id), comando)


@router.post("/atuadores/{comando}")
async def acionar_atuador(
    comando: str, dispositivo_id: int | None = None, db: Session = Depends(get_db)
):
    """Liga ou desliga um atuador: ar condicionado, umidificador ou luz.

    luz0 apaga, luz1 a luz3 definem a intensidade.
    """
    if comando not in fiware.COMANDOS_ATUADORES:
        raise HTTPException(400, f"Comando invalido. Use: {sorted(fiware.COMANDOS_ATUADORES)}")
    return await servico_comandos.enviar(db, _dispositivo(db, dispositivo_id), comando)


@router.get("/comandos", response_model=list[ComandoOut])
def listar_comandos(
    dispositivo_id: int | None = None, limite: int = 100, db: Session = Depends(get_db)
):
    """Log de auditoria: todo comando enviado, com origem e resultado."""
    return servico_comandos.listar(db, dispositivo_id, limite)
