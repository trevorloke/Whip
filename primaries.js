'use strict';
/* =====================================================================
   PRIMARIES — presidential primaries, state by state, with ranked
   endorsements, both parties' races, challenged incumbents and the
   nominees. Loaded after world.js; conventions follow in convention.js.
   ===================================================================== */

/* ---------------- presidential primaries ---------------- */
const PRIMARY_CAL = [['Iowa', ['IA']], ['New Hampshire', ['NH']], ['Nevada', ['NV']], ['South Carolina', ['SC']], ['Super Tuesday', ['AL', 'AR', 'CA', 'CO', 'ME', 'MA', 'MN', 'NC', 'OK', 'TN', 'TX', 'UT', 'VT', 'VA']], ['Mid-March', ['GA', 'MS', 'WA', 'MI', 'MO']], ['St. Patrick\'s Day', ['AZ', 'FL', 'IL', 'KS', 'OH', 'LA']], ['April', ['CT', 'DE', 'MD', 'NY', 'PA', 'RI', 'WI', 'HI', 'AK', 'WY']], ['May', ['IN', 'NE', 'WV', 'KY', 'OR', 'ID']], ['June', ['MT', 'NJ', 'NM', 'SD', 'ND', 'DC']]];
const CAND_COLORS = ['#f59e0b', '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fb7185', '#facc15'];
function primaryField(party, withIncumbent) {
  const P = S.president, field = [];
  const add = (p, office, ref, extra = {}) => { if (p && !field.some(f => f.name === p.name)) field.push({ name: p.name, p, office, ref, party, faction: p.faction || pick(FACTIONS[party])[0], state: p.state, charisma: rnd(0.75, 1.3), money: rnd(0.8, 1.2), del: 0, wins: 0, active: true, color: CAND_COLORS[field.length % CAND_COLORS.length], ...extra }); };
  // a sitting President facing a challenge: strength rides on approval, and on how much they've been undermined
  if (withIncumbent) add(P, 'President of the United States', { type: 'pres' }, { charisma: clamp(1.1 + (P.approval - 50) / 45 - (party === S.side ? (S.undermine || 0) * 0.06 : 0), 0.45, 1.5), money: 1.35, incumbent: true });
  else if (P.party === party && S.vp) add(S.vp, 'Vice President', { type: 'vp' });
  const sens = shuffle(S.members.filter(m => m.party === party)).sort((a, b) => (T(b, 'ambitious') ? 1 : 0) - (T(a, 'ambitious') ? 1 : 0)).slice(0, 2 + ri(0, 1));
  sens.forEach(m => add(m, `Senator from ${ST[m.state].name}`, { type: 'sen', id: m.id }));
  shuffle(Object.keys(S.governors).filter(c => S.governors[c].party === party)).slice(0, 2).forEach(c => add(S.governors[c], `Governor of ${ST[c].name}`, { type: 'gov', code: c }));
  if (P.party === party && !withIncumbent) { const post = pick(CABINET_POSTS.slice(0, 4))[0]; if (S.cabinet[post]) add(S.cabinet[post], CABINET_POSTS.find(c => c[0] === post)[1], { type: 'cab', post }); }
  const rep = pick((S.reps || []).filter(r => r.party === party)); if (rep) add(rep, `Representative (${rep.district})`, { type: 'rep' });
  return field.slice(0, withIncumbent ? 4 : 6);
}
function contestShares(field, states, endorsed) {
  const res = {}, end = typeof endorsed === 'function' ? endorsed() : endorsed;
  for (const code of states) {
    const act = field.filter(f => f.active);
    const raw = act.map(f => {
      const fx = (FACTIONS[f.party].find(x => x[0] === f.faction) || [0, {}])[1];
      let fit = 0; if (ST[code]) for (const t of TAGS) fit += (fx[t] || 0) * ST[code].voter[t] * 0.08;
      return Math.max(0.05, f.charisma * f.money * (1 + fit) * (f.state === code ? 1.6 : 1) * (1 + f.wins * 0.06) * (end && end === f.name ? 1.15 : 1) * rnd(0.75, 1.25));
    });
    const tot = raw.reduce((a, b) => a + b, 0);
    res[code] = act.map((f, i) => ({ f, pct: raw[i] / tot * 100 })).sort((a, b) => b.pct - a.pct);
  }
  return res;
}
function primaryPoll(field, endorsed) {
  const act = field.filter(f => f.active); if (!act.length) return {};
  const tot = {}; act.forEach(f => tot[f.name] = 0);
  const r = contestShares(field, Object.keys(EV), endorsed);
  let w = 0;
  for (const [code, rows] of Object.entries(r)) { const ev = EV[code] || 3; w += ev; rows.forEach(x => tot[x.f.name] += x.pct * ev); }
  const undecided = Math.max(4, 14 - field.reduce((a, f) => a + f.wins, 0));
  const out = {}; for (const f of act) out[f.name] = tot[f.name] / w * (100 - undecided) / 100;
  out._undecided = undecided;
  return out;
}
function runPrimaryFor(party, endorsed, withIncumbent) {
  const field = primaryField(party, withIncumbent), results = {}, totalDel = Object.values(EV).reduce((a, b) => a + b, 0) * 10, need = Math.floor(totalDel / 2) + 1;
  let i = 0;
  const endName = () => typeof endorsed === 'function' ? endorsed() : endorsed;
  const nextContest = () => {
    if (i >= PRIMARY_CAL.length) return false;
    const [label, states] = PRIMARY_CAL[i++];
    const r = contestShares(field, states, endorsed);
    for (const code of states) {
      results[code] = r[code];
      const del = (EV[code] || 3) * 10, elig = r[code].filter(x => x.pct >= 15), et = elig.reduce((a, b) => a + b.pct, 0) || 1;
      elig.forEach(x => x.f.del += Math.round(del * x.pct / et));
      r[code][0].f.wins++;
    }
    // weak candidates drop out after the early states (a sitting President never quits)
    if (i >= 4) { const act = field.filter(f => f.active).sort((a, b) => b.del - a.del); act.slice(2).forEach(f => { if (f.del < act[0].del * 0.25 && f.name !== endName() && !f.incumbent) { f.active = false; f.out = label; } }); }
    if (i >= 6) { const act = field.filter(f => f.active).sort((a, b) => b.del - a.del); act.slice(2).forEach(f => { if (!f.incumbent) { f.active = false; f.out = f.out || label; } }); }
    return label;
  };
  return { party, field, results, need, totalDel, nextContest, done: () => i >= PRIMARY_CAL.length || field.some(f => f.del >= need) };
}
function primariesModal(done) {
  const P = S.president, year = billYear(S.career.bills + 1), mine = S.side, theirs = other(mine);
  const running = P.terms < 2;
  // does each party have a real contest? An incumbent only faces one if challenged or badly weakened.
  const contest = {}, challenged = {};
  for (const p of ['D', 'R']) {
    if (P.party !== p || !running) { contest[p] = true; continue; }
    challenged[p] = p === mine ? !!S.challenger || (P.approval < 40 && Math.random() < 0.5) : P.approval < 37 && Math.random() < 0.5;
    contest[p] = challenged[p];
  }
  let ranking = [], rankPaid = false, lastLabel = '', view = contest[mine] ? mine : theirs;
  const state = {};
  const R0 = () => state[mine];
  const topRanked = () => { const R = R0(); if (!R) return null; return ranking.find(n => { const f = R.field.find(x => x.name === n); return f && f.active; }) || null; };
  for (const p of ['D', 'R']) state[p] = contest[p] ? runPrimaryFor(p, p === mine ? topRanked : null, !!challenged[p]) : null;
  const allDone = () => ['D', 'R'].every(p => !state[p] || state[p].done());
  const step = () => { let lbl = null; for (const p of ['D', 'R']) if (state[p] && !state[p].done()) lbl = state[p].nextContest() || lbl; if (!lbl) { const i = PRIMARY_CAL.findIndex(c => c[0] === lastLabel); lbl = PRIMARY_CAL[Math.min(PRIMARY_CAL.length - 1, i + 1)][0]; } lastLabel = lbl; for (const p of ['D', 'R']) if (state[p]) state[p].poll = null; };
  const finishAll = () => {
    while (!allDone()) step();
    S.nominees = {};
    const lines = [];
    for (const p of ['D', 'R']) {
      let nom, office, charisma = 1.05;
      if (!state[p]) { nom = P; office = 'President'; hist(P, 'Renominated for President without serious opposition'); }
      else {
        const f = state[p].field.slice().sort((a, b) => b.del - a.del)[0]; nom = f.p; office = f.office; charisma = f.charisma;
        if (f.incumbent) { hist(P, `Survived a primary challenge to win renomination`); lines.push(`${presTitle()} beat back a primary challenge in the ${PARTY[p].name} race.`); }
        else {
          hist(f.p, `Won the ${year} ${PARTY[p].name} presidential nomination`);
          if (challenged[p]) { hist(P, `Lost the ${year} ${PARTY[p].name} primary to ${f.name}`); lines.push(`<b>A sitting President falls:</b> ${presTitle()} loses the ${PARTY[p].name} nomination to ${f.name}.`); }
        }
        state[p].field.filter(x => x !== f && !x.incumbent).forEach(x => hist(x.p, `Ran for President in ${year}; lost the nomination`));
        if (p === mine && ranking.length) {
          const pos = ranking.indexOf(f.name);
          if (pos === 0) { S.career.capital += 3; addLegacy(5); lines.push(`Your first choice, ${f.name}, won the nomination (+3 capital).`); }
          else if (pos > 0) { S.career.capital += 3 - pos; lines.push(`Your #${pos + 1} choice, ${f.name}, won the nomination (+${3 - pos} capital).`); }
          else { S.career.capital = Math.max(0, S.career.capital - 1); lines.push(`None of the candidates you ranked won (−1 capital).`); }
        }
      }
      const vpPick = shuffle(S.members.filter(m => m.party === p && Math.abs(ST[m.state].lean) <= 6 && m.name !== nom.name))[0] || S.members.find(m => m.party === p && m.name !== nom.name);
      S.nominees[p] = { p: nom, name: nom.name, state: nom.state, faction: nom.faction, office, charisma, vp: vpPick ? { name: vpPick.name, state: vpPick.state, id: vpPick.id } : null };
      if (vpPick) hist(vpPick, `Chosen as ${nom.name}'s running mate`);
    }
    S.challenger = false; S.undermine = 0;
    const n = S.nominees;
    const showConvention = () => { showModal(`${frontPage({ headline: `IT'S ${lastName(n.D.p).toUpperCase()} VS. ${lastName(n.R.p).toUpperCase()}`, sub: `The ${year} presidential matchup is set.`, body: [`Democrats nominate ${n.D.name} (${n.D.office}), with ${n.D.vp ? n.D.vp.name : 'a running mate TBD'} on the ticket.`, `Republicans nominate ${n.R.name} (${n.R.office}), with ${n.R.vp ? n.R.vp.name : 'a running mate TBD'}.`, ...lines, ranking.length || !contest[mine] ? '' : 'You stayed neutral in your party\'s primary.'].filter(Boolean), mood: 'dawn', date: `Summer ${year} · Convention edition` })}
      <div class="choices"><button class="btn ghost" id="nprof1">Profile: ${n.D.name}</button><button class="btn ghost" id="nprof2">Profile: ${n.R.name}</button><button class="btn primary big" id="primdone">On with the session</button></div>`);
      $('#nprof1').onclick = () => profileModal(n.D.p, 'Democratic nominee', showConvention);
      $('#nprof2').onclick = () => profileModal(n.R.p, 'Republican nominee', showConvention);
      $('#primdone').onclick = done; };
    showConvention();
  };
  const draw = () => {
    const R = state[view], yours = view === mine;
    const tabs = `<div class="ptabs">${[mine, theirs].map(p => `<button class="btn ${view === p ? 'on' : ''}" data-pview="${p}" style="border-color:${PARTY[p].color}">${PARTY[p].name}s${p === mine ? ' (your party)' : ' (watch only)'}</button>`).join('')}</div>`;
    const lastIdx = PRIMARY_CAL.findIndex(c => c[0] === lastLabel);
    const nextLabel = PRIMARY_CAL[lastIdx + 1] ? PRIMARY_CAL[lastIdx + 1][0] : null;
    const controls = `<div class="choices">${allDone() ? '<button class="btn primary big" id="pfin">See the nominees</button>' : `<button class="btn primary big" id="pnext">Next: ${nextLabel || 'final contests'} ▶</button><button class="btn ghost" id="pskip">Skip to the end</button>`}</div>`;
    if (!R) {
      showModal(`<div class="kicker">${year} · Presidential primaries</div><h2>${PARTY[view].name} primary</h2>${tabs}
        <div class="race"><span class="nomp">${portrait(P)}</span><span>${presTitle()} is running for re-election with no serious challenge${view === mine ? '. To change that, you\'d have to undermine the President and recruit a challenger from the whip\'s office before primary season.' : '.'}</span></div>${controls}`);
    } else {
      const field = R.field.slice().sort((a, b) => b.del - a.del);
      const poll = R.poll || (R.poll = primaryPoll(R.field, yours ? topRanked : null));
      const lastStates = lastIdx >= 0 ? PRIMARY_CAL[lastIdx][1] : [];
      const resultRows = codes => codes.filter(c => R.results[c]).map(c => `<div class="prow"><b>${stName(c)}</b><span>${R.results[c].slice(0, 3).map((x, i) => `<span style="color:${x.f.color}">${i === 0 ? '✓ ' : ''}${lastName(x.f.p)} ${x.pct.toFixed(0)}%</span>`).join(' · ')}</span></div>`).join('');
      const decided = PRIMARY_CAL.slice(0, lastIdx + 1);
      const mapHTML = usMap({
        fill: code => { const r = R.results[code]; return r ? { c: r[0].f.color, op: 0.5 + Math.min(0.5, (r[0].pct - (r[1] ? r[1].pct : 0)) / 30) } : null; },
        sub: code => R.results[code] ? lastName(R.results[code][0].f.p).slice(0, 6) : '',
        title: code => R.results[code] ? `${stName(code)}: ${R.results[code].map(x => `${lastName(x.f.p)} ${x.pct.toFixed(0)}%`).join(', ')}` : stName(code),
      });
      const top = yours ? topRanked() : null, started = lastLabel !== '', cost = started ? 1 : 0;
      const intro = yours
        ? `<p>${R.need.toLocaleString()} delegates to win. <b>Rank up to three candidates.</b> Your endorsement goes to your highest-ranked candidate still in the race and moves down your list automatically if they drop out. If your #1 wins the nomination you get +3 capital, #2 +2, #3 +1; if none of them wins, −1. ${started ? 'Changing your ranking now costs 1 capital.' : 'Rank freely until Iowa votes.'}${challenged[view] ? ` <b style="color:var(--gold2)">${presTitle()} is facing a primary challenge.</b>` : ''}</p>
           <div class="rankbar">Your ranking: ${ranking.length ? ranking.map((n, i) => { const f = R.field.find(x => x.name === n); return `<span class="rk ${f && f.active ? '' : 'gone'}" style="border-color:${f ? f.color : '#666'}">#${i + 1} ${n}${f && !f.active ? ' (out)' : ''}${n === top ? ' ★' : ''}</span>`; }).join('') : '<i style="color:var(--dim)">none yet</i>'}${ranking.length ? `<button class="btn ghost" id="rkclear" ${S.career.capital < cost ? 'disabled' : ''}>Clear${cost ? ' (1 cap)' : ''}</button>` : ''}</div>`
        : `<p>${R.need.toLocaleString()} delegates to win. You're watching from across the aisle${challenged[view] ? `, and ${presTitle()} is fighting off a primary challenge` : ''}.</p>`;
      showModal(`<div class="kicker">${year} · Presidential primaries</div><h2>${lastLabel ? `After ${lastLabel}` : 'The Field'}</h2>${tabs}${intro}
        <div class="pollbox"><b>📊 National ${PARTY[view].name} primary poll</b>${field.filter(f => f.active).sort((a, b) => (poll[b.name] || 0) - (poll[a.name] || 0)).map(f => `<div class="salrow"><span style="color:${f.color};font-weight:700">${f.name}</span><span class="mbar"><i style="width:${Math.min(100, (poll[f.name] || 0) * 2)}%;background:${f.color}"></i></span><b>${(poll[f.name] || 0).toFixed(0)}%</b></div>`).join('')}<small style="color:var(--dim)">Undecided ${poll._undecided}% · polls move with wins and momentum</small></div>
        <div class="cands">${field.map(f => { const idx = R.field.indexOf(f), rk = ranking.indexOf(f.name); return `<div class="cand2 ${f.active ? '' : 'out'}"><span class="cp">${portrait(f.p)}</span><span style="flex:1"><b style="color:${f.color}">${f.name}</b> <small>· ${f.office} · ${f.faction}${f.active ? '' : ` · dropped out after ${f.out}`}</small>
          <div class="dbar"><i style="width:${Math.min(100, f.del / R.need * 100)}%;background:${f.color}"></i></div><small>${f.del.toLocaleString()} delegates · ${f.wins} state${f.wins === 1 ? '' : 's'} won${f.active ? ` · polling ${(poll[f.name] || 0).toFixed(0)}%` : ''}${yours && rk >= 0 ? ` · <b style="color:var(--gold2)">your #${rk + 1}${f.name === top ? ', getting your endorsement' : ''}</b>` : ''}</small></span>
          <span style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><a href="#" data-cprof="${idx}">profile</a>${yours && f.active && rk < 0 && ranking.length < 3 ? `<button class="btn" data-rank="${idx}" ${S.career.capital < cost ? 'disabled' : ''}>Rank #${ranking.length + 1}${cost ? ' (1 cap)' : ''}</button>` : ''}${yours && rk >= 0 ? `<button class="btn ghost" data-unrank="${idx}" ${S.career.capital < cost ? 'disabled' : ''}>Unrank${cost ? ' (1 cap)' : ''}</button>` : ''}</span></div>`; }).join('')}</div>
        ${lastStates.length ? `<div class="presults"><b>🗳️ ${lastLabel} results</b>${resultRows(lastStates) || '<div class="prow">No contests for this party this round.</div>'}</div>` : '<p style="color:var(--dim)">No votes cast yet. Iowa is first.</p>'}
        <div class="campmap">${mapHTML}</div>
        ${decided.length > 1 ? `<details class="cdet"><summary>All results so far</summary>${decided.map(([lbl, codes]) => `<div class="plbl">${lbl}</div>${resultRows(codes)}`).join('')}</details>` : ''}
        ${controls}`);
    }
    const card = $('#modal-card');
    const charge = () => { const started = lastLabel !== ''; if (started) { if (S.career.capital < 1) return false; S.career.capital--; } return true; };
    card.querySelectorAll('[data-pview]').forEach(b => b.onclick = () => { view = b.dataset.pview; sfx.click(); draw(); });
    card.querySelectorAll('[data-rank]').forEach(b => b.onclick = () => {
      const R = state[mine], f = R.field[+b.dataset.rank];
      if (!f || ranking.includes(f.name) || ranking.length >= 3 || !charge()) return;
      ranking.push(f.name); if (!rankPaid) { rankPaid = true; } hist(f.p, `Endorsed for President by the ${PARTY[mine].name} whip (#${ranking.length} choice)`);
      R.poll = null; sfx.up(); draw();
    });
    card.querySelectorAll('[data-unrank]').forEach(b => b.onclick = () => { const f = state[mine].field[+b.dataset.unrank]; if (!f || !charge()) return; ranking = ranking.filter(n => n !== f.name); state[mine].poll = null; sfx.click(); draw(); });
    if ($('#rkclear')) $('#rkclear').onclick = () => { if (!charge()) return; ranking = []; state[mine].poll = null; sfx.click(); draw(); };
    card.querySelectorAll('[data-cprof]').forEach(a => a.onclick = e => { e.preventDefault(); const f = state[view].field[+a.dataset.cprof]; profileModal(f.p, f.office, draw); });
    if ($('#pnext')) $('#pnext').onclick = () => { step(); sfx.click(); draw(); };
    if ($('#pskip')) $('#pskip').onclick = () => { while (!allDone()) step(); draw(); };
    if ($('#pfin')) $('#pfin').onclick = finishAll;
  };
  draw();
}
function presPrimariesDue() { const n = S.career.bills + 1; return n % 6 === 4 && billYear(n) % 4 === 0 && !S.nominees; }
