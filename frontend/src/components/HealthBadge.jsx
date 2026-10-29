/**
 * Indice de saude do ambiente, no cabecalho do quadro de leituras.
 *
 * Traduz todo o historico de incidentes num unico numero: 100 pontos no
 * inicio, menos 1 a cada incidente. E a resposta curta para a pergunta que
 * o dono da vinheria faz de verdade: "meu vinho esta bem guardado?".
 */
const CLASSES = {
  excelente: 'Excelente',
  boa: 'Boa',
  atencao: 'Atenção',
  critica: 'Crítica',
}

export default function HealthBadge({ saude }) {
  if (!saude) return null

  return (
    <p className="conservacao">
      <span>Conservação</span>
      <span className="conservacao-numero">{saude.saude}</span>
      <span className={`conservacao-classe ${saude.classificacao}`}>
        {CLASSES[saude.classificacao] || saude.classificacao}
      </span>
      <span>
        · {saude.incidentes} {saude.incidentes === 1 ? 'incidente' : 'incidentes'}
      </span>
    </p>
  )
}
