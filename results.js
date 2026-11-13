'use strict';
/* =====================================================================
   RESULTS — the election archive and the detailed results explorer
   (archiveElection, the Almanac in the Whip's Office via HOOKS.office,
   the full-results button on the morning-after summary via HOOKS.results).
   Loaded last, after night.js, whose tables, snakes and helpers it reuses.
   ===================================================================== */

const RES_REGIONS = {
  Northeast: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT', 'NJ', 'NY', 'PA'],
  Midwest: ['IL', 'IN', 'MI', 'OH', 'WI', 'IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  South: ['DE', 'MD', 'DC', 'VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'KY', 'TN', 'AL', 'MS', 'AR', 'LA', 'OK', 'TX'],
  West: ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY', 'AK', 'CA', 'HI', 'OR', 'WA'],
};
const RES_MAX = 12;
const resR1 = v => Math.round((+v || 0) * 10) / 10;
const resSigned = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d);
const resCountBy = o => { const c = { D: 0, R: 0, I: 0 }; for (const p of Object.values(o || {})) c[p] = (c[p] || 0) + 1; return c; };
const resCnt = o => o ? `D ${o.D || 0} · R ${o.R || 0}${o.I ? ` · I ${o.I}` : ''}` : '—';
const resNm = (nm, p) => `<b style="color:${PARTY[p].color}">${nm}</b>`;
ACH.push(['split', '⚖️', 'Split Decision', 'See a President elected while losing the popular vote.'], ['sweep40', '🗺️', 'Forty-State Sweep', 'See a ticket carry 40 or more states.'], ['almanac', '📚', 'Historian', 'Consult the Almanac.'], ['thirdway', '🟣', 'Third Way', 'See an independent presidential candidate carry a state.']);

/* ---------------- the archive ---------------- */
// one compact, JSON-safe record per election: percentages to one decimal, votes to integers.
// House districts: house.dist[code] = [[winner, D-positive margin, flags (1 flip, 2 open seat), previous margin, lean, winner's name, loser's name (flips only)], ...]
function resBuildRecord(nd) {
  const P = nd.pres, r1 = resR1;
  const pres = P ? {
    states: Object.fromEntries(Object.entries(P.states).map(([c, s]) => [c, [r1(s.dPct), r1(s.rPct), r1(s.iPct || 0)]])),
    evD: P.evD, evR: P.evR, evI: P.evI || 0, popD: Math.round(P.popD), popR: Math.round(P.popR), popI: Math.round(P.popI || 0), names: P.names, winner: P.winner, inc: P.inc, running: !!P.running, third: P.third || null,
    prev: P.prev ? { year: P.prev.year, states: P.prev.states } : null, homes: P.homes || null, vps: P.vps || null, offices: P.offices || null, houseVote: P.houseVote || null,
  } : null;
  const senate = { before: nd.before || null, after: { D: seats('D'), R: seats('R'), I: seats('I') }, races: (nd.races || []).map(r => {
    const o = { code: r.code, cls: r.cls, wParty: r.wParty, wName: r.wName, lParty: r.lParty, lName: r.lName, wPct: r1(r.wPct), lPct: r1(r.lPct), margin: r1(r.margin), flip: !!r.flip, open: !!r.open, threeWay: !!r.threeWay, inc: r.incumbent || null };
    if (r.cands && r.cands[2]) o.c3 = [r.cands[2].party, r.cands[2].name, r1(r.cands[2].pct)];
    return o;
  }) };
  const H = nd.house || {}, hp = (H.popD || 0) + (H.popR || 0);
  const house = { before: H.before || null, after: { D: S.house.D, R: S.house.R }, byState: Object.fromEntries(Object.entries(H.states || {}).map(([c, s]) => [c, [s.d, s.n, s.prevD, r1(s.dPct), r1(s.rPct)]])), pop: hp ? [r1(H.popD / hp * 98.4), r1(H.popR / hp * 98.4)] : null };
  if (H.districts) house.dist = Object.fromEntries(Object.entries(H.districts).map(([c, L]) => [c, L.map(x => { const a = [x.w, r1(x.m), (x.flip ? 1 : 0) + (x.open ? 2 : 0), x.prev == null ? null : r1(x.prev), r1(x.lean), x.w === 'D' ? x.dName : x.rName]; if (x.flip) a.push(x.w === 'D' ? x.rName : x.dName); return a; })]));
  const gov = (nd.gov || []).map(r => ({ code: r.code, wParty: r.wParty, wName: r.wName, lParty: r.lParty, lName: r.lName, wPct: r1(r.wPct), lPct: r1(r.lPct), margin: r1(r.margin), flip: !!r.flip, open: !!r.open, inc: r.incumbent || null }));
  return { year: nd.year, side: S.side, wave: r1(nd.wave), waveSignal: r1(nd.waveSignal), president: { name: S.president.name, party: S.president.party, terms: S.president.terms || 1 }, pres, senate, house, gov,
    govBefore: nd.govBefore ? resCountBy(nd.govBefore) : null, govAfter: resCountBy(Object.fromEntries(Object.entries(S.governors || {}).map(([c, g]) => [c, g.party]))),
    campaign: S.lastCampaign && S.lastCampaign.year === nd.year ? S.lastCampaign : null, conventions: S.conventions && S.conventions.year === nd.year ? S.conventions : null,
    midterm: S.lastMidterm && S.lastMidterm.year === nd.year ? S.lastMidterm : null };
}
function archiveElection(nd) {
  try {
    const rec = resBuildRecord(nd);
    S.archive = (S.archive || []).filter(r => r && r.year !== rec.year).concat([rec]);
    if (S.archive.length > RES_MAX) S.archive.splice(0, S.archive.length - RES_MAX);
    if (rec.pres) {
      if (resPvWinner(rec.pres) !== rec.pres.winner) unlock('split');
      if (Object.keys(rec.pres.states).filter(c => c !== 'DC' && resPresW(rec.pres, c) === rec.pres.winner).length >= 40) unlock('sweep40');
      if (rec.pres.evI) unlock('thirdway');
    }
    const sb = rec.senate.before;
    if (rec.midterm && sb && rec.president.party === rec.side && (rec.senate.after[rec.side] || 0) > (sb[rec.side] || 0)) unlock('midmaestro');
  } catch (e) { console.error('archiveElection failed', e); }
}
// the record for a night's data: the archived one if it is there, otherwise a fresh one
function resRecordFor(nd) { return (S.archive || []).find(r => r && r.year === nd.year) || resBuildRecord(nd); }

HOOKS.results.push({
  html: () => '<button class="btn ghost" id="fullres">📊 Full results</button>',
  bind: (nd, back) => { const el = $('#fullres'); if (el) el.onclick = () => resExplorer(resRecordFor(nd), back); },
});
HOOKS.office.push({
  html: () => '',
  button: () => '<button class="btn" id="almanac" data-office-extra>📚 The Almanac</button>',
  bind: draw => { const el = $('#almanac'); if (el) el.onclick = () => resAlmanac(draw); },
});

