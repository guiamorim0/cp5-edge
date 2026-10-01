import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/**
 * Grafico dinamico com as tres grandezas.
 *
 * Temperatura e umidade ficam no eixo da esquerda e a luminosidade no da
 * direita: as escalas sao diferentes e, num eixo so, uma linha achataria
 * as outras. Sem marcador em cada ponto, porque com 100 pontos numa tela
 * de celular eles viram uma mancha.
 */
export default function HistoryChart({ dados }) {
  const formatarHora = (valor) => (valor ? valor.slice(11, 16) : '')

  if (!dados.length) {
    return (
      <div className="card">
        <p className="rotulo">Historico</p>
        <p className="vazio">Aguardando as primeiras leituras do STH-Comet...</p>
      </div>
    )
  }

  return (
    <div className="card">
      <p className="rotulo">Historico (ultimas 100 leituras)</p>
      <ResponsiveContainer width="100%" height={260}>
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
          <Line yAxisId="esq" type="monotone" dataKey="temperature" name="Temperatura (C)" stroke="#f97316" dot={false} strokeWidth={2} connectNulls />
          <Line yAxisId="esq" type="monotone" dataKey="humidity" name="Umidade (%)" stroke="#38bdf8" dot={false} strokeWidth={2} connectNulls />
          <Line yAxisId="dir" type="monotone" dataKey="luminosity" name="Luminosidade (%)" stroke="#facc15" dot={false} strokeWidth={2} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
