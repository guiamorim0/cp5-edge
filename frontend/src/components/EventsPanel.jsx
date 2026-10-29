import { useEffect, useState } from 'react'
import { getEventos } from '../api'

/**
 * Historico dos incidentes.
 *
 * O grafico mostra os VALORES lidos; esta tela mostra os EVENTOS: quando o
 * alerta disparou, por que e quanto tempo durou. E o registro que interessa
 * a quem cuida da vinheria, e e dele que sai o indice de saude.
 */
const NOMES = {
  temperature: 'Temperatura',
  humidity: 'Umidade',
  luminosity: 'Luminosidade',
}

const UNIDADES = { temperature: '°C', humidity: '%', luminosity: '%' }

// Os horarios sao gravados em UTC: converte para o fuso local
function formatarData(valor) {
  if (!valor) return ''
  const iso = valor.endsWith('Z') ? valor : `${valor}Z`
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarDuracao(segundos) {
  if (segundos === null || segundos === undefined) return 'em andamento'
  if (segundos < 60) return `${segundos}s`
  const minutos = Math.floor(segundos / 60)
  const resto = segundos % 60
  return resto ? `${minutos}min ${resto}s` : `${minutos}min`
}

export default function EventsPanel({ dispositivoId }) {
  const [eventos, setEventos] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    setCarregando(true)
    getEventos(dispositivoId, 50)
      .then(setEventos)
      .catch(() => setEventos([]))
      .finally(() => setCarregando(false))
  }, [dispositivoId])

  // Contagem por grandeza, calculada a partir da propria lista
  const porGrandeza = eventos.reduce(
    (acc, evento) => ({ ...acc, [evento.grandeza]: (acc[evento.grandeza] || 0) + 1 }),
    {}
  )

  if (carregando) {
    return (
      <section className="bloco">
        <p className="vazio">Carregando histórico…</p>
      </section>
    )
  }

  return (
    <>
      <section className="bloco">
        <div className="resumo">
          <div>
            <p className="numero">{eventos.length}</p>
            <span className="rotulo">incidentes</span>
          </div>
          {Object.keys(NOMES).map((chave) => (
            <div key={chave}>
              <p className="numero">{porGrandeza[chave] || 0}</p>
              <span className="rotulo">{NOMES[chave]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bloco">
        <div className="bloco-cabeca">
          <h3>Registro de incidentes</h3>
          <span className="apoio">mais recentes primeiro</span>
        </div>

        {eventos.length === 0 ? (
          <p className="vazio">Nenhum alerta disparado até agora.</p>
        ) : (
          <table className="tabela">
            <thead>
              <tr>
                <th>Grandeza</th>
                <th>Início</th>
                <th className="num">Leitura</th>
                <th>Faixa</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              {eventos.map((evento) => {
                const unidade = UNIDADES[evento.grandeza]
                return (
                  <tr key={evento.id}>
                    <td className="principal">{NOMES[evento.grandeza]}</td>
                    <td data-rotulo="Início">{formatarData(evento.inicio)}</td>
                    <td data-rotulo="Leitura" className="num">
                      {evento.valor}
                      {unidade}
                    </td>
                    <td data-rotulo="Faixa" className="secundario">
                      {evento.limite_minimo} a {evento.limite_maximo}
                      {unidade}
                    </td>
                    <td data-rotulo="Duração">
                      {evento.fim ? (
                        formatarDuracao(evento.duracao_segundos)
                      ) : (
                        <span className="status ativo">em andamento</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