/* ---------------- reading a record ---------------- */
const resPresM = (P, c) => P.states[c] ? P.states[c][0] - P.states[c][1] : null;           // D-positive margin (swings are D-vs-R)
const resPresW = (P, c) => { const s = P.states[c]; return s ? (s[2] > s[0] && s[2] > s[1] ? 'I' : s[0] > s[1] ? 'D' : 'R') : null; };
const resPresWM = (P, c) => { const s = P.states[c]; if (!s) return null; const v = s.slice(0, 3).sort((a, b) => b - a); return v[0] - v[1]; }; // the winner's margin
const resPresShade = (P, c) => { const w = resPresW(P, c); if (!w) return null; const s = shade(w, resPresWM(P, c)); return { c: s.fill, op: s.op }; };
const resEV = P => ({ D: P.evD || 0, R: P.evR || 0, I: P.evI || 0 });
// the tickets by electoral votes, most first (the third only if it had a candidate); the runner-up; the popular-vote winner
const resEvOrder = P => { const e = resEV(P); return ['D', 'R', 'I'].filter(p => p !== 'I' || (P.names.I && (e.I || P.popI))).sort((a, b) => e[b] - e[a]); };
const resRunner = P => resEvOrder(P).find(p => p !== P.winner) || other(P.winner);
const resPvWinner = P => { const v = { D: P.popD, R: P.popR, I: P.popI || 0 }; return ['D', 'R', 'I'].sort((a, b) => v[b] - v[a])[0]; };
// the electoral-vote line, winner first (or, when nobody reached 270, most to fewest)
const resEvTxt = P => { const e = resEV(P), o = resEvOrder(P), w = P.winner; return (resDeadlocked(P) ? o : [w].concat(o.filter(p => p !== w))).map(p => e[p]).filter((v, i) => i < 2 || v).join('–'); };
function resPresTip(P) {
  let ev = 0;
  for (const c of Object.keys(P.states).filter(c => resPresW(P, c) === P.winner).sort((a, b) => resPresWM(P, b) - resPresWM(P, a))) { ev += EV[c] || 0; if (ev >= 270) return c; }
  return null;
}
function resPresBells(P) {
  const tot = P.popD + P.popR + (P.popI || 0) || 1, nat = (P.popD - P.popR) / tot * 100, natI = (P.popI || 0) / tot * 100, off = c => Math.abs(resPresM(P, c) - nat) + Math.abs(P.states[c][2] - natI);
  return Object.keys(P.states).filter(c => resPresW(P, c) === P.winner && off(c) < 1.5).sort((a, b) => off(a) - off(b)).slice(0, 4);
}
const resPresClosest = (P, n = 10) => Object.keys(P.states).sort((a, b) => resPresWM(P, a) - resPresWM(P, b)).slice(0, n);
const resSwingOf = (P, c) => P.prev && P.prev.states && P.prev.states[c] != null ? resPresM(P, c) - P.prev.states[c] : null;
const resMaj = o => (o.D || 0) > (o.R || 0) ? 'D' : (o.R || 0) > (o.D || 0) ? 'R' : null;
const resThirdName = P => `${P.names.I}${P.third && P.third.label && P.third.label !== 'Independent' ? ` (${P.third.label})` : ' (I)'}`;
// the headline of a record, for the explorer and the Almanac
function resHeadline(R) {
  if (R.pres) {
    const P = R.pres, w = P.winner, re = w === P.inc && P.running, big = resEV(P)[w];
    if (resDeadlocked(P)) return `${P.names[w]} ${re ? 're-elected' : 'elected'} by the House after ${P.evD === 269 && P.evR === 269 ? 'a 269–269 deadlock' : 'no one won 270'}`;
    if (w === 'I') return `Independent ${P.names.I} wins the White House, ${resEvTxt(P)}`;
    return `${P.names[w]} ${big >= 400 ? 'wins in a landslide' : re ? 're-elected' : 'elected President'}, ${resEvTxt(P)}`;
  }
  const b = R.senate.before || {}, a = R.senate.after, was = resMaj(b), now = resMaj(a);
  if (!R.senate.races.length && !(a.D || a.R)) return `${R.year}: no detailed results on record`;
  return now ? `${PARTY[now].short} ${was === now ? 'hold' : 'take'} the Senate, ${a.D}–${a.R}${a.I ? `–${a.I}` : ''}` : `Senate deadlocked ${a.D}–${a.R}`;
}
// a full 538-vote count that nobody won outright (the House chose), and how the state delegations voted
const resDeadlocked = P => { const e = resEV(P); return e.D + e.R + e.I === 538 && e.D < 270 && e.R < 270 && e.I < 270; };
const resHouseTxt = P => { const hv = P.houseVote; if (!hv) return ''; const w = P.winner, l = w === 'D' ? 'R' : 'D', tied = 50 - hv.D - hv.R; return hv[w] > hv[l] ? `${hv[w]} delegations to ${hv[l]}${tied ? `, ${tied} split` : ''}` : `the delegations split ${hv.D}–${hv.R}${tied ? ` with ${tied} tied` : ''}`; };
// two or three sentences of narrative for a record's presidential race
function resNarrative(R) {
  const P = R.pres, w = P.winner, E = resEV(P), evW = E[w], re = w === P.inc && P.running;
  const carried = Object.keys(P.states).filter(c => resPresW(P, c) === w).length, tot = P.popD + P.popR + (P.popI || 0) || 1, V = { D: P.popD, R: P.popR, I: P.popI || 0 };
  const pvW = resPvWinner(P), pvL = ['D', 'R', 'I'].filter(p => p !== pvW).sort((a, b) => V[b] - V[a])[0], gap = V[pvW] - V[pvL], pts = gap / tot * 100, tip = resPresTip(P), closest = resPresClosest(P, 1)[0];
  const iw = Object.keys(P.states).filter(c => resPresW(P, c) === 'I');
  const out = [], who = `${P.names[w]}${P.offices && P.offices[w] ? `, the ${P.offices[w].replace(/^President$/, 'sitting President')},` : ''}`;
  const how = w === 'I' ? (re ? 'won a second term as an independent' : 'broke the two-party lock on the White House') : re ? 'won a second term' : w === P.inc ? `kept the White House for the ${PARTY[w].short}` : `took the White House from the ${PARTY[P.inc].short}`;
  if (resDeadlocked(P)) out.push(`${who} ${how} without winning the Electoral College: ${P.evD === 269 && P.evR === 269 ? 'it deadlocked at <b>269–269</b>' : `nobody reached 270 (<b>${resEvOrder(P).map(p => `${P.names[p]} ${E[p]}`).join(', ')}</b>)`}, and under the Twelfth Amendment the House of Representatives chose the President, one vote per state delegation${P.houseVote ? ` (${resHouseTxt(P)})` : ''}. ${P.names[w]} carried ${carried} of 51 contests on the night.`);
  else out.push(`${who} ${how} with <b>${evW} electoral votes</b> to ${resEvOrder(P).filter(p => p !== w && (p !== 'I' || E.I)).map(p => `${P.names[p]}'s ${E[p]}`).join(' and ')}, carrying ${carried} of 51 contests${evW >= 400 ? ' — a landslide by any measure' : evW < 290 ? ' in a race that went down to the wire' : ''}.`);
  if (pvW !== w) out.push(`The popular vote went the other way: ${P.names[pvW]} drew <b>${nfmt(gap)} more votes</b> than ${P.names[pvL]} (${pts.toFixed(1)} points) and still lost — a split decision that will be argued about for years.`);
  else out.push(`The popular vote margin was ${nfmt(gap)} votes, ${pts.toFixed(1)} points, out of ${nfmt(tot)} cast${P.popI && w !== 'I' ? `; ${resThirdName(P)} took ${(P.popI / tot * 100).toFixed(1)}%` : ''}.`);
  if (iw.length && w !== 'I') out.push(`${resThirdName(P)} carried <b>${iw.length} state${iw.length > 1 ? 's' : ''}</b> (${iw.map(c => stName(c)).join(', ')}) for ${E.I} electoral votes — the strongest third-party showing in living memory.`);
  if (tip) out.push(`The tipping point was <b>${stName(tip)}</b> (${EV[tip]} EV), carried by ${resPresWM(P, tip).toFixed(1)}${closest !== tip ? `; the closest state of all was ${stName(closest)}, decided by ${resPresWM(P, closest).toFixed(1)}` : ''}.`);
  const sw = Object.keys(P.states).map(c => [c, resSwingOf(P, c)]).filter(x => x[1] != null).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (sw.length) { const nat = Object.keys(P.states).reduce((a, c) => a + (resSwingOf(P, c) || 0) * (EV[c] || 0), 0) / 538; out.push(`Against ${P.prev.year}, the map swung ${nat >= 0 ? 'D' : 'R'}+${Math.abs(nat).toFixed(1)} on average; the biggest lurch came in ${stName(sw[0][0])} (${sw[0][1] >= 0 ? 'D' : 'R'}+${Math.abs(sw[0][1]).toFixed(1)}).`); }
  for (const p of ['D', 'R', 'I']) if (P.names[p] && P.homes && P.homes[p] && P.states[P.homes[p]] && resPresW(P, P.homes[p]) !== p) out.push(`${P.names[p]} ${p === w ? 'won the White House but' : 'even'} lost ${P.homes[p] === 'DC' ? 'the District' : stName(P.homes[p])}, ${p === w ? 'the' : 'their own'} home state.`);
  return out.map(t => `<p>${t}</p>`).join('');
}

// older or partial records: fill in whatever the explorer expects, so nothing below has to check
function resNorm(r) {
  const o = { ...r }, cand = x => ({ wPct: 0, lPct: 0, margin: 0, lName: '—', lParty: other(x.wParty || 'D'), wName: '—', wParty: 'D', ...x });
  o.side = o.side || S.side;
  o.senate = { before: null, after: { D: 0, R: 0, I: 0 }, races: [], ...(o.senate || {}) };
  o.senate.after = o.senate.after || { D: 0, R: 0, I: 0 }; o.senate.races = (o.senate.races || []).map(cand);
  o.house = { before: null, after: { D: 0, R: 0 }, byState: {}, pop: null, ...(o.house || {}) };
  o.house.after = o.house.after || { D: 0, R: 0 }; o.house.byState = o.house.byState || {};
  if (o.house.dist && typeof o.house.dist !== 'object') o.house.dist = null;
  o.gov = (o.gov || []).map(cand);
  o.president = o.president || { name: S.president.name, party: S.president.party, terms: S.president.terms || 1 };
  if (o.pres) {
    const p = { states: {}, evD: 0, evR: 0, evI: 0, popD: 0, popR: 0, popI: 0, winner: 'D', inc: 'D', ...o.pres };
    p.names = { D: '—', R: '—', ...(o.pres.names || {}) };
    p.states = Object.fromEntries(Object.entries(p.states || {}).filter(([c, s]) => EV[c] && Array.isArray(s) && s.length >= 2).map(([c, s]) => [c, [+s[0] || 0, +s[1] || 0, +s[2] || 0]]));
    if (!['D', 'R', 'I'].includes(p.winner) || (p.winner === 'I' && !p.names.I)) p.winner = p.evD >= p.evR ? 'D' : 'R';
    if (!['D', 'R', 'I'].includes(p.inc)) p.inc = p.winner;
    if (p.inc === 'I' && !p.names.I) p.names.I = '—';
    o.pres = Object.keys(p.states).length ? p : null;
  }
  return o;
}

/* ---------------- the explorer ---------------- */
let RESX = null;
function resExplorer(rec, back) {
  if (!rec) { if (back) back(); return; }
  rec = resNorm(rec);
  const tabs = [rec.pres && 'pres', 'senate', 'house', rec.gov && rec.gov.length && 'gov', (rec.campaign || rec.conventions || rec.midterm) && 'campaign', 'table'].filter(Boolean);
  RESX = { rec, tabs, tab: tabs[0], sort: null, sel: null, hf: 'all', back, pdAt: Date.now() }; // pdAt: the click that trails the opening tap must not count
  let el = $('#night');
  if (!el) { el = document.createElement('div'); el.id = 'night'; document.body.appendChild(el); }
  hideModal(); el.classList.remove('hidden');
  el.onpointerdown = resXEvent; el.onclick = resXEvent;
  resXRender();
}
function resXEvent(e) {
  const X = RESX; if (!X) return;
  // a tap fires pointerdown and then click, and the pointerdown re-renders, so the click lands on a fresh node: act once.
  // Clicks are still honored on their own (keyboard activation, or a browser that never sent the pointerdown).
  if (e.type === 'click' && Date.now() - X.pdAt < 700) return;
  const t = e.target.closest('[data-rtab],[data-sort],[data-hf],[data-code],#ndone,#resback');
  if (!t) return;
  if (e.type === 'pointerdown') X.pdAt = Date.now();
  if (t.id === 'ndone' || t.id === 'resback') return resXClose();
  if (t.dataset.rtab) { X.tab = t.dataset.rtab; X.sel = null; sfx.click(); }
  else if (t.dataset.hf) { if (t.dataset.hf === 'nosel') X.sel = null; else X.hf = t.dataset.hf; sfx.click(); }
  else if (t.dataset.sort) { const k = t.dataset.sort; X.sort = X.sort && X.sort.k === k ? { k, d: -X.sort.d } : { k, d: k === 'state' ? 1 : -1 }; sfx.click(); }
  else if (t.dataset.code) { X.sel = X.sel === t.dataset.code ? null : t.dataset.code; sfx.click(); }
  resXRender();
}
function resXClose() {
  const X = RESX; RESX = null;
  const el = $('#night'); if (el) { el.onclick = null; el.classList.add('hidden'); }
  if (X && X.back) X.back();
}
function resXRender() {
  const X = RESX, R = X.rec, names = { pres: 'President', senate: 'Senate', house: 'House', gov: 'Governors', campaign: 'Campaign', table: 'Table' };
  // scroll positions survive a re-render, keyed by pane (data-keep) where one is named, else by position
  const key = (el, i) => el.dataset.keep || i, keep = {}; [...document.querySelectorAll('#night .res-scroll')].forEach((el, i) => keep[key(el, i)] = el.scrollTop);
  const body = ({ pres: resXPres, senate: resXSenate, house: resXHouse, gov: resXGov, campaign: resXCampaign, table: resXTable })[X.tab](R, X);
  $('#night').innerHTML = `<div class="nwrap res-x">
    <div class="nhead"><div><div class="kicker">Full results · November ${R.year} · ${R.pres ? 'Presidential year' : 'Midterms'}${R.side ? ` · you whipped for the ${PARTY[R.side].short}` : ''}</div><h2>${resHeadline(R)}</h2></div>
      <div class="ntabs res-xtabs">${X.tabs.map(t => `<button class="btn ${X.tab === t ? 'on' : ''}" data-rtab="${t}">${names[t]}</button>`).join('')}</div>
      <div class="res-hbtns"><button class="btn primary adv" id="ndone">← Back</button></div></div>
    ${body}
    <div class="res-back"><button class="btn primary big adv" id="resback">← Back</button></div></div>`;
  [...document.querySelectorAll('#night .res-scroll')].forEach((el, i) => { const k = keep[key(el, i)]; if (k != null) el.scrollTop = k; });
}
const resCard = (title, html, cls = '') => `<div class="res-card ${cls}">${title ? `<div class="lh">${title}</div>` : ''}${html}</div>`;
const resKpi = (label, value, sub = '') => `<div class="res-kpi"><small>${label}</small><b>${value}</b>${sub ? `<i>${sub}</i>` : ''}</div>`;
const resRow = (code, left, right, on) => `<div class="res-row ${on ? 'on' : ''}" data-code="${code}">${left}<span class="mg">${right}</span></div>`;
const resPv = (dn, d, rn, r, i, iLabel) => { const tot = d + r + (i || 0) || 1; return `<div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">${dn} ${pct(d / tot * 100)}</div>${i ? `<div style="width:${i / tot * 100}%;background:${PARTY.I.color}" title="${iLabel || ''}">${i / tot >= 0.07 ? pct(i / tot * 100) : ''}</div>` : ''}<div style="width:${r / tot * 100}%;background:${PARTY.R.color}">${pct(r / tot * 100)} ${rn}</div></div>`; };
function resSelDetail(R, code) {
  if (!code) return '';
  const P = R.pres, bits = [];
  if (P && P.states[code]) { const s = P.states[code], w = resPresW(P, code), sw = resSwingOf(P, code); bits.push(`<b>President</b> · ${EV[code]} EV · ${resNm(P.names[w], w)} ${resMarginTag(w, resPresWM(P, code))} · D ${pct(s[0])} · R ${pct(s[1])}${s[2] ? ` · I ${pct(s[2])}` : ''}${sw != null ? ` · swing ${resSwing(sw)} since ${P.prev.year}` : ''}`); }
  for (const r of R.senate.races.filter(r => r.code === code)) bits.push(`<b>Senate${r.cls != null ? ` (Class ${r.cls})` : ''}</b> · ${resNm(r.wName, r.wParty)} ${pct(r.wPct)} def. ${r.lName} (${r.lParty}) ${pct(r.lPct)}${r.c3 ? ` and ${r.c3[1]} (${r.c3[0]}) ${pct(r.c3[2])}` : ''} · ${r.flip ? '<span class="call flip">FLIP</span>' : r.open ? 'open seat held' : 'hold'}`);
  const h = R.house.byState && R.house.byState[code], hf = resDists({ dist: { [code]: (R.house.dist || {})[code] || [] } }).filter(x => x.flip);
  if (h && h[1]) bits.push(`<b>House</b> · ${h[1]} seat${h[1] > 1 ? 's' : ''}: <b style="color:${PARTY.D.color}">${h[0]} D</b> – <b style="color:${PARTY.R.color}">${h[1] - h[0]} R</b>${h[0] !== h[2] ? ` · ${h[0] > h[2] ? 'D' : 'R'} +${Math.abs(h[0] - h[2])}` : ' · no change'}${h[3] != null ? ` · D ${pct(h[3])} · R ${pct(h[4])}` : ''}${hf.length ? ` · flips: ${hf.map(x => `<b style="color:${PARTY[x.w].color}">${x.id}</b>`).join(', ')}` : ''}`);
  for (const g of (R.gov || []).filter(g => g.code === code)) bits.push(`<b>Governor</b> · ${resNm(g.wName, g.wParty)} ${pct(g.wPct)} def. ${g.lName} (${g.lParty}) ${pct(g.lPct)} · ${g.flip ? '<span class="call flip">FLIP</span>' : 'hold'}`);
  return resCard(`${stName(code)} · ${leanLabel(stLean(code))}`, bits.length ? `<div class="res-list">${bits.map(b => `<div class="res-row" data-code="${code}"><span>${b}</span></div>`).join('')}</div>` : '<div class="nsub">No contest here this year.</div>');
}

/* ---- President ---- */
function resXPres(R, X) {
  const P = R.pres, w = P.winner, E = resEV(P), tip = resPresTip(P), bells = resPresBells(P), tot = P.popD + P.popR + (P.popI || 0) || 1, ord = resEvOrder(P), others = ord.filter(p => p !== w);
  const V = { D: P.popD, R: P.popR, I: P.popI || 0 }, pvW = resPvWinner(P), pvL = ['D', 'R', 'I'].filter(p => p !== pvW).sort((a, b) => V[b] - V[a])[0], gap = V[pvW] - V[pvL], pts = gap / tot * 100;
  const iw = Object.keys(P.states).filter(c => resPresW(P, c) === 'I');
  const map = usMap({ cls: 'res-map',
    fill: c => resPresShade(P, c),
    sub: c => { const sw = resSwingOf(P, c); return P.states[c] ? `${EV[c]}${sw != null ? ` ${sw >= 0 ? 'D' : 'R'}+${Math.abs(sw).toFixed(0)}` : ''}` : ''; },
    ring: c => X.sel === c ? '#fff' : c === tip ? '#f6d27a' : null,
    attr: c => P.states[c] ? `data-code="${c}"` : '',
    title: c => P.states[c] ? `${stName(c)}: ${P.names[resPresW(P, c)]} +${resPresWM(P, c).toFixed(1)} · ${EV[c]} EV${c === tip ? ' · tipping point' : ''}` : stName(c) });
  const carried = Object.keys(P.states).filter(c => resPresW(P, c) === w).length;
  const closest = resPresClosest(P, 10);
  const swings = Object.keys(P.states).map(c => [c, resSwingOf(P, c)]).filter(x => x[1] != null).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);
  const regions = Object.entries(RES_REGIONS).map(([name, codes]) => { let d = 0, r = 0, i = 0, ev = { D: 0, R: 0, I: 0 }; for (const c of codes) { const s = P.states[c]; if (!s) continue; const pop = POP[c] || 1; d += s[0] * pop; r += s[1] * pop; i += s[2] * pop; ev[resPresW(P, c)] += EV[c] || 0; } return { name, d, r, i, ev }; });
  const evLine = `${E[w]} electoral votes to ${others.filter(p => p !== 'I' || E.I).map(p => E[p]).join(' and ')}`;
  const tag = (c) => resMarginTag(resPresW(P, c), resPresWM(P, c));
  const left = `${resCard('', `<div class="res-h" style="color:${PARTY[w].color}">${P.names[w].toUpperCase()} ${w === P.inc && P.running ? 'RE-ELECTED' : 'ELECTED'} PRESIDENT</div><div class="res-dek">${w === 'I' ? `<b style="color:${PARTY.I.color}">${P.third && P.third.label && P.third.label !== 'Independent' ? P.third.label : 'Independent'}</b> · ` : ''}${resDeadlocked(P) ? `${P.evD === 269 && P.evR === 269 ? '269–269' : `no majority (${resEvTxt(P)})`} · chosen by the House${P.houseVote ? `: ${resHouseTxt(P)}` : ''}` : evLine} · ${carried} of 51 contests · ${pvW === w ? 'won the popular vote' : '<span class="res-split">lost the popular vote</span>'} by ${pts.toFixed(1)} points</div>${map}<div class="nsub">Shade = margin · labels: electoral votes${P.prev ? ` and the swing since ${P.prev.year}` : ''} · gold ring: the tipping-point state${iw.length ? ` · <span style="color:${PARTY.I.color}">purple: carried by ${P.names.I}</span>` : ''} · click a state</div>`)}
    ${resCard('Electoral College', barChart(`${P.names.D} vs ${P.names.R}${E.I ? ` vs ${P.names.I}` : ''}`, { D: E.D, R: E.R, I: E.I, und: 0 }, 538, 270, '270 to win', '', true) + `<div class="res-kpis">${resKpi('Tipping point', tip ? stName(tip) : '—', tip ? `${EV[tip]} EV · ${resPresW(P, tip)} +${resPresWM(P, tip).toFixed(1)}` : 'no majority')}${resKpi('Closest state', stName(closest[0]), `${resPresW(P, closest[0])} +${resPresWM(P, closest[0]).toFixed(1)}`)}${resKpi('States carried', `${carried}–${51 - carried}`, 'of 50 states + DC')}${resKpi('Turnout', nfmt(tot), 'votes cast')}${P.popI ? resKpi('Third party', pct(P.popI / tot * 100), `${resThirdName(P)}${E.I ? ` · ${E.I} EV` : ''}`) : resKpi('Third party', '—', 'none of note')}</div>`)}
    ${resCard('Popular vote', resPv(P.names.D, P.popD, P.names.R, P.popR, P.popI, P.names.I) + `<div class="res-callout">${pvW !== w ? `<span class="res-split">⚠ Split decision:</span> <b>${P.names[w]}</b> wins the White House while ${P.names[pvW]} wins the popular vote by <b>${nfmt(gap)}</b> votes (${pts.toFixed(1)} points).` : `<b>${P.names[w]}</b> wins both the Electoral College and the popular vote, by ${nfmt(gap)} votes (${pts.toFixed(1)} points).`}<br><small>${nfmt(P.popD)} D · ${nfmt(P.popR)} R${P.popI ? ` · ${nfmt(P.popI)} I` : ''}</small></div>`)}
    ${resCard('Regional popular vote', `<div class="res-regions">${regions.map(g => `<div class="res-region"><b>${g.name}</b>${resPv('D', g.d, 'R', g.r, g.i)}<span style="color:${PARTY.D.color}">D ${g.ev.D} EV</span> · <span style="color:${PARTY.R.color}">R ${g.ev.R} EV</span>${g.ev.I ? ` · <span style="color:${PARTY.I.color}">I ${g.ev.I} EV</span>` : ''}</div>`).join('')}</div><div class="nsub">Shares weighted by state population.</div>`)}`;
  const right = `${resSelDetail(R, X.sel)}${resCard('The story', `<div class="res-narr">${resNarrative(R)}</div>`)}
    ${iw.length ? resCard(`States carried by ${resThirdName(P)} · ${iw.length}`, `<div class="res-list">${iw.sort((a, b) => EV[b] - EV[a]).map(c => resRow(c, `<span><b>${c}</b> ${stName(c)} · ${EV[c]} EV · ${pct(P.states[c][2])} to D ${pct(P.states[c][0])}, R ${pct(P.states[c][1])}</span>`, tag(c), X.sel === c)).join('')}</div>`) : ''}
    ${resCard('The 10 states that decided it', `<div class="res-list">${closest.map(c => resRow(c, `<span><b>${c}</b> ${stName(c)} · ${EV[c]} EV${c === tip ? '<span class="res-tag">TIPPING POINT</span>' : ''}${bells.includes(c) ? '<span class="res-tag">BELLWETHER</span>' : ''}</span>`, tag(c), X.sel === c)).join('')}</div>`)}
    ${swings.length ? resCard(`Biggest swings since ${P.prev.year}`, `<div class="res-list">${swings.map(([c, sw]) => resRow(c, `<span><b>${c}</b> ${stName(c)} · now ${tag(c)}</span>`, resSwing(sw), X.sel === c)).join('')}</div>`) : resCard('Swings', '<div class="nsub">The first presidential election on record: swings appear from the next one.</div>')}
    ${resCard('Bellwethers', bells.length ? `<div class="res-chips">${bells.map(c => `<span class="res-chip ${X.sel === c ? 'on' : ''}" data-code="${c}">${stName(c)} · ${resPresW(P, c)} +${resPresWM(P, c).toFixed(1)}</span>`).join('')}</div><div class="nsub">States that voted with the winner and mirrored the national popular vote within a point and a half.</div>` : '<div class="nsub">No state mirrored the national vote this time.</div>')}
    ${resCard('Home turf', `<div class="res-list">${['D', 'R', 'I'].filter(p => P.names[p] && (p !== 'I' || (P.homes && P.homes.I))).map(p => `<div class="res-row" ${P.homes && P.homes[p] ? `data-code="${P.homes[p]}"` : ''}><span>${resNm(P.names[p], p)}${P.offices && P.offices[p] ? ` · ${P.offices[p]}` : ''}<br><small style="color:var(--dim)">home: ${P.homes && P.homes[p] ? stName(P.homes[p]) : 'unknown'}${P.vps && P.vps[p] ? ` · running mate ${P.vps[p].name}${P.vps[p].state ? ` of ${stName(P.vps[p].state)}` : ''}` : ''}</small></span><span class="mg">${P.homes && P.homes[p] && P.states[P.homes[p]] ? (resPresW(P, P.homes[p]) === p ? '<span style="color:var(--yes)">carried home</span>' : '<span style="color:var(--no)">lost at home</span>') : ''}</span></div>`).join('')}</div>`)}
    ${resWaveCard(R)}`;
  return `<div class="res-grid"><div class="res-col">${left}</div><div class="res-col">${right}</div></div>`;
}
function resWaveCard(R) {
  if (R.wave == null || R.waveSignal == null) return '';
  const side = R.side || S.side, sgnTxt = v => `${v >= 0 ? PARTY[side].short : PARTY[other(side)].short} +${Math.abs(v).toFixed(1)}`;
  const miss = R.wave - R.waveSignal;
  return resCard('The wave vs. the forecast', `<div class="res-wave"><div class="pc"><small>Forecasters saw</small><b>${sgnTxt(R.waveSignal)}</b></div><div class="pc"><small>It was</small><b style="color:${R.wave >= 0 ? 'var(--yes)' : 'var(--no)'}">${sgnTxt(R.wave)}</b></div><div class="nsub" style="flex:1;min-width:180px">${Math.abs(miss) < 1.5 ? 'The forecast was on the money.' : Math.abs(miss) < 4 ? `The polls missed by ${Math.abs(miss).toFixed(1)} points${miss > 0 ? ', in your favor' : ', against you'}.` : `A ${Math.abs(miss).toFixed(1)}-point polling miss${miss > 0 ? ' that broke your way' : ' that landed on your party'} — the kind pollsters write post-mortems about.`}</div></div>`);
}

