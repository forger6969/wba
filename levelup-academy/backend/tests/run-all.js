/**
 * Запуск всех доменных наборов.
 *
 * Раньше `npm test` соединял их через `&&`. Первый же упавший набор обрывал
 * цепочку, и остальные не выполнялись вовсе: три устаревших ожидания в mentor
 * прятали 49 зелёных тестов, включая payments и auth — деньги и вход, то есть
 * ровно те, о которых важнее всего знать.
 *
 * Поэтому здесь каждый набор запускается отдельным процессом и падение одного
 * не мешает остальным. Ненулевой код возврата отдаётся в конце, если упал хоть
 * один, — чтобы CI по-прежнему видел общий провал.
 *
 * Отдельный процесс на набор, а не импорт: наборы держат свои подключения к
 * базе и Redis и завершают процесс сами. В общем процессе их фикстуры и
 * закрытие пула мешали бы друг другу.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SUITES = ['mentor', 'student', 'parent', 'payments', 'auth'];

const run = (name) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [join(HERE, name, 'run.js')], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' },
    });
    child.on('close', (code) => resolve({ name, ok: code === 0 }));
  });

const results = [];
for (const suite of SUITES) {
  results.push(await run(suite));
}

const failed = results.filter((r) => !r.ok);

console.log(`\n${'='.repeat(41)}`);
console.log('ALL SUITES');
console.log('='.repeat(41));
for (const r of results) console.log(`[${r.ok ? 'PASS' : 'FAIL'}] ${r.name}`);
console.log('='.repeat(41));
console.log(failed.length ? `FAILED: ${failed.map((r) => r.name).join(', ')}` : 'ALL GREEN');
console.log('='.repeat(41));

process.exit(failed.length ? 1 : 0);
