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
  let evD = 0, evR = 0, popD = 0, popR = 0, popI = 0;
  for (const c of Object.keys(EV)) {
    const dm = stateMarginD(c, envD, noms) + rnd(-2.5, 2.5);
    const iPct = indShare ? clamp(indShare + rnd(-2, 3), 0.5, 20) : 0, scale = (98.5 - iPct) / 98.5;
    const dPct = clamp(49.25 + dm / 2, 5, 95) * scale, rPct = 98.5 - iPct - dPct;
    const tv = turnout(c), w = dPct > rPct ? 'D' : 'R';
    states[c] = { dPct, rPct, iPct, dVotes: tv * dPct / 100, rVotes: tv * rPct / 100, iVotes: tv * iPct / 100, ev: EV[c], w, call: callTime(c, dPct - rPct) };
    if (w === 'D') evD += EV[c]; else evR += EV[c];
    popD += states[c].dVotes; popR += states[c].rVotes; popI += states[c].iVotes;
  }
  const winner = evD >= 270 ? 'D' : evR >= 270 ? 'R' : inc, loser = other(winner);
  S.whStreak = winner === inc ? S.whStreak + 1 : 1;
  // the record book: the last six presidential results by state, so the night can show swings
  const year = S.election ? S.election.year : currentYear(), r1 = v => Math.round(v * 10) / 10;
  const book = (S.presHistory || []).slice(-5), prev = book.length ? book[book.length - 1] : null;
  S.presHistory = book.concat([{ year, states: Object.fromEntries(Object.entries(states).map(([c, s]) => [c, r1(s.dPct - s.rPct)])), evD, evR, popD: Math.round(popD), popR: Math.round(popR), names, winner }]);
  const homes = { D: noms.D.state || null, R: noms.R.state || null };
  const vps = { D: noms.D.vp ? { name: noms.D.vp.name, state: noms.D.vp.state || null } : null, R: noms.R.vp ? { name: noms.R.vp.name, state: noms.R.vp.state || null } : null };
  const offices = { D: noms.D.office || (noms.D.p === P ? 'President' : null), R: noms.R.office || (noms.R.p === P ? 'President' : null) };
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
  return { states, evD, evR, popD, popR, popI, names, winner, inc, running, what, year, prev: prev ? { year: prev.year, states: prev.states } : null, homes, vps, offices };
}