/* ---- Senate ---- */
function resSeatSnake(before, after, wins, need, total, label) {
  // seats not up this year sit at the edges; the seats decided this year are sorted by margin
  const cells = [];
  for (const p of ['D', 'I', 'R']) { const n = Math.max(0, (after[p] || 0) - wins.filter(x => x.p === p).length); for (let i = 0; i < n; i++) cells.push({ p, m: 99 }); }
  for (const x of wins) cells.push(x);
  while (cells.length < total) cells.push({ p: null, m: 0 });
  return resSnakeHTML(cells.slice(0, total), need, total, label);
}
function resXSenate(R, X) {
  const Sn = R.senate, races = Sn.races, flips = races.filter(r => r.flip), three = races.filter(r => r.threeWay), b = Sn.before || {}, a = Sn.after;
  const by = Object.fromEntries(races.map(r => [r.code, r]));
  const map = usMap({ cls: 'res-map', fill: c => { const r = by[c]; if (!r) return null; const s = shade(r.wParty, r.margin); return { c: s.fill, op: s.op }; }, sub: c => by[c] ? (by[c].flip ? 'FLIP' : by[c].open ? 'open' : '') : '', ring: c => X.sel === c ? '#fff' : by[c] && by[c].flip ? '#f6d27a' : null, attr: c => by[c] ? `data-code="${c}"` : '', title: c => by[c] ? `${stName(c)}: ${by[c].wName} (${by[c].wParty}) +${by[c].margin.toFixed(1)}${by[c].flip ? ' · FLIP' : ''}` : `${stName(c)}: no Senate race` });
  const net = (a[R.side] || 0) - (b[R.side] || 0), was = resMaj(b), now = resMaj(a);
  const st = c => ({ v: stName(c), h: `<b>${c}</b> ${stName(c)}` }), num = (v, h) => ({ v, h: h == null ? String(v) : h });
  const pc = (r, p) => { const v = r.wParty === p ? r.wPct : r.lParty === p ? r.lPct : r.c3 && r.c3[0] === p ? r.c3[2] : null; return v == null ? null : num(v, `<span style="color:${PARTY[p].color}">${v.toFixed(1)}</span>`); };
  const cols = [{ k: 'state', l: 'State' }, { k: 'cls', l: 'Class', num: 1 }, { k: 'winner', l: 'Winner' }, { k: 'd', l: 'D %', num: 1 }, { k: 'r', l: 'R %', num: 1 }].concat(three.length ? [{ k: 'i', l: 'I %', num: 1 }] : []).concat([{ k: 'margin', l: 'Margin', num: 1 }, { k: 'seat', l: 'Seat', num: 1 }]);
  const rows = races.map(r => ({ code: r.code, c: { state: st(r.code), cls: r.cls != null ? num(r.cls) : null, winner: { v: r.wName, h: resNm(r.wName, r.wParty) }, d: pc(r, 'D'), r: pc(r, 'R'), i: pc(r, 'I'), margin: num(r.margin, resMarginTag(r.wParty, r.margin)), seat: num(r.flip ? 2 : r.open ? 1 : 0, r.flip ? '<span class="call flip">FLIP</span>' : `<span style="color:var(--dim)">${r.open ? 'open · hold' : 'hold'}</span>`) } }));
  const left = `${resCard('', `<div class="res-h">${now ? `${PARTY[now].short.toUpperCase()} ${was === now ? 'HOLD' : 'TAKE'} THE SENATE` : 'A SENATE DEADLOCK'}</div><div class="res-dek">${races.length} seats up · ${flips.length} flipped · ${Sn.before ? `${resCnt(b)} → ` : ''}<b>${resCnt(a)}</b>${Sn.before ? ` · ${PARTY[R.side].short} ${resSigned(net, 0)}` : ''}</div>${map}<div class="nsub">Seats up this year · gold ring and FLIP: seats that changed hands · click a state</div>`)}
    ${resCard('Balance of power', resSeatSnake(b, a, races.map(r => ({ p: r.wParty, m: r.margin, flip: r.flip, code: r.code, title: `${stName(r.code)}: ${r.wName} (${r.wParty}) +${r.margin.toFixed(1)}` })), 51, 100, `<span style="color:${PARTY.D.color};font-weight:800">D ${a.D}</span>${a.I ? ` · <span style="color:${PARTY.I.color};font-weight:800">I ${a.I}</span>` : ''} · <span style="color:${PARTY.R.color};font-weight:800">R ${a.R}</span> · 51 for control · seats decided this year sorted by margin, flips outlined in gold`))}
    ${resCard(`Every race · ${races.length}`, `<div class="res-scroll">${resTableHTML(cols, rows, X.sort, X.sel, { k: 'margin', d: 1 })}</div>`)}`;
  const right = `${resSelDetail(R, X.sel)}${resCard(`Seats that flipped · ${flips.length}`, flips.length ? `<div class="res-list">${flips.sort((x, y) => x.margin - y.margin).map(r => resRow(r.code, `<span><b>${r.code}</b> ${stName(r.code)} · ${resNm(r.wName, r.wParty)} ${r.open ? 'takes the open seat' : `unseats ${r.lName}`}</span>`, resMarginTag(r.wParty, r.margin), X.sel === r.code)).join('')}</div>` : '<div class="nsub">Not a single seat changed hands.</div>')}
    ${resCard('Closest Senate races', `<div class="res-list">${races.slice().sort((x, y) => x.margin - y.margin).slice(0, 8).map(r => resRow(r.code, `<span><b>${r.code}</b> ${stName(r.code)} · ${resNm(r.wName, r.wParty)} over ${r.lName}</span>`, resMarginTag(r.wParty, r.margin), X.sel === r.code)).join('')}</div>`)}
    ${three.length ? resCard(`Three-way races · ${three.length}`, `<div class="res-list">${three.map(r => resRow(r.code, `<span><b>${r.code}</b> ${stName(r.code)} · ${resNm(r.wName, r.wParty)} ${pct(r.wPct)}, ${r.lName} (${r.lParty}) ${pct(r.lPct)}${r.c3 ? `, ${r.c3[1]} (${r.c3[0]}) ${pct(r.c3[2])}` : ''}</span>`, r.wParty === 'I' ? '<span style="color:' + PARTY.I.color + '">independent wins</span>' : 'split field', X.sel === r.code)).join('')}</div>`) : ''}
    ${resWaveCard(R)}`;
  return `<div class="res-grid"><div class="res-col">${left}</div><div class="res-col">${right}</div></div>`;
}

