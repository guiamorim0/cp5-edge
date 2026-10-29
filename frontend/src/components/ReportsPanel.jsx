import { useEffect, useState } from 'react'
import { getComandos, getRelatorio } from '../api'

/**
 * Relatorio consolidado e log de comandos.
 *
 * O relatorio responde "como esta a operacao" e o log responde "o que o
 * sistema fez e quando", que e a evidencia de que a automacao agiu.
 */
const STATUS_SAUDE = (saude) => {
  if (saude >= 70) return 'bom'
  if (saude >= 50) return 'atencao'
  return 'critico'
}

function formatarDuracao(segundos) {
  if (!segundos) return '0s'
  if (segundos < 60) return `${segundos}s`
  const minutos = Math.floor(segundos / 60)
  return `${minutos}min`
}

function formatarMomento(valor) {
  if (!valor) return ''
  const iso = valor.endsWith('Z') ? valor : `${valor}Z`
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function ReportsPanel({ dispositivoId }) {
  const [relatorio, setRelatorio] = useState(null)
  const [comandos, setComandos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    Promise.all([getRelatorio(), getComandos(dispositivoId, 50)])
      .then(([r, c]) => {
        setRelatorio(r)
        setComandos(c)
      })
      .catch(() => setRelatorio(null))
      .finally(() => setCarregando(false))
  }, [dispositivoId])

  // O CSV vem da propria API, entao o arquivo e identico ao do relatorio
  function baixarCsv() {
    window.open('/api/relatorios/csv', '_blank')
  }

  if (carregando) {
    return (
      <section className="bloco">
        <p className="vazio">Carregando relatório…</p>
      </section>
    )
  }

  return (
    <>
      {relatorio && (
        <>
          <section className="bloco">
            <div className="resumo">
              <div>
                <p className="numero">{relatorio.total_dispositivos}</p>
                <span className="rotulo">ambientes</span>
              </div>
              <div>
                <p className="numero">{relatorio.total_garrafas}</p>
                <span className="rotulo">garrafas</span>
              </div>
              <div>
                <p className="numero">{relatorio.total_incidentes}</p>
                <span className="rotulo">incidentes</span>
              </div>
              <div>
                <p className={`numero ${relatorio.saude_media < 70 ? 'destaque' : ''}`}>
                  {relatorio.saude_media}
                </p>
                <span className="rotulo">saúde média</span>
              </div>
            </div>
          </section>

          <section className="bloco">
            <div className="bloco-cabeca">
              <h3>Por ambiente</h3>
              <button className="link" onClick={baixarCsv}>Exportar CSV</button>
            </div>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Ambiente</th>
                  <th>Saúde</th>
                  <th className="num">Incidentes</th>
                  <th className="num">Em alerta</th>
                  <th className="num">Garrafas</th>
                  <th className="num">Comandos</th>
                </tr>
              </thead>
              <tbody>
                {relatorio.linhas.map((linha) => (
                  <tr key={linha.dispositivo_id}>
                    <td className="principal">
                      {linha.nome}
                      <div className="secundario">{linha.local || linha.device_id}</div>
                    </td>
                    <td data-rotulo="Saúde">
                      <span className={`status ${STATUS_SAUDE(linha.saude)}`}>{linha.saude}</span>
                    </td>
                    <td data-rotulo="Incidentes" className="num">{linha.incidentes}</td>
                    <td data-rotulo="Em alerta" className="num">{formatarDuracao(linha.tempo_total_em_alerta)}</td>
                    <td data-rotulo="Garrafas" className="num">{linha.garrafas}</td>
                    <td data-rotulo="Comandos" className="num">{linha.comandos_enviados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section className="bloco">
        <div className="bloco-cabeca">
          <h3>Log de comandos</h3>
          <span className="apoio">tudo que foi enviado ao dispositivo</span>
        </div>

        {comandos.length === 0 ? (
          <p className="vazio">Nenhum comando enviado ainda.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Comando</th>
                <th>Momento</th>
                <th>Origem</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {comandos.map((registro) => (
                <tr key={registro.id}>
                  <td className="principal"><code>{registro.comando}</code></td>
                  <td data-rotulo="Momento">{formatarMomento(registro.momento)}</td>
                  <td data-rotulo="Origem">
                    {registro.origem === 'automatico' ? 'Automático' : 'Manual'}
                  </td>
                  <td data-rotulo="Resultado">
                    {registro.sucesso ? (
                      <span className="status bom">enviado</span>
                    ) : (
                      <span className="status critico" title={registro.detalhe}>falhou</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
