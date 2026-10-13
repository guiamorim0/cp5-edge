"""Log de comandos.

Registra tudo que foi enviado aos dispositivos, com origem e resultado.
Serve de auditoria ("quem desligou a luz da adega as 3 da manha?") e de
evidencia de que a automacao agiu quando precisou.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.schema import Comando, Dispositivo
from app.services import fiware


def registrar(
    db: Session,
    dispositivo: Dispositivo,
    comando: str,
    origem: str,
    sucesso: bool = True,
    detalhe: str = "",
) -> Comando:
    """Grava uma linha no log. origem e 'manual' ou 'automatico'."""
    registro = Comando(
        dispositivo_id=dispositivo.id,
        comando=comando,
        origem=origem,
        sucesso=sucesso,
        detalhe=detalhe,
    )
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


async def enviar(
    db: Session, dispositivo: Dispositivo, comando: str, origem: str = "manual"
) -> dict:
    """Envia o comando ao dispositivo e registra o resultado no log.

    Toda saida de comando passa por aqui: assim nenhum envio escapa da
    auditoria, inclusive os que falham.
    """
    try:
        resultado = await fiware.enviar_comando(dispositivo.entity_name, comando)
    except HTTPException as erro:
        registrar(db, dispositivo, comando, origem, sucesso=False, detalhe=str(erro.detail))
        raise

    registrar(db, dispositivo, comando, origem)
    return resultado


def listar(db: Session, dispositivo_id: int | None = None, limite: int = 100) -> list[Comando]:
    """Comandos mais recentes primeiro, opcionalmente de um dispositivo so."""
    consulta = db.query(Comando)
    if dispositivo_id is not None:
        consulta = consulta.filter(Comando.dispositivo_id == dispositivo_id)
    return consulta.order_by(Comando.momento.desc()).limit(limite).all()
