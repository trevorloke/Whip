'use strict';
/* =====================================================================
   LOCAL — mayors, state legislatures and the off-year elections
   (Virginia, New Jersey, Kentucky, Louisiana, Mississippi; mayors).
   Exports: localEnsure, localEvenElections(year) (countBallots),
   localPrimaryPool(party, state), localMayors(party), localTrifecta(code),
   localGovCandidate / localLeave / localSweep (world.js governors),
   localPulseChyron. Hooks: the Off-Year Election Night (interlude), the
   Statehouses (office), State & local results (morning-after summary),
   city-hall news (worldNews).
   ===================================================================== */

/* ---------------- data ---------------- */
// [key, city, state, lean (R-positive), a past election year, term (years), term limit (0 = none), population (thousands), month if not November]
const LOC_CITIES = [
  ['nyc', 'New York', 'NY', -30, 2025, 4, 2, 8300], ['la', 'Los Angeles', 'CA', -30, 2026, 4, 2, 3820], ['chi', 'Chicago', 'IL', -34, 2023, 4, 0, 2660, 'April'],
  ['hou', 'Houston', 'TX', -12, 2023, 4, 2, 2310], ['phx', 'Phoenix', 'AZ', -8, 2024, 4, 2, 1650], ['phl', 'Philadelphia', 'PA', -34, 2023, 4, 2, 1550],
  ['sat', 'San Antonio', 'TX', -8, 2025, 2, 4, 1490, 'June'], ['sd', 'San Diego', 'CA', -16, 2024, 4, 2, 1390], ['dal', 'Dallas', 'TX', -14, 2023, 4, 2, 1300, 'May'],
  ['jax', 'Jacksonville', 'FL', 2, 2023, 4, 2, 985, 'May'], ['aus', 'Austin', 'TX', -34, 2024, 4, 2, 980], ['ftw', 'Fort Worth', 'TX', 3, 2025, 2, 0, 980, 'May'],
  ['sj', 'San Jose', 'CA', -20, 2024, 4, 2, 970], ['cmh', 'Columbus', 'OH', -22, 2023, 4, 0, 915], ['clt', 'Charlotte', 'NC', -18, 2025, 2, 0, 910],
  ['indy', 'Indianapolis', 'IN', -16, 2023, 4, 0, 880], ['sf', 'San Francisco', 'CA', -40, 2024, 4, 2, 830], ['sea', 'Seattle', 'WA', -40, 2025, 4, 0, 760],
  ['den', 'Denver', 'CO', -30, 2023, 4, 3, 720, 'June'], ['okc', 'Oklahoma City', 'OK', 8, 2026, 4, 0, 700, 'February'], ['nash', 'Nashville', 'TN', -22, 2023, 4, 2, 690, 'September'],
  ['dc', 'Washington', 'DC', -45, 2026, 4, 0, 700], ['elp', 'El Paso', 'TX', -10, 2024, 4, 2, 680], ['lv', 'Las Vegas', 'NV', -2, 2024, 4, 2, 660],
  ['bos', 'Boston', 'MA', -38, 2025, 4, 0, 650], ['det', 'Detroit', 'MI', -42, 2025, 4, 0, 645], ['pdx', 'Portland', 'OR', -38, 2024, 4, 0, 630],
  ['lou', 'Louisville', 'KY', -10, 2026, 4, 2, 620], ['mem', 'Memphis', 'TN', -30, 2023, 4, 2, 610, 'October'], ['bal', 'Baltimore', 'MD', -40, 2024, 4, 0, 570],
  ['mke', 'Milwaukee', 'WI', -35, 2024, 4, 0, 560, 'April'], ['atl', 'Atlanta', 'GA', -40, 2025, 4, 2, 520], ['kc', 'Kansas City', 'MO', -25, 2023, 4, 2, 515, 'June'],
  ['oma', 'Omaha', 'NE', 0, 2025, 4, 0, 485, 'May'], ['mia', 'Miami', 'FL', 3, 2025, 4, 2, 455], ['msp', 'Minneapolis', 'MN', -40, 2025, 4, 0, 425],
  ['tul', 'Tulsa', 'OK', 5, 2024, 4, 0, 410], ['tpa', 'Tampa', 'FL', -8, 2023, 4, 2, 400, 'March'], ['nola', 'New Orleans', 'LA', -35, 2025, 4, 2, 365],
];
const LOC_CITY = Object.fromEntries(LOC_CITIES.map(c => [c[0], c]));
// [upper, lower] seats; Nebraska has one nonpartisan chamber
const LOC_SIZE = { AL: [35, 105], AK: [20, 40], AZ: [30, 60], AR: [35, 100], CA: [40, 80], CO: [35, 65], CT: [36, 151], DE: [21, 41], FL: [40, 120], GA: [56, 180], HI: [25, 51], ID: [35, 70], IL: [59, 118], IN: [50, 100], IA: [50, 100], KS: [40, 125], KY: [38, 100], LA: [39, 105], ME: [35, 151], MD: [47, 141], MA: [40, 160], MI: [38, 110], MN: [67, 134], MS: [52, 122], MO: [34, 163], MT: [50, 100], NE: [49, 0], NV: [21, 42], NH: [24, 400], NJ: [40, 80], NM: [42, 70], NY: [63, 150], NC: [50, 120], ND: [47, 94], OH: [33, 99], OK: [48, 101], OR: [30, 60], PA: [50, 203], RI: [38, 75], SC: [46, 124], SD: [35, 70], TN: [33, 99], TX: [31, 150], UT: [29, 75], VT: [30, 150], VA: [40, 100], WA: [49, 98], WV: [34, 100], WI: [33, 99], WY: [31, 62] };
const LOC_IND = { AK: 4, VT: 6, ME: 2 }; // independents and third-party members in the lower house
// state senates: all seats every even year (two-year terms), all at once in midterm or presidential years; everyone else staggers half every two years
const LOC_UP2 = ['AZ', 'CT', 'GA', 'ID', 'ME', 'MA', 'NH', 'NY', 'NC', 'RI', 'SD', 'VT'], LOC_UPMID = ['AL', 'MD', 'MI', 'MN'], LOC_UPPRES = ['KS', 'NM', 'SC'];
ACH.push(['offyear', '🗳️', 'Off-Year Upset', 'Flip a governorship in an off-year election.'], ['statehouses', '🏛', 'Fifty Capitols', 'Your party controls 30 state legislatures.']);

/* ---------------- names, calendars, control ---------------- */
const locLower = c => c === 'NE' ? 'Legislature' : ['CA', 'NV', 'NY', 'WI', 'NJ'].includes(c) ? 'Assembly' : ['VA', 'MD', 'WV'].includes(c) ? 'House of Delegates' : 'House';
const locChName = (c, ch) => `${stName(c)} ${ch === 'upper' ? (c === 'NE' ? 'Legislature' : 'Senate') : locLower(c)}`;
const locSpkTitle = c => `Speaker of the ${stName(c)} ${locLower(c)}`;
const locCtrl = o => !o ? null : o.D > o.R ? 'D' : o.R > o.D ? 'R' : null;
const locLegCtrl = c => { const L = S.legis[c], u = locCtrl(L.upper), l = L.lower ? locCtrl(L.lower) : u; return u === l ? u : null; };
const locPc = p => (PARTY[p] || PARTY.I).color;
const locPop = k => LOC_CITY[k][7];
function locUpperUp(c, y) {
  if (c === 'VA' || c === 'LA' || c === 'MS') return y % 4 === 3 ? 1 : 0;
  if (c === 'NJ') return y % 2 && [1, 3, 7].includes(y % 10) ? 1 : 0; // the 2-4-4 cycle: 2027, 2031, 2033
  if (y % 2) return 0;
  if (LOC_UP2.includes(c)) return 1;
  if (LOC_UPMID.includes(c)) return y % 4 === 2 ? 1 : 0;
  if (LOC_UPPRES.includes(c)) return y % 4 === 0 ? 1 : 0;
  return 0.5;
}
function locLowerUp(c, y) {
  if (c === 'NE') return 0;
  if (c === 'VA' || c === 'NJ') return y % 2;
  if (c === 'LA' || c === 'MS') return y % 4 === 3 ? 1 : 0;
  if (y % 2) return 0;
  if (c === 'AL' || c === 'MD') return y % 4 === 2 ? 1 : 0;
  return c === 'ND' ? 0.5 : 1;
}
function locLegisUp(y) {
  const out = [];
  for (const [c] of STATES) for (const ch of ['upper', 'lower']) { const frac = (ch === 'upper' ? locUpperUp : locLowerUp)(c, y); if (frac && S.legis[c] && S.legis[c][ch]) out.push({ code: c, chamber: ch, frac }); }
  return out;
}
function localNextLegis(c, from) { for (let y = from; y < from + 9; y++) if (locUpperUp(c, y) || locLowerUp(c, y)) return y; return null; }
function locNextGov(c, from) { for (let y = from; y < from + 9; y++) if (govUp(c, y)) return y; return null; }
// the first election year not yet held, as seen from the Whip's Office
function locFromYear() { const n = S.career.bills, y = billYear(Math.max(1, n)); return n > 0 && n % 3 === 0 ? y + 1 : y; }
function localTrifecta(c) { const L = S.legis && S.legis[c], g = S.governors && S.governors[c]; if (!L || !g) return null; const l = locLegCtrl(c); return l && g.party === l ? l : null; }
function locMayorsUp(y) { return LOC_CITIES.filter(C => S.mayors[C[0]] && S.mayors[C[0]].cycle === y).map(C => C[0]); }

