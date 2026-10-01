import { useState } from 'react'
import { acionarAlerta, ligarLampada } from '../api'

/**
 * Controle da lampada e acionamento manual dos alertas.
 * Os botoes manuais servem para demonstrar os tres sons sem precisar
 * mexer nos triggers.
 */
export default function LampControl({ status, aoMudar }) {
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
          onClick={() => executar(() => ligarLampada(ligada ? 'off' : 'on'))}
        >
          {ligada ? 'Desligar' : 'Ligar'}
        </button>
      </div>

      <p className="rotulo espaco">Teste manual dos alertas</p>
      <div className="botoes">
        <button className="botao" disabled={ocupado} onClick={() => executar(() => acionarAlerta('alerttemp'))}>
          Temperatura
        </button>
        <button className="botao" disabled={ocupado} onClick={() => executar(() => acionarAlerta('alerthum'))}>
          Umidade
        </button>
        <button className="botao" disabled={ocupado} onClick={() => executar(() => acionarAlerta('alertlum'))}>
          Luminosidade
        </button>
        <button className="botao perigo" disabled={ocupado} onClick={() => executar(() => acionarAlerta('alertoff'))}>
          Silenciar
        </button>
      </div>
    </div>
  )
}
