/** Minimal scenario runner — no external test framework in this project. */

export const results = [];

export async function scenario(id, desc, fn) {
  const label = `${id}. ${desc}`;
  try {
    await fn();
    results.push({ id, desc, status: 'PASS' });
    console.log(`[PASS] ${label}`);
  } catch (err) {
    results.push({ id, desc, status: 'FAIL', error: err.message });
    console.log(`[FAIL] ${label}\n       -> ${err.message}`);
    if (process.env.DEBUG) console.log(err.stack);
  }
}

export function printSummary() {
  console.log('\n=== STUDENT DOMAIN — RESULTS ===');
  const width = Math.max(...results.map((r) => r.desc.length)) + 4;
  const sorted = [...results].sort((a, b) => a.id - b.id);
  for (const r of sorted) {
    console.log(
      `${String(r.id).padEnd(4)} ${r.desc.padEnd(width)} ${r.status}` +
        (r.status === 'FAIL' ? `  (${r.error})` : ''),
    );
  }
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\nSTUDENT TESTS: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

export function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'Values not equal'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/** Awaits promiseFn(), expects it to throw an AppError with the given statusCode. */
export async function expectAppError(promiseFn, expectedStatus, msgContains) {
  let thrown = null;
  try {
    await promiseFn();
  } catch (err) {
    thrown = err;
  }
  if (!thrown) {
    throw new Error(`Expected AppError ${expectedStatus} but nothing was thrown`);
  }
  if (thrown.statusCode !== expectedStatus) {
    throw new Error(
      `Expected statusCode ${expectedStatus} but got ${thrown.statusCode} (message: "${thrown.message}")` +
        (thrown.stack && !thrown.statusCode ? `\n${thrown.stack}` : ''),
    );
  }
  if (msgContains && !thrown.message.toLowerCase().includes(msgContains.toLowerCase())) {
    throw new Error(`Expected message to contain "${msgContains}" but got "${thrown.message}"`);
  }
  return thrown;
}

/** Mocks Express req/res for controller-level tests (role guards etc). */
export function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

/** Calls an asyncHandler-wrapped controller directly; rethrows any error passed to next(). */
export async function callController(ctrlFn, req) {
  const res = mockRes();
  let captured = null;
  await ctrlFn(req, res, (err) => { captured = err; });
  if (captured) throw captured;
  return res;
}
