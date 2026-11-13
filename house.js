'use strict';
/* =====================================================================
   HOUSE — all 435 districts: representatives, district leans, seat-by-seat results (used by night.js runHouse and results.js).
   S.districts = { code: [{ n, lean (D-positive points), party, m (last margin, D-positive), rep: { name, gender, born, faction (index into HOUSE_FAC[party]), terms } }] }
   Built lazily (old saves have none) so that its totals always match S.house, which the rest of the game reads.
   ===================================================================== */

const HD_SD = 4;                 // district-level noise on Election Night, in points of margin
const hdR1 = v => Math.round(v * 10) / 10;
const hdLabel = (c, n) => HSEATS(c) === 1 ? `${c}-AL` : `${c}-${String(n).padStart(2, '0')}`;
const hdCaucus = (p, f) => { const x = HOUSE_FAC[p] && HOUSE_FAC[p][f | 0]; return x ? x[0] : 'Independent'; };
const hdCount = (p, Ds = S.districts) => Object.values(Ds || {}).reduce((a, L) => a + L.filter(d => d.party === p).length, 0);

// a caucus for a new member (stored as its index in HOUSE_FAC[party], to keep saves small): progressives in safe blue seats, Blue Dogs and Main Streeters where the district leans the other way
function hdFaction(p, lean) {
  const pos = p === 'D' ? [-1, 0.1, -0.3, 0.7, 1.1] : [-0.9, -0.2, -0.5, 0.7, 1.1];     // HOUSE_FAC order; + = cross-pressured moderate
  const cross = clamp(((p === 'D' ? -lean : lean) + 12) / 10, -2, 2.5);                  // how hostile the turf is
  const w = HOUSE_FAC[p].map((f, i) => f[1] * Math.exp(pos[i] * cross * 1.2));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) <= 0) return i;
  return 0;
}
function hdNewRep(p, lean, name, gender, age) {
  const g = gender || (Math.random() < 0.5 ? 'f' : 'm');
  return { name: name || fullName(g), gender: g, born: currentYear() - (age || ri(31, 62)), faction: hdFaction(p, lean), terms: 1 };
}
// district leans around the state's lean: a few deep-blue urban seats, suburbs near the state's center, a rural red tail
function hdLeans(c) {
  const n = HSEATS(c), m = -stLean(c), v = ST[c].voter || {};
  if (n === 1) return [m];
  const fu = clamp(0.1 + 0.1 * (v.urban || 0) + (n >= 8 ? 0.06 : 0), 0.04, 0.4), fr = clamp(0.25 + 0.1 * (v.rural || 0), 0.1, 0.55), k = n <= 3 ? 0.55 : 1;
  let L = Array.from({ length: n }, (_, i) => { const q = (i + 0.5) / n; return k * (q < fu ? 33 + gauss() * 9 : q > 1 - fr ? -24 + gauss() * 8 : gauss() * 10); });
  const mean = L.reduce((a, b) => a + b, 0) / n;
  return shuffle(L.map(x => hdR1(clamp(x - mean + m, -55, 55))));
}
function hdBuild() {
  const out = {}, all = [];
  for (const [c] of STATES) { if (!HSEATS(c)) continue; out[c] = hdLeans(c).map((lean, i) => { const d = { n: i + 1, lean, party: 'R', m: 0, rep: null }; all.push([d, lean + gauss() * 5]); return d; }); }
  // seat the current House: the most Democratic districts (lean plus last cycle's luck) are the Democrats' S.house.D seats
  all.sort((a, b) => b[1] - a[1]);
  const k = clamp(S.house.D, 0, all.length), cut = k <= 0 ? all[0][1] + 1 : k >= all.length ? all[all.length - 1][1] - 1 : (all[k - 1][1] + all[k][1]) / 2;
  for (const [d, x] of all) { d.party = x > cut ? 'D' : 'R'; d.m = hdR1(x - cut); const age = ri(34, 78); d.rep = hdNewRep(d.party, d.lean, null, null, age); d.rep.terms = clamp(Math.round(rnd(1, Math.min(14, (age - 30) / 2.5))), 1, 14); }
  // the notable members (S.reps) get real districts in their states
  for (const r of S.reps || []) {
    const L = out[r.state]; if (!L || (r.party !== 'D' && r.party !== 'R')) continue;
    const d = L.find(x => x.party === r.party && !x.star); if (!d) continue;
    d.rep = { name: r.name, gender: r.gender || 'f', born: r.born || 1970, faction: hdFaction(r.party, d.lean), terms: ri(2, 6) }; d.star = 1;
    r.district = hdLabel(r.state, d.n);
  }
  delete S.houseByState; delete S.hNoise;
  return out;
}
// S.districts, built on first use and kept in step with S.house (redistricting fights and the like move S.house directly)
function hdEnsure() {
  const ok = S.districts && STATES.every(([c]) => !HSEATS(c) || (Array.isArray(S.districts[c]) && S.districts[c].length === HSEATS(c)));
  if (!ok) S.districts = hdBuild();
  hdSync();
  return S.districts;
}
function hdSync() {
  let need = S.house.D - hdCount('D');
  if (!need) return;
  const from = need > 0 ? 'R' : 'D', to = other(from), L = [].concat(...Object.values(S.districts)).filter(d => d.party === from).sort((a, b) => (to === 'D' ? b.m - a.m : a.m - b.m));
  for (const d of L.slice(0, Math.abs(need))) { d.party = to; d.rep = hdNewRep(to, d.lean); d.star = 0; }
}
// state delegations after the count: { code: { D, R } } (the House votes one per state when the Electoral College fails)
function hdDelegations() { const Ds = hdEnsure(), o = {}; for (const [c, L] of Object.entries(Ds)) o[c] = { D: L.filter(d => d.party === 'D').length, R: L.filter(d => d.party === 'R').length }; return o; }
// everyone who now holds another office leaves their House seat open
function hdBusy() {
  const s = new Set([S.president && S.president.name, S.vp && S.vp.name]);
  for (const m of S.members) if (m) s.add(m.name);
  for (const x of Object.values(S.governors || {}).concat(Object.values(S.cabinet || {}))) if (x) s.add(x.name);
  return s;
}