/* ---------------- people ---------------- */
function locNameUsed(n) { return nameTaken(n) || Object.values(S.mayors || {}).some(M => M.person.name === n) || Object.values(S.legis || {}).some(L => L.spk && L.spk.name === n); }
function locTrim(p, n = 6) { if (p.history && p.history.length > n) p.history.splice(1, p.history.length - n); }
// a local politician with a short record: a job, then a first office
function locPol(party, st, city, year) {
  let p, n = 0;
  do p = newPerson(party, st, { age: ri(38, 64) }); while (n++ < 20 && locNameUsed(p.name));
  if (city) p.hometown = city;
  if (FACTIONS[party]) p.faction = pick(FACTIONS[party])[0];
  hist(p, `Worked as ${p.background}`, year - ri(10, 20));
  const sl = st === 'DC' ? 'D.C. Council' : `${stName(st)} ${locLower(st)}`;
  p.ttl = city ? pick(['city council member', 'council president', 'deputy mayor', 'state legislator', 'county executive', 'city controller']) : 'state legislator';
  hist(p, { 'city council member': `Elected to the ${city} City Council`, 'council president': `Elected ${city} City Council President`, 'deputy mayor': `Appointed deputy mayor of ${city}`, 'state legislator': `Elected to the ${sl}`, 'county executive': `Elected county executive`, 'city controller': `Elected ${city} City Controller` }[p.ttl], year - ri(3, 8));
  return p;
}
function locSeedMayor(C, cut) {
  const [, city, st, lean, base, term, lim] = C;
  const party = Math.random() < 0.03 ? 'I' : Math.random() < 1 / (1 + Math.exp(-lean / 6)) ? 'R' : 'D';
  const last = base + Math.floor((cut - base) / term) * term, terms = Math.min(lim || 9, ri(1, term === 2 ? 3 : 2)), since = last - (terms - 1) * term;
  const p = locPol(party, st, city, since);
  hist(p, `Elected Mayor of ${city}`, since); if (terms > 1) hist(p, `Re-elected Mayor of ${city}`, last);
  delete p.ttl; return { city, state: st, person: p, party, terms, cycle: last + term };
}
function locSeedLegis(c) {
  const [u, l] = LOC_SIZE[c], j = gauss() * 0.04;
  const mk = (total, ind = 0) => { const two = total - ind, D = Math.round(two * clamp(0.5 - ST[c].lean * 0.02 + j + gauss() * 0.035, 0.06, 0.94)); return ind ? { D, R: two - D, I: ind, total } : { D, R: two - D, total }; };
  return c === 'NE' ? { upper: mk(u), lower: null, np: 1 } : { upper: mk(u), lower: mk(l, LOC_IND[c] || 0) };
}
// build lazily (new careers and old saves); mayors whose election passed unseen roll over quietly
function localEnsure() {
  if (!S || !S.career) return;
  const cut = billYear(Math.max(1, S.career.bills || 0)) - 1;
  if (!S.mayors) { S.mayors = {}; for (const C of LOC_CITIES) S.mayors[C[0]] = locSeedMayor(C, cut); }
  if (!S.legis) { S.legis = {}; for (const [c] of STATES) S.legis[c] = locSeedLegis(c); }
  for (const C of LOC_CITIES) { const M = S.mayors[C[0]]; if (!M) S.mayors[C[0]] = locSeedMayor(C, cut); else while (M.cycle <= cut) M.cycle += C[5]; }
  S.localLog = S.localLog || [];
}
// the Speaker of a state's lower house (Nebraska: of the Legislature), drawn when someone first asks
function locSpeaker(c) {
  const L = S.legis[c]; if (!L) return null;
  const p = locCtrl(L.lower || L.upper); if (!p) return null;
  if (L.spk && L.spk.party === p) return L.spk;
  const s = locPol(p, c, null, currentYear()); delete s.ttl;
  hist(s, `Elected ${locSpkTitle(c)}`, currentYear() - ri(0, 3)); locTrim(s, 4);
  return (L.spk = s);
}
function localPrimaryPool(party, state) {
  if (!S || !S.career) return [];
  localEnsure();
  const out = LOC_CITIES.filter(C => C[2] === state && S.mayors[C[0]].party === party).map(C => ({ p: S.mayors[C[0]].person, office: `${S.mayors[C[0]].acting ? 'Acting ' : ''}Mayor of ${C[1]}` }));
  const L = S.legis[state];
  if (L && locCtrl(L.lower || L.upper) === party) { const s = locSpeaker(state); if (s) out.push({ p: s, office: locSpkTitle(state) }); }
  return out;
}
function localMayors(party) {
  if (!S || !S.career) return [];
  localEnsure();
  return LOC_CITIES.filter(C => S.mayors[C[0]].party === party).map(C => ({ p: S.mayors[C[0]].person, office: `${S.mayors[C[0]].acting ? 'Acting ' : ''}Mayor of ${C[1]}` }));
}
// a governor's race draws a mayor or a Speaker about three times in ten (more if one has been eyeing it); not a mayor already on this year's city ballot
// (nor anyone already on the ballot for the Senate this year: races.js names its nominees in rc.names)
function localGovCandidate(party, code, year) {
  const E = S.election, busy = n => !!E && (E.races || []).some(rc => (rc.names && (rc.names.D === n || rc.names.R === n)) || (rc.nominee && rc.nominee.name === n));
  const pool = localPrimaryPool(party, code).filter(x => !busy(x.p.name) && !Object.values(S.mayors).some(M => M.person === x.p && M.cycle === year));
  const keen = pool.filter(x => x.p.ambition);
  if (keen.length && Math.random() < 0.75) return pick(keen);
  return pool.length && Math.random() < 0.3 ? pick(pool) : null;
}
// a local official moves up: an acting mayor takes over City Hall; the Speaker's gavel passes on
function localLeave(p, why) {
  if (!p || !S.mayors) return;
  for (const [k, M] of Object.entries(S.mayors)) {
    if (M.person !== p && M.person.name !== p.name) continue;
    hist(M.person, `Resigned as Mayor of ${M.city}`);
    const C = LOC_CITY[k], party = M.party === 'I' ? (C[3] < 0 ? 'D' : 'R') : M.party, s = locPol(party, M.state, M.city, currentYear());
    hist(s, `Became acting Mayor of ${M.city} when Mayor ${p.name} ${why}`); delete s.ttl;
    Object.assign(M, { person: s, party, terms: 0, acting: 1 });
  }
  for (const L of Object.values(S.legis || {})) if (L.spk && L.spk.name === p.name) { hist(L.spk, 'Gave up the Speaker\'s gavel'); delete L.spk; }
}
// anyone who has moved up (the Senate via a primary, the White House, the Cabinet) leaves their local office
function localSweep() {
  if (!S.mayors) return;
  const roles = [[S.members || [], 'won a seat in the U.S. Senate'], [Object.values(S.governors || {}), 'became Governor'], [[S.president, S.vp], 'moved into the executive branch'], [Object.values(S.cabinet || {}), 'joined the Cabinet']];
  const ppl = Object.values(S.mayors).map(M => M.person).concat(Object.values(S.legis || {}).map(L => L.spk).filter(Boolean));
  for (const p of ppl) for (const [arr, why] of roles) if (arr.some(x => x && x.name === p.name)) { localLeave(p, why); break; }
}

