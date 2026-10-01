import { useEffect, useState } from 'react'
import DevicesPanel from './components/DevicesPanel'
import HistoryChart from './components/HistoryChart'
import LampControl from './components/LampControl'
import SensorCard from './components/SensorCard'
import TriggersPanel from './components/TriggersPanel'
import { getTriggers } from './api'
import { useMonitoramento } from './hooks/useMonitoramento'

const ABAS = [
  { id: 'dashboard', titulo: 'Dashboard' },
  { id: 'triggers', titulo: 'Limites' },
  { id: 'devices', titulo: 'Dispositivos' },
]

const NOMES_ALERTA = {
  temperatura: 'Temperatura fora do limite',
  umidade: 'Umidade fora do limite',
  luminosidade: 'Luminosidade fora do limite',
}

export default function App() {
  const [aba, setAba] = useState('dashboard')
  const [triggers, setTriggers] = useState(null)
  const { status, historico, erro, carregando, atualizar } = useMonitoramento()

  // Os limites tambem sao usados pelos cards, para destacar o valor fora da faixa
  useEffect(() => {
    getTriggers().then(setTriggers).catch(() => setTriggers(null))
  }, [aba])

  const alertaAtivo = status?.alert && status.alert !== 'normal' ? status.alert : null

  return (
    <div className="app">
      <header>
        <h1>Monitoramento de Vinherias</h1>
        <p className="subtitulo">
          {erro ? 'Sem conexao com a API' : carregando ? 'Carregando...' : 'Atualizando a cada 5s'}
        </p>
      </header>

      <nav className="abas">
        {ABAS.map((item) => (
          <button
            key={item.id}
            className={aba === item.id ? 'ativa' : ''}
            onClick={() => setAba(item.id)}
          >
            {item.titulo}
          </button>
        ))}
      </nav>

      {/* O aviso aparece em qualquer aba: o polling nao para ao trocar de tela */}
      {alertaAtivo && (
        <div className="faixa-alerta">
          {NOMES_ALERTA[alertaAtivo] || `Alerta: ${alertaAtivo}`}
        </div>
      )}
      {erro && <div className="faixa-erro">{erro}</div>}

      <main>
        {aba === 'dashboard' && (
          <>
            <div className="cards">
              <SensorCard titulo="Temperatura" valor={status?.temperature} unidade="C" faixa={triggers?.temperature} icone="🌡" />
              <SensorCard titulo="Umidade" valor={status?.humidity} unidade="%" faixa={triggers?.humidity} icone="💧" />
              <SensorCard titulo="Luminosidade" valor={status?.luminosity} unidade="%" faixa={triggers?.luminosity} icone="☀" />
            </div>
            <LampControl status={status} aoMudar={atualizar} />
            <HistoryChart dados={historico} />
          </>
        )}

        {aba === 'triggers' && <TriggersPanel status={status} aoSalvar={atualizar} />}
        {aba === 'devices' && <DevicesPanel />}
      </main>

      <footer>Grupo PentaCode · Turma 1ESPH · FIAP</footer>
    </div>
  )
}