/* ---- House ---- */
const resDistId = (c, n, len) => len === 1 ? `${c}-AL` : `${c}-${String(n).padStart(2, '0')}`;
const resLeanTxt = l => l == null ? '—' : Math.abs(l) < 0.5 ? 'EVEN' : `${l > 0 ? 'D' : 'R'}+${Math.abs(l).toFixed(0)}`;
// a record's districts, flattened: { c, id, w, m (D-positive), flip, open, prev, lean, name, loser }
function resDists(H) {
  const out = [];
  for (const [c, L] of Object.entries(H.dist || {})) if (Array.isArray(L)) L.forEach((a, i) => { if (Array.isArray(a) && (a[0] === 'D' || a[0] === 'R')) out.push({ c, id: resDistId(c, i + 1, L.length), w: a[0], m: +a[1] || 0, flip: !!(a[2] & 1), open: !!(a[2] & 2), prev: a[3] == null ? null : +a[3], lean: a[4] == null ? null : +a[4], name: a[5] || '—', loser: a[6] || null }); });
  return out;
}
function resXHouse(R, X) {
  const H = R.house, b = H.before || {}, a = H.after, was = resMaj(b), now = resMaj(a), by = H.byState || {}, all = resDists(H);
  const map = usMap({ cls: 'res-map', fill: c => { const s = by[c]; if (!s || !s[1]) return null; const sh = s[0] / s[1]; return { c: sh > 0.5 ? PARTY.D.color : sh < 0.5 ? PARTY.R.color : '#8a8fa0', op: 0.35 + Math.abs(sh - 0.5) * 1.3 }; }, sub: c => by[c] && by[c][1] ? `${by[c][0]}–${by[c][1] - by[c][0]}` : '', ring: c => X.sel === c ? '#fff' : (all.length ? all.some(x => x.c === c && x.flip) : by[c] && by[c][0] !== by[c][2]) ? '#f6d27a' : null, attr: c => by[c] && by[c][1] ? `data-code="${c}"` : '', title: c => by[c] && by[c][1] ? `${stName(c)}: ${by[c][0]} D – ${by[c][1] - by[c][0]} R` : stName(c) });
  const st = c => ({ v: stName(c), h: `<b>${c}</b> ${stName(c)}` }), num = (v, h) => ({ v, h: h == null ? String(v) : h });
  const gains = Object.entries(by).map(([c, s]) => [c, s[0] - s[2]]).filter(x => x[1]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
  const net = (a[R.side] || 0) - (b[R.side] || 0);
  let cells = [];
  if (all.length) cells = all.map(x => ({ p: x.w, m: Math.abs(x.m), code: x.c, flip: x.flip, title: `${x.id}: ${x.name} (${x.w}) +${Math.abs(x.m).toFixed(1)}${x.flip ? ' · FLIP' : ''}` }));
  else for (const [c, s] of Object.entries(by).sort((x, y) => (y[1][3] || 0) - (y[1][4] || 0) - ((x[1][3] || 0) - (x[1][4] || 0)))) { const m = Math.abs((s[3] || 0) - (s[4] || 0)), gain = s[0] - s[2]; for (let i = 0; i < s[1]; i++) cells.push({ p: i < s[0] ? 'D' : 'R', m, code: c, flip: gain > 0 ? i >= s[2] && i < s[0] : i >= s[0] && i < s[2], title: `${stName(c)}: ${s[0]}D–${s[1] - s[0]}R` }); }
  const flips = all.filter(x => x.flip), fl = p => flips.filter(x => x.w === p).length, beaten = flips.filter(x => !x.open), opens = all.filter(x => x.open), closest = all.slice().sort((x, y) => Math.abs(x.m) - Math.abs(y.m))[0];
  const kpis = all.length ? `<div class="res-kpis hd-kpis">${resKpi('Pickups', `<span style="color:${PARTY.D.color}">D +${fl('D')}</span> · <span style="color:${PARTY.R.color}">R +${fl('R')}</span>`, `${flips.length} seats changed hands`)}${resKpi('Incumbents defeated', beaten.length, `${beaten.filter(x => x.w === 'R').length} D · ${beaten.filter(x => x.w === 'D').length} R`)}${resKpi('Open seats', opens.length, `${opens.filter(x => x.flip).length} flipped`)}${closest ? resKpi('Closest race', closest.id, `${closest.w} +${Math.abs(closest.m).toFixed(1)}`) : ''}</div>` : '';
  const left = `${resCard('', `<div class="res-h">${now ? `${PARTY[now].short.toUpperCase()} ${was === now ? 'KEEP' : 'WIN'} THE HOUSE` : 'HOUSE DEADLOCKED'}</div><div class="res-dek">All 435 seats · ${H.before ? `${resCnt(b)} → ` : ''}<b>${resCnt(a)}</b>${H.before ? ` · ${PARTY[R.side].short} ${resSigned(net, 0)}` : ''} · ${all.length ? `${flips.length} seats flipped` : `${gains.length} states shifted`}</div>${map}<div class="nsub">Labels: D–R seats · gold ring: ${all.length ? 'a seat changed hands' : 'delegation changed'} · click a state for its districts</div>${kpis}`)}
    ${resCard('Balance of power', resSnakeHTML(cells, 218, 435, `<span style="color:${PARTY.D.color};font-weight:800">D ${a.D}</span> · <span style="color:${PARTY.R.color};font-weight:800">R ${a.R}</span> · 218 for control · ${all.length ? 'every district sorted by margin' : 'seats grouped by state, sorted by the state\'s margin'}, gains outlined in gold`))}
    ${H.pop ? resCard('National House vote', resPv('Democrats', H.pop[0], 'Republicans', H.pop[1]) + `<div class="nsub">Two-party share of all House ballots; ${H.pop[0] > H.pop[1] ? 'Democrats' : 'Republicans'} led by ${Math.abs(H.pop[0] - H.pop[1]).toFixed(1)} points and ${(now && (H.pop[0] > H.pop[1]) === (now === 'D')) ? 'won the chamber' : 'still lost the chamber'}.</div>`) : ''}
    ${resCard(`Seats changed by state · ${gains.length}`, gains.length ? `<div class="res-list">${gains.map(([c, g]) => resRow(c, `<span><b>${c}</b> ${stName(c)} · now ${by[c][0]}D–${by[c][1] - by[c][0]}R${all.length ? ` <small style="color:var(--dim)">${all.filter(x => x.c === c && x.flip).map(x => x.id).join(', ')}</small>` : ''}</span>`, `<b style="color:${g > 0 ? PARTY.D.color : PARTY.R.color}">${g > 0 ? 'D' : 'R'} +${Math.abs(g)}</b>`, X.sel === c)).join('')}</div>` : '<div class="nsub">Every state sent back the same split.</div>')}`;
  if (!all.length) {
    // an older record without districts: the state-by-state table
    const cols = [{ k: 'state', l: 'State' }, { k: 'n', l: 'Seats', num: 1 }, { k: 'd', l: 'D', num: 1 }, { k: 'r', l: 'R', num: 1 }, { k: 'dp', l: 'D %', num: 1 }, { k: 'rp', l: 'R %', num: 1 }, { k: 'ch', l: 'Change', num: 1 }];
    const rows = Object.entries(by).filter(([, s]) => s[1]).map(([c, s]) => { const ch = s[0] - s[2]; return { code: c, c: { state: st(c), n: num(s[1]), d: num(s[0], `<b style="color:${PARTY.D.color}">${s[0]}</b>`), r: num(s[1] - s[0], `<b style="color:${PARTY.R.color}">${s[1] - s[0]}</b>`), dp: s[3] != null ? num(s[3], `<span style="color:${PARTY.D.color}">${s[3].toFixed(1)}</span>`) : null, rp: s[4] != null ? num(s[4], `<span style="color:${PARTY.R.color}">${s[4].toFixed(1)}</span>`) : null, ch: num(ch, ch ? `<b style="color:${ch > 0 ? PARTY.D.color : PARTY.R.color}">${ch > 0 ? 'D' : 'R'} +${Math.abs(ch)}</b>` : '<span style="color:var(--dim)">—</span>') } }; });
    return `<div class="res-grid"><div class="res-col">${left}</div><div class="res-col">${resSelDetail(R, X.sel)}${resCard('State by state', `<div class="res-scroll">${resTableHTML(cols, rows, X.sort, X.sel, { k: 'n', d: -1 })}</div>`)}</div></div>`;
  }
  // upsets: seats won against the district's lean (or, without one, the narrowest flips)
  const against = x => x.lean == null ? -Math.abs(x.m) : (x.w === 'D' ? -x.lean : x.lean);
  const upsets = flips.slice().sort((x, y) => against(y) - against(x)).slice(0, 8);
  const mine = X.sel ? all.filter(x => x.c === X.sel) : [];
  const seatTag = x => x.flip ? `<span class="call flip">${x.w} FLIP</span>` : x.open ? '<span class="hd-open">OPEN</span>' : '<span class="hd-inc">HOLD</span>';
  const hf = X.hf || 'all', keep = x => (!X.sel || x.c === X.sel) && (hf === 'flips' ? x.flip : hf === 'close' ? Math.abs(x.m) < 5 : hf === 'open' ? x.open : true), shown = all.filter(keep);
  const cols = [{ k: 'dist', l: 'District' }, { k: 'win', l: 'Winner' }, { k: 'margin', l: 'Margin', num: 1 }, { k: 'swing', l: 'Swing', num: 1 }, { k: 'lean', l: 'Lean', num: 1 }, { k: 'seat', l: 'Seat', num: 1 }];
  const rows = shown.map(x => ({ code: x.c, cls: x.flip ? 'hd-fliprow' : '', c: { dist: { v: x.id, h: `<b>${x.id}</b>` }, win: { v: x.name, h: `${resNm(x.name, x.w)}${x.flip && x.loser ? ` <small style="color:var(--dim)">${x.open ? 'over' : 'def.'} ${x.loser}</small>` : ''}` }, margin: num(Math.abs(x.m), hdTag(x.w, x.m)), swing: x.prev != null ? num(x.m - x.prev, resSwing(x.m - x.prev)) : null, lean: x.lean != null ? num(x.lean, `<span style="color:${x.lean >= 0 ? PARTY.D.color : PARTY.R.color}">${resLeanTxt(x.lean)}</span>`) : null, seat: num(x.flip ? 2 : x.open ? 1 : 0, seatTag(x)) } }));
  const chips = `<div class="hd-filters">${[['all', `All ${all.length}`], ['flips', `Flips ${flips.length}`], ['close', `Within 5 pts ${all.filter(x => Math.abs(x.m) < 5).length}`], ['open', `Open seats ${opens.length}`]].map(([k, l]) => `<span class="res-chip ${hf === k ? 'on' : ''}" data-hf="${k}">${l}</span>`).join('')}${X.sel ? `<span class="res-chip on" data-hf="nosel">✕ ${stName(X.sel)} only</span>` : '<small style="color:var(--dim)">click a row or a state to see one state</small>'}</div>`;
  const right = `${resSelDetail(R, X.sel)}${mine.length ? resCard(`${stName(X.sel)} · ${mine.length} district${mine.length > 1 ? 's' : ''}`, `<div class="res-scroll hd-list" data-keep="hx-${X.sel}">${mine.map(x => `<div class="hd-row ${x.flip ? 'flip' : ''}"><span class="hd-id">${x.id}</span><span class="hd-who">${resNm(x.name, x.w)} <small>${x.flip ? (x.loser ? `${x.open ? 'over' : 'unseats'} ${x.loser}` : 'pickup') : x.open ? 'open seat' : 'incumbent'} · lean ${resLeanTxt(x.lean)}</small></span><span class="hd-mg">${hdTag(x.w, x.m)}${seatTag(x)}</span></div>`).join('')}</div>`) : ''}
    ${resCard(`Biggest upsets · ${upsets.length}`, upsets.length ? `<div class="res-list">${upsets.map(x => resRow(x.c, `<span><b>${x.id}</b> · ${resNm(x.name, x.w)} ${x.open ? 'takes an open seat' : `unseats ${x.loser || 'the incumbent'}`}<br><small style="color:var(--dim)">a ${resLeanTxt(x.lean)} district</small></span>`, hdTag(x.w, x.m), X.sel === x.c)).join('')}</div>` : '<div class="nsub">Not one seat changed hands.</div>')}
    ${resCard(`Every district · ${shown.length}`, `${chips}<div class="res-scroll" data-keep="hx-table">${resTableHTML(cols, rows, X.sort, X.sel, { k: 'dist', d: 1 })}</div>`)}`;
  return `<div class="res-grid"><div class="res-col">${left}</div><div class="res-col">${right}</div></div>`;
}

/* ---- Governors ---- */
function resXGov(R, X) {
  const G = R.gov || [], by = Object.fromEntries(G.map(g => [g.code, g])), flips = G.filter(g => g.flip), b = R.govBefore, a = R.govAfter;
  const map = usMap({ cls: 'res-map', fill: c => { const g = by[c]; if (!g) return null; const s = shade(g.wParty, g.margin); return { c: s.fill, op: s.op }; }, sub: c => by[c] ? (by[c].flip ? 'FLIP' : by[c].open ? 'open' : '') : '', ring: c => X.sel === c ? '#fff' : by[c] && by[c].flip ? '#f6d27a' : null, attr: c => by[c] ? `data-code="${c}"` : '', title: c => by[c] ? `${stName(c)}: Gov.-elect ${by[c].wName} (${by[c].wParty}) +${by[c].margin.toFixed(1)}` : `${stName(c)}: no governor's race` });
  const st = c => ({ v: stName(c), h: `<b>${c}</b> ${stName(c)}` }), num = (v, h) => ({ v, h: h == null ? String(v) : h });
  const cols = [{ k: 'state', l: 'State' }, { k: 'winner', l: 'Winner' }, { k: 'loser', l: 'Runner-up' }, { k: 'w', l: 'Win %', num: 1 }, { k: 'margin', l: 'Margin', num: 1 }, { k: 'seat', l: 'Office', num: 1 }];
  const rows = G.map(g => ({ code: g.code, c: { state: st(g.code), winner: { v: g.wName, h: resNm(g.wName, g.wParty) }, loser: { v: g.lName, h: `${g.lName} <span style="color:var(--dim)">(${g.lParty})</span>` }, w: num(g.wPct, pct(g.wPct)), margin: num(g.margin, resMarginTag(g.wParty, g.margin)), seat: num(g.flip ? 2 : g.open ? 1 : 0, g.flip ? '<span class="call flip">FLIP</span>' : `<span style="color:var(--dim)">${g.open ? 'open · hold' : g.inc ? 're-elected' : 'hold'}</span>`) } }));
  const left = `${resCard('', `<div class="res-h">${G.length} GOVERNORS' RACES</div><div class="res-dek">${flips.length} flipped${b ? ` · ${resCnt(b)} → <b>${resCnt(a)}</b>` : a ? ` · now ${resCnt(a)}` : ''}</div>${map}<div class="nsub">Shade = margin · gold ring and FLIP: a mansion that changed parties · click a state</div>`)}
    ${a ? resCard('The nation\'s governors', resSnakeHTML([].concat(...['D', 'I', 'R'].map(p => Array.from({ length: Math.max(0, (a[p] || 0) - G.filter(g => g.wParty === p).length) }, () => ({ p, m: 99 })))).concat(G.map(g => ({ p: g.wParty, m: g.margin, flip: g.flip, code: g.code, title: `${stName(g.code)}: ${g.wName} (${g.wParty}) +${g.margin.toFixed(1)}` }))), 26, 50, `<span style="color:${PARTY.D.color};font-weight:800">D ${a.D}</span> · <span style="color:${PARTY.R.color};font-weight:800">R ${a.R}</span> · 26 is a majority of the 50 governors · races decided this year sorted by margin`)) : ''}`;
  const right = `${resSelDetail(R, X.sel)}${resCard(`Mansions that flipped · ${flips.length}`, flips.length ? `<div class="res-list">${flips.map(g => resRow(g.code, `<span><b>${g.code}</b> ${stName(g.code)} · ${resNm(g.wName, g.wParty)} ${g.open ? 'wins the open seat' : `unseats Gov. ${g.lName}`}</span>`, resMarginTag(g.wParty, g.margin), X.sel === g.code)).join('')}</div>` : '<div class="nsub">No governorship changed hands.</div>')}
    `;
  return `<div class="res-grid"><div class="res-col">${left}${resCard('Every race', `<div class="res-scroll">${resTableHTML(cols, rows, X.sort, X.sel, { k: 'margin', d: 1 })}</div>`)}</div><div class="res-col">${right}</div></div>`;
}

/* ---- Campaign (presidential years with a recorded fall campaign and conventions; midterm years go to resXMidterm) ---- */
// render whatever shape another module recorded, without assuming its fields
function resAny(x) {
  if (x == null) return '';
  if (typeof x !== 'object') return `<p>${x}</p>`;
  if (Array.isArray(x)) return x.map(resAny).join('');
  const head = x.title || x.name || x.headline || x.lbl || x.label || x.text || x.t || '';
  const rest = Object.entries(x).filter(([k, v]) => v != null && v !== head && typeof v !== 'object' && !/^(id|year)$/.test(k)).map(([k, v]) => `<span><small style="color:var(--dim)">${k}</small> ${typeof v === 'number' ? (Math.abs(v) < 20 && !Number.isInteger(v) ? v.toFixed(1) : v) : v}</span>`).join(' · ');
  return `<div class="res-debrow"><span>${head ? `<b>${head}</b>${rest ? '<br>' : ''}` : ''}${rest}</span></div>`;
}
const RES_STRAT = { rust: 'the Rust Belt', sun: 'the Sun Belt', expand: 'expand the map', base: 'turn out the base' };
// the fall campaign's poll tracker, drawn with a y-axis that fits the race (lineChart's fixed 20–80 scale flattens it)
function resPollChart(polls, side, names) {
  const pts = (polls || []).filter(p => p && p.me != null && p.them != null), n = pts.length;
  if (n < 2) return '';
  const narrow = window.innerWidth < 640, W = narrow ? 380 : 640, H = narrow ? 180 : 210, pl = narrow ? 34 : 36, pr = narrow ? 120 : 118, pt = 16, pb = 30, fs = narrow ? 11.5 : 10, fe = narrow ? 13 : 11.5;
  const vals = pts.flatMap(p => [+p.me, +p.them]);
  let lo = Math.floor((Math.min(...vals) - 3) / 5) * 5, hi = Math.ceil((Math.max(...vals) + 3) / 5) * 5;
  if (hi - lo < 20) { const mid = (hi + lo) / 2; lo = Math.floor((mid - 10) / 5) * 5; hi = lo + 20; }
  const x = i => pl + i * (W - pl - pr) / (n - 1), y = v => pt + (hi - v) / (hi - lo) * (H - pt - pb);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="lchart res-pollchart">`;
  for (let v = lo; v <= hi; v += 5) svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 50 ? '#9aa3b2' : '#2a3242'}" stroke-dasharray="${v === 50 ? '4 3' : ''}"/><text x="${pl - 6}" y="${y(v) + 4}" font-size="${fs}" fill="#6b7587" text-anchor="end">${v}%</text>`;
  pts.forEach((p, i) => { if (narrow && n > 5 && (n - 1 - i) % 2) return; svg += `<text x="${x(i)}" y="${H - 8}" font-size="${fs}" fill="#9aa3b2" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${String(p.short || p.lbl || '').slice(0, 14)}</text>`; });
  const series = [{ k: 'me', color: PARTY[side].color, label: names[side] }, { k: 'them', color: PARTY[other(side)].color, label: names[other(side)] }];
  const last = pts[n - 1], ends = series.map(s => y(+last[s.k]));
  if (Math.abs(ends[0] - ends[1]) < 15) { const d = (15 - Math.abs(ends[0] - ends[1])) / 2; if (ends[0] <= ends[1]) { ends[0] -= d; ends[1] += d; } else { ends[0] += d; ends[1] -= d; } }
  series.forEach((s, si) => {
    svg += `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" points="${pts.map((p, i) => `${x(i)},${y(+p[s.k])}`).join(' ')}"/>`;
    pts.forEach((p, i) => { svg += `<circle cx="${x(i)}" cy="${y(+p[s.k])}" r="${i === n - 1 ? 4.5 : 2.5}" fill="${s.color}"><title>${p.lbl || ''}: ${s.label} ${(+p[s.k]).toFixed(1)}%</title></circle>`; });
    svg += `<text x="${W - pr + 8}" y="${ends[si] + 4}" font-size="${fe}" fill="${s.color}" font-weight="800">${s.label} ${(+last[s.k]).toFixed(1)}%</text>`;
  });
  return svg + '</svg>';
}
// a debate as campaign.js records it: { round: 1|2|'vp', city, mine, theirs, prep, theirPrep, result, winner, snap, gaffeMine, gaffeTheirs }
function resDebateRow(d, side, nm) {
  const res = d.result == null ? '' : ` · <b style="color:${d.result > 0 ? 'var(--yes)' : d.result < 0 ? 'var(--no)' : 'var(--dim)'}">${resSigned(+d.result)}</b> for your ticket`;
  const verdict = d.winner && PARTY[d.winner] ? `<b style="color:${PARTY[d.winner].color}">${nm(d.winner)} won</b>${d.snap ? ` (${d.snap}% in the snap poll)` : ''}` : 'a draw';
  const plan = k => k ? String(k).charAt(0).toUpperCase() + String(k).slice(1) : '?';
  if (d.round === 'vp') return `<div class="res-debrow"><span><b>The running mates' debate</b>${d.city ? ` · ${d.city}` : ''}<br>${d.gaffeMine ? 'Your running mate gaffed. ' : ''}${d.gaffeTheirs ? 'Their running mate gaffed. ' : ''}${verdict}${res}</span></div>`;
  return `<div class="res-debrow"><span><b>${d.round === 1 ? 'First' : d.round === 2 ? 'Second' : 'The'} debate</b>${d.city ? ` · ${d.city}` : ''}<br>Your plan: ${plan(d.mine)}${d.prep ? ' (prepped)' : ''} · theirs: ${plan(d.theirs)}${d.theirPrep ? ' (prepped)' : ''} · ${verdict}${res}</span></div>`;
}
// an October surprise as campaign.js records it: { title, choice, effect, result }
function resEventRow(e) {
  if (!e || typeof e !== 'object' || !e.title) return resAny(e);
  return `<div class="res-debrow"><span><b>${e.title}</b>${e.choice ? `<br>Your call: <i>${e.choice}</i>` : ''}${e.effect ? ` · ${e.effect}` : ''}${e.result ? `<br><small style="color:var(--dim)">${e.result}</small>` : ''}</span></div>`;
}
function resXCampaign(R, X) {
  if (R.midterm && !R.campaign) return resXMidterm(R, X);
  const C = R.campaign, V = R.conventions, side = R.side || S.side, P = R.pres;
  const cards = [];
  const nm = p => { const full = (C && C.tickets && C.tickets[p] && C.tickets[p].name) || (P && P.names && P.names[p]) || PARTY[p].short; return String(full).includes(' ') ? lastName({ name: String(full) }) : String(full); };
  if (C && Array.isArray(C.polls) && C.polls.length > 1) {
    const me = C.polls.map(p => +p.me || 0), them = C.polls.map(p => +p.them || 0);
    cards.push(resCard('The poll tracker', (resPollChart(C.polls, side, { D: nm('D'), R: nm('R') }) || lineChart([{ pts: me, color: PARTY[side].color, label: PARTY[side].short }, { pts: them, color: PARTY[other(side)].color, label: PARTY[other(side)].short }])) + `<div class="res-chips">${C.polls.map((p, i) => `<span class="res-chip">${p.lbl || `Round ${i + 1}`}: ${(+p.me || 0).toFixed(0)}–${(+p.them || 0).toFixed(0)}</span>`).join('')}</div>${P ? `<div class="nsub">Final polls: your ticket ${me[me.length - 1].toFixed(0)}–${them[them.length - 1].toFixed(0)}. Result: ${P.names[side]} ${(P[side === 'D' ? 'popD' : 'popR'] / (P.popD + P.popR + (P.popI || 0) || 1) * 100).toFixed(1)}% of the vote.</div>` : ''}`));
  }
  if (V && (V.D || V.R)) cards.push(resCard('The conventions', `<div class="res-conv">${['D', 'R'].map(p => { const c = V[p]; if (!c) return ''; const vp = c.vp && typeof c.vp === 'object' ? c.vp.name : c.vp; return `<div class="res-convcard" style="border-color:${PARTY[p].color}"><h4 style="color:${PARTY[p].color}">${PARTY[p].name} convention${c.city ? ` · ${c.city}` : ''}</h4>${P ? `<p>Nominee: <b>${P.names[p]}</b>${vp ? ` · running mate <b>${vp}</b>${c.vp && c.vp.state ? ` (${c.vp.state})` : ''}` : ''}</p>` : vp ? `<p>Running mate: <b>${vp}</b></p>` : ''}${c.bounce != null ? `<p>Bounce: <b style="color:${c.bounce >= 0 ? 'var(--yes)' : 'var(--no)'}">${resSigned(+c.bounce)}</b> nationally</p>` : ''}${c.unity != null ? `<p>Unity: <b>${Math.round(+c.unity * 100)}%</b> ${+c.unity >= 0.9 ? '· a united party' : +c.unity >= 0.7 ? '· some grumbling' : '· an open feud'}</p>` : ''}${Array.isArray(c.planks) && c.planks.length ? `<p>Platform: ${c.planks.map(k => k && k.tag && TAG[k.tag] ? `${TAG[k.tag][0]} ${k.dir > 0 ? 'more' : 'less'} ${TAG[k.tag][1]}` : resAny(k)).join(' · ')}</p>` : ''}${c.theme && TAG[c.theme] ? `<p>Message: ${TAG[c.theme][0]} ${TAG[c.theme][1]}</p>` : ''}${c.keynote ? `<p>Keynote: ${typeof c.keynote === 'object' ? c.keynote.name || '' : c.keynote}</p>` : ''}${Array.isArray(c.events) && c.events.length ? `<p><small style="color:var(--dim)">${c.events.map(e => typeof e === 'string' ? e : e && (e.text || e.title || e.t) || '').filter(Boolean).join(' · ')}</small></p>` : ''}</div>`; }).join('')}</div>`));
  if (C && Array.isArray(C.debates) && C.debates.length) cards.push(resCard('The debates', `<div class="res-deb">${C.debates.map(d => d && typeof d === 'object' && d.round != null ? resDebateRow(d, side, nm) : resAny(d)).join('')}</div>`));
  if (C && Array.isArray(C.events) && C.events.length) cards.push(resCard('October surprises and campaign events', `<div class="res-deb">${C.events.map(resEventRow).join('')}</div>`));
  if (C && (C.strategy || C.theme)) cards.push(resCard('Strategy', `<p class="res-narr">${C.strategy ? `Strategy: <b>${typeof C.strategy === 'object' ? resAny(C.strategy) : RES_STRAT[C.strategy] || C.strategy}</b>. ` : ''}${C.theme ? `Message: <b>${TAG[C.theme] ? `${TAG[C.theme][0]} ${TAG[C.theme][1]}` : C.theme}</b>.` : ''}</p>`));
  cards.push(resWaveCard(R));
  if (!cards.filter(Boolean).length) cards.push(resCard('', '<div class="res-empty">No campaign was recorded for this election.</div>'));
  const half = Math.ceil(cards.length / 2);
  return `<div class="res-grid"><div class="res-col">${cards.slice(0, half).join('')}</div><div class="res-col">${cards.slice(half).join('')}</div></div>`;
}

