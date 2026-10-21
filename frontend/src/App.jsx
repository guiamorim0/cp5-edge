import { useCallback, useEffect, useState } from 'react'
import ActuatorPanel from './components/ActuatorPanel'
import DeviceSelector from './components/DeviceSelector'
import DevicesPanel from './components/DevicesPanel'
import EventsPanel from './components/EventsPanel'
import HealthBadge from './components/HealthBadge'
import HistoryChart from './components/HistoryChart'
import { IconeLuminosidade, IconeMarca, IconeTemperatura, IconeUmidade } from './components/Icons'
import LampControl from './components/LampControl'
import ReportsPanel from './components/ReportsPanel'
import SensorCard from './components/SensorCard'
import SimulationPanel from './components/SimulationPanel'
import TriggersPanel from './components/TriggersPanel'
import WinesPanel from './components/WinesPanel'
import { getDispositivos, getTriggers } from './api'
import { useMonitoramento } from './hooks/useMonitoramento'

const ABAS = [
  { id: 'dashboard', titulo: 'Painel' },
  { id: 'triggers', titulo: 'Limites' },
  { id: 'vinhos', titulo: 'Vinhos' },
  { id: 'eventos', titulo: 'Eventos' },
  { id: 'relatorios', titulo: 'Relatorios' },
  { id: 'simulacao', titulo: 'Simulacao' },
  { id: 'devices', titulo: 'Ambientes' },
]

const NOMES_ALERTA = {
  temperatura: 'Temperatura fora do limite',
  umidade: 'Umidade fora do limite',
  luminosidade: 'Luminosidade fora do limite',
}

export default function App() {
  const [aba, setAba] = useState('dashboard')
  const [dispositivos, setDispositivos] = useState([])
  const [dispositivoId, setDispositivoId] = useState(null)
  const [triggers, setTriggers] = useState(null)

  const { status, historico, saude, erro, carregando, atualizar } = useMonitoramento(dispositivoId)

  // Carrega a lista de ambientes e seleciona o primeiro
  const carregarDispositivos = useCallback(async (lista) => {
    const dados = lista ?? (await getDispositivos().catch(() => []))
    setDispositivos(dados)
    setDispositivoId((atual) => {
      if (atual && dados.some((d) => d.id === atual)) return atual
      return dados[0]?.id ?? null
    })
  }, [])

  useEffect(() => {
    carregarDispositivos()
  }, [carregarDispositivos])

  // Os limites tambem alimentam os cards, para destacar o valor fora da faixa
  useEffect(() => {
    if (!dispositivoId) return
    getTriggers(dispositivoId)
      .then(setTriggers)
      .catch(() => setTriggers(null))
  }, [dispositivoId, aba])

  const alertaAtivo = status?.alert && status.alert !== 'normal' ? status.alert : null
  const semDispositivos = dispositivos.length === 0

  return (
    <div className="app">
      <header>
        <div className="marca">
          <div className="marca-icone"><IconeMarca /></div>
          <div>
            <h1>Monitoramento de Vinherias</h1>
            {/* A bolinha repete em cor o que o texto diz, para ler de relance */}
            <p className="subtitulo">
              <span className={`ponto ${erro ? 'offline' : carregando ? 'carregando' : ''}`} />
              {erro ? 'Sem conexao com a API' : carregando ? 'Carregando...' : 'Atualizando a cada 5s'}
            </p>
          </div>
        </div>
      </header>

      <DeviceSelector
        dispositivos={dispositivos}
        selecionado={dispositivoId}
        aoSelecionar={setDispositivoId}
      />

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
        <div className="faixa-alerta">{NOMES_ALERTA[alertaAtivo] || `Alerta: ${alertaAtivo}`}</div>
      )}
      {erro && <div className="faixa-erro">{erro}</div>}

      {semDispositivos && aba !== 'devices' && (
        <div className="card">
          <p className="rotulo">Nenhum ambiente cadastrado</p>
          <p className="explicacao">
            Cadastre o primeiro ambiente na aba Ambientes. Ele sera provisionado no
            FIWARE com todos os comandos e ja nasce com os limites de adega.
          </p>
          <button className="botao primario largo" onClick={() => setAba('devices')}>
            Ir para Ambientes
          </button>
        </div>
      )}

      <main>
        {aba === 'dashboard' && !semDispositivos && (
          <>
            <HealthBadge saude={saude} />
            <div className="cards">
              <SensorCard titulo="Temperatura" valor={status?.temperature} unidade="C" faixa={triggers?.temperature} icone={<IconeTemperatura />} />
              <SensorCard titulo="Umidade" valor={status?.humidity} unidade="%" faixa={triggers?.humidity} icone={<IconeUmidade />} />
              <SensorCard titulo="Luminosidade" valor={status?.luminosity} unidade="%" faixa={triggers?.luminosity} icone={<IconeLuminosidade />} />
            </div>
            <LampControl status={status} dispositivoId={dispositivoId} aoMudar={atualizar} />
            <ActuatorPanel dispositivoId={dispositivoId} aoMudar={atualizar} />
            <HistoryChart dados={historico} />
          </>
        )}

        {aba === 'triggers' && !semDispositivos && (
          <TriggersPanel status={status} dispositivoId={dispositivoId} aoSalvar={atualizar} />
        )}
        {aba === 'vinhos' && !semDispositivos && <WinesPanel dispositivoId={dispositivoId} />}
        {aba === 'eventos' && !semDispositivos && <EventsPanel dispositivoId={dispositivoId} />}
        {aba === 'relatorios' && <ReportsPanel dispositivoId={dispositivoId} />}
        {aba === 'simulacao' && !semDispositivos && (
          <SimulationPanel dispositivoId={dispositivoId} aoMudar={atualizar} />
        )}
        {aba === 'devices' && <DevicesPanel aoMudarLista={carregarDispositivos} />}
      </main>

      <footer>Grupo PentaCode · Turma 1ESPH · FIAP</footer>
    </div>
  )
}
