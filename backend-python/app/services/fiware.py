"""Camada que conversa com o FIWARE.

Concentra aqui todo o conhecimento sobre Orion, IoT Agent e STH-Comet.
O resto da aplicacao (rotas, regras de negocio e dashboard) nunca fala com o
FIWARE direto: so com as funcoes deste modulo, que recebem a entidade como
parametro e devolvem dados ja em formato simples.
"""

from typing import Optional

import httpx
from fastapi import HTTPException

from app.config import settings
from app.models import Leitura, PontoHistorico

TIMEOUT = httpx.Timeout(8.0)

# Comandos aceitos pelo firmware do ESP32.
COMANDOS_LAMPADA = {"on", "off"}
COMANDOS_ALERTA = {"alerttemp", "alerthum", "alertlum", "alertoff"}
# Atuadores: climatizacao, umidificacao e intensidade da luz (luz0 = apagada)
COMANDOS_ATUADORES = {"acon", "acoff", "umidon", "umidoff", "luz0", "luz1", "luz2", "luz3"}

COMANDOS = COMANDOS_LAMPADA | COMANDOS_ALERTA | COMANDOS_ATUADORES

# Comando correspondente a cada grandeza fora do trigger
COMANDO_POR_GRANDEZA = {
    "temperature": "alerttemp",
    "humidity": "alerthum",
    "luminosity": "alertlum",
}

# Atuador que corrige cada anomalia. E o que torna o sistema ativo em vez de
# apenas avisar: fora da faixa, o ambiente comeca a ser corrigido sozinho.
ATUADOR_POR_GRANDEZA = {
    "temperature": "acon",
    "humidity": "umidon",
    "luminosity": "luz0",
}


async def _requisicao(metodo: str, url: str, **kwargs):
    """Executa a chamada HTTP e traduz falhas do FIWARE em erros da API.

    O Content-Type so vai quando existe corpo: o Orion rejeita o header
    em GET e DELETE, respondendo BadRequest.
    """
    cabecalhos = settings.headers_json if "json" in kwargs else settings.headers
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as cliente:
            resposta = await cliente.request(metodo, url, headers=cabecalhos, **kwargs)
            resposta.raise_for_status()
            return resposta
    except httpx.TimeoutException:
        raise HTTPException(504, "O FIWARE demorou demais para responder")
    except httpx.HTTPStatusError as erro:
        raise HTTPException(erro.response.status_code, f"Erro do FIWARE: {erro.response.text}")
    except httpx.RequestError:
        raise HTTPException(503, "Nao foi possivel alcancar o FIWARE. A EC2 esta ligada?")


def _para_numero(valor) -> Optional[float]:
    """O FIWARE devolve os valores como texto: converte para numero."""
    try:
        return float(valor)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- monitoramento


async def ler_status(entity_id: str) -> Leitura:
    """Valores atuais da entidade no Orion Context Broker."""
    url = f"{settings.orion_url}/v2/entities/{entity_id}"
    resposta = await _requisicao("GET", url, params={"options": "keyValues"})
    dados = resposta.json()

    return Leitura(
        id=dados.get("id", entity_id),
        state=dados.get("state", "unknown"),
        luminosity=_para_numero(dados.get("luminosity")),
        temperature=_para_numero(dados.get("temperature")),
        humidity=_para_numero(dados.get("humidity")),
        alert=dados.get("alert", "normal"),
    )


async def ler_historico(
    entity_id: str, entity_type: str, grandeza: str, last_n: int = 100
) -> list[PontoHistorico]:
    """Historico de uma grandeza no STH-Comet, ja no formato do grafico.

    A resposta do STH vem aninhada e com os numeros em texto. O tratamento
    fica aqui para que o dashboard receba apenas [{time, value}].
    """
    url = (
        f"{settings.sth_url}/STH/v1/contextEntities/type/{entity_type}"
        f"/id/{entity_id}/attributes/{grandeza}"
    )
    resposta = await _requisicao("GET", url, params={"lastN": last_n})
    dados = resposta.json()

    try:
        valores = dados["contextResponses"][0]["contextElement"]["attributes"][0]["values"]
    except (KeyError, IndexError):
        # Sem historico ainda: o grafico simplesmente comeca vazio
        return []

    return [
        PontoHistorico(time=registro["recvTime"], value=_para_numero(registro["attrValue"]))
        for registro in valores
    ]


