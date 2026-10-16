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

La chat è pubblica: chiunque può leggere i messaggi. Gli utenti entrano con una sessione anonima, possono pubblicare messaggi fino a 600 caratteri e non possono modificare o cancellare quelli già inviati.
