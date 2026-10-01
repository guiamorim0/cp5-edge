"""Rotas dos limites configuraveis e da avaliacao automatica de alertas."""

from fastapi import APIRouter

from app.models import ResultadoAlerta, Triggers
from app.services import fiware, triggers as servico

router = APIRouter(prefix="/api/triggers", tags=["triggers"])


@router.get("", response_model=Triggers)
async def obter_triggers():
    """Limites atualmente configurados."""
    return servico.ler_triggers()


@router.put("", response_model=Triggers)
async def atualizar_triggers(novos: Triggers):
    """Salva os limites definidos pelo usuario no dashboard."""
    return servico.salvar_triggers(novos)


@router.post("/avaliar", response_model=ResultadoAlerta)
async def avaliar():
    """Le o dispositivo, compara com os limites e aciona o alerta se precisar.

    O dashboard chama esta rota junto com o polling do status. E assim que
    o alerta e "ativado pelo front-end": quem decide e esta camada, com os
    limites que o usuario configurou na tela.
    """
    leitura = await fiware.ler_status()
    return await servico.avaliar_e_acionar(leitura)