# ---------------------------------------------------------------- comandos


async def enviar_comando(entity_id: str, comando: str) -> dict:
    """Envia um comando ao dispositivo pelo Orion, que repassa via IoT Agent."""
    if comando not in COMANDOS:
        raise HTTPException(400, f"Comando invalido. Use um destes: {sorted(COMANDOS)}")

    url = f"{settings.orion_url}/v2/entities/{entity_id}/attrs"
    await _requisicao("PATCH", url, json={comando: {"type": "command", "value": ""}})
    return {"comando": comando, "status": "enviado"}


# ---------------------------------------------------------------- provisionamento


def _corpo_provisionamento(device_id: str, entity_name: str, entity_type: str) -> dict:
    """Monta o JSON de provisionamento com todos os comandos e atributos do firmware."""
    return {
        "devices": [
            {
                "device_id": device_id,
                "entity_name": entity_name,
                "entity_type": entity_type,
                "protocol": "PDI-IoTA-UltraLight",
                "transport": "MQTT",
                "commands": [{"name": nome, "type": "command"} for nome in sorted(COMANDOS)],
                "attributes": [
                    {"object_id": "s", "name": "state", "type": "Text"},
                    {"object_id": "l", "name": "luminosity", "type": "Number"},
                    {"object_id": "t", "name": "temperature", "type": "Number"},
                    {"object_id": "h", "name": "humidity", "type": "Number"},
                    {"object_id": "a", "name": "alert", "type": "Text"},
                ],
            }
        ]
    }


async def listar_dispositivos_fiware() -> list[dict]:
    """IoT Devices cadastrados no IoT Agent (fonte: FIWARE, nao o banco local)."""
    url = f"{settings.iotagent_url}/iot/devices"
    resposta = await _requisicao("GET", url)
    return resposta.json().get("devices", [])


async def provisionar(device_id: str, entity_name: str, entity_type: str) -> dict:
    """Registra o dispositivo no IoT Agent com os comandos e atributos do firmware."""
    url = f"{settings.iotagent_url}/iot/devices"
    await _requisicao("POST", url, json=_corpo_provisionamento(device_id, entity_name, entity_type))
    return {"device_id": device_id, "status": "provisionado"}


async def desprovisionar(device_id: str) -> dict:
    """Remove o cadastro de um dispositivo no IoT Agent."""
    url = f"{settings.iotagent_url}/iot/devices/{device_id}"
    await _requisicao("DELETE", url)
    return {"device_id": device_id, "status": "removido"}


async def criar_subscription(entity_id: str, entity_type: str) -> dict:
    """Assina as mudancas dos sensores para o STH-Comet gravar o historico.

    Sem esta subscription o historico fica vazio e o grafico nao tem o que
    desenhar. attrsFormat precisa ser legacy: o STH nao entende o formato
    normalizado padrao do Orion.
    """
    url = f"{settings.orion_url}/v2/subscriptions"
    corpo = {
        "description": f"Historico dos sensores de {entity_id}",
        "subject": {
            "entities": [{"id": entity_id, "type": entity_type}],
            "condition": {"attrs": ["luminosity", "temperature", "humidity"]},
        },
        "notification": {
            "http": {"url": "http://sth-comet:8666/notify"},
            "attrs": ["luminosity", "temperature", "humidity"],
            "attrsFormat": "legacy",
        },
        "throttling": 5,
    }
    await _requisicao("POST", url, json=corpo)
    return {"entity_id": entity_id, "status": "subscription criada"}
