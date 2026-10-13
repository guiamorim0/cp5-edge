import { useState } from 'react'
import { acionarAlerta, ligarLampada } from '../api'

/**
 * Controle da lampada e acionamento manual dos alertas.
 * Os botoes manuais servem para demonstrar os tres sons sem precisar
 * mexer nos triggers.
 */
export default function LampControl({ status, dispositivoId, aoMudar }) {
  const [ocupado, setOcupado] = useState(false)
  const ligada = status?.state === 'on'

  async function executar(acao) {
    setOcupado(true)
    try {
      await acao()
      await aoMudar()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="card">
      <div className="linha">
        <div>
          <p className="rotulo">Lampada</p>
          <p className={`estado ${ligada ? 'ligada' : ''}`}>
            {ligada ? 'Ligada' : 'Desligada'}
          </p>
        </div>
        <button
          className={`botao grande ${ligada ? 'perigo' : 'primario'}`}
          disabled={ocupado}
          onClick={() => executar(() => ligarLampada(ligada ? 'off' : 'on', dispositivoId))}
        >
          {ligada ? 'Desligar' : 'Ligar'}
        </button>
      </div>

      <p className="rotulo espaco">Teste manual dos alertas</p>
      <div className="botoes">
        <button className="botao" disabled={ocupado} onClick={() => executar(() => acionarAlerta('alerttemp', dispositivoId))}>
          Temperatura
        </button>
        <button className="botao" disabled={ocupado} onClick={() => executar(() => acionarAlerta('alerthum', dispositivoId))}>
          Umidade
        </button>
        <button className="botao" disabled={ocupado} onClick={() => executar(() => acionarAlerta('alertlum', dispositivoId))}>
          Luminosidade
        </button>
        <button className="botao perigo" disabled={ocupado} onClick={() => executar(() => acionarAlerta('alertoff', dispositivoId))}>
          Silenciar
        </button>
      </div>
    </div>
  )
}
