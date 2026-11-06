// Проверка переводов модуля: все строки интерфейса должны быть в locales/kz.json и locales/en.json.
// Источники ключей:
//   1) русские строки в исходниках модуля (src/virtual-labs, кроме ядра-генератора и текстов промптов);
//   2) описания 14 работ из реестра (core/strings-export.ts);
//   3) сообщения сервера, которые видит пользователь (tools/server-strings.json, см. tools/server-strings.py).
// Запуск: npm run i18n:check            — отчёт, код выхода 1 при пропусках
//         node tools/check-i18n.mjs --missing out.json  — выгрузить непереведённые ключи
//         node tools/check-i18n.mjs --unused            — показать лишние ключи словарей
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseAst } from 'rolldown/parseAst';
import { load, root } from './bundle.mjs';

const MODULE = join(root, 'src/virtual-labs');
const CYR = /[А-Яа-яЁё]/;

// Русский текст, который не является интерфейсом: промпты для модели, текст демо-материала, регулярные выражения.
const SKIP_FILES = ['core/demoGenerator.ts', 'core/works.ts', 'core/types.ts', 'core/util.ts', 'core/strings-export.ts', 'core/catalog-export.ts'];
const SKIP_SCOPES = {
  'orchestrator.ts': ['chat', 'expertOpinion'],
  'logic.ts': ['portfolioText', 'parseQuiz'],
  'core/promptEngine.ts': ['BLOCK_TEXT', 'build', 'improve', 'fill', 'COMMON_CONSTRAINTS', 'context', 'role', 'objectives', 'task', 'audience', 'format', 'constraints', 'quality'],
  'core/evaluation.ts': ['GENERIC_OUTCOME', 'toMarkdown'],
  'core/recommendations.ts': [],
};
const isTechnical = s => /\\[sdwb]|\(\?|\[[^\]]*-[^\]]*\]|^\^|\$$/.test(s);

function files(dir) {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === 'locales' ? [] : files(p);
    return /\.(ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name) ? [p] : [];
  });
}

function scopeName(node) {
  if (node.type === 'Property' || node.type === 'MethodDefinition' || node.type === 'PropertyDefinition') return node.key?.name ?? node.key?.value;
  if (node.type === 'FunctionDeclaration') return node.id?.name;
  if (node.type === 'VariableDeclarator') return node.id?.name;
  return undefined;
}

function sourceStrings() {
  const keys = new Map();
  for (const file of files(MODULE)) {
    const rel = relative(MODULE, file).replaceAll('\\', '/');
    if (SKIP_FILES.includes(rel)) continue;
    const skip = new Set(SKIP_SCOPES[rel] || []);
    const ast = parseAst(readFileSync(file, 'utf8'), { lang: file.endsWith('x') ? 'tsx' : 'ts' }, file);
    const add = (value, node) => {
      const text = String(value).replace(/\s+/g, ' ').trim();
      if (text && CYR.test(text) && !isTechnical(text) && !keys.has(text)) keys.set(text, `${rel}:${node.start}`);
    };
    const walk = (node, skipped) => {
      if (!node || typeof node.type !== 'string') return;
      const name = scopeName(node);
      const inSkip = skipped || (name !== undefined && skip.has(name));
      if (!inSkip) {
        if (node.type === 'Literal' && typeof node.value === 'string') add(node.value, node);
        else if (node.type === 'JSXText') add(node.value, node);
        else if (node.type === 'TemplateLiteral' && node.expressions.length === 0) add(node.quasis[0].value.cooked, node);
      }
      for (const [k, v] of Object.entries(node)) {
        if (k === 'type' || k === 'start' || k === 'end') continue;
        if (Array.isArray(v)) v.forEach(x => walk(x, inSkip));
        else if (v && typeof v === 'object') walk(v, inSkip);
      }
    };
    walk(ast, false);
  }
  return keys;
}

const { workStrings } = await load('src/virtual-labs/core/strings-export.ts');
const keys = sourceStrings();
for (const s of workStrings()) if (!keys.has(s)) keys.set(s, 'core/works.ts');
const serverFile = join(root, 'tools/server-strings.json');
if (existsSync(serverFile)) for (const s of JSON.parse(readFileSync(serverFile, 'utf8'))) if (!keys.has(s)) keys.set(s, 'server');

const dict = lang => JSON.parse(readFileSync(join(MODULE, `locales/${lang}.json`), 'utf8'));
const report = {};
let failed = false;
for (const lang of ['kz', 'en']) {
  const d = dict(lang);
  const missing = [...keys.keys()].filter(k => !d[k]);
  const badPlaceholders = Object.entries(d).filter(([k, v]) => (k.match(/\{\w+\}/g) || []).sort().join() !== (String(v).match(/\{\w+\}/g) || []).sort().join()).map(([k]) => k);
  report[lang] = missing;
  failed ||= missing.length > 0 || badPlaceholders.length > 0;
  console.log(`${lang}: ключей ${keys.size}, переведено ${keys.size - missing.length}, нет перевода ${missing.length}, ошибок в {подстановках} ${badPlaceholders.length}`);
  badPlaceholders.slice(0, 10).forEach(k => console.log('  {…} ', k));
  if (process.argv.includes('--unused')) Object.keys(d).filter(k => !keys.has(k)).forEach(k => console.log('  лишний:', k));
}
const i = process.argv.indexOf('--missing');
if (i > 0) {
  const all = [...new Set([...report.kz, ...report.en])];
  writeFileSync(process.argv[i + 1], JSON.stringify(Object.fromEntries(all.map(k => [k, keys.get(k)])), null, 1));
  console.log('Выгружено ключей без перевода:', all.length);
} else if (failed) {
  [...new Set([...report.kz, ...report.en])].slice(0, 15).forEach(k => console.log('  нет перевода:', k.slice(0, 100)));
}
process.exitCode = failed ? 1 : 0;
