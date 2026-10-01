import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Durante o desenvolvimento o React roda na 5173 e a API na 8000.
// O proxy faz as chamadas /api irem para a API sem problema de CORS.
// Em producao o proprio FastAPI serve o build, e o proxy deixa de existir.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
