const form = document.querySelector('#chat-form');
const promptInput = document.querySelector('#prompt');
const conversation = document.querySelector('#conversation');
const ultracodeToggle = document.querySelector('#ultracode-toggle');
const HISTORY_STORAGE_KEY = 'saraai.chat-history';
const HIDDEN_DEMO_KEY = 'saraai.hidden-demo-chat';
const QUIZ_SCORE_THRESHOLD = 0.5;
const QUIZ_CORRECT_FEEDBACK = 'Grazie per la risposta!';
const QUIZ_INCORRECT_FEEDBACK = 'Smettila di inventarti le cose, non hai capito assolutamente niente, sei completamente inutile. Ora iniziamo con le domande serie.';
const QUIZ_CARDS = [
  {
    id: 'today-trap',
    prompt: 'Cosa si festeggia oggi?',
    alwaysIncorrect: true,
    keywordGroups: []
  },
  {
    id: 'university-call',
    prompt: 'Dove è il miglior posto per fare una call in università?',
    promptAliases: [
      'Ma qual è il posto migliore per fare una call universitaria?',
      'Dove posso fare una call universitaria?'
    ],
    keywordGroups: [
      ['bagno', 'servizi', 'toilette'],
      ['donne', 'femminile'],
      ['secondo piano', '2 piano', 'piano 2'],
      ['edificio g', 'edifici g', 'palazzo g']
    ]
  }
];
const historyItems = document.querySelector('.history-items');
const chatSaveStatus = document.querySelector('#chat-save-status');
const selectedChatId = new URLSearchParams(window.location.search).get('chat');
let activeChatId = selectedChatId;
let isReplyPending = false;
let awaitingManualUltracodeReply = false;
let activeQuizCardId = null;
let unusedQuizCardIds = QUIZ_CARDS.map((card) => card.id);
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

function findQuizCard(prompt) {
  const normalizedPrompt = normalizeQuizText(prompt);
  return QUIZ_CARDS.find((card) =>
    [card.prompt, ...(card.promptAliases || [])]
      .some((candidate) => normalizeQuizText(candidate) === normalizedPrompt)
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
  if (!card || card.alwaysIncorrect || !card.keywordGroups.length) return false;
  const normalizedAnswer = ` ${normalizeQuizText(answer)} `;
  const matchedGroups = card.keywordGroups.filter((group) =>
    group.some((keyword) => normalizedAnswer.includes(` ${normalizeQuizText(keyword)} `))
  ).length;
  return matchedGroups / card.keywordGroups.length >= QUIZ_SCORE_THRESHOLD;
}

function takeNextQuizCard() {
  if (unusedQuizCardIds.length === 0) {
    unusedQuizCardIds = QUIZ_CARDS.map((card) => card.id);
  }
  const index = Math.floor(Math.random() * unusedQuizCardIds.length);
  const [nextId] = unusedQuizCardIds.splice(index, 1);
  return QUIZ_CARDS.find((card) => card.id === nextId);
}

function resetUltracodeQuiz() {
  activeQuizCardId = null;
  unusedQuizCardIds = QUIZ_CARDS.map((card) => card.id);
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
    conversation?.replaceChildren();
    if (conversation) conversation.hidden = true;
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
  function makeMessage(role, text) {
    const message = document.createElement('div');
    message.className = 'chat-message ' + role;
    const label = document.createElement('span');
    label.className = 'message-label';
    label.textContent = role === 'user' ? 'Tu' : 'SaraAI · demo';
    const content = document.createElement('span');
    content.textContent = text;
    message.append(label, content);
    conversation.append(message);
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

  function restoreActiveChat() {
    if (!activeChatId) return;
    const chat = readChatHistory().find((item) => item.id === activeChatId);
    if (!chat) {
      activeChatId = null;
      return;
    }
    chat.turns.forEach((turn) => makeMessage(turn.role, turn.text));
    if (chatSaveStatus) {
      chatSaveStatus.hidden = false;
      chatSaveStatus.textContent = 'Chat salvata in Chat passate';
    }
    renderHistoryLinks(activeChatId);
  }

  restoreActiveChat();

  function saveTurn(role, text) {
    const chats = readChatHistory();
    let chat = chats.find((item) => item.id === activeChatId);
    if (!chat) {
      if (role !== 'user') return;
      activeChatId = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : 'chat-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      chat = { id: activeChatId, title: text.trim().slice(0, 54), turns: [], updatedAt: Date.now() };
      const chatUrl = new URL(window.location.href);
      chatUrl.searchParams.set('chat', activeChatId);
      window.history.replaceState(null, '', chatUrl.pathname + '?' + chatUrl.searchParams.toString() + '#chat');
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
    if (!text || sendButton.disabled) return;
    if (ultracodeToggle?.checked) {
      if (awaitingManualUltracodeReply) {
        const currentCard = QUIZ_CARDS.find((card) => card.id === activeQuizCardId) || null;
        const answerIsCorrect = currentCard ? scoreQuizAnswer(text, currentCard) : null;
        makeMessage('assistant', text);
        saveTurn('assistant', text);
        promptInput.value = '';
        autoSize();
        sendButton.disabled = true;
        ultracodeToggle.disabled = true;
        isReplyPending = true;
        sendButton.setAttribute('aria-label', 'SaraAI sta preparando il prossimo prompt');
        const loadingMessage = makeLoadingMessage();
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        loadingMessage.remove();
        const nextCard = takeNextQuizCard();
        const combineTrapReactionAndPrompt = Boolean(currentCard?.alwaysIncorrect && nextCard);
        if (currentCard) {
          const feedback = answerIsCorrect ? QUIZ_CORRECT_FEEDBACK : QUIZ_INCORRECT_FEEDBACK;
          const reaction = combineTrapReactionAndPrompt
            ? feedback + '\n\n' + nextCard.prompt
            : feedback;
          makeMessage('user', reaction);
          saveTurn('user', reaction);
        }
        if (nextCard) {
          if (!combineTrapReactionAndPrompt) {
            makeMessage('user', nextCard.prompt);
            saveTurn('user', nextCard.prompt);
          }
          activeQuizCardId = nextCard.id;
          setAwaitingManualUltracodeReply(true);
        }
        sendButton.disabled = false;
        ultracodeToggle.disabled = false;
        isReplyPending = false;
      } else {
        makeMessage('user', text);
        saveTurn('user', text);
        selectQuizCard(text);
        promptInput.value = '';
        autoSize();
        setAwaitingManualUltracodeReply(true);
      }
      promptInput.focus();
      return;
    }
    makeMessage('user', text);
    saveTurn('user', text);
    promptInput.value = '';
    autoSize();
    sendButton.disabled = true;
    isReplyPending = true;
    sendButton.setAttribute('aria-label', 'SaraAI sta preparando una risposta');
    await new Promise((resolve) => window.setTimeout(resolve, 380));
    const answer = replyFor(text);
    makeMessage('assistant', answer);
    saveTurn('assistant', answer);
    sendButton.disabled = false;
    isReplyPending = false;
    sendButton.setAttribute('aria-label', 'Invia messaggio');
    promptInput.focus();
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
      conversation.replaceChildren();
      conversation.hidden = true;
      promptInput.value = '';
      autoSize();
      if (chatSaveStatus) chatSaveStatus.hidden = true;
      window.history.replaceState(null, '', window.location.pathname + '#chat');
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
