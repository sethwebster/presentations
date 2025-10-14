import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: /\.(jsx|tsx)$/,
      jsxRuntime: 'automatic',
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {
            runtimeModule: 'react-compiler-runtime'
          }]
        ],
      },
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@framework': path.resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      strict: false
    },
    host: true,
    allowedHosts: [
      'motivelessly-stalactiform-tracie.ngrok-free.dev'
    ],
    proxy: {
      // forward /api to vercel dev server
      '/api': 'http://localhost:3000',
    },
  }
})
