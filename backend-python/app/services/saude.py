"""Indice de saude e relatorios.

O indice traduz o historico de incidentes num unico numero: cada ambiente
comeca com 100 pontos e perde 1 a cada incidente registrado. E a forma de
responder, numa olhada, a pergunta que o dono da vinheria realmente faz:
"meu vinho esta bem guardado?".
"""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import LinhaRelatorio, Relatorio, SaudeDispositivo, VinhoComSaude
from app.schema import Comando, Dispositivo, Evento, Vinho
from app.services import eventos as servico_eventos

PONTOS_INICIAIS = 100
PENALIDADE_POR_INCIDENTE = 1


def classificar(saude: int) -> str:
    if saude >= 90:
        return "excelente"
    if saude >= 70:
        return "boa"
    if saude >= 50:
        return "atencao"
    return "critica"


def calcular(db: Session, dispositivo: Dispositivo) -> SaudeDispositivo:
    """Saude do ambiente de um dispositivo."""
    por_grandeza = servico_eventos.contar_por_dispositivo(db, dispositivo.id)
    incidentes = sum(por_grandeza.values())

    # Nunca abaixo de zero: um ambiente muito ruim ja esta no fundo da escala
    saude = max(0, PONTOS_INICIAIS - incidentes * PENALIDADE_POR_INCIDENTE)

    return SaudeDispositivo(
        dispositivo_id=dispositivo.id,
        nome=dispositivo.nome,
        saude=saude,
        incidentes=incidentes,
        por_grandeza=por_grandeza,
        classificacao=classificar(saude),
    )


def vinhos_com_saude(db: Session, dispositivo_id: int | None = None) -> list[VinhoComSaude]:
    """Cada lote acompanhado da saude do ambiente onde esta guardado."""
    consulta = db.query(Vinho)
    if dispositivo_id is not None:
        consulta = consulta.filter(Vinho.dispositivo_id == dispositivo_id)

    resultado = []
    cache: dict[int, SaudeDispositivo] = {}

    for vinho in consulta.order_by(Vinho.nome).all():
        if vinho.dispositivo_id not in cache:
            cache[vinho.dispositivo_id] = calcular(db, vinho.dispositivo)
        saude = cache[vinho.dispositivo_id]

        resultado.append(
            VinhoComSaude(
                id=vinho.id,
                dispositivo_id=vinho.dispositivo_id,
                nome=vinho.nome,
                tipo=vinho.tipo,
                safra=vinho.safra,
                quantidade=vinho.quantidade,
                criado_em=vinho.criado_em,
                saude=saude.saude,
                incidentes=saude.incidentes,
            )
        )
    return resultado


def gerar_relatorio(db: Session) -> Relatorio:
    """Relatorio consolidado de toda a operacao, um dispositivo por linha."""
    linhas: list[LinhaRelatorio] = []
    total_incidentes = 0
    total_garrafas = 0

    for dispositivo in db.query(Dispositivo).order_by(Dispositivo.id).all():
        saude = calcular(db, dispositivo)

        tempo_alerta = sum(
            evento.duracao_segundos or 0
            for evento in db.query(Evento)
            .filter(Evento.dispositivo_id == dispositivo.id)
            .all()
        )
        garrafas = sum(vinho.quantidade for vinho in dispositivo.vinhos)
        enviados = db.query(Comando).filter(Comando.dispositivo_id == dispositivo.id).count()

        total_incidentes += saude.incidentes
        total_garrafas += garrafas

        linhas.append(
            LinhaRelatorio(
                dispositivo_id=dispositivo.id,
                device_id=dispositivo.device_id,
                nome=dispositivo.nome,
                local=dispositivo.local,
                saude=saude.saude,
                incidentes=saude.incidentes,
                tempo_total_em_alerta=tempo_alerta,
                vinhos=len(dispositivo.vinhos),
                garrafas=garrafas,
                comandos_enviados=enviados,
            )
        )

    saude_media = round(sum(linha.saude for linha in linhas) / len(linhas)) if linhas else 100

    return Relatorio(
        gerado_em=datetime.now(timezone.utc),
        total_dispositivos=len(linhas),
        total_incidentes=total_incidentes,
        total_garrafas=total_garrafas,
        saude_media=saude_media,
        linhas=linhas,
    )


def relatorio_csv(relatorio: Relatorio) -> str:
    """Mesma informacao em CSV, para abrir no Excel."""
    cabecalho = (
        "dispositivo,local,saude,classificacao,incidentes,"
        "tempo_em_alerta_s,lotes,garrafas,comandos\n"
    )
    linhas = "".join(
        f"{linha.nome},{linha.local},{linha.saude},{classificar(linha.saude)},"
        f"{linha.incidentes},{linha.tempo_total_em_alerta},{linha.vinhos},"
        f"{linha.garrafas},{linha.comandos_enviados}\n"
        for linha in relatorio.linhas
    )
    return cabecalho + linhas
