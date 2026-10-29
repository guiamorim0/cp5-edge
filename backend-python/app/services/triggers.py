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


# Histerese: quem ja esta em alerta so sai dele quando a leitura volta para
# dentro da faixa com esta folga. Sem isso, um sensor oscilando em cima do
# limite (18.1, 17.9, 18.2...) abre e fecha incidentes a cada leitura.
MARGEM = {"temperature": 0.5, "humidity": 2.0, "luminosity": 2.0}


def detectar_anomalia(
    leitura: Leitura, triggers: Triggers, em_alerta: str | None = None
) -> str | None:
    """Primeira grandeza fora da faixa, na ordem de prioridade.

    em_alerta e a grandeza do incidente aberto: para ela a faixa e
    estreitada pela margem de histerese.
    """
    for grandeza in PRIORIDADE:
        valor = getattr(leitura, grandeza)
        if valor is None:
            continue
        faixa: FaixaTrigger = getattr(triggers, grandeza)
        minimo, maximo = faixa.minimo, faixa.maximo
        if grandeza == em_alerta:
            # Nunca mais que um quarto da faixa, para faixas estreitas continuarem validas
            margem = min(MARGEM[grandeza], (maximo - minimo) / 4)
            minimo, maximo = minimo + margem, maximo - margem
        if valor < minimo or valor > maximo:
            return grandeza
    return None


async def _encerrar_incidentes(db: Session, dispositivo: Dispositivo) -> None:
    """Fecha os incidentes abertos e desliga os atuadores que os corrigiam."""
    fechados = eventos.encerrar(db, dispositivo.id)
    atuadores = {fiware.ATUADOR_POR_GRANDEZA.get(evento.grandeza) for evento in fechados}
    for atuador in sorted(a for a in atuadores if a in DESLIGA_ATUADOR):
        await comandos.enviar(db, dispositivo, DESLIGA_ATUADOR[atuador], origem="automatico")


async def avaliar_e_acionar(
    db: Session, dispositivo: Dispositivo, leitura: Leitura
) -> ResultadoAlerta:
    """Compara a leitura com os limites e age sobre o ambiente.

    E aqui que o front-end "aciona" o alerta: o dashboard chama esta rota a
    cada leitura, e os comandos so sao enviados quando o estado muda, para
    nao encher o broker de mensagens repetidas.

    O estado da automacao e o incidente aberto no banco, e nao o atributo
    alert do ESP32: assim um alerta disparado pelo teste manual do dashboard
    nao e confundido com um incidente real nem cancelado na leitura seguinte.
    """
    triggers = ler(db, dispositivo.id)
    aberto = eventos.em_aberto(db, dispositivo.id)
    anomalia = detectar_anomalia(leitura, triggers, aberto.grandeza if aberto else None)

    if anomalia is None:
        if aberto is None:
            return ResultadoAlerta(anomalia=None, mensagem="Todos os valores dentro dos limites")

        await comandos.enviar(db, dispositivo, "alertoff", origem="automatico")
        await _encerrar_incidentes(db, dispositivo)
        return ResultadoAlerta(
            anomalia=None,
            comando_enviado="alertoff",
            mensagem="Valores normalizados, alerta encerrado",
        )

    comando = fiware.COMANDO_POR_GRANDEZA[anomalia]

    if aberto is not None and aberto.grandeza == anomalia:
        # O incidente continua. Se o ESP32 perdeu o alerta (reiniciou, ou
        # alguem silenciou), o sinal e reenviado, sem abrir outro incidente.
        if leitura.alert != NOMES[anomalia]:
            await comandos.enviar(db, dispositivo, comando, origem="automatico")
            return ResultadoAlerta(
                anomalia=anomalia,
                comando_enviado=comando,
                mensagem=f"Alerta de {NOMES[anomalia]} reenviado ao dispositivo",
            )
        return ResultadoAlerta(
            anomalia=anomalia,
            mensagem=f"Alerta de {NOMES[anomalia]} ja esta ativo no dispositivo",
        )

    # Troca de anomalia (ex.: a temperatura normalizou, mas a umidade saiu da
    # faixa): o incidente anterior termina aqui e seu atuador e desligado.
    if aberto is not None:
        await _encerrar_incidentes(db, dispositivo)

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
