export function renderAdmin(){
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

export function updateMatchSelects() {
  const opts = state.players.map(p=>`<option value="${p.name}">${p.name}</option>`).join('');
  const w = document.getElementById('match-winner');
  const l = document.getElementById('match-loser');
  if(w) w.innerHTML = opts;
  if(l) l.innerHTML = opts;
  const md = document.getElementById('match-date');
  if(md && !md.value) md.value = new Date().toISOString().slice(0,10);
}