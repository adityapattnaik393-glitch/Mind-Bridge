const SYMBOLS = ['🍵', '🎋', '🦏', '🪷'];
let deck = [...SYMBOLS, ...SYMBOLS];
let pickedTiles = [];
let matchedTotal = 0;
let totalAttempts = 0;
let patient = null;

const board = document.getElementById('game-grid');
const voiceHelpBtn = document.getElementById('voice-help-btn');
const resetBtn = document.getElementById('reset-btn');
const toggleCaregiverBtn = document.getElementById('toggle-caregiver-btn');
const caregiverPanel = document.getElementById('caregiver-panel');
const analyticsFeed = document.getElementById('analytics-feed');
const aiText = document.getElementById('ai-text');

function voiceNarrate(sentence) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(sentence);
    voice.rate = 0.85;
    window.speechSynthesis.speak(voice);
  }
}

voiceHelpBtn.addEventListener('click', () => {
  voiceNarrate('Tap or press enter on two boxes to find matching pairs.');
});

async function startup() {
  try {
    const res = await fetch('/api/patient');
    if (res.ok) {
      patient = await res.json();
    }
  } catch (err) {
    console.error('Offline or profile fetch error:', err);
  }
  buildBoard();
}

function buildBoard() {
  board.innerHTML = '';
  pickedTiles = [];
  matchedTotal = 0;
  totalAttempts = 0;
  deck.sort(() => 0.5 - Math.random());

  deck.forEach((symbol, index) => {
    // Accessible button elements instead of un-focusable divs
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.classList.add('tile');
    tile.dataset.symbol = symbol;
    tile.setAttribute('aria-label', `Card ${index + 1}: Hidden`);
    tile.textContent = '🌸';
    tile.addEventListener('click', () => onTileSelect(tile));
    board.appendChild(tile);
  });
}

function onTileSelect(tile) {
  if (pickedTiles.length >= 2 || tile.classList.contains('revealed') || tile.classList.contains('matched')) return;

  tile.classList.add('revealed');
  tile.textContent = tile.dataset.symbol;
  tile.setAttribute('aria-label', `Card revealed: ${tile.dataset.symbol}`);
  pickedTiles.push(tile);

  if (pickedTiles.length === 2) {
    totalAttempts++;
    const [t1, t2] = pickedTiles;

    if (t1.dataset.symbol === t2.dataset.symbol) {
      t1.classList.add('matched');
      t2.classList.add('matched');
      t1.setAttribute('aria-disabled', 'true');
      t2.setAttribute('aria-disabled', 'true');
      matchedTotal++;
      pickedTiles = [];

      if (matchedTotal === SYMBOLS.length) {
        processSessionEnd();
      }
    } else {
      setTimeout(() => {
        t1.classList.remove('revealed');
        t2.classList.remove('revealed');
        t1.textContent = '🌸';
        t2.textContent = '🌸';
        t1.setAttribute('aria-label', 'Card: Hidden');
        t2.setAttribute('aria-label', 'Card: Hidden');
        pickedTiles = [];
      }, 950);
    }
  }
}

async function processSessionEnd() {
  const calculatedScore = Math.max(10, 100 - (totalAttempts - 4) * 10);
  aiText.textContent = 'Analyzing session activity...';

  if (!patient || !patient._id) {
    aiText.textContent = 'Activity finished! Great job.';
    return;
  }

  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient._id,
        patientName: patient.name || 'Friend',
        score: calculatedScore,
        attempts: totalAttempts,
        difficultyLevel: 1
      })
    });

    const result = await res.json();
    if (result.success && result.data.aiSpokenMessage) {
      aiText.textContent = result.data.aiSpokenMessage;
      voiceNarrate(result.data.aiSpokenMessage);
    }
    refreshCaregiverLogs();
  } catch (e) {
    aiText.textContent = 'Well done! Today\'s session is complete.';
  }
}

// XSS-Safe DOM Population (No innerHTML)
async function refreshCaregiverLogs() {
  if (!patient || !patient._id) return;
  
  analyticsFeed.textContent = '';
  try {
    const res = await fetch(`/api/scores/${patient._id}`);
    const list = await res.json();

    if (!Array.isArray(list) || !list.length) {
      analyticsFeed.textContent = 'No recorded sessions yet.';
      return;
    }

    list.forEach(item => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';

      const timeSpan = document.createElement('strong');
      timeSpan.textContent = `${new Date(item.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: `;

      const scoreText = document.createTextNode(`Score: ${item.score}/100 (${item.attempts} attempts) — `);
      
      const obsElem = document.createElement('span');
      obsElem.style.fontStyle = 'italic';
      obsElem.textContent = item.aiClinicalObservation || 'Completed normally.';

      entry.appendChild(timeSpan);
      entry.appendChild(scoreText);
      entry.appendChild(obsElem);
      analyticsFeed.appendChild(entry);
    });
  } catch (err) {
    analyticsFeed.textContent = 'Unable to load caregiver logs at this time.';
  }
}

resetBtn.addEventListener('click', () => {
  aiText.textContent = 'Board reset. Ready when you are.';
  buildBoard();
});

toggleCaregiverBtn.addEventListener('click', () => {
  caregiverPanel.classList.toggle('hidden');
  if (!caregiverPanel.classList.contains('hidden')) {
    refreshCaregiverLogs();
  }
});

startup();