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

/* ---------------- the House, district by district (house.js) ---------------- */
// swingSide: national points for your party. Every one of the 435 districts is decided on its own lean, the national
// environment, incumbency and luck; returns { states, districts, D, R, before, popD, popR } and updates S.house and S.districts
function runHouse(swingSide) { return hdElect(swingSide); }

/* ---------------- the Presidency, by electoral vote ---------------- */
// the presidential race, shared by the campaign trail's projection and the real count
const MODERATES = ['Blue Dogs', 'GOP Moderates', 'New Democrats', 'Establishment', 'Conservative Democrats', 'Progressive Republicans'], FLANKS = ['Progressives', 'Freedom Caucus'];
// the presidential map's pivotal states, recentered so a tied national environment is a coin flip (the Senate and House keep ST[].lean)
const PRES_EDGE = 2.5, PRES_CASH = 0.9; // difficulty: the opponent's machine, and what a unit of bulk money buys
const PRES_LEAN_ADJ = { MI: -2, PA: -2, WI: -2, NV: -2, AZ: -1, GA: -1, NC: -1 };
// an independent President's executive orders (world.js keys its list by party)
if (typeof EO_LIST !== 'undefined' && !EO_LIST.I) EO_LIST.I = [['Government Ethics Order', 'taxes'], ['Infrastructure Fast-Track Order', 'economy'], ['Rural Broadband Order', 'rural'], ['Veterans First Order', 'security'], ['Drug Price Transparency Order', 'welfare'], ['Open Data Order', 'tech'], ['Conservation Order', 'environment'], ['Housing Permits Order', 'urban']];
function nightFallbackName() { let nm = fullName(); for (let i = 0; i < 20 && lastName({ name: nm }) === lastName(S.president); i++) nm = fullName(); return nm; }
// base is the national margin of the `ref` party's ticket over the other major party. ref is the White House party, or, under an
// independent President, the party opposite yours (so callers' (inc === S.side ? 1 : -1) * base is still your ticket's margin)
function presSetup() {
  const P = S.president, inc = P.party, N = S.nominees || {}, E = S.election || {}, third = N.I && N.I.name ? N.I : null;
  const running = P.terms < 2 && (inc === 'I' ? !third || third.name === P.name : !N[inc] || N[inc].name === P.name);
  const ref = inc === 'I' ? other(S.side) : inc;
  const nom = p => N[p] || { name: p === inc && running ? P.name : (S._fallbackNames = S._fallbackNames || { D: nightFallbackName(), R: nightFallbackName() })[p], p: p === inc && running ? P : null, state: p === inc && running ? P.state : null, faction: p === inc && running ? P.faction : pick(FACTIONS[p])[0], charisma: 1, vp: null };
  const noms = { D: nom('D'), R: nom('R') };
  // the third candidate: indie.js's nominee, or an independent President seeking a second term
  if (inc === 'I' && running) noms.I = { label: 'Independent', lean: 0, ...(third || {}), name: P.name, p: P, state: P.state, home: (third && third.home) || P.state, faction: P.faction, major: true, incumbent: true, strength: clamp((third ? third.strength : 16) + (P.approval - 45) * 0.6, 6, 42) };
  else if (third) noms.I = third;
  S.whStreak = S.whStreak || 1;
  const q = p => (noms[p].charisma - 1) * 3 + (MODERATES.includes(noms[p].faction) ? 1 : FLANKS.includes(noms[p].faction) ? -1 : 0);
  const indWH = inc === 'I';
  let base = (indWH ? 0 : (P.approval - 50) / 5 - (running ? 0 : 2) - 1.5 * (S.whStreak - 1)) + (IND() ? 0 : (ref === S.side ? S.mood : -S.mood)) * 0.25 + q(ref) - q(other(ref));
  // the fall campaign (campaign.js) adds its national effects here, from your ticket's point of view
  // the other party runs a professional national campaign too: your ticket starts PRES_EDGE points behind what the fundamentals say
  // an independent career has no ticket in the two-party race: only the (D-positive) wave forecasters see and a cabinet-offer endorsement move it
  base += IND() ? envSign(ref) * (E.waveSignal || 0) + envSign(ref) * (typeof cauPresEnvD === 'function' ? cauPresEnvD() : 0) : (ref === S.side ? 1 : -1) * ((E.debate || 0) + cashEff(E.presCash || 0, PRES_CASH) + (E.waveSignal || 0) + (typeof campaignEffects === 'function' ? campaignEffects() : 0) - PRES_EDGE);
  if (S.war && S.war.party === inc && !indWH) base += (S.war.support - 50) / 12;
  return { inc, ref, running, noms, base };
}
const presEnvD = s => s.ref === 'D' ? s.base : -s.base;
function stateMarginD(c, envD, noms) {
  let dm = -(stLean(c) + (PRES_LEAN_ADJ[c] || 0)) * 1.5 + envD; // the state table is compressed: spread it so a +8 national margin is ~350 EV, not 412
  if (noms.D.state === c) dm += 4; if (noms.R.state === c) dm -= 4;            // home-state advantage
  if (noms.D.vp && noms.D.vp.state === c) dm += 2; if (noms.R.vp && noms.R.vp.state === c) dm -= 2;
  if (typeof campaignStateD === 'function') dm += campaignStateD(c, noms); // planks, focus states, surrogates (campaign.js)
  return dm;
}
function presProjection() {
  const s = presSetup(), envD = presEnvD(s), margins = {};
  let evMine = 0;
  for (const c of Object.keys(EV)) { margins[c] = stateMarginD(c, envD, s.noms); if ((margins[c] > 0) === (frameP() === 'D')) evMine += EV[c]; }
  return { margins, evMine, noms: s.noms };
}
// the third name on the ballot. Prefer indie.js's S.nominees.I (or an independent President); else the fall campaign's surge
// candidate; else, only when no independent field was run at all (old saves), the old 30% random minor candidate
function presThird(s) {
  if (s.noms.I) { const T = s.noms.I; return { ...T, strength: clamp(IND() && typeof cauThirdNat === 'function' ? (+T.strength || 3) + cauThirdNat(T) : +T.strength || 3, 0.5, 45), lean: clamp(+T.lean || 0, -1, 1), home: T.home || T.state || (T.p && T.p.state) || null }; }
  const N = S.nominees || {}, tp = S.election && S.election.camp && S.election.camp.thirdParty;
  if (tp) return { name: tp.name || fullName(), label: 'Independent', strength: clamp((tp.share || 5) * rnd(0.6, 0.95), 1, 12), lean: 0, fixed: true };
  if (!('I' in N) && Math.random() < 0.3) return { name: fullName(), label: 'Independent', strength: rnd(2, 9), lean: 0, fixed: true };
  return null;
}
// a third candidate's share in one state: around the national number, stronger where the state leans its way, at home and in its region
function presThirdShare(T, c, nat, reg) {
  const sl = clamp(stLean(c) / 15, -2.5, 2.5);
  let x = nat * clamp(1 + 0.22 * T.lean * sl, 0.45, 1.7) * reg[Math.min(2, Math.floor(colOf(c) / 4))] * Math.exp(gauss() * (T.major ? 0.15 : 0.25));
  if (T.home === c) x += T.major ? 10 : 3;
  if (T.vp && T.vp.state === c) x += T.major ? 3 : 1;
  if (IND() && typeof cauThirdAdj === 'function') x += cauThirdAdj(c, T);   // the caucus's Third Force campaign
  return clamp(x, 0.3, 70);
}
// the winner's margin over the runner-up in one state's presidential result
const presWM = s => { const v = [s.dPct, s.rPct, s.iPct || 0].sort((a, b) => b - a); return v[0] - v[1]; };
const presWho = (d, r, i) => i > d && i > r ? 'I' : d > r ? 'D' : 'R';
function runPres() {
  const P = S.president, s = presSetup(), { inc, ref, running, noms, base } = s;
  const names = { D: noms.D.name, R: noms.R.name }, T = presThird(s);
  if (T) names.I = T.name;
  // the wave forecasters saw is in base; the rest of it lands on election night
  const surprise = S.election ? envSign(ref) * ((S.election.wave || 0) - (S.election.waveSignal || 0)) : 0;
  const score = clamp(base + surprise + rnd(-3, 3), -20, 20), envD = ref === 'D' ? score : -score;
  // a real third candidate's night: its national number moves, and so do the regions (west, middle, east)
  const nat = T && !T.fixed ? T.strength * (T.major ? Math.exp(gauss() * 0.2) : rnd(0.65, 1.05)) : 0, reg = [0, 1, 2].map(() => T && T.major ? Math.exp(gauss() * 0.12) : 1);
  const states = {};
  let evD = 0, evR = 0, evI = 0, popD = 0, popR = 0, popI = 0;
  for (const c of Object.keys(EV)) {
    const dm = stateMarginD(c, envD, noms) + rnd(-2.5, 2.5), d0 = clamp(49.25 + dm / 2, 5, 95);
    let iPct = 0, fD = d0 / 98.5;   // fD: the share of the third candidate's vote that would otherwise have gone Democratic
    if (T && T.fixed) iPct = clamp(T.strength + rnd(-2, 3), 0.5, 20);
    else if (T) { iPct = presThirdShare(T, c, nat, reg); fD = clamp(fD - 0.3 * T.lean, 0.05, 0.95); }
    let dPct = d0 - iPct * fD, rPct = 98.5 - iPct - dPct;
    if (dPct < 1) { dPct = 1; rPct = 98.5 - iPct - 1; } if (rPct < 1) { rPct = 1; iPct = 98.5 - dPct - 1; }
    const tv = turnout(c), w = presWho(dPct, rPct, iPct);
    states[c] = { dPct, rPct, iPct, dVotes: tv * dPct / 100, rVotes: tv * rPct / 100, iVotes: tv * iPct / 100, ev: EV[c], w, call: callTime(c, presWM({ dPct, rPct, iPct })) };
    if (w === 'D') evD += EV[c]; else if (w === 'R') evR += EV[c]; else evI += EV[c];
    popD += states[c].dVotes; popR += states[c].rVotes; popI += states[c].iVotes;
  }
  const year = S.election ? S.election.year : currentYear(), r1 = v => Math.round(v * 10) / 10, EVS = { D: evD, R: evR, I: evI };
  // nobody at 270: the House chooses, one vote per state delegation (runHouse has already seated the new delegations).
  // The delegations are all Democratic or Republican, so a third candidate's electors only deny a majority. Evenly split delegations
  // abstain; the side with more delegations prevails, and a dead-even House keeps the White House party (or the bigger elector count)
  // The Elector Gambit (independent career): electors pledged by your caucus can put a major party's ticket over 270 instead
  let houseVote = null, electors = null;
  if (evD < 270 && evR < 270 && evI < 270) {
    electors = IND() && typeof cauElectors === 'function' ? cauElectors(evD, evR, evI) : null;   // 'D' | 'R' | null
    if (!electors) { houseVote = { D: 0, R: 0 }; for (const v of Object.values(hdDelegations())) { if (v.D > v.R) houseVote.D++; else if (v.R > v.D) houseVote.R++; } }
  }
  const winner = electors || (evD >= 270 ? 'D' : evR >= 270 ? 'R' : evI >= 270 ? 'I' : houseVote.D > houseVote.R ? 'D' : houseVote.R > houseVote.D ? 'R' : inc !== 'I' ? inc : evD >= evR ? 'D' : 'R');
  const tie = evD === 269 && evR === 269, losers = ['D', 'R', 'I'].filter(p => p !== winner && names[p]), loser = losers.sort((a, b) => EVS[b] - EVS[a])[0];
  S.whStreak = winner === inc ? S.whStreak + 1 : 1;
  // the record book: the last six presidential results by state, so the night can show swings
  const book = (S.presHistory || []).filter(h => h && h.year !== year).slice(-5), prev = book.length ? book[book.length - 1] : null;
  const iw = Object.keys(states).filter(c => states[c].w === 'I');
  S.presHistory = book.concat([{ year, states: Object.fromEntries(Object.entries(states).map(([c, s]) => [c, r1(s.dPct - s.rPct)])), evD, evR, popD: Math.round(popD), popR: Math.round(popR), names, winner, ...(evI ? { evI, iw, popI: Math.round(popI) } : {}) }]);
  const homes = { D: noms.D.state || null, R: noms.R.state || null, ...(T ? { I: T.home || null } : {}) };
  const vps = { D: noms.D.vp ? { name: noms.D.vp.name, state: noms.D.vp.state || null } : null, R: noms.R.vp ? { name: noms.R.vp.name, state: noms.R.vp.state || null } : null };
  if (T && T.vp && T.vp.name) vps.I = { name: T.vp.name, state: T.vp.state || null };
  const offices = { D: noms.D.office || (noms.D.p === P ? 'President' : null), R: noms.R.office || (noms.R.p === P ? 'President' : null), ...(T ? { I: T.office || (T.incumbent ? 'President' : null) } : {}) };
  const evStr = [['D', evD], ['R', evR], ['I', evI]].filter(x => x[1]).sort((a, b) => b[1] - a[1]).map(([p, v]) => `${v} ${p}`).join('–');
  const evTxt = electors ? ` after the independent electors broke a ${evStr} Electoral College deadlock` : houseVote ? (tie ? ' by the House after a 269–269 Electoral College deadlock' : ' by the House after no candidate won a majority in the Electoral College') : `, ${evStr} in the Electoral College`;
  // the live record behind a nominee or running mate, by name: after a save/load the record's `p` is a detached copy,
  // and someone who left office in this very count (a term-limited governor, a retiring senator) is already among the formers
  const liveOf = (n, p) => { if (!n || !n.name) return null; if (P.name === n.name) return P; if (S.vp && S.vp.name === n.name) return S.vp;
    return S.members.find(m => m.name === n.name && (!p || m.party === p)) || Object.values(S.governors || {}).find(g => g && g.name === n.name) || Object.values(S.cabinet || {}).find(c => c && c.name === n.name) || (S.reps || []).find(r => r.name === n.name) || (S.formers || []).find(f => f && f.name === n.name) || (Object.values(S.mayors || {}).find(M => M && M.person && M.person.name === n.name) || {}).person || n.p || null; };
  for (const p of losers) {
    if (p === 'I' && !(T.major || T.p || T.incumbent)) continue;
    const lp = liveOf(p === 'I' ? T : noms[p], p === 'I' ? null : p);
    if (lp) hist(lp, electors ? `Lost the presidential election when the independent electors broke a ${evStr} deadlock` : houseVote ? `Lost the presidential election in the House after ${tie ? 'a 269–269 Electoral College deadlock' : 'no candidate won an Electoral College majority'}` : `Lost the presidential election${p === 'I' ? ' as an independent' : ''}, ${EVS[p]}–${EVS[winner]} in the Electoral College`, year);
  }
  let what, extra = [];
  // the running mate takes office: out of the Senate, a governor's mansion, the cabinet or the House
  const seatVP = N => {
    const vm = S.members.find(m => m.name === N.vp.name);
    const govCode = Object.keys(S.governors || {}).find(c => S.governors[c].name === N.vp.name);
    const cabPost = Object.keys(S.cabinet || {}).find(k => S.cabinet[k] && S.cabinet[k].name === N.vp.name);
    const live = vm || liveOf(N.vp, null);
    S.vp = live ? { ...live, b: undefined } : Object.assign(newPerson(winner, N.vp.state || pick(STATES)[0]), { name: N.vp.name, faction: N.vp.faction || pick(FACTIONS[winner])[0] });
    hist(S.vp, 'Elected Vice President', year);
    if (vm) extra.push(vacateSeat(vm, 'was elected Vice President'));
    if (govCode) { governorSucceeded(govCode, 'was elected Vice President'); extra.push(`${ST[govCode].name} gets a new governor.`); }
    if (cabPost && !S.pendingCabinet) S.cabinetVacancy = cabPost;
  };
  // nobody holds two offices: the President and Vice President come off the House list and the formers' list
  const tidy = () => { const taken = x => x && (x.name === S.president.name || (S.vp && x.name === S.vp.name)); S.reps = (S.reps || []).filter(r => !taken(r)); S.formers = (S.formers || []).filter(f => !taken(f)); };
  const NW = winner === 'I' ? T : noms[winner];
  if (winner === inc && running) {
    P.terms++; P.approval = clamp(P.approval + 4, 22, 72); hist(P, `Re-elected President${evTxt}`, year); what = `${presTitle()} wins a second term.`;
    const NV = NW.vp;
    if (NV && NV.name && !(S.vp && S.vp.name === NV.name)) {   // the convention dumped the Vice President for a new running mate
      const old = S.vp; seatVP(NW);
      if (old) { hist(old, 'Left office as Vice President', year); S.formers = (S.formers || []).concat([{ ...old, b: undefined }]); extra.push(`${S.vp.name} succeeds ${old.name} as Vice President.`); }
      tidy();
    }
  }
  else {
    const oldT = presTitle(), live = liveOf(NW, winner === 'I' ? null : winner);
    const person = live ? { ...live, b: undefined } : Object.assign(newPerson(winner, NW.home || NW.state || pick(STATES)[0]), NW.name ? { name: NW.name } : {});
    // the winner leaves their old job (an independent may be a senator who quit their party)
    const sen = S.members.find(m => m.name === person.name && (winner === 'I' || m.party === winner));
    if (sen) extra.push(vacateSeat(sen, 'was elected President'));
    const govCode = Object.keys(S.governors || {}).find(c => S.governors[c].name === person.name);
    if (govCode) { governorSucceeded(govCode, 'was elected President'); extra.push(`${ST[govCode].name} gets a new governor.`); }
    hist(person, `Elected President of the United States${winner === 'I' ? ' as an independent' : ''}${evTxt}`, year);
    S.president = { ...person, name: person.name, party: winner, faction: winner === 'I' ? FACTIONS.I[0][0] : NW.faction || pick(FACTIONS[winner])[0], approval: ri(52, 58), terms: 1, ...(winner === 'I' && T.label ? { label: T.label } : {}) };
    if (NW.vp && NW.vp.name) seatVP(NW);
    else { S.vp = newPerson(winner, pick(STATES)[0]); S.vp.faction = FACTIONS[winner][0][0]; hist(S.vp, 'Elected Vice President', year); }
    tidy();
    S.pendingCabinet = true;
    what = winner === 'I' && inc === 'I' ? `${oldT} steps aside, and ${T.label && T.label !== 'Independent' ? `${T.label} candidate` : 'fellow independent'} ${NW.name} keeps the White House outside the two parties, carrying ${iw.length} state${iw.length === 1 ? '' : 's'}.`
      : winner === 'I' ? `<b>A political earthquake!</b> ${T.label && T.label !== 'Independent' ? `${T.label} candidate` : 'Independent'} ${NW.name} wins the White House, carrying ${iw.length} state${iw.length === 1 ? '' : 's'} and ${evI} electoral votes — the first President in living memory elected outside the two major parties.`
      : (winner === inc ? `${oldT} steps aside; fellow ${PARTY[winner].short.replace(/s$/, '')} ${NW.name} keeps the White House.` : `<b>A flip!</b> ${PARTY[winner].name} ${NW.name} wins the White House.`) + ` The new President comes from the ${S.president.faction}.`;
    if (winner !== inc) S.vacancyBlocked = false;
  }
  if (houseVote) {
    const tied = 50 - houseVote.D - houseVote.R, wl = winner === 'D' ? 'R' : 'D';
    what = `<b>${tie ? 'A 269–269 deadlock.' : `No majority: ${evStr} in the Electoral College.`}</b> ${evI && !tie ? `${names.I}'s ${evI} electoral votes left everyone short of 270, and the delegations, all Democratic or Republican, never seriously considered the independent. ` : ''}The House chose the President, one vote per state delegation: ${houseVote[winner] > houseVote[wl] ? `${houseVote[winner]} delegations to ${houseVote[wl]}${tied ? `, ${tied} split` : ''}` : `the delegations split ${houseVote.D}–${houseVote.R}${tied ? ` with ${tied} tied` : ''}, and after weeks of balloting the ${PARTY[winner].short} prevailed`}. ` + what;
  }
  if (electors) what = `<b>No majority: ${evStr} in the Electoral College.</b> The independent electors cast their ${evI} votes for ${names[electors]}, and the Electoral College has a winner after all. ` + what;
  S.nominees = null; S._fallbackNames = null;
  if (extra.length) what += ' ' + extra.join(' ');
  const third = T ? { label: T.label || 'Independent', major: !!T.major, lean: T.lean || 0, color: T.color || null } : null;
  return { states, evD, evR, evI, popD, popR, popI, names, winner, loser, inc, running, what, year, prev: prev ? { year: prev.year, states: prev.states } : null, homes, vps, offices, houseVote, third, ...(electors ? { electors } : {}) };
}

