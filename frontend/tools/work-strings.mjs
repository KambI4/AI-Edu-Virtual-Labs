import { writeFileSync } from 'node:fs';
import { load } from './bundle.mjs';
const { workStrings } = await load('src/virtual-labs/core/strings-export.ts');
const s = workStrings();
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(s, null, 1));
console.log(s.length, s.reduce((a, x) => a + x.length, 0));
