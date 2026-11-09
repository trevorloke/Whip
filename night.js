'use strict';
/* =====================================================================
   ELECTION NIGHT — results show for the Senate, the House and the
   Presidency. Real electoral votes, House apportionment and rough
   state populations; fictional candidates.
   ===================================================================== */

// 2020-census populations (millions, rounded) and 2024 electoral votes
const POP = { AL: 5.0, AK: 0.73, AZ: 7.2, AR: 3.0, CA: 39.5, CO: 5.8, CT: 3.6, DE: 1.0, FL: 21.5, GA: 10.7, HI: 1.46, ID: 1.8, IL: 12.8, IN: 6.8, IA: 3.2, KS: 2.9, KY: 4.5, LA: 4.7, ME: 1.36, MD: 6.2, MA: 7.0, MI: 10.1, MN: 5.7, MS: 2.96, MO: 6.15, MT: 1.08, NE: 1.96, NV: 3.1, NH: 1.38, NJ: 9.3, NM: 2.1, NY: 20.2, NC: 10.4, ND: 0.78, OH: 11.8, OK: 3.96, OR: 4.2, PA: 13.0, RI: 1.1, SC: 5.1, SD: 0.89, TN: 6.9, TX: 29.1, UT: 3.27, VT: 0.64, VA: 8.6, WA: 7.7, WV: 1.79, WI: 5.9, WY: 0.58, DC: 0.69 };
const EV = { AL: 9, AK: 3, AZ: 11, AR: 6, CA: 54, CO: 10, CT: 7, DE: 3, FL: 30, GA: 16, HI: 4, ID: 4, IL: 19, IN: 11, IA: 6, KS: 6, KY: 8, LA: 8, ME: 4, MD: 10, MA: 11, MI: 15, MN: 10, MS: 6, MO: 10, MT: 4, NE: 5, NV: 6, NH: 4, NJ: 14, NM: 5, NY: 28, NC: 16, ND: 3, OH: 17, OK: 7, OR: 8, PA: 19, RI: 4, SC: 9, SD: 3, TN: 11, TX: 40, UT: 6, VT: 3, VA: 13, WA: 12, WV: 4, WI: 10, WY: 3, DC: 3 };
const HSEATS = c => c === 'DC' ? 0 : EV[c] - 2; // House seats = electoral votes − 2
const NTILES = TILES.concat([['DC', 8, 5]]);
const stName = c => c === 'DC' ? 'District of Columbia' : ST[c].name;
const stLean = c => c === 'DC' ? -40 : ST[c].lean;
const turnout = c => POP[c] * 1e6 * rnd(0.44, 0.5);
const colOf = c => NTILES.find(t => t[0] === c)[1];
// east coast polls close first; close races are called last
function callTime(code, margin) {
  const m = Math.abs(margin);
  const base = (10 - colOf(code)) / 10 * 0.42;
  const extra = m > 15 ? 0.02 : m > 8 ? 0.1 : m > 4 ? 0.28 : 0.5 + rnd(0, 0.06);
  return clamp(base + extra + rnd(0, 0.04), 0.01, 0.97);
}
const nfmt = v => Math.round(v).toLocaleString('en-US');
const pct = v => v.toFixed(1) + '%';

/* ---------------- the House, state by state ---------------- */
function houseSeatsD(code, envD) {
  const n = HSEATS(code);
  if (!S.hNoise) { S.hNoise = {}; for (const [c] of STATES) S.hNoise[c] = rnd(-0.12, 0.12); }
  const share = clamp(0.5 + (-stLean(code) + envD) / 55 + S.hNoise[code], 0, 1);
  return Math.round(n * share);
}
function houseTotalD(envD) { return STATES.reduce((a, [c]) => a + houseSeatsD(c, envD), 0); }
function runHouse(swingSide) {
  // find the national environment that reproduces the current House, then swing it
  let env0 = 0, best = 1e9;
  for (let e = -30; e <= 30; e += 0.25) { const d = Math.abs(houseTotalD(e) - S.house.D); if (d < best) { best = d; env0 = e; } }
  const envD = env0 + (S.side === 'D' ? swingSide : -swingSide);
  const states = {};
  let D = 0, R = 0, popD = 0, popR = 0;
  for (const [c] of STATES) {
    const n = HSEATS(c), d = houseSeatsD(c, envD), prevD = S.houseByState ? S.houseByState[c] : houseSeatsD(c, env0);
    const dPct = clamp(49.2 + (-stLean(c) + envD) / 2 + rnd(-2, 2), 15, 85), rPct = 98.4 - dPct;
    const tv = turnout(c) * 0.96;
    states[c] = { n, d, r: n - d, prevD, dPct, rPct, dVotes: tv * dPct / 100, rVotes: tv * rPct / 100, call: callTime(c, dPct - rPct) };
    D += d; R += n - d; popD += states[c].dVotes; popR += states[c].rVotes;
  }
  S.houseByState = Object.fromEntries(Object.entries(states).map(([c, v]) => [c, v.d]));
  const before = { ...S.house };
  S.house = { D, R };
  return { states, D, R, before, popD, popR };
}

