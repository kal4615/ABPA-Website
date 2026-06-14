const DEFAULT_PLAYERS = [
  {name:'SONNY',w:2,l:3,pts:10},{name:'RJ',w:1,l:4,pts:6},{name:'KEVIN',w:1,l:4,pts:4},
  {name:'ZACH',w:1,l:4,pts:3},{name:'RAY',w:0,l:2,pts:2},{name:'BRYCE',w:0,l:3,pts:2},
  {name:'COLLIN',w:0,l:4,pts:1},{name:'QUIN',w:0,l:5,pts:1},{name:'ANTONIO',w:0,l:5,pts:1}
];

let state = loadState();

function loadState() {
  try {
    const s = localStorage.getItem('abpa_state');
    if (s) return JSON.parse(s);
  } catch(e){}
  return {
    players: DEFAULT_PLAYERS.map(p=>({...p, appearances: p.w+p.l})),
    matches: [],
    season: { num: 3, name: 'ABPA League' },
    updatedAt: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
  };
}

function saveState() {
  state.updatedAt = new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  localStorage.setItem('abpa_state', JSON.stringify(state));
  toast('Saved!');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2500);
}

// NAVIGATION
document.querySelectorAll('.nav-links a').forEach(a=>{
  a.addEventListener('click', e=>{
    e.preventDefault();
    const pg = a.dataset.page;
    document.querySelectorAll('.nav-links a').forEach(x=>x.classList.remove('active'));
    a.classList.add('active');
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-'+pg).classList.add('active');
    render();
  });
});

// SORTING
function sortedPlayers() {
  return [...state.players].sort((a,b)=>{
    if(b.pts !== a.pts) return b.pts-a.pts;
    const awp = a.appearances>0 ? a.w/a.appearances : 0;
    const bwp = b.appearances>0 ? b.w/b.appearances : 0;
    return bwp-awp;
  });
}

function wp(p) {
  if(!p.appearances) return 0;
  return (p.w/p.appearances*100);
}

// RENDER ALL
function render() {
  renderHome();
  renderStandings();
  renderStats();
  renderAdmin();
  updateMatchSelects();
}

// HOME
function renderHome() {
  const sorted = sortedPlayers();
  document.getElementById('hero-date').textContent = state.updatedAt;
  document.getElementById('hs-players').textContent = state.players.length;
  const totalGames = state.matches.length;
  document.getElementById('hs-games').textContent = totalGames;
  document.getElementById('hs-leader').textContent = sorted.length ? sorted[0].name : '—';
  const top5 = sorted.slice(0,5);
  document.getElementById('home-top5').innerHTML = renderStandingsTable(top5, sorted);
}

