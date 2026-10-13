"""Limites por dispositivo e a logica de alerta.

Cada dispositivo tem suas proprias faixas, porque cada ambiente guarda um
tipo de vinho com exigencias diferentes. Quando um valor sai da faixa, esta
camada faz tres coisas: aciona o alerta visual e sonoro, liga o atuador que
corrige o problema, e registra o incidente.
"""

from sqlalchemy.orm import Session

from app.models import FAIXAS_PADRAO, FaixaTrigger, Leitura, ResultadoAlerta, Triggers
from app.schema import Dispositivo, Trigger
from app.services import comandos, eventos, fiware

# Ordem de prioridade: o ESP32 mantem um alerta por vez, entao a anomalia
# mais critica para a conservacao do vinho e a que soa.
PRIORIDADE = ("temperature", "humidity", "luminosity")

NOMES = {
    "temperature": "temperatura",
    "humidity": "umidade",
    "luminosity": "luminosidade",
}

# Atuador que desliga quando o ambiente normaliza
DESLIGA_ATUADOR = {"acon": "acoff", "umidon": "umidoff", "luz0": "luz1"}


def ler(db: Session, dispositivo_id: int) -> Triggers:
    """Limites configurados de um dispositivo, com os padroes como reserva."""
    faixas = {}
    for registro in db.query(Trigger).filter(Trigger.dispositivo_id == dispositivo_id).all():
        faixas[registro.grandeza] = FaixaTrigger(minimo=registro.minimo, maximo=registro.maximo)

    for grandeza, (minimo, maximo) in FAIXAS_PADRAO.items():
        faixas.setdefault(grandeza, FaixaTrigger(minimo=minimo, maximo=maximo))

    return Triggers(**faixas)


def salvar(db: Session, dispositivo_id: int, novos: Triggers) -> Triggers:
    """Grava os limites definidos pelo usuario para este dispositivo."""
    for grandeza in FAIXAS_PADRAO:
        faixa: FaixaTrigger = getattr(novos, grandeza)
        registro = (
            db.query(Trigger)
            .filter(Trigger.dispositivo_id == dispositivo_id, Trigger.grandeza == grandeza)
            .first()
        )
        if registro is None:
            registro = Trigger(dispositivo_id=dispositivo_id, grandeza=grandeza)
            db.add(registro)
        registro.minimo = faixa.minimo
        registro.maximo = faixa.maximo

    db.commit()
    return ler(db, dispositivo_id)


def detectar_anomalia(leitura: Leitura, triggers: Triggers) -> str | None:
    """Primeira grandeza fora da faixa, na ordem de prioridade."""
    for grandeza in PRIORIDADE:
        valor = getattr(leitura, grandeza)
        if valor is None:
            continue
        faixa: FaixaTrigger = getattr(triggers, grandeza)
        if valor < faixa.minimo or valor > faixa.maximo:
            return grandeza
    return None


async def avaliar_e_acionar(
    db: Session, dispositivo: Dispositivo, leitura: Leitura
) -> ResultadoAlerta:
    """Compara a leitura com os limites e age sobre o ambiente.

    E aqui que o front-end "aciona" o alerta: o dashboard chama esta rota a
    cada leitura, e os comandos so sao enviados quando o estado muda, para
    nao encher o broker de mensagens repetidas.
    """
    triggers = ler(db, dispositivo.id)
    anomalia = detectar_anomalia(leitura, triggers)
    alerta_no_device = leitura.alert  # o que o ESP32 informou estar ativo

    if anomalia is None:
        if alerta_no_device != "normal":
            await comandos.enviar(db, dispositivo, "alertoff", origem="automatico")

            # Desliga o atuador que estava corrigindo o ambiente
            evento = eventos.em_aberto(db, dispositivo.id)
            if evento is not None:
                atuador = fiware.ATUADOR_POR_GRANDEZA.get(evento.grandeza)
                if atuador and atuador in DESLIGA_ATUADOR:
                    await comandos.enviar(
                        db, dispositivo, DESLIGA_ATUADOR[atuador], origem="automatico"
                    )

            eventos.encerrar(db, dispositivo.id)
            return ResultadoAlerta(
                anomalia=None,
                comando_enviado="alertoff",
                mensagem="Valores normalizados, alerta encerrado",
            )
        return ResultadoAlerta(anomalia=None, mensagem="Todos os valores dentro dos limites")

    if NOMES[anomalia] == alerta_no_device:
        return ResultadoAlerta(
            anomalia=anomalia,
            mensagem=f"Alerta de {NOMES[anomalia]} ja esta ativo no dispositivo",
        )

    comando = fiware.COMANDO_POR_GRANDEZA[anomalia]
    await comandos.enviar(db, dispositivo, comando, origem="automatico")

    # Alem de avisar, o sistema age: liga o atuador que corrige a anomalia
    atuador = fiware.ATUADOR_POR_GRANDEZA.get(anomalia)
    if atuador:
        await comandos.enviar(db, dispositivo, atuador, origem="automatico")

    faixa: FaixaTrigger = getattr(triggers, anomalia)
    eventos.abrir(db, dispositivo, anomalia, getattr(leitura, anomalia), faixa.minimo, faixa.maximo)

    return ResultadoAlerta(
        anomalia=anomalia,
        comando_enviado=comando,
        mensagem=f"Valor de {NOMES[anomalia]} fora dos limites, alerta e atuador acionados",
    )
