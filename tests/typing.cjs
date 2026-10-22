const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('script.js', 'utf8');
const helper = source.slice(source.indexOf('  async function typeMessage('), source.indexOf('  function makeLoadingMessage('));

async function check(reducedMotion) {
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
  const text = 'Ciao 👋! Ecco la prossima domanda.';
  await context.typeMessage(content, text);
  assert.equal(updates.at(-1), text);
  assert.equal(attributes['aria-busy'], 'false');
  if (reducedMotion) {
    assert.equal(updates.length, 1);
    assert.equal(waits.length, 0);
  } else {
    assert.equal(updates[0], 'Ciao');
    assert.ok(updates.length > 1);
    assert.ok(waits.every(delay => delay === 45));
    assert.ok(updates.every(value => !/[\uD800-\uDBFF]$/.test(value)));
  }
}
(async () => {
  await check(false);
  await check(true);
  console.log('Typing checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