/* ---- Campaign, midterm years: the record midterm.js leaves in S.lastMidterm ---- */
const RES_MID_STRAT = { defend: 'Defend the seats you hold', offense: 'Go on offense', nationalize: 'Nationalize the midterms', localize: 'All politics is local' };
function resXMidterm(R, X) {
  const M = R.midterm || {}, side = M.side || R.side || S.side, theirs = other(side), O = M.opp || {}, Sn = R.senate, cards = [];
  const tg = t => TAG[t] ? `${TAG[t][0]} ${TAG[t][1]}` : (t || '—'), strat = k => RES_MID_STRAT[k] || k || '—', arr = a => Array.isArray(a) ? a.filter(x => x && typeof x === 'object') : [];
  const polls = arr(M.polls).filter(p => p.seats != null), b = Sn.before || {}, a = Sn.after || {}, net = (a[side] || 0) - (b[side] || 0);
  if (polls.length) {
    const chart = typeof midSeatChart === 'function' ? midSeatChart(polls, side, { need: M.need || 51 }) : '';
    cards.push(resCard('The Senate tracker', `${chart}<div class="res-chips">${polls.map(p => `<span class="res-chip">${p.short || p.lbl}: ${(+p.seats).toFixed(1)} seats${p.gb != null ? ` · GB ${(+p.gb).toFixed(1)}%` : ''}</span>`).join('')}</div>
      <div class="nsub">Seats the ${PARTY[side].name} campaign was projected to hold, round by round, with ${M.need || 51} needed for control. Final forecast ~${(+(M.seatsProjected != null ? M.seatsProjected : polls[polls.length - 1].seats)).toFixed(1)}; they ended with <b>${a[side] || 0}</b>.</div>`));
  }
  cards.push(resCard('The outcome', `<div class="res-wave mid-out"><div class="pc"><small>${PARTY[side].short} before</small><b>${b[side] != null ? b[side] : '—'}</b></div><div class="pc"><small>After</small><b style="color:${net > 0 ? 'var(--yes)' : net < 0 ? 'var(--no)' : 'var(--ink)'}">${a[side] || 0}</b></div><div class="pc"><small>Net</small><b>${net > 0 ? '+' : net < 0 ? '−' : '±'}${Math.abs(net)}</b></div><div class="pc"><small>House seats</small><b>${R.house.after ? `${R.house.after[side]}` : '—'}</b></div></div>
    <div class="nsub">${resCnt(b)} → ${resCnt(a)} in the Senate${R.house.before ? `; House ${R.house.before[side]} → ${R.house.after[side]} for the ${PARTY[side].short}` : ''}. ${M.president ? `${PARTY[M.president.party].name} White House at ${M.president.approval}% approval on Election Eve${M.president.party === side ? ' — the midterm curse was yours to beat' : ' — the midterm curse was theirs'}.` : ''}${Sn.races.filter(r => r.flip).length ? ` Flips: ${Sn.races.filter(r => r.flip).map(r => `${resNm(r.code, r.wParty)}`).join(', ')}.` : ' No seat changed hands.'}</div>`));
  const rows = [
    `<div class="mid-res-row"><b>Message:</b> ${tg(M.message)}${M.msgHot ? ' — a top-two issue with voters (+0.8 in every race)' : ''}</div>`,
    `<div class="mid-res-row"><b>Strategy:</b> ${strat(M.strategy)}</div>`,
    M.auto ? '<div class="mid-res-row"><small style="color:var(--dim)">You let the campaign committee run part of the campaign.</small></div>' : '',
    `<div class="mid-res-row"><b>The closing weekend:</b> ${M.adBuy ? `${M.adBuy} unit${M.adBuy > 1 ? 's' : ''} of national ads (${resSigned(cashEff(M.adBuy, 0.6))})` : 'no closing ad buy'}; ${M.gotv ? 'paid the turnout machine (+0.5)' : 'no turnout money'}</div>`,
    arr(M.surrogates).length ? `<div class="mid-res-row"><b>Surrogates:</b> ${arr(M.surrogates).map(s => `${s.who} → ${s.code} (${resSigned(+s.pts || 0)})`).join(', ')}</div>` : '',
    `<div class="mid-res-row"><b>Net campaign effect:</b> ${resSigned(+M.national || 0)} in every Senate race before state-by-state moves, ${resSigned(+M.houseAdj || 0)} for the House</div>`,
  ].filter(Boolean).join('');
  cards.push(resCard('Your campaign', rows));
  const deb = arr(M.debates);
  if (deb.length) cards.push(resCard('The Senate debates', `<div class="res-deb">${deb.map(d => `<div class="res-debrow"><span><b>${stName(d.code)}</b>${d.venue ? ` · <small style="color:var(--dim)">${d.venue}</small>` : ''}<br>${d.mine ? `${d.mine.charAt(0).toUpperCase() + d.mine.slice(1)} vs ${d.theirs}` : ''}${d.coached ? ' · 🎓 your coach' : ''}${d.oppCoached ? ' · their coach' : ''}${d.text ? `<br><small style="color:var(--dim)">${d.text}</small>` : ''}</span><span class="mg"><b style="color:${d.winner === side ? 'var(--yes)' : d.winner ? 'var(--no)' : 'var(--dim)'}">${d.winner === side ? 'Won' : d.winner ? 'Lost' : 'Draw'} ${resSigned(+d.result || 0)}</b></span></div>`).join('')}</div>`));
  const evs = arr(M.events);
  if (evs.length) cards.push(resCard('The midterm surprise', `<div class="res-deb">${evs.map(resEventRow).join('')}</div>`));
  if (O.strategy || O.message) cards.push(resCard('The other side', `<div class="mid-res-row"><b>Message:</b> ${tg(O.message)}${O.msgHot ? ' (a top issue: −0.8 for you everywhere)' : ''}</div><div class="mid-res-row"><b>Strategy:</b> ${strat(O.strategy)}</div>
    <div class="mid-res-row"><b>Debate coach:</b> ${O.coach ? stName(O.coach) : 'none'}</div><div class="mid-res-row"><b>Closing weekend:</b> ${arr(O.surrogates).map(s => `${s.who} → ${s.code}`).join(', ') || 'no surrogates'}; ${O.adBuy ? `${O.adBuy} unit${O.adBuy > 1 ? 's' : ''} of ads` : 'no ad buy'}; ${O.gotv ? 'paid turnout' : 'no turnout money'}</div>`));
  cards.push(resWaveCard(R));
  const half = Math.ceil(cards.length / 2);
  return `<div class="res-grid"><div class="res-col">${cards.slice(0, half).join('')}</div><div class="res-col">${cards.slice(half).join('')}</div></div>`;
}

