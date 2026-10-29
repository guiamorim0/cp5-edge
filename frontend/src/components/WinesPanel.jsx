import { useCallback, useEffect, useState } from 'react'
import { cadastrarVinho, getVinhos, movimentarVinho, removerVinho } from '../api'

/**
 * Estoque de vinhos.
 *
 * Cada lote fica vinculado ao ambiente que o guarda, e carrega a saude desse
 * ambiente. E essa ligacao que da sentido ao monitoramento: nao e so "a
 * temperatura subiu", e sim "subiu onde estao 240 garrafas de Cabernet 2018".
 */
const STATUS_SAUDE = (saude) => {
  if (saude >= 70) return 'bom'
  if (saude >= 50) return 'atencao'
  return 'critico'
}

const TIPOS = { tinto: 'Tinto', branco: 'Branco', rose: 'Rosé', espumante: 'Espumante' }

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
      setMensagem('Não foi possível carregar o estoque')
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
      <section className="bloco">
        <div className="bloco-cabeca">
          <h3>Estoque</h3>
          <span className="apoio">
            {vinhos.length} {vinhos.length === 1 ? 'lote' : 'lotes'} · {garrafas} garrafas
          </span>
        </div>

        {vinhos.length === 0 ? (
          <p className="vazio">Nenhum vinho cadastrado neste ambiente.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Rótulo</th>
                <th>Tipo</th>
                <th className="num">Safra</th>
                <th>Garrafas</th>
                <th>Saúde</th>
                <th className="acao"><span className="sr-only">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {vinhos.map((vinho) => (
                <tr key={vinho.id}>
                  <td className="principal">{vinho.nome}</td>
                  <td data-rotulo="Tipo">{TIPOS[vinho.tipo] || vinho.tipo || '—'}</td>
                  <td data-rotulo="Safra" className="num">{vinho.safra || '—'}</td>
                  <td data-rotulo="Garrafas">
                    <span className="estoque">
                      <button
                        disabled={ocupado}
                        aria-label={`Retirar uma garrafa de ${vinho.nome}`}
                        onClick={() => movimentar(vinho.id, -1)}
                      >
                        −
                      </button>
                      <span className="estoque-numero">{vinho.quantidade}</span>
                      <button
                        disabled={ocupado}
                        aria-label={`Adicionar uma garrafa de ${vinho.nome}`}
                        onClick={() => movimentar(vinho.id, 1)}
                      >
                        +
                      </button>
                    </span>
                  </td>
                  <td data-rotulo="Saúde">
                    <span className={`status ${STATUS_SAUDE(vinho.saude)}`}>{vinho.saude}</span>
                  </td>
                  <td className="acao">
                    <button className="botao discreto" disabled={ocupado} onClick={() => remover(vinho.id)}>
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
          <h3>Novo lote</h3>
        </div>
        <div className="bloco-corpo">
          <div className="formulario quatro">
            <div className="campo inteiro-celular">
              <label htmlFor="vinho-nome">Nome do vinho</label>
              <input
                id="vinho-nome"
                value={novo.nome}
                placeholder="Cabernet Sauvignon Reserva"
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
            </div>
            <div className="campo">
              <label htmlFor="vinho-tipo">Tipo</label>
              <select id="vinho-tipo" value={novo.tipo} onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}>
                {Object.entries(TIPOS).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ))}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="vinho-safra">Safra</label>
              <input
                id="vinho-safra"
                type="number"
                inputMode="numeric"
                value={novo.safra}
                placeholder="2018"
                onChange={(e) => setNovo({ ...novo, safra: e.target.value })}
              />
            </div>
            <div className="campo">
              <label htmlFor="vinho-qtd">Garrafas</label>
              <input
                id="vinho-qtd"
                type="number"
                inputMode="numeric"
                value={novo.quantidade}
                onChange={(e) => setNovo({ ...novo, quantidade: e.target.value })}
              />
            </div>
          </div>
          <div className="acoes fim" style={{ marginTop: 18 }}>
            {mensagem && <p className="mensagem" role="status" style={{ margin: 0 }}>{mensagem}</p>}
            <button className="botao primario" disabled={ocupado} onClick={cadastrar}>
              Cadastrar lote
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
