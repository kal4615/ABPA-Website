export function generateBracket() {
  const format = document.getElementById('bracket-format').value;
  let numPlayers = parseInt(document.getElementById('bracket-players').value);
  numPlayers = Math.max(4, Math.min(32, numPlayers));
  const seedMode = document.getElementById('bracket-seed').value;

  let playersArr;
  if (seedMode === 'standings') {
    const sorted = sortedPlayers();
    playersArr = sorted.map((p, i) => ({ name: p.name, seed: i + 1, losses: 0 }));
  } else {
    playersArr = state.players.map((p, i) => ({ name: p.name, seed: i + 1, losses: 0 }));
    for (let i = playersArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playersArr[i], playersArr[j]] = [playersArr[j], playersArr[i]];
    }
  }
  while (playersArr.length < numPlayers) playersArr.push({ name: 'TBD', seed: null });
  playersArr = playersArr.slice(0, numPlayers);

  const size = nextPow2(numPlayers);
  while (playersArr.length < size) playersArr.push({ name: 'BYE', seed: null, losses: 0 });

  // Build seeded bracket order so top seed plays bottom seed: 1 vs N, 2 vs N-1, etc.
  function seedOrder(n) {
    if (n === 1) return [1];
    let order = [1, 2];
    while (order.length < n) {
      const next = [];
      const newLen = order.length * 2;
      order.forEach(x => { next.push(x); next.push(newLen + 1 - x); });
      order = next;
    }
    return order.slice(0, n);
  }

  const order = seedOrder(size);
  const seededPlayers = order.map(pos => (playersArr[pos - 1] || { name: 'BYE', seed: null, losses: 0 }));

  bracketState = buildBracketState(seededPlayers, format);
  renderBracket();
}

function nextPow2(n) { let p = 1; while (p < n) p *= 2; return p; }

export function renderBracket() {
  const wrap = document.getElementById('bracket-wrap');
  wrap.innerHTML = '';

  if (!bracketState) {
    wrap.innerHTML = '<div class="bracket-placeholder"><span class="big">8-BALL</span>Set options above and hit Generate</div>';
    return;
  }

  // Reset button
  const resetRow = document.createElement('div');
  resetRow.style.cssText = 'display:flex;align-items:center;margin-bottom:1rem;';
  resetRow.innerHTML = `<span style="font-size:0.7rem;letter-spacing:2px;color:var(--gray);font-weight:700;">CLICK A PLAYER TO ADVANCE THEM &nbsp;·&nbsp; CLICK AGAIN TO UNDO</span>
    <button class="bracket-reset-btn" id="bracket-clear">✕ Clear Results</button>`;
  wrap.appendChild(resetRow);
  document.getElementById('bracket-clear').addEventListener('click', () => {
    bracketState.matches.forEach(m => {
      m.winner = null; m.loser = null;
      if (m.side !== 'W' || m.round !== 1) { m.p1 = null; m.p2 = null; }
    });
    // restore original R1 players (they never change)
    renderBracket();
    toast('Results cleared!');
  });

  // ─── BRACKET ENGINE ─────────────────────────────────────────────────────────

let bracketState = null; // { format, matches: [{id, round, side, p1, p2, winner, loser, nextMatchId, nextSlot, loserMatchId, loserSlot}] }

document.getElementById('btn-gen-bracket').addEventListener('click', generateBracket);

function generateBracket() {
  const format = document.getElementById('bracket-format').value;
  let numPlayers = parseInt(document.getElementById('bracket-players').value);
  numPlayers = Math.max(4, Math.min(32, numPlayers));
  const seedMode = document.getElementById('bracket-seed').value;

  let playersArr;
  if (seedMode === 'standings') {
    const sorted = sortedPlayers();
    playersArr = sorted.map((p, i) => ({ name: p.name, seed: i + 1 }));
  } else {
    playersArr = state.players.map((p, i) => ({ name: p.name, seed: i + 1 }));
    for (let i = playersArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playersArr[i], playersArr[j]] = [playersArr[j], playersArr[i]];
    }
  }

  while (playersArr.length < numPlayers) playersArr.push({ name: 'TBD', seed: null });
  playersArr = playersArr.slice(0, numPlayers);

  const size = nextPow2(numPlayers);
  while (playersArr.length < size) playersArr.push({ name: 'BYE', seed: null });

  bracketState = buildBracketState(playersArr, format);
  renderBracket();
}

