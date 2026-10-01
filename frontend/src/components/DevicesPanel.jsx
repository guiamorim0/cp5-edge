import { useEffect, useState } from 'react'
import { cadastrarDispositivo, getDispositivos, removerDispositivo } from '../api'

/**
 * Cadastro e gerenciamento dos IoT Devices.
 * Faz pelo app o que antes era feito no Postman: listar, criar e remover
 * dispositivos no IoT Agent. Um device criado aqui ja nasce com os seis
 * comandos e os cinco atributos do firmware.
 */
export default function DevicesPanel() {
  const [dispositivos, setDispositivos] = useState([])
  const [novo, setNovo] = useState({ device_id: '', entity_name: '', entity_type: 'Lamp' })
  const [mensagem, setMensagem] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  async function carregar() {
    try {
      setDispositivos(await getDispositivos())
    } catch {
      setMensagem('Nao foi possivel listar os dispositivos')
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  async function cadastrar() {
    if (!novo.device_id || !novo.entity_name) {
      setMensagem('Preencha o id e o nome da entidade')
      return
    }
    setOcupado(true)
    try {
      await cadastrarDispositivo(novo)
      setNovo({ device_id: '', entity_name: '', entity_type: 'Lamp' })
      setMensagem('Dispositivo cadastrado')
      await carregar()
    } catch (e) {
      setMensagem(e.response?.data?.detail || 'Erro ao cadastrar')
    } finally {
      setOcupado(false)
    }
  }

  async function remover(deviceId) {
    setOcupado(true)
    try {
      await removerDispositivo(deviceId)
      setMensagem('Dispositivo removido')
      await carregar()
    } catch {
      setMensagem('Erro ao remover')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <div className="card">
        <p className="rotulo">Novo dispositivo</p>
        <div className="campo coluna">
          <label>Id do dispositivo</label>
          <input
            value={novo.device_id}
            placeholder="lamp002"
            onChange={(e) => setNovo({ ...novo, device_id: e.target.value })}
          />
        </div>
        <div className="campo coluna">
          <label>Nome da entidade</label>
          <input
            value={novo.entity_name}
            placeholder="urn:ngsi-ld:Lamp:002"
            onChange={(e) => setNovo({ ...novo, entity_name: e.target.value })}
          />
        </div>
        <div className="campo coluna">
          <label>Tipo</label>
          <input
            value={novo.entity_type}
            onChange={(e) => setNovo({ ...novo, entity_type: e.target.value })}
          />
        </div>
        <button className="botao primario largo" disabled={ocupado} onClick={cadastrar}>
          Cadastrar
        </button>
      </div>

      <p className="rotulo">Cadastrados ({dispositivos.length})</p>
      {dispositivos.length === 0 && <p className="vazio">Nenhum dispositivo cadastrado.</p>}

      {dispositivos.map((d) => (
        <div className="card" key={d.device_id}>
          <div className="linha">
            <div>
              <p className="device-id">{d.device_id}</p>
              <p className="device-entidade">{d.entity_name}</p>
              <p className="device-entidade">{(d.attributes || []).length} atributos, {(d.commands || []).length} comandos</p>
            </div>
            <button className="botao perigo" disabled={ocupado} onClick={() => remover(d.device_id)}>
              Remover
            </button>
          </div>
        </div>
      ))}

      {mensagem && <p className="mensagem">{mensagem}</p>}
    </>
  )
}
