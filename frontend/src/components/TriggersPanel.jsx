import { useEffect, useState } from 'react'
import { getTriggers, salvarTriggers } from '../api'

const GRANDEZAS = [
  { chave: 'temperature', titulo: 'Temperatura', unidade: '°C', min: -10, max: 60 },
  { chave: 'humidity', titulo: 'Umidade', unidade: '%', min: 0, max: 100 },
  { chave: 'luminosity', titulo: 'Luminosidade', unidade: '%', min: 0, max: 100 },
]

/**
 * Tela de ajuste dos limites. Cada grandeza tem slider (rapido de mexer na
 * apresentacao) e campo numerico (preciso), e mostra o valor atual do sensor
 * ao lado, para dar para ver o momento em que ele sai da faixa.
 */
export default function TriggersPanel({ status, dispositivoId, aoSalvar }) {
  const [triggers, setTriggers] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    getTriggers(dispositivoId)
      .then(setTriggers)
      .catch(() => setMensagem('Não foi possível carregar os limites'))
  }, [dispositivoId])

  function alterar(chave, campo, valor) {
    setTriggers((anterior) => ({
      ...anterior,
      [chave]: { ...anterior[chave], [campo]: Number(valor) },
    }))
  }

  async function salvar() {
    setSalvando(true)
    try {
      await salvarTriggers(triggers, dispositivoId)
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

  if (!triggers) {
    return (
      <section className="bloco">
        <p className="vazio">Carregando limites…</p>
      </section>
    )
  }

  return (
    <>
      <section className="bloco">
        <div className="bloco-cabeca">
          <h3>Faixas aceitas</h3>
          <span className="apoio">fora delas o alerta e o atuador são acionados</span>
        </div>
        <ul className="lista">
          {GRANDEZAS.map(({ chave, titulo, unidade, min, max }) => {
            const faixa = triggers[chave]
            const atual = status?.[chave]
            const fora = atual != null && (atual < faixa.minimo || atual > faixa.maximo)

            return (
              <li key={chave}>
                <div className={`limite ${fora ? 'fora' : ''}`} style={{ width: '100%' }}>
                  <div>
                    <p className="lista-nome">{titulo}</p>
                    <p className="limite-atual">
                      leitura atual <strong>{atual ?? '—'}{unidade}</strong>
                    </p>
                  </div>

                  {['minimo', 'maximo'].map((campo) => {
                    const id = `${chave}-${campo}`
                    return (
                      <div className="ajuste" key={campo}>
                        <label htmlFor={id}>{campo === 'minimo' ? 'Mínimo' : 'Máximo'}</label>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          value={faixa[campo]}
                          aria-label={`${titulo} ${campo}`}
                          onChange={(e) => alterar(chave, campo, e.target.value)}
                        />
                        <input
                          id={id}
                          type="number"
                          inputMode="decimal"
                          value={faixa[campo]}
                          onChange={(e) => alterar(chave, campo, e.target.value)}
                        />
                      </div>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="acoes fim">
        {mensagem && <p className="mensagem" role="status" style={{ margin: 0 }}>{mensagem}</p>}
        <button className="botao primario" disabled={salvando} onClick={salvar}>
          {salvando ? 'Salvando…' : 'Salvar limites'}
        </button>
      </div>
    </>
  )
}
