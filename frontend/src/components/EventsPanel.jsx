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

const UNIDADES = { temperature: 'C', humidity: '%', luminosity: '%' }
const CORES = { temperature: '#f97316', humidity: '#38bdf8', luminosity: '#facc15' }

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
      <div className="card">
        <p className="vazio">Carregando historico...</p>
      </div>
    )
  }

  return (
    <>
      <div className="card">
        <p className="rotulo">Incidentes neste ambiente</p>
        <div className="resumo">
          <div>
            <p className="resumo-numero">{eventos.length}</p>
            <p className="resumo-rotulo">total</p>
          </div>
          {Object.keys(NOMES).map((chave) => (
            <div key={chave}>
              <p className="resumo-numero" style={{ color: CORES[chave] }}>
                {porGrandeza[chave] || 0}
              </p>
              <p className="resumo-rotulo">{NOMES[chave]}</p>
            </div>
          ))}
        </div>
      </div>

      {eventos.length === 0 && <p className="vazio">Nenhum alerta disparado ate agora.</p>}

      {eventos.map((evento) => (
        <div className="card evento" key={evento.id}>
          <div className="linha">
            <div>
              <p className="evento-titulo" style={{ color: CORES[evento.grandeza] }}>
                {NOMES[evento.grandeza]}
              </p>
              <p className="evento-detalhe">
                {evento.valor}
                {UNIDADES[evento.grandeza]} fora da faixa de {evento.limite_minimo} a{' '}
                {evento.limite_maximo}
                {UNIDADES[evento.grandeza]}
              </p>
              <p className="evento-detalhe">{formatarData(evento.inicio)}</p>
            </div>
            <span className={`duracao ${evento.fim ? '' : 'ativo'}`}>
              {formatarDuracao(evento.duracao_segundos)}
            </span>
          </div>
        </div>
      ))}
    </>
  )
}
