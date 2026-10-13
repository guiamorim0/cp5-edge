"""Tabelas do banco de dados.

Modelo de dominio do sistema:

    Dispositivo  1--N  Trigger    (limites proprios de cada dispositivo)
    Dispositivo  1--N  Vinho      (o que esta armazenado naquele ambiente)
    Dispositivo  1--N  Evento     (incidentes de alerta)
    Dispositivo  1--N  Comando    (auditoria do que foi enviado)

Cada dispositivo representa um ambiente monitorado (uma sala, um barril,
uma adega), com seus proprios limites e seu proprio estoque de vinhos.
"""

from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


def agora() -> datetime:
    return datetime.now(timezone.utc)


class Dispositivo(Base):
    """Um ESP32 monitorando um ambiente."""

    __tablename__ = "dispositivos"

    id = Column(Integer, primary_key=True)
    device_id = Column(String(64), unique=True, nullable=False, index=True)
    entity_name = Column(String(128), nullable=False)
    entity_type = Column(String(64), nullable=False, default="Lamp")

    # Identificacao para o usuario, nao para o FIWARE
    nome = Column(String(128), nullable=False)
    local = Column(String(128), default="")

    ativo = Column(Boolean, default=True, nullable=False)
    criado_em = Column(DateTime, default=agora, nullable=False)

    triggers = relationship("Trigger", back_populates="dispositivo", cascade="all, delete-orphan")
    vinhos = relationship("Vinho", back_populates="dispositivo", cascade="all, delete-orphan")
    eventos = relationship("Evento", back_populates="dispositivo", cascade="all, delete-orphan")
    comandos = relationship("Comando", back_populates="dispositivo", cascade="all, delete-orphan")


class Trigger(Base):
    """Faixa aceitavel de uma grandeza, por dispositivo.

    Cada ambiente tem suas proprias exigencias: um tinto de guarda pede
    temperatura mais baixa que uma sala de degustacao.
    """

    __tablename__ = "triggers"

    id = Column(Integer, primary_key=True)
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"), nullable=False, index=True)

    grandeza = Column(String(32), nullable=False)  # temperature, humidity, luminosity
    minimo = Column(Float, nullable=False)
    maximo = Column(Float, nullable=False)

    dispositivo = relationship("Dispositivo", back_populates="triggers")


class Vinho(Base):
    """Um lote de vinho armazenado no ambiente de um dispositivo."""

    __tablename__ = "vinhos"

    id = Column(Integer, primary_key=True)
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"), nullable=False, index=True)

    nome = Column(String(128), nullable=False)
    tipo = Column(String(64), default="")       # tinto, branco, rose, espumante
    safra = Column(Integer, nullable=True)
    quantidade = Column(Integer, default=0, nullable=False)

    # Comeca em 100 e perde pontos a cada incidente no ambiente onde esta
    saude_inicial = Column(Integer, default=100, nullable=False)

    criado_em = Column(DateTime, default=agora, nullable=False)

    dispositivo = relationship("Dispositivo", back_populates="vinhos")


class Evento(Base):
    """Um incidente: periodo em que uma grandeza ficou fora da faixa."""

    __tablename__ = "eventos"

    id = Column(Integer, primary_key=True)
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"), nullable=False, index=True)

    grandeza = Column(String(32), nullable=False)
    inicio = Column(DateTime, default=agora, nullable=False)
    fim = Column(DateTime, nullable=True)  # nulo enquanto o alerta esta ativo

    valor = Column(Float, nullable=True)         # leitura que disparou
    limite_minimo = Column(Float, nullable=False)
    limite_maximo = Column(Float, nullable=False)
    duracao_segundos = Column(Integer, nullable=True)

    dispositivo = relationship("Dispositivo", back_populates="eventos")


class Comando(Base):
    """Auditoria: todo comando enviado ao dispositivo fica registrado aqui."""

    __tablename__ = "comandos"

    id = Column(Integer, primary_key=True)
    dispositivo_id = Column(Integer, ForeignKey("dispositivos.id"), nullable=False, index=True)

    comando = Column(String(64), nullable=False)
    origem = Column(String(32), nullable=False)  # manual (usuario) ou automatico (trigger)
    sucesso = Column(Boolean, default=True, nullable=False)
    detalhe = Column(Text, default="")
    momento = Column(DateTime, default=agora, nullable=False, index=True)

    dispositivo = relationship("Dispositivo", back_populates="comandos")
