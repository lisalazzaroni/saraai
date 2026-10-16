const form = document.querySelector('#chat-form');
const promptInput = document.querySelector('#prompt');
const conversation = document.querySelector('#conversation');
const ultracodeToggle = document.querySelector('#ultracode-toggle');
const HISTORY_STORAGE_KEY = 'saraai.chat-history';
const HIDDEN_DEMO_KEY = 'saraai.hidden-demo-chat';
const QUIZ_SCORE_THRESHOLD = 0.5;
const QUIZ_CORRECT_FEEDBACK = [
  'Grazie per la risposta!',
  'Esatto! Ogni tanto mi sorprendi.',
  'Risposta corretta. Puoi essere fiera di te per almeno cinque minuti.',
  'Proprio così. SaraAI approva, per questa volta.',
  'Ci hai preso in pieno!',
  'Corretto. Non dirlo in giro, ma hai fatto bene.',
  'Risposta impeccabile. Mi hai quasi convinta.',
  'Sì! Vedi che quando ti impegni succedono cose.'
];
const QUIZ_INCORRECT_FEEDBACK = [
  'Smettila di inventarti le cose, non hai capito assolutamente niente, sei completamente inutile.',
  'No. Questa risposta è così sbagliata che la domanda si è offesa.',
  'Non proprio. Hai ascoltato la domanda o stavi pensando alle zucchine?',
  'Risposta errata. Riprova: magari questa volta la fortuna ti nota.',
  'No, per niente. Persino il piccione sul marciapiede aveva capito.',
  'Sbagliato. Ho visto previsioni meteo più precise.',
  'Non ci siamo. Ti concedo un’altra possibilità, cerca di non sprecarla.',
  'Quasi… no, scherzavo: era completamente sbagliata.'
];
const SARA_QA = [
  {
    id: 'speed-at-the-door',
    question: 'SaraAI, a che velocità minima devo andare per farti aggrappare allo sportello in preda al panico?',
    answer: '0 km/h.',
    keywordGroups: [['0 km h', 'zero km h', 'da ferma', 'a macchina ferma']]
  },
  {
    id: 'melting-pot',
    question: 'SaraAI, l’acqua nella pentola va messa prima o dopo che il metallo inizia a fondere?',
    answer: 'Dopo.',
    keywordGroups: [['dopo', 'successivamente']]
  },
  {
    id: 'pigeon-panic',
    question: 'SaraAI, se vedi un piccione sul marciapiede, mantieni la calma o scappi via urlando?',
    answer: 'Scappo via urlando.',
    keywordGroups: [['scappo via urlando', 'scappo urlando', 'scappare via urlando']]
  },
  {
    id: 'insect-house-keys',
    question: 'SaraAI, c’è un insetto sul divano. Gli cedi formalmente le chiavi di casa o procedi subito con il lanciafiamme?',
    answer: 'Lanciafiamme.',
    keywordGroups: [['lanciafiamme', 'lancia fiamme']]
  },
  {
    id: 'zucchini-container',
    question: 'SaraAI, come posso trasportare le zucchine in università senza usare il contenitore nel modo convenzionale?',
    answer: 'Mettendole sul coperchio del contenitore al contrario.',
    keywordGroups: [['sul coperchio del contenitore', 'contenitore al contrario', 'contenitore capovolto']]
  },
  {
    id: 'socks-or-wrong',
    question: 'SaraAI, hai più paia di calzini nell’armadio o persone a cui hai dato torto?',
    answer: 'Persone a cui ho dato torto.',
    keywordGroups: [['persone a cui ho dato torto', 'a cui ho dato torto']]
  },
  {
    id: 'toilet-paper-idea',
    question: 'SaraAI, se l’idea del secolo ti viene mentre fai la cacca, la tieni a mente o la scrivi sulla carta igienica?',
    answer: 'La tengo a mente.',
    keywordGroups: [['la tengo a mente', 'me la tengo a mente', 'la memorizzo']]
  },
  {
    id: 'san-lollo-layers',
    question: 'SaraAI, se sei a San Lollo d’inverno, quanti strati minimo ti devi mettere addosso?',
    answer: 'Minimo 3.',
    keywordGroups: [['minimo 3', 'almeno 3', 'minimo tre', 'almeno tre', 'tre strati']]
  },
  {
    id: 'ants-or-person',
    question: 'SaraAI, preferiresti uccidere una persona o trovarti 100 formiche addosso?',
    answer: 'Uccidere una persona.',
    keywordGroups: [['uccidere una persona', 'ucciderei una persona', 'uccidere qualcuno']]
  },
  {
    id: 'phd-or-babysitter',
    question: 'SaraAI, preferiresti fare il PhD da Leonardo o fare la babysitter a vita?',
    answer: 'PhD da Leonardo.',
    keywordGroups: [['phd da leonardo', 'dottorato da leonardo', 'phd con leonardo']]
  },
  {
    id: 'techno-or-baby-shark',
    question: 'SaraAI, preferiresti ascoltare solo Techno o poter ascoltare solo Baby Shark?',
    answer: 'Baby Shark.',
    keywordGroups: [['baby shark']]
  },
  {
    id: 'university-call',
    question: 'SaraAI, quale è il posto migliore per fare una “call” in università?',
    promptAliases: [
      'Qual è il posto migliore per fare una call in università?',
      'Dove è il miglior posto per fare una call in università?',
      'Ma qual è il posto migliore per fare una call universitaria?',
      'Dove posso fare una call universitaria?'
    ],
    answer: 'Il bagno al secondo piano dell’edificio G.',
    keywordGroups: [
      ['bagno', 'servizi', 'toilette'],
      ['secondo piano', '2 piano', 'piano 2'],
      ['edificio g', 'edifici g', 'palazzo g']
    ]
  },
  {
    id: 'study-or-hackathon-sleep',
    question: 'SaraAI, per dormire è più comoda la scrivania dell’aula studio o un materassino gonfiabile all’Hackathon?',
    promptAliases: ['SaraAI, per dormire è più comoda la scrivania dell’aula studio o un materassino gonfiabile all’Hackthon?'],
    answer: 'Il materassino gonfiabile all’Hackathon.',
    keywordGroups: [['materassino', 'materassino gonfiabile']]
  },
  {
    id: 'tablet-or-papyrus',
    question: 'SaraAI, cosa consiglieresti alle nuove generazioni di studenti: tablet o papiro?',
    answer: 'Papiro.',
    keywordGroups: [['papiro']]
  },
  {
    id: 'where-to-get-news',
    question: 'SaraAI, se io volessi aggiornarmi sulle news, dove dovrei andare a cercare?',
    answer: 'TikTok.',
    keywordGroups: [['tiktok', 'tik tok']]
  }
];
const QUIZ_CARDS = [
  ...SARA_QA.map(({ id, question, promptAliases, keywordGroups }) => ({
    id,
    prompt: question,
    promptAliases,
    keywordGroups
  }))
];
const historyItems = document.querySelector('.history-items');
const chatSaveStatus = document.querySelector('#chat-save-status');
const selectedChatId = new URLSearchParams(window.location.search).get('chat');
let activeChatId = document.querySelector('#archive-transcript') ? selectedChatId : null;
let isReplyPending = false;
let awaitingManualUltracodeReply = false;
let activeQuizCardId = null;
let unusedQuizCardIds = QUIZ_CARDS.map((card) => card.id);
let positiveFeedbackDeck = [];
let negativeFeedbackDeck = [];
const defaultPromptPlaceholder = promptInput?.placeholder || 'Chiedimi quello che vuoi…';
const promptLabel = document.querySelector('label[for="prompt"]');
const defaultPromptLabel = promptLabel?.textContent || 'Scrivi un messaggio a SaraAI';