function renderStandingsTable(list, allSorted) {
  return `<table class="standings-table">
    <thead><tr>
      <th>Rank</th><th>Player</th><th>A</th><th>W</th><th>L</th><th>WP%</th><th>Pts</th>
    </tr></thead>
    <tbody>
    ${list.map(p=>{
      const rank = allSorted.indexOf(p)+1;
      const cls = rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'';
      return `<tr class="${cls}">
        <td class="rank-cell">${rank}</td>
        <td><span class="player-name">${p.name}</span></td>
        <td>${p.appearances||0}</td>
        <td>${p.w}</td>
        <td>${p.l||0}</td>
        <td><span class="wp-cell">${wp(p).toFixed(1)}%</span></td>
        <td class="pts-cell">${p.pts}</td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>`;
}

// STANDINGS
function renderStandings() {
  const sorted = sortedPlayers();
  document.getElementById('standings-updated').textContent = '*Updated ' + state.updatedAt;
  document.getElementById('standings-body').innerHTML = sorted.map((p,i)=>{
    const rank = i+1;
    const cls = rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'';
    return `<tr class="${cls}">
      <td class="rank-cell">${rank}</td>
      <td><span class="player-name">${p.name}</span></td>
      <td>${p.appearances||0}</td>
      <td>${p.w}</td>
      <td>${p.l||0}</td>
      <td><span class="wp-cell">${wp(p).toFixed(1)}%</span></td>
      <td class="pts-cell">${p.pts}</td>
    </tr>`;
  }).join('');
}

// STATS
function renderStats() {
  const sorted = sortedPlayers();
  const byWP = [...state.players].filter(p=>p.appearances>1).sort((a,b)=>wp(b)-wp(a));
  const byWins = [...state.players].sort((a,b)=>b.w-a.w);
  const byApps = [...state.players].sort((a,b)=>(b.appearances||0)-(a.appearances||0));
  const maxWP = byWP[0] ? wp(byWP[0]) : 100;
  const maxW = byWins[0] ? byWins[0].w : 1;
  const maxA = byApps[0] ? byApps[0].appearances : 1;

  function leaderCard(title, list, valFn, barMaxFn, labelFn) {
    return `<div class="stat-card">
      <div class="stat-card-title">${title}</div>
      ${list.slice(0,5).map((p,i)=>`
        <div class="stat-leader">
          <div class="stat-rank-num">${i+1}</div>
          <div class="stat-leader-name">${p.name}</div>
          <div class="stat-bar-wrap"><div class="stat-bar" style="width:${(valFn(p)/barMaxFn()*100).toFixed(1)}%"></div></div>
          <div class="stat-val">${labelFn(p)}</div>
        </div>
      `).join('')}
    </div>`;
  }

  document.getElementById('stats-grid').innerHTML =
    leaderCard('Points Leaders', sorted, p=>p.pts, ()=>Math.max(sorted[0]?.pts||1,1), p=>p.pts+' pts') +
    leaderCard('Win% Leaders (min 2 games)', byWP, p=>wp(p), ()=>maxWP, p=>wp(p).toFixed(1)+'%') +
    leaderCard('Most Wins', byWins, p=>p.w, ()=>maxW, p=>p.w+' W') +
    leaderCard('Most Appearances', byApps, p=>p.appearances||0, ()=>maxA, p=>(p.appearances||0)+' G');
}

// ADMIN
function renderAdmin() {
  const pl = document.getElementById('player-list');
  pl.innerHTML = state.players.map((p,i)=>`
    <li>
      <span class="pill">${p.w}-${p.l||0}</span>
      <span>${p.name}</span>
      <span style="color:var(--gold);font-size:0.8rem;margin-left:4px;">${p.pts} pts</span>
      <button class="edit-btn" data-i="${i}">✎ Edit</button>
      <button class="del" data-i="${i}">✕</button>
    </li>
  `).join('');
  pl.querySelectorAll('.del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      state.players.splice(+btn.dataset.i, 1);
      saveState(); render();
    });
  });
  pl.querySelectorAll('.edit-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>openEditModal(+btn.dataset.i));
  });

  const rr = document.getElementById('recent-results');
  const recent = [...state.matches].reverse().slice(0,10);
  rr.innerHTML = recent.length ? recent.map(m=>`
    <li>
      <span class="pill">W</span>
      <span style="color:var(--gold)">${m.winner}</span>
      <span style="color:var(--gray);font-size:0.8rem;margin:0 4px">def.</span>
      <span>${m.loser}</span>
      <span style="margin-left:auto;font-size:0.7rem;color:var(--gray)">${m.date||''}</span>
    </li>
  `).join('') : '<li style="color:var(--gray);font-size:0.85rem;">No results yet</li>';

  const sn = document.getElementById('season-num');
  const snm = document.getElementById('season-name');
  if(sn) sn.value = state.season.num;
  if(snm) snm.value = state.season.name;
}

function updateMatchSelects() {
  const opts = state.players.map(p=>`<option value="${p.name}">${p.name}</option>`).join('');
  const w = document.getElementById('match-winner');
  const l = document.getElementById('match-loser');
  if(w) w.innerHTML = opts;
  if(l) l.innerHTML = opts;
  const md = document.getElementById('match-date');
  if(md && !md.value) md.value = new Date().toISOString().slice(0,10);
}

// EVENTS
document.getElementById('btn-add-player').addEventListener('click', ()=>{
  const name = document.getElementById('new-player-name').value.trim().toUpperCase();
  if(!name) return;
  if(state.players.find(p=>p.name===name)){ toast('Player exists!'); return; }
  state.players.push({name, w:0, l:0, appearances:0, pts:0});
  document.getElementById('new-player-name').value='';
  saveState(); render();
});

document.getElementById('btn-log-match').addEventListener('click', ()=>{
  const w = document.getElementById('match-winner').value;
  const l = document.getElementById('match-loser').value;
  const d = document.getElementById('match-date').value;
  if(w===l){ toast('Select different players!'); return; }
  const pw = state.players.find(p=>p.name===w);
  const pl = state.players.find(p=>p.name===l);
  if(!pw||!pl) return;
  pw.w=(pw.w||0)+1; pw.appearances=(pw.appearances||0)+1;
  pl.l=(pl.l||0)+1; pl.appearances=(pl.appearances||0)+1;
  pw.pts = calcPts(pw);
  pl.pts = calcPts(pl);
  state.matches.push({winner:w,loser:l,date:d});
  saveState(); render();
});

function calcPts(p) {
  // 2pts per win, 1pt per app over 3
  return (p.w*2) + Math.max(0, (p.appearances||0)-3);
}

document.getElementById('btn-save-season').addEventListener('click', ()=>{
  state.season.num = +document.getElementById('season-num').value;
  state.season.name = document.getElementById('season-name').value.trim();
  saveState(); render();
});

document.getElementById('btn-reset').addEventListener('click', ()=>{
  if(confirm('Reset ALL league data? This cannot be undone.')) {
    localStorage.removeItem('abpa_state');
    state = loadState();
    render();
    toast('Data reset!');
  }
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
    playersArr = sorted.map((p, i) => ({ name: p.name, seed: i + 1, wins: 0, losses: 0 }));
  } else {
    playersArr = state.players.map((p, i) => ({ name: p.name, seed: i + 1, wins: 0, losses: 0 }));
    for (let i = playersArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [playersArr[i], playersArr[j]] = [playersArr[j], playersArr[i]];
    }
  }

  while (playersArr.length < numPlayers) playersArr.push({ name: 'TBD', seed: null, wins: 0, losses: 0 });
  playersArr = playersArr.slice(0, numPlayers);
  const size = nextPow2(numPlayers);
  while (playersArr.length < size) playersArr.push({ name: 'BYE', seed: null, wins: 0, losses: 0 });

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
  const seededPlayers = order.map(pos => (playersArr[pos - 1] || { name: 'BYE', seed: null, wins: 0, losses: 0 }));

  bracketState = buildBracketState(seededPlayers, format);
  settleByeMatches();
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
    assignMatchNumbers(matches, format);
    return { format, matches, players };
  }

  const lRounds = buildLosersMatches(players.length, id);
  id = lRounds.nextId;
  matches.push(...lRounds.matches);

  wireSide(matches, 'W');
  wireLosersSide(matches);

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
  assignMatchNumbers(matches, format);

  return { format, matches, players };
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

function buildLosersMatches(size, startId) {
  const matches = [];
  let id = startId;
  const winnersRounds = Math.log2(size);
  const losersRounds = Math.max(1, (winnersRounds - 1) * 2);

  for (let round = 1; round <= losersRounds; round++) {
    const divisor = Math.pow(2, Math.floor((round + 1) / 2) + 1);
    const matchCount = Math.max(1, size / divisor);

    for (let i = 0; i < matchCount; i++) {
      matches.push({
        id: id++,
        round,
        side: 'L',
        p1: null,
        p2: null,
        winner: null,
        loser: null,
        nextMatchId: null,
        nextSlot: null,
        loserMatchId: null,
        loserSlot: null
      });
    }
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

function wireLosersSide(matches) {
  const lByRound = groupMatchesByRound(matches.filter(m => m.side === 'L'));
  const rounds = Object.keys(lByRound).map(Number).sort((a, b) => a - b);

  for (let ri = 0; ri < rounds.length - 1; ri++) {
    const cur = lByRound[rounds[ri]];
    const nxt = lByRound[rounds[ri + 1]];
    const keepsSameCount = cur.length === nxt.length;

    cur.forEach((m, i) => {
      const nextMatch = keepsSameCount ? nxt[i] : nxt[Math.floor(i / 2)];
      m.nextMatchId = nextMatch.id;
      m.nextSlot = keepsSameCount ? 1 : ((i % 2) + 1);
    });
  }
}

function wireWinnersToLosers(matches, size) {
  // W round 1 losers → L round 1
  // W round 2+ losers → corresponding L rounds
  const wByRound = groupMatchesByRound(matches.filter(m => m.side === 'W'));
  const lByRound = groupMatchesByRound(matches.filter(m => m.side === 'L'));

  const wRounds = Object.keys(wByRound).map(Number).sort((a, b) => a - b);

  // R1 W losers → L R1 (pairs)
  const wR1 = wByRound[wRounds[0]] || [];
  const lR1 = lByRound[1] || [];
  wR1.forEach((m, i) => {
    const lm = lR1[Math.floor(i / 2)];
    if (lm) {
      m.loserMatchId = lm.id;
      m.loserSlot = (i % 2 === 0) ? 1 : 2;
    }
  });

  // Subsequent W rounds → L rounds (interleaved)
  for (let wRound = 2; wRound <= wRounds[wRounds.length - 1]; wRound++) {
    const targetRound = (wRound - 1) * 2;
    const wMatches = wByRound[wRound] || [];
    const lMatches = lByRound[targetRound] || [];

    wMatches.forEach((m, i) => {
      const lm = lMatches[i];
      if (lm) {
        m.loserMatchId = lm.id;
        m.loserSlot = 2;
      }
    });
  }
}

// ── Pick winner ───────────────────────────────────────────────────────────────

function groupMatchesByRound(matches) {
  return matches.reduce((acc, match) => {
    (acc[match.round] = acc[match.round] || []).push(match);
    return acc;
  }, {});
}

function assignMatchNumbers(matches, format) {
  const ordered = [];
  const addRound = (side, round) => {
    matches
      .filter(m => m.side === side && m.round === round)
      .sort((a, b) => a.id - b.id)
      .forEach(m => ordered.push(m));
  };

  const wRounds = Object.keys(groupMatchesByRound(matches.filter(m => m.side === 'W')))
    .map(Number)
    .sort((a, b) => a - b);

  if (format === 'single') {
    wRounds.forEach(round => addRound('W', round));
  } else {
    wRounds.forEach((round, index) => {
      addRound('W', round);

      if (index === 0) {
        addRound('L', 1);
      } else if (index === wRounds.length - 1) {
        addRound('L', (round - 1) * 2);
      } else {
        addRound('L', (round - 1) * 2);
        addRound('L', (round - 1) * 2 + 1);
      }
    });

    matches
      .filter(m => m.side === 'GF' || m.side === 'GF2')
      .sort((a, b) => a.id - b.id)
      .forEach(m => ordered.push(m));
  }

  const seen = new Set();
  ordered.forEach(match => {
    if (!seen.has(match.id)) {
      seen.add(match.id);
      match.matchNo = seen.size;
    }
  });
  matches
    .filter(match => !seen.has(match.id))
    .sort((a, b) => a.id - b.id)
    .forEach(match => {
      seen.add(match.id);
      match.matchNo = seen.size;
    });
}

function isByePlayer(player) {
  return (typeof player === 'string') ? player === 'BYE' : player?.name === 'BYE';
}

function countTournamentRecord(match, winner, loser, delta) {
  if (!winner || !loser || isByePlayer(winner) || isByePlayer(loser)) return;
  if (typeof winner === 'object') winner.wins = Math.max(0, (winner.wins || 0) + delta);
  if (typeof loser === 'object') loser.losses = Math.max(0, (loser.losses || 0) + delta);
  match.countsRecord = delta > 0;
}

function playerDisplayName(player) {
  if (!player) return '-';
  const name = typeof player === 'string' ? player : player.name;
  if (!player || typeof player !== 'object' || isByePlayer(player)) return name || '-';
  return `${name || '-'} (${player.wins || 0} - ${player.losses || 0})`;
}

function placePlayerInMatch(matchId, slot, player) {
  const target = bracketState.matches.find(m => m.id === matchId);
  if (!target) return;
  if (slot === 1) target.p1 = player;
  else target.p2 = player;
}

function settleByeMatches() {
  if (!bracketState) return;

  let changed = true;
  while (changed) {
    changed = false;

    bracketState.matches.forEach(match => {
      if (match.winner || !match.p1 || !match.p2) return;

      const p1Bye = isByePlayer(match.p1);
      const p2Bye = isByePlayer(match.p2);
      if (!p1Bye && !p2Bye) return;

      const winner = p1Bye && !p2Bye ? match.p2 : match.p1;
      const loser = winner === match.p1 ? match.p2 : match.p1;

      match.winner = winner;
      match.loser = loser;

      if (match.nextMatchId !== null && match.side !== 'GF') {
        placePlayerInMatch(match.nextMatchId, match.nextSlot, winner);
      }

      if (match.loserMatchId !== null && loser) {
        placePlayerInMatch(match.loserMatchId, match.loserSlot, loser);
      }

      changed = true;
    });
  }
}

function pickWinner(matchId, winner) {
  const match = bracketState.matches.find(m => m.id === matchId);
  if (!match || match.winner) return; // already decided
  const loser = winner === match.p1 ? match.p2 : match.p1;
  match.winner = winner;
  match.loser = loser;
  countTournamentRecord(match, winner, loser, 1);

  // Advance winner to next match
  if (match.nextMatchId !== null && match.side !== 'GF') {
    const next = bracketState.matches.find(m => m.id === match.nextMatchId);
    if (next) {
      if (match.nextSlot === 1) next.p1 = winner;
      else next.p2 = winner;
    }
  }

  // Send loser to losers bracket (double/triple)
  if (loser && typeof loser === 'object') {
    const maxLosses = bracketState.format === 'triple' ? 3 : 2;
    if (loser.losses < maxLosses) {
      // If this was the Grand Final and opponent still has remaining lives, put them into GF2
      if (match.side === 'GF') {
        const gf2 = bracketState.matches.find(m => m.side === 'GF2');
        if (gf2) {
          gf2.p1 = winner;
          gf2.p2 = loser;
          settleByeMatches();
          renderBracket();
          return;
        }
      }

      // Prefer using pre-wired loserMatchId (maps a W-match's loser into the correct L round/slot)
      if (match.loserMatchId !== null) {
        const target = bracketState.matches.find(m => m.id === match.loserMatchId);
        if (target) {
          let placed = false;
          // try the intended slot first, then the opposite slot
          if (match.loserSlot === 1) {
            if (!target.p1) { target.p1 = loser; placed = true; }
            else if (!target.p2) { target.p2 = loser; placed = true; }
          } else {
            if (!target.p2) { target.p2 = loser; placed = true; }
            else if (!target.p1) { target.p1 = loser; placed = true; }
          }

          // if intended match is full, try other matches in the same L round
          if (!placed) {
            const sameRound = bracketState.matches.filter(m => m.side === 'L' && m.round === target.round);
            for (const lm of sameRound) {
              if (!lm.p1) { lm.p1 = loser; placed = true; break; }
              if (!lm.p2) { lm.p2 = loser; placed = true; break; }
            }
          }

          // fallback to first available anywhere in L bracket
          if (!placed) {
            const allL = bracketState.matches.filter(m => m.side === 'L').sort((a,b)=>a.id-b.id);
            for (const lm of allL) {
              if (!lm.p1) { lm.p1 = loser; placed = true; break; }
              if (!lm.p2) { lm.p2 = loser; placed = true; break; }
            }
          }

          settleByeMatches();
          renderBracket();
          return;
        }
      }

      // If no wiring available, place into first available L slot (fallback)
      const lMatches = bracketState.matches.filter(m => m.side === 'L').sort((a,b)=>a.id-b.id);
      let placed = false;
      for (const lm of lMatches) {
        if (!lm.p1) { lm.p1 = loser; placed = true; break; }
        if (!lm.p2) { lm.p2 = loser; placed = true; break; }
      }
      if (!placed) {
        const gf = bracketState.matches.find(m => m.side === 'GF');
        if (gf && !gf.p2) gf.p2 = loser;
      }
    } else {
      // eliminated; do nothing (they're out)
    }
  }

  // BYE auto-advance guard (winner may be object or string)
  const winnerIsBye = (typeof winner === 'string') ? winner === 'BYE' : (winner && winner.name === 'BYE');
  if (winnerIsBye && match.nextMatchId !== null) {
    // guard only
  }

  settleByeMatches();
  renderBracket();
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderBracket() {
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
      m.winner = null; m.loser = null; m.countsRecord = false;
      if (m.side !== 'W' || m.round !== 1) { m.p1 = null; m.p2 = null; }
    });
    (bracketState.players || []).forEach(player => {
      if (player) {
        player.wins = 0;
        player.losses = 0;
      }
    });
    // restore original R1 players (they never change)
    settleByeMatches();
    renderBracket();
    toast('Results cleared!');
  });

  // Champions banner
  const gf2 = bracketState.matches.find(m => m.side === 'GF2');
  const gf = bracketState.matches.find(m => m.side === 'GF');
  const maxLosses = bracketState.format === 'triple' ? 3 : 2;
  let championObj = null;
  if (bracketState.format === 'single') championObj = getLastMatch('W')?.winner || null;
  else if (gf2 && gf2.winner) championObj = gf2.winner;
  else if (gf && gf.winner && gf.loser) {
    const loserLosses = typeof gf.loser === 'object' ? (gf.loser.losses || 0) : maxLosses;
    if (loserLosses >= maxLosses) championObj = gf.winner;
  }

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

  const matchNo = document.createElement('div');
  matchNo.className = 'bracket-match-no';
  matchNo.textContent = `Match ${match.matchNo || match.id + 1}`;
  matchDiv.appendChild(matchNo);

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
    if (!isEmpty) nameSpan.textContent = playerDisplayName(player);
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

  if (match.loserMatchId !== null) {
    const target = bracketState.matches.find(m => m.id === match.loserMatchId);
    if (target) {
      if (target.winner) { undoWinner(target.id); }
      if (match.loserSlot === 1) target.p1 = null;
      else target.p2 = null;
    }
  }

  if (match.side === 'GF') {
    const gf2 = bracketState.matches.find(m => m.side === 'GF2');
    if (gf2) {
      if (gf2.winner) { undoWinner(gf2.id); }
      if (gf2.p1 === prevWinner) gf2.p1 = null;
      if (gf2.p2 === prevWinner) gf2.p2 = null;
      if (gf2.p1 === prevLoser) gf2.p1 = null;
      if (gf2.p2 === prevLoser) gf2.p2 = null;
    }
  }

  if (match.countsRecord) countTournamentRecord(match, prevWinner, prevLoser, -1);

  match.winner = null;
  match.loser = null;
  renderBracket();
}

// ── EDIT PLAYER MODAL
let editingIndex = -1;

function openEditModal(i) {
  const p = state.players[i];
  editingIndex = i;
  document.getElementById('edit-modal-name').textContent = p.name;
  document.getElementById('edit-w').value = p.w || 0;
  document.getElementById('edit-l').value = p.l || 0;
  document.getElementById('edit-a').value = p.appearances || 0;
  document.getElementById('edit-pts').value = p.pts || 0;
  document.getElementById('edit-modal').classList.add('open');
  document.getElementById('edit-w').focus();
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('open');
  editingIndex = -1;
}

document.getElementById('edit-cancel').addEventListener('click', closeEditModal);

document.getElementById('edit-modal').addEventListener('click', e=>{
  if(e.target === document.getElementById('edit-modal')) closeEditModal();
});

document.getElementById('edit-save').addEventListener('click', ()=>{
  if(editingIndex < 0) return;
  const p = state.players[editingIndex];
  const w = Math.max(0, parseInt(document.getElementById('edit-w').value)||0);
  const l = Math.max(0, parseInt(document.getElementById('edit-l').value)||0);
  const a = Math.max(w+l, parseInt(document.getElementById('edit-a').value)||0);
  const pts = Math.max(0, parseInt(document.getElementById('edit-pts').value)||0);
  p.w = w;
  p.l = l;
  p.appearances = a;
  p.pts = pts;
  closeEditModal();
  saveState();
  render();
});

// Allow Enter key to save
document.getElementById('edit-modal').addEventListener('keydown', e=>{
  if(e.key === 'Escape') closeEditModal();
  if(e.key === 'Enter') document.getElementById('edit-save').click();
});

// INIT
render();
