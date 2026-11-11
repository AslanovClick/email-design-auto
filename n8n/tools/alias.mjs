// Подключение: node --import ./n8n/tools/alias.mjs <скрипт.ts>
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
