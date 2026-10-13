"""Modo de demonstracao: provoca um cenario ruim sem mexer no sensor.

Numa apresentacao nem sempre da para esquentar o sensor ou escurecer a sala
na hora certa. Estes cenarios estreitam temporariamente o limite da grandeza
escolhida, de modo que a leitura REAL do sensor passe a ficar fora da faixa.

Isso e importante: nenhum valor e inventado. O que muda e a exigencia, e todo
o resto do fluxo acontece de verdade, com alerta, atuador e incidente
registrado. Ao restaurar, os limites originais voltam.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import FaixaTrigger, ResultadoAlerta, Triggers
from app.services import dispositivos as servico_dispositivos
from app.services import fiware
from app.services import triggers as servico

router = APIRouter(prefix="/api/simulacao", tags=["simulacao"])

# Limites originais guardados enquanto a simulacao esta ativa, por dispositivo.
# Estado proposital em memoria: ao reiniciar a API, nada de demo fica para tras.
_originais: dict[int, Triggers] = {}

CENARIOS = {
    "calor": ("temperature", "acima"),
    "frio": ("temperature", "abaixo"),
    "seco": ("humidity", "abaixo"),
    "umido": ("humidity", "acima"),
    "luz": ("luminosity", "acima"),
}


def _dispositivo(db: Session, dispositivo_id: int | None):
    if dispositivo_id is None:
        return servico_dispositivos.padrao(db)
    return servico_dispositivos.buscar(db, dispositivo_id)


@router.get("/cenarios")
def listar_cenarios():
    """Cenarios disponiveis e o que cada um provoca."""
    return {
        "calor": "Temperatura acima do limite: liga o ar condicionado",
        "frio": "Temperatura abaixo do limite",
        "seco": "Umidade abaixo do limite: liga o umidificador",
        "umido": "Umidade acima do limite",
        "luz": "Luminosidade acima do limite: apaga a luz",
    }


@router.post("/{cenario}", response_model=ResultadoAlerta)
async def simular(cenario: str, dispositivo_id: int | None = None, db: Session = Depends(get_db)):
    """Ajusta o limite para que a leitura atual fique fora da faixa."""
    if cenario not in CENARIOS:
        raise HTTPException(400, f"Cenario invalido. Use um destes: {sorted(CENARIOS)}")

    dispositivo = _dispositivo(db, dispositivo_id)
    grandeza, direcao = CENARIOS[cenario]

    leitura = await fiware.ler_status(dispositivo.entity_name)
    valor = getattr(leitura, grandeza)
    if valor is None:
        raise HTTPException(
            400, f"O dispositivo ainda nao enviou leitura de {grandeza}. A simulacao esta rodando?"
        )

    atuais = servico.ler(db, dispositivo.id)
    _originais.setdefault(dispositivo.id, atuais)

    # Estreita a faixa para o lado escolhido, deixando a leitura real de fora
    if direcao == "acima":
        nova = FaixaTrigger(minimo=atuais.__getattribute__(grandeza).minimo, maximo=valor - 1)
    else:
        nova = FaixaTrigger(minimo=valor + 1, maximo=atuais.__getattribute__(grandeza).maximo)

    ajustados = atuais.model_copy(update={grandeza: nova})
    servico.salvar(db, dispositivo.id, ajustados)

    return await servico.avaliar_e_acionar(db, dispositivo, leitura)


@router.post("/restaurar/limites", response_model=Triggers)
async def restaurar(dispositivo_id: int | None = None, db: Session = Depends(get_db)):
    """Devolve os limites originais e encerra o alerta."""
    dispositivo = _dispositivo(db, dispositivo_id)

    originais = _originais.pop(dispositivo.id, None)
    if originais is None:
        raise HTTPException(400, "Nenhuma simulacao ativa para este dispositivo")

    restaurados = servico.salvar(db, dispositivo.id, originais)

    leitura = await fiware.ler_status(dispositivo.entity_name)
    await servico.avaliar_e_acionar(db, dispositivo, leitura)

    return restaurados