function normalizeQuizText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('it')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeSaraQuestion(text) {
  return normalizeQuizText(text).replace(/^saraai\s+/, '');
}

function findQuizCard(prompt) {
  const normalizedPrompt = normalizeSaraQuestion(prompt);
  return QUIZ_CARDS.find((card) =>
    [card.prompt, ...(card.promptAliases || [])]
      .some((candidate) => normalizeSaraQuestion(candidate) === normalizedPrompt)
  ) || null;
}

function findSaraAnswer(prompt) {
  const normalizedPrompt = normalizeSaraQuestion(prompt);
  return SARA_QA.find((entry) =>
    [entry.question, ...(entry.promptAliases || [])].some((candidate) => {
      const normalizedQuestion = normalizeSaraQuestion(candidate);
      return normalizedPrompt === normalizedQuestion || normalizedPrompt.includes(normalizedQuestion);
    })
  ) || null;
}

function selectQuizCard(prompt) {
  const card = findQuizCard(prompt);
  activeQuizCardId = card?.id || null;
  if (card) {
    unusedQuizCardIds = unusedQuizCardIds.filter((id) => id !== card.id);
  }
  return card;
}

function scoreQuizAnswer(answer, card) {
  if (!card || !card.keywordGroups.length) return false;
  const normalizedAnswer = ` ${normalizeQuizText(answer)} `;
  const matchedGroups = card.keywordGroups.filter((group) =>
    group.some((keyword) => normalizedAnswer.includes(` ${normalizeQuizText(keyword)} `))
  ).length;
  return matchedGroups / card.keywordGroups.length >= QUIZ_SCORE_THRESHOLD;
}

