import { useState } from 'react'
import { acionarAlerta } from '../api'

/**
 * Acionamento manual dos alertas.
 * Serve para demonstrar cada padrao de LED e buzzer sem precisar mexer
 * nos limites.
 */
const ALERTAS = [
  { comando: 'alerttemp', rotulo: 'Temperatura' },
  { comando: 'alerthum', rotulo: 'Umidade' },
  { comando: 'alertlum', rotulo: 'Luminosidade' },
]

export default function AlertTestPanel({ dispositivoId, aoMudar }) {
  const [ocupado, setOcupado] = useState(false)

  async function enviar(comando) {
    setOcupado(true)
    try {
      await acionarAlerta(comando, dispositivoId)
      await aoMudar()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="bloco">
      <div className="bloco-cabeca">
        <h3>Teste de alertas</h3>
      </div>
      <div className="bloco-corpo">
        <p className="explicacao">
          Dispara o sinal de cada anomalia no dispositivo, com o padrão próprio de luz e som.
        </p>
        <div className="acoes">
          {ALERTAS.map(({ comando, rotulo }) => (
            <button key={comando} className="botao" disabled={ocupado} onClick={() => enviar(comando)}>
              {rotulo}
            </button>
          ))}
          <button className="botao primario" disabled={ocupado} onClick={() => enviar('alertoff')}>
            Silenciar
          </button>
        </div>
      </div>
    </section>
  )
}
