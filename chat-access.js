// The shared password is checked by Supabase, never stored in the website.
(() => {
  const config = window.SARAAI_SUPABASE_CONFIG;
  const client = window.supabase?.createClient && config?.url && config?.publishableKey
    ? window.supabase.createClient(config.url, config.publishableKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
      })
    : null;
  let pendingUnlock = null;

  async function requestAccess() {
    try {
      const { data, error } = await client.rpc('saraai_can_write');
      if (!error && data === true) return true;
    } catch {
      // Show a retryable error in the popup if the service is unavailable.
    }
    return new Promise((resolve) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'chat-access-dialog';
      dialog.setAttribute('aria-labelledby', 'chat-access-title');
      dialog.setAttribute('aria-describedby', 'chat-access-description');
      dialog.innerHTML = `
        <form class="chat-access-form">
          <p class="eyebrow">voleeeevi eh? </p>
          <h2 id="chat-access-title">Entra nella chat</h2>
          <p id="chat-access-description">Per scrivere o iniziare una nuova chat, inserisci la password sono in media 2,26*10^19 tentativi. Puoi sempre leggere senza password.</p>
          <label for="chat-password">Password del gruppo</label>
          <input id="chat-password" type="password" autocomplete="current-password" maxlength="72" required autofocus />
          <p class="chat-access-error" role="alert"></p>
          <div class="chat-access-actions">
            <button type="button" class="chat-access-cancel">Continua a leggere</button>
            <button type="submit">Entra</button>
          </div>
        </form>`;
      const accessForm = dialog.querySelector('form');
      const password = dialog.querySelector('input');
      const errorMessage = dialog.querySelector('[role="alert"]');
      const submit = dialog.querySelector('[type="submit"]');
      let unlocked = false;
      let checking = false;
      dialog.querySelector('.chat-access-cancel').addEventListener('click', () => dialog.close());
      dialog.addEventListener('close', () => {
        password.value = '';
        dialog.remove();
        resolve(unlocked);
      }, { once: true });
      accessForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (checking) return;
        checking = true;
        submit.disabled = true;
        submit.textContent = 'Verifica…';
        errorMessage.textContent = '';
        try {
          const { data: session, error: sessionError } = await client.auth.getSession();
          if (sessionError) throw sessionError;
          if (!session.session) {
            const { error } = await client.auth.signInAnonymously();
            if (error) throw error;
          }
          if (!dialog.open) return;
          const { data, error } = await client.rpc('saraai_unlock_chat', { password: password.value });
          password.value = '';
          if (!dialog.open) return;
          if (error) throw error;
          if (data === 'unlocked') {
            unlocked = true;
            dialog.close();
          } else {
            errorMessage.textContent = data === 'locked'
              ? 'Troppi tentativi. Riprova tra 15 minuti.'
              : data === 'not_configured'
                ? 'Accesso non ancora configurato. Riprova più tardi.'
                : 'Password non corretta. Riprova.';
            password.focus();
          }
        } catch {
          errorMessage.textContent = 'Impossibile verificare la password. Riprova tra poco.';
        } finally {
          checking = false;
          submit.disabled = false;
          submit.textContent = 'Entra';
        }
      });
      document.body.append(dialog);
      dialog.showModal();
    });
  }

  window.SARAAI_CHAT_ACCESS = {
    client,
    ensureWriter() {
      if (!pendingUnlock) {
        pendingUnlock = requestAccess().finally(() => { pendingUnlock = null; });
      }
      return pendingUnlock;
    }
  };

  // Archive pages also ask before navigating to a new chat.
  if (!document.querySelector('#chat-form')) {
    document.querySelectorAll('a[href*="new=1"]').forEach((link) => {
      link.addEventListener('click', async (event) => {
        event.preventDefault();
        if (await window.SARAAI_CHAT_ACCESS.ensureWriter()) window.location.assign(link.href);
      });
    });
  }
})();
