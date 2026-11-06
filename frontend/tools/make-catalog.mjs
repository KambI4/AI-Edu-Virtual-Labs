// Копия описаний 14 работ для сервера: frontend/src/virtual-labs/core/works.ts → backend/apps/virtual_labs/catalog/works.json.
// Сервер использует её для экспертизы и для практик AI edu. Запуск: npm run catalog
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { load, root } from './bundle.mjs';

const { catalog } = await load('src/virtual-labs/core/catalog-export.ts');
const target = join(root, '../backend/apps/virtual_labs/catalog/works.json');
writeFileSync(target, JSON.stringify(catalog(), null, 1) + '\n', 'utf-8');
console.log('Каталог работ записан:', target);
