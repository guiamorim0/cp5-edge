import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Durante o desenvolvimento o React roda na 5173 e a API na 8000.
// O proxy faz as chamadas /api irem para a API sem problema de CORS.
// Em producao o proprio FastAPI serve o build, e o proxy deixa de existir.
// API_URL troca o destino quando a 8000 ja esta ocupada na maquina.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.API_URL || 'http://localhost:8000',
    },
  },
})