function nextPow2(n) { let p = 1; while (p < n) p *= 2; return p; }

// ── Build data model ─────────────────────────────────────────────────────────

function buildBracketState(players, format) {
  const matches = [];
  let id = 0;

  // Winners bracket rounds
  const wRounds = buildSideMatches(players, 'W', id);
  id = wRounds.nextId;
  matches.push(...wRounds.matches);

  if (format === 'single') {
    // wire next-match links for winners bracket
    wireSide(matches, 'W');
    return { format, matches };
  }

  // Losers bracket
  const numFirstRoundLosers = Math.floor(players.length / 2);
  const lbPlayers = Array(numFirstRoundLosers).fill(null);
  const lRounds = buildSideMatches(lbPlayers, 'L', id);
  id = lRounds.nextId;
  matches.push(...lRounds.matches);

  wireSide(matches, 'W');
  wireSide(matches, 'L');

  // Grand Final
  const gf = { id: id++, round: 0, side: 'GF', p1: null, p2: null, winner: null, loser: null, nextMatchId: null, nextSlot: null, loserMatchId: null, loserSlot: null };
  matches.push(gf);

  // If Necessary match
  if (format === 'double' || format === 'triple') {
    const ifn = { id: id++, round: 0, side: 'GF2', p1: null, p2: null, winner: null, loser: null, nextMatchId: null, nextSlot: null, loserMatchId: null, loserSlot: null };
    matches.push(ifn);
    gf.nextMatchId = ifn.id;
    gf.nextSlot = 1; // loser of GF goes to GF2 slot 2
  }

  // Wire winners bracket final → GF slot 1
  const wFinal = matches.filter(m => m.side === 'W').sort((a, b) => b.round - a.round)[0];
  wFinal.nextMatchId = gf.id;
  wFinal.nextSlot = 1;

  // Wire losers bracket final → GF slot 2
  const lFinal = matches.filter(m => m.side === 'L').sort((a, b) => b.round - a.round)[0];
  lFinal.nextMatchId = gf.id;
  lFinal.nextSlot = 2;

  // Wire W-bracket losers into L-bracket
  wireWinnersToLosers(matches, players.length);

  return { format, matches };
}

function buildSideMatches(players, side, startId) {
  const matches = [];
  let id = startId;
  let round = 1;
  let current = [];

  for (let i = 0; i < players.length; i += 2) {
    current.push({ id: id++, round, side, p1: players[i] || null, p2: players[i + 1] || null, winner: null, loser: null, nextMatchId: null, nextSlot: null, loserMatchId: null, loserSlot: null });
  }
  matches.push(...current);

  while (current.length > 1) {
    round++;
    const next = [];
    for (let i = 0; i < current.length; i += 2) {
      next.push({ id: id++, round, side, p1: null, p2: null, winner: null, loser: null, nextMatchId: null, nextSlot: null, loserMatchId: null, loserSlot: null });
    }
    matches.push(...next);
    current = next;
  }

  return { matches, nextId: id };
}

function wireSide(matches, side) {
  const sideMatches = matches.filter(m => m.side === side).sort((a, b) => a.round - b.round || a.id - b.id);
  const byRound = {};
  sideMatches.forEach(m => { (byRound[m.round] = byRound[m.round] || []).push(m); });
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

  for (let ri = 0; ri < rounds.length - 1; ri++) {
    const cur = byRound[rounds[ri]];
    const nxt = byRound[rounds[ri + 1]];
    cur.forEach((m, i) => {
      const nextMatch = nxt[Math.floor(i / 2)];
      m.nextMatchId = nextMatch.id;
      m.nextSlot = (i % 2 === 0) ? 1 : 2;
    });
  }
}

function wireWinnersToLosers(matches, size) {
  // W round 1 losers → L round 1
  // W round 2+ losers → corresponding L rounds
  const wByRound = {};
  matches.filter(m => m.side === 'W').forEach(m => { (wByRound[m.round] = wByRound[m.round] || []).push(m); });
  const lByRound = {};
  matches.filter(m => m.side === 'L').forEach(m => { (lByRound[m.round] = lByRound[m.round] || []).push(m); });

  const wRounds = Object.keys(wByRound).map(Number).sort((a, b) => a - b);
  const lRounds = Object.keys(lByRound).map(Number).sort((a, b) => a - b);

  // R1 W losers → L R1 (pairs)
  const wR1 = wByRound[wRounds[0]] || [];
  const lR1 = lByRound[lRounds[0]] || [];
  wR1.forEach((m, i) => {
    const lm = lR1[Math.floor(i / 2)];
    if (lm) {
      m.loserMatchId = lm.id;
      m.loserSlot = (i % 2 === 0) ? 1 : 2;
    }
  });

  // Subsequent W rounds → L rounds (interleaved)
  for (let wi = 1; wi < wRounds.length - 1; wi++) {
    const wMs = wByRound[wRounds[wi]] || [];
    const lMs = lByRound[lRounds[Math.min(wi * 2 - 1, lRounds.length - 1)]] || lR1;
    wMs.forEach((m, i) => {
      const lm = lMs[Math.floor(i / 2)];
      if (lm) { m.loserMatchId = lm.id; m.loserSlot = (i % 2 === 0) ? 1 : 2; }
    });
  }
}

// ── Pick winner ───────────────────────────────────────────────────────────────

function pickWinner(matchId, winner) {
  const match = bracketState.matches.find(m => m.id === matchId);
  if (!match || match.winner) return; // already decided
  const loser = winner === match.p1 ? match.p2 : match.p1;
  match.winner = winner;
  match.loser = loser;

  // Advance winner to next match
  if (match.nextMatchId !== null) {
    const next = bracketState.matches.find(m => m.id === match.nextMatchId);
    if (next) {
      if (match.nextSlot === 1) next.p1 = winner;
      else next.p2 = winner;
    }
  }

  // Send loser to losers bracket (double/triple)
  if (match.loserMatchId !== null && loser) {
    const lm = bracketState.matches.find(m => m.id === match.loserMatchId);
    if (lm) {
      if (match.loserSlot === 1) lm.p1 = loser;
      else lm.p2 = loser;
    }
  }

  // BYE auto-advance guard
  const winnerIsBye = (typeof winner === 'string') ? winner === 'BYE' : (winner && winner.name === 'BYE');
  if (winnerIsBye && match.nextMatchId !== null) {
    // guard only
  }

  renderBracket();
}

  // Champions banner
  const gf2 = bracketState.matches.find(m => m.side === 'GF2');
  const gf = bracketState.matches.find(m => m.side === 'GF');
  const championObj = gf2?.winner || (bracketState.format === 'single' ? getLastMatch('W')?.winner : null) || (gf && !gf2 ? gf.winner : null);
  if (championObj) {
    const champName = (typeof championObj === 'string') ? championObj : (championObj?.name || String(championObj));
    const banner = document.createElement('div');
    banner.className = 'bracket-champion-banner';
    banner.innerHTML = `<div class="champ-label">🏆 Tournament Champion</div><div class="champ-name">${champName}</div>`;
    wrap.appendChild(banner);
  }

  // Render winners bracket
  renderSide(wrap, 'Winners Bracket', bracketState.matches.filter(m => m.side === 'W'));

  // Losers bracket
  if (bracketState.format !== 'single') {
    renderSide(wrap, 'Losers Bracket', bracketState.matches.filter(m => m.side === 'L'));

    // Grand finals
    const gfMatches = bracketState.matches.filter(m => m.side === 'GF' || m.side === 'GF2');
    if (gfMatches.length) renderSide(wrap, 'Grand Finals', gfMatches);
  }
}

// ── Render ────────────────────────────────────────────────────────────────────

function getLastMatch(side) {
  const ms = bracketState.matches.filter(m => m.side === side).sort((a, b) => b.round - a.round);
  return ms[0] || null;
}

