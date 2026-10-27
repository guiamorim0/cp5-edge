import { useCallback, useEffect, useState } from 'react'
import ActuatorPanel from './components/ActuatorPanel'
import DeviceSelector from './components/DeviceSelector'
import DevicesPanel from './components/DevicesPanel'
import EventsPanel from './components/EventsPanel'
import HealthBadge from './components/HealthBadge'
import HistoryChart from './components/HistoryChart'
import {
  IconeAmbientes, IconeEventos, IconeLimites, IconeLuminosidade, IconeMarca,
  IconePainel, IconeRelatorios, IconeSimulacao, IconeTemperatura, IconeUmidade,
  IconeVinhos,
} from './components/Icons'
import LampControl from './components/LampControl'
import ReportsPanel from './components/ReportsPanel'
import SensorCard from './components/SensorCard'
import SimulationPanel from './components/SimulationPanel'
import TriggersPanel from './components/TriggersPanel'
import WinesPanel from './components/WinesPanel'
import { getDispositivos, getTriggers } from './api'
import { useMonitoramento } from './hooks/useMonitoramento'

// Alem do titulo, cada secao traz uma linha explicando o que se faz nela.
// Com o menu de lado sobra espaco para isso, e quem abre o app pela primeira
// vez nao precisa clicar em tudo para descobrir.
const SECOES = [
  { id: 'dashboard',  titulo: 'Painel',      icone: IconePainel,     resumo: 'Leituras ao vivo, controle dos atuadores e historico' },
  { id: 'triggers',   titulo: 'Limites',     icone: IconeLimites,    resumo: 'Faixa ideal de cada grandeza para este ambiente' },
  { id: 'vinhos',     titulo: 'Vinhos',      icone: IconeVinhos,     resumo: 'Estoque da adega e indice de saude de cada rotulo' },
  { id: 'eventos',    titulo: 'Eventos',     icone: IconeEventos,    resumo: 'Registro das anomalias e quanto tempo cada uma durou' },
  { id: 'relatorios', titulo: 'Relatorios',  icone: IconeRelatorios, resumo: 'Resumo do periodo e log dos comandos enviados' },
  { id: 'simulacao',  titulo: 'Simulacao',   icone: IconeSimulacao,  resumo: 'Provoca uma anomalia real para demonstrar os alertas' },
  { id: 'devices',    titulo: 'Ambientes',   icone: IconeAmbientes,  resumo: 'Cadastro das adegas e provisionamento no FIWARE' },
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
  const secao = SECOES.find((s) => s.id === aba)

  return (
    <div className="layout">
      {/* Menu fixo a esquerda no desktop; vira uma faixa no topo no celular */}
      <aside className="lateral">
        <div className="marca">
          <div className="marca-icone"><IconeMarca /></div>
          <div className="marca-texto">
            <h1>Vinherias</h1>
            {/* Sem conexao fica em vermelho: e o unico estado que exige acao */}
            <p className={`subtitulo ${erro ? 'offline' : ''}`}>
              {erro ? 'Sem conexao' : carregando ? 'Carregando' : 'Ao vivo'}
            </p>
          </div>
        </div>

        <DeviceSelector
          dispositivos={dispositivos}
          selecionado={dispositivoId}
          aoSelecionar={setDispositivoId}
        />

        <nav className="menu">
          {SECOES.map(({ id, titulo, icone: Icone }) => (
            <button
              key={id}
              className={aba === id ? 'ativa' : ''}
              onClick={() => setAba(id)}
              aria-current={aba === id ? 'page' : undefined}
            >
              <Icone />
              <span>{titulo}</span>
              {/* O alerta aparece no menu tambem: de qualquer tela da para ver */}
              {id === 'dashboard' && alertaAtivo && <i className="selo" />}
            </button>
          ))}
        </nav>

        <footer>Grupo PentaCode · 1ESPH · FIAP</footer>
      </aside>

      <div className="conteudo">
        <header className="topo">
          <h2>{secao.titulo}</h2>
          <p>{secao.resumo}</p>
        </header>

        {/* Os avisos aparecem em qualquer secao: o polling nao para ao trocar de tela */}
        {alertaAtivo && (
          <div className="faixa-alerta">{NOMES_ALERTA[alertaAtivo] || `Alerta: ${alertaAtivo}`}</div>
        )}
        {erro && <div className="faixa-erro">{erro}</div>}

        {semDispositivos && aba !== 'devices' && (
          <div className="card">
            <p className="rotulo">Nenhum ambiente cadastrado</p>
            <p className="explicacao">
              Cadastre o primeiro ambiente na secao Ambientes. Ele sera provisionado no
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

        {/* No celular o menu vira faixa no topo, entao a creditacao fecha a pagina */}
        <footer className="rodape">Grupo PentaCode · Turma 1ESPH · FIAP</footer>
      </div>
    </div>
  )
}
