import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// unit — чистые функции и код узлов n8n в Node
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
      ],
    },
  }),
);
