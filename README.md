# SaraAI

Una piccola homepage chat-first ispirata all'impostazione essenziale della homepage di OpenAI, con identità e contenuti originali per SaraAI.

## Avviare in locale

Serve Python 3. Apri PowerShell in questa cartella ed esegui:

```powershell
py -m http.server 4173
```

Poi apri <http://localhost:4173> nel browser. Per fermare il server, premi `Ctrl+C` nella finestra PowerShell.

La chat principale è una stanza pubblica in tempo reale. I messaggi vengono salvati su Supabase e sono visibili a tutti i visitatori; le risposte di SaraAI sono dimostrative e vengono generate nel browser. **Nuova chat** avvia una vista pulita per la sessione corrente, ma i nuovi messaggi inviati restano pubblici. Le chat personali nella barra laterale restano salvate solo nel browser di chi le crea.

## Configurare Supabase

1. Nel progetto Supabase, abilita gli accessi anonimi in **Authentication → Providers → Anonymous Sign-Ins**.
2. Apri **SQL Editor** e avvia il contenuto di `supabase/setup.sql`. Puoi rieseguirlo dopo gli aggiornamenti: è idempotente.
3. `supabase-config.js` contiene l'URL del progetto e la publishable key, utilizzabile nel browser. Non inserire mai una secret key o una service-role key nel sito.

La chat è pubblica in lettura. Per iniziare una nuova chat o inviare un messaggio compare un piccolo popup con la password del gruppo. La verifica avviene su Supabase; dopo lo sblocco, il browser può scrivere per 7 giorni. La password non viene salvata nel browser o nei file del sito. I messaggi possono avere fino a 600 caratteri e non possono essere modificati o cancellati dai visitatori.

## Attivare la password del gruppo

1. Esegui la versione aggiornata di `supabase/setup.sql` nel SQL Editor di Supabase. La migrazione conserva i messaggi e blocca le scritture finché non imposti la password.
2. Sempre nel SQL Editor, esegui questo comando sostituendo il segnaposto con una password lunga e unica (da 12 a 72 byte). Non salvare il comando con la password reale nel repository. Se contiene un apostrofo, scrivilo due volte nel valore SQL.

```sql
update saraai_private.chat_password
set password_hash = extensions.crypt('SOSTITUISCI_CON_LA_PASSWORD_DEL_GRUPPO', extensions.gen_salt('bf', 10)),
    version = gen_random_uuid()
where id = true;
```

3. Pubblica i file aggiornati del sito, incluso `chat-access.js`. Mantieni abilitati gli accessi anonimi: servono solo quando qualcuno prova a sbloccare la scrittura. La lettura non richiede un account.

Per cambiare la password, riesegui il comando sopra con il nuovo valore: tutti gli accessi precedenti vengono revocati subito e sarà richiesta la nuova password. Non esporre lo schema `saraai_private` nelle impostazioni API. Non inserire password in `supabase-config.js`, che è pubblico.

Il database autorizza ogni inserimento; nascondere o aggirare il popup non permette di scrivere. Dopo 5 tentativi errati, la sessione deve attendere 15 minuti. Questo limite è per sessione anonima: per un sito esposto ad abusi, abilita anche la protezione CAPTCHA di Supabase per la creazione delle sessioni.

## Verifiche

```powershell
node --check script.js
node --check chat-access.js
node tests/typing.cjs
node tests/chat-access.cjs
```

Esegui `supabase/tests/chat-access.sql` nel SQL Editor dopo la migrazione per verificare le autorizzazioni reali del database. Il test usa una transazione che ripristina password, sessioni e messaggi alla fine. Sul sito, verifica anche popup, annullamento e invio da desktop e telefono.