/* ---------------- the vote ---------------- */
// the national environment down the ballot, Democratic-positive points: the mood, the wave, and the President's drag off-cycle
function locEnvD(year) {
  const P = S.president, E = S.election, pres = P.party === 'D' ? 1 : P.party === 'R' ? -1 : 0, ref = (P.approval - 50) * 0.12;
  let d = (S.side === 'D' ? 1 : -1) * (S.mood * 0.5 + ((E && E.wave) || 0) * 0.8) + gauss() * 1.2;
  if (year % 2) d += pres * (ref - 3); else if (year % 4 === 2) d += pres * (ref - 2);
  return d;
}
// seats up move with the environment and drift back toward the state's lean
function locVote(o, c, frac, envD) {
  const two = o.D + o.R, cur = o.D / two, base = clamp(0.5 - ST[c].lean * 0.02, 0.06, 0.94);
  const D = clamp(Math.round(two * (cur + frac * (envD * 0.013 + (base - cur) * 0.3 + gauss() * 0.03))), 0, two);
  return { ...o, D, R: two - D };
}
function locRunLegis(list, year, envD, help = 0) {
  return list.map(({ code, chamber, frac }) => {
    const L = S.legis[code], o = L[chamber], n = locVote(o, code, frac, envD + (S.side === 'D' ? 1 : -1) * help);
    L[chamber] = n;
    const was = locCtrl(o), now = locCtrl(n);
    if (was !== now && L.spk && L.spk.party !== locCtrl(L.lower || L.upper)) { hist(L.spk, `Lost the gavel when ${now ? `the ${PARTY[now].short} took` : 'a tie froze'} the ${locChName(code, L.lower ? 'lower' : 'upper')}`, year); delete L.spk; }
    return { code, chamber, before: { D: o.D, R: o.R }, after: { D: n.D, R: n.R }, flipped: was !== now, up: Math.round(n.total * frac) };
  });
}
// a mayoral field: the incumbent if they run, a challenger; deep-blue (or red) cities often send two of the same party to the runoff
function locMayorField(k, y) {
  const C = LOC_CITY[k], M = S.mayors[k], lim = C[6], dom = C[3] < 0 ? 'D' : 'R';
  const runs = (!lim || M.terms < lim) && Math.random() > (M.terms >= 3 ? 0.4 : M.terms >= 2 ? 0.18 : 0.07);
  const deep = Math.abs(C[3]) >= 22 && Math.random() < 0.55;
  const mk = party => { const p = locPol(party, C[2], C[1], y); return { p, party, ttl: p.ttl }; };
  const c1 = runs ? { p: M.person, party: M.party, inc: 1, ttl: M.acting ? 'acting mayor' : 'mayor' } : mk(deep ? dom : 'D');
  const p2 = Math.random() < 0.05 ? 'I' : deep && c1.party === dom ? dom : c1.party === 'I' ? dom : c1.party === 'D' ? 'R' : 'D';
  return { key: k, c1, c2: mk(p2), runs, limited: !!lim && M.terms >= lim };
}
function locMayorMargin(F, envD) {
  const r = LOC_CITY[F.key][3] * 0.7 - envD * 0.5, pv = p => p === 'R' ? r : p === 'D' ? -r : -8;
  return (pv(F.c1.party) - pv(F.c2.party)) / 2 + (F.c1.inc ? (S.mayors[F.key].acting ? 2 : 6) : 0);
}
const locSideOf = F => (F.c1.party === S.side ? 1 : 0) - (F.c2.party === S.side ? 1 : 0);
function locRunMayor(F, y, envD, help = 0) {
  const C = LOC_CITY[F.key], M = S.mayors[F.key], city = C[1], oldParty = M.party, old = M.person;
  const mg = locMayorMargin(F, envD) + locSideOf(F) * help + gauss() * 9, [w, l] = mg >= 0 ? [F.c1, F.c2] : [F.c2, F.c1];
  const wPct = +clamp(50 + Math.abs(mg) / 2 + rnd(-0.4, 0.4), 50.2, 86).toFixed(1), lPct = +(99 - wPct).toFixed(1), sc = `${Math.round(wPct)}–${Math.round(lPct)}`;
  const tv = C[7] * 1000 * (y % 2 ? rnd(0.18, 0.28) : rnd(0.36, 0.46));
  if (w.inc) { M.terms++; hist(old, `Re-elected Mayor of ${city}, ${sc}`, y); delete M.acting; }
  else {
    if (l.inc) hist(old, `Lost re-election as Mayor of ${city} to ${w.p.name}, ${Math.round(lPct)}–${Math.round(wPct)}`, y);
    else hist(old, F.limited ? `Left office as Mayor of ${city} (term-limited)` : `Retired as Mayor of ${city}`, y);
    if (C[7] >= 900 && !M.acting) (S.formers = S.formers || []).push(old);
    hist(w.p, `Elected Mayor of ${city}, ${sc}`, y); delete w.p.ttl;
    Object.assign(M, { person: w.p, party: w.party, terms: 1 }); delete M.acting;
  }
  M.cycle = y + C[5]; locTrim(M.person);
  return { key: F.key, city, state: C[2], wName: w.p.name, wParty: w.party, lName: l.p.name, lParty: l.party, wPct, lPct, wVotes: Math.round(tv * wPct / 100), lVotes: Math.round(tv * lPct / 100),
    flip: w.party !== oldParty, open: !F.c1.inc, inc: !!w.inc, intra: w.party === l.party, wTtl: w.ttl || null, lTtl: l.ttl || null };
}
const locGovCompact = r => ({ code: r.code, wName: r.wName, wParty: r.wParty, lName: r.lName, lParty: r.lParty, wOff: r.wOff || null, lOff: r.lOff || null, wPct: +r.wPct.toFixed(1), lPct: +r.lPct.toFixed(1), wVotes: Math.round(r.wVotes), lVotes: Math.round(r.lVotes), flip: r.flip, open: r.open, incumbent: r.incumbent || null, call: r.call });
function locLog(rec) { S.localLog = (S.localLog || []).filter(r => r.year !== rec.year); S.localLog.push(rec); if (S.localLog.length > 1) S.localLog.shift(); } // the latest night only: an even year's 85 chambers are ~8 KB
function locAch() { if (STATES.filter(([c]) => locLegCtrl(c) === S.side).length >= 30) unlock('statehouses'); }

// countBallots: the even-year legislatures and mayors (governors run in world.js)
function localEvenElections(year) {
  try {
    localEnsure(); localSweep();
    const env = locEnvD(year), legis = locRunLegis(locLegisUp(year), year, env), mayors = locMayorsUp(year).map(k => locRunMayor(locMayorField(k, year), year, env));
    localSweep(); locAch();
    const gov = typeof govLastRun !== 'undefined' && govLastRun && govLastRun.year === year ? govLastRun.races.map(locGovCompact) : [];
    locLog({ year, gov, legis, mayors });
    return { year, legis, mayors };
  } catch (e) { console.error('localEvenElections failed', e); return null; }
}

