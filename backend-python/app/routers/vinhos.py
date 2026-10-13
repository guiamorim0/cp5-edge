"""Rotas do estoque de vinhos."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import NovoVinho, VinhoComSaude, VinhoOut
from app.services import saude as servico_saude
from app.services import vinhos as servico

router = APIRouter(prefix="/api/vinhos", tags=["vinhos"])


@router.get("", response_model=list[VinhoComSaude])
def listar(dispositivo_id: int | None = None, db: Session = Depends(get_db)):
    """Lotes cadastrados, cada um com a saude do ambiente onde esta guardado."""
    return servico_saude.vinhos_com_saude(db, dispositivo_id)


@router.post("", response_model=VinhoOut, status_code=201)
def cadastrar(dispositivo_id: int, dados: NovoVinho, db: Session = Depends(get_db)):
    """Cadastra um lote no ambiente de um dispositivo."""
    return servico.cadastrar(db, dispositivo_id, dados)


@router.put("/{vinho_id}", response_model=VinhoOut)
def atualizar(vinho_id: int, dados: NovoVinho, db: Session = Depends(get_db)):
    return servico.atualizar(db, vinho_id, dados)


@router.post("/{vinho_id}/movimentar", response_model=VinhoOut)
def movimentar(vinho_id: int, delta: int, db: Session = Depends(get_db)):
    """Entrada ou saida de garrafas. delta positivo entra, negativo sai."""
    return servico.ajustar_quantidade(db, vinho_id, delta)


@router.delete("/{vinho_id}")
def remover(vinho_id: int, db: Session = Depends(get_db)):
    return servico.remover(db, vinho_id)
