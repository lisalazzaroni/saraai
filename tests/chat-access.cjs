const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const accessSource = fs.readFileSync('chat-access.js', 'utf8');
const chatSource = fs.readFileSync('script.js', 'utf8');

function setup({ allowed = false, result = 'denied', unavailable = false, archive = false } = {}) {
  const calls = [];
  const dialogs = [];
  const listeners = {};
  const field = { value: '', focus() {} };
  const message = { textContent: '' };
  const submit = {};
  const accessForm = { addEventListener: (name, fn) => { listeners[name] = fn; } };
  const cancel = { addEventListener: (_, fn) => { listeners.cancel = fn; } };
  const link = { href: 'index.html?new=1#chat', addEventListener: (_, fn) => { listeners.link = fn; } };
  const client = {
    async rpc(name, args) {
      calls.push({ name, args });
      if (unavailable) throw new Error('offline');
      return { data: name === 'saraai_can_write' ? allowed : result, error: null };
    },
    auth: {
      async getSession() { calls.push({ name: 'getSession' }); return { data: { session: null } }; },
      async signInAnonymously() { calls.push({ name: 'signInAnonymously' }); return {}; }
    }
  };
  const window = {
    SARAAI_SUPABASE_CONFIG: { url: 'test', publishableKey: 'test' },
    supabase: { createClient: () => client },
    location: { assign: (url) => { calls.push({ name: 'navigate', url }); } }
  };
  const document = {
    querySelector: () => archive ? null : {},
    querySelectorAll: () => [link],
    body: { append: (dialog) => dialogs.push(dialog) },
    createElement() {
      return {
        open: false,
        setAttribute() {},
        querySelector: (selector) => ({ form: accessForm, input: field, '[role="alert"]': message,
          '[type="submit"]': submit, '.chat-access-cancel': cancel })[selector],
        addEventListener: (name, fn) => { listeners[name] = fn; },
        showModal() { this.open = true; },
        close() { this.open = false; listeners.close(); },
        remove() { this.removed = true; }
      };
    }
  };
  vm.runInNewContext(accessSource, { window, document });
  return { window, calls, dialogs, listeners, field, message, submit };
}

const tick = () => new Promise(resolve => setImmediate(resolve));
const event = { preventDefault() {} };

(async () => {
  const readOnly = setup();
  assert.equal(readOnly.calls.length, 0, 'reading must not sign in or ask for access');
  const pending = readOnly.window.SARAAI_CHAT_ACCESS.ensureWriter();
  assert.equal(pending, readOnly.window.SARAAI_CHAT_ACCESS.ensureWriter(), 'concurrent requests share one popup');
  await tick();
  assert.equal(readOnly.dialogs.length, 1);
  assert.ok(!readOnly.calls.some(call => call.name === 'signInAnonymously'));
  readOnly.listeners.cancel();
  assert.equal(await pending, false);

  for (const [result, expected] of [['denied', 'non corretta'], ['locked', '15 minuti'], ['not_configured', 'non ancora configurato']]) {
    const s = setup({ result });
    const unlocked = s.window.SARAAI_CHAT_ACCESS.ensureWriter();
    await tick();
    s.field.value = 'test-only-password';
    await s.listeners.submit(event);
    assert.ok(s.message.textContent.includes(expected));
    assert.equal(s.field.value, '');
    assert.equal(s.dialogs[0].open, true);
    assert.equal(s.submit.disabled, false);
    s.listeners.cancel();
    assert.equal(await unlocked, false);
  }

  const correct = setup({ result: 'unlocked' });
  const unlocked = correct.window.SARAAI_CHAT_ACCESS.ensureWriter();
  await tick();
  correct.field.value = 'test-only-password';
  await correct.listeners.submit(event);
  assert.equal(await unlocked, true);
  assert.equal(correct.field.value, '');
  assert.equal(correct.dialogs[0].removed, true);
  assert.equal(correct.calls.find(call => call.name === 'saraai_unlock_chat').args.password, 'test-only-password');

  const returning = setup({ allowed: true });
  assert.equal(await returning.window.SARAAI_CHAT_ACCESS.ensureWriter(), true);
  assert.equal(returning.dialogs.length, 0);

  const offline = setup({ unavailable: true });
  const offlineAccess = offline.window.SARAAI_CHAT_ACCESS.ensureWriter();
  await tick();
  await offline.listeners.submit(event);
  assert.ok(offline.message.textContent.includes('Impossibile verificare'));
  offline.listeners.cancel();
  assert.equal(await offlineAccess, false);

  const archive = setup({ archive: true });
  const navigation = archive.listeners.link(event);
  await tick();
  assert.ok(!archive.calls.some(call => call.name === 'navigate'));
  archive.listeners.cancel();
  await navigation;
  assert.ok(!archive.calls.some(call => call.name === 'navigate'));

  // Run the actual submit and new-chat handlers: a cancelled popup must leave
  // the draft, transcript, and quiz state untouched.
  const context = vm.createContext({
    isReplyPending: false, liveChatReady: true,
    sendButton: { disabled: false }, promptInput: { value: 'keep my draft' },
    chatAccess: { ensureWriter: async () => false }
  });
  vm.runInContext(chatSource.slice(chatSource.indexOf('  async function submitPrompt('),
    chatSource.indexOf("  form.addEventListener('submit'")), context);
  vm.runInContext(chatSource.slice(chatSource.indexOf('  async function startNewChat('),
    chatSource.indexOf("  document.querySelectorAll('a[href*=\"new=1\"]')")), context);
  await context.submitPrompt('keep my draft');
  await context.startNewChat();
  assert.equal(context.promptInput.value, 'keep my draft');
  assert.equal(context.isReplyPending, false);
  console.log('Chat access checks passed: public reading, password verification, cancellation, errors, remembered access, and archive navigation');
})().catch(error => { console.error(error); process.exitCode = 1; });