/* ---------------- rendering results ---------------- */
function locClock(f) { const m = 19 * 60 + Math.round(f * 360), h = Math.floor(m / 60) % 24; return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h >= 12 && h < 24 ? 'PM' : 'AM'}`; }
const locBadge = (p, t) => `<span class="loc-flip" style="background:${p ? locPc(p) : '#6b7280'}">${t}</span>`;
function locCand(name, party, votes, pct, win, note) {
  return `<div class="loc-cand${win ? ' win' : ''}"><span class="loc-nm"><i style="background:${locPc(party)}"></i>${win ? '✓ ' : ''}<b>${name}</b> <small>(${party})${note ? ` · ${note}` : ''}</small></span><span class="loc-v">${nfmt(votes)}</span><b class="loc-p">${pct.toFixed(1)}%</b><span class="loc-bar"><i style="width:${pct}%;background:${locPc(party)}"></i></span></div>`;
}
const locOff = (off, name, inc) => off === 'Governor' || inc === name ? 'incumbent' : off || '';
function locGovCard(r) {
  return `<div class="loc-race"><div class="loc-rh"><b>${stName(r.code)}</b> <small>Governor${r.open ? ' · open seat' : ''}</small>${r.flip ? locBadge(r.wParty, `${r.wParty} FLIP`) : ''}${r.call != null ? `<span class="loc-call">called ${locClock(r.call)}</span>` : ''}</div>
    ${locCand(r.wName, r.wParty, r.wVotes, r.wPct, 1, locOff(r.wOff, r.wName, r.incumbent))}${locCand(r.lName, r.lParty, r.lVotes, r.lPct, 0, locOff(r.lOff, r.lName, r.incumbent))}</div>`;
}
function locSeatBar(o, tot) { const i = Math.max(0, tot - o.D - o.R); return `<span class="loc-sbar"><i style="width:${o.D / tot * 100}%;background:${PARTY.D.color}"></i><i style="width:${i / tot * 100}%;background:${PARTY.I.color}"></i><i style="width:${o.R / tot * 100}%;background:${PARTY.R.color}"></i><em></em></span>`; }
function locLegCard(x) {
  const o = S.legis[x.code] && S.legis[x.code][x.chamber], tot = (o && o.total) || x.after.D + x.after.R, now = locCtrl(x.after), was = locCtrl(x.before), np = x.code === 'NE';
  const lab = p => p ? (np ? `lean ${p}` : `${PARTY[p].short}`) : 'Tied';
  return `<div class="loc-race"><div class="loc-rh"><b>${locChName(x.code, x.chamber)}</b> <small>${x.up >= tot ? `all ${tot} seats` : `${x.up} of ${tot} seats`}${np ? ' · nonpartisan' : ''}</small>${x.flipped ? locBadge(now, now ? `FLIPS ${now}` : 'DEADLOCK') : ''}</div>
    <div class="loc-seats">${locSeatBar(x.before, tot)}<span>→</span>${locSeatBar(x.after, tot)}</div>
    <small style="color:var(--dim)">${lab(was)} ${x.before.D}–${x.before.R} → <b style="color:${now ? locPc(now) : 'var(--ink)'}">${lab(now)} ${x.after.D}–${x.after.R}</b> (D–R)${x.flipped ? '' : ' · control holds'}</small></div>`;
}
function locMayCard(x) {
  const C = LOC_CITY[x.key], mo = C && C[8], how = x.open ? 'open seat' : x.inc ? 'incumbent re-elected' : '<b style="color:var(--no)">incumbent ousted</b>';
  return `<div class="loc-race"><div class="loc-rh"><b>${x.city}</b> <small>${x.state === 'DC' ? 'D.C.' : stName(x.state)} · Mayor · ${how}${x.intra ? ` · ${PARTY[x.wParty] ? PARTY[x.wParty].short : x.wParty} vs ${PARTY[x.wParty] ? PARTY[x.wParty].short : x.wParty}` : ''}${mo ? ` · decided in ${mo}` : ''}</small>${x.flip ? locBadge(x.wParty, `${x.wParty} FLIP`) : ''}</div>
    ${locCand(x.wName, x.wParty, x.wVotes, x.wPct, 1, x.inc ? 'incumbent' : x.wTtl)}${locCand(x.lName, x.lParty, x.lVotes, x.lPct, 0, !x.inc && !x.open && x.lTtl === 'mayor' ? 'incumbent' : x.lTtl === 'acting mayor' ? 'acting mayor' : x.lTtl)}</div>`;
}
// a map of the night: governors' races in full color, legislatures and city halls shaded; gold rings on flips
function locResMap(rec) {
  const by = {}, at = c => by[c] || (by[c] = { tags: [] });
  for (const r of rec.gov || []) Object.assign(at(r.code), { gov: r }).tags.push('G');
  for (const x of rec.legis || []) { const b = at(x.code); b.leg = b.leg || x; if (x.flipped) b.lflip = x; if (!b.tags.includes('L')) b.tags.push('L'); }
  for (const x of rec.mayors || []) { const b = at(x.state); b.may = b.may || x; if (x.flip) b.mflip = 1; if (!b.tags.includes('M')) b.tags.push('M'); }
  return usMap({
    fill: c => { const b = by[c]; if (!b) return null; if (b.gov) return { c: locPc(b.gov.wParty), op: 0.9 }; const p = b.leg ? locCtrl(b.leg.after) : b.may.wParty, op = b.leg ? 0.45 : 0.22; return p ? { c: locPc(p), op } : { c: '#6b7280', op }; },
    sub: c => by[c] ? by[c].tags.join('') : '',
    ring: c => by[c] && ((by[c].gov && by[c].gov.flip) || by[c].lflip || by[c].mflip) ? '#f6d27a' : null,
    title: c => { const b = by[c]; if (!b) return stName(c); return [stName(c), b.gov ? `Governor: ${b.gov.wName} (${b.gov.wParty})${b.gov.flip ? ' — FLIP' : ''}` : '', b.leg ? `Legislature: ${(rec.legis || []).filter(x => x.code === c).map(x => `${x.chamber === 'upper' ? 'Senate' : locLower(c)} ${x.after.D}–${x.after.R}${x.flipped ? ' (flipped)' : ''}`).join(', ')}` : '', b.may ? `Mayors: ${(rec.mayors || []).filter(x => x.state === c).map(x => `${x.city}: ${x.wName} (${x.wParty})`).join(', ')}` : ''].filter(Boolean).join('\n'); },
  });
}
function locTally(rec) {
  const n = (a, f) => a.filter(f).length, g = rec.gov || [], l = rec.legis || [], m = rec.mayors || [];
  const card = (lbl, big, sm) => `<div class="pc"><small>${lbl}</small><b>${big}</b><small>${sm}</small></div>`;
  return `<div class="pulsecards loc-tally">${g.length ? card('Governors', `<span style="color:${PARTY.D.color}">D ${n(g, r => r.wParty === 'D')}</span> · <span style="color:${PARTY.R.color}">R ${n(g, r => r.wParty === 'R')}</span>`, `${n(g, r => r.flip)} flipped`) : ''}
    ${l.length ? card('Legislative chambers', `${l.length} up`, `${n(l, x => x.flipped)} changed hands`) : ''}${m.length ? card('Mayors', `<span style="color:${PARTY.D.color}">D ${n(m, x => x.wParty === 'D')}</span> · <span style="color:${PARTY.R.color}">R ${n(m, x => x.wParty === 'R')}</span>${n(m, x => x.wParty === 'I') ? ` · I ${n(m, x => x.wParty === 'I')}` : ''}`, `${m.length} races · ${n(m, x => x.flip)} flipped`) : ''}</div>`;
}
const LOC_TABS = [['gov', 'Governors'], ['leg', 'Legislatures'], ['may', 'Mayors']];
function locResBody(rec, tab) {
  const has = { gov: (rec.gov || []).length, leg: (rec.legis || []).length, may: (rec.mayors || []).length };
  if (!has[tab]) tab = LOC_TABS.map(t => t[0]).find(k => has[k]) || 'gov';
  const flipsFirst = (a, f) => a.slice().sort((x, y) => (f(y) ? 1 : 0) - (f(x) ? 1 : 0));
  const list = tab === 'gov' ? flipsFirst(rec.gov || [], r => r.flip).map(locGovCard) : tab === 'leg' ? (rec.legis || []).slice().sort((a, b) => (b.flipped ? 1 : 0) - (a.flipped ? 1 : 0) || Math.abs(a.after.D - a.after.R) / (a.after.D + a.after.R) - Math.abs(b.after.D - b.after.R) / (b.after.D + b.after.R)).map(locLegCard) : (rec.mayors || []).slice().sort((a, b) => (b.flip ? 1 : 0) - (a.flip ? 1 : 0) || locPop(b.key) - locPop(a.key)).map(locMayCard);
  return `<div class="ptabs loc-tabs">${LOC_TABS.map(([k, t]) => `<button class="btn${k === tab ? ' on' : ''}" data-lt="${k}" ${has[k] ? '' : 'disabled'}>${t} <small>${has[k]}</small></button>`).join('')}</div>
    <div class="loc-list${window.FF_FAST ? '' : ' loc-anim'}">${list.join('') || '<p style="color:var(--dim)">Nothing on the ballot.</p>'}</div>`;
}
function locWide(on) { const c = $('#modal-card'); if (c) c.classList.toggle('loc-wide', !!on); }
function locShow(html) { showModal(html); locWide(true); }

/* ---------------- the Off-Year Election Night ---------------- */
// (re-checked when the step runs, so an earlier call from interlude() itself is not repeated)
HOOKS.interlude.push(() => localOffYearDue() ? [next => localOffYearDue() ? localOffYear(next) : next()] : []);
function localOffYearDue() { const n = S.career.bills, y = billYear(Math.max(1, n)); return n > 0 && n % 3 === 0 && y % 2 === 1 && S.localOff !== y; }
function localOffYear(done) {
  try {
    localEnsure(); localSweep();
    const plan = locOffPlan(billYear(S.career.bills)), finish = () => { locWide(false); done(); };
    if (!plan.gov.length && !plan.legis.length && !plan.mayors.length) { S.localOff = plan.y; return done(); }
    locOffPreview(plan, () => { locOffRun(plan); locOffNight(plan, 'gov', () => locOffMorning(plan, finish)); });
  } catch (e) { console.error('Off-year elections failed', e); locWide(false); done(); }
}
function locOffPlan(y) {
  const fields = {}, gov = Object.keys(S.governors).filter(c => govUp(c, y));
  for (const c of gov) fields[c] = govField(c, y);
  return { y, env: locEnvD(y), gov, fields, legis: locLegisUp(y), mayors: locMayorsUp(y).map(k => locMayorField(k, y)).sort((a, b) => locPop(b.key) - locPop(a.key)), help: { gov: {}, leg: 0, may: {} }, picks: [] };
}
const locList = a => a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
function locGovChance(plan, c) { const f = plan.fields[c], sg = f.A === S.side ? 1 : -1; return normCdf((sg * govMargin(f, plan.y) + (plan.help.gov[c] || 0)) / 8); }
function locMayChance(plan, F) { const sd = locSideOf(F); return sd ? normCdf(sd * (locMayorMargin(F, plan.env) + sd * (plan.help.may[F.key] || 0)) / 9) : null; }
function locOffPreview(plan, go) {
  const P = S.president, out = other(P.party), me = S.side, c = S.career, y = plan.y;
  const govCands = c2 => { const f = plan.fields[c2], B = other(f.A); return [[f.cA, f.A, f.offA], [f.cB, B, f.offB]]; };
  const pname = (p, party, off) => p ? `<b style="color:${locPc(party)}">${p.name}</b> <small>(${party}${off ? `, ${off === 'Governor' ? 'incumbent' : off}` : ''})</small>` : `<b style="color:${locPc(party)}">the ${PARTY[party].short} nominee</b>`;
  const contests = plan.mayors.filter(F => locSideOf(F) !== 0).slice(0, 2);
  const opts = [
    ...plan.gov.map(cd => [`gov:${cd}`, `✈️ Send the national party to ${stName(cd)}`, `+3 points for your candidate · your chance now ${Math.round(locGovChance(plan, cd) * 100)}%`]),
    ...(plan.legis.length ? [['leg', '🏛 Fund the statehouse caucuses', `${locList([...new Set(plan.legis.map(x => stName(x.code)))])}: a better shot at ${plan.legis.length} chamber${plan.legis.length > 1 ? 's' : ''}`]] : []),
    ...contests.map(F => [`may:${F.key}`, `🎤 Headline a rally in ${LOC_CITY[F.key][1]}`, `+4 for ${(F.c1.party === me ? F.c1 : F.c2).p.name} · your chance now ${Math.round(locMayChance(plan, F) * 100)}%`]),
  ];
  const draw = () => {
    const left = Math.min(2 - plan.picks.length, c.capital);
    locShow(`<div class="kicker">Off-Year Elections · Fall ${y}</div><h2>November ${y}: The Off-Year Races</h2>
      <p>No Senate seats on the ballot, but ${locList([plan.gov.length ? `${plan.gov.length} governor${plan.gov.length > 1 ? 's' : ''} (${locList(plan.gov.map(stName))})` : '', plan.legis.length ? `${plan.legis.length} legislative chamber${plan.legis.length > 1 ? 's' : ''}` : '', plan.mayors.length ? `${plan.mayors.length} mayors` : ''].filter(Boolean))} are. Every pundit in Washington will read the results as a verdict on ${presTitle()} (${P.approval}%), ${P.party === 'I' ? 'and with an independent in the White House, neither party can count on the usual swing.' : `and history favors the ${PARTY[out].short}: the party out of the White House usually gains.`}</p>
      ${plan.gov.length ? `<div class="loc-prev">${plan.gov.map(cd => { const ch = locGovChance(plan, cd); return `<div class="race"><span><b>${stName(cd)}</b> <small style="color:var(--dim)">Governor${plan.fields[cd].open ? ' · open seat' : ''}</small><br>${govCands(cd).map(x => pname(...x)).join(' <small>vs</small> ')}</span><span class="chance"><b style="color:${chanceColor(ch)}">${Math.round(ch * 100)}%</b><span class="mbar"><i style="width:${ch * 100}%;background:${chanceColor(ch)}"></i></span><small>your chance</small></span></div>`; }).join('')}</div>` : ''}
      ${plan.legis.length ? `<p class="loc-chips"><b>Statehouses:</b> ${plan.legis.map(x => { const o = S.legis[x.code][x.chamber], p = locCtrl(o); return `<span class="bchip" style="border-color:${p ? locPc(p) : '#6b7280'}">${locChName(x.code, x.chamber)} <b style="color:${p ? locPc(p) : 'var(--ink)'}">${o.D}–${o.R}</b></span>`; }).join(' ')}</p>` : ''}
      ${plan.mayors.length ? `<p class="loc-chips"><b>City halls:</b> ${plan.mayors.slice(0, 8).map(F => `<span class="bchip">${LOC_CITY[F.key][1]} <small>${F.c1.inc ? `${F.c1.p.name} (${F.c1.party}) seeks a ${S.mayors[F.key].acting ? 'full' : 'new'} term` : `open: ${F.c1.p.name} (${F.c1.party}) vs ${F.c2.p.name} (${F.c2.party})`}</small></span>`).join(' ')}${plan.mayors.length > 8 ? ` <small style="color:var(--dim)">and ${plan.mayors.length - 8} more</small>` : ''}</p>` : ''}
      <hr><b>Your fall trips</b> <small style="color:var(--dim)">· up to two, 1 capital each · you have ${c.capital} capital${plan.picks.length ? ` · done: ${plan.picks.length}` : ''}</small>
      <div class="shop">${opts.map(([k, t, s]) => `<button class="btn" data-choice="${k}" ${left < 1 || plan.picks.includes(k) ? 'disabled' : ''}><span>${t}${plan.picks.includes(k) ? ' ✓' : ''}<small>${s}</small></span><span class="cost">1 cap</span></button>`).join('')}</div>
      <div class="choices"><button class="btn primary big adv" id="locgo">Election Night →</button></div>`);
    $('#modal-card').querySelectorAll('[data-choice]').forEach(b => b.onclick = () => {
      const k = b.dataset.choice; if (c.capital < 1 || plan.picks.length >= 2 || plan.picks.includes(k)) return;
      c.capital--; plan.picks.push(k); const [t, v] = k.split(':');
      if (t === 'gov') plan.help.gov[v] = 3; else if (t === 'leg') plan.help.leg = 3; else plan.help.may[v] = 4;
      sfx.click(); draw();
    });
    $('#locgo').onclick = () => { sfx.gavel(); go(); };
  };
  draw();
}
function locOffRun(plan) {
  const y = plan.y, gov = runGovernorsIn(plan.gov, y, { fields: plan.fields, help: plan.help.gov });
  const legis = locRunLegis(plan.legis, y, plan.env, plan.help.leg), mayors = plan.mayors.map(F => locRunMayor(F, y, plan.env, plan.help.may[F.key] || 0));
  localSweep(); locAch(); S.localOff = y;
  plan.res = { year: y, gov: gov.map(locGovCompact), legis, mayors };
  locLog(plan.res);
  plan.verdict = locVerdict(plan);
}
// the referendum: flips toward the party out of the White House, weighted (a governor counts double, a city hall half)
function locVerdict(plan) {
  const r = plan.res, P = S.president, me = S.side, inP = P.party === 'I' ? other(me) : P.party, out = other(inP);
  const net = (a, f) => a.reduce((s, x) => s + (f(x) === out ? 1 : f(x) === inP ? -1 : 0), 0);
  const gN = net(r.gov.filter(x => x.flip), x => x.wParty), cN = net(r.legis.filter(x => x.flipped), x => locCtrl(x.after)), mN = net(r.mayors.filter(x => x.flip), x => x.wParty);
  const score = gN * 2 + cN + mN * 0.5 + plan.env * (out === 'D' ? 1 : -1) / 4;
  const tone = score >= 2 ? 'rout' : score >= 0.5 ? 'warn' : score > -1 ? 'split' : 'defy';
  const mood = +(clamp(score * 0.35, -1.5, 1.5) * (me === out ? 1 : -1)).toFixed(1);
  S.mood = clamp(S.mood + mood, -15, 15);
  if (tone === 'rout') P.approval = clamp(P.approval - 1, 18, 82);
  const myFlips = r.gov.filter(x => x.flip && x.wParty === me).length, myCh = r.legis.filter(x => x.flipped && locCtrl(x.after) === me).length;
  let cap = 0;
  if (myFlips || myCh >= 2) { cap = 1; S.career.capital += 1; }
  if (myFlips) { addLegacy(3 * myFlips); unlock('offyear'); }
  const helped = plan.picks.map(k => { const [t, v] = k.split(':'); const x = t === 'gov' ? r.gov.find(g => g.code === v) : t === 'may' ? r.mayors.find(m => m.key === v) : null; return x ? { where: t === 'gov' ? stName(v) : x.city, won: x.wParty === me, close: x.wPct - x.lPct < (t === 'gov' ? 3 : 4) } : t === 'leg' ? { where: 'the statehouses', won: r.legis.reduce((a, l) => a + l.after[me] - l.before[me], 0) > 0, leg: 1 } : null; }).filter(Boolean);
  return { tone, score, mood, cap, myFlips, gN, cN, mN, out, inP, helped };
}
function locOffNight(plan, tab, next) {
  const r = plan.res, y = plan.y;
  locShow(`<div class="kicker">Off-Year Election Night · November ${y}</div><h2>The Off-Year Returns</h2>
    <p style="margin:4px 0 8px;color:var(--dim)">${r.gov.length ? `First call of the night: ${stName(r.gov.slice().sort((a, b) => a.call - b.call)[0].code)}. ` : ''}Governors, statehouses and city halls: a referendum on ${presTitle()}, one precinct at a time.</p>
    ${locTally(r)}<div class="campmap loc-map">${locResMap(r)}<small>Full color: governors' races · shaded: legislatures and city halls (G governor, L legislature, M mayor) · gold rings: flips</small></div>
    ${locResBody(r, tab)}
    <div class="choices"><button class="btn primary big adv" id="locmorn">The morning papers →</button></div>`);
  $('#modal-card').querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { sfx.click(); locOffNight(plan, b.dataset.lt, next); });
  $('#locmorn').onclick = next;
}
function locOffMorning(plan, done) {
  const r = plan.res, V = plan.verdict, P = S.president, L = lastName(P).toUpperCase(), y = plan.y, me = S.side;
  const hl = { rout: pick([`THE OFF-YEAR VERDICT: VOTERS REBUKE ${L}`, `THE OFF-YEAR VERDICT: A THUMPING FOR THE ${PARTY[V.inP].short.toUpperCase()}`]), warn: `THE OFF-YEAR VERDICT: A WARNING SHOT FOR ${L}`, split: 'THE OFF-YEAR VERDICT: A SPLIT DECISION', defy: `THE OFF-YEAR VERDICT: ${PARTY[V.inP].short.toUpperCase()} DEFY HISTORY` }[V.tone];
  const g = r.gov.slice().sort((a, b) => (b.flip ? 1 : 0) - (a.flip ? 1 : 0) || (a.wPct - a.lPct) - (b.wPct - b.lPct)), lf = r.legis.filter(x => x.flipped), bigM = r.mayors.slice().sort((a, b) => locPop(b.key) - locPop(a.key))[0];
  const govLine = x => `In ${stName(x.code)}, ${x.wOff && x.wOff !== 'Governor' ? `${x.wOff} ` : ''}${x.wName} (${x.wParty}) ${x.flip ? `took the governor's mansion from the ${PARTY[x.lParty].short}` : x.incumbent === x.wName ? 'won a second term' : `held the governorship for the ${PARTY[x.wParty].short}`}, ${x.wPct.toFixed(0)}–${x.lPct.toFixed(0)} over ${x.lName}${x.lOff && x.lOff !== 'Governor' ? `, the ${x.lOff}` : ''}.`;
  const body = [
    g.length ? g.slice(0, 2).map(govLine).join(' ') : `No governors were on the ballot, but ${r.mayors.length} city halls were.`,
    r.legis.length ? (lf.length ? `The statehouses moved: ${lf.map(x => `the ${locChName(x.code, x.chamber)} ${locCtrl(x.after) ? `flipped to the ${PARTY[locCtrl(x.after)].short}, ${x.after.D}–${x.after.R}` : `deadlocked at ${x.after.D}–${x.after.R}`}`).join('; ')}.` : `Every legislative chamber on the ballot (${r.legis.length}) stayed in the same hands.`) : '',
    bigM ? `In ${bigM.city}, ${bigM.wName} (${bigM.wParty}) ${bigM.inc ? 'cruised to another term' : bigM.flip ? `flipped City Hall` : bigM.open ? 'won the open race' : `unseated Mayor ${bigM.lName}`}, ${bigM.wPct.toFixed(0)}–${bigM.lPct.toFixed(0)}${bigM.intra ? `, in an all-${PARTY[bigM.wParty] ? PARTY[bigM.wParty].name : 'independent'} runoff` : ''}.${r.mayors.filter(m => m.flip).length > 1 ? ` ${r.mayors.filter(m => m.flip).length} city halls changed parties in all.` : ''}` : '',
    { rout: `“This was a referendum on ${presTitle()}, and ${lastName(P)} lost it,” said a ${PARTY[V.out].name} strategist before the last precincts were in. The White House blamed turnout.`, warn: `No wave, but a warning: the ${PARTY[V.out].short} ran ahead of the map almost everywhere. “Ignore this at your peril,” one ${PARTY[V.inP].name} pollster wrote at 2 a.m.`, split: `Both parties claimed victory before breakfast, which usually means neither got one. The ${PARTY[V.out].short} expected more from a year like this.`, defy: `The party in the White House was supposed to lose ground. It didn't. “${presTitle()} has coattails, apparently,” a stunned ${PARTY[V.out].name} consultant conceded.` }[V.tone],
  ].filter(Boolean);
  const helped = V.helped.map(h => h.leg ? `Your money for the statehouse caucuses ${h.won ? 'paid off: a net gain in seats' : 'bought nothing: a net loss in seats'}.` : `Your trip to ${h.where}: ${h.won ? (h.close ? '<b style="color:var(--yes)">won, narrowly — you may have made the difference</b>' : '<b style="color:var(--yes)">won</b>') : (h.close ? '<b style="color:var(--no)">lost by a whisker</b>' : '<b style="color:var(--no)">lost</b>')}.`).join(' ');
  showModal(`${frontPage({ headline: hl, sub: `${r.gov.length ? `Governors: ${locList(r.gov.map(x => `${x.code} ${x.wParty}${x.flip ? ' (flip)' : ''}`))}. ` : ''}${r.legis.length ? `${lf.length} of ${r.legis.length} chambers flip. ` : ''}${r.mayors.length ? `${r.mayors.length} mayors elected.` : ''}`, body, mood: V.tone === 'split' ? 'night' : (V.tone !== 'defy') === (me === V.out) ? 'dawn' : 'storm', date: `November ${y} · Morning edition` })}
    <div class="primnews loc-verdict"><b>What it means for the whip</b><p style="margin:4px 0">Your party's national mood ${V.mood >= 0 ? '+' : '−'}${Math.abs(V.mood).toFixed(1)}${V.cap ? ' · +1 capital' : ''}${V.myFlips ? ` · legacy +${3 * V.myFlips}` : ''}${V.tone === 'rout' ? ` · ${presTitle()} −1` : ''}. ${helped}</p>
    <small style="color:var(--dim)">Governors now ${Object.values(S.governors).filter(x => x.party === 'D').length} D – ${Object.values(S.governors).filter(x => x.party === 'R').length} R · trifectas ${STATES.filter(([c2]) => localTrifecta(c2) === 'D').length} D – ${STATES.filter(([c2]) => localTrifecta(c2) === 'R').length} R. The Statehouses (Whip's Office) has the full map.</small></div>
    <div class="choices"><button class="btn primary big adv" id="locdone">Back to Washington</button></div>`);
  $('#locdone').onclick = done;
}

