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
  { id: 'luz', rotulo: 'Luz demais', detalhe: 'apaga a iluminação' },
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
      setMensagem(e.response?.data?.detail || 'Não foi possível simular')
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
      setMensagem(e.response?.data?.detail || 'Nenhuma simulação ativa')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="bloco">
      <div className="bloco-cabeca">
        <h3>Cenários críticos</h3>
        {ativo && <span className="status ativo">simulação ativa</span>}
      </div>
      <div className="bloco-corpo">
        <p className="explicacao">
          O limite da grandeza escolhida é estreitado para que a leitura real do
          sensor fique fora da faixa. O alerta, o atuador e o registro do
          incidente acontecem normalmente. Nenhum valor é inventado.
        </p>
      </div>

      <ul className="lista" style={{ borderTop: '1px solid var(--linha)' }}>
        {CENARIOS.map(({ id, rotulo, detalhe }) => (
          <li key={id}>
            <div>
              <p className="lista-nome">{rotulo}</p>
              <p className="lista-detalhe">{detalhe}</p>
            </div>
            {ativo === id ? (
              <span className="status ativo">em curso</span>
            ) : (
              <button className="botao" disabled={ocupado} onClick={() => disparar(id)}>
                Simular
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="bloco-corpo" style={{ borderTop: '1px solid var(--linha)' }}>
        <div className="acoes fim">
          {mensagem && <p className="mensagem" role="status" style={{ margin: 0 }}>{mensagem}</p>}
          <button className="botao primario" disabled={ocupado} onClick={restaurar}>
            Restaurar limites originais
          </button>
        </div>
      </div>
    </section>
  )
}
