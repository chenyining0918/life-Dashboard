import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Life Dashboard',
        short_name: 'Life',
        description: '离线可用的待办/笔记/时间追踪',
        theme_color: '#e6f3e6',
        background_color: '#e6f3e6',
        display: 'standalone',
        icons: [
          {
            src: 'vite.svg', // 先拿默认图标顶一下
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ]
})