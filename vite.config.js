import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return undefined;
          if (/\/node_modules\/(react|react-dom|scheduler)(\/|$)/.test(id)) return "react-vendor";
          if (/\/node_modules\/react-router(?:-dom)?(\/|$)/.test(id)) return "router-vendor";
          if (/\/node_modules\/(i18next|react-i18next)(\/|$)/.test(id)) return "i18n-vendor";
          if (/\/node_modules\/(html2pdf\.js|html2canvas|jspdf)(\/|$)/.test(id)) return "pdf-vendor";
          return undefined;
        },
      },
    },
  },
})