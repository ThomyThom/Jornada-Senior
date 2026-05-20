/* =====================================================
   JORNADA SÊNIOR — game.js
   Arquitetura: single-page, sessão via localStorage
   ===================================================== */

'use strict';

// ─── CONSTANTS ────────────────────────────────────────

const AREAS = {
  ti: { name: 'Tecnologia (TI)', emoji: '💻', color: '#7b61ff', key: 'ti' },
  saude: { name: 'Saúde', emoji: '🏥', color: '#41d996', key: 'saude' },
  negocios: { name: 'Negócios/Administração', emoji: '📊', color: '#f5a623', key: 'negocios' },
  artes: { name: 'Artes/Comunicação', emoji: '🎨', color: '#ff6b9d', key: 'artes' },
};

const SPECIAL_SQUARES = {
  1:  { type: 'start',   label: 'Faculdade', emoji: '🎓' },
  10: { type: 'special', label: 'Formatura!', emoji: '🎓', action: 'bonus_roll' },
  20: { type: 'choice',  label: 'Fim do Estágio', emoji: '💼', action: 'estagio_choice' },
  30: { type: 'special', label: 'Promoção Júnior', emoji: '⬆️', action: 'advance_2' },
  45: { type: 'special', label: 'Crise!', emoji: '📉', action: 'back_3' },
  55: { type: 'special', label: 'Liderança de Projeto', emoji: '🏗️', action: 'block_low' },
  60: { type: 'finish',  label: 'SÊNIOR!', emoji: '🏆' },
};

const WILD_SQUARES = new Set([5, 12, 18, 26, 33, 38, 42, 48, 52, 58]);

const DESTINY_CARDS = [
  // Positivas
  { id: 'c1', type: 'positive', icon: '📚', title: 'Curso de Especialização',
    text: 'Você fez um curso de fim de semana e acelerou sua carreira!',
    effect: 'advance', value: 3, label: '+3 casas' },
  { id: 'c2', type: 'positive', icon: '🤝', title: 'Indicação de um Amigo',
    text: 'O QI (Quem Indica) funcionou! Uma indicação poderosa abriu portas.',
    effect: 'advance', value: 4, label: '+4 casas' },
  { id: 'c3', type: 'positive', icon: '📈', title: 'Projeto de Sucesso',
    text: 'Seu chefe adorou sua apresentação. Resultado impressionante!',
    effect: 'advance', value: 2, label: '+2 casas' },
  { id: 'c4', type: 'area-bonus', icon: '🚀', title: 'Bônus de Inovação',
    text: 'Um projeto de inovação deu certo — mas nem todos se beneficiam igual.',
    effect: 'advance_area', areaBonus: ['ti', 'artes'], valuePrimary: 4, valueSecondary: 1,
    label: '💻/🎨: +4 casas | Outros: +1 casa' },
  { id: 'c5', type: 'positive', icon: '🌟', title: 'Destaque na Equipe',
    text: 'Seu trabalho foi reconhecido internamente. Promoção à vista!',
    effect: 'advance', value: 3, label: '+3 casas' },
  { id: 'c6', type: 'positive', icon: '💡', title: 'Mentoria Especial',
    text: 'Um profissional sênior te tomou sob suas asas por um período.',
    effect: 'advance', value: 2, label: '+2 casas' },
  { id: 'c7', type: 'positive', icon: '🏅', title: 'Prêmio Interno',
    text: 'A empresa premiou seu desempenho com reconhecimento formal.',
    effect: 'advance', value: 3, label: '+3 casas' },
  // Negativas
  { id: 'c8', type: 'negative', icon: '✂️', title: 'Corte de Gastos (Layoff)',
    text: 'Sua empresa fez cortes. Você teve que recomeçar do zero.',
    effect: 'back', value: 4, label: '−4 casas' },
  { id: 'c9', type: 'negative', icon: '😩', title: 'Burnout',
    text: 'O estresse pegou você. Precisou tirar uma folga forçada.',
    effect: 'skip', value: 1, label: 'Perde 1 rodada', immuneArea: 'saude' },
  { id: 'c10', type: 'negative', icon: '😤', title: 'Conflito na Equipe',
    text: 'Fofocas de corredor prejudicaram sua avaliação de desempenho.',
    effect: 'back', value: 2, label: '−2 casas' },
  { id: 'c11', type: 'area-bonus', icon: '📋', title: 'Mudança de Regulamentação',
    text: 'O mercado mudou. Quem tem estabilidade sai ileso.',
    effect: 'back_area', areaBonus: ['saude', 'negocios'], valuePrimary: 0, valueSecondary: 2,
    label: '🏥/📊: Fica onde está | Outros: −2 casas' },
  { id: 'c12', type: 'negative', icon: '🖥️', title: 'Sistema Fora do Ar',
    text: 'Um problema técnico atrasou todo o projeto e a culpa caiu em você.',
    effect: 'back', value: 2, label: '−2 casas' },
  { id: 'c13', type: 'negative', icon: '📊', title: 'Meta Não Atingida',
    text: 'O trimestre foi difícil e as metas ficaram muito aquém do esperado.',
    effect: 'back', value: 3, label: '−3 casas' },
  { id: 'c14', type: 'negative', icon: '🔄', title: 'Reestruturação',
    text: 'A empresa reestruturou a área e você voltou à estaca zero no projeto.',
    effect: 'back', value: 3, label: '−3 casas' },
];

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const SESSION_KEY = 'jornada_senior_session';