/* ---------------- State & local results on the morning-after summary ---------------- */
function locResultsView(nd, back, tab = 'leg') {
  const L = nd.local || { year: nd.year, legis: [], mayors: [] }, rec = { gov: (nd.gov || []).map(locGovCompact), legis: L.legis || [], mayors: L.mayors || [] };
  const lf = rec.legis.filter(x => x.flipped);
  locShow(`<div class="kicker">State & local · November ${nd.year}</div><h2>Down the Ballot</h2>
    <p style="margin:4px 0 8px">${rec.legis.length} legislative chambers, ${rec.gov.length} governors and ${rec.mayors.length} mayors were on the ballot. ${lf.length ? `<b>${lf.length} chamber${lf.length > 1 ? 's' : ''} changed hands:</b> ${locList(lf.map(x => `<span style="color:${locCtrl(x.after) ? locPc(locCtrl(x.after)) : 'var(--ink)'}">${locChName(x.code, x.chamber)}</span>`))}.` : 'Every legislative chamber stayed in the same hands.'} Trifectas now: <b style="color:${PARTY.D.color}">${STATES.filter(([c]) => localTrifecta(c) === 'D').length} D</b>, <b style="color:${PARTY.R.color}">${STATES.filter(([c]) => localTrifecta(c) === 'R').length} R</b>.</p>
    ${locTally(rec)}<div class="campmap loc-map">${locResMap(rec)}<small>Full color: governors' races · shaded: legislatures and city halls · gold rings: flips</small></div>
    ${locResBody(rec, tab)}
    <div class="choices"><button class="btn primary big adv" id="locback">Back to the summary</button></div>`);
  $('#modal-card').querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { sfx.click(); locResultsView(nd, back, b.dataset.lt); });
  $('#locback').onclick = () => { locWide(false); back(); };
}
HOOKS.results.push({
  html: nd => nd && nd.local ? '<button class="btn ghost" id="locres">🏛 State & local results</button>' : '',
  bind: (nd, back) => { const el = $('#locres'); if (el) el.onclick = () => locResultsView(nd, back); },
});

