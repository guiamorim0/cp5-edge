/**
 * Seletor de dispositivo, fixo no topo.
 *
 * Tudo que o dashboard mostra (sensores, grafico, limites, vinhos, incidentes)
 * se refere ao dispositivo escolhido aqui.
 */
export default function DeviceSelector({ dispositivos, selecionado, aoSelecionar }) {
  if (dispositivos.length === 0) return null

  return (
    <div className="seletor">
      <label htmlFor="dispositivo">Ambiente</label>
      <select
        id="dispositivo"
        value={selecionado ?? ''}
        onChange={(e) => aoSelecionar(Number(e.target.value))}
      >
        {dispositivos.map((d) => (
          <option key={d.id} value={d.id}>
            {d.nome}
            {d.local ? ` — ${d.local}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