function takeNextQuizCard() {
  if (unusedQuizCardIds.length === 0) return null;
  const [nextId] = unusedQuizCardIds.splice(0, 1);
  return QUIZ_CARDS.find((card) => card.id === nextId);
}

function shuffleItems(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function takeQuizFeedback(isCorrect) {
  const phrases = isCorrect ? QUIZ_CORRECT_FEEDBACK : QUIZ_INCORRECT_FEEDBACK;
  let deck = isCorrect ? positiveFeedbackDeck : negativeFeedbackDeck;
  if (deck.length === 0) deck = shuffleItems(phrases);
  const feedback = deck.pop();
  if (isCorrect) positiveFeedbackDeck = deck;
  else negativeFeedbackDeck = deck;
  return feedback;
}

function resetUltracodeQuiz() {
  activeQuizCardId = null;
  unusedQuizCardIds = QUIZ_CARDS.map((card) => card.id);
  positiveFeedbackDeck = [];
  negativeFeedbackDeck = [];
}

function setAwaitingManualUltracodeReply(awaiting) {
  awaitingManualUltracodeReply = awaiting;
  if (promptInput) {
    promptInput.placeholder = awaiting ? 'Scrivi la risposta di SaraAI…' : defaultPromptPlaceholder;
  }
  if (promptLabel) {
    promptLabel.textContent = awaiting ? 'Scrivi la risposta di SaraAI' : defaultPromptLabel;
  }
  document.querySelector('#chat-form button[type="submit"]')?.setAttribute(
    'aria-label',
    awaiting ? 'Invia risposta di SaraAI' : 'Invia messaggio'
  );
}

function readChatHistory() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((chat) => chat && typeof chat.id === 'string' && Array.isArray(chat.turns)) : [];
  } catch {
    return [];
  }
}

function writeChatHistory(chats) {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(chats.slice(0, 40)));
    return true;
  } catch {
    return false;
  }
}

function addPreviewLine(link, speaker, text) {
  const line = document.createElement('span');
  line.className = 'history-snippet';
  const label = document.createElement('b');
  label.textContent = speaker + ': ';
  line.append(label, document.createTextNode(text || '…'));
  link.append(line);
}

