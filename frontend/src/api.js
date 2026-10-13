/**
 * Camada de acesso a API.
 *
 * Nenhum componente chama axios direto: todos usam as funcoes daqui.
 * Assim, se uma rota mudar, so este arquivo muda.
 *
 * Quase todas as chamadas aceitam o id do dispositivo. Quando ele e omitido,
 * a API usa o dispositivo padrao (o primeiro cadastrado).
 */
import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 10000 })

const comDispositivo = (dispositivoId, extras = {}) =>
  dispositivoId ? { dispositivo_id: dispositivoId, ...extras } : extras

// ---------------------------------------------------------------- monitoramento

export const getStatus = (dispositivoId) =>
  api.get('/status', { params: comDispositivo(dispositivoId) }).then((r) => r.data)

export const getHistorico = (dispositivoId, lastN = 100) =>
  api.get('/history', { params: comDispositivo(dispositivoId, { last_n: lastN }) }).then((r) => r.data)

// ---------------------------------------------------------------- controle

export const ligarLampada = (acao, dispositivoId) =>
  api.post(`/lamp/${acao}`, null, { params: comDispositivo(dispositivoId) }).then((r) => r.data)

export const acionarAlerta = (comando, dispositivoId) =>
  api.post(`/alerts/${comando}`, null, { params: comDispositivo(dispositivoId) }).then((r) => r.data)

export const acionarAtuador = (comando, dispositivoId) =>
  api.post(`/atuadores/${comando}`, null, { params: comDispositivo(dispositivoId) }).then((r) => r.data)

export const getComandos = (dispositivoId, limite = 100) =>
  api.get('/comandos', { params: comDispositivo(dispositivoId, { limite }) }).then((r) => r.data)

// ---------------------------------------------------------------- limites e eventos

export const getTriggers = (dispositivoId) =>
  api.get('/triggers', { params: comDispositivo(dispositivoId) }).then((r) => r.data)

export const salvarTriggers = (triggers, dispositivoId) =>
  api.put('/triggers', triggers, { params: comDispositivo(dispositivoId) }).then((r) => r.data)

export const avaliarAlertas = (dispositivoId) =>
  api.post('/triggers/avaliar', null, { params: comDispositivo(dispositivoId) }).then((r) => r.data)

export const getEventos = (dispositivoId, limite = 50) =>
  api.get('/triggers/eventos', { params: comDispositivo(dispositivoId, { limite }) }).then((r) => r.data)

// ---------------------------------------------------------------- dispositivos

export const getDispositivos = () => api.get('/devices').then((r) => r.data)

export const cadastrarDispositivo = (dados) => api.post('/devices', dados).then((r) => r.data)

export const removerDispositivo = (id) => api.delete(`/devices/${id}`).then((r) => r.data)

// ---------------------------------------------------------------- vinhos

export const getVinhos = (dispositivoId) =>
  api.get('/vinhos', { params: comDispositivo(dispositivoId) }).then((r) => r.data)

export const cadastrarVinho = (dispositivoId, dados) =>
  api.post('/vinhos', dados, { params: { dispositivo_id: dispositivoId } }).then((r) => r.data)

export const movimentarVinho = (vinhoId, delta) =>
  api.post(`/vinhos/${vinhoId}/movimentar`, null, { params: { delta } }).then((r) => r.data)

export const removerVinho = (vinhoId) => api.delete(`/vinhos/${vinhoId}`).then((r) => r.data)

// ---------------------------------------------------------------- saude e relatorios

export const getSaude = (dispositivoId) =>
  api.get('/relatorios/saude', { params: comDispositivo(dispositivoId) }).then((r) => r.data)

export const getRelatorio = () => api.get('/relatorios').then((r) => r.data)

export const baixarRelatorioCsv = () => api.get('/relatorios/csv').then((r) => r.data)

// ---------------------------------------------------------------- simulacao

export const getCenarios = () => api.get('/simulacao/cenarios').then((r) => r.data)

export const simular = (cenario, dispositivoId) =>
  api.post(`/simulacao/${cenario}`, null, { params: comDispositivo(dispositivoId) }).then((r) => r.data)

export const restaurarSimulacao = (dispositivoId) =>
  api.post('/simulacao/restaurar/limites', null, { params: comDispositivo(dispositivoId) }).then((r) => r.data)
