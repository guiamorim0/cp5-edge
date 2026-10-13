"""Cadastro de dispositivos.

Um dispositivo existe em dois lugares: no IoT Agent (que sabe traduzir as
mensagens MQTT) e no banco local (que guarda nome, local, limites, vinhos e
historico de incidentes). Este modulo mantem os dois em sincronia.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import FAIXAS_PADRAO, NovoDispositivo
from app.schema import Dispositivo, Trigger
from app.services import fiware


def listar(db: Session) -> list[Dispositivo]:
    return db.query(Dispositivo).order_by(Dispositivo.id).all()


def buscar(db: Session, dispositivo_id: int) -> Dispositivo:
    dispositivo = db.get(Dispositivo, dispositivo_id)
    if dispositivo is None:
        raise HTTPException(404, f"Dispositivo {dispositivo_id} nao encontrado")
    return dispositivo


def buscar_por_device_id(db: Session, device_id: str) -> Dispositivo | None:
    return db.query(Dispositivo).filter(Dispositivo.device_id == device_id).first()


def padrao(db: Session) -> Dispositivo:
    """Primeiro dispositivo ativo, usado quando o dashboard ainda nao escolheu um."""
    dispositivo = db.query(Dispositivo).filter(Dispositivo.ativo).order_by(Dispositivo.id).first()
    if dispositivo is None:
        raise HTTPException(404, "Nenhum dispositivo cadastrado. Cadastre um para comecar.")
    return dispositivo


def _criar_triggers_padrao(db: Session, dispositivo: Dispositivo) -> None:
    """Todo dispositivo nasce com as faixas de referencia para adega."""
    for grandeza, (minimo, maximo) in FAIXAS_PADRAO.items():
        db.add(
            Trigger(
                dispositivo_id=dispositivo.id, grandeza=grandeza, minimo=minimo, maximo=maximo
            )
        )
    db.commit()


async def cadastrar(db: Session, dados: NovoDispositivo) -> Dispositivo:
    """Provisiona no FIWARE e grava no banco, com limites padrao e subscription.

    O provisionamento vem primeiro: se o FIWARE recusar, nada e gravado
    localmente e o banco nao fica com um dispositivo que nao existe la.
    """
    if buscar_por_device_id(db, dados.device_id):
        raise HTTPException(409, f"Ja existe um dispositivo com id {dados.device_id}")

    await fiware.provisionar(dados.device_id, dados.entity_name, dados.entity_type)

    dispositivo = Dispositivo(
        device_id=dados.device_id,
        entity_name=dados.entity_name,
        entity_type=dados.entity_type,
        nome=dados.nome,
        local=dados.local,
    )
    db.add(dispositivo)
    db.commit()
    db.refresh(dispositivo)

    _criar_triggers_padrao(db, dispositivo)

    # A subscription pode falhar sem invalidar o cadastro: sem ela o
    # dispositivo funciona, so nao alimenta o grafico de historico.
    try:
        await fiware.criar_subscription(dados.entity_name, dados.entity_type)
    except HTTPException:
        pass

    db.refresh(dispositivo)
    return dispositivo


async def remover(db: Session, dispositivo_id: int) -> dict:
    """Remove do IoT Agent e do banco, junto com limites, vinhos e historico."""
    dispositivo = buscar(db, dispositivo_id)

    try:
        await fiware.desprovisionar(dispositivo.device_id)
    except HTTPException as erro:
        # 404 no FIWARE significa que ja nao existe la: seguimos e limpamos o banco
        if erro.status_code != 404:
            raise

    db.delete(dispositivo)
    db.commit()
    return {"device_id": dispositivo.device_id, "status": "removido"}