/* ---------------- the Presidency, by electoral vote ---------------- */
// the presidential race, shared by the campaign trail's projection and the real count
const MODERATES = ['Blue Dogs', 'GOP Moderates', 'New Democrats', 'Establishment'], FLANKS = ['Progressives', 'Freedom Caucus'];
function presSetup() {
  const P = S.president, inc = P.party, N = S.nominees || {}, E = S.election || {};
  const running = P.terms < 2 && (!N[inc] || N[inc].name === P.name);
  const nom = p => N[p] || { name: p === inc && running ? P.name : (S._fallbackNames = S._fallbackNames || { D: fullName(), R: fullName() })[p], p: p === inc && running ? P : null, state: p === inc && running ? P.state : null, faction: p === inc && running ? P.faction : pick(FACTIONS[p])[0], charisma: 1, vp: null };
  const noms = { D: nom('D'), R: nom('R') };
  S.whStreak = S.whStreak || 1;
  const q = p => (noms[p].charisma - 1) * 6 + (MODERATES.includes(noms[p].faction) ? 1 : FLANKS.includes(noms[p].faction) ? -1 : 0);
  let base = (P.approval - 50) / 5 + (inc === S.side ? S.mood : -S.mood) * 0.25 - (running ? 0 : 2) - 1.5 * (S.whStreak - 1) + q(inc) - q(other(inc));
  // the fall campaign (campaign.js) adds its national effects here, from your ticket's point of view
  base += (inc === S.side ? 1 : -1) * ((E.debate || 0) + cashEff(E.presCash || 0, 1.2) + (E.waveSignal || 0) + (typeof campaignEffects === 'function' ? campaignEffects() : 0));
  if (S.war && S.war.party === inc) base += (S.war.support - 50) / 12;
  return { inc, running, noms, base };
}
function stateMarginD(c, envD, noms) {
  let dm = -stLean(c) + envD;
  if (noms.D.state === c) dm += 4; if (noms.R.state === c) dm -= 4;            // home-state advantage
  if (noms.D.vp && noms.D.vp.state === c) dm += 2; if (noms.R.vp && noms.R.vp.state === c) dm -= 2;
  if (typeof campaignStateD === 'function') dm += campaignStateD(c, noms); // planks, focus states, surrogates (campaign.js)
  return dm;
}
function presProjection() {
  const s = presSetup(), envD = s.inc === 'D' ? s.base : -s.base, margins = {};
  let evMine = 0;
  for (const c of Object.keys(EV)) { margins[c] = stateMarginD(c, envD, s.noms); if ((margins[c] > 0) === (S.side === 'D')) evMine += EV[c]; }
  return { margins, evMine, noms: s.noms };
}
function runPres() {
  const P = S.president, { inc, running, noms, base } = presSetup();
  const names = { D: noms.D.name, R: noms.R.name };
  const indShare = Math.random() < 0.3 ? rnd(2, 9) : 0;
  if (indShare) names.I = fullName();
  // the wave forecasters saw is in base; the rest of it lands on election night
  const surprise = S.election ? (inc === S.side ? 1 : -1) * ((S.election.wave || 0) - (S.election.waveSignal || 0)) : 0;
  const score = clamp(base + surprise + rnd(-3, 3), -20, 20), envD = inc === 'D' ? score : -score;
  const states = {};
  let evD = 0, evR = 0, popD = 0, popR = 0;
  for (const c of Object.keys(EV)) {
    const dm = stateMarginD(c, envD, noms) + rnd(-2.5, 2.5);
    const iPct = indShare ? clamp(indShare + rnd(-2, 3), 0.5, 20) : 0, scale = (98.5 - iPct) / 98.5;
    const dPct = clamp(49.25 + dm / 2, 5, 95) * scale, rPct = 98.5 - iPct - dPct;
    const tv = turnout(c), w = dPct > rPct ? 'D' : 'R';
    states[c] = { dPct, rPct, iPct, dVotes: tv * dPct / 100, rVotes: tv * rPct / 100, iVotes: tv * iPct / 100, ev: EV[c], w, call: callTime(c, dPct - rPct) };
    if (w === 'D') evD += EV[c]; else evR += EV[c];
    popD += states[c].dVotes; popR += states[c].rVotes;
  }
  const winner = evD >= 270 ? 'D' : evR >= 270 ? 'R' : inc, loser = other(winner);
  S.whStreak = winner === inc ? S.whStreak + 1 : 1;
  const ev = `${Math.max(evD, evR)}–${Math.min(evD, evR)}`;
  if (noms[loser].p) hist(noms[loser].p, `Lost the presidential election, ${Math.min(evD, evR)}–${Math.max(evD, evR)} in the Electoral College`);
  let what, extra = [];
  if (winner === inc && running) { P.terms++; P.approval = clamp(P.approval + 4, 22, 72); hist(P, `Re-elected President, ${ev} in the Electoral College`); what = `${presTitle()} wins a second term.`; }
  else {
    const oldT = presTitle(), N = noms[winner];
    const person = N.p ? { ...N.p } : newPerson(winner, pick(STATES)[0]);
    // the winner leaves their old job
    const sen = S.members.find(m => m.name === person.name && m.party === winner);
    if (sen) extra.push(vacateSeat(sen, 'was elected President'));
    const govCode = Object.keys(S.governors || {}).find(c => S.governors[c].name === person.name);
    if (govCode) { governorSucceeded(govCode, 'was elected President'); extra.push(`${ST[govCode].name} gets a new governor.`); }
    hist(person, `Elected President of the United States, ${ev} in the Electoral College`);
    S.president = { ...person, name: person.name, party: winner, faction: N.faction || pick(FACTIONS[winner])[0], approval: ri(52, 58), terms: 1 };
    if (N.vp) {
      const vm = S.members.find(m => m.name === N.vp.name);
      S.vp = vm ? { ...vm, b: undefined } : newPerson(winner, N.vp.state);
      hist(S.vp, 'Elected Vice President');
      if (vm) extra.push(vacateSeat(vm, 'was elected Vice President'));
    } else { S.vp = newPerson(winner, pick(STATES)[0]); hist(S.vp, 'Elected Vice President'); }
    S.pendingCabinet = true;
    what = (winner === inc ? `${oldT} steps aside; fellow ${PARTY[winner].name} ${N.name} keeps the White House.` : `<b>A flip!</b> ${PARTY[winner].name} ${N.name} wins the White House.`) + ` The new President comes from the ${S.president.faction}.`;
    if (winner !== inc) S.vacancyBlocked = false;
  }
  S.nominees = null; S._fallbackNames = null;
  if (extra.length) what += ' ' + extra.join(' ');
  return { states, evD, evR, popD, popR, names, winner, inc, what };
}