/* ---------------- Election Night: every district ---------------- */
// swingSide: national points for S.side (the same input the state-level model used). Returns runHouse's shape plus districts.
function hdElect(swingSide) {
  const Ds = hdEnsure(), year = S.election ? S.election.year : currentYear(), busy = hdBusy(), reps = new Map((S.reps || []).map(r => [r.name, r]));
  const plan = [];
  for (const [c, L] of Object.entries(Ds)) for (const d of L) {
    const rep = d.rep, age = year - (rep.born || 1970);
    const why = busy.has(rep.name) ? 'moved' : Math.random() < 0.05 + (rep.terms >= 8 ? 0.05 : 0) + (age >= 76 ? 0.1 : 0) ? 'retired' : Math.random() < 0.015 ? 'primary' : null;
    plan.push({ c, d, why, adv: why ? 0 : (d.party === 'D' ? 1 : -1) * (2 + Math.min(1.5, rep.terms * 0.2) + rnd(0, 0.5)) });
  }
  // the national environment that reproduces today's House on average, then the swing
  const exp = e => plan.reduce((a, x) => a + normCdf((x.d.lean + e + x.adv) / HD_SD), 0);
  let lo = -45, hi = 45; for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (exp(mid) < S.house.D) lo = mid; else hi = mid; }
  const envD = (lo + hi) / 2 + (frameP() === 'D' ? swingSide : -swingSide);
  const before = { D: S.house.D, R: S.house.R }, districts = {}, states = {};
  for (const x of plan) {
    const { c, d, why, adv } = x, n = HSEATS(c), rep = d.rep, incP = why ? null : d.party;
    const margin = d.lean + envD + adv + gauss() * HD_SD, w = margin > 0 ? 'D' : 'R';
    const dPct = clamp(49.2 + margin / 2, 4, 94.4), rPct = 98.4 - dPct, tv = turnout(c) * 0.96 / n * rnd(0.85, 1.15);
    const nm = p => incP === p ? rep.name : fullName();
    const rec = { id: hdLabel(c, d.n), n: d.n, lean: d.lean, dName: nm('D'), rName: nm('R'), inc: incP, incName: rep.name, why, dPct, rPct, dVotes: tv * dPct / 100, rVotes: tv * rPct / 100, w, m: margin, prev: d.m, flip: w !== d.party, open: !!why, call: callTime(c, margin) };
    (districts[c] = districts[c] || []).push(rec);
    // the seat changes hands, or the member comes back for another term
    const star = reps.get(rep.name);
    if (w === incP) rep.terms++;
    else {
      if (star && why !== 'moved') hist(star, why === 'retired' ? `Retired from the U.S. House (${rec.id})` : why === 'primary' ? `Lost the ${PARTY[d.party].name} primary for ${rec.id}` : `Lost re-election in ${rec.id}`, year);
      d.rep = hdNewRep(w, d.lean, w === 'D' ? rec.dName : rec.rName); d.star = 0;
    }
    d.party = w; d.m = hdR1(margin);
  }
  S.reps = (S.reps || []).filter(r => !busy.has(r.name));   // a member who moved up leaves the notable-House list
  let D = 0, R = 0, popD = 0, popR = 0;
  for (const [c, L] of Object.entries(districts)) {
    L.sort((a, b) => a.n - b.n);
    const d = L.filter(x => x.w === 'D').length, dv = L.reduce((a, x) => a + x.dVotes, 0), rv = L.reduce((a, x) => a + x.rVotes, 0), tot = (dv + rv) / 0.984 || 1;
    states[c] = { n: L.length, d, r: L.length - d, prevD: L.filter(x => (x.flip ? other(x.w) : x.w) === 'D').length, dPct: dv / tot * 100, rPct: rv / tot * 100, dVotes: dv, rVotes: rv, call: Math.max(...L.map(x => x.call)) };
    D += d; R += L.length - d; popD += dv; popR += rv;
  }
  S.house = { D, R };
  return { states, districts, D, R, before, popD, popR, envD };
}

