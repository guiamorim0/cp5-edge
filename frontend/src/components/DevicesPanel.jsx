import { useCallback, useEffect, useState } from 'react'
import { cadastrarDispositivo, getDispositivos, removerDispositivo } from '../api'

/**
 * Cadastro e gerenciamento dos ambientes monitorados.
 *
 * Faz pelo app o que antes era feito no Postman: provisiona o dispositivo no
 * IoT Agent com todos os comandos e atributos do firmware, cria a subscription
 * do historico e grava no banco com limites padrao de adega.
 */
const VAZIO = {
  device_id: '',
  entity_name: '',
  entity_type: 'Lamp',
  nome: '',
  local: '',
}

export default function DevicesPanel({ aoMudarLista }) {
  const [dispositivos, setDispositivos] = useState([])
  const [novo, setNovo] = useState(VAZIO)
  const [mensagem, setMensagem] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const lista = await getDispositivos()
      setDispositivos(lista)
      aoMudarLista?.(lista)
    } catch {
      setMensagem('Nao foi possivel listar os ambientes')
    }
  }, [aoMudarLista])

  useEffect(() => {
    carregar()
  }, [carregar])

  // O id da entidade segue o padrao do FIWARE e e derivado do id do dispositivo,
  // para o usuario nao precisar conhecer a convencao urn:ngsi-ld.
  function preencherId(device_id) {
    const numero = device_id.replace(/\D/g, '') || '001'
    setNovo({
      ...novo,
      device_id,
      entity_name: `urn:ngsi-ld:Lamp:${numero.padStart(3, '0')}`,
    })
  }

  async function cadastrar() {
    if (!novo.device_id || !novo.nome) {
      setMensagem('Preencha ao menos o id do dispositivo e o nome do ambiente')
      return
    }
    setOcupado(true)
    try {
      await cadastrarDispositivo(novo)
      setNovo(VAZIO)
      setMensagem('Ambiente cadastrado e provisionado no FIWARE')
      await carregar()
    } catch (e) {
      setMensagem(e.response?.data?.detail || 'Erro ao cadastrar')
    } finally {
      setOcupado(false)
    }
  }

  async function remover(id) {
    setOcupado(true)
    try {
      await removerDispositivo(id)
      setMensagem('Ambiente removido')
      await carregar()
    } catch (e) {
      setMensagem(e.response?.data?.detail || 'Erro ao remover')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <div className="card">
        <p className="rotulo">Novo ambiente</p>

        <div className="campo coluna">
          <label>Nome do ambiente</label>
          <input
            value={novo.nome}
            placeholder="Adega principal"
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          />
        </div>
        <div className="campo coluna">
          <label>Local</label>
          <input
            value={novo.local}
            placeholder="Subsolo, ala leste"
            onChange={(e) => setNovo({ ...novo, local: e.target.value })}
          />
        </div>
        <div className="campo coluna">
          <label>Id do dispositivo</label>
          <input
            value={novo.device_id}
            placeholder="lamp002"
            onChange={(e) => preencherId(e.target.value)}
          />
        </div>
        <div className="campo coluna">
          <label>Entidade no FIWARE</label>
          <input
            value={novo.entity_name}
            placeholder="urn:ngsi-ld:Lamp:002"
            onChange={(e) => setNovo({ ...novo, entity_name: e.target.value })}
          />
        </div>

        <button className="botao primario largo" disabled={ocupado} onClick={cadastrar}>
          Cadastrar
        </button>
      </div>

      <p className="rotulo">Cadastrados ({dispositivos.length})</p>
      {dispositivos.length === 0 && <p className="vazio">Nenhum ambiente cadastrado.</p>}

      {dispositivos.map((d) => (
        <div className="card" key={d.id}>
          <div className="linha">
            <div>
              <p className="device-id">{d.nome}</p>
              <p className="device-entidade">{d.local || 'sem local definido'}</p>
              <p className="device-entidade">
                {d.device_id} · {d.entity_name}
              </p>
            </div>
            <button className="botao perigo" disabled={ocupado} onClick={() => remover(d.id)}>
              Remover
            </button>
          </div>
        </div>
      ))}

      {mensagem && <p className="mensagem">{mensagem}</p>}
    </>
  )
}