/* ---------------- the show ---------------- */
let NIGHT = null;
function openNight(data, onDone) {
  const tabs = [data.pres && 'pres', 'senate', 'house', data.gov && data.gov.length && 'gov'].filter(Boolean);
  NIGHT = { ...data, tab: tabs[0], tabs, t: window.FF_FAST ? 1 : 0, sel: null, onDone, called: new Set(), timer: null };
  let el = $('#night');
  if (!el) { el = document.createElement('div'); el.id = 'night'; document.body.appendChild(el); }
  el.classList.remove('hidden');
  hideModal();
  // pointerdown (not click) so taps land even while the screen refreshes live
  el.onpointerdown = e => {
    const N = NIGHT; if (!N) return;
    const t = e.target.closest('[data-tab],[data-code],#nprev,#nnext,#nskip,#ndone');
    if (!t) return;
    if (t.dataset.tab) { N.tab = t.dataset.tab; N.sel = null; sfx.click(); }
    else if (t.dataset.code) { if (contests(N.tab).some(c => c.code === t.dataset.code)) { N.sel = t.dataset.code; sfx.click(); } }
    else if (t.id === 'nprev') return stepRace(-1);
    else if (t.id === 'nnext') return stepRace(1);
    else if (t.id === 'nskip') N.t = 1;
    else if (t.id === 'ndone') return closeNight();
    renderNight();
  };
  NIGHT.timer = setInterval(() => {
    if (NIGHT.t >= 1) { clearInterval(NIGHT.timer); NIGHT.timer = null; renderNight(); return; }
    NIGHT.t = Math.min(1, NIGHT.t + 0.012);
    renderNight();
  }, 200);
  document.addEventListener('keydown', nightKeys);
  renderNight();
}
function nightKeys(e) {
  if (!NIGHT || $('#night').classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') { stepRace(1); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { stepRace(-1); e.preventDefault(); }
}
function closeNight() {
  if (NIGHT.timer) clearInterval(NIGHT.timer);
  document.removeEventListener('keydown', nightKeys);
  $('#night').classList.add('hidden');
  const done = NIGHT.onDone; NIGHT = null; done();
}

// each tab's list of contests: { code, call, margin (D minus R, or winner-perspective), ... }
function contests(tab) {
  const N = NIGHT;
  if (tab === 'senate') return N.races.map(r => ({ code: r.code, call: r.call, r }));
  if (tab === 'gov') return N.gov.map(r => ({ code: r.code, call: r.call, r }));
  if (tab === 'pres') return Object.entries(N.pres.states).map(([code, s]) => ({ code, call: s.call, s }));
  return Object.entries(N.house.states).map(([code, s]) => ({ code, call: s.call, s }));
}
function isCalled(c) { return NIGHT.t >= c.call; }
function navList() { return contests(NIGHT.tab).sort((a, b) => a.call - b.call); }
function stepRace(d) {
  const L = navList(); let i = L.findIndex(c => c.code === NIGHT.sel);
  i = (i + d + L.length) % L.length; NIGHT.sel = L[i].code; sfx.click(); renderNight();
}
function clockText(t) {
  const mins = 19 * 60 + Math.round(t * 7 * 60); const h = Math.floor(mins / 60) % 24, m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 && h < 24 ? 'PM' : 'AM'} ET`;
}
function reporting(c) { return isCalled(c) ? 1 : clamp(NIGHT.t / c.call, 0, 0.96) * (0.6 + 0.4 * Math.min(1, NIGHT.t * 3)); }
function shade(party, margin) { const m = Math.abs(margin); return { fill: PARTY[party].color, op: m < 3 ? 0.45 : m < 8 ? 0.7 : 1 }; }

function tallies() {
  const N = NIGHT, out = {};
  // Senate: seats not up, plus races called so far
  const up = new Set(N.races.map(r => r.code + ':' + r.cls));
  const cont = { D: 0, R: 0, I: 0 };
  for (const m of N.prevMembers) if (!up.has(m.state + ':' + m.cls)) cont[m.party]++;
  const sen = { ...cont }, und = { n: 0 };
  for (const r of N.races) { if (isCalled({ call: r.call })) sen[r.wParty]++; else und.n++; }
  out.senate = { D: sen.D, R: sen.R, I: sen.I, und: und.n };
  if (N.pres) { let d = 0, r = 0, u = 0; for (const s of Object.values(N.pres.states)) { if (NIGHT.t >= s.call) { if (s.w === 'D') d += s.ev; else r += s.ev; } else u += s.ev; } out.pres = { D: d, R: r, und: u }; }
  if (N.gov && N.gov.length) { const up = new Set(N.gov.map(r => r.code)), g = { D: 0, R: 0, I: 0, und: 0 }; for (const [c, p] of Object.entries(N.govBefore || {})) if (!up.has(c)) g[p]++; for (const r of N.gov) { if (isCalled({ call: r.call })) g[r.wParty]++; else g.und++; } out.gov = g; }
  { let d = 0, r = 0, u = 0; for (const s of Object.values(N.house.states)) { if (NIGHT.t >= s.call) { d += s.d; r += s.r; } else u += s.n; } out.house = { D: d, R: r, und: u }; }
  return out;
}
function barChart(label, a, total, need, sub) {
  const w = v => (v / total * 100).toFixed(2) + '%';
  return `<div class="tcard"><div class="tl"><b>${label}</b><span>${sub || ''}</span></div>
    <div class="tbar"><div style="width:${w(a.D)};background:${PARTY.D.color}"></div>${a.I ? `<div style="width:${w(a.I)};background:${PARTY.I.color}"></div>` : ''}<div style="width:${w(a.und)};background:#3a4250"></div><div style="width:${w(a.R)};background:${PARTY.R.color}"></div>
    <i class="need" style="left:${w(need)}"></i><i class="need" style="left:${w(total - need)}"></i></div>
    <div class="tl"><span style="color:${PARTY.D.color};font-weight:800">D ${a.D}${a.I ? ` <span style="color:${PARTY.I.color}">+ I ${a.I}</span>` : ''}</span><span style="color:var(--dim)">${a.und ? `${a.und} uncalled` : 'all called'} · ${need} to win</span><span style="color:${PARTY.R.color};font-weight:800">R ${a.R}</span></div></div>`;
}

function nightMap() {
  const N = NIGHT;
  const byCode = Object.fromEntries(contests(N.tab).map(c => [c.code, c]));
  return usMap({
    cls: 'nmap',
    fill: code => {
      const c = byCode[code]; if (!c) return null;
      if (!isCalled(c)) return { c: '#4a5366' };
      if (N.tab === 'senate' || N.tab === 'gov') { const s = shade(c.r.wParty, c.r.margin); return { c: s.fill, op: s.op }; }
      if (N.tab === 'pres') { const s = shade(c.s.w, c.s.dPct - c.s.rPct); return { c: s.fill, op: s.op }; }
      const sh = c.s.d / c.s.n; return { c: sh > 0.5 ? PARTY.D.color : sh < 0.5 ? PARTY.R.color : '#8a8fa0', op: 0.35 + Math.abs(sh - 0.5) * 1.3 };
    },
    sub: code => {
      const c = byCode[code]; if (!c) return '';
      if (N.tab === 'pres') return c.s.ev;
      if (!isCalled(c)) return N.t > c.call * 0.6 ? '…' : '';
      if (N.tab === 'senate' || N.tab === 'gov') return c.r.flip ? 'FLIP' : '';
      return `${c.s.d}–${c.s.r}`;
    },
    ring: code => { const c = byCode[code]; if (N.sel === code) return '#fff'; if (!c || !isCalled(c)) return null; return ((N.tab === 'senate' || N.tab === 'gov') && c.r.flip) || (N.tab === 'house' && c.s.d !== c.s.prevD) ? '#f6d27a' : null; },
    attr: code => byCode[code] ? `data-code="${code}"` : '',
  });
}

function candRow(name, party, votes, p, win, extra = '') {
  return `<div class="cand ${win ? 'win' : ''}"><div class="cn"><span class="dot" style="background:${PARTY[party].color}"></span><b>${name}</b> <span style="color:var(--dim)">(${party})</span>${extra}${win ? ' <span class="check">✓</span>' : ''}</div>
    <div class="cv"><span>${nfmt(votes)}</span><b>${pct(p)}</b></div><div class="cb"><i style="width:${p}%;background:${PARTY[party].color}"></i></div></div>`;
}
function detailPanel() {
  const N = NIGHT;
  const L = navList(); if (!N.sel || !L.some(c => c.code === N.sel)) N.sel = L.slice().sort((a, b) => Math.abs(marginOf(a)) - Math.abs(marginOf(b)))[0].code;
  const c = L.find(x => x.code === N.sel), called = isCalled(c), rep = reporting(c);
  const i = L.indexOf(c);
  const nav = `<div class="nnav"><button class="btn" id="nprev">◀ Prev</button><span>${i + 1} / ${L.length}</span><button class="btn" id="nnext">Next ▶</button></div>`;
  const status = called ? `<span class="call">PROJECTED</span>` : (N.t > c.call * 0.6 && Math.abs(marginOf(c)) < 5 ? '<span class="call close">TOO CLOSE TO CALL</span>' : '<span class="call wait">TOO EARLY TO CALL</span>');
  let body = '';
  if (N.tab === 'senate' || N.tab === 'gov') {
    const r = c.r;
    const list = r.cands || [{ name: r.wName, party: r.wParty, votes: r.wVotes, pct: r.wPct }, { name: r.lName, party: r.lParty, votes: r.lVotes, pct: r.lPct }];
    const rows = list.map((x, i) => [x.name, x.party, x.votes, x.pct, i === 0, x.inc ? ' <span class="inc">incumbent</span>' : '']);
    if (!called) rows.forEach(x => { x[2] *= rep; x[3] = x[3] + (x[4] ? -1 : 1) * (1 - rep) * 3 * Math.sin(r.call * 40); x[4] = false; });
    rows.sort((a, b) => b[3] - a[3]);
    body = `<h3>${stName(r.code)} · ${N.tab === 'gov' ? 'Governor' : `Senate (Class ${r.cls})`}</h3><div class="nsub">${r.open ? 'Open seat' : 'Incumbent: ' + r.incumbent}${r.threeWay ? ' · <b style="color:' + PARTY.I.color + '">three-way race</b>' : ''} · ${leanLabel(stLean(r.code))} · ${status} ${called && r.flip ? `<span class="call flip">${r.wParty} FLIP</span>` : called ? '<span class="call hold">HOLD</span>' : ''}</div>
      ${rows.map(x => candRow(...x)).join('')}<div class="nsub">${Math.round(rep * 100)}% of the expected vote reported${called ? ` · margin ${pct(r.margin)}` : ''}</div>`;
  } else if (N.tab === 'pres') {
    const s = c.s, P = N.pres;
    const rows = [[P.names.D, 'D', s.dVotes, s.dPct], [P.names.R, 'R', s.rVotes, s.rPct]].concat(P.names.I ? [[P.names.I, 'I', s.iVotes, s.iPct]] : []).map(x => { if (!called) { x[2] *= rep; } return [...x, called && x[1] === s.w]; }).sort((a, b) => b[3] - a[3]);
    body = `<h3>${stName(c.code)} · President</h3><div class="nsub"><b>${s.ev} electoral votes</b> · ${leanLabel(stLean(c.code))} · ${status}</div>
      ${rows.map(x => candRow(x[0], x[1], x[2], x[3], x[4])).join('')}<div class="nsub">${Math.round(rep * 100)}% reported${called ? ` · margin ${pct(Math.abs(s.dPct - s.rPct))}` : ''}</div>`;
  } else {
    const s = c.s, ch = s.d - s.prevD;
    body = `<h3>${stName(c.code)} · House</h3><div class="nsub"><b>${s.n} seat${s.n > 1 ? 's' : ''}</b> · ${leanLabel(stLean(c.code))} · ${status}</div>
      ${called ? `<div class="seatrow">${('<i style="background:' + PARTY.D.color + '"></i>').repeat(s.d)}${('<i style="background:' + PARTY.R.color + '"></i>').repeat(s.r)}</div>
      <div class="nsub">D ${s.d} · R ${s.r} · ${ch === 0 ? 'no change' : `<b style="color:${ch > 0 ? PARTY.D.color : PARTY.R.color}">${ch > 0 ? 'D' : 'R'} +${Math.abs(ch)}</b>`}</div>` : '<div class="seatrow">' + '<i style="background:#3a4250"></i>'.repeat(s.n) + '</div>'}
      ${candRow('Democrats (all districts)', 'D', s.dVotes * rep, s.dPct, called && s.dPct > s.rPct)}${candRow('Republicans (all districts)', 'R', s.rVotes * rep, s.rPct, called && s.rPct > s.dPct)}`;
  }
  return nav + body;
}
function marginOf(c) { return c.r ? c.r.margin : c.s.dPct - c.s.rPct; }
function raceList() {
  const L = navList();
  return L.map(c => {
    const called = isCalled(c);
    let st;
    if (!called) st = `<span style="color:var(--dim)">${NIGHT.t > c.call * 0.6 && Math.abs(marginOf(c)) < 5 ? 'Too close' : 'Waiting'}</span>`;
    else if (c.r) st = `<b style="color:${PARTY[c.r.wParty].color}">${c.r.wParty} +${c.r.margin.toFixed(1)}</b>${c.r.flip ? ' <span class="call flip">FLIP</span>' : ''}`;
    else if (NIGHT.tab === 'pres') st = `<b style="color:${PARTY[c.s.w].color}">${c.s.w} +${Math.abs(c.s.dPct - c.s.rPct).toFixed(1)}</b> · ${c.s.ev} EV`;
    else st = `<b style="color:${PARTY.D.color}">${c.s.d}</b>–<b style="color:${PARTY.R.color}">${c.s.r}</b>${c.s.d !== c.s.prevD ? ` <span class="call flip">${c.s.d > c.s.prevD ? 'D' : 'R'} +${Math.abs(c.s.d - c.s.prevD)}</span>` : ''}`;
    return `<div class="lrow ${NIGHT.sel === c.code ? 'on' : ''}" data-code="${c.code}"><span><b>${c.code}</b> ${stName(c.code)}</span><span>${st}</span></div>`;
  }).join('');
}
// diverging bar chart of the closest called contests
function closestChart() {
  const L = contests(NIGHT.tab).filter(isCalled).map(c => ({ code: c.code, m: c.r ? (c.r.wParty === 'D' ? -1 : 1) * c.r.margin : c.s.rPct - c.s.dPct, flip: c.r && c.r.flip, ind: c.r && c.r.wParty === 'I' }))
    .sort((a, b) => Math.abs(a.m) - Math.abs(b.m)).slice(0, 10);
  if (!L.length) return '<div class="nsub">No races called yet.</div>';
  const W = 420, H = L.length * 20 + 24, mx = Math.max(10, ...L.map(x => Math.abs(x.m)));
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="cchart"><line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H - 16}" stroke="#666"/>`;
  L.forEach((x, i) => {
    const y = i * 20 + 4, len = Math.abs(x.m) / mx * (W / 2 - 40), right = x.m > 0;
    svg += `<g class="lrow" data-code="${x.code}" style="cursor:pointer"><rect x="${right ? W / 2 : W / 2 - len}" y="${y}" width="${Math.max(2, len)}" height="14" rx="3" fill="${x.ind ? PARTY.I.color : right ? PARTY.R.color : PARTY.D.color}"/>
      <text x="${right ? W / 2 - 6 : W / 2 + 6}" y="${y + 11}" font-size="11" fill="#ddd" text-anchor="${right ? 'end' : 'start'}" font-weight="700">${x.code}${x.flip ? ' ★' : ''}</text>
      <text x="${right ? W / 2 + len + 4 : W / 2 - len - 4}" y="${y + 11}" font-size="10" fill="#9aa3b2" text-anchor="${right ? 'start' : 'end'}">${Math.abs(x.m).toFixed(1)}</text></g>`;
  });
  svg += `<text x="4" y="${H - 3}" font-size="10" fill="${PARTY.D.color}">◀ Democratic margin</text><text x="${W - 4}" y="${H - 3}" font-size="10" fill="${PARTY.R.color}" text-anchor="end">Republican margin ▶</text></svg>`;
  return svg;
}
function popularVote() {
  const N = NIGHT;
  if (N.tab === 'pres') {
    const P = N.pres; let d = 0, r = 0, i = 0;
    for (const s of Object.values(P.states)) { const rp = reporting({ call: s.call }); d += s.dVotes * rp; r += s.rVotes * rp; i += (s.iVotes || 0) * rp; }
    const tot = d + r + i || 1;
    return `<b>Popular vote</b><div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">${P.names.D} ${pct(d / tot * 100)}</div>${i ? `<div style="width:${i / tot * 100}%;background:${PARTY.I.color}">${pct(i / tot * 100)}</div>` : ''}<div style="width:${r / tot * 100}%;background:${PARTY.R.color}">${pct(r / tot * 100)} ${P.names.R}</div></div><div class="nsub" style="display:flex;justify-content:space-between"><span>${nfmt(d)} votes</span>${i ? `<span style="color:${PARTY.I.color}">${P.names.I} (I) ${nfmt(i)}</span>` : ''}<span>${nfmt(r)} votes</span></div>`;
  }
  if (N.tab === 'house') {
    const H = N.house; let d = 0, r = 0;
    for (const s of Object.values(H.states)) { const rp = reporting({ call: s.call }); d += s.dVotes * rp; r += s.rVotes * rp; }
    const tot = d + r || 1;
    return `<b>National House vote</b><div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">D ${pct(d / tot * 98.4)}</div><div style="width:${r / tot * 100}%;background:${PARTY.R.color}">R ${pct(r / tot * 98.4)}</div></div><div class="nsub" style="display:flex;justify-content:space-between"><span>${nfmt(d)}</span><span>Before: D ${H.before.D} – R ${H.before.R}</span><span>${nfmt(r)}</span></div>`;
  }
  let d = 0, r = 0, ind = 0;
  for (const x of (N.tab === 'gov' ? N.gov : N.races)) { const rp = reporting({ call: x.call }); for (const c of x.cands || []) { if (c.party === 'D') d += c.votes * rp; else if (c.party === 'R') r += c.votes * rp; else ind += c.votes * rp; } }
  const tot = d + r + ind || 1;
  const flips = N.races.filter(x => x.flip && isCalled({ call: x.call }));
  if (N.tab === 'gov') return `<b>Governors' races, all votes</b><div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">D ${pct(d / tot * 100)}</div><div style="width:${r / tot * 100}%;background:${PARTY.R.color}">R ${pct(r / tot * 100)}</div></div>`;
  return `<b>Senate vote, all races</b><div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">D ${pct(d / tot * 100)}</div>${ind ? `<div style="width:${ind / tot * 100}%;background:${PARTY.I.color}">I ${pct(ind / tot * 100)}</div>` : ''}<div style="width:${r / tot * 100}%;background:${PARTY.R.color}">R ${pct(r / tot * 100)}</div></div>
    <div class="nsub">Flips so far: ${flips.length ? flips.map(x => `<b style="color:${PARTY[x.wParty].color}">${x.code}</b>`).join(', ') : 'none'} · Before: D ${N.before.D} – R ${N.before.R}${N.before.I ? ` – I ${N.before.I}` : ''}</div>`;
}