function renderHistoryLinks(currentId) {
  if (!historyItems) return;
  historyItems.querySelectorAll('.history-entry[data-chat-id]').forEach((entry) => entry.remove());
  const staticEntry = historyItems.querySelector('[data-demo-history]');
  const staticLink = staticEntry && staticEntry.querySelector('.history-link');
  if (currentId && staticLink) {
    staticLink.classList.remove('is-current');
    staticLink.removeAttribute('aria-current');
  }

  readChatHistory()
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .forEach((chat) => {
      const entry = document.createElement('div');
      entry.className = 'history-entry' + (chat.id === currentId ? ' is-current' : '');
      entry.dataset.chatId = chat.id;

      const link = document.createElement('a');
      link.className = 'history-link' + (chat.id === currentId ? ' is-current' : '');
      link.href = 'chat.html?chat=' + encodeURIComponent(chat.id);
      link.setAttribute('aria-label', 'Apri chat: ' + chat.title);
      if (chat.id === currentId) link.setAttribute('aria-current', 'page');

      const title = document.createElement('span');
      title.className = 'history-title';
      title.textContent = chat.title;
      link.append(title);

      const lastUser = [...chat.turns].reverse().find((turn) => turn.role === 'user');
      const lastAssistant = [...chat.turns].reverse().find((turn) => turn.role === 'assistant');
      if (lastUser) addPreviewLine(link, 'Tu', lastUser.text);
      if (lastAssistant) addPreviewLine(link, 'SaraAI', lastAssistant.text);

      const deleteButton = document.createElement('button');
      deleteButton.className = 'history-delete';
      deleteButton.type = 'button';
      deleteButton.dataset.deleteChat = chat.id;
      deleteButton.setAttribute('aria-label', 'Elimina chat: ' + chat.title);
      deleteButton.title = 'Elimina chat';
      deleteButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m3 0-.8 13H6.8L6 7m4 3v7m4-7v7" /></svg>';
      deleteButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteSavedChat(chat.id);
      });

      entry.append(link, deleteButton);
      if (staticEntry) historyItems.insertBefore(entry, staticEntry);
      else historyItems.append(entry);
    });
}

function deleteSavedChat(chatId) {
  const chats = readChatHistory();
  const chat = chats.find((item) => item.id === chatId);
  if (chatId === activeChatId && isReplyPending) {
    if (chatSaveStatus) {
      chatSaveStatus.hidden = false;
      chatSaveStatus.textContent = 'Attendi la risposta prima di eliminare la chat';
    }
    return;
  }
  if (!chat || !window.confirm('Eliminare la chat «' + chat.title + '»?')) return;
  if (!writeChatHistory(chats.filter((item) => item.id !== chatId))) {
    if (chatSaveStatus) {
      chatSaveStatus.hidden = false;
      chatSaveStatus.textContent = 'Impossibile eliminare la chat in questo browser';
    }
    return;
  }

  if (activeChatId === chatId) {
    activeChatId = null;
    setAwaitingManualUltracodeReply(false);
    resetUltracodeQuiz();
    if (promptInput) promptInput.value = '';
    if (chatSaveStatus) chatSaveStatus.hidden = true;
    window.history.replaceState(null, '', window.location.pathname + '#chat');
  }
  if (selectedChatId === chatId && document.querySelector('#archive-transcript')) {
    window.location.href = 'index.html#chat';
    return;
  }
  renderHistoryLinks(activeChatId);
}

function deleteDemoChat() {
  const demoEntry = historyItems && historyItems.querySelector('[data-demo-history]');
  if (!demoEntry || !window.confirm('Eliminare la chat di esempio?')) return;
  try {
    window.localStorage.setItem(HIDDEN_DEMO_KEY, '1');
  } catch {
    if (chatSaveStatus) {
      chatSaveStatus.hidden = false;
      chatSaveStatus.textContent = 'Impossibile eliminare la chat in questo browser';
    }
    return;
  }
  demoEntry.remove();
  if (window.location.pathname.endsWith('chat.html') && !selectedChatId) {
    window.location.href = 'index.html#chat';
  }
}

try {
  if (window.localStorage.getItem(HIDDEN_DEMO_KEY) === '1') {
    historyItems?.querySelector('[data-demo-history]')?.remove();
  }
} catch {
  // The sample chat remains visible if browser storage is unavailable.
}