/* ---------------- the show ---------------- */
let NIGHT = null;
// opts (all optional): final → open on the final results; tab/view/sort/sel → restore a previous position
function openNight(data, onDone, opts = {}) {
  const tabs = [data.pres && 'pres', 'senate', 'house', data.gov && data.gov.length && 'gov'].filter(Boolean);
  const final = !!(window.FF_FAST || opts.final);
  NIGHT = { ...data, data, tab: tabs.includes(opts.tab) ? opts.tab : tabs[0], tabs, t: final ? 1 : 0, sel: opts.sel || null, onDone, called: new Set(), timer: null,
    view: ['map', 'table', 'ticker'].includes(opts.view) ? opts.view : 'map', sort: opts.sort || null, fanfared: !!opts.final };
  let el = $('#night');
  if (!el) { el = document.createElement('div'); el.id = 'night'; document.body.appendChild(el); }
  el.classList.remove('hidden');
  hideModal();
  // pointerdown (not click) so taps land even while the screen refreshes live
  el.onpointerdown = e => {
    const N = NIGHT; if (!N) return;
    const t = e.target.closest('[data-tab],[data-code],[data-rtab],[data-sort],#nprev,#nnext,#nskip,#ndone,#fullres');
    if (!t) return;
    if (t.dataset.tab) { N.tab = t.dataset.tab; N.sel = null; sfx.click(); }
    else if (t.dataset.code) {
      // a Decision Desk row may point at another tab's race
      if (t.dataset.tabGo && N.tabs.includes(t.dataset.tabGo)) { N.tab = t.dataset.tabGo; N.view = 'map'; }
      if (contests(N.tab).some(c => c.code === t.dataset.code)) { N.sel = t.dataset.code; sfx.click(); }
    }
    else if (t.dataset.rtab) { N.view = t.dataset.rtab; sfx.click(); }
    else if (t.dataset.sort) { const k = t.dataset.sort; N.sort = N.sort && N.sort.k === k ? { k, d: -N.sort.d } : { k, d: k === 'state' ? 1 : -1 }; sfx.click(); }
    else if (t.id === 'nprev') return stepRace(-1);
    else if (t.id === 'nnext') return stepRace(1);
    else if (t.id === 'nskip') N.t = 1;
    else if (t.id === 'ndone') return closeNight();
    else if (t.id === 'fullres') return nightToExplorer();
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
// "Full results": hand the finished night to the explorer (results.js) and come back to the same spot
function nightToExplorer() {
  const N = NIGHT; if (!N || typeof resExplorer !== 'function') return;
  const rec = typeof resRecordFor === 'function' ? resRecordFor(N.data) : null; if (!rec) return;
  const { data, onDone, tab, view, sort, sel } = N;
  if (N.timer) clearInterval(N.timer);
  document.removeEventListener('keydown', nightKeys);
  NIGHT = null;
  resExplorer(rec, () => openNight(data, onDone, { final: true, tab, view, sort, sel }));
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
function barChart(label, a, total, need, sub, foot = '') {
  const w = v => (v / total * 100).toFixed(2) + '%';
  return `<div class="tcard"><div class="tl"><b>${label}</b><span>${sub || ''}</span></div>
    <div class="tbar"><div style="width:${w(a.D)};background:${PARTY.D.color}"></div>${a.I ? `<div style="width:${w(a.I)};background:${PARTY.I.color}"></div>` : ''}<div style="width:${w(a.und)};background:#3a4250"></div><div style="width:${w(a.R)};background:${PARTY.R.color}"></div>
    <i class="need" style="left:${w(need)}"></i><i class="need" style="left:${w(total - need)}"></i></div>
    <div class="tl"><span style="color:${PARTY.D.color};font-weight:800">D ${a.D}${a.I ? ` <span style="color:${PARTY.I.color}">+ I ${a.I}</span>` : ''}</span><span style="color:var(--dim)">${a.und ? `${a.und} uncalled` : 'all called'} · ${need} to win</span><span style="color:${PARTY.R.color};font-weight:800">R ${a.R}</span></div>${foot ? `<div class="res-foot">${foot}</div>` : ''}</div>`;
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
    const prev = P.prev && P.prev.states && P.prev.states[c.code] != null ? P.prev.states[c.code] : null;
    body = `<h3>${stName(c.code)} · President</h3><div class="nsub"><b>${s.ev} electoral votes</b> · ${leanLabel(stLean(c.code))} · ${status}</div>
      ${rows.map(x => candRow(x[0], x[1], x[2], x[3], x[4])).join('')}<div class="nsub">${Math.round(rep * 100)}% reported${called ? ` · margin ${pct(Math.abs(s.dPct - s.rPct))} · ${prev == null ? 'first presidential election on record' : `swing ${resSwing(s.dPct - s.rPct - prev)} since ${P.prev.year}`}` : ''}</div>
      ${resPresNotes(P, c.code, called)}`;
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
function popularVote(T) {
  const N = NIGHT;
  if (N.tab === 'pres') {
    const P = N.pres; let d = 0, r = 0, i = 0;
    for (const s of Object.values(P.states)) { const rp = reporting({ call: s.call }); d += s.dVotes * rp; r += s.rVotes * rp; i += (s.iVotes || 0) * rp; }
    const tot = d + r + i || 1;
    return `<b>Popular vote</b><div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">${P.names.D} ${pct(d / tot * 100)}</div>${i ? `<div style="width:${i / tot * 100}%;background:${PARTY.I.color}">${pct(i / tot * 100)}</div>` : ''}<div style="width:${r / tot * 100}%;background:${PARTY.R.color}">${pct(r / tot * 100)} ${P.names.R}</div></div><div class="nsub" style="display:flex;justify-content:space-between"><span>${nfmt(d)} votes</span>${i ? `<span style="color:${PARTY.I.color}">${P.names.I} (I) ${nfmt(i)}</span>` : ''}<span>${nfmt(r)} votes</span></div>${resPopCallout(P, (T || tallies()).pres, d, r, i)}`;
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
  if (N.tab === 'gov') {
    const gf = N.gov.filter(x => x.flip && isCalled({ call: x.call })), gb = N.govBefore ? Object.values(N.govBefore).reduce((a, p) => { a[p] = (a[p] || 0) + 1; return a; }, { D: 0, R: 0 }) : null;
    return `<b>Governors' races, all votes</b><div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">D ${pct(d / tot * 100)}</div><div style="width:${r / tot * 100}%;background:${PARTY.R.color}">R ${pct(r / tot * 100)}</div></div>
      <div class="nsub">Mansions flipped so far: ${gf.length ? gf.map(x => `<b style="color:${PARTY[x.wParty].color}">${x.code}</b>`).join(', ') : 'none'}${gb ? ` · Before: D ${gb.D} – R ${gb.R}` : ''}</div>`;
  }
  return `<b>Senate vote, all races</b><div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">D ${pct(d / tot * 100)}</div>${ind ? `<div style="width:${ind / tot * 100}%;background:${PARTY.I.color}">I ${pct(ind / tot * 100)}</div>` : ''}<div style="width:${r / tot * 100}%;background:${PARTY.R.color}">R ${pct(r / tot * 100)}</div></div>
    <div class="nsub">Flips so far: ${flips.length ? flips.map(x => `<b style="color:${PARTY[x.wParty].color}">${x.code}</b>`).join(', ') : 'none'} · Before: D ${N.before.D} – R ${N.before.R}${N.before.I ? ` – I ${N.before.I}` : ''}</div>`;
}

function renderNight() {
  if (!NIGHT) return;
  const N = NIGHT, T = tallies();
  const tabName = { pres: 'President', senate: 'Senate', house: 'House', gov: 'Governors' };
  const keep = [...document.querySelectorAll('#night .nside, #night .res-scroll')].map(el => el.scrollTop);
  const govB = N.govBefore ? Object.values(N.govBefore).reduce((a, p) => { a[p] = (a[p] || 0) + 1; return a; }, { D: 0, R: 0, I: 0 }) : null;
  const calls = N.tabs.reduce((a, tab) => a + contests(tab).filter(isCalled).length, 0);
  const sub = `<div class="res-sub">${[['map', '🗺 Map'], ['table', '☰ Table'], ['ticker', `📰 Decision Desk <small>${calls}</small>`]].map(([k, l]) => `<button class="btn ${N.view === k ? 'on' : ''}" data-rtab="${k}">${l}</button>`).join('')}<span class="res-subhint">${N.view === 'table' ? 'click a header to sort · click a row to select' : N.view === 'ticker' ? 'every call of the night · click one to jump to it' : 'click a state to select it'}</span></div>`;
  const main = N.view === 'table' ? `<div class="res-scroll">${resNightTable()}</div>` : N.view === 'ticker' ? `<div class="res-scroll">${resTickerHTML()}</div>` : nightMap();
  $('#night').innerHTML = `<div class="nwrap">
    <div class="nhead"><div><div class="kicker">Election Night ${N.year} · ${N.t >= 1 ? 'Final results' : 'LIVE'}</div><h2>${clockText(N.t)}</h2></div>
      <div class="ntabs">${N.tabs.map(t => `<button class="btn ${N.tab === t ? 'on' : ''}" data-tab="${t}">${tabName[t]}</button>`).join('')}</div>
      <div class="res-hbtns">${N.t < 1 ? '<button class="btn" id="nskip">⏩ Skip to final results</button>' : `${typeof resExplorer === 'function' ? '<button class="btn" id="fullres">📊 Full results</button>' : ''}<button class="btn primary" id="ndone">Continue →</button>`}</div></div>
    ${N.pres ? resBannerHTML(T) : ''}
    <div class="ntally">${N.pres ? barChart(`President · ${N.pres.names.D} vs ${N.pres.names.R}`, T.pres, 538, 270, 'electoral votes', resPresFoot(N.pres)) : ''}
      ${barChart('Senate', T.senate, 100, 51, `${N.races.length} seats up`, resSeatFoot(N.before, T.senate, 51, 'the Senate'))}${barChart('House', T.house, 435, 218, 'all 435 seats', resSeatFoot(N.house.before, T.house, 218, 'the House'))}${T.gov ? barChart('Governors', T.gov, 50, 26, `${N.gov.length} races`, resSeatFoot(govB, T.gov, 26, 'most governorships')) : ''}</div>
    <div class="nbody"><div class="nmapwrap">${sub}${main}${N.tab !== 'pres' ? resNightSnake(T) : ''}<div class="npop">${popularVote(T)}</div></div>
      <div class="nside"><div class="ndetail">${detailPanel()}</div>
        <div class="nlist"><div class="lh">All ${tabName[N.tab].toLowerCase()} results · ← → to browse</div>${raceList()}</div>
        <div class="nchart"><div class="lh">Closest races</div>${closestChart()}</div></div></div></div>`;
  [...document.querySelectorAll('#night .nside, #night .res-scroll')].forEach((el, i) => { if (keep[i] != null) el.scrollTop = keep[i]; });
  // a chime as races are called
  const nowCalled = contests(N.tab).filter(isCalled).length;
  if (N.lastCalled != null && nowCalled > N.lastCalled && N.t < 1) sfx.yes();
  N.lastCalled = nowCalled;
}

/* ---------------- the Decision Desk: banner, ticker, tables, snakes ---------------- */
const resSwing = d => `<b style="color:${d >= 0 ? PARTY.D.color : PARTY.R.color}">${d >= 0 ? 'D' : 'R'}+${Math.abs(d).toFixed(1)}</b>`;
const resMarginTag = (p, m) => `<b style="color:${PARTY[p].color}">${p} +${Math.abs(m).toFixed(1)}</b>`;
// the state whose electoral votes put the winner past 270, counting the winner's states from safest to closest
function resTipping(P) {
  const L = Object.entries(P.states).filter(([, s]) => s.w === P.winner).sort((a, b) => Math.abs(b[1].dPct - b[1].rPct) - Math.abs(a[1].dPct - a[1].rPct));
  let ev = 0; for (const [code, s] of L) { ev += s.ev; if (ev >= 270) return { code, ev: s.ev, m: Math.abs(s.dPct - s.rPct) }; }
  return null;
}
// states that voted with the winner and mirrored the national popular vote within a point and a half
function resBellwethers(P) {
  const tot = P.popD + P.popR + (P.popI || 0) || 1, nat = (P.popD - P.popR) / tot * 100, off = s => Math.abs(s.dPct - s.rPct - nat);
  return Object.entries(P.states).filter(([, s]) => s.w === P.winner && off(s) < 1.5).sort((a, b) => off(a[1]) - off(b[1])).slice(0, 3).map(x => x[0]);
}
function resClosest(P) { return Object.entries(P.states).sort((a, b) => Math.abs(a[1].dPct - a[1].rPct) - Math.abs(b[1].dPct - b[1].rPct))[0][0]; }
// when (and with which state) the winner's called electoral votes first reached 270
function resProjTime(P) {
  let ev = 0;
  for (const [code, s] of Object.entries(P.states).sort((a, b) => a[1].call - b[1].call)) if (s.w === P.winner) { ev += s.ev; if (ev >= 270) return { t: s.call, code }; }
  return null;
}
function resDecided(T) { const t = (T || tallies()).pres; return NIGHT.t >= 1 || t.D >= 270 || t.R >= 270; }
// home states, running mates, the tipping point and the bellwethers, for one state's detail panel
function resPresNotes(P, code, called) {
  const notes = [], s = P.states[code];
  for (const p of ['D', 'R']) {
    if (P.homes && P.homes[p] === code) notes.push(`🏠 ${P.names[p]}'s home state${called ? (s.w === p ? ' · carried it' : ' · <b style="color:var(--no)">lost at home</b>') : ''}`);
    if (P.vps && P.vps[p] && P.vps[p].state === code) notes.push(`🤝 Running mate ${P.vps[p].name}'s home state (${p})${called ? (s.w === p ? ' · delivered' : ' · <b style="color:var(--no)">couldn\'t deliver</b>') : ''}`);
  }
  if (called && resDecided()) {
    const tip = resTipping(P); if (tip && tip.code === code) notes.push(`⚖ <b>Tipping-point state</b> · its ${s.ev} electoral votes put ${P.names[P.winner]} past 270`);
    if (resBellwethers(P).includes(code)) notes.push('🔔 <b>Bellwether</b> · mirrored the national popular vote');
    if (resClosest(P) === code) notes.push('🔬 <b>Closest state in the nation</b>');
  }
  return notes.length ? `<div class="res-notes">${notes.map(n => `<div>${n}</div>`).join('')}</div>` : '';
}
function resPresFoot(P) { return `${PARTY[P.inc].short} hold the White House · ${P.running ? `${P.names[P.inc]} seeks a second term` : 'open race'}`; }
// before → after seat counts, the net for your party and a projection once a side clinches
function resSeatFoot(before, now, need, what) {
  const b = before || { D: 0, R: 0, I: 0 }, side = S.side, held = (b.D || 0) > (b.R || 0) ? 'D' : (b.R || 0) > (b.D || 0) ? 'R' : null;
  const cnt = o => `D ${o.D || 0} · R ${o.R || 0}${o.I ? ` · I ${o.I}` : ''}`;
  let txt = `Before: ${cnt(b)}`;
  if (!now.und) { const net = (now[side] || 0) - (b[side] || 0); txt += ` → after: ${cnt(now)} · <b style="color:${net > 0 ? 'var(--yes)' : net < 0 ? 'var(--no)' : 'var(--dim)'}">${PARTY[side].short} ${net > 0 ? '+' : net < 0 ? '−' : '±'}${Math.abs(net)}</b>`; }
  const proj = now.D >= need ? 'D' : now.R >= need ? 'R' : null;
  if (proj) txt += ` <span class="res-proj" style="color:${PARTY[proj].color}">✓ ${PARTY[proj].short} ${held === proj ? 'hold' : held ? 'take' : 'win'} ${what}</span>`;
  return txt;
}
// the big board: PROJECTION once a ticket's called electoral votes reach 270, drama while it stays close
function resBannerHTML(T) {
  const N = NIGHT, P = N.pres, t = T.pres;
  if (t.D >= 270 || t.R >= 270) {
    const w = t.D >= 270 ? 'D' : 'R', pj = resProjTime(P), re = w === P.inc && P.running;
    if (!N.fanfared) { N.fanfared = true; sfx.fanfare(); }
    return `<div class="res-banner" style="--pc:${PARTY[w].color}"><div class="res-blabel">★ Projection · ${clockText(pj ? pj.t : N.t)}${pj ? ` · ${stName(pj.code)} puts it over the top` : ''}</div>
      <div class="res-bhead">${P.names[w].toUpperCase()} ${re ? 'RE-ELECTED' : 'ELECTED'} PRESIDENT</div>
      <div class="res-bsub">${PARTY[w].name}${P.offices && P.offices[w] ? ` · ${P.offices[w]}` : ''} · ${t[w]} electoral votes${t.und ? ` with ${t.und} still out` : ` to ${t[other(w)]}`}${w !== P.inc ? ' · <b>the White House changes hands</b>' : re ? '' : ` · the ${PARTY[w].short} keep the White House`}</div></div>`;
  }
  const left = Object.entries(P.states).filter(([, s]) => N.t < s.call).sort((a, b) => b[1].ev - a[1].ev), lead = t.D >= t.R ? 'D' : 'R', trail = other(lead);
  if (N.t >= 1) return `<div class="res-banner close"><div class="res-blabel">Decision Desk</div><div class="res-bhead">DEADLOCK · ${t.D}–${t.R}</div>
    <div class="res-bsub">Nobody reaches 270. Under the Twelfth Amendment the House chooses the President, one vote per state delegation — and ${P.names[P.winner]} (${P.winner}) prevails.</div></div>`;
  if (N.t >= 0.5 && (left.length <= 12 || t.und <= 150)) {
    const need = 270 - t[lead], brink = left.length && need <= left[0][1].ev;
    return `<div class="res-banner close"><div class="res-blabel">Decision Desk · ${clockText(N.t)}</div><div class="res-bhead">${brink ? `ON THE BRINK · ${P.names[lead].toUpperCase()} IS ONE STATE AWAY` : 'TOO CLOSE TO CALL'}</div>
    <div class="res-bsub">${P.names[lead]} leads <b>${t[lead]}–${t[trail]}</b> and needs <b>${need}</b> of the ${t.und} electoral votes still out in ${left.length} state${left.length === 1 ? '' : 's'}: ${left.map(([c, s]) => `${c} (${s.ev})`).join(', ')}. ${P.names[trail]} needs ${270 - t[trail]}${270 - t[trail] > t.und ? ' — more than remain' : ''}.</div></div>`;
  }
  return '';
}
// popular vote vs. the Electoral College, turnout and the third-party share
function resPopCallout(P, t, d, r, i) {
  const N = NIGHT, tot = d + r + i || 1, ecW = t.D >= 270 ? 'D' : t.R >= 270 ? 'R' : null, pvW = d >= r ? 'D' : 'R', gap = Math.abs(d - r), pts = gap / tot * 100;
  const turn = `${N.t >= 1 ? 'Total turnout' : 'Votes counted so far'}: <b>${nfmt(d + r + i)}</b>${i ? ` · third party <b style="color:${PARTY.I.color}">${pct(i / tot * 100)}</b> (${P.names.I})` : ' · no third-party candidate of note'}`;
  let line;
  if (ecW && ecW !== pvW) line = `<span class="res-split">⚠ Split decision:</span> <b>${P.names[ecW]}</b> wins the Electoral College while losing the popular vote by <b>${nfmt(gap)}</b> votes (${pct(pts)}).`;
  else if (ecW) line = `<b>${P.names[ecW]}</b> wins the Electoral College <b>${t[ecW]}–${t[other(ecW)]}</b> and the popular vote by ${nfmt(gap)} votes (+${pts.toFixed(1)}).`;
  else if (N.t >= 1) line = `No ticket reaches 270; ${P.names[pvW]} leads the popular vote by ${nfmt(gap)} votes (${pct(pts)}).`;
  else line = `${P.names[pvW]} leads the popular vote by ${nfmt(gap)} (${pct(pts)}) with ${t.und} electoral votes still out.`;
  return `<div class="res-callout">${line}<br><small>${turn}</small></div>`;
}
// every call of the night so far, latest first
function resTickerHTML() {
  const N = NIGHT, rows = [], kind = { pres: 'PRES', senate: 'SEN', house: 'HOUSE', gov: 'GOV' };
  for (const tab of N.tabs) for (const c of contests(tab)) if (isCalled(c)) rows.push({ tab, c });
  rows.sort((a, b) => b.c.call - a.c.call);
  if (!rows.length) return `<div class="res-ticker"><div class="lh">Decision Desk</div><div class="nsub">Polls are still open in the East. The first calls come after 7 PM ET.</div></div>`;
  return `<div class="res-ticker"><div class="lh">Decision Desk · ${rows.length} call${rows.length === 1 ? '' : 's'} · latest first</div>${rows.map(({ tab, c }) => {
    let party, who, mg, flip;
    if (c.r) { party = c.r.wParty; who = `${c.r.wName} (${party})`; mg = resMarginTag(party, c.r.margin); flip = c.r.flip; }
    else if (tab === 'pres') { party = c.s.w; who = `${N.pres.names[party]} (${party})`; mg = `${resMarginTag(party, c.s.dPct - c.s.rPct)} · ${c.s.ev} EV`; }
    else { const ch = c.s.d - c.s.prevD; party = c.s.d > c.s.r ? 'D' : c.s.r > c.s.d ? 'R' : 'I'; who = `<span style="color:${PARTY.D.color}">${c.s.d}D</span>–<span style="color:${PARTY.R.color}">${c.s.r}R</span>`; mg = ch ? resMarginTag(ch > 0 ? 'D' : 'R', ch).replace('+', '+').replace(/\.\d/, '') : '<span style="color:var(--dim)">no change</span>'; flip = !!ch; }
    return `<div class="res-tick" data-tab-go="${tab}" data-code="${c.code}"><span class="res-tt">${clockText(c.call)}</span><span class="res-tk ${tab}">${kind[tab]}</span><span class="res-tb"><b style="color:${PARTY[party].color}">${stName(c.code)}</b> · ${who} · ${mg}${flip ? ' <span class="call flip">★ FLIP</span>' : ''}</span></div>`;
  }).join('')}</div>`;
}
// a sortable table. cols: [{ k, l, num }], rows: [{ code, cls, c: { k: { v (sort value), h (html) } } }], def: the default sort
function resTableHTML(cols, rows, sort, sel, def) {
  const keys = cols.map(c => c.k), s = sort && keys.includes(sort.k) ? sort : def || { k: keys[0], d: 1 };
  const val = r => r.c[s.k] ? r.c[s.k].v : null;
  const sorted = rows.slice().sort((a, b) => { const x = val(a), y = val(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * s.d; });
  return `<table class="res-table"><thead><tr>${cols.map(c => `<th data-sort="${c.k}" class="${c.num ? 'num' : ''} ${s.k === c.k ? (s.d > 0 ? 'asc' : 'desc') : ''}">${c.l}</th>`).join('')}</tr></thead>
    <tbody>${sorted.map(r => `<tr data-code="${r.code}" class="${sel === r.code ? 'on' : ''} ${r.cls || ''}">${cols.map(c => `<td class="${c.num ? 'num' : ''}">${r.c[c.k] ? r.c[c.k].h : '<span class="res-dash">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function resNightTable() {
  const N = NIGHT, tab = N.tab, L = contests(tab);
  const st = c => ({ v: stName(c.code), h: `<b>${c.code}</b> ${stName(c.code)}` }), num = (v, h) => ({ v, h: h == null ? String(v) : h });
  const pc = (p, v) => v == null ? null : num(v, `<span style="color:${PARTY[p].color}">${v.toFixed(1)}</span>`);
  const when = c => isCalled(c) ? num(c.call, clockText(c.call)) : num(2 + c.call, `<span style="color:var(--dim)">${N.t > c.call * 0.6 && Math.abs(marginOf(c)) < 5 ? 'too close' : 'waiting'} · ${Math.round(reporting(c) * 100)}% in</span>`);
  let cols, rows;
  if (tab === 'pres') {
    const P = N.pres;
    cols = [{ k: 'state', l: 'State' }, { k: 'ev', l: 'EV', num: 1 }, { k: 'd', l: 'D %', num: 1 }, { k: 'r', l: 'R %', num: 1 }].concat(P.names.I ? [{ k: 'i', l: 'I %', num: 1 }] : []).concat([{ k: 'margin', l: 'Margin', num: 1 }, { k: 'swing', l: `Swing${P.prev ? ` vs ${P.prev.year}` : ''}`, num: 1 }, { k: 'call', l: 'Called', num: 1 }]);
    rows = L.map(c => { const s = c.s, called = isCalled(c), m = s.dPct - s.rPct, prev = P.prev && P.prev.states ? P.prev.states[c.code] : null;
      return { code: c.code, cls: called ? '' : 'res-pending', c: { state: st(c), ev: num(s.ev), d: pc('D', s.dPct), r: pc('R', s.rPct), i: pc('I', s.iPct), margin: called ? num(m, resMarginTag(s.w, m)) : null, swing: called && prev != null ? num(m - prev, resSwing(m - prev)) : null, call: when(c) } }; });
  } else if (tab === 'house') {
    cols = [{ k: 'state', l: 'State' }, { k: 'n', l: 'Seats', num: 1 }, { k: 'd', l: 'D', num: 1 }, { k: 'r', l: 'R', num: 1 }, { k: 'dp', l: 'D %', num: 1 }, { k: 'rp', l: 'R %', num: 1 }, { k: 'ch', l: 'Change', num: 1 }, { k: 'call', l: 'Called', num: 1 }];
    rows = L.map(c => { const s = c.s, called = isCalled(c), ch = s.d - s.prevD;
      return { code: c.code, cls: called ? '' : 'res-pending', c: { state: st(c), n: num(s.n), d: called ? num(s.d, `<b style="color:${PARTY.D.color}">${s.d}</b>`) : null, r: called ? num(s.r, `<b style="color:${PARTY.R.color}">${s.r}</b>`) : null, dp: pc('D', s.dPct), rp: pc('R', s.rPct), ch: called ? num(ch, ch ? `<b style="color:${ch > 0 ? PARTY.D.color : PARTY.R.color}">${ch > 0 ? 'D' : 'R'} +${Math.abs(ch)}</b>` : '<span style="color:var(--dim)">—</span>') : null, call: when(c) } }; });
  } else {
    const anyI = L.some(c => (c.r.cands || []).some(x => x.party === 'I'));
    cols = [{ k: 'state', l: 'State' }].concat(tab === 'senate' ? [{ k: 'cls', l: 'Class', num: 1 }] : []).concat([{ k: 'd', l: 'D %', num: 1 }, { k: 'r', l: 'R %', num: 1 }]).concat(anyI ? [{ k: 'i', l: 'I %', num: 1 }] : []).concat([{ k: 'margin', l: 'Margin', num: 1 }, { k: 'flip', l: 'Seat', num: 1 }, { k: 'call', l: 'Called', num: 1 }]);
    rows = L.map(c => { const r = c.r, called = isCalled(c), by = p => (r.cands || []).find(x => x.party === p), rep = reporting(c), f = p => { const x = by(p); return x ? x.pct + (called ? 0 : (x === r.cands[0] ? -1 : 1) * (1 - rep) * 3 * Math.sin(r.call * 40)) : null; };
      return { code: c.code, cls: called ? '' : 'res-pending', c: { state: st(c), cls: r.cls != null ? num(r.cls) : null, d: pc('D', f('D')), r: pc('R', f('R')), i: pc('I', f('I')), margin: called ? num(r.margin, resMarginTag(r.wParty, r.margin)) : null, flip: called ? num(r.flip ? 1 : 0, r.flip ? '<span class="call flip">FLIP</span>' : `<span style="color:var(--dim)">${r.open ? 'open · hold' : 'hold'}</span>`) : null, call: when(c) } }; });
  }
  return resTableHTML(cols, rows, N.sort, N.sel, { k: 'call', d: 1 });
}
// a balance-of-power snake: one cell per seat sorted by margin (D left, R right, uncalled in the middle) with the control lines
function resSnakeHTML(cells, need, total, label) {
  const W = 1000, H = 30, w = W / total, side = p => p === 'D' ? 0 : p === 'I' ? 1 : p == null ? 2 : 3;
  const sorted = cells.slice().sort((a, b) => side(a.p) - side(b.p) || (a.p === 'R' ? a.m - b.m : b.m - a.m));
  const gap = total > 120 ? 0.25 : 1;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="res-snake" preserveAspectRatio="none">`;
  sorted.forEach((c, i) => { const col = c.p ? PARTY[c.p].color : '#3a4250', op = c.p ? (c.m >= 15 ? 1 : c.m >= 5 ? 0.75 : 0.5) : 1;
    svg += `<rect x="${(i * w).toFixed(2)}" y="4" width="${Math.max(0.6, w - gap).toFixed(2)}" height="22" fill="${col}" fill-opacity="${op}"${c.flip ? ' stroke="#f6d27a" stroke-width="1.3"' : ''}${c.code ? ` data-code="${c.code}" class="hit"><title>${c.title || stName(c.code)}</title></rect>` : '/>'}`; });
  const x = need * w;
  svg += `<line x1="${x}" x2="${x}" y1="0" y2="${H}" stroke="#fff" stroke-width="2"/><line x1="${W - x}" x2="${W - x}" y1="0" y2="${H}" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/></svg><div class="res-snakefoot">${label}</div>`;
  return `<div class="res-snakewrap">${svg}</div>`;
}
function resNightSnake(T) {
  const N = NIGHT, tab = N.tab, cells = [];
  const dot = p => `<span style="color:${PARTY[p].color};font-weight:800">`;
  if (tab === 'senate') {
    const up = new Set(N.races.map(r => r.code + ':' + r.cls));
    for (const m of N.prevMembers) if (!up.has(m.state + ':' + m.cls)) cells.push({ p: m.party, m: 99, code: m.state, title: `${stName(m.state)} (${m.party}) · not up this year` });
    for (const r of N.races) cells.push(isCalled(r) ? { p: r.wParty, m: r.margin, flip: r.flip, code: r.code, title: `${stName(r.code)}: ${r.wName} (${r.wParty}) +${r.margin.toFixed(1)}${r.flip ? ' · FLIP' : ''}` } : { p: null, m: 0, code: r.code, title: `${stName(r.code)}: not yet called` });
    const t = T.senate;
    return resSnakeHTML(cells, 51, 100, `${dot('D')}D ${t.D}</span>${t.I ? ` · ${dot('I')}I ${t.I}</span>` : ''} · ${t.und ? `${t.und} seat${t.und === 1 ? '' : 's'} uncalled` : 'all 100 seats accounted for'} · ${dot('R')}R ${t.R}</span> · 51 for control · seats sorted by margin, flips outlined in gold`);
  }
  if (tab === 'house') {
    for (const [code, s] of Object.entries(N.house.states)) {
      const called = N.t >= s.call, m = Math.abs(s.dPct - s.rPct), gain = s.d - s.prevD;
      for (let i = 0; i < s.n; i++) cells.push(called ? { p: i < s.d ? 'D' : 'R', m, code, flip: gain > 0 ? i >= s.prevD && i < s.d : i >= s.d && i < s.prevD, title: `${stName(code)}: ${s.d}D–${s.r}R${gain ? ` (${gain > 0 ? 'D' : 'R'} +${Math.abs(gain)})` : ''}` } : { p: null, m: 0, code, title: `${stName(code)}: ${s.n} seats, not yet called` });
    }
    const t = T.house;
    return resSnakeHTML(cells, 218, 435, `${dot('D')}D ${t.D}</span> · ${t.und ? `${t.und} seats uncalled` : 'all 435 seats called'} · ${dot('R')}R ${t.R}</span> · 218 for control · seats grouped by state and sorted by the state's margin, gains outlined in gold`);
  }
  if (tab === 'gov') {
    const up = new Set(N.gov.map(r => r.code));
    for (const [c, p] of Object.entries(N.govBefore || {})) if (!up.has(c)) cells.push({ p, m: 99, code: c, title: `${stName(c)} (${p}) · no race this year` });
    for (const r of N.gov) cells.push(isCalled(r) ? { p: r.wParty, m: r.margin, flip: r.flip, code: r.code, title: `${stName(r.code)}: ${r.wName} (${r.wParty}) +${r.margin.toFixed(1)}${r.flip ? ' · FLIP' : ''}` } : { p: null, m: 0, code: r.code, title: `${stName(r.code)}: not yet called` });
    const t = T.gov;
    return resSnakeHTML(cells, 26, 50, `${dot('D')}D ${t.D}</span> · ${t.und ? `${t.und} uncalled` : 'all 50 governors accounted for'} · ${dot('R')}R ${t.R}</span> · 26 is a majority of the nation's governors`);
  }
  return '';
}
