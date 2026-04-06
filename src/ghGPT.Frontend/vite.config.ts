import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: '../ghGPT.Api/wwwroot',
    emptyOutDir: true,
  },
});
