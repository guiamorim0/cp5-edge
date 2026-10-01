/**
 * Camada de acesso a API.
 *
 * Nenhum componente chama axios direto: todos usam as funcoes daqui.
 * Assim, se uma rota mudar, so este arquivo muda.
 */
import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 10000 })

export const getStatus = () => api.get('/status').then((r) => r.data)

export const getHistorico = (lastN = 100) =>
  api.get('/history', { params: { last_n: lastN } }).then((r) => r.data)

export const ligarLampada = (acao) => api.post(`/lamp/${acao}`).then((r) => r.data)

export const acionarAlerta = (comando) => api.post(`/alerts/${comando}`).then((r) => r.data)

export const getTriggers = () => api.get('/triggers').then((r) => r.data)

export const salvarTriggers = (triggers) => api.put('/triggers', triggers).then((r) => r.data)

export const avaliarAlertas = () => api.post('/triggers/avaliar').then((r) => r.data)

export const getDispositivos = () => api.get('/devices').then((r) => r.data)

export const cadastrarDispositivo = (dispositivo) =>
  api.post('/devices', dispositivo).then((r) => r.data)

export const removerDispositivo = (deviceId) =>
  api.delete(`/devices/${deviceId}`).then((r) => r.data)
