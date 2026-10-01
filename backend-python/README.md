# API — Monitoramento de Vinherias (CP5)

Camada de aplicação em FastAPI que conecta o dashboard ao FIWARE. Resolve o CORS (o Orion não devolve os headers necessários), traduz as respostas do FIWARE para JSON simples, guarda os triggers e roda a lógica de alerta.

## Rotas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Verifica se a API está no ar |
| GET | `/api/status` | Estado, luminosidade, temperatura, umidade e alerta ativo |
| GET | `/api/history/{grandeza}?last_n=30` | Histórico do STH-Comet (`temperature`, `humidity`, `luminosity`) |
| POST | `/api/lamp/{on\|off}` | Liga ou desliga a lâmpada |
| POST | `/api/alerts/{comando}` | Aciona um alerta manualmente (`alerttemp`, `alerthum`, `alertlum`, `alertoff`) |
| GET | `/api/triggers` | Limites configurados |
| PUT | `/api/triggers` | Salva novos limites |
| POST | `/api/triggers/avaliar` | Compara a leitura com os limites e aciona o alerta |
| GET | `/api/devices` | Lista os IoT Devices |
| POST | `/api/devices` | Cadastra um dispositivo |
| DELETE | `/api/devices/{device_id}` | Remove um dispositivo |

Documentação interativa gerada automaticamente: `http://localhost:8000/docs`

## Estrutura

```
backend-python/
├── app/
│   ├── main.py            # Aplicação, CORS e entrega do build do React
│   ├── config.py          # Variáveis de ambiente e URLs do FIWARE
│   ├── models.py          # Modelos de entrada e saída (Pydantic)
│   ├── routers/           # Camada de apresentação (rotas HTTP)
│   │   ├── monitoramento.py
│   │   ├── controle.py
│   │   ├── triggers.py
│   │   └── dispositivos.py
│   └── services/          # Camada de negócio
│       ├── fiware.py      # Único módulo que conhece o FIWARE
│       └── triggers.py    # Limites salvos e detecção de anomalias
├── requirements.txt
└── .env.example
```

## Como rodar

```bash
cd backend-python
python -m venv .venv
source .venv/bin/activate        # no Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # ajuste o FIWARE_HOST com o IP da EC2
uvicorn app.main:app --reload --port 8000
```

Teste rápido:

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/status
curl http://localhost:8000/api/history/temperature
```

## Na EC2

```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Libere a porta 8000 no Security Group. Com o React buildado em `frontend/dist`, o sistema inteiro fica acessível em `http://IP_EC2:8000`.

## Como o alerta funciona

1. O dashboard chama `POST /api/triggers/avaliar` junto com o polling.
2. A API lê o valor atual no Orion e compara com os limites salvos.
3. Se algum valor estourou, envia o comando correspondente (`alerttemp`, `alerthum` ou `alertlum`). O ESP32 pisca o LED azul e toca o buzzer no padrão daquela anomalia.
4. Quando os valores normalizam, envia `alertoff`.

O comando só é enviado quando o estado muda, comparando com o atributo `alert` que o próprio ESP32 publica. Isso evita repetir a mesma mensagem a cada 5 segundos.