function renderSide(wrap, label, matches) {
  const container = document.createElement('div');
  container.className = 'bracket-side';

  const lbl = document.createElement('div');
  lbl.className = 'bracket-label';
  lbl.textContent = label;
  container.appendChild(lbl);

  const roundsDiv = document.createElement('div');
  roundsDiv.className = 'bracket-rounds';

  // Group by round
  const byRound = {};
  matches.forEach(m => { (byRound[m.round] = byRound[m.round] || []).push(m); });
  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

  const roundNames = ['Round 1', 'Round 2', 'Quarterfinals', 'Semifinals', 'Finals', 'Championship'];

  rounds.forEach((rNum, ri) => {
    const col = document.createElement('div');
    col.className = 'bracket-round';

    const rLabel = rNum === 0 ? (byRound[rNum][0]?.side === 'GF2' ? 'If Necessary' : 'Grand Final')
      : (ri < roundNames.length ? roundNames[ri] : 'Round ' + rNum);
    col.innerHTML = `<div class="round-header">${rLabel}</div>`;

    byRound[rNum].forEach(match => {
      col.appendChild(buildMatchEl(match));
    });

    roundsDiv.appendChild(col);
  });

  container.appendChild(roundsDiv);
  wrap.appendChild(container);
}

function buildMatchEl(match) {
  const matchDiv = document.createElement('div');
  matchDiv.className = 'bracket-match';

  [1, 2].forEach((slot, idx) => {
    const player = slot === 1 ? match.p1 : match.p2;
    const isWinner = match.winner && match.winner === player;
    const isLoser = match.winner && match.loser === player;
    const isEmpty = !player;
    const playerName = (typeof player === 'string') ? player : (player && player.name);
    const isBye = playerName === 'BYE';

    const slotEl = document.createElement('div');
    let cls = 'bracket-slot';
    if (isEmpty) cls += ' empty';
    else if (isBye) cls += ' eliminated';
    else if (isWinner) cls += ' winner';
    else if (isLoser) cls += ' eliminated';
    else if (!match.winner && player) cls += ' clickable';

    slotEl.className = cls;

    const seedSpan = document.createElement('span');
    seedSpan.className = 'seed-num';
    const seedNum = (player && typeof player === 'object' && 'seed' in player) ? player.seed : null;
    seedSpan.textContent = seedNum || '';
    slotEl.appendChild(seedSpan);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = isEmpty ? '—' : (playerName || '—');
    if (isEmpty) nameSpan.style.color = '#333';
    slotEl.appendChild(nameSpan);

    // Click to pick winner (only if both players present and no winner yet)
    if (!isEmpty && !isBye && !match.winner && match.p1 && match.p2) {
      slotEl.addEventListener('click', () => pickWinner(match.id, player));
    }

    // Click winner to undo
    if (isWinner) {
      slotEl.title = 'Click to undo';
      slotEl.addEventListener('click', () => undoWinner(match.id));
    }

    matchDiv.appendChild(slotEl);

    if (idx === 0) {
      const div = document.createElement('div');
      div.className = 'bracket-divider';
      matchDiv.appendChild(div);
    }
  });

  return matchDiv;
}

function undoWinner(matchId) {
  const match = bracketState.matches.find(m => m.id === matchId);
  if (!match || !match.winner) return;

  const prevWinner = match.winner;
  const prevLoser = match.loser;

  // Remove from next match
  if (match.nextMatchId !== null) {
    const next = bracketState.matches.find(m => m.id === match.nextMatchId);
    if (next) {
      // Only clear if next match hasn't been played yet
      if (next.winner) { undoWinner(next.id); }
      if (match.nextSlot === 1) next.p1 = null;
      else next.p2 = null;
    }
  }

  // Remove loser from losers bracket
  if (match.loserMatchId !== null) {
    const lm = bracketState.matches.find(m => m.id === match.loserMatchId);
    if (lm) {
      if (lm.winner) { undoWinner(lm.id); }
      if (match.loserSlot === 1) lm.p1 = null;
      else lm.p2 = null;
    }
  }

  match.winner = null;
  match.loser = null;
  renderBracket();
}
