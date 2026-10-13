import { useState } from 'react'
import { acionarAtuador } from '../api'

/**
 * Controle dos atuadores.
 *
 * O sistema nao apenas avisa: ele age. Estes mesmos comandos sao enviados
 * automaticamente quando um valor sai da faixa, e aqui ficam disponiveis
 * para acionamento manual.
 */
const INTENSIDADES = [
  { comando: 'luz0', rotulo: 'Apagada' },
  { comando: 'luz1', rotulo: 'Baixa' },
  { comando: 'luz2', rotulo: 'Media' },
  { comando: 'luz3', rotulo: 'Alta' },
]

export default function ActuatorPanel({ dispositivoId, aoMudar }) {
  const [ocupado, setOcupado] = useState(false)
  const [ultimo, setUltimo] = useState(null)

  async function enviar(comando) {
    setOcupado(true)
    try {
      await acionarAtuador(comando, dispositivoId)
      setUltimo(comando)
      await aoMudar()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="card">
      <p className="rotulo">Atuadores</p>

      <div className="linha espacado">
        <span className="atuador-nome">Ar condicionado</span>
        <div className="botoes-inline">
          <button className="botao" disabled={ocupado} onClick={() => enviar('acon')}>
            Ligar
          </button>
          <button className="botao" disabled={ocupado} onClick={() => enviar('acoff')}>
            Desligar
          </button>
        </div>
      </div>

      <div className="linha espacado">
        <span className="atuador-nome">Umidificador</span>
        <div className="botoes-inline">
          <button className="botao" disabled={ocupado} onClick={() => enviar('umidon')}>
            Ligar
          </button>
          <button className="botao" disabled={ocupado} onClick={() => enviar('umidoff')}>
            Desligar
          </button>
        </div>
      </div>

      <p className="rotulo espaco">Intensidade da luz</p>
      <div className="botoes">
        {INTENSIDADES.map(({ comando, rotulo }) => (
          <button
            key={comando}
            className={`botao ${ultimo === comando ? 'primario' : ''}`}
            disabled={ocupado}
            onClick={() => enviar(comando)}
          >
            {rotulo}
          </button>
        ))}
      </div>
    </div>
  )
}