document.querySelector('[data-delete-demo]')?.addEventListener('click', deleteDemoChat);
function renderSelectedChat() {
  const transcript = document.querySelector('#archive-transcript');
  if (!transcript || !selectedChatId) return;
  const chat = readChatHistory().find((item) => item.id === selectedChatId);
  if (!chat) return;

  const title = document.querySelector('#archive-title');
  const summary = document.querySelector('.archive-summary');
  const eyebrow = document.querySelector('.archive-heading .eyebrow');
  if (title) title.textContent = chat.title;
  if (summary) summary.textContent = 'Conversazione salvata in questo browser · ' + chat.turns.length + ' messaggi';
  if (eyebrow) eyebrow.textContent = 'CHAT PASSATA';

  transcript.setAttribute('aria-label', 'Trascrizione di ' + chat.title);
  transcript.replaceChildren();
  chat.turns.forEach((turn) => {
    const item = document.createElement('li');
    item.className = 'transcript-item ' + turn.role;
    const speaker = document.createElement('span');
    speaker.className = 'transcript-speaker';
    speaker.textContent = turn.role === 'user' ? 'Utente' : 'IA';
    const message = document.createElement('p');
    message.textContent = turn.text;
    item.append(speaker, message);
    transcript.append(item);
  });
}

renderHistoryLinks(selectedChatId);
renderSelectedChat();

