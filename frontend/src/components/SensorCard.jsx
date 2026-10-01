/**
 * Card de uma grandeza. Fica destacado quando o valor esta fora da faixa
 * configurada, para a anomalia ser vista de longe na apresentacao.
 */
export default function SensorCard({ titulo, valor, unidade, faixa, icone }) {
  const semLeitura = valor === null || valor === undefined
  const foraDaFaixa =
    !semLeitura && faixa && (valor < faixa.minimo || valor > faixa.maximo)

  return (
    <div className={`card sensor ${foraDaFaixa ? 'alerta' : ''}`}>
      <span className="sensor-icone">{icone}</span>
      <div>
        <p className="sensor-titulo">{titulo}</p>
        <p className="sensor-valor">
          {semLeitura ? '--' : valor}
          <span className="sensor-unidade">{unidade}</span>
        </p>
        {faixa && (
          <p className="sensor-faixa">
            limite {faixa.minimo} a {faixa.maximo}{unidade}
          </p>
        )}
      </div>
    </div>
  )
}
