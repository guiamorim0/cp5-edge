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
      setMensagem('Não foi possível listar os ambientes')
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
      <section className="bloco">
        <div className="bloco-cabeca">
          <h3>Ambientes cadastrados</h3>
          <span className="apoio">{dispositivos.length} no total</span>
        </div>

        {dispositivos.length === 0 ? (
          <p className="vazio">Nenhum ambiente cadastrado.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Ambiente</th>
                <th>Local</th>
                <th>Dispositivo</th>
                <th>Entidade no FIWARE</th>
                <th className="acao"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {dispositivos.map((d) => (
                <tr key={d.id}>
                  <td className="principal">{d.nome}</td>
                  <td data-rotulo="Local">{d.local || '—'}</td>
                  <td data-rotulo="Dispositivo"><code>{d.device_id}</code></td>
                  <td data-rotulo="Entidade"><code>{d.entity_name}</code></td>
                  <td className="acao">
                    <button className="botao discreto" disabled={ocupado} onClick={() => remover(d.id)}>
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="bloco">
        <div className="bloco-cabeca">
          <h3>Novo ambiente</h3>
          <span className="apoio">provisiona no IoT Agent e cria o histórico</span>
        </div>
        <div className="bloco-corpo">
          <div className="formulario">
            <div className="campo">
              <label htmlFor="amb-nome">Nome do ambiente</label>
              <input
                id="amb-nome"
                value={novo.nome}
                placeholder="Adega principal"
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
            </div>
            <div className="campo">
              <label htmlFor="amb-local">Local</label>
              <input
                id="amb-local"
                value={novo.local}
                placeholder="Subsolo, ala leste"
                onChange={(e) => setNovo({ ...novo, local: e.target.value })}
              />
            </div>
            <div className="campo">
              <label htmlFor="amb-device">Id do dispositivo</label>
              <input
                id="amb-device"
                value={novo.device_id}
                placeholder="lamp002"
                onChange={(e) => preencherId(e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="amb-entidade">Entidade no FIWARE</label>
              <input
                id="amb-entidade"
                value={novo.entity_name}
                placeholder="urn:ngsi-ld:Lamp:002"
                onChange={(e) => setNovo({ ...novo, entity_name: e.target.value })}
              />
              <span className="ajuda">Preenchida a partir do id do dispositivo</span>
            </div>
          </div>
          <div className="acoes fim" style={{ marginTop: 18 }}>
            {mensagem && <p className="mensagem" role="status" style={{ margin: 0 }}>{mensagem}</p>}
            <button className="botao primario" disabled={ocupado} onClick={cadastrar}>
              Cadastrar
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
