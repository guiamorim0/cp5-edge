import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const SERIES = [
  { chave: 'temperature', nome: 'Temperatura (C)', cor: '#f97316', eixo: 'esq' },
  { chave: 'humidity', nome: 'Umidade (%)', cor: '#38bdf8', eixo: 'esq' },
  { chave: 'luminosity', nome: 'Luminosidade (%)', cor: '#facc15', eixo: 'dir' },
]

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
      <div className="card">
        <p className="rotulo">Historico</p>
        <p className="vazio">Aguardando as primeiras leituras do STH-Comet...</p>
      </div>
    )
  }

  // Com poucos pontos os marcadores ajudam a ler; com muitos, viram uma mancha
  const mostrarPontos = dados.length <= 30

  return (
    <div className="card">
      <div className="linha">
        <p className="rotulo">Historico ({dados.length} leituras)</p>
        <button className="link" onClick={() => setMostrarMedia((v) => !v)}>
          {mostrarMedia ? 'ocultar medias' : 'mostrar medias'}
        </button>
      </div>

      <div className="filtros">
        {SERIES.map(({ chave, nome, cor }) => (
          <button
            key={chave}
            className={`chip ${visiveis.includes(chave) ? 'ativo' : ''}`}
            style={visiveis.includes(chave) ? { borderColor: cor, color: cor } : undefined}
            onClick={() => alternar(chave)}
          >
            {nome.split(' ')[0]}
            {medias[chave] !== null && <span className="chip-media"> {medias[chave]}</span>}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
          <XAxis dataKey="time" tickFormatter={formatarHora} stroke="#64748b" fontSize={11} minTickGap={40} />
          <YAxis yAxisId="esq" stroke="#64748b" fontSize={11} />
          <YAxis yAxisId="dir" orientation="right" stroke="#64748b" fontSize={11} domain={[0, 100]} />
          <Tooltip
            labelFormatter={formatarHora}
            contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8 }}
          />
          <Legend />

          {SERIES.filter(({ chave }) => visiveis.includes(chave)).map(({ chave, nome, cor, eixo }) => (
            <Line
              key={chave}
              yAxisId={eixo}
              type="monotone"
              dataKey={chave}
              name={nome}
              stroke={cor}
              strokeWidth={2}
              dot={mostrarPontos ? { r: 3, fill: cor } : false}
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
                  strokeDasharray="6 4"
                  strokeOpacity={0.6}
                />
              )
            )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
