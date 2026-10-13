import { useEffect, useState } from 'react'
import { getComandos, getRelatorio } from '../api'

/**
 * Relatorio consolidado e log de comandos.
 *
 * O relatorio responde "como esta a operacao" e o log responde "o que o
 * sistema fez e quando", que e a evidencia de que a automacao agiu.
 */
const CORES_SAUDE = (saude) => {
  if (saude >= 90) return '#22c55e'
  if (saude >= 70) return '#84cc16'
  if (saude >= 50) return '#f97316'
  return '#ef4444'
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
      <div className="card">
        <p className="vazio">Carregando relatorio...</p>
      </div>
    )
  }

  return (
    <>
      {relatorio && (
        <>
          <div className="card">
            <p className="rotulo">Visao geral da operacao</p>
            <div className="resumo">
              <div>
                <p className="resumo-numero">{relatorio.total_dispositivos}</p>
                <p className="resumo-rotulo">ambientes</p>
              </div>
              <div>
                <p className="resumo-numero">{relatorio.total_garrafas}</p>
                <p className="resumo-rotulo">garrafas</p>
              </div>
              <div>
                <p className="resumo-numero">{relatorio.total_incidentes}</p>
                <p className="resumo-rotulo">incidentes</p>
              </div>
              <div>
                <p className="resumo-numero" style={{ color: CORES_SAUDE(relatorio.saude_media) }}>
                  {relatorio.saude_media}
                </p>
                <p className="resumo-rotulo">saude media</p>
              </div>
            </div>
          </div>

          {relatorio.linhas.map((linha) => (
            <div className="card" key={linha.dispositivo_id}>
              <div className="linha">
                <div>
                  <p className="device-id">{linha.nome}</p>
                  <p className="device-entidade">{linha.local || linha.device_id}</p>
                </div>
                <span
                  className="pill"
                  style={{ color: CORES_SAUDE(linha.saude), borderColor: CORES_SAUDE(linha.saude) }}
                >
                  {linha.saude}
                </span>
              </div>
              <p className="device-entidade espaco">
                {linha.incidentes} incidentes · {formatarDuracao(linha.tempo_total_em_alerta)} em
                alerta · {linha.garrafas} garrafas · {linha.comandos_enviados} comandos
              </p>
            </div>
          ))}

          <button className="botao primario largo" onClick={baixarCsv}>
            Exportar relatorio em CSV
          </button>
        </>
      )}

      <p className="rotulo espaco">Log de comandos</p>
      {comandos.length === 0 && <p className="vazio">Nenhum comando enviado ainda.</p>}

      {comandos.map((registro) => (
        <div className="card compacto" key={registro.id}>
          <div className="linha">
            <div>
              <p className="comando-nome">
                {registro.comando}
                {!registro.sucesso && <span className="falhou"> falhou</span>}
              </p>
              <p className="device-entidade">{formatarMomento(registro.momento)}</p>
            </div>
            <span className={`pill ${registro.origem === 'automatico' ? 'auto' : ''}`}>
              {registro.origem}
            </span>
          </div>
        </div>
      ))}
    </>
  )
}
