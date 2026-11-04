import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import viteConfig from './vite.config.ts';

// unit — чистые функции и код узлов n8n в Node; browser — сборка письма в настоящем Chromium (нужна раскладка)
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            environment: 'node',
            include: ['src/**/*.test.ts', 'n8n/**/*.test.ts'],
            exclude: ['**/*.browser.test.ts', '**/node_modules/**'],
          },
        },
        {
          extends: true,
          // зависимости, найденные посреди прогона, перезагружают страницу и роняют импорт тестов
          optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime', 'react/jsx-runtime', '@radix-ui/react-dialog', 'clsx', 'lucide-react', 'zustand', 'jszip'] },
          test: {
            name: 'browser',
            include: ['src/**/*.browser.test.{ts,tsx}'],
            testTimeout: 60_000,
            browser: { enabled: true, headless: true, provider: playwright(), instances: [{ browser: 'chromium' }] },
          },
        },
      ],
    },
  }),
);
