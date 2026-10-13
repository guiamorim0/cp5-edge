import { useCallback, useEffect, useState } from 'react'
import { cadastrarVinho, getVinhos, movimentarVinho, removerVinho } from '../api'

/**
 * Estoque de vinhos.
 *
 * Cada lote fica vinculado ao ambiente que o guarda, e carrega a saude desse
 * ambiente. E essa ligacao que da sentido ao monitoramento: nao e so "a
 * temperatura subiu", e sim "subiu onde estao 240 garrafas de Cabernet 2018".
 */
const CORES_SAUDE = (saude) => {
  if (saude >= 90) return '#22c55e'
  if (saude >= 70) return '#84cc16'
  if (saude >= 50) return '#f97316'
  return '#ef4444'
}

const VAZIO = { nome: '', tipo: 'tinto', safra: '', quantidade: 0 }

export default function WinesPanel({ dispositivoId }) {
  const [vinhos, setVinhos] = useState([])
  const [novo, setNovo] = useState(VAZIO)
  const [mensagem, setMensagem] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setVinhos(await getVinhos(dispositivoId))
    } catch {
      setMensagem('Nao foi possivel carregar o estoque')
    }
  }, [dispositivoId])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function cadastrar() {
    if (!novo.nome.trim()) {
      setMensagem('Informe o nome do vinho')
      return
    }
    setOcupado(true)
    try {
      await cadastrarVinho(dispositivoId, {
        nome: novo.nome,
        tipo: novo.tipo,
        safra: novo.safra ? Number(novo.safra) : null,
        quantidade: Number(novo.quantidade) || 0,
      })
      setNovo(VAZIO)
      setMensagem('Lote cadastrado')
      await carregar()
    } catch (e) {
      setMensagem(e.response?.data?.detail || 'Erro ao cadastrar')
    } finally {
      setOcupado(false)
    }
  }

  async function movimentar(id, delta) {
    setOcupado(true)
    try {
      await movimentarVinho(id, delta)
      await carregar()
    } catch (e) {
      setMensagem(e.response?.data?.detail || 'Erro ao movimentar')
    } finally {
      setOcupado(false)
    }
  }

  async function remover(id) {
    setOcupado(true)
    try {
      await removerVinho(id)
      await carregar()
    } finally {
      setOcupado(false)
    }
  }

  const garrafas = vinhos.reduce((total, v) => total + v.quantidade, 0)

  return (
    <>
      <div className="card">
        <p className="rotulo">Novo lote</p>
        <div className="campo coluna">
          <label>Nome do vinho</label>
          <input
            value={novo.nome}
            placeholder="Cabernet Sauvignon Reserva"
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          />
        </div>
        <div className="campo">
          <label>Tipo</label>
          <select value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}>
            <option value="tinto">Tinto</option>
            <option value="branco">Branco</option>
            <option value="rose">Rose</option>
            <option value="espumante">Espumante</option>
          </select>
        </div>
        <div className="campo">
          <label>Safra</label>
          <input
            type="number"
            inputMode="numeric"
            value={novo.safra}
            placeholder="2018"
            onChange={(e) => setNovo({ ...novo, safra: e.target.value })}
          />
        </div>
        <div className="campo">
          <label>Garrafas</label>
          <input
            type="number"
            inputMode="numeric"
            value={novo.quantidade}
            onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })}
          />
        </div>
        <button className="botao primario largo" disabled={ocupado} onClick={cadastrar}>
          Cadastrar lote
        </button>
      </div>

      <div className="linha espacado">
        <p className="rotulo">
          {vinhos.length} {vinhos.length === 1 ? 'lote' : 'lotes'}
        </p>
        <p className="rotulo">{garrafas} garrafas</p>
      </div>

      {vinhos.length === 0 && <p className="vazio">Nenhum vinho cadastrado neste ambiente.</p>}

      {vinhos.map((vinho) => (
        <div className="card" key={vinho.id}>
          <div className="linha">
            <div>
              <p className="device-id">{vinho.nome}</p>
              <p className="device-entidade">
                {vinho.tipo}
                {vinho.safra ? ` · ${vinho.safra}` : ''}
              </p>
            </div>
            <span className="pill" style={{ color: CORES_SAUDE(vinho.saude), borderColor: CORES_SAUDE(vinho.saude) }}>
              saude {vinho.saude}
            </span>
          </div>

          <div className="linha espacado">
            <div className="estoque">
              <button className="botao" disabled={ocupado} onClick={() => movimentar(vinho.id, -1)}>
                −
              </button>
              <span className="estoque-numero">{vinho.quantidade}</span>
              <button className="botao" disabled={ocupado} onClick={() => movimentar(vinho.id, 1)}>
                +
              </button>
            </div>
            <button className="botao perigo" disabled={ocupado} onClick={() => remover(vinho.id)}>
              Remover
            </button>
          </div>
        </div>
      ))}

      {mensagem && <p className="mensagem">{mensagem}</p>}
    </>
  )
}
