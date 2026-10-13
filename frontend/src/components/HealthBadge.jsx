/**
 * Indice de saude do ambiente.
 *
 * Traduz todo o historico de incidentes num unico numero: 100 pontos no
 * inicio, menos 1 a cada incidente. E a resposta curta para a pergunta que
 * o dono da vinheria faz de verdade: "meu vinho esta bem guardado?".
 */
const CORES = {
  excelente: '#22c55e',
  boa: '#84cc16',
  atencao: '#f97316',
  critica: '#ef4444',
}

export default function HealthBadge({ saude }) {
  if (!saude) return null

  const cor = CORES[saude.classificacao] || '#94a3b8'

  return (
    <div className="card saude">
      <div className="saude-numero" style={{ color: cor, borderColor: cor }}>
        {saude.saude}
      </div>
      <div>
        <p className="rotulo">Saude do ambiente</p>
        <p className="saude-classe" style={{ color: cor }}>
          {saude.classificacao}
        </p>
        <p className="sensor-faixa">
          {saude.incidentes} {saude.incidentes === 1 ? 'incidente' : 'incidentes'} registrados
        </p>
      </div>
    </div>
  )
}
