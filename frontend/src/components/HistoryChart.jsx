import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const SERIES = [
  { chave: 'temperature', nome: 'Temperatura (°C)', cor: '#6b1e2e', eixo: 'esq' },
  { chave: 'humidity', nome: 'Umidade (%)', cor: '#4a6378', eixo: 'esq' },
  { chave: 'luminosity', nome: 'Luminosidade (%)', cor: '#a8843f', eixo: 'dir' },
]

// Mesmos tons do styles.css: papel, linha e tinta
const LINHA = '#e2d8c6'
const TINTA_FRACA = '#7d6e64'

// O STH grava em UTC: converte para o fuso local antes de mostrar.
function formatarHora(valor) {
  if (!valor) return ''
  const iso = valor.endsWith('Z') ? valor : `${valor}Z`
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Grafico dinamico com as tres grandezas.
 *
 * Temperatura e umidade ficam no eixo da esquerda e a luminosidade no da
 * direita: as escalas sao diferentes e, num eixo so, uma linha achataria as
 * outras. Os filtros permitem isolar uma grandeza, util no celular e para
 * destacar a anomalia durante a apresentacao.
 */
export default function HistoryChart({ dados }) {
  const [visiveis, setVisiveis] = useState(() => SERIES.map((s) => s.chave))
  const [mostrarMedia, setMostrarMedia] = useState(true)

  // Media de cada grandeza, ignorando leituras vazias
  const medias = useMemo(() => {
    const resultado = {}
    SERIES.forEach(({ chave }) => {
      const valores = dados.map((d) => d[chave]).filter((v) => v !== null && v !== undefined)
      resultado[chave] = valores.length
        ? Number((valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1))
        : null
    })
    return resultado
  }, [dados])

  function alternar(chave) {
    setVisiveis((atual) =>
      atual.includes(chave) ? atual.filter((c) => c !== chave) : [...atual, chave]
    )
  }

  if (!dados.length) {
    return (
      <section className="bloco">
        <div className="bloco-cabeca"><h3>Histórico</h3></div>
        <p className="vazio">Aguardando as primeiras leituras do STH-Comet…</p>
      </section>
    )
  }

  // Com poucos pontos os marcadores ajudam a ler; com muitos, viram uma mancha
  const mostrarPontos = dados.length <= 30

  return (
    <section className="bloco">
      <div className="bloco-cabeca">
        <h3>Histórico</h3>
        <span className="apoio">
          últimas {dados.length} leituras ·{' '}
          <button className="link" onClick={() => setMostrarMedia((v) => !v)}>
            {mostrarMedia ? 'ocultar médias' : 'mostrar médias'}
          </button>
        </span>
      </div>
      <div className="bloco-corpo">

      <div className="filtros">
        {SERIES.map(({ chave, nome, cor }) => (
          <button
            key={chave}
            className={`chip ${visiveis.includes(chave) ? 'ativo' : ''}`}
            style={{ '--cor': cor }}
            aria-pressed={visiveis.includes(chave)}
            onClick={() => alternar(chave)}
          >
            {nome.split(' ')[0]}
            {medias[chave] !== null && <span className="chip-media"> {medias[chave]}</span>}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={LINHA} vertical={false} />
          <XAxis dataKey="time" tickFormatter={formatarHora} stroke={LINHA} tick={{ fill: TINTA_FRACA }} fontSize={12} minTickGap={40} />
          <YAxis yAxisId="esq" stroke={LINHA} tick={{ fill: TINTA_FRACA }} fontSize={12} />
          <YAxis yAxisId="dir" orientation="right" stroke={LINHA} tick={{ fill: TINTA_FRACA }} fontSize={12} domain={[0, 100]} />
          <Tooltip
            labelFormatter={formatarHora}
            contentStyle={{ background: '#fcfaf5', border: `1px solid ${LINHA}`, borderRadius: 3, color: '#2b211d' }}
          />

          {SERIES.filter(({ chave }) => visiveis.includes(chave)).map(({ chave, nome, cor, eixo }) => (
            <Line
              key={chave}
              yAxisId={eixo}
              type="monotone"
              dataKey={chave}
              name={nome}
              stroke={cor}
              strokeWidth={1.75}
              dot={mostrarPontos ? { r: 2.5, fill: cor, strokeWidth: 0 } : false}
              connectNulls
              isAnimationActive={false}
            />
          ))}

          {/* Linha tracejada com a media de cada grandeza visivel */}
          {mostrarMedia &&
            SERIES.filter(({ chave }) => visiveis.includes(chave) && medias[chave] !== null).map(
              ({ chave, cor, eixo }) => (
                <ReferenceLine
                  key={`media-${chave}`}
                  yAxisId={eixo}
                  y={medias[chave]}
                  stroke={cor}
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                />
              )
            )}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </section>
  )
}
