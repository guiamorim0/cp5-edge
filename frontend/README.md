# Dashboard — Monitoramento de Vinherias (CP5)

Front-end em React (Vite) pensado para o celular. Consome a API em FastAPI, que por sua vez conversa com o FIWARE.

## Telas

O manual de operação de cada tela (Painel, Limites, Vinhos, Eventos, Relatórios, Simulação e Ambientes) está no [README principal](../README.md#manual-de-operação).

## Como funciona a atualização

A cada 5 segundos (mesmo intervalo em que o ESP32 publica) o app chama duas rotas:

1. `GET /api/status` — traz os valores atuais e alimenta os cards e o gráfico.
2. `POST /api/triggers/avaliar` — faz a API comparar os valores com os limites e disparar o comando de alerta quando necessário.

O gráfico carrega as últimas 100 leituras do STH-Comet ao abrir e depois vai acrescentando os pontos novos, mantendo sempre os últimos 100.

## Rodando

```bash
cd frontend
npm install
npm run dev
```

Abre em `http://localhost:5173`. O Vite redireciona as chamadas `/api` para `http://localhost:8000`, então a API precisa estar rodando.

## Build para produção

```bash
npm run build
```

Gera a pasta `dist`, que o FastAPI serve automaticamente. Com isso, o sistema inteiro fica acessível em `http://IP_EC2:8000`, sem CORS e sem mixed content.

## Estrutura

```
frontend/
├── index.html
├── vite.config.js
└── src/
    ├── main.jsx
    ├── App.jsx              # Menu lateral e composição das telas
    ├── api.js               # Única camada que fala com a API
    ├── styles.css
    ├── hooks/
    │   └── useMonitoramento.js   # Polling, histórico e avaliação de alertas
    └── components/
        ├── SensorCard.jsx        # Leitura com a régua da faixa aceita
        ├── HealthBadge.jsx       # Índice de conservação do ambiente
        ├── ActuatorPanel.jsx     # Lâmpada, ar, umidificador e intensidade da luz
        ├── AlertTestPanel.jsx    # Teste manual de cada alerta
        ├── HistoryChart.jsx      # Gráfico do histórico (STH-Comet)
        ├── TriggersPanel.jsx     # Ajuste dos limites
        ├── WinesPanel.jsx        # Estoque de vinhos
        ├── EventsPanel.jsx       # Incidentes
        ├── ReportsPanel.jsx      # Relatórios e log de comandos
        ├── SimulationPanel.jsx   # Modo de demonstração
        ├── DevicesPanel.jsx      # Cadastro dos IoT Devices
        ├── DeviceSelector.jsx
        └── Icons.jsx
```
