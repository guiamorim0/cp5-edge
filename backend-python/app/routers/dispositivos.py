"""Rotas de cadastro e gerenciamento dos dispositivos."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DispositivoOut, NovoDispositivo
from app.services import dispositivos as servico

router = APIRouter(prefix="/api/devices", tags=["dispositivos"])


@router.get("", response_model=list[DispositivoOut])
def listar(db: Session = Depends(get_db)):
    """Dispositivos cadastrados."""
    return servico.listar(db)


@router.get("/padrao", response_model=DispositivoOut)
def padrao(db: Session = Depends(get_db)):
    """Dispositivo usado pelo dashboard quando nenhum foi escolhido."""
    return servico.padrao(db)


@router.post("", response_model=DispositivoOut, status_code=201)
async def cadastrar(dados: NovoDispositivo, db: Session = Depends(get_db)):
    """Provisiona no FIWARE e cadastra no banco, com limites padrao de adega."""
    return await servico.cadastrar(db, dados)


@router.delete("/{dispositivo_id}")
async def remover(dispositivo_id: int, db: Session = Depends(get_db)):
    """Remove o dispositivo, seus limites, vinhos e historico."""
    return await servico.remover(db, dispositivo_id)
