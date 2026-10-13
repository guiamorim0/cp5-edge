import { useCallback, useEffect, useRef, useState } from 'react'
import { avaliarAlertas, getHistorico, getSaude, getStatus } from '../api'

// Mesmo intervalo em que o ESP32 publica: buscar mais rapido nao traz dado novo.
const INTERVALO = 5000
const MAX_PONTOS = 100

/**
 * Concentra o ciclo de vida dos dados do dashboard:
 * carrega o historico do STH, faz o polling do status e pede a avaliacao
 * dos limites a cada leitura. Tudo relativo ao dispositivo selecionado.
 */
export function useMonitoramento(dispositivoId) {
  const [status, setStatus] = useState(null)
  const [historico, setHistorico] = useState([])
  const [saude, setSaude] = useState(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(true)

  // Evita que duas rodadas do polling se sobreponham em conexao lenta
  const emAndamento = useRef(false)

  const atualizar = useCallback(async () => {
    if (emAndamento.current) return
    emAndamento.current = true
    try {
      const leitura = await getStatus(dispositivoId)
      setStatus(leitura)
      setErro(null)

      // Acrescenta a leitura no fim do grafico, mantendo os ultimos 100 pontos
      setHistorico((anterior) => {
        const ponto = {
          time: new Date().toISOString().slice(0, 19),
          temperature: leitura.temperature,
          humidity: leitura.humidity,
          luminosity: leitura.luminosity,
        }
        return [...anterior, ponto].slice(-MAX_PONTOS)
      })

      // E aqui que o front "aciona" o alerta: a API compara com os limites
      // configurados e envia os comandos ao ESP32 quando necessario.
      await avaliarAlertas(dispositivoId)
      setSaude(await getSaude(dispositivoId))
    } catch (e) {
      setErro(e.response?.data?.detail || 'Nao foi possivel falar com a API')
    } finally {
      emAndamento.current = false
      setCarregando(false)
    }
  }, [dispositivoId])

  // Carga inicial do grafico: ja nasce com o historico do STH.
  // Reinicia quando o usuario troca de dispositivo.
  useEffect(() => {
    setCarregando(true)
    setHistorico([])
    getHistorico(dispositivoId, MAX_PONTOS)
      .then((dados) => setHistorico(dados.slice(-MAX_PONTOS)))
      .catch(() => setHistorico([]))
      .finally(atualizar)
  }, [dispositivoId, atualizar])

  // Polling. O clearInterval no retorno evita timer duplicado a cada render.
  useEffect(() => {
    const timer = setInterval(atualizar, INTERVALO)
    return () => clearInterval(timer)
  }, [atualizar])

  return { status, historico, saude, erro, carregando, atualizar }
}
