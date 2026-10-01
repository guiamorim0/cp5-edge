"""Modelos de dados trocados entre o dashboard e a API."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

# Grandezas monitoradas. Usado para validar as rotas de historico e de triggers.
Grandeza = Literal["temperature", "humidity", "luminosity"]


class Leitura(BaseModel):
    """Valores atuais lidos do dispositivo."""

    id: str
    state: str = "unknown"
    luminosity: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    alert: str = "normal"


class PontoHistorico(BaseModel):
    """Um ponto do grafico: momento da leitura e valor."""

    time: str
    value: Optional[float]


class FaixaTrigger(BaseModel):
    """Limites aceitaveis de uma grandeza. Fora disso, dispara alerta."""

    minimo: float
    maximo: float


class Triggers(BaseModel):
    """Conjunto de limites configurado pelo usuario no dashboard."""

    temperature: FaixaTrigger = FaixaTrigger(minimo=10, maximo=30)
    humidity: FaixaTrigger = FaixaTrigger(minimo=40, maximo=80)
    luminosity: FaixaTrigger = FaixaTrigger(minimo=10, maximo=90)


class NovoDispositivo(BaseModel):
    """Dados para cadastrar um IoT Device no IoT Agent."""

    device_id: str = Field(..., examples=["lamp002"])
    entity_name: str = Field(..., examples=["urn:ngsi-ld:Lamp:002"])
    entity_type: str = "Lamp"


class ResultadoAlerta(BaseModel):
    """Resposta da avaliacao dos triggers."""

    anomalia: Optional[str] = None
    comando_enviado: Optional[str] = None
    mensagem: str
