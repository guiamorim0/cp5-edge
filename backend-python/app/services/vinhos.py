"""Estoque de vinhos.

Cada lote fica vinculado ao dispositivo que monitora o ambiente onde ele
esta guardado. E essa ligacao que da sentido ao monitoramento: nao e so
"a temperatura subiu", e sim "a temperatura subiu onde estao 240 garrafas
de Cabernet 2018".
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import NovoVinho
from app.schema import Vinho
from app.services import dispositivos as servico_dispositivos


def listar(db: Session, dispositivo_id: int | None = None) -> list[Vinho]:
    consulta = db.query(Vinho)
    if dispositivo_id is not None:
        consulta = consulta.filter(Vinho.dispositivo_id == dispositivo_id)
    return consulta.order_by(Vinho.nome).all()


def buscar(db: Session, vinho_id: int) -> Vinho:
    vinho = db.get(Vinho, vinho_id)
    if vinho is None:
        raise HTTPException(404, f"Vinho {vinho_id} nao encontrado")
    return vinho


def cadastrar(db: Session, dispositivo_id: int, dados: NovoVinho) -> Vinho:
    """Cadastra um lote no ambiente de um dispositivo."""
    servico_dispositivos.buscar(db, dispositivo_id)  # valida que existe

    vinho = Vinho(dispositivo_id=dispositivo_id, **dados.model_dump())
    db.add(vinho)
    db.commit()
    db.refresh(vinho)
    return vinho


def atualizar(db: Session, vinho_id: int, dados: NovoVinho) -> Vinho:
    vinho = buscar(db, vinho_id)
    for campo, valor in dados.model_dump().items():
        setattr(vinho, campo, valor)
    db.commit()
    db.refresh(vinho)
    return vinho


def ajustar_quantidade(db: Session, vinho_id: int, delta: int) -> Vinho:
    """Soma (ou subtrai) garrafas do lote. Usado nas entradas e saidas."""
    vinho = buscar(db, vinho_id)
    nova = vinho.quantidade + delta
    if nova < 0:
        raise HTTPException(400, "A quantidade nao pode ficar negativa")
    vinho.quantidade = nova
    db.commit()
    db.refresh(vinho)
    return vinho


def remover(db: Session, vinho_id: int) -> dict:
    vinho = buscar(db, vinho_id)
    db.delete(vinho)
    db.commit()
    return {"id": vinho_id, "status": "removido"}