/* ---------------- the Statehouses (Whip's Office) ---------------- */
function localStatehouses(back, tab = 'states', sub = 'gov') {
  localEnsure();
  const codes = STATES.map(s => s[0]), from = locFromYear(), tri = c => localTrifecta(c), cnt = f => codes.filter(f).length;
  const tD = cnt(c => tri(c) === 'D'), tR = cnt(c => tri(c) === 'R'), lD = cnt(c => locLegCtrl(c) === 'D'), lR = cnt(c => locLegCtrl(c) === 'R');
  const gD = cnt(c => S.governors[c] && S.governors[c].party === 'D'), gR = cnt(c => S.governors[c] && S.governors[c].party === 'R');
  const ms = LOC_CITIES.map(C => [C, S.mayors[C[0]]]), mD = ms.filter(x => x[1].party === 'D').length, mR = ms.filter(x => x[1].party === 'R').length;
  const map = usMap({
    fill: c => { if (!S.legis[c] || !S.governors[c]) return null; const t = tri(c), l = locLegCtrl(c); return t ? { c: locPc(t), op: 0.9 } : { c: locPc(S.governors[c].party), c2: l ? locPc(l) : '#6b7280', op: 0.6 }; },
    sub: c => tri(c) || '',
    attr: c => S.governors[c] ? `data-lgov="${c}"` : '',
    title: c => { const L = S.legis[c]; if (!L) return stName(c); const g = S.governors[c]; return `${stName(c)}: Gov. ${g ? `${g.name} (${g.party})` : '—'} · ${L.np ? `Legislature ${L.upper.D}–${L.upper.R} (nonpartisan)` : `Senate ${L.upper.D}–${L.upper.R} · ${locLower(c)} ${L.lower.D}–${L.lower.R}`}${tri(c) ? ` · ${tri(c)} trifecta` : ' · divided'}`; },
  });
  const ch = (o, np) => { const p = locCtrl(o); return `<span style="color:${p ? locPc(p) : 'var(--ink)'}">${o.D}–${o.R}${o.I ? `–${o.I}` : ''}</span>${np ? ` <small>(lean ${p || '—'})</small>` : ''}`; };
  const rows = codes.map(c => {
    const L = S.legis[c], g = S.governors[c], t = tri(c), lg = localNextLegis(c, from), gy = g ? locNextGov(c, from) : null;
    return `<tr><td><b>${stName(c)}</b></td><td>${g ? `<a href="#" data-lgov="${c}" style="color:${locPc(g.party)}">${g.name}</a>` : '—'}</td><td class="num">${ch(L.upper, L.np)}</td><td class="num">${L.lower ? ch(L.lower) : '<small>unicameral</small>'}</td>
      <td>${t ? `<b style="color:${locPc(t)}">${t} trifecta</b>` : '<span style="color:var(--dim)">divided</span>'}</td><td class="num"><small>${lg ? `Leg. ${lg}` : ''}${gy ? ` · Gov. ${gy}` : ''}</small></td></tr>`;
  }).join('');
  const mrows = ms.map(([C, M]) => {
    const lim = C[6], up = M.cycle, lastTerm = lim && M.terms >= lim;
    return `<div class="race loc-mrow"><span class="nomp">${portrait(M.person)}</span><span style="flex:1"><a href="#" data-lmay="${C[0]}"><b style="color:${locPc(M.party)}">${M.person.name}</b></a> <small>(${M.party})</small><br><small>${M.acting ? 'Acting mayor' : 'Mayor'} of <b>${C[1]}</b>, ${C[2] === 'DC' ? 'D.C.' : stName(C[2])} · ${M.acting ? 'since a vacancy' : `term ${M.terms}${lim ? ` of ${lim}` : ''}`} · next election ${up}${C[8] ? ` (${C[8]})` : ''}${lastTerm ? ' · <span style="color:var(--gold2)">term-limited</span>' : ''}${M.person.ambition ? ' · <span style="color:var(--gold2)">eyeing higher office</span>' : ''}</small></span></div>`;
  }).join('');
  const last = (S.localLog || [])[S.localLog.length - 1];
  const tabs = [['states', '50 states'], ['mayors', `Mayors (${LOC_CITIES.length})`], ['latest', last ? `Latest results (${last.year})` : 'Latest results']];
  locShow(`<div class="kicker">The Statehouses · ${season(S.career.bills + 1)} ${billYear(S.career.bills + 1)}</div><h2>Fifty Capitols</h2>
    <div class="pulsecards"><div class="pc"><small>Trifectas</small><b><span style="color:${PARTY.D.color}">D ${tD}</span> · <span style="color:${PARTY.R.color}">R ${tR}</span></b><small>${50 - tD - tR} divided</small></div>
      <div class="pc"><small>Legislatures</small><b><span style="color:${PARTY.D.color}">D ${lD}</span> · <span style="color:${PARTY.R.color}">R ${lR}</span></b><small>${50 - lD - lR} split · Nebraska by lean</small></div>
      <div class="pc"><small>Governors</small><b><span style="color:${PARTY.D.color}">D ${gD}</span> · <span style="color:${PARTY.R.color}">R ${gR}</span></b><small>${50 - gD - gR ? `${50 - gD - gR} other` : 'all 50'}</small></div>
      <div class="pc"><small>Big-city mayors</small><b><span style="color:${PARTY.D.color}">D ${mD}</span> · <span style="color:${PARTY.R.color}">R ${mR}</span></b><small>${LOC_CITIES.length - mD - mR ? `${LOC_CITIES.length - mD - mR} independent · ` : ''}${LOC_CITIES.length} largest cities</small></div></div>
    <p style="margin:6px 0">Democratic trifectas: <b>${tD}</b>, Republican: <b>${tR}</b>, divided: <b>${50 - tD - tR}</b>. Statehouses draw the House maps, and their Speakers and big-city mayors are tomorrow's Senate candidates.</p>
    <div class="campmap loc-map">${map}<small>Solid: one party holds the governor and the legislature · split: governor (upper left) and legislature (lower right) · click a state for its governor</small></div>
    <div class="ptabs loc-tabs">${tabs.map(([k, t]) => `<button class="btn${k === tab ? ' on' : ''}" data-ls="${k}" ${k === 'latest' && !last ? 'disabled' : ''}>${t}</button>`).join('')}</div>
    ${tab === 'states' ? `<div class="res-scroll loc-scroll"><table class="res-table loc-table"><thead><tr><th>State</th><th>Governor</th><th class="num">Senate</th><th class="num">House</th><th>Control</th><th class="num">Next</th></tr></thead><tbody>${rows}</tbody></table></div>`
      : tab === 'mayors' ? `<div class="races loc-mayors" style="max-height:none">${mrows}</div>`
      : last ? `<p style="margin:6px 0;color:var(--dim)">November ${last.year}${last.year % 2 ? ' · the off-year elections' : ''}</p>${locResBody(last, sub)}` : ''}
    <div class="choices"><button class="btn primary big adv" id="lsback">Back</button></div>`);
  const card = $('#modal-card'), me = () => localStatehouses(back, tab, sub);
  card.querySelectorAll('[data-ls]').forEach(b => b.onclick = () => { sfx.click(); localStatehouses(back, b.dataset.ls, sub); });
  card.querySelectorAll('[data-lt]').forEach(b => b.onclick = () => { sfx.click(); localStatehouses(back, tab, b.dataset.lt); });
  card.querySelectorAll('[data-lgov]').forEach(a => a.onclick = e => { e.preventDefault(); const c = a.dataset.lgov; if (S.governors[c]) profileModal(S.governors[c], `Governor of ${stName(c)}`, me); });
  card.querySelectorAll('[data-lmay]').forEach(a => a.onclick = e => { e.preventDefault(); const M = S.mayors[a.dataset.lmay]; profileModal(M.person, `${M.acting ? 'Acting ' : ''}Mayor of ${M.city}`, me); });
  $('#lsback').onclick = () => { locWide(false); back(); };
}
HOOKS.office.push({
  // in an odd year, before November: what's on the ballot
  html: () => {
    localEnsure();
    const n = S.career.bills, y = billYear(n + 1); if (y % 2 === 0 || S.localOff === y) return '';
    const g = Object.keys(S.governors || {}).filter(c => govUp(c, y)), l = [...new Set(locLegisUp(y).map(x => stName(x.code)))], m = locMayorsUp(y).map(k => LOC_CITY[k][1]);
    return `<hr><b>🗳️ The off-year elections · November ${y}</b><p style="margin:4px 0;font-size:13px">${[g.length ? `Governors in ${locList(g.map(stName))}` : '', l.length ? `legislatures in ${locList(l)}` : '', m.length ? `mayors in ${locList(m.slice(0, 6))}${m.length > 6 ? ` and ${m.length - 6} more cities` : ''}` : ''].filter(Boolean).join('; ')}. ${(n + 1) % 3 === 0 ? 'Election Night comes right after the next bill.' : `They come after the fall bill.`}</p>`;
  },
  button: () => '<button class="btn" id="statehouses" data-office-extra>🏛 Statehouses</button>',
  bind: draw => { const el = $('#statehouses'); if (el) el.onclick = () => localStatehouses(draw); },
});
function localPulseChyron() {
  if (!S || !S.governors) return '';
  const y = billYear(S.career.bills + 1); if (y % 2 === 0 || S.localOff === y) return '';
  const g = Object.keys(S.governors).filter(c => govUp(c, y)).map(c => stName(c).toUpperCase());
  return g.length ? `OFF-YEAR WATCH: ${locList(g)} ELECT GOVERNORS IN NOVEMBER` : '';
}