if (form && promptInput && conversation) {
  const sendButton = form.querySelector('button[type="submit"]');
  const liveChatStatus = document.querySelector('#live-chat-status');
  const renderedLiveMessageIds = new Set();
  const liveMessagesTable = 'saraai_live_messages';
  const liveChatStartKey = 'saraai.live-chat-started-at';
  const pageUrl = new URL(window.location.href);
  let liveChatStartedAt = 0;
  let startNewChatOnLoad = pageUrl.searchParams.get('new') === '1';

  try {
    liveChatStartedAt = Number(window.sessionStorage.getItem(liveChatStartKey)) || 0;
  } catch {
    // A fresh chat still works for this page load when session storage is unavailable.
  }

  if (startNewChatOnLoad) {
    liveChatStartedAt = Date.now() - 1000;
    try {
      window.sessionStorage.setItem(liveChatStartKey, String(liveChatStartedAt));
    } catch {
      // The URL flag keeps this new-chat request available for this page load.
    }
    pageUrl.searchParams.delete('new');
    window.history.replaceState(null, '', pageUrl.pathname + pageUrl.search + pageUrl.hash);
  }

  const liveConfig = window.SARAAI_SUPABASE_CONFIG;
  const liveChatClient = window.supabase?.createClient && liveConfig?.url && liveConfig?.publishableKey
    ? window.supabase.createClient(liveConfig.url, liveConfig.publishableKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
      })
    : null;
  let liveChatUser = null;
  let liveChatName = '';
  let liveChatReady = false;
  let liveChatSubscribed = false;
  let liveHistoryLoaded = false;

  function setLiveChatStatus(text, state = '') {
    if (!liveChatStatus) return;
    liveChatStatus.textContent = text;
    liveChatStatus.classList.toggle('is-error', state === 'error');
    liveChatStatus.classList.toggle('is-connected', state === 'connected');
  }

  function updateLiveChatReady() {
    liveChatReady = liveChatSubscribed && liveHistoryLoaded;
    sendButton.disabled = !liveChatReady || isReplyPending;
    if (liveChatReady) {
      setLiveChatStatus(
        liveChatStartedAt ? 'Nuova chat pronta · i messaggi sono pubblici' : 'Connesso alla chat pubblica',
        'connected'
      );
    }
  }

  function renderLiveMessage(row) {
    if (!row || typeof row.id !== 'string' || renderedLiveMessageIds.has(row.id)) return;
    const createdAt = Date.parse(row.created_at) || Date.now();
    if (liveChatStartedAt && createdAt < liveChatStartedAt) return;
    renderedLiveMessageIds.add(row.id);

    const message = document.createElement('div');
    message.className = 'chat-message ' + row.role;
    message.dataset.messageId = row.id;
    message.dataset.createdAt = String(createdAt);

    const label = document.createElement('span');
    label.className = 'message-label';
    label.textContent = row.role === 'assistant'
      ? 'SaraAI · demo'
      : row.sender_id === liveChatUser?.id
        ? 'Tu · ' + (row.sender_name || liveChatName)
        : row.sender_name || 'Visitatore';

    const content = document.createElement('span');
    content.textContent = row.body;
    message.append(label, content);

    const nextMessage = [...conversation.children].find((item) =>
      Number(item.dataset.createdAt) > createdAt
    );
    conversation.insertBefore(message, nextMessage || null);
    conversation.hidden = false;
    conversation.scrollTop = conversation.scrollHeight;
  }

  function makeLoadingMessage() {
    const message = document.createElement('div');
    message.className = 'chat-message user chat-loading';
    message.setAttribute('role', 'status');
    message.setAttribute('aria-label', 'Preparazione del prossimo prompt');
    const label = document.createElement('span');
    label.className = 'message-label';
    label.textContent = 'Tu';
    const wheel = document.createElement('span');
    wheel.className = 'loading-wheel';
    wheel.setAttribute('aria-hidden', 'true');
    message.append(label, wheel);
    conversation.append(message);
    conversation.hidden = false;
    conversation.scrollTop = conversation.scrollHeight;
    return message;
  }

  function replyFor(prompt) {
    const knownAnswer = findSaraAnswer(prompt);
    if (knownAnswer) return knownAnswer.answer;

    const text = prompt.toLocaleLowerCase('it');
    if (/settim|organizz|piano|priorit|agenda|ordine/.test(text)) {
      return 'Volentieri. Facciamo spazio, un passo alla volta:\n\n1. Scrivi tutto quello che hai in mente, senza ordinarlo.\n2. Segna le 2 cose che contano di più questa settimana.\n3. Scegli un primo passo piccolo da fare oggi.\n\nSe mi racconti i tuoi impegni, ti aiuto a mettere insieme un piano più concreto.';
    }
    if (/spieg|impar|capire|studio|studiare|difficil|argomento/.test(text)) {
      return 'Certo. Possiamo renderlo più semplice partendo da un esempio concreto, poi aggiungiamo i dettagli poco alla volta.\n\nDimmi qual è l’argomento e che cosa ti sembra più difficile: preparo una spiegazione chiara, senza dare nulla per scontato.';
    }
    if (/mail|email|scriv|testo|parole|raccont|messaggio/.test(text)) {
      return 'Ti aiuto volentieri a trovare il tono giusto. Per iniziare, puoi dirmi a chi scrivi, cosa vuoi comunicare e se preferisci un tono più formale o informale.\n\nAnche una bozza disordinata va benissimo: la sistemiamo insieme.';
    }
    if (/ciao|buongiorno|salve|hey|ehi/.test(text)) {
      return 'Ciao! ✳ Sono SaraAI, una demo locale pensata per aiutarti a partire. Raccontami un’idea, una domanda o una piccola cosa che vuoi risolvere oggi.';
    }
    return 'Bella domanda. Per affrontarla con calma, possiamo partire da tre cose: cosa vuoi ottenere, cosa sai già e qual è il primo passo che ti sembra fattibile.\n\nQuesta è una demo locale: le risposte sono esempi generati nel browser. Se mi dai un po’ più di contesto, provo a indicarti una direzione più utile.';
  }

  function autoSize() {
    promptInput.style.height = 'auto';
    promptInput.style.height = Math.min(promptInput.scrollHeight, 135) + 'px';
  }

  async function postLiveMessage(role, text) {
    if (!liveChatClient || !liveChatUser || !liveChatReady) {
      throw new Error('La chat pubblica non è connessa.');
    }

    const { data, error } = await liveChatClient
      .from(liveMessagesTable)
      .insert({
        sender_id: liveChatUser.id,
        sender_name: liveChatName,
        role,
        body: text
      })
      .select('id, sender_id, sender_name, role, body, created_at')
      .single();

    if (error) throw error;
    renderLiveMessage(data);
    saveTurn(role, text);
    setLiveChatStatus('Connesso alla chat pubblica', 'connected');
  }

  async function connectToLiveChat() {
    if (!liveChatClient) {
      throw new Error('Configura Supabase per attivare la chat pubblica.');
    }

    setLiveChatStatus('Connessione alla chat pubblica…');
    const { data: sessionData, error: sessionError } = await liveChatClient.auth.getSession();
    if (sessionError) throw sessionError;

    let user = sessionData.session?.user || null;
    if (!user) {
      const { data, error } = await liveChatClient.auth.signInAnonymously();
      if (error) throw error;
      user = data.user;
    }
    if (!user) throw new Error('Impossibile avviare la sessione anonima.');

    liveChatUser = user;
    liveChatName = 'Ospite-' + user.id.replace(/-/g, '').slice(-4).toUpperCase();

    liveChatClient
      .channel('saraai-live-chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: liveMessagesTable
      }, (payload) => renderLiveMessage(payload.new))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          liveChatSubscribed = true;
          updateLiveChatReady();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          liveChatSubscribed = false;
          liveChatReady = false;
          sendButton.disabled = true;
          setLiveChatStatus('Connessione interrotta. Ricarica la pagina per riprovare.', 'error');
        }
      });

    let messagesQuery = liveChatClient
      .from(liveMessagesTable)
      .select('id, sender_id, sender_name, role, body, created_at')
      .order('created_at', { ascending: false });
    if (liveChatStartedAt) {
      messagesQuery = messagesQuery.gte('created_at', new Date(liveChatStartedAt).toISOString());
    }
    const { data: messages, error } = await messagesQuery.limit(100);

    if (error) throw error;
    messages.reverse().forEach(renderLiveMessage);
    liveHistoryLoaded = true;
    updateLiveChatReady();
  }

  sendButton.disabled = true;
  connectToLiveChat().catch(() => {
    liveChatReady = false;
    sendButton.disabled = true;
    setLiveChatStatus('Per inviare messaggi, abilita gli accessi anonimi e avvia supabase/setup.sql.', 'error');
  });

  function saveTurn(role, text) {
    const chats = readChatHistory();
    let chat = chats.find((item) => item.id === activeChatId);
    if (!chat) {
      if (role !== 'user') return;
      activeChatId = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : 'chat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      chat = { id: activeChatId, title: text.trim().slice(0, 54), turns: [], updatedAt: Date.now() };
    }
    chat.turns.push({ role, text });
    chat.updatedAt = Date.now();
    const updated = [chat, ...chats.filter((item) => item.id !== chat.id)]
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const isSaved = writeChatHistory(updated);
    renderHistoryLinks(activeChatId);
    if (chatSaveStatus) {
      chatSaveStatus.hidden = false;
      chatSaveStatus.textContent = isSaved
        ? 'Chat salvata in Chat passate'
        : 'Impossibile salvare la chat in questo browser';
    }
  }

  async function submitPrompt(value) {
    const text = value.trim();
    if (!text || sendButton.disabled || !liveChatReady) return;
    isReplyPending = true;
    sendButton.disabled = true;

    try {
      if (ultracodeToggle?.checked) {
        if (awaitingManualUltracodeReply) {
          const currentCard = QUIZ_CARDS.find((card) => card.id === activeQuizCardId) || null;
          const answerIsCorrect = currentCard ? scoreQuizAnswer(text, currentCard) : null;
          await postLiveMessage('assistant', text);
          promptInput.value = '';
          autoSize();
          if (ultracodeToggle) ultracodeToggle.disabled = true;
          sendButton.setAttribute('aria-label', 'SaraAI sta preparando il prossimo prompt');
          const loadingMessage = makeLoadingMessage();
          await new Promise((resolve) => window.setTimeout(resolve, 700));
          loadingMessage.remove();
          const nextCard = takeNextQuizCard();
          const feedback = currentCard ? takeQuizFeedback(answerIsCorrect) : '';
          const nextPrompt = nextCard
            ? nextCard.prompt
            : 'Hai risposto a tutte le 15 domande. Fine del quiz!';
          await postLiveMessage('user', [feedback, nextPrompt].filter(Boolean).join('\n\n'));

          if (nextCard) {
            activeQuizCardId = nextCard.id;
            setAwaitingManualUltracodeReply(true);
          } else {
            activeQuizCardId = null;
            setAwaitingManualUltracodeReply(false);
            if (ultracodeToggle) ultracodeToggle.checked = false;
            resetUltracodeQuiz();
          }
        } else {
          await postLiveMessage('user', text);
          selectQuizCard(text);
          promptInput.value = '';
          autoSize();
          setAwaitingManualUltracodeReply(true);
        }
      } else {
        await postLiveMessage('user', text);
        promptInput.value = '';
        autoSize();
        sendButton.setAttribute('aria-label', 'SaraAI sta preparando una risposta');
        const loadingMessage = makeLoadingMessage();
        await new Promise((resolve) => window.setTimeout(resolve, 380));
        loadingMessage.remove();
        const answer = replyFor(text);
        await postLiveMessage('assistant', answer);
      }
    } catch {
      setLiveChatStatus('Messaggio non inviato. Riprova tra poco.', 'error');
    } finally {
      isReplyPending = false;
      if (ultracodeToggle) ultracodeToggle.disabled = false;
      sendButton.disabled = !liveChatReady;
      sendButton.setAttribute('aria-label', awaitingManualUltracodeReply ? 'Invia risposta di SaraAI' : 'Invia messaggio');
      promptInput.focus();
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitPrompt(promptInput.value);
  });

  ultracodeToggle?.addEventListener('change', () => {
    if (!ultracodeToggle.checked) {
      setAwaitingManualUltracodeReply(false);
      resetUltracodeQuiz();
    }
  });

  promptInput.addEventListener('input', autoSize);
  promptInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  document.querySelectorAll('[data-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelector('#chat').scrollIntoView({ behavior: 'smooth', block: 'center' });
      submitPrompt(button.dataset.prompt);
    });
  });

  document.querySelector('.sidebar-new-chat')?.addEventListener('click', (event) => {
    const path = window.location.pathname;
    if (path.endsWith('index.html') || path.endsWith('/')) {
      event.preventDefault();
      if (isReplyPending) {
        if (chatSaveStatus) {
          chatSaveStatus.hidden = false;
          chatSaveStatus.textContent = 'Attendi la risposta prima di iniziare una nuova chat';
        }
        return;
      }
      activeChatId = null;
      setAwaitingManualUltracodeReply(false);
      resetUltracodeQuiz();
      liveChatStartedAt = Date.now() - 1000;
      try {
        window.sessionStorage.setItem(liveChatStartKey, String(liveChatStartedAt));
      } catch {
        // The transcript is cleared for this page even if storage is unavailable.
      }
      renderedLiveMessageIds.clear();
      conversation.replaceChildren();
      conversation.hidden = true;
      renderHistoryLinks(null);
      promptInput.value = '';
      autoSize();
      if (chatSaveStatus) chatSaveStatus.hidden = true;
      window.history.replaceState(null, '', window.location.pathname + '#chat');
      if (liveChatReady) {
        setLiveChatStatus('Nuova chat pronta · i messaggi sono pubblici', 'connected');
      }
      promptInput.focus();
    }
  });
}

const sidebarToggle = document.querySelector('#sidebar-toggle');
const sidebarBackdrop = document.querySelector('.sidebar-backdrop');
const sidebar = document.querySelector('#chat-sidebar');
const sidebarClose = document.querySelector('.sidebar-close');

function closeSidebar() {
  document.body.classList.remove('sidebar-open');
  sidebarToggle?.setAttribute('aria-expanded', 'false');
  sidebarToggle?.setAttribute('aria-label', 'Apri barra laterale');
}

if (sidebarToggle && sidebarBackdrop && sidebar) {
  sidebarToggle.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('sidebar-open');
    sidebarToggle.setAttribute('aria-expanded', String(isOpen));
    sidebarToggle.setAttribute('aria-label', isOpen ? 'Chiudi barra laterale' : 'Apri barra laterale');
  });
  sidebarBackdrop.addEventListener('click', closeSidebar);
  sidebarClose?.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeSidebar));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSidebar();
  });
}
