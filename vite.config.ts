import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves the project site under /<repo>/, so production assets
  // must be referenced from that base. Dev server stays at '/'.
  base: command === 'build' ? '/bikepaintstudio/' : '/',
  plugins: [react(), tailwindcss()],
}))
