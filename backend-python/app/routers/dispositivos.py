"""Rotas de cadastro e gerenciamento dos IoT Devices."""

from fastapi import APIRouter

from app.models import NovoDispositivo
from app.services import fiware

router = APIRouter(prefix="/api/devices", tags=["dispositivos"])


@router.get("")
async def listar():
    """Dispositivos cadastrados no IoT Agent."""
    return await fiware.listar_dispositivos()


@router.post("", status_code=201)
async def cadastrar(dispositivo: NovoDispositivo):
    """Cadastra um novo dispositivo ja com os comandos e atributos do firmware."""
    return await fiware.cadastrar_dispositivo(
        dispositivo.device_id, dispositivo.entity_name, dispositivo.entity_type
    )


@router.delete("/{device_id}")
async def remover(device_id: str):
    """Remove o cadastro de um dispositivo."""
    return await fiware.remover_dispositivo(device_id)