/* ---------------- the show ---------------- */
let NIGHT = null;
// opts (all optional): final → open on the final results; tab/view/sort/sel → restore a previous position
function openNight(data, onDone, opts = {}) {
  const tabs = [data.pres && 'pres', 'senate', 'house', data.gov && data.gov.length && 'gov'].filter(Boolean);
  const final = !!(window.FF_FAST || opts.final);
  if (NIGHT && NIGHT.timer) clearInterval(NIGHT.timer); // a night left running (re-entry without closing it) must not tick twice
  NIGHT = { ...data, data, tab: tabs.includes(opts.tab) ? opts.tab : tabs[0], tabs, t: final ? 1 : 0, sel: opts.sel || null, onDone, called: new Set(), timer: null,
    view: ['map', 'table', 'ticker'].includes(opts.view) ? opts.view : 'map', sort: opts.sort || null, fanfared: !!opts.final, hview: opts.hview === 'state' ? 'state' : 'dist' };
  let el = $('#night');
  if (!el) { el = document.createElement('div'); el.id = 'night'; document.body.appendChild(el); }
  el.classList.remove('hidden');
  hideModal();
  // pointerdown (not click) so taps land even while the screen refreshes live
  el.onpointerdown = e => {
    const N = NIGHT; if (!N) return;
    const t = e.target.closest('[data-tab],[data-code],[data-rtab],[data-sort],[data-hview],#nprev,#nnext,#nskip,#ndone,#fullres');
    if (!t) return;
    if (t.dataset.tab) { N.tab = t.dataset.tab; N.sel = null; sfx.click(); }
    else if (t.dataset.code) {
      // a Decision Desk row may point at another tab's race
      if (t.dataset.tabGo && N.tabs.includes(t.dataset.tabGo)) { N.tab = t.dataset.tabGo; N.view = 'map'; }
      if (contests(N.tab).some(c => c.code === t.dataset.code)) { N.sel = t.dataset.code; sfx.click(); }
    }
    else if (t.dataset.rtab) { N.view = t.dataset.rtab; sfx.click(); }
    else if (t.dataset.hview) { N.hview = t.dataset.hview; N.sort = null; sfx.click(); }
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
  const { data, onDone, tab, view, sort, sel, hview } = N;
  if (N.timer) clearInterval(N.timer);
  document.removeEventListener('keydown', nightKeys);
  NIGHT = null;
  resExplorer(rec, () => openNight(data, onDone, { final: true, tab, view, sort, sel, hview }));
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
  if (N.pres) { const p = { D: 0, R: 0, I: 0, und: 0 }; for (const s of Object.values(N.pres.states)) { if (NIGHT.t >= s.call) p[s.w] += s.ev; else p.und += s.ev; } out.pres = p; }
  if (N.gov && N.gov.length) { const up = new Set(N.gov.map(r => r.code)), g = { D: 0, R: 0, I: 0, und: 0 }; for (const [c, p] of Object.entries(N.govBefore || {})) if (!up.has(c)) g[p]++; for (const r of N.gov) { if (isCalled({ call: r.call })) g[r.wParty]++; else g.und++; } out.gov = g; }
  { let d = 0, r = 0, u = 0; const HD = N.house.districts;
    if (HD) { for (const L of Object.values(HD)) for (const x of L) { if (NIGHT.t >= x.call) { if (x.w === 'D') d++; else r++; } else u++; } }
    else for (const s of Object.values(N.house.states)) { if (NIGHT.t >= s.call) { d += s.d; r += s.r; } else u += s.n; }
    out.house = { D: d, R: r, und: u }; }
  return out;
}
// sepI: a third candidate's own count (electoral votes), not independents who caucus with the Democrats
function barChart(label, a, total, need, sub, foot = '', sepI = false) {
  const w = v => (v / total * 100).toFixed(2) + '%';
  return `<div class="tcard"><div class="tl"><b>${label}</b><span>${sub || ''}</span></div>
    <div class="tbar"><div style="width:${w(a.D)};background:${PARTY.D.color}"></div>${a.I ? `<div style="width:${w(a.I)};background:${PARTY.I.color}"></div>` : ''}<div style="width:${w(a.und)};background:#3a4250"></div><div style="width:${w(a.R)};background:${PARTY.R.color}"></div>
    <i class="need" style="left:${w(need)}"></i><i class="need" style="left:${w(total - need)}"></i></div>
    <div class="tl"><span style="color:${PARTY.D.color};font-weight:800">D ${a.D}${a.I && !sepI ? ` <span style="color:${PARTY.I.color}">+ I ${a.I}</span>` : ''}</span><span style="color:var(--dim)">${a.I && sepI ? `<b style="color:${PARTY.I.color}">I ${a.I}</b> · ` : ''}${a.und ? `${a.und} uncalled` : 'all called'} · ${need} to win</span><span style="color:${PARTY.R.color};font-weight:800">R ${a.R}</span></div>${foot ? `<div class="res-foot">${foot}</div>` : ''}</div>`;
}

function nightMap() {
  const N = NIGHT;
  const byCode = Object.fromEntries(contests(N.tab).map(c => [c.code, c]));
  return usMap({
    cls: 'nmap',
    fill: code => {
      const c = byCode[code]; if (!c) return null;
      if (N.tab === 'house' && N.house.districts) {   // shaded by the seats called so far, fainter until the whole delegation is in
        const L = N.house.districts[code] || [], k = L.filter(x => N.t >= x.call); if (!k.length) return { c: '#4a5366' };
        const sh = k.filter(x => x.w === 'D').length / k.length; return { c: sh > 0.5 ? PARTY.D.color : sh < 0.5 ? PARTY.R.color : '#8a8fa0', op: (0.35 + Math.abs(sh - 0.5) * 1.3) * (k.length < L.length ? 0.7 : 1) };
      }
      if (!isCalled(c)) return { c: '#4a5366' };
      if (N.tab === 'senate' || N.tab === 'gov') { const s = shade(c.r.wParty, c.r.margin); return { c: s.fill, op: s.op }; }
      if (N.tab === 'pres') { const s = shade(c.s.w, presWM(c.s)); return { c: s.fill, op: s.op }; }
      const sh = c.s.d / c.s.n; return { c: sh > 0.5 ? PARTY.D.color : sh < 0.5 ? PARTY.R.color : '#8a8fa0', op: 0.35 + Math.abs(sh - 0.5) * 1.3 };
    },
    sub: code => {
      const c = byCode[code]; if (!c) return '';
      if (N.tab === 'pres') return c.s.ev;
      if (N.tab === 'house' && N.house.districts && !isCalled(c)) { const k = (N.house.districts[code] || []).filter(x => N.t >= x.call); return k.length ? `${k.filter(x => x.w === 'D').length}–${k.filter(x => x.w === 'R').length}…` : N.t > c.call * 0.6 ? '…' : ''; }
      if (!isCalled(c)) return N.t > c.call * 0.6 ? '…' : '';
      if (N.tab === 'senate' || N.tab === 'gov') return c.r.flip ? 'FLIP' : '';
      return `${c.s.d}–${c.s.r}`;
    },
    ring: code => { const c = byCode[code]; if (N.sel === code) return '#fff'; if (!c) return null;
      if (N.tab === 'house' && N.house.districts) return (N.house.districts[code] || []).some(x => x.flip && N.t >= x.call) ? '#f6d27a' : null;
      if (!isCalled(c)) return null; return ((N.tab === 'senate' || N.tab === 'gov') && c.r.flip) || (N.tab === 'house' && c.s.d !== c.s.prevD) ? '#f6d27a' : null; },
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
      ${rows.map(x => candRow(x[0], x[1], x[2], x[3], x[4])).join('')}<div class="nsub">${Math.round(rep * 100)}% reported${called ? ` · margin ${pct(presWM(s))} · ${prev == null ? 'first presidential election on record' : `swing ${resSwing(s.dPct - s.rPct - prev)} since ${P.prev.year}`}` : ''}</div>
      ${resPresNotes(P, c.code, called)}`;
  } else if (N.house.districts) {
    // every district in the state, called one by one
    const s = c.s, L = N.house.districts[c.code] || [], isC = x => N.t >= x.call, k = L.filter(isC), d = k.filter(x => x.w === 'D').length;
    const gD = k.filter(x => x.flip && x.w === 'D').length, gR = k.filter(x => x.flip && x.w === 'R').length, open = k.filter(x => x.open).length;
    const flips = gD || gR ? `${gD ? `<b style="color:${PARTY.D.color}">D +${gD}</b> ` : ''}${gR ? `<b style="color:${PARTY.R.color}">R +${gR}</b>` : ''} in flips` : k.length ? 'no seat has changed hands' : '';
    body = `<h3>${stName(c.code)} · House</h3><div class="nsub"><b>${s.n} seat${s.n > 1 ? 's' : ''}</b> · ${leanLabel(stLean(c.code))} · ${status}</div>${hdDots(L, isC)}
      <div class="nsub">${k.length < L.length ? `${k.length} of ${L.length} called · ` : ''}<b style="color:${PARTY.D.color}">D ${d}</b> · <b style="color:${PARTY.R.color}">R ${k.length - d}</b> · ${flips}${open ? ` · ${open} open seat${open > 1 ? 's' : ''}` : ''}</div>
      ${candRow('All districts', 'D', s.dVotes * rep, s.dPct, called && s.dPct > s.rPct)}${candRow('All districts', 'R', s.rVotes * rep, s.rPct, called && s.rPct > s.dPct)}
      <div class="lh hd-lh">${L.length === 1 ? 'The at-large seat' : `Every district · ${L.length}`}</div><div class="res-scroll hd-list" data-keep="hd-${c.code}">${L.map(x => hdRowHTML(x, isC(x), reporting({ call: x.call }))).join('')}</div>`;
  } else {
    const s = c.s, ch = s.d - s.prevD;
    body = `<h3>${stName(c.code)} · House</h3><div class="nsub"><b>${s.n} seat${s.n > 1 ? 's' : ''}</b> · ${leanLabel(stLean(c.code))} · ${status}</div>
      ${called ? `<div class="seatrow">${('<i style="background:' + PARTY.D.color + '"></i>').repeat(s.d)}${('<i style="background:' + PARTY.R.color + '"></i>').repeat(s.r)}</div>
      <div class="nsub">D ${s.d} · R ${s.r} · ${ch === 0 ? 'no change' : `<b style="color:${ch > 0 ? PARTY.D.color : PARTY.R.color}">${ch > 0 ? 'D' : 'R'} +${Math.abs(ch)}</b>`}</div>` : '<div class="seatrow">' + '<i style="background:#3a4250"></i>'.repeat(s.n) + '</div>'}
      ${candRow('All districts', 'D', s.dVotes * rep, s.dPct, called && s.dPct > s.rPct)}${candRow('All districts', 'R', s.rVotes * rep, s.rPct, called && s.rPct > s.dPct)}`;
  }
  return nav + body;
}
function marginOf(c) { return c.r ? c.r.margin : presWM(c.s); }
function raceList() {
  const L = navList();
  return L.map(c => {
    const called = isCalled(c);
    let st;
    const HL = NIGHT.tab === 'house' && NIGHT.house.districts ? NIGHT.house.districts[c.code] || [] : null, part = HL ? HL.filter(x => NIGHT.t >= x.call) : [];
    if (!called && part.length) st = `<span style="color:var(--dim)">${part.length}/${HL.length} in ·</span> <b style="color:${PARTY.D.color}">${part.filter(x => x.w === 'D').length}</b>–<b style="color:${PARTY.R.color}">${part.filter(x => x.w === 'R').length}</b>`;
    else if (!called) st = `<span style="color:var(--dim)">${NIGHT.t > c.call * 0.6 && Math.abs(marginOf(c)) < 5 ? 'Too close' : 'Waiting'}</span>`;
    else if (c.r) st = `<b style="color:${PARTY[c.r.wParty].color}">${c.r.wParty} +${c.r.margin.toFixed(1)}</b>${c.r.flip ? ' <span class="call flip">FLIP</span>' : ''}`;
    else if (NIGHT.tab === 'pres') st = `<b style="color:${PARTY[c.s.w].color}">${c.s.w} +${presWM(c.s).toFixed(1)}</b> · ${c.s.ev} EV`;
    else st = `<b style="color:${PARTY.D.color}">${c.s.d}</b>–<b style="color:${PARTY.R.color}">${c.s.r}</b>${c.s.d !== c.s.prevD ? ` <span class="call flip">${c.s.d > c.s.prevD ? 'D' : 'R'} +${Math.abs(c.s.d - c.s.prevD)}</span>` : ''}`;
    return `<div class="lrow ${NIGHT.sel === c.code ? 'on' : ''}" data-code="${c.code}"><span><b>${c.code}</b> ${stName(c.code)}</span><span>${st}</span></div>`;
  }).join('');
}
// diverging bar chart of the closest called contests
function closestChart() {
  const N = NIGHT, HD = N.tab === 'house' && N.house.districts;
  const L = (HD ? [].concat(...Object.values(HD)).filter(x => N.t >= x.call).map(x => ({ code: x.id.slice(0, 2), lbl: x.id, m: -x.m, flip: x.flip }))
    : contests(N.tab).filter(isCalled).map(c => ({ code: c.code, lbl: c.code, m: c.r ? (c.r.wParty === 'D' ? -1 : 1) * c.r.margin : c.s.w === 'I' ? presWM(c.s) : c.s.rPct - c.s.dPct, flip: c.r && c.r.flip, ind: c.r ? c.r.wParty === 'I' : c.s.w === 'I' })))
    .sort((a, b) => Math.abs(a.m) - Math.abs(b.m)).slice(0, HD ? 12 : 10);
  if (!L.length) return '<div class="nsub">No races called yet.</div>';
  const W = 420, H = L.length * 20 + 24, mx = Math.max(10, ...L.map(x => Math.abs(x.m)));
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="cchart"><line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H - 16}" stroke="#666"/>`;
  L.forEach((x, i) => {
    const y = i * 20 + 4, len = Math.abs(x.m) / mx * (W / 2 - 40), right = x.m > 0;
    svg += `<g class="lrow" data-code="${x.code}" style="cursor:pointer"><rect x="${right ? W / 2 : W / 2 - len}" y="${y}" width="${Math.max(2, len)}" height="14" rx="3" fill="${x.ind ? PARTY.I.color : right ? PARTY.R.color : PARTY.D.color}"/>
      <text x="${right ? W / 2 - 6 : W / 2 + 6}" y="${y + 11}" font-size="11" fill="#ddd" text-anchor="${right ? 'end' : 'start'}" font-weight="700">${x.lbl}${x.flip ? ' ★' : ''}</text>
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
    return `<b>Popular vote</b><div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">${P.names.D} ${pct(d / tot * 100)}</div>${i ? `<div style="width:${i / tot * 100}%;background:${PARTY.I.color}">${i / tot >= 0.07 ? pct(i / tot * 100) : ''}</div>` : ''}<div style="width:${r / tot * 100}%;background:${PARTY.R.color}">${pct(r / tot * 100)} ${P.names.R}</div></div><div class="nsub" style="display:flex;justify-content:space-between"><span>${nfmt(d)} votes</span>${i ? `<span style="color:${PARTY.I.color}">${P.names.I} (I) ${nfmt(i)}</span>` : ''}<span>${nfmt(r)} votes</span></div>${resPopCallout(P, (T || tallies()).pres, d, r, i)}`;
  }
  if (N.tab === 'house') {
    const H = N.house; let d = 0, r = 0;
    for (const s of Object.values(H.states)) { const rp = reporting({ call: s.call }); d += s.dVotes * rp; r += s.rVotes * rp; }
    const tot = d + r || 1;
    const fl = H.districts ? [].concat(...Object.values(H.districts)).filter(x => x.flip && N.t >= x.call) : null, g = p => fl.filter(x => x.w === p).length;
    return `<b>National House vote</b><div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">D ${pct(d / tot * 98.4)}</div><div style="width:${r / tot * 100}%;background:${PARTY.R.color}">R ${pct(r / tot * 98.4)}</div></div><div class="nsub" style="display:flex;justify-content:space-between"><span>${nfmt(d)}</span><span>Before: D ${H.before.D} – R ${H.before.R}</span><span>${nfmt(r)}</span></div>${fl ? `<div class="nsub">Pickups so far: <b style="color:${PARTY.D.color}">D +${g('D')}</b> · <b style="color:${PARTY.R.color}">R +${g('R')}</b> · net ${g('D') === g('R') ? 'even' : `<b style="color:${PARTY[g('D') > g('R') ? 'D' : 'R'].color}">${g('D') > g('R') ? 'D' : 'R'} +${Math.abs(g('D') - g('R'))}</b>`}</div>` : ''}`;
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
  return `<b>Senate vote, all races</b><div class="pv"><div style="width:${d / tot * 100}%;background:${PARTY.D.color}">D ${pct(d / tot * 100)}</div>${ind ? `<div style="width:${ind / tot * 100}%;background:${PARTY.I.color}">${ind / tot >= 0.07 ? 'I ' + pct(ind / tot * 100) : ''}</div>` : ''}<div style="width:${r / tot * 100}%;background:${PARTY.R.color}">R ${pct(r / tot * 100)}</div></div>
    <div class="nsub">Flips so far: ${flips.length ? flips.map(x => `<b style="color:${PARTY[x.wParty].color}">${x.code}</b>`).join(', ') : 'none'} · Before: D ${N.before.D} – R ${N.before.R}${N.before.I ? ` – I ${N.before.I}` : ''}</div>`;
}

function renderNight() {
  if (!NIGHT) return;
  const N = NIGHT, T = tallies();
  const tabName = { pres: 'President', senate: 'Senate', house: 'House', gov: 'Governors' };
  // keep the side panel and the table/ticker scrolled where they were (keyed by pane, so a view switch starts at the top)
  const scrollers = () => [...document.querySelectorAll('#night .nside, #night .res-scroll')], keep = {};
  for (const el of scrollers()) keep[el.dataset.keep || el.className] = el.scrollTop;
  const govB = N.govBefore ? Object.values(N.govBefore).reduce((a, p) => { a[p] = (a[p] || 0) + 1; return a; }, { D: 0, R: 0, I: 0 }) : null;
  const calls = N.tabs.reduce((a, tab) => a + contests(tab).filter(isCalled).length, 0);
  const sub = `<div class="res-sub">${[['map', '🗺 Map'], ['table', '☰ Table'], ['ticker', `📰 Decision Desk <small>${calls}</small>`]].map(([k, l]) => `<button class="btn ${N.view === k ? 'on' : ''}" data-rtab="${k}">${l}</button>`).join('')}${N.tab === 'house' && N.view === 'table' && N.house.districts ? `<span class="hd-tog">${[['dist', 'Districts'], ['state', 'States']].map(([k, l]) => `<button class="btn ${N.hview === k ? 'on' : ''}" data-hview="${k}">${l}</button>`).join('')}</span>` : ''}<span class="res-subhint">${N.view === 'table' ? 'click a header to sort · click a row to select' : N.view === 'ticker' ? 'every call of the night · click one to jump to it' : 'click a state to select it'}</span></div>`;
  const main = N.view === 'table' ? `<div class="res-scroll" data-keep="table-${N.tab}${N.tab === 'house' ? N.hview : ''}">${resNightTable()}</div>` : N.view === 'ticker' ? `<div class="res-scroll" data-keep="ticker">${resTickerHTML()}</div>` : nightMap();
  $('#night').innerHTML = `<div class="nwrap">
    <div class="nhead"><div><div class="kicker">Election Night ${N.year} · ${N.t >= 1 ? 'Final results' : 'LIVE'}</div><h2>${clockText(N.t)}</h2></div>
      <div class="ntabs">${N.tabs.map(t => `<button class="btn ${N.tab === t ? 'on' : ''}" data-tab="${t}">${tabName[t]}</button>`).join('')}</div>
      <div class="res-hbtns">${N.t < 1 ? '<button class="btn" id="nskip">⏩ Skip to final results</button>' : `${typeof resExplorer === 'function' ? '<button class="btn" id="fullres">📊 Full results</button>' : ''}<button class="btn primary" id="ndone">Continue →</button>`}</div></div>
    ${N.pres ? resBannerHTML(T) : ''}
    <div class="ntally">${N.pres ? barChart(`President · ${N.pres.names.D} vs ${N.pres.names.R}${N.pres.evI ? ` vs ${N.pres.names.I}` : ''}`, T.pres, 538, 270, 'electoral votes', resPresFoot(N.pres), true) : ''}
      ${barChart('Senate', T.senate, 100, 51, `${N.races.length} seats up`, resSeatFoot(N.before, T.senate, 51, 'the Senate'))}${barChart('House', T.house, 435, 218, 'all 435 seats', resSeatFoot(N.house.before, T.house, 218, 'the House'))}${T.gov ? barChart('Governors', T.gov, 50, 26, `${N.gov.length} races`, resSeatFoot(govB, T.gov, 26, 'most governorships')) : ''}</div>
    <div class="nbody"><div class="nmapwrap">${sub}${main}${N.tab !== 'pres' ? resNightSnake(T) : ''}<div class="npop">${popularVote(T)}</div></div>
      <div class="nside"><div class="ndetail">${detailPanel()}</div>
        <div class="nlist"><div class="lh">All ${tabName[N.tab].toLowerCase()} results · ← → to browse</div>${raceList()}</div>
        ${N.tab === 'house' ? resHouseFlips() : ''}<div class="nchart"><div class="lh">Closest ${N.tab === 'house' && N.house.districts ? 'districts' : 'races'}</div>${closestChart()}</div></div></div></div>`;
  for (const el of scrollers()) { const k = keep[el.dataset.keep || el.className]; if (k != null) el.scrollTop = k; }
  // a chime as races are called
  const nowCalled = contests(N.tab).filter(isCalled).length;
  if (N.lastCalled != null && nowCalled > N.lastCalled && N.t < 1) sfx.yes();
  N.lastCalled = nowCalled;
}

// the national list of House seats changing hands, latest call first
function resHouseFlips() {
  const N = NIGHT, HD = N.house.districts; if (!HD) return '';
  const L = [].concat(...Object.values(HD)).filter(x => x.flip && N.t >= x.call).sort((a, b) => b.call - a.call), g = p => L.filter(x => x.w === p).length;
  return `<div class="nchart"><div class="lh">Seats changing hands · ${L.length}${L.length ? ` · <span style="color:${PARTY.D.color}">D +${g('D')}</span> <span style="color:${PARTY.R.color}">R +${g('R')}</span>` : ''}</div>${L.length ? `<div class="res-scroll hd-flips" data-keep="hd-flips">${L.map(x => { const w = x.w === 'D' ? x.dName : x.rName, l = x.w === 'D' ? x.rName : x.dName;
    return `<div class="lrow ${N.sel === x.id.slice(0, 2) ? 'on' : ''}" data-code="${x.id.slice(0, 2)}"><span><b>${x.id}</b> <b style="color:${PARTY[x.w].color}">${w}</b> <small style="color:var(--dim)">${x.inc ? `unseats ${l}` : 'takes the open seat'}</small></span><span>${hdTag(x.w, x.m)}</span></div>`; }).join('')}</div>` : '<div class="nsub">No House seat has changed hands yet.</div>'}</div>`;
}

/* ---------------- the Decision Desk: banner, ticker, tables, snakes ---------------- */
const resSwing = d => `<b style="color:${d >= 0 ? PARTY.D.color : PARTY.R.color}">${d >= 0 ? 'D' : 'R'}+${Math.abs(d).toFixed(1)}</b>`;
const resMarginTag = (p, m) => `<b style="color:${PARTY[p].color}">${p} +${Math.abs(m).toFixed(1)}</b>`;
// the state whose electoral votes put the winner past 270, counting the winner's states from safest to closest
function resTipping(P) {
  const L = Object.entries(P.states).filter(([, s]) => s.w === P.winner).sort((a, b) => presWM(b[1]) - presWM(a[1]));
  let ev = 0; for (const [code, s] of L) { ev += s.ev; if (ev >= 270) return { code, ev: s.ev, m: presWM(s) }; }
  return null;
}
// states that voted with the winner and mirrored the national popular vote within a point and a half
function resBellwethers(P) {
  const tot = P.popD + P.popR + (P.popI || 0) || 1, nat = (P.popD - P.popR) / tot * 100, natI = (P.popI || 0) / tot * 100, off = s => Math.abs(s.dPct - s.rPct - nat) + Math.abs((s.iPct || 0) - natI);
  return Object.entries(P.states).filter(([, s]) => s.w === P.winner && off(s) < 1.5).sort((a, b) => off(a[1]) - off(b[1])).slice(0, 3).map(x => x[0]);
}
function resClosest(P) { return Object.entries(P.states).sort((a, b) => presWM(a[1]) - presWM(b[1]))[0][0]; }
// when (and with which state) the winner's called electoral votes first reached 270
function resProjTime(P) {
  let ev = 0;
  for (const [code, s] of Object.entries(P.states).sort((a, b) => a[1].call - b[1].call)) if (s.w === P.winner) { ev += s.ev; if (ev >= 270) return { t: s.call, code }; }
  return null;
}
const resWin270 = t => t.D >= 270 ? 'D' : t.R >= 270 ? 'R' : (t.I || 0) >= 270 ? 'I' : null;
// the tickets in a tally from most to fewest electoral votes
const resOrder = (t, P) => ['D', 'R', 'I'].filter(p => p !== 'I' || (P.names.I && (t.I || P.evI))).sort((a, b) => (t[b] || 0) - (t[a] || 0));
function resDecided(T) { const t = (T || tallies()).pres; return NIGHT.t >= 1 || !!resWin270(t); }
// home states, running mates, the tipping point and the bellwethers, for one state's detail panel
function resPresNotes(P, code, called) {
  const notes = [], s = P.states[code];
  for (const p of ['D', 'R', 'I']) {
    if (!P.names[p]) continue;
    if (P.homes && P.homes[p] === code) notes.push(`🏠 ${P.names[p]}'s home state${called ? (s.w === p ? ' · carried it' : ' · <b style="color:var(--no)">lost at home</b>') : ''}`);
    if (P.vps && P.vps[p] && P.vps[p].state === code) notes.push(`🤝 Running mate ${P.vps[p].name}'s home state (${p})${called ? (s.w === p ? ' · delivered' : ' · <b style="color:var(--no)">couldn\'t deliver</b>') : ''}`);
  }
  if (called && s.w === 'I') notes.push(`<b style="color:${PARTY.I.color}">★ Carried by ${P.names.I}${P.third && P.third.label && P.third.label !== 'Independent' ? ` (${P.third.label})` : ''}</b> · ${pct(s.iPct)} beat both major parties`);
  if (called && resDecided()) {
    const tip = resTipping(P); if (tip && tip.code === code) notes.push(`⚖ <b>Tipping-point state</b> · its ${s.ev} electoral votes put ${P.names[P.winner]} past 270`);
    if (resBellwethers(P).includes(code)) notes.push('🔔 <b>Bellwether</b> · mirrored the national popular vote');
    if (resClosest(P) === code) notes.push('🔬 <b>Closest state in the nation</b>');
  }
  return notes.length ? `<div class="res-notes">${notes.map(n => `<div>${n}</div>`).join('')}</div>` : '';
}
// the White House line under the electoral-vote bar: the stakes while the count runs, the outcome once it is final
function resPresFoot(P) {
  const inc = PARTY[P.inc].short, kept = P.winner === P.inc;
  if (NIGHT.t < 1) return `${inc} hold the White House · ${P.running ? `${P.names[P.inc]} seeks a second term` : 'open race'}${P.names.I && P.third && P.third.major ? ` · a serious ${P.third.label === 'Independent' ? 'independent' : P.third.label} challenge` : ''}`;
  return `${inc} ${kept ? 'hold' : 'lose'} the White House · ${P.running ? `${P.names[P.inc]} ${kept ? 'wins' : 'is denied'} a second term` : `open race · ${P.names[P.winner]} (${P.winner}) ${kept ? 'keeps it for the ' + inc : 'takes it'}`}${P.houseVote ? ' · decided in the House' : ''}`;
}
// before → after seat counts, the net for your party and a projection once a side clinches
// (clinched = ahead by more than the seats still out, which is also how the game counts a majority when independents hold the balance)
function resSeatFoot(before, now, need, what) {
  const b = before || { D: 0, R: 0, I: 0 }, side = IND() && !('I' in now) ? frameP() : S.side, held = (b.D || 0) > (b.R || 0) ? 'D' : (b.R || 0) > (b.D || 0) ? 'R' : null;
  const cnt = o => `D ${o.D || 0} · R ${o.R || 0}${o.I ? ` · I ${o.I}` : ''}`;
  let txt = `Before: ${cnt(b)}`;
  if (!now.und) { const net = (now[side] || 0) - (b[side] || 0); txt += ` → after: ${cnt(now)} · <b style="color:${net > 0 ? 'var(--yes)' : net < 0 ? 'var(--no)' : 'var(--dim)'}">${PARTY[side].short} ${net > 0 ? '+' : net < 0 ? '−' : '±'}${Math.abs(net)}</b>`; }
  const proj = now.D >= need || now.D > now.R + now.und ? 'D' : now.R >= need || now.R > now.D + now.und ? 'R' : null;
  if (proj) txt += ` <span class="res-proj" style="color:${PARTY[proj].color}">✓ ${PARTY[proj].short} ${held === proj ? 'hold' : held ? 'take' : 'win'} ${what}</span>`;
  else if (!now.und) txt += ` <span class="res-proj" style="color:var(--dim)">deadlocked</span>`;
  return txt;
}
// the big board: PROJECTION once a ticket's called electoral votes reach 270, drama while it stays close
function resBannerHTML(T) {
  const N = NIGHT, P = N.pres, t = T.pres, w0 = resWin270(t);
  if (w0) {
    const w = w0, pj = resProjTime(P), re = w === P.inc && P.running, rest = resOrder(t, P).filter(p => p !== w);
    if (!N.fanfared) { N.fanfared = true; sfx.fanfare(); }
    return `<div class="res-banner" style="--pc:${PARTY[w].color}"><div class="res-blabel">★ Projection · ${clockText(pj ? pj.t : N.t)}${pj ? ` · ${stName(pj.code)} puts it over the top` : ''}</div>
      <div class="res-bhead">${P.names[w].toUpperCase()} ${re ? 'RE-ELECTED' : 'ELECTED'} PRESIDENT</div>
      <div class="res-bsub">${w === 'I' ? `${P.third && P.third.label && P.third.label !== 'Independent' ? `${P.third.label} candidate` : 'Independent'} · <b>${P.inc === 'I' ? 'the White House stays outside the two parties' : 'the first President from outside the two parties in living memory'}</b>` : PARTY[w].name}${P.offices && P.offices[w] ? ` · ${P.offices[w]}` : ''} · ${t[w]} electoral votes${t.und ? ` with ${t.und} still out` : ` to ${rest.map(p => t[p] || 0).join(' and ')}`}${w === 'I' ? '' : w !== P.inc ? ' · <b>the White House changes hands</b>' : re ? '' : ` · the ${PARTY[w].short} keep the White House`}</div></div>`;
  }
  const left = Object.entries(P.states).filter(([, s]) => N.t < s.call).sort((a, b) => b[1].ev - a[1].ev), ord = resOrder(t, P), lead = ord[0], trail = ord[1];
  if (N.t >= 1 || !left.length) {
    // the Elector Gambit (independent career only): the caucus's electors put a major ticket over 270
    if (P.electors) { const w = P.winner, ev = (t[w] || 0) + (t.I || 0); return `<div class="res-banner" style="--pc:${PARTY[w].color}"><div class="res-blabel">★ Kingmaker electors${N.t < 1 ? ` · ${clockText(N.t)}` : ''}</div><div class="res-bhead">${P.names[w].toUpperCase()} ELECTED PRESIDENT</div>
    <div class="res-bsub">Nobody reaches 270 alone (${ord.map(p => `${p} ${t[p] || 0}`).join(' · ')}). Then the independent electors pledged by your caucus cast their ${t.I || 0} votes for <b>${P.names[w]}</b> (${w}): <b>${ev} electoral votes</b>, and the White House.</div></div>`; }
    const hv = P.houseVote, w = P.winner, l = w === 'D' ? 'R' : 'D', tied = hv ? 50 - hv.D - hv.R : 0, tie = t.D === 269 && t.R === 269;
    const house = hv ? (hv[w] > hv[l] ? ` — <b>${hv[w]} delegations to ${hv[l]}</b>${tied ? `, ${tied} split` : ''} —` : ` — the delegations split ${hv.D} to ${hv.R}${tied ? ` with ${tied} tied` : ''}, and after weeks of balloting`) : ' —';
    return `<div class="res-banner close"><div class="res-blabel">Decision Desk${N.t < 1 ? ` · ${clockText(N.t)}` : ''}</div><div class="res-bhead">${tie ? `DEADLOCK · ${t.D}–${t.R}` : `NO MAJORITY · ${ord.map(p => `${p} ${t[p] || 0}`).join(' · ')}`}</div>
    <div class="res-bsub">Nobody reaches 270${t.I ? `: ${P.names.I}'s ${t.I} electoral votes deny both parties a majority` : ''}. Under the Twelfth Amendment the House chooses the President, one vote per state delegation${house} <b>${P.names[w]}</b> (${w}) ${w === P.inc && P.running ? 'keeps the White House' : 'prevails'}.</div></div>`;
  }
  if (N.t >= 0.5 && (left.length <= 12 || t.und <= 150)) {
    const need = 270 - t[lead], brink = left.length && need <= left[0][1].ev, third = ord[2] && t[ord[2]] ? ` ${P.names[ord[2]]} holds ${t[ord[2]]}.` : '';
    return `<div class="res-banner close"><div class="res-blabel">Decision Desk · ${clockText(N.t)}</div><div class="res-bhead">${brink ? `ON THE BRINK · ${P.names[lead].toUpperCase()} IS ONE STATE AWAY` : 'TOO CLOSE TO CALL'}</div>
    <div class="res-bsub">${P.names[lead]} leads <b>${t[lead]}–${t[trail] || 0}</b> and needs <b>${need}</b> of the ${t.und} electoral votes still out in ${left.length} state${left.length === 1 ? '' : 's'}: ${left.map(([c, s]) => `${c} (${s.ev})`).join(', ')}. ${P.names[trail]} needs ${270 - (t[trail] || 0)}${270 - (t[trail] || 0) > t.und ? ' — more than remain' : ''}.${third}</div></div>`;
  }
  return '';
}
// popular vote vs. the Electoral College, turnout and the third-party share
function resPopCallout(P, t, d, r, i) {
  const N = NIGHT, tot = d + r + i || 1, ecW = resWin270(t), V = { D: d, R: r, I: i }, pv = ['D', 'R', 'I'].sort((a, b) => V[b] - V[a]), pvW = pv[0], gap = V[pv[0]] - V[pv[1]], pts = gap / tot * 100, final = N.t >= 1;
  const turn = `${final ? 'Total turnout' : 'Votes counted so far'}: <b>${nfmt(d + r + i)}</b>${i ? ` · third party <b style="color:${PARTY.I.color}">${pct(i / tot * 100)}</b> (${P.names.I})` : ' · no third-party candidate of note'}`;
  const ecTxt = w => `<b>${t[w]}–${resOrder(t, P).filter(p => p !== w).map(p => t[p] || 0).join('–')}</b>`;
  let line;
  // a split decision is only declared once every vote is in: early returns favor whichever side's states close first
  if (final && ecW && ecW !== pvW) line = `<span class="res-split">⚠ Split decision:</span> <b>${P.names[ecW]}</b> wins the Electoral College while ${P.names[pvW]} wins the popular vote by <b>${nfmt(gap)}</b> votes (${pct(pts)}).`;
  else if (final && ecW) line = `<b>${P.names[ecW]}</b> wins the Electoral College ${ecTxt(ecW)} and the popular vote by ${nfmt(gap)} votes (+${pts.toFixed(1)}).`;
  else if (final) line = `The Electoral College ${t.D === 269 && t.R === 269 ? `deadlocks at <b>269–269</b>` : `gives no one a majority (${resOrder(t, P).map(p => `${p} ${t[p] || 0}`).join(', ')})`}; ${P.names[pvW]} wins the popular vote by ${nfmt(gap)} votes (${pct(pts)})${P.electors ? `; the independent electors hand it to <b>${P.names[P.winner]}</b>` : P.winner !== pvW ? `, but the House chooses <b>${P.names[P.winner]}</b>` : ' and the House confirms it'}.`;
  else if (ecW) line = `<b>${P.names[ecW]}</b> is projected to win the Electoral College and ${ecW === pvW ? 'leads' : '<span class="res-split">trails</span>'} the popular vote so far by ${nfmt(gap)} votes (${pct(pts)}) with ${t.und} electoral votes still out.`;
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
    else if (tab === 'pres') { party = c.s.w; who = `${N.pres.names[party]} (${party})`; mg = `${resMarginTag(party, presWM(c.s))} · ${c.s.ev} EV`; }
    else { const ch = c.s.d - c.s.prevD, fl = ((N.house.districts || {})[c.code] || []).filter(x => x.flip); party = c.s.d > c.s.r ? 'D' : c.s.r > c.s.d ? 'R' : 'I'; who = `<span style="color:${PARTY.D.color}">${c.s.d}D</span>–<span style="color:${PARTY.R.color}">${c.s.r}R</span>`; mg = (ch ? `<b style="color:${PARTY[ch > 0 ? 'D' : 'R'].color}">${ch > 0 ? 'D' : 'R'} +${Math.abs(ch)}</b>` : '<span style="color:var(--dim)">no net change</span>') + (fl.length ? ` · ${fl.map(x => `<b style="color:${PARTY[x.w].color}">${x.id}</b>`).join(', ')} flip${fl.length > 1 ? '' : 's'}` : ''); flip = !!fl.length; }
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
      return { code: c.code, cls: called ? '' : 'res-pending', c: { state: st(c), ev: num(s.ev), d: pc('D', s.dPct), r: pc('R', s.rPct), i: pc('I', s.iPct), margin: called ? num(m, resMarginTag(s.w, s.w === 'I' ? presWM(s) : m)) : null, swing: called && prev != null ? num(m - prev, resSwing(m - prev)) : null, call: when(c) } }; });
  } else if (tab === 'house' && N.hview !== 'state' && N.house.districts) {
    // all 435 districts; percentages appear as each one is called
    cols = [{ k: 'dist', l: 'District' }, { k: 'win', l: 'Winner' }, { k: 'd', l: 'D %', num: 1 }, { k: 'r', l: 'R %', num: 1 }, { k: 'margin', l: 'Margin', num: 1 }, { k: 'swing', l: 'Swing', num: 1 }, { k: 'seat', l: 'Seat', num: 1 }, { k: 'call', l: 'Called', num: 1 }];
    rows = [].concat(...Object.values(N.house.districts)).map(x => { const called = N.t >= x.call, c = { code: x.id.slice(0, 2), call: x.call, s: { dPct: x.dPct, rPct: x.rPct } }, w = x.w === 'D' ? x.dName : x.rName, sw = x.prev != null ? x.m - x.prev : null;
      return { code: c.code, cls: called ? (x.flip ? 'hd-fliprow' : '') : 'res-pending', c: { dist: { v: x.id, h: `<b>${x.id}</b>` },
        win: called ? { v: w, h: `<b style="color:${PARTY[x.w].color}">${w}</b>${x.flip && x.inc ? ` <small style="color:var(--dim)">def. ${x.w === 'D' ? x.rName : x.dName}</small>` : ''}` } : { v: 'zzz', h: `<span style="color:var(--dim)">${x.inc ? `${x.incName} (${x.inc}, inc.)` : 'open seat'}</span>` },
        d: called ? pc('D', x.dPct) : null, r: called ? pc('R', x.rPct) : null, margin: called ? num(Math.abs(x.m), hdTag(x.w, x.m)) : null, swing: called && sw != null ? num(sw, resSwing(sw)) : null,
        seat: called ? num(x.flip ? 2 : x.open ? 1 : 0, x.flip ? `<span class="call flip">${x.w} FLIP</span>` : x.open ? `<span class="hd-open" title="${hdWhy[x.why] || ''}">OPEN</span>` : '<span class="hd-inc">INC</span>') : null, call: when(c) } }; });
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
  if (tab === 'house' && N.house.districts) {
    for (const L of Object.values(N.house.districts)) for (const x of L) cells.push(N.t >= x.call ? { p: x.w, m: Math.abs(x.m), code: x.id.slice(0, 2), flip: x.flip, title: `${x.id}: ${x.w === 'D' ? x.dName : x.rName} (${x.w}) +${Math.abs(x.m).toFixed(1)}${x.flip ? ' · FLIP' : ''}` } : { p: null, m: 0, code: x.id.slice(0, 2), title: `${x.id}: not yet called` });
    const t = T.house;
    return resSnakeHTML(cells, 218, 435, `${dot('D')}D ${t.D}</span> · ${t.und ? `${t.und} seats uncalled` : 'all 435 seats called'} · ${dot('R')}R ${t.R}</span> · 218 for control · every district sorted by margin, flips outlined in gold`);
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