/* ---------------- city-hall news between bills ---------------- */
HOOKS.worldNews.push(() => {
  if (!S.career || Math.random() > 0.16) return [];
  localEnsure();
  const keys = Object.keys(S.mayors), k = pick(keys), M = S.mayors[k], p = M.person, city = M.city, ln = lastName(p), gov = S.governors && S.governors[M.state];
  const kind = pick(['viral', 'viral', 'feud', 'ambition', 'ambition', 'scandal', 'deal']);
  if (kind === 'scandal') {
    const why = pick(['a no-bid towing contract steered to a donor', 'an FBI raid on City Hall', 'a city credit card spent at a Las Vegas casino', 'a pay-to-play scheme for liquor licenses']);
    hist(p, `Caught up in ${why}`); localLeave(p, 'resigned in disgrace');
    return [`🚨 <b>Mayor ${p.name} of ${city} (${p.party}) resigns</b> over ${why}. ${S.mayors[k].person.name} becomes acting mayor.`];
  }
  if (kind === 'viral') { const what = pick(['shoveling a stranger\'s driveway at 5 a.m.', 'a profanity-laced rant about potholes', 'a budget explainer on TikTok', 'chasing a purse-snatcher down a sidewalk', 'a pickup basketball game against the city\'s NBA team']); hist(p, `Went viral for ${what}`); return [`📱 Mayor ${p.name} of ${city} goes viral for ${what}. Cable news can't get enough of ${ln}.`]; }
  if (kind === 'feud' && gov && gov.party !== M.party) { hist(p, `Feuded publicly with Gov. ${gov.name} over state funding`); return [`🥊 Mayor ${p.name} of ${city} (${M.party}) and Gov. ${gov.name} (${gov.party}) trade insults over ${pick(['transit money', 'the state police', 'school funding', 'a stadium deal', 'migrant buses'])}. "${pick(['Come say it in my city', 'The governor has never ridden a bus', 'Albany-style politics, in our state', 'I don\'t take orders from the capitol'])}," says ${ln}.`]; }
  if (kind === 'ambition' && !p.ambition && M.party !== 'I' && M.state !== 'DC') { p.ambition = 1; hist(p, 'Formed an exploratory committee for statewide office'); return [`🧭 Mayor ${p.name} of ${city} (${M.party}) forms an exploratory committee. ${stName(M.state)} insiders expect a run for ${pick(['the Senate', 'governor', 'the Senate or governor'])}: watch the next primary.`]; }
  const deal = pick(['a new downtown stadium', 'a light-rail expansion', 'a 10,000-unit housing plan', 'a police budget overhaul']);
  hist(p, `Pushed through ${deal}`);
  return [`🏙️ ${city} approves ${deal}, a signature win for Mayor ${p.name} (${M.party}).`];
});
