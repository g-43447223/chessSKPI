import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves this project under /chessSKPI/, so assets must be
// rooted there rather than at the domain root.
export default defineConfig({
  base: '/chessSKPI/',
  plugins: [react(), tailwindcss()],
})