// ─── STATE ────────────────────────────────────────────

let G = null; // game state

// ─── DOM REFS ─────────────────────────────────────────

const $$ = id => document.getElementById(id);

const screens = {
  setup: $$('screen-setup'),
  game: $$('screen-game'),
  winner: $$('screen-winner'),
};

// ─── SCREEN MANAGEMENT ───────────────────────────────

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ─── SESSION PERSISTENCE ─────────────────────────────

function saveSession() {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(G)); } catch (e) {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
}

// ─── NOTIFICAÇÃO (TOAST) ──────────────────────────────
function showToast(message) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    background: var(--accent); color: #000; padding: 12px 24px;
    border-radius: 8px; font-weight: bold; z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    font-family: 'Syne', sans-serif;
    animation: modalIn 0.3s ease;
  `;
  toast.innerHTML = `🔄 ${message}`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}

// ─── SETUP SCREEN ────────────────────────────────────

let setupPlayerCount = 2;

function initSetup() {
  // Check for saved session
  const saved = loadSession();
  if (saved && saved.started) {
    G = saved;
    startGame(true); // resume
    return;
  }

  showScreen('setup');
  renderPlayerForms();

  // Count buttons
  document.querySelectorAll('.cnt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setupPlayerCount = parseInt(btn.dataset.count);
      document.querySelectorAll('.cnt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPlayerForms();
    });
  });

  $$('btnStart').addEventListener('click', () => {
    const players = collectPlayerData();
    if (!players) return;
    initGame(players);
  });

  $$('btnRules').addEventListener('click', () => $$('rulesModal').classList.add('open'));
}

function renderPlayerForms() {
  const container = $$('playerForms');
  const used = Array.from(container.querySelectorAll('.area-select')).map(s => s.value);
  container.innerHTML = '';

  for (let i = 0; i < setupPlayerCount; i++) {
    const row = document.createElement('div');
    row.className = 'player-form-row';
    row.setAttribute('data-label', `Jogador ${i + 1}`);

    const areaKeys = Object.keys(AREAS);
    const options = areaKeys.map(k => {
      const a = AREAS[k];
      return `<option value="${k}" ${used[i] === k ? 'selected' : (i < areaKeys.length && !used[i] && k === areaKeys[i] ? 'selected' : '')}>${a.emoji} ${a.name}</option>`;
    }).join('');

    row.innerHTML = `
      <input class="form-input" type="text" placeholder="Nome do jogador" value="Jogador ${i + 1}" data-player="${i}" />
      <select class="area-select" data-player="${i}">
        ${options}
      </select>
    `;
    container.appendChild(row);
  }
}

function collectPlayerData() {
  const names = document.querySelectorAll('.form-input[data-player]');
  const areas = document.querySelectorAll('.area-select[data-player]');
  const players = [];
  const areaUsed = {};

  for (let i = 0; i < setupPlayerCount; i++) {
    const name = names[i].value.trim() || `Jogador ${i + 1}`;
    const area = areas[i].value;
    if (areaUsed[area]) {
      alert(`Dois jogadores não podem ter a mesma área. Jogador ${i + 1} está usando uma área já escolhida.`);
      return null;
    }
    areaUsed[area] = true;

    const colors = ['#7b61ff', '#41d996', '#f5a623', '#ff6b9d'];
    players.push({
      id: i,
      name,
      area,
      color: AREAS[area].color,
      position: 1,
      skipsLeft: 0,
      tiCooldown: 0,
      turns: 0,
      cardsDrawn: 0,
    });
  }
  return players;
}

// ─── GAME INIT ────────────────────────────────────────

function initGame(players) {
  const deck = shuffleDeck([...DESTINY_CARDS]);
  G = {
    started: true,
    players,
    currentPlayer: 0,
    deck,
    deckIndex: 0,
    log: [],
    phase: 'roll', // 'roll' | 'waiting' | 'done'
    winner: null,
  };
  clearSession();
  saveSession();
  startGame(false);
}

function startGame(resumed) {
  showScreen('game');
  buildBoard();
  renderAll();
  if (resumed) addLog('neutral', '🔄', 'Sessão anterior retomada!');
  updateTurnUI();

  $$('btnRoll').addEventListener('click', handleRoll);
  $$('btnRestart').addEventListener('click', handleRestart);
  $$('btnRulesGame').addEventListener('click', () => $$('rulesModal').classList.add('open'));
  $$('btnPlayAgain').addEventListener('click', handleRestart);
}

// ─── BOARD ───────────────────────────────────────────

function buildBoard() {
  const board = $$('board');
  board.innerHTML = '';

  // Build rows: row 0 = top (cells 51-60), row 1 = cells 41-50 right-to-left, etc.
  // Snake pattern: odd rows go right-to-left
  const rows = [];
  for (let r = 0; r < 6; r++) {
    const start = 60 - r * 10;
    const row = [];
    for (let c = 0; c < 10; c++) {
      const n = r % 2 === 0 ? start - c : start - 10 + c + 1;
      row.push(Math.max(1, Math.min(60, n)));
    }
    rows.push(row);
  }

  rows.forEach(row => {
    row.forEach(num => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.id = `cell-${num}`;

      if (num === 1) cell.classList.add('cell-start');
      else if (num === 60) cell.classList.add('cell-finish');
      else if (SPECIAL_SQUARES[num]) cell.classList.add('cell-special');
      else if (WILD_SQUARES.has(num)) cell.classList.add('cell-wild');

      const numLabel = `<div class="cell-num">${num}</div>`;
      let icon = '';
      let label = '';

      if (num === 60) { icon = '🏆'; label = 'SÊNIOR'; }
      else if (SPECIAL_SQUARES[num]) { icon = SPECIAL_SQUARES[num].emoji; label = SPECIAL_SQUARES[num].label; }
      else if (WILD_SQUARES.has(num)) { icon = '❓'; label = 'Coringa'; }

      cell.innerHTML = `
        ${numLabel}
        ${icon ? `<div class="cell-emoji">${icon}</div>` : ''}
        ${label ? `<div class="cell-label">${label}</div>` : ''}
        <div class="pawns-on-cell" id="pawns-${num}"></div>
      `;

      board.appendChild(cell);
    });
  });

  renderPawns();
}

// ─── RENDER ───────────────────────────────────────────

function renderAll() {
  renderPawns();
  renderPlayersPanel();
}

function renderPawns() {
  // Clear all pawn containers
  document.querySelectorAll('.pawns-on-cell').forEach(c => c.innerHTML = '');

  G.players.forEach((p, i) => {
    const container = $$(`pawns-${p.position}`);
    if (!container) return;
    const pawn = document.createElement('div');
    pawn.className = 'pawn' + (G.currentPlayer === i && G.phase === 'roll' ? ' active-turn' : '');
    pawn.title = p.name;
    pawn.style.background = p.color;
    pawn.innerHTML = AREAS[p.area].emoji.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '');
    container.appendChild(pawn);
  });
}

function renderPlayersPanel() {
  const panel = $$('playersPanel');
  panel.innerHTML = '<div class="players-title">👥 Jogadores</div>';

  G.players.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'player-card' + (G.currentPlayer === i ? ' active-player' : '');
    card.setAttribute('data-area', p.area);

    const area = AREAS[p.area];
    card.innerHTML = `
      ${p.skipsLeft > 0 ? '<div class="player-status-tag">Parado</div>' : ''}
      <div class="player-dot" style="background:${p.color}">${area.emoji}</div>
      <div class="player-info">
        <div class="player-name">${p.name}</div>
        <div class="player-area-tag">${area.name}</div>
      </div>
      <div class="player-position">Casa ${p.position}</div>
    `;
    panel.appendChild(card);
  });
}

function updateTurnUI() {
  const p = G.players[G.currentPlayer];
  const area = AREAS[p.area];
  const roll = $$('btnRoll');
  const info = $$('turnInfo');

  if (G.phase === 'done') {
    roll.disabled = true;
    info.innerHTML = '🏆 Jogo encerrado!';
    return;
  }

  if (G.phase === 'waiting') {
    roll.disabled = true;
    return;
  }

  roll.disabled = false;

  if (p.skipsLeft > 0) {
    info.innerHTML = `<span style="color:var(--negative)">⏸ ${p.name} está parado (${p.skipsLeft} rodada${p.skipsLeft > 1 ? 's' : ''})</span>`;
    roll.disabled = true;
    roll.textContent = 'Turno Bloqueado';
    // Auto advance
    setTimeout(() => {
      p.skipsLeft--;
      addLog('negative', '⏸', `${p.name} ficou parado esta rodada.`);
      saveSession();
      nextTurn();
    }, 1200);
  } else {
    info.innerHTML = `Vez de <strong>${p.name}</strong> ${area.emoji}`;
    roll.textContent = 'Rolar Dado 🎲';
    roll.disabled = false;
  }
}

// ─── ROLL ─────────────────────────────────────────────

function handleRoll() {
  if (G.phase !== 'roll') return;
  const p = G.players[G.currentPlayer];
  if (p.skipsLeft > 0) return;

  G.phase = 'waiting';
  $$('btnRoll').disabled = true;

  const result = rollDie();

  // TI reroll check: once every 3 turns, if result is low (1-2)
  if (p.area === 'ti' && result <= 2 && p.tiCooldown <= 0) {
    showRerollModal(p, result);
    return;
  }

  applyRoll(p, result);
}

function rollDie() {
  return Math.floor(Math.random() * 6) + 1;
}

function animateDice(value, cb) {
  const dice = $$('dice');
  const diceVal = $$('diceValue');
  dice.classList.add('rolling');
  let frames = 0;
  const interval = setInterval(() => {
    dice.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
    frames++;
    if (frames >= 8) {
      clearInterval(interval);
      dice.classList.remove('rolling');
      dice.textContent = DICE_FACES[value - 1];
      diceVal.textContent = value;
      if (cb) cb();
    }
  }, 70);
}

function applyRoll(p, value, isBonus) {
  const prefix = isBonus ? '🎁 Bônus: ' : '';
  animateDice(value, () => {
    addLog('neutral', '🎲', `${p.name} tirou ${value}.`);

    // Decrease TI cooldown
    if (p.area === 'ti') {
      if (p.tiCooldown > 0) p.tiCooldown--;
    }

    // Casa 55 block rule
    if (p.position === 55 && !isBonus) {
      if (value < 4) {
        addLog('negative', '🏗️', `${p.name} está em Liderança de Projeto — precisa de 4, 5 ou 6 para sair. Ficou parado!`);
        showSquareModal(55, p, false, () => {
          p.turns++;
          saveSession();
          nextTurn();
        });
        return;
      }
    }

    movePlayer(p, value, isBonus);
  });
}

function movePlayer(p, value, isBonus) {
  const oldPos = p.position;
  const newPos = Math.min(60, p.position + value);
  p.position = newPos;
  p.turns++;

  addLog('neutral', '📍', `${p.name} moveu da casa ${oldPos} → ${newPos}.`);

  renderPawns();
  renderPlayersPanel();

  // Flash the cell
  const cell = $$(`cell-${newPos}`);
  if (cell) cell.classList.add('highlight-move');
  setTimeout(() => cell && cell.classList.remove('highlight-move'), 600);

  saveSession();

  // Check win
  if (newPos >= 60) {
    p.position = 60;
    G.phase = 'done';
    G.winner = p.id;
    saveSession();
    setTimeout(() => showWinner(p), 400);
    return;
  }

  // Artes bonus card on 6
  if (p.area === 'artes' && value === 6 && !isBonus) {
    addLog('special', '🎨', `${p.name} (Artes) tirou 6 — carta bônus!`);
    setTimeout(() => {
      handleCard(p, true, () => {
        handleSquareAction(p, newPos, isBonus);
      });
    }, 300);
    return;
  }

  setTimeout(() => handleSquareAction(p, newPos, isBonus), 300);
}

function handleSquareAction(p, pos, isBonus) {
  // Networking: Negócios lands on same square as another player
  if (p.area === 'negocios' && !isBonus) {
    const others = G.players.filter(pl => pl.id !== p.id && pl.position === pos);
    if (others.length > 0) {
      addLog('positive', '📊', `${p.name} (Negócios) fez Networking! Avança 2 casas extras.`);
      setTimeout(() => {
        movePlayerByAmount(p, 2);
        renderAll();
        saveSession();
        setTimeout(() => resolveSquare(p, p.position, isBonus), 400);
      }, 400);
      return;
    }
  }

  resolveSquare(p, pos, isBonus);
}

function resolveSquare(p, pos, isBonus) {
  // Special squares
  if (SPECIAL_SQUARES[pos] && pos !== 1 && !isBonus) {
    const sq = SPECIAL_SQUARES[pos];
    showSquareModal(pos, p, sq, () => {
      executeSquareAction(p, sq, pos);
    });
    return;
  }

  // Wild square
  if (WILD_SQUARES.has(pos)) {
    handleCard(p, false, () => {
      nextTurn();
    });
    return;
  }

  nextTurn();
}

function executeSquareAction(p, sq, pos) {
  switch (sq.action) {
    case 'bonus_roll': {
      addLog('positive', '🎓', `${p.name} tirou dado bônus pela Formatura!`);
      const bonus = rollDie();
      applyRoll(p, bonus, true);
      break;
    }
    case 'estagio_choice': {
      // Choice was handled in modal
      break;
    }
    case 'advance_2': {
      addLog('positive', '⬆️', `${p.name} foi promovido a Júnior! +2 casas.`);
      movePlayerByAmount(p, 2);
      renderAll();
      saveSession();
      setTimeout(() => nextTurn(), 400);
      break;
    }
    case 'back_3': {
      addLog('negative', '📉', `${p.name} sofreu com a crise! −3 casas.`);
      movePlayerByAmount(p, -3);
      renderAll();
      saveSession();
      setTimeout(() => nextTurn(), 400);
      break;
    }
    case 'block_low': {
      // Already handled in the modal — nextTurn called from there if blocked
      nextTurn();
      break;
    }
    default:
      nextTurn();
  }
}

function movePlayerByAmount(p, amount) {
  p.position = Math.max(1, Math.min(60, p.position + amount));
  renderPawns();
}

// ─── CARDS ────────────────────────────────────────────

function drawCard() {
  if (G.deckIndex >= G.deck.length) {
    G.deck = shuffleDeck([...DESTINY_CARDS]);
    G.deckIndex = 0;
    addLog('neutral', '🔀', 'Baralho de Destino embaralhado novamente.');
  }
  return G.deck[G.deckIndex++];
}

function handleCard(p, isBonus, cb) {
  const card = drawCard();
  p.cardsDrawn = (p.cardsDrawn || 0) + 1;
  G.phase = 'waiting';
  saveSession();

  // Show card modal
  const modal = $$('cardModal');
  const typeEl = $$('cardType');
  const iconEl = $$('cardIcon');
  const titleEl = $$('cardTitle');
  const textEl = $$('cardText');
  const effectEl = $$('cardEffect');
  const closeBtn = $$('btnCloseCard');

  typeEl.className = 'card-type ' + card.type;
  const typeLabels = { positive: '✨ Destino Positivo', negative: '⚡ Destino Negativo', 'area-bonus': '🎯 Bônus de Área' };
  typeEl.textContent = typeLabels[card.type] || 'Destino Corporativo';
  iconEl.textContent = card.icon;
  titleEl.textContent = card.title;
  textEl.textContent = card.text;

  let effectText = card.label;
  let effectClass = 'eff-neutral';

  // Determine effect based on player area
  let finalEffect = resolveCardEffect(card, p);
  effectText = finalEffect.label;
  effectClass = finalEffect.positive ? 'eff-positive' : finalEffect.negative ? 'eff-negative' : 'eff-neutral';
  effectEl.textContent = effectText;
  effectEl.className = 'card-effect ' + effectClass;

  modal.classList.add('open');

  const handler = () => {
    closeBtn.removeEventListener('click', handler);
    modal.classList.remove('open');
    applyCardEffect(card, p, finalEffect);
    renderAll();
    saveSession();
    if (cb) cb();
  };
  closeBtn.addEventListener('click', handler);
}

function resolveCardEffect(card, p) {
  switch (card.effect) {
    case 'advance':
      return { type: 'advance', value: card.value, label: `+${card.value} casas`, positive: true };
    case 'back':
      return { type: 'back', value: card.value, label: `−${card.value} casas`, negative: true };
    case 'skip': {
      const immune = card.immuneArea && p.area === card.immuneArea;
      if (immune) return { type: 'none', value: 0, label: `🏥 Imunidade! (Saúde) — continua jogando`, positive: true };
      return { type: 'skip', value: card.value, label: `Perde ${card.value} rodada`, negative: true };
    }
    case 'advance_area': {
      const isBonus = card.areaBonus.includes(p.area);
      const val = isBonus ? card.valuePrimary : card.valueSecondary;
      return { type: 'advance', value: val, label: `+${val} casa${val !== 1 ? 's' : ''}`, positive: true };
    }
    case 'back_area': {
      const isSafe = card.areaBonus.includes(p.area);
      if (isSafe) return { type: 'none', value: 0, label: 'Estabilidade! Fica onde está.', positive: true };
      return { type: 'back', value: card.valueSecondary, label: `−${card.valueSecondary} casas`, negative: true };
    }
    default:
      return { type: 'none', value: 0, label: '—', positive: false, negative: false };
  }
}

function applyCardEffect(card, p, resolved) {
  switch (resolved.type) {
    case 'advance':
      if (resolved.value > 0) {
        addLog('positive', card.icon, `${p.name}: "${card.title}" → +${resolved.value} casas.`);
        movePlayerByAmount(p, resolved.value);
      } else {
        addLog('positive', card.icon, `${p.name}: "${card.title}" → sem movimento.`);
      }
      break;
    case 'back':
      addLog('negative', card.icon, `${p.name}: "${card.title}" → −${resolved.value} casas.`);
      movePlayerByAmount(p, -resolved.value);
      break;
    case 'skip':
      addLog('negative', card.icon, `${p.name}: "${card.title}" → perde ${resolved.value} rodada.`);
      p.skipsLeft += resolved.value;
      break;
    case 'none':
      addLog('positive', card.icon, `${p.name}: "${card.title}" → ${resolved.label}`);
      break;
  }

  // Check win after card
  if (p.position >= 60) {
    p.position = 60;
    G.phase = 'done';
    G.winner = p.id;
  }
}

// ─── SQUARE MODALS ───────────────────────────────────

function showSquareModal(pos, p, sq, cb) {
  const modal = $$('squareModal');
  const typeEl = $$('squareType');
  const iconEl = $$('squareIcon');
  const titleEl = $$('squareTitle');
  const textEl = $$('squareText');
  const choicesEl = $$('squareChoices');
  const closeBtn = $$('btnCloseSquare');

  modal.classList.add('open');
  choicesEl.innerHTML = '';
  closeBtn.style.display = 'none';

  if (pos === 55 && sq === false) {
    // Block case
    typeEl.className = 'card-type negative';
    typeEl.textContent = '🏗️ Casa 55';
    iconEl.textContent = '🔒';
    titleEl.textContent = 'Pressão na Liderança';
    textEl.textContent = `${p.name} está em Liderança de Projeto, mas o resultado foi baixo! É necessário tirar 4, 5 ou 6 para avançar.`;
    closeBtn.textContent = 'Entendido';
    closeBtn.style.display = 'block';
    const handler = () => {
      closeBtn.removeEventListener('click', handler);
      modal.classList.remove('open');
      if (cb) cb();
    };
    closeBtn.addEventListener('click', handler);
    return;
  }

  const sqData = SPECIAL_SQUARES[pos];
  if (!sqData) { modal.classList.remove('open'); if (cb) cb(); return; }

  switch (pos) {
    case 10: {
      typeEl.className = 'card-type positive';
      typeEl.textContent = '🎓 Casa 10 — Formatura';
      iconEl.textContent = sqData.emoji;
      titleEl.textContent = 'Parabéns, Formando!';
      textEl.textContent = `${p.name} pegou o diploma! Um dado bônus será rolado.`;
      closeBtn.textContent = 'Rolar Dado Bônus 🎲';
      closeBtn.style.display = 'block';
      const h10 = () => {
        closeBtn.removeEventListener('click', h10);
        modal.classList.remove('open');
        if (cb) cb();
      };
      closeBtn.addEventListener('click', h10);
      break;
    }
    case 20: {
      typeEl.className = 'card-type special';
      typeEl.textContent = '💼 Casa 20 — Fim do Estágio';
      iconEl.textContent = sqData.emoji;
      titleEl.textContent = 'Decisão de Carreira!';
      textEl.textContent = `${p.name} terminou o estágio. Aceita um salário menor e avança, ou espera por uma oferta melhor?`;
      choicesEl.innerHTML = `
        <button class="choice-btn choice-yes" id="c20-yes">Aceitar salário baixo → Casa 23</button>
        <button class="choice-btn choice-no" id="c20-no">Esperar oferta melhor → Perde 1 rodada</button>
      `;
      const h20y = () => {
        $$('c20-yes').removeEventListener('click', h20y);
        $$('c20-no').removeEventListener('click', h20n);
        modal.classList.remove('open');
        addLog('special', '💼', `${p.name} aceitou salário menor → vai para casa 23.`);
        p.position = 23;
        renderAll();
        saveSession();
        nextTurn();
      };
      const h20n = () => {
        $$('c20-yes').removeEventListener('click', h20y);
        $$('c20-no').removeEventListener('click', h20n);
        modal.classList.remove('open');
        addLog('special', '💼', `${p.name} escolheu esperar por melhor salário — perde 1 rodada.`);
        p.skipsLeft += 1;
        saveSession();
        nextTurn();
      };
      $$('c20-yes').addEventListener('click', h20y);
      $$('c20-no').addEventListener('click', h20n);
      break;
    }
    case 30: {
      typeEl.className = 'card-type positive';
      typeEl.textContent = '⬆️ Casa 30 — Promoção';
      iconEl.textContent = sqData.emoji;
      titleEl.textContent = 'Promoção para Júnior!';
      textEl.textContent = `${p.name} é oficialmente do mercado! Avança 2 casas extras.`;
      closeBtn.textContent = 'Continuar →';
      closeBtn.style.display = 'block';
      const h30 = () => {
        closeBtn.removeEventListener('click', h30);
        modal.classList.remove('open');
        if (cb) cb();
      };
      closeBtn.addEventListener('click', h30);
      break;
    }
    case 45: {
      typeEl.className = 'card-type negative';
      typeEl.textContent = '📉 Casa 45 — Crise';
      iconEl.textContent = sqData.emoji;
      titleEl.textContent = 'Crise na Empresa!';
      textEl.textContent = `${p.name} foi afetado pela crise corporativa. Recua 3 casas.`;
      closeBtn.textContent = 'Continuar →';
      closeBtn.style.display = 'block';
      const h45 = () => {
        closeBtn.removeEventListener('click', h45);
        modal.classList.remove('open');
        if (cb) cb();
      };
      closeBtn.addEventListener('click', h45);
      break;
    }
    case 55: {
      typeEl.className = 'card-type special';
      typeEl.textContent = '🏗️ Casa 55 — Liderança';
      iconEl.textContent = sqData.emoji;
      titleEl.textContent = 'Liderança de Projeto!';
      textEl.textContent = `${p.name} chegou à liderança! A pressão é enorme — para sair desta casa, precisa tirar 4, 5 ou 6.`;
      closeBtn.textContent = 'Entendido →';
      closeBtn.style.display = 'block';
      const h55 = () => {
        closeBtn.removeEventListener('click', h55);
        modal.classList.remove('open');
        if (cb) cb();
      };
      closeBtn.addEventListener('click', h55);
      break;
    }
    default:
      modal.classList.remove('open');
      if (cb) cb();
  }
}

// ─── REROLL MODAL (TI) ───────────────────────────────

function showRerollModal(p, result) {
  const modal = $$('rerollModal');
  $$('rerollText').textContent = `${p.name} tirou ${result} — resultado baixo! Quer usar a habilidade de TI e rolar novamente?`;
  $$('rerollOriginal').textContent = result;
  modal.classList.add('open');

  const acceptBtn = $$('btnAcceptReroll');
  const rerollBtn = $$('btnUseReroll');

  const cleanup = () => {
    acceptBtn.removeEventListener('click', onAccept);
    rerollBtn.removeEventListener('click', onReroll);
    modal.classList.remove('open');
  };

  const onAccept = () => {
    cleanup();
    addLog('neutral', '💻', `${p.name} usou Adaptação Rápida mas aceitou o resultado (${result}).`);
    applyRoll(p, result);
  };
  const onReroll = () => {
    cleanup();
    p.tiCooldown = 3;
    addLog('special', '💻', `${p.name} usou Adaptação Rápida — rolando novamente!`);
    const newResult = rollDie();
    applyRoll(p, newResult);
  };

  acceptBtn.addEventListener('click', onAccept);
  rerollBtn.addEventListener('click', onReroll);
}

// ─── TURN MANAGEMENT ─────────────────────────────────

function nextTurn() {
  if (G.phase === 'done') return;

  G.currentPlayer = (G.currentPlayer + 1) % G.players.length;
  G.phase = 'roll';
  saveSession();
  renderAll();
  updateTurnUI();
}

// ─── LOG ─────────────────────────────────────────────

function addLog(type, icon, text) {
  const entry = { type, icon, text, ts: Date.now() };
  G.log.unshift(entry);
  if (G.log.length > 50) G.log.pop();

  const list = $$('logList');
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.innerHTML = `<span class="log-name">${icon}</span> ${text}`;
  list.prepend(div);

  // Keep last 20 in DOM
  while (list.children.length > 20) list.removeChild(list.lastChild);
}

// ─── WINNER ───────────────────────────────────────────

function showWinner(p) {
  const area = AREAS[p.area];
  showScreen('winner');
  $$('winnerName').textContent = p.name;
  $$('winnerName').style.color = p.color;
  $$('winnerArea').textContent = `${area.emoji} ${area.name}`;

  $$('winnerStats').innerHTML = `
    <div class="stat-chip"><span class="sv">${p.turns}</span><span class="sl">Rodadas</span></div>
    <div class="stat-chip"><span class="sv">${p.cardsDrawn || 0}</span><span class="sl">Cartas</span></div>
    <div class="stat-chip"><span class="sv">${G.players.length}</span><span class="sl">Jogadores</span></div>
  `;

  launchConfetti(p.color);
}

function launchConfetti(color) {
  const wrap = $$('confetti');
  wrap.innerHTML = '';
  const colors = [color, '#c8a84b', '#fff', '#7b61ff', '#41d996', '#ff6b9d'];
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}vw;
      top: ${-Math.random() * 100}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${6 + Math.random() * 10}px;
      height: ${6 + Math.random() * 10}px;
      animation-duration: ${2 + Math.random() * 3}s;
      animation-delay: ${Math.random() * 2}s;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      opacity: ${0.7 + Math.random() * 0.3};
    `;
    wrap.appendChild(piece);
  }
}

// ─── RESTART ─────────────────────────────────────────

function handleRestart() {
  if (!confirm('Tem certeza que quer reiniciar? O progresso atual será perdido.')) return;
  clearSession();
  G = null;
  location.reload();
}

// ─── UTILS ───────────────────────────────────────────

function shuffleDeck(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── GLOBAL MODAL HANDLERS (setup + game) ────────────

function initGlobalModals() {
  // Rules modal — works on every screen
  $$('btnCloseRules').addEventListener('click', () => $$('rulesModal').classList.remove('open'));
  $$('rulesModal').addEventListener('click', e => {
    if (e.target === $$('rulesModal')) $$('rulesModal').classList.remove('open');
  });

  // Developers modal
  $$('btnDevs').addEventListener('click', () => $$('devsModal').classList.add('open'));
  $$('btnCloseDevs').addEventListener('click', () => $$('devsModal').classList.remove('open'));
  $$('devsModal').addEventListener('click', e => {
    if (e.target === $$('devsModal')) $$('devsModal').classList.remove('open');
  });
}

// ─── BOOTSTRAP ───────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initGlobalModals();
  initSetup();
});
