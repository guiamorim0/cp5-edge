"""Rotas dos limites configuraveis, da avaliacao automatica e dos incidentes."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import EventoOut, ResultadoAlerta, Triggers
from app.services import dispositivos as servico_dispositivos
from app.services import eventos as servico_eventos
from app.services import fiware
from app.services import triggers as servico

router = APIRouter(prefix="/api/triggers", tags=["triggers"])


def _dispositivo(db: Session, dispositivo_id: int | None):
    if dispositivo_id is None:
        return servico_dispositivos.padrao(db)
    return servico_dispositivos.buscar(db, dispositivo_id)


@router.get("", response_model=Triggers)
def obter(dispositivo_id: int | None = None, db: Session = Depends(get_db)):
    """Limites configurados para o dispositivo."""
    return servico.ler(db, _dispositivo(db, dispositivo_id).id)


@router.put("", response_model=Triggers)
def atualizar(novos: Triggers, dispositivo_id: int | None = None, db: Session = Depends(get_db)):
    """Salva os limites definidos pelo usuario no dashboard."""
    return servico.salvar(db, _dispositivo(db, dispositivo_id).id, novos)


@router.post("/avaliar", response_model=ResultadoAlerta)
async def avaliar(dispositivo_id: int | None = None, db: Session = Depends(get_db)):
    """Le o dispositivo, compara com os limites e aciona alerta e atuador.

    O dashboard chama esta rota junto com o polling do status. E assim que o
    alerta e "ativado pelo front-end": quem decide e esta camada, com os
    limites que o usuario configurou na tela.
    """
    dispositivo = _dispositivo(db, dispositivo_id)
    leitura = await fiware.ler_status(dispositivo.entity_name)
    return await servico.avaliar_e_acionar(db, dispositivo, leitura)


@router.get("/eventos", response_model=list[EventoOut])
def listar_eventos(
    dispositivo_id: int | None = None, limite: int = 100, db: Session = Depends(get_db)
):
    """Historico dos incidentes, do mais recente para o mais antigo."""
    return servico_eventos.listar(db, dispositivo_id, limite)
