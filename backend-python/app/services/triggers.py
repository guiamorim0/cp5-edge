"""Guarda os limites configurados no dashboard e avalia as anomalias.

Os triggers ficam num arquivo JSON ao lado da aplicacao. Assim eles
sobrevivem a um restart da API, sem precisar de banco de dados.
"""

import json
from pathlib import Path

from app.models import Leitura, ResultadoAlerta, Triggers
from app.services import fiware

ARQUIVO = Path(__file__).resolve().parent.parent / "triggers.json"


def ler_triggers() -> Triggers:
    """Le os limites do arquivo. Se nao existir, usa os valores padrao."""
    if not ARQUIVO.exists():
        return Triggers()
    try:
        return Triggers(**json.loads(ARQUIVO.read_text(encoding="utf-8")))
    except (json.JSONDecodeError, ValueError):
        # Arquivo corrompido: volta ao padrao em vez de derrubar a API
        return Triggers()


def salvar_triggers(triggers: Triggers) -> Triggers:
    """Grava os limites definidos pelo usuario."""
    ARQUIVO.write_text(triggers.model_dump_json(indent=2), encoding="utf-8")
    return triggers


def detectar_anomalia(leitura: Leitura, triggers: Triggers) -> str | None:
    """Compara a leitura com os limites e devolve a primeira grandeza fora da faixa.

    A ordem importa: temperatura tem prioridade sobre umidade, que tem
    prioridade sobre luminosidade. O ESP32 mantem um alerta por vez, entao
    a anomalia mais critica para a vinheria e a que soa.
    """
    for grandeza in ("temperature", "humidity", "luminosity"):
        valor = getattr(leitura, grandeza)
        if valor is None:
            continue
        faixa = getattr(triggers, grandeza)
        if valor < faixa.minimo or valor > faixa.maximo:
            return grandeza
    return None


async def avaliar_e_acionar(leitura: Leitura) -> ResultadoAlerta:
    """Dispara ou encerra o alerta no ESP32 conforme os triggers.

    E aqui que o front-end "ativa" o alerta: o dashboard chama esta rota a
    cada leitura, e o comando so e enviado quando o estado muda, para nao
    encher o broker de mensagens repetidas.
    """
    triggers = ler_triggers()
    anomalia = detectar_anomalia(leitura, triggers)
    alerta_no_device = leitura.alert  # o que o ESP32 informou estar ativo

    nomes = {
        "temperature": "temperatura",
        "humidity": "umidade",
        "luminosity": "luminosidade",
    }

    if anomalia is None:
        if alerta_no_device != "normal":
            await fiware.enviar_comando("alertoff")
            return ResultadoAlerta(
                anomalia=None,
                comando_enviado="alertoff",
                mensagem="Valores normalizados, alerta encerrado",
            )
        return ResultadoAlerta(anomalia=None, mensagem="Todos os valores dentro dos limites")

    if nomes[anomalia] == alerta_no_device:
        return ResultadoAlerta(
            anomalia=anomalia,
            mensagem=f"Alerta de {nomes[anomalia]} ja esta ativo no dispositivo",
        )

    comando = fiware.COMANDO_POR_GRANDEZA[anomalia]
    await fiware.enviar_comando(comando)
    return ResultadoAlerta(
        anomalia=anomalia,
        comando_enviado=comando,
        mensagem=f"Valor de {nomes[anomalia]} fora dos limites, alerta acionado",
    )
