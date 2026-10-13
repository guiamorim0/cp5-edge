"""Rotas de indice de saude e relatorios."""

from fastapi import APIRouter, Depends
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Relatorio, SaudeDispositivo
from app.services import dispositivos as servico_dispositivos
from app.services import saude as servico

router = APIRouter(prefix="/api/relatorios", tags=["relatorios"])


@router.get("/saude", response_model=SaudeDispositivo)
def saude_dispositivo(dispositivo_id: int | None = None, db: Session = Depends(get_db)):
    """Indice de saude de um ambiente: 100 pontos, menos 1 por incidente."""
    dispositivo = (
        servico_dispositivos.padrao(db)
        if dispositivo_id is None
        else servico_dispositivos.buscar(db, dispositivo_id)
    )
    return servico.calcular(db, dispositivo)


@router.get("/saude/todos", response_model=list[SaudeDispositivo])
def saude_todos(db: Session = Depends(get_db)):
    """Saude de todos os ambientes, para comparar de relance."""
    return [servico.calcular(db, d) for d in servico_dispositivos.listar(db)]


@router.get("", response_model=Relatorio)
def relatorio(db: Session = Depends(get_db)):
    """Relatorio consolidado da operacao, um dispositivo por linha."""
    return servico.gerar_relatorio(db)


@router.get("/csv", response_class=PlainTextResponse)
def relatorio_csv(db: Session = Depends(get_db)):
    """Mesmo relatorio em CSV, para abrir no Excel."""
    return servico.relatorio_csv(servico.gerar_relatorio(db))
