"""Historico de incidentes.

Enquanto o STH-Comet guarda os VALORES lidos, aqui ficam os INCIDENTES:
quando cada alerta comecou, quando terminou e qual valor o disparou. E essa
a informacao que interessa a quem cuida da vinheria ("a temperatura passou do
limite tres vezes esta semana"), e nao a serie bruta de leituras.
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.schema import Dispositivo, Evento


def listar(db: Session, dispositivo_id: int | None = None, limite: int = 100) -> list[Evento]:
    """Eventos mais recentes primeiro, opcionalmente de um dispositivo so."""
    consulta = db.query(Evento)
    if dispositivo_id is not None:
        consulta = consulta.filter(Evento.dispositivo_id == dispositivo_id)
    return consulta.order_by(Evento.inicio.desc()).limit(limite).all()


def em_aberto(db: Session, dispositivo_id: int) -> Evento | None:
    """O incidente ainda nao encerrado deste dispositivo, se houver."""
    return (
        db.query(Evento)
        .filter(Evento.dispositivo_id == dispositivo_id, Evento.fim.is_(None))
        .order_by(Evento.inicio.desc())
        .first()
    )


def abrir(
    db: Session,
    dispositivo: Dispositivo,
    grandeza: str,
    valor: float | None,
    minimo: float,
    maximo: float,
) -> Evento:
    """Registra o inicio de um incidente."""
    evento = Evento(
        dispositivo_id=dispositivo.id,
        grandeza=grandeza,
        valor=valor,
        limite_minimo=minimo,
        limite_maximo=maximo,
    )
    db.add(evento)
    db.commit()
    db.refresh(evento)
    return evento


def encerrar(db: Session, dispositivo_id: int) -> Evento | None:
    """Fecha o incidente em aberto e calcula quanto tempo durou."""
    evento = em_aberto(db, dispositivo_id)
    if evento is None:
        return None

    fim = datetime.now(timezone.utc)
    inicio = evento.inicio
    # O SQLite devolve datas sem fuso: assume UTC para a subtracao funcionar
    if inicio.tzinfo is None:
        inicio = inicio.replace(tzinfo=timezone.utc)

    evento.fim = fim
    evento.duracao_segundos = int((fim - inicio).total_seconds())
    db.commit()
    db.refresh(evento)
    return evento


def contar_por_dispositivo(db: Session, dispositivo_id: int) -> dict[str, int]:
    """Quantos incidentes por grandeza. Base do indice de saude."""
    contagem = {"temperature": 0, "humidity": 0, "luminosity": 0}
    for evento in db.query(Evento).filter(Evento.dispositivo_id == dispositivo_id).all():
        if evento.grandeza in contagem:
            contagem[evento.grandeza] += 1
    return contagem
