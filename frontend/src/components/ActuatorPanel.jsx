import { useState } from 'react'
import { acionarAtuador, ligarLampada } from '../api'

/**
 * Controle da lampada e dos atuadores.
 *
 * O sistema nao apenas avisa: ele age. Estes mesmos comandos sao enviados
 * automaticamente quando um valor sai da faixa, e aqui ficam disponiveis
 * para acionamento manual.
 *
 * O ESP32 so informa o estado da lampada. Dos atuadores, o que aparece
 * marcado e o ultimo comando enviado por esta tela.
 */
const INTENSIDADES = [
  { comando: 'luz0', rotulo: 'Apagada' },
  { comando: 'luz1', rotulo: 'Baixa' },
  { comando: 'luz2', rotulo: 'Média' },
  { comando: 'luz3', rotulo: 'Alta' },
]

const ATUADORES = [
  { id: 'ar', nome: 'Ar condicionado', detalhe: 'Corrige temperatura alta', liga: 'acon', desliga: 'acoff' },
  { id: 'umid', nome: 'Umidificador', detalhe: 'Corrige ar seco', liga: 'umidon', desliga: 'umidoff' },
]

export default function ActuatorPanel({ status, dispositivoId, aoMudar }) {
  const [ocupado, setOcupado] = useState(false)
  const [ultimos, setUltimos] = useState({})
  const ligada = status?.state === 'on'

  async function executar(chave, comando, acao) {
    setOcupado(true)
    try {
      await acao()
      setUltimos((atual) => ({ ...atual, [chave]: comando }))
      await aoMudar()
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="bloco">
      <div className="bloco-cabeca">
        <h3>Controles</h3>
        <span className="apoio">acionamento manual</span>
      </div>

      <ul className="lista">
        <li>
          <div>
            <p className="lista-nome">Lâmpada</p>
            <p className="lista-detalhe">{ligada ? 'Ligada' : 'Desligada'}, informado pelo dispositivo</p>
          </div>
          <div className="segmentado" role="group" aria-label="Lâmpada">
            {[['on', 'Ligar'], ['off', 'Desligar']].map(([acao, rotulo]) => (
              <button
                key={acao}
                className={(acao === 'on') === ligada ? 'ativo' : ''}
                aria-pressed={(acao === 'on') === ligada}
                disabled={ocupado}
                onClick={() => executar('lampada', acao, () => ligarLampada(acao, dispositivoId))}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </li>

        {ATUADORES.map(({ id, nome, detalhe, liga, desliga }) => (
          <li key={id}>
            <div>
              <p className="lista-nome">{nome}</p>
              <p className="lista-detalhe">{detalhe}</p>
            </div>
            <div className="segmentado" role="group" aria-label={nome}>
              {[[liga, 'Ligar'], [desliga, 'Desligar']].map(([comando, rotulo]) => (
                <button
                  key={comando}
                  className={ultimos[id] === comando ? 'ativo' : ''}
                  aria-pressed={ultimos[id] === comando}
                  disabled={ocupado}
                  onClick={() => executar(id, comando, () => acionarAtuador(comando, dispositivoId))}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          </li>
        ))}

        <li>
          <div>
            <p className="lista-nome">Intensidade da luz</p>
            <p className="lista-detalhe">Luz degrada o vinho: quanto menos, melhor</p>
          </div>
          <div className="segmentado" role="group" aria-label="Intensidade da luz">
            {INTENSIDADES.map(({ comando, rotulo }) => (
              <button
                key={comando}
                className={ultimos.luz === comando ? 'ativo' : ''}
                aria-pressed={ultimos.luz === comando}
                disabled={ocupado}
                onClick={() => executar('luz', comando, () => acionarAtuador(comando, dispositivoId))}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </li>
      </ul>
    </section>
  )
}