/* ---- Table: every state at a glance ---- */
function resXTable(R, X) {
  const P = R.pres, sen = {}; for (const r of R.senate.races) (sen[r.code] = sen[r.code] || []).push(r);
  const gov = Object.fromEntries((R.gov || []).map(g => [g.code, g])), by = R.house.byState || {};
  const codes = Object.keys(EV).filter(c => (P && P.states[c]) || sen[c] || (by[c] && by[c][1]) || gov[c]);
  const st = c => ({ v: stName(c), h: `<b>${c}</b> ${stName(c)}` }), num = (v, h) => ({ v, h: h == null ? String(v) : h });
  const cols = [{ k: 'state', l: 'State' }].concat(P ? [{ k: 'pres', l: 'President', num: 1 }, { k: 'pd', l: 'D %', num: 1 }, { k: 'pr', l: 'R %', num: 1 }] : []).concat([{ k: 'sen', l: 'Senate' }, { k: 'house', l: 'House D–R', num: 1 }, { k: 'hch', l: 'Δ', num: 1 }, { k: 'gov', l: 'Governor' }]);
  const rows = codes.map(c => { const m = P ? resPresM(P, c) : null, h = by[c], ch = h ? h[0] - h[2] : 0;
    return { code: c, c: { state: st(c), pres: m != null ? num(m, resMarginTag(resPresW(P, c), resPresWM(P, c))) : null, pd: P && P.states[c] ? num(P.states[c][0], pct(P.states[c][0])) : null, pr: P && P.states[c] ? num(P.states[c][1], pct(P.states[c][1])) : null,
      sen: sen[c] ? { v: sen[c][0].wName, h: sen[c].map(r => `${resNm(r.wName, r.wParty)} +${r.margin.toFixed(1)}${r.flip ? ' <span class="call flip">FLIP</span>' : ''}`).join('<br>') } : null,
      house: h && h[1] ? num(h[0] / h[1], `<span style="color:${PARTY.D.color}">${h[0]}</span>–<span style="color:${PARTY.R.color}">${h[1] - h[0]}</span>`) : null, hch: h && h[1] ? num(ch, ch ? `<b style="color:${ch > 0 ? PARTY.D.color : PARTY.R.color}">${ch > 0 ? 'D' : 'R'}+${Math.abs(ch)}</b>` : '<span style="color:var(--dim)">—</span>') : null,
      gov: gov[c] ? { v: gov[c].wName, h: `${resNm(gov[c].wName, gov[c].wParty)} +${gov[c].margin.toFixed(1)}${gov[c].flip ? ' <span class="call flip">FLIP</span>' : ''}` } : null } }; });
  const fill = c => { if (P && P.states[c]) return resPresShade(P, c); if (sen[c]) { const s = shade(sen[c][0].wParty, sen[c][0].margin); return { c: s.fill, op: s.op }; } if (by[c] && by[c][1]) { const sh = by[c][0] / by[c][1]; return { c: sh > 0.5 ? PARTY.D.color : sh < 0.5 ? PARTY.R.color : '#8a8fa0', op: 0.35 + Math.abs(sh - 0.5) * 1.3 }; } return null; };
  const map = usMap({ cls: 'res-map', fill, sub: c => P && P.states[c] ? `${EV[c]}` : sen[c] ? sen[c][0].wParty : '', ring: c => X.sel === c ? '#fff' : null, attr: c => codes.includes(c) ? `data-code="${c}"` : '', title: c => stName(c) });
  return `<div class="res-grid res-grid-table"><div class="res-col">${resCard(P ? 'The map, by presidential margin' : 'The map, by Senate result', map + '<div class="nsub">Click a row in the table (or a state) to highlight it here.</div>')}${resSelDetail(R, X.sel)}</div>
    <div class="res-col">${resCard(`Every state · ${codes.length}`, `<div class="res-scroll">${resTableHTML(cols, rows, X.sort, X.sel, { k: 'state', d: 1 })}</div>`)}</div></div>`;
}

