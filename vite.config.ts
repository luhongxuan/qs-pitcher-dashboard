// vite.config.ts
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // 新增 Proxy 設定
        proxy: {
          '/api': {
            target: 'http://localhost:8000',
            changeOrigin: true,
            // rewrite: (path) => path.replace(/^\/api/, '') // 如果後端路徑沒有 /api 前綴則開啟此行
          }
        }
      },
      plugins: [react()],
      // ... 其他設定保持不變
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        chunkSizeWarningLimit: 1000,
      },
    };
});
