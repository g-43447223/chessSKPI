import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative base keeps every asset path working on GitHub Pages
// (https://<user>.github.io/<repo>/) without extra configuration.
export default defineConfig({
  base: './chessSKPI/',
  plugins: [react(), tailwindcss()],
})