/* ---------------- shared pieces for Election Night and the explorer ---------------- */
const hdWhy = { retired: 'open · retired', primary: 'open · incumbent lost primary', moved: 'open · member moved up' };
const hdTag = (p, m) => `<b style="color:${PARTY[p].color}">${p} +${Math.abs(m).toFixed(1)}</b>`;
// one district row: label, winner (or the count so far), margin, badges
function hdRowHTML(x, called, rep) {
  const win = x.w === 'D' ? x.dName : x.rName, lose = x.w === 'D' ? x.rName : x.dName;
  const badge = !called ? '' : x.flip ? `<span class="call flip">${x.w} FLIP</span>` : x.open ? '<span class="hd-open">OPEN</span>' : '<span class="hd-inc">INC</span>';
  const who = called ? `<b style="color:${PARTY[x.w].color}">${win}</b> <small>${x.flip && x.inc ? `unseats ${lose}` : x.open ? hdWhy[x.why] || 'open seat' : 'incumbent'}</small>`
    : `<span class="hd-wait">${x.dName.split(' ').pop()} (D) vs ${x.rName.split(' ').pop()} (R) · ${Math.round(rep * 100)}% in</span>`;
  return `<div class="hd-row ${called ? '' : 'pending'} ${called && x.flip ? 'flip' : ''}"><span class="hd-id">${x.id}</span><span class="hd-who">${who}</span><span class="hd-mg">${called ? hdTag(x.w, x.m) : ''}${badge}</span></div>`;
}
// seat dots for one state, sorted from the bluest win to the reddest, flips outlined
function hdDots(L, isC) {
  return `<div class="seatrow hd-dots">${L.slice().sort((a, b) => b.m - a.m).map(x => isC(x) ? `<i class="${x.flip ? 'fl' : ''}" style="background:${PARTY[x.w].color}" title="${x.id}: ${x.w} +${Math.abs(x.m).toFixed(1)}"></i>` : `<i style="background:#3a4250" title="${x.id}: counting"></i>`).join('')}</div>`;
}
