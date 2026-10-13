import { useState } from 'react'
import { restaurarSimulacao, simular } from '../api'

/**
 * Modo de demonstracao.
 *
 * Numa apresentacao nem sempre da para esquentar o sensor na hora certa.
 * Cada cenario estreita temporariamente o limite da grandeza escolhida, de
 * modo que a leitura REAL passe a ficar fora da faixa. Nenhum valor e
 * inventado: o que muda e a exigencia, e o resto do fluxo acontece de
 * verdade, com alerta, atuador e incidente registrado.
 */
const CENARIOS = [
  { id: 'calor', rotulo: 'Calor excessivo', detalhe: 'liga o ar condicionado' },
  { id: 'frio', rotulo: 'Frio excessivo', detalhe: 'temperatura abaixo do limite' },
  { id: 'seco', rotulo: 'Ar seco', detalhe: 'liga o umidificador' },
  { id: 'umido', rotulo: 'Umidade alta', detalhe: 'umidade acima do limite' },
  { id: 'luz', rotulo: 'Luz demais', detalhe: 'apaga a iluminacao' },
]

export default function SimulationPanel({ dispositivoId, aoMudar }) {
  const [ocupado, setOcupado] = useState(false)
  const [ativo, setAtivo] = useState(null)
  const [mensagem, setMensagem] = useState(null)

  async function disparar(cenario) {
    setOcupado(true)
    try {
      const resultado = await simular(cenario, dispositivoId)
      setAtivo(cenario)
      setMensagem(resultado.mensagem)
      await aoMudar()
    } catch (e) {
      setMensagem(e.response?.data?.detail || 'Nao foi possivel simular')
    } finally {
      setOcupado(false)
    }
  }

  async function restaurar() {
    setOcupado(true)
    try {
      await restaurarSimulacao(dispositivoId)
      setAtivo(null)
      setMensagem('Limites originais restaurados')
      await aoMudar()
    } catch (e) {
      setMensagem(e.response?.data?.detail || 'Nenhuma simulacao ativa')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <>
      <div className="card">
        <p className="rotulo">Simulacao de cenario critico</p>
        <p className="explicacao">
          O limite da grandeza escolhida e estreitado para que a leitura real do
          sensor fique fora da faixa. O alerta, o atuador e o registro do
          incidente acontecem normalmente.
        </p>

        <div className="cenarios">
          {CENARIOS.map(({ id, rotulo, detalhe }) => (
            <button
              key={id}
              className={`cenario ${ativo === id ? 'ativo' : ''}`}
              disabled={ocupado}
              onClick={() => disparar(id)}
            >
              <span className="cenario-titulo">{rotulo}</span>
              <span className="cenario-detalhe">{detalhe}</span>
            </button>
          ))}
        </div>

        <button className="botao primario largo" disabled={ocupado} onClick={restaurar}>
          Restaurar limites originais
        </button>

        {mensagem && <p className="mensagem">{mensagem}</p>}
      </div>
    </>
  )
}