/* ---------------- the Almanac ---------------- */
let RESA = { tab: 'elections' };
function resThumb(R) {
  const P = R.pres, sen = Object.fromEntries(R.senate.races.map(r => [r.code, r])), by = R.house.byState || {};
  return usMap({ cls: 'res-thumb', fill: c => { if (P && P.states[c]) return { c: PARTY[resPresW(P, c)].color, op: 0.5 + Math.min(0.5, resPresWM(P, c) / 20) }; if (sen[c]) return { c: PARTY[sen[c].wParty].color, op: 0.85 }; if (by[c] && by[c][1]) { const sh = by[c][0] / by[c][1]; return { c: sh > 0.5 ? PARTY.D.color : sh < 0.5 ? PARTY.R.color : '#8a8fa0', op: 0.3 + Math.abs(sh - 0.5) }; } return null; }, title: c => stName(c) });
}
function resAlmanac(back) {
  const A = (S.archive || []).map(resNorm).reverse(), tab = RESA.tab, P = S.president;
  unlock('almanac');
  const tabs = `<div class="ptabs">${[['elections', `🗳️ Elections (${A.length})`], ['presidents', '🏛️ Presidents'], ['standings', '📊 Standings']].map(([k, l]) => `<button class="btn ${tab === k ? 'on' : ''}" data-rtab="${k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'elections') {
    body = A.length ? `<div class="res-alm">${A.map((R, i) => `<div class="res-almrow">${resThumb(R)}<div><h4>${R.year} · ${R.pres ? 'Presidential election' : 'Midterms'}</h4><p><b>${resHeadline(R)}</b></p>
      <p>Senate ${resCnt(R.senate.before)} → <b>${resCnt(R.senate.after)}</b> · ${R.senate.races.filter(r => r.flip).length} flip${R.senate.races.filter(r => r.flip).length === 1 ? '' : 's'} · House ${R.house.before ? `${R.house.before.D}–${R.house.before.R} → ` : ''}<b>${R.house.after.D}–${R.house.after.R}</b>${R.gov && R.gov.length ? ` · ${R.gov.length} governors' races, ${R.gov.filter(g => g.flip).length} flipped` : ''}</p>
      <p>${R.pres ? `White House: <b style="color:${PARTY[R.pres.winner].color}">${R.pres.names[R.pres.winner]}</b> (${R.pres.winner}) · popular vote ${pct(R.pres.popD / (R.pres.popD + R.pres.popR + (R.pres.popI || 0)) * 100)} D – ${pct(R.pres.popR / (R.pres.popD + R.pres.popR + (R.pres.popI || 0)) * 100)} R` : `President ${R.president.name} (${R.president.party}) ${R.president.party === resMaj(R.senate.after) ? 'kept' : 'faced'} ${R.president.party === resMaj(R.senate.after) ? 'a friendly Senate' : 'an opposition Senate'}`}${R.wave != null ? ` · wave ${R.wave >= 0 ? PARTY[R.side || S.side].short : PARTY[other(R.side || S.side)].short} +${Math.abs(R.wave).toFixed(1)}` : ''}</p></div>
      <button class="btn primary" data-res="${S.archive.length - 1 - i}">Open →</button></div>`).join('')}</div>` : `<div class="res-empty">The record book is empty. The first election comes in November 2028, after bill #6, and every result from then on is kept here: the map, every race, the swings and the story of the night.</div>`;
  } else if (tab === 'presidents') {
    const wins = (S.archive || []).filter(R => R.pres).map(R => ({ year: R.year, name: R.pres.names[R.pres.winner], party: R.pres.winner, ev: resEvTxt(R.pres), re: R.pres.winner === R.pres.inc && R.pres.running, split: resPvWinner(R.pres) !== R.pres.winner }));
    body = `<div class="res-presrow">${portrait(P)}<div><b style="color:${PARTY[P.party].color}">President ${P.name}</b> <small>(${P.party} · ${P.faction})</small><br><small>Term ${P.terms} · approval ${P.approval}%${S.vp ? ` · Vice President ${S.vp.name}` : ''}</small></div><span class="res-years">in office</span></div>
      ${(P.history || []).filter(h => /President/.test(h.t)).slice(-4).map(h => `<p style="margin:4px 0 0;font-size:12px;color:var(--dim)"><b style="color:var(--gold2)">${h.y}</b> ${h.t}</p>`).join('')}
      <hr><b>Presidential elections on record</b>
      ${wins.length ? wins.slice().reverse().map(w => `<div class="res-presrow"><div><b style="color:${PARTY[w.party].color}">${w.name}</b> <small>(${PARTY[w.party].name})</small><br><small>${w.re ? 'Re-elected' : 'Elected'} ${w.ev} in the Electoral College${w.split ? ' · <span style="color:var(--gold2)">lost the popular vote</span>' : ''}</small></div><span class="res-years">${w.year}</span></div>`).join('') : '<p style="color:var(--dim)">No presidential election has been held yet in your career. The first comes in 2028.</p>'}`;
  } else {
    const g = resCountBy(Object.fromEntries(Object.entries(S.governors || {}).map(([c, x]) => [c, x.party])));
    const hm = houseMaj();
    body = `<div class="res-stand">
      <div class="res-card"><div class="lh">The Senate</div>${balanceBar()}<p>${isMajority() ? `Your ${PARTY[S.side].short} hold the majority` : seats(S.side) === seats(other(S.side)) ? `A ${seats('D')}–${seats('R')} tie; the ${PARTY[other(S.side)].short} organize the chamber` : `The ${PARTY[other(S.side)].short} hold the majority`} · ${seats('I')} independent${seats('I') === 1 ? '' : 's'} · next election ${electionYear(nextElectionK())} (Class ${classUp(nextElectionK())})</p></div>
      <div class="res-card"><div class="lh">The House</div><div class="balance"><div style="width:${S.house.D / 435 * 100}%;background:${PARTY.D.color}">D ${S.house.D}</div><div style="width:${S.house.R / 435 * 100}%;background:${PARTY.R.color}">R ${S.house.R}</div></div><p>${PARTY[hm].short} majority · Speaker's margin ${Math.abs(S.house.D - S.house.R)} seats</p></div>
      <div class="res-card"><div class="lh">Governors</div><div class="balance"><div style="width:${g.D * 2}%;background:${PARTY.D.color}">D ${g.D}</div>${g.I ? `<div style="width:${g.I * 2}%;background:${PARTY.I.color}">${g.I}</div>` : ''}<div style="width:${g.R * 2}%;background:${PARTY.R.color}">R ${g.R}</div></div><p>${g.D > g.R ? 'Democrats' : g.R > g.D ? 'Republicans' : 'Neither party'} hold${g.D === g.R ? '' : ''} most of the nation's mansions</p></div>
      <div class="res-card"><div class="lh">The Supreme Court</div><p style="font-size:16px;color:var(--ink)"><b>${courtLabel()}</b></p><p>${S.court.length} justices seated · ${courtCount('R') > courtCount('D') ? 'a Republican-appointed majority' : courtCount('D') > courtCount('R') ? 'a Democratic-appointed majority' : 'evenly split'}</p></div>
      <div class="res-card"><div class="lh">The White House</div><p style="font-size:14px;color:var(--ink)"><b style="color:${PARTY[P.party].color}">President ${P.name}</b> (${P.party})</p><p>Approval ${P.approval}% · term ${P.terms} · ${S.whStreak ? `${S.whStreak} straight ${PARTY[P.party].name} term${S.whStreak === 1 ? '' : 's'}` : ''}</p></div>
      <div class="res-card"><div class="lh">Your career</div><p style="font-size:14px;color:var(--ink)"><b>${rank()}</b></p><p>${S.career.wins}–${S.career.losses} on the floor · ${(S.archive || []).length} election${(S.archive || []).length === 1 ? '' : 's'} on record · legacy ${S.career.legacy || 0}</p></div></div>`;
  }
  $('#modal-card').classList.add('res-wide');
  showModal(`<div class="kicker">The Almanac · ${season(S.career.bills + 1)} ${billYear(S.career.bills + 1)}</div><h2>The Record Book</h2>${tabs}${body}
    <div class="choices"><button class="btn primary big adv" id="almback">Back to the office</button></div>`);
  const card = $('#modal-card');
  card.querySelectorAll('[data-rtab]').forEach(b => b.onclick = () => { RESA.tab = b.dataset.rtab; sfx.click(); resAlmanac(back); });
  card.querySelectorAll('[data-res]').forEach(b => b.onclick = () => { const R = (S.archive || [])[+b.dataset.res]; if (!R) return; card.classList.remove('res-wide'); sfx.click(); resExplorer(R, () => resAlmanac(back)); });
  $('#almback').onclick = () => { card.classList.remove('res-wide'); if (back) back(); else hideModal(); };
}