function renderNight() {
  if (!NIGHT) return;
  const N = NIGHT, T = tallies();
  const tabName = { pres: 'President', senate: 'Senate', house: 'House', gov: 'Governors' };
  const sc = $('#night .nside') ? $('#night .nside').scrollTop : 0;
  $('#night').innerHTML = `<div class="nwrap">
    <div class="nhead"><div><div class="kicker">Election Night ${N.year} · ${N.t >= 1 ? 'Final results' : 'LIVE'}</div><h2>${clockText(N.t)}</h2></div>
      <div class="ntabs">${N.tabs.map(t => `<button class="btn ${N.tab === t ? 'on' : ''}" data-tab="${t}">${tabName[t]}</button>`).join('')}</div>
      <div>${N.t < 1 ? '<button class="btn" id="nskip">⏩ Skip to final results</button>' : '<button class="btn primary" id="ndone">Continue →</button>'}</div></div>
    <div class="ntally">${N.pres ? barChart(`President · ${N.pres.names.D} vs ${N.pres.names.R}`, T.pres, 538, 270, 'electoral votes') : ''}
      ${barChart('Senate', T.senate, 100, 51, `${N.races.length} seats up`)}${barChart('House', T.house, 435, 218, 'all 435 seats')}${T.gov ? barChart('Governors', T.gov, 50, 26, `${N.gov.length} races`) : ''}</div>
    <div class="nbody"><div class="nmapwrap">${nightMap()}<div class="npop">${popularVote()}</div></div>
      <div class="nside"><div class="ndetail">${detailPanel()}</div>
        <div class="nlist"><div class="lh">All ${tabName[N.tab].toLowerCase()} results · ← → to browse</div>${raceList()}</div>
        <div class="nchart"><div class="lh">Closest races</div>${closestChart()}</div></div></div></div>`;
  if ($('#night .nside')) $('#night .nside').scrollTop = sc;
  // a chime as races are called
  const nowCalled = contests(N.tab).filter(isCalled).length;
  if (N.lastCalled != null && nowCalled > N.lastCalled && N.t < 1) sfx.yes();
  N.lastCalled = nowCalled;
}
