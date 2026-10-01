import { useEffect, useState } from 'react'
import { getTriggers, salvarTriggers } from '../api'

const GRANDEZAS = [
  { chave: 'temperature', titulo: 'Temperatura', unidade: 'C', min: -10, max: 60 },
  { chave: 'humidity', titulo: 'Umidade', unidade: '%', min: 0, max: 100 },
  { chave: 'luminosity', titulo: 'Luminosidade', unidade: '%', min: 0, max: 100 },
]

/**
 * Tela de ajuste dos limites. Cada grandeza tem slider (rapido de mexer na
 * apresentacao) e campo numerico (preciso), e mostra o valor atual do sensor
 * ao lado, para dar para ver o momento em que ele sai da faixa.
 */
export default function TriggersPanel({ status, aoSalvar }) {
  const [triggers, setTriggers] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    getTriggers().then(setTriggers).catch(() => setMensagem('Nao foi possivel carregar os limites'))
  }, [])

  function alterar(chave, campo, valor) {
    setTriggers((anterior) => ({
      ...anterior,
      [chave]: { ...anterior[chave], [campo]: Number(valor) },
    }))
  }

  async function salvar() {
    setSalvando(true)
    try {
      await salvarTriggers(triggers)
      // Avalia na hora: esperar o proximo polling daria impressao de nao ter funcionado
      await aoSalvar()
      setMensagem('Limites salvos')
    } catch {
      setMensagem('Erro ao salvar os limites')
    } finally {
      setSalvando(false)
      setTimeout(() => setMensagem(null), 3000)
    }
  }

  if (!triggers) return <div className="card"><p className="vazio">Carregando limites...</p></div>

  return (
    <>
      {GRANDEZAS.map(({ chave, titulo, unidade, min, max }) => {
        const faixa = triggers[chave]
        const atual = status?.[chave]
        const fora = atual != null && (atual < faixa.minimo || atual > faixa.maximo)

        return (
          <div className={`card ${fora ? 'alerta' : ''}`} key={chave}>
            <div className="linha">
              <p className="rotulo">{titulo}</p>
              <p className="atual">
                atual: <strong>{atual ?? '--'}{unidade}</strong>
              </p>
            </div>

            {['minimo', 'maximo'].map((campo) => (
              <div className="campo" key={campo}>
                <label>{campo === 'minimo' ? 'Minimo' : 'Maximo'}</label>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={faixa[campo]}
                  onChange={(e) => alterar(chave, campo, e.target.value)}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={faixa[campo]}
                  onChange={(e) => alterar(chave, campo, e.target.value)}
                />
              </div>
            ))}
          </div>
        )
      })}

      <button className="botao primario largo" disabled={salvando} onClick={salvar}>
        {salvando ? 'Salvando...' : 'Salvar limites'}
      </button>
      {mensagem && <p className="mensagem">{mensagem}</p>}
    </>
  )
}
