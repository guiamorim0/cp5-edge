/**
 * Uma grandeza dentro do quadro de leituras.
 *
 * Alem do numero, mostra uma regua com a faixa aceita e a posicao do valor
 * nela: da para ver de relance nao so se saiu da faixa, mas para que lado
 * e o quanto. Fora da faixa, valor e marca ficam em bordo.
 */
function posicaoNaRegua(valor, faixa) {
  // A regua mostra a faixa no meio, com folga de 60% da largura dela de cada lado
  const folga = (faixa.maximo - faixa.minimo) * 0.6 || 1
  const inicio = faixa.minimo - folga
  const fim = faixa.maximo + folga
  const pct = (v) => Math.min(100, Math.max(0, ((v - inicio) / (fim - inicio)) * 100))
  return { faixaInicio: pct(faixa.minimo), faixaFim: pct(faixa.maximo), marca: pct(valor) }
}

export default function SensorCard({ titulo, valor, unidade, faixa, icone }) {
  const semLeitura = valor === null || valor === undefined
  const foraDaFaixa =
    !semLeitura && faixa && (valor < faixa.minimo || valor > faixa.maximo)
  const regua = faixa && !semLeitura ? posicaoNaRegua(valor, faixa) : null

  return (
    <div className={`leitura ${foraDaFaixa ? 'fora' : ''}`}>
      <p className="leitura-titulo rotulo">
        {icone}
        {titulo}
      </p>
      <p className="leitura-valor">
        {semLeitura ? '—' : valor}
        <span className="leitura-unidade">{unidade}</span>
      </p>

      {regua && (
        <div className="regua" aria-hidden="true">
          <span
            className="regua-faixa"
            style={{ left: `${regua.faixaInicio}%`, width: `${regua.faixaFim - regua.faixaInicio}%` }}
          />
          <span className="regua-marca" style={{ left: `${regua.marca}%` }} />
        </div>
      )}

      {faixa && (
        <p className="leitura-faixa">
          <span>
            faixa {faixa.minimo} a {faixa.maximo}
            {unidade}
          </span>
          {foraDaFaixa && <strong>{valor > faixa.maximo ? 'acima' : 'abaixo'}</strong>}
        </p>
      )}
    </div>
  )
}
