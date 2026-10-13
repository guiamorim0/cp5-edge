"""Modelos de entrada e saida da API (Pydantic).

Separados das tabelas do banco (app/schema.py) de proposito: o que o
dashboard envia e recebe nao precisa ser igual ao que fica armazenado.
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

# Grandezas monitoradas. Usado para validar rotas de historico e de triggers.
Grandeza = Literal["temperature", "humidity", "luminosity"]

# Faixas de referencia para armazenamento de vinho (adega).
# Temperatura estavel entre 12 e 18 graus, umidade entre 60 e 80 por cento
# para nao ressecar a rolha, e luminosidade baixa, porque a luz degrada o vinho.
FAIXAS_PADRAO: dict[str, tuple[float, float]] = {
    "temperature": (12.0, 18.0),
    "humidity": (60.0, 80.0),
    "luminosity": (0.0, 30.0),
}


# ---------------------------------------------------------------- leituras


class Leitura(BaseModel):
    """Valores atuais lidos de um dispositivo."""

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


# ---------------------------------------------------------------- dispositivos


class DispositivoBase(BaseModel):
    device_id: str = Field(..., examples=["lamp002"])
    entity_name: str = Field(..., examples=["urn:ngsi-ld:Lamp:002"])
    entity_type: str = "Lamp"
    nome: str = Field(..., examples=["Adega principal"])
    local: str = ""


class NovoDispositivo(DispositivoBase):
    """Dados para cadastrar um dispositivo. Os limites nascem nos padroes de adega."""


class DispositivoOut(DispositivoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ativo: bool
    criado_em: datetime


# ---------------------------------------------------------------- triggers


class FaixaTrigger(BaseModel):
    """Limites aceitaveis de uma grandeza."""

    minimo: float
    maximo: float


class Triggers(BaseModel):
    """Conjunto de limites de um dispositivo."""

    temperature: FaixaTrigger = FaixaTrigger(minimo=12, maximo=18)
    humidity: FaixaTrigger = FaixaTrigger(minimo=60, maximo=80)
    luminosity: FaixaTrigger = FaixaTrigger(minimo=0, maximo=30)


# ---------------------------------------------------------------- vinhos


class VinhoBase(BaseModel):
    nome: str = Field(..., examples=["Cabernet Sauvignon Reserva"])
    tipo: str = Field("", examples=["tinto"])
    safra: Optional[int] = Field(None, examples=[2018])
    quantidade: int = Field(0, ge=0)


class NovoVinho(VinhoBase):
    """Dados para cadastrar um lote de vinho num dispositivo."""


class VinhoOut(VinhoBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dispositivo_id: int
    criado_em: datetime


class VinhoComSaude(VinhoOut):
    """Vinho acompanhado do indice de saude do ambiente onde esta guardado."""

    saude: int
    incidentes: int


# ---------------------------------------------------------------- eventos e comandos


class EventoOut(BaseModel):
    """Um incidente: quando o alerta comecou, terminou e o que o disparou."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    dispositivo_id: int
    grandeza: Grandeza
    inicio: datetime
    fim: Optional[datetime] = None
    valor: Optional[float] = None
    limite_minimo: float
    limite_maximo: float
    duracao_segundos: Optional[int] = None


class ComandoOut(BaseModel):
    """Registro de auditoria de um comando enviado ao dispositivo."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    dispositivo_id: int
    comando: str
    origem: str
    sucesso: bool
    detalhe: str = ""
    momento: datetime


class ResultadoAlerta(BaseModel):
    """Resposta da avaliacao dos triggers."""

    anomalia: Optional[str] = None
    comando_enviado: Optional[str] = None
    mensagem: str


# ---------------------------------------------------------------- saude e relatorios


class SaudeDispositivo(BaseModel):
    """Indice de saude do ambiente: 100 pontos, menos 1 por incidente."""

    dispositivo_id: int
    nome: str
    saude: int
    incidentes: int
    por_grandeza: dict[str, int]
    classificacao: str  # excelente, boa, atencao, critica


class LinhaRelatorio(BaseModel):
    """Uma linha do relatorio consolidado, por dispositivo."""

    dispositivo_id: int
    device_id: str
    nome: str
    local: str
    saude: int
    incidentes: int
    tempo_total_em_alerta: int  # segundos somados de todos os incidentes
    vinhos: int                 # quantos lotes
    garrafas: int               # soma das quantidades
    comandos_enviados: int


class Relatorio(BaseModel):
    """Relatorio consolidado de toda a operacao."""

    gerado_em: datetime
    total_dispositivos: int
    total_incidentes: int
    total_garrafas: int
    saude_media: int
    linhas: list[LinhaRelatorio]
