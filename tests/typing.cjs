const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('script.js', 'utf8');
const helper = source.slice(source.indexOf('  async function typeMessage('), source.indexOf('  function makeLoadingMessage('));

async function check(reducedMotion, text) {
  const updates = [];
  const waits = [];
  const attributes = {};
  const content = {
    isConnected: true,
    parentElement: { setAttribute: (key, value) => { attributes[key] = value; } },
    set textContent(value) { updates.push(value); }
  };
  const context = vm.createContext({
    window: {
      matchMedia: () => ({ matches: reducedMotion }),
      setTimeout: (resolve, delay) => { waits.push(delay); resolve(); }
    },
    conversation: { scrollTop: 0, scrollHeight: 100 }
  });
  vm.runInContext(helper, context);
  await context.typeMessage(content, text);
  assert.equal(updates.at(-1), text);
  assert.equal(attributes['aria-busy'], 'false');
  if (reducedMotion) {
    assert.equal(updates.length, 1);
    assert.equal(waits.length, 0);
  } else if (text.trim().split(/\s+/).length > 6) {
    assert.ok(updates[0].trim().split(/\s+/).length >= 4);
    assert.ok(updates.length > 1);
    assert.ok(waits.every(delay => delay >= 120 && delay <= 360));
    assert.ok(updates.every(value => !/[\uD800-\uDBFF]$/.test(value)));
  } else {
    assert.equal(updates.length, 1);
    assert.equal(waits.length, 0);
  }
}
(async () => {
  for (const text of ['Dopo.', 'Ciao 👋! Ecco la prossima domanda. Prenditi il tuo tempo.\n\nPoi continuiamo insieme.\n']) {
    await check(false, text);
    await check(true, text);
  }
  console.log('Typing checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
