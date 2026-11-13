'use strict';
/* =====================================================================
   WORLD — governors, the Vice President and cabinet, executive orders,
   war, the docket and the Pulse (national mood coverage). Loaded after
   game.js, names.js, art.js and depth.js. Presidential primaries live in
   primaries.js, conventions in convention.js, the fall campaign in
   campaign.js.
   ===================================================================== */

const GOV_PRES_YEAR = ['DE', 'IN', 'MO', 'MT', 'NC', 'ND', 'UT', 'WA', 'WV'];
const GOV_EVERY_TWO = ['NH', 'VT'];
// the off-year states (year % 4): Virginia and New Jersey the year after a presidential election, Kentucky, Louisiana and Mississippi the year before
const GOV_ODD = { VA: 1, NJ: 1, KY: 3, LA: 3, MS: 3 };
const GOV_ONE_TERM = ['VA']; // Virginia's governors cannot serve back-to-back terms
function govUp(code, year) {
  if (code in GOV_ODD) return year % 4 === GOV_ODD[code];
  if (year % 2) return false;
  return GOV_EVERY_TWO.includes(code) || (year % 4 === 0 ? GOV_PRES_YEAR.includes(code) : !GOV_PRES_YEAR.includes(code));
}
const CABINET_POSTS = [
  ['state', 'Secretary of State', '🌐'], ['treasury', 'Secretary of the Treasury', '💵'], ['defense', 'Secretary of Defense', '🛡️'],
  ['ag', 'Attorney General', '⚖️'], ['dhs', 'Secretary of Homeland Security', '🛂'], ['hhs', 'Secretary of Health and Human Services', '🏥'],
  ['energy', 'Secretary of Energy', '⚡'], ['agri', 'Secretary of Agriculture', '🌾'], ['commerce', 'Secretary of Commerce', '🏭'],
  ['labor', 'Secretary of Labor', '🔧'], ['education', 'Secretary of Education', '🎓'], ['va', 'Secretary of Veterans Affairs', '🎖️'],
];
const EO_LIST = {
  D: [['Climate Emergency Order', 'environment'], ['Student Loan Relief Order', 'welfare'], ['Gun Safety Order', 'urban'], ['Worker Protection Order', 'economy'], ['Drug Pricing Order', 'welfare'], ['Clean Power Order', 'environment'], ['Housing Access Order', 'urban'], ['AI Safeguards Order', 'tech']],
  R: [['Border Emergency Order', 'security'], ['Deregulation Order', 'economy'], ['Energy Dominance Order', 'economy'], ['Federal Hiring Freeze', 'taxes'], ['School Choice Order', 'taxes'], ['Tariff Order', 'economy'], ['Law and Order Directive', 'security'], ['Farm Freedom Order', 'rural']],
};
const CRISES = [['the Strait of Kessa', 'a naval standoff in a vital shipping lane'], ['Valoria', 'an invasion of a treaty ally'], ['Mardova', 'a terrorist safe haven plotting attacks'], ['the Karst Highlands', 'an insurgency threatening a friendly government'], ['the Ostrava Basin', 'a rogue state racing for a nuclear weapon'], ['the Tamar Isles', 'a blockade starving an island ally'], ['the Sarn Desert', 'militias seizing oil fields'], ['the Velk Peninsula', 'a coup that toppled an ally']];

/* ---------------- setup for a new career ---------------- */
function buildWorld() {
  // governors: less tied to partisanship than senators
  S.governors = {};
  for (const [code, , lean] of STATES) {
    const party = Math.random() < 1 / (1 + Math.exp(-lean / 6)) ? 'R' : 'D';
    const g = newPerson(party, code, { age: ri(44, 70) });
    g.faction = pick(FACTIONS[party])[0]; g.terms = GOV_ONE_TERM.includes(code) ? 1 : ri(1, 2);
    const last = code in GOV_ODD ? (GOV_ODD[code] === 1 ? 2025 : 2023) : 2026 - (GOV_PRES_YEAR.includes(code) ? 2 : 0), since = last - (g.terms - 1) * 4;
    governorBackstory(g, since);
    S.governors[code] = g;
  }
  // a few notable House members, for cabinet picks and presidential runs
  S.reps = [];
  for (let i = 0; i < 16; i++) {
    const party = i % 2 ? 'R' : 'D', st = pick(STATES)[0], r = newPerson(party, st, { age: ri(36, 66) });
    r.faction = pick(FACTIONS[party])[0]; r.district = districtOf(st);
    hist(r, `Worked as ${r.background}`, 2027 - ri(14, 24)); hist(r, `Elected to the U.S. House (${r.district})`, 2027 - ri(4, 14));
    S.reps.push(r);
  }
  S.formers = [];
  // the Vice President and a confirmed cabinet
  const P = S.president;
  Object.assign(P, newPerson(P.party, pick(STATES)[0], { age: ri(52, 72) }), { name: P.name, party: P.party, faction: P.faction, approval: P.approval, terms: P.terms });
  hist(P, `Elected Governor of ${ST[P.state].name}`, 2016); hist(P, `Elected President of the United States`, 2024);
  S.vp = newPerson(P.party, pick(STATES)[0], { age: ri(48, 68) }); S.vp.faction = pick(FACTIONS[P.party])[0];
  hist(S.vp, `Elected to the U.S. Senate`, 2014); hist(S.vp, 'Elected Vice President', 2024);
  S.cabinet = {};
  for (const [post, title] of CABINET_POSTS) { const c = cabinetPick(P.party, false); hist(c, `Confirmed as ${title}, ${ri(51, 68)}–${ri(30, 48)}`, 2025); S.cabinet[post] = c; }
  S.pulse = []; S.salience = { economy: 3, welfare: 2, security: 2, taxes: 1, environment: 1, urban: 1, rural: 1, tech: 1 };
  S.war = null; S.eos = []; S.docket = null; S.nominees = null;
  if (typeof localEnsure === 'function') localEnsure(); // mayors and state legislatures (local.js)
}

/* ---------------- people helpers ---------------- */
function cabinetPick(party, allowSitting = true) {
  const r = Math.random();
  if (allowSitting && r < 0.2) { const m = pick(S.members.filter(m => m.party === party && !T(m, 'leader'))); if (m) return { ...m, from: 'senator', fromId: m.id, competence: ri(2, 5), controversy: Math.random() * 0.6 }; }
  if (allowSitting && r < 0.32) { const code = pick(Object.keys(S.governors).filter(c => S.governors[c].party === party)); if (code) return { ...S.governors[code], from: 'governor', fromState: code, competence: ri(2, 5), controversy: Math.random() * 0.6 }; }
  if (r < 0.5 && S.formers && S.formers.length) { const f = pick(S.formers.filter(f => f.party === party)); if (f) return { ...f, from: 'former', competence: ri(2, 5), controversy: Math.random() * 0.7 }; }
  const p = newPerson(party, pick(STATES)[0], { age: ri(45, 72) });
  p.faction = pick(FACTIONS[party])[0];
  hist(p, `Worked as ${p.background}`, currentYear() - ri(10, 25));
  hist(p, pick(['Served as a deputy secretary in a previous administration', 'Ran a Fortune 500 company', 'Led a major think tank', `Served in the ${ST[p.state].name} cabinet`, 'Served as an ambassador']), currentYear() - ri(3, 9));
  return { ...p, from: 'outsider', competence: ri(1, 5), controversy: Math.random() };
}
function profileModal(p, title, back) {
  showModal(`<div class="kicker">${title}</div><div class="m-head">${portrait(p)}<div><h3>${p.name}</h3><div class="m-sub"><span class="m-party" style="color:${PARTY[p.party].color}">${PARTY[p.party].name}</span>${p.faction ? ' · ' + p.faction : ''}</div></div></div>${careerHTML(p)}<div class="choices"><button class="btn primary" id="pmok">Close</button></div>`);
  $('#pmok').onclick = () => { if (back) back(); else hideModal(); };
}
// a Senate seat opens: the governor appoints someone from their own party
function vacateSeat(m, reason) {
  const gov = S.governors[m.state], party = gov && gov.party !== 'I' ? gov.party : m.party;
  const nm = newSenator(party, m.state, m.cls, m.id);
  senatorBackstory(nm, currentYear());
  nm.history.pop(); hist(nm, `Appointed to the U.S. Senate by Gov. ${gov ? gov.name : 'the governor'} after Sen. ${m.name} ${reason}`);
  S.members[m.id] = nm; assignBosses(); layoutSeats();
  return `Gov. ${gov ? lastName(gov) : ''} (${party}) appoints ${nm.name} to Sen. ${lastName(m)}'s ${ST[m.state].name} seat${party !== m.party ? ' — <b>the seat flips</b>' : ''}.`;
}
function governorSucceeded(code, why) {
  const old = S.governors[code], g = newPerson(old.party, code, { age: ri(44, 66) });
  g.faction = pick(FACTIONS[old.party] || FACTIONS.D)[0]; g.terms = 1;
  hist(g, `Worked as ${g.background}`, currentYear() - ri(12, 20)); hist(g, `Elected Lieutenant Governor of ${ST[code].name}`, currentYear() - ri(1, 4));
  hist(g, `Sworn in as Governor after Gov. ${old.name} ${why}`);
  S.governors[code] = g;
}

/* ---------------- governors on the map ---------------- */
function governorsMap() {
  return usMap({
    fill: code => S.governors[code] ? { c: PARTY[S.governors[code].party].color, op: 0.85 } : null,
    sub: code => S.governors[code] ? S.governors[code].party : '',
    attr: code => S.governors[code] ? `data-gov="${code}"` : '',
    title: code => S.governors[code] ? `Gov. ${S.governors[code].name} (${S.governors[code].party}-${code})` : stName(code),
  });
}

/* ---------------- the Pulse: coverage of the national mood ---------------- */
function genericBallot() { return clamp(50 + S.mood * 0.9 + (S.president.party === S.side ? (S.president.approval - 50) * 0.15 : -(S.president.approval - 50) * 0.15), 30, 70); }
function rightTrack() { return clamp(Math.round(38 + (S.president.approval - 50) * 0.7 + (S.war && S.war.support < 45 ? -6 : 0) + (S.shutdown ? -8 : 0)), 12, 75); }
function pulseTick() {
  S.pulse = S.pulse || [];
  const tick = { lbl: `${season(S.career.bills || 1)[0]}${String(billYear(Math.max(1, S.career.bills))).slice(2)}`, ap: S.president.approval, gb: Math.round(genericBallot()), rt: rightTrack(), wh: S.president.party };
  // the horse race: your ticket's two-way margin, every tick of a presidential year once there are nominees
  if (billYear(Math.max(1, S.career.bills)) % 4 === 0 && pulseNominees()) tick.pm = +pulseMargin().toFixed(1);
  S.pulse.push(tick);
  if (S.pulse.length > 40) S.pulse.shift();
  for (const t of TAGS) S.salience[t] = Math.max(0.5, (S.salience[t] || 1) * 0.85);
  if (S.bill) for (const [t, v] of Object.entries(S.bill.fx)) S.salience[t] = (S.salience[t] || 1) + Math.abs(v) * 0.6;
  if (S.war) S.salience.security += 2;
  if (S.shutdown) S.salience.economy += 2;
}
function lineChart(series, opts = {}) {
  const W = 560, H = 170, pad = 28, n = Math.max(2, series[0].pts.length);
  const x = i => pad + i * (W - pad * 2) / (n - 1), y = v => H - 20 - (v - 20) / 60 * (H - 40);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="lchart">`;
  for (const v of [30, 40, 50, 60, 70]) svg += `<line x1="${pad}" x2="${W - pad}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 50 ? '#9aa3b2' : '#2a3242'}" stroke-dasharray="${v === 50 ? '4 3' : ''}"/><text x="4" y="${y(v) + 4}" font-size="10" fill="#6b7587">${v}%</text>`;
  for (const s of series) {
    if (!s.pts.length) continue;
    svg += `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" points="${s.pts.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>`;
    const last = s.pts.length - 1; svg += `<circle cx="${x(last)}" cy="${y(s.pts[last])}" r="4" fill="${s.color}"/><text x="${x(last) - 4}" y="${y(s.pts[last]) - 8 - 12 * series.indexOf(s)}" font-size="11" text-anchor="end" fill="${s.color}" font-weight="800">${s.label} ${Math.round(s.pts[last])}%</text>`;
  }
  return svg + '</svg>';
}

/* ---------------- the Pulse: the race for the White House ---------------- */
function pulseNominees() { const N = S.nominees; return !!(N && N.D && N.R && N.D.name && N.R.name); }
// your ticket's two-way national margin: convMargin carries the decayed convention bounce and party unity
function pulseMargin() {
  if (typeof convMargin === 'function') return convMargin();
  const s = presSetup(); return (s.inc === S.side ? 1 : -1) * s.base;
}
function pulseShares(m) { m = clamp(m, -40, 40); return { me: 47 + m / 2, them: 47 - m / 2, und: 6 }; }
// the Electoral College at that national margin (presProjection's map, moved to the bounce-adjusted environment)
function pulseProj(m) {
  const s = presSetup(), sg = S.side === 'D' ? 1 : -1, by = {};
  let evMine = 0;
  const states = Object.keys(EV).map(c => { const x = { c, m: stateMarginD(c, sg * m, s.noms) * sg, ev: EV[c] }; by[c] = x; if (x.m > 0) evMine += x.ev; return x; });
  return { states, by, evMine, noms: s.noms, battle: states.filter(x => Math.abs(x.m) < 8).sort((a, b) => b.ev - a.ev || Math.abs(a.m) - Math.abs(b.m)) };
}
function pulsePerson(n, p) { if (!n) return null; if (typeof campPersonOf === 'function') return campPersonOf(n); return n.p || (S.president.name === n.name ? S.president : null); }
function pulseVpPerson(vp) {
  if (!vp) return null;
  const hit = (typeof campVpPerson === 'function' && campVpPerson(vp)) || vp.p; if (hit) return hit;
  return [S.vp, ...S.members, ...Object.values(S.governors || {}), ...(S.reps || []), ...Object.values(S.cabinet || {}), ...(S.formers || [])].find(x => x && x.name === vp.name) || null;
}
function pulsePic(person, px = 52) { return person && person.seed != null ? portrait(person).replace('<svg', `<svg style="width:${px}px;height:${px}px;border-radius:50%;flex:none;display:inline-block;vertical-align:middle"`) : `<span style="font-size:30px;width:52px;text-align:center;flex:none">🇺🇸</span>`; }
function pulseTicketHTML(p) {
  const n = S.nominees[p], mine = p === S.side, person = pulsePerson(n, p), vp = n.vp, vpP = pulseVpPerson(vp);
  const office = typeof campOffice === 'function' ? campOffice(n, p) : n.office || `${PARTY[p].name} nominee`;
  const conv = typeof n.bounce === 'number' ? `<br><small>Convention${n.city ? ` in ${n.city}` : ''}: bounce ${n.bounce >= 0 ? '+' : '−'}${Math.abs(n.bounce).toFixed(1)}${n.unity != null ? ` · party ${Math.round(n.unity * 100)}% united` : ''}${n.theme && TAG[n.theme] ? ` · ${TAG[n.theme][0]} ${TAG[n.theme][1]}` : ''}</small>` : '';
  return `<div class="tk" style="border-color:${PARTY[p].color}">${pulsePic(person)}<div style="min-width:0"><b style="color:${PARTY[p].color}">${n.name}</b>${mine ? ' <small style="color:var(--gold2)">· your ticket</small>' : ''}${person ? ` <a href="#" data-pprof="${p}" style="color:var(--gold2);font-size:11px">profile</a>` : ''}
    <br><small style="color:var(--dim)">${office} · ${n.faction || PARTY[p].name}${n.del ? ` · ${n.del} delegates` : ''}</small>
    <br><small>${vp ? `${vpP && vpP.seed != null ? pulsePic(vpP, 26) : '🎗'} with <b>${vp.name}</b>${vp.state ? ` of ${stName(vp.state)}` : ''}` : '<i style="color:var(--dim)">Running mate: to be named at the convention</i>'}</small>${conv}</div></div>`;
}
function pulsePollBar(m) {
  const s = pulseShares(m), N = S.nominees, me = S.side, them = other(me);
  const seg = (w, c, t, al) => `<div style="width:${w}%;background:${c};padding:5px 6px;text-align:${al};white-space:nowrap;overflow:hidden">${t}</div>`;
  return `<div style="display:flex;border-radius:6px;overflow:hidden;font-size:12px;font-weight:800;color:#fff;margin:6px 0">${seg(s.me, PARTY[me].color, `${lastName(N[me])} ${s.me.toFixed(1)}`, 'left')}${seg(s.und, '#3a4250', '', 'center')}${seg(s.them, PARTY[them].color, `${s.them.toFixed(1)} ${lastName(N[them])}`, 'right')}</div>`;
}
function pulseRead(m, ev) {
  const N = S.nominees, my = lastName(N[S.side]), their = lastName(N[other(S.side)]), lead = `${Math.abs(m).toFixed(1)}-point`;
  if (m > 0 && ev < 270) return `<b>A split-decision nightmare.</b> ${my} leads the popular vote by a ${lead} margin and still comes up ${270 - ev} electoral votes short. The map, not the polls, decides this.`;
  if (m < 0 && ev >= 270) return `<b>Losing the vote, winning the map.</b> ${my} trails nationally by ${Math.abs(m).toFixed(1)} but the battlegrounds hold: ${ev} electoral votes.`;
  if (Math.abs(m) < 1.5 && ev >= 240 && ev <= 300) return `<b>A coin flip${ev >= 270 ? ', tilted your way' : ''}.</b> ${my} and ${their} are inside the margin of error, and ${my} sits at ${ev} electoral votes. ${ev >= 270 ? 'Every battleground is a must-hold.' : `${270 - ev} more and the White House is yours.`}`;
  if (ev >= 330 && m >= 4) return `<b>Yours to lose.</b> ${my} is running away with it: a ${lead} lead and ${ev} electoral votes. ${their}'s people are already leaking their memoirs.`;
  if (ev >= 290 && m >= 2) return `<b>Yours to lose.</b> A ${lead} lead and ${ev} electoral votes, with room to spare. One bad debate is all ${their} needs.`;
  if (ev >= 270) return `<b>A narrow edge.</b> ${my} sits at ${ev} electoral votes${ev < 290 ? ', just over the line' : ''}, but a ${lead} lead is nothing to bank. Every battleground is a must-hold.`;
  if (ev >= 250) return `<b>A coin flip.</b> ${my} is ${270 - ev} electoral votes from the White House. A good week in one big state flips the whole map.`;
  if (ev >= 200) return `<b>An uphill fight.</b> ${my} needs ${270 - ev} more electoral votes, and the battlegrounds lean ${their}'s way.`;
  return `<b>A long shot.</b> ${ev} electoral votes. ${my}'s campaign is quietly moving money into Senate races.`;
}
// the trend: this cycle's ticks (pm), labeled by season, plus today
function pulseRaceTrend(m) {
  const yy = String(electionYear(nextElectionK())).slice(2), seen = {};
  const ticks = (S.pulse || []).filter(p => p.pm != null && p.lbl.slice(1) === yy).map(p => {
    const sn = p.lbl[0] === 'F' ? 'Fall' : seen.S ? 'Summer' : 'Spring'; if (p.lbl[0] === 'S') seen.S = 1;
    const s = pulseShares(p.pm); return { lbl: `After the ${sn.toLowerCase()} bill`, short: sn, me: s.me, them: s.them };
  });
  const s = pulseShares(m); ticks.push({ lbl: 'Today', short: 'Today', me: s.me, them: s.them });
  if (typeof campChart === 'function') return campChart({ polls: ticks });
  return lineChart([{ pts: ticks.map(t => t.me), color: PARTY[S.side].color, label: lastName(S.nominees[S.side]) }, { pts: ticks.map(t => t.them), color: PARTY[other(S.side)].color, label: lastName(S.nominees[other(S.side)]) }]);
}
function pulseRaceHTML() {
  const year = electionYear(nextElectionK());
  if (!pulseNominees()) {
    const P = S.president;
    return `<div class="presbox"><b>🇺🇸 The race for the White House · ${year}</b><p style="margin:6px 0">Presidential primaries open in the spring. ${P.terms < 2 ? `${presTitle()} is expected to seek a second term; the ${PARTY[other(P.party)].short} are auditioning challengers in Iowa diners.` : `${presTitle()} is term-limited: both nominations are wide open, and half the Senate has been spotted in New Hampshire.`}</p></div>`;
  }
  const m = pulseMargin(), P = pulseProj(m), me = S.side, N = S.nominees, chip = x => { const col = x.m >= 0 ? PARTY[me].color : PARTY[other(me)].color; return `<span class="bchip" style="border-color:${col}">${x.c} <small style="color:var(--dim)">${x.ev}</small> <b style="color:${col}">${x.m >= 0 ? '+' : '−'}${Math.abs(x.m).toFixed(1)}</b></span>`; };
  const map = usMap({
    fill: c => { const x = P.by[c]; return x ? { c: PARTY[x.m >= 0 ? me : other(me)].color, op: 0.3 + Math.min(0.7, Math.abs(x.m) / 15) } : null; },
    sub: c => P.by[c] ? `${EV[c]}` : '',
    ring: c => P.by[c] && Math.abs(P.by[c].m) < 3 ? '#f6d27a' : null,
    title: c => P.by[c] ? `${stName(c)} (${EV[c]} EV): ${P.by[c].m >= 0 ? lastName(N[me]) : lastName(N[other(me)])} +${Math.abs(P.by[c].m).toFixed(1)}` : stName(c),
  });
  return `<div class="presbox"><b>🇺🇸 The race for the White House · ${year}</b>${N.conventionsDone ? '' : ' <small style="color:var(--dim)">· the conventions are next</small>'}
    <div class="ticket camp-tickets">${pulseTicketHTML(me)}<span class="vs">vs</span>${pulseTicketHTML(other(me))}</div>
    <small style="color:var(--dim)">National poll, two-way · 6% undecided</small>${pulsePollBar(m)}
    <p style="margin:6px 0">Electoral College: <b style="color:${P.evMine >= 270 ? 'var(--yes)' : 'var(--no)'}">${P.evMine}</b> for ${lastName(N[me])}, ${538 - P.evMine} for ${lastName(N[other(me)])} <small style="color:var(--dim)">(270 to win)</small>. ${pulseRead(m, P.evMine)}</p>
    <div class="campmap" style="max-width:440px;margin:6px auto">${map}<small>Shaded by the projected margin · gold rings: within 3 points</small></div>
    <div class="battle"><b>Battlegrounds</b> ${P.battle.map(chip).join('') || '<small style="color:var(--dim)">none within 8 points: this one isn\'t close</small>'}</div>
    <b style="font-size:13px">The horse race</b>${pulseRaceTrend(m)}</div>`;
}

/* ---------------- the Pulse: the Senate outlook ---------------- */
function pulseSenate() {
  // right after an election S.election (last cycle's wave, promises, midterm campaign) lingers until the next bill: the outlook is for the next cycle, so leave it out
  const E = S.election; S.election = null;
  try { return pulseSenateCalc(); } finally { S.election = E; }
}
function pulseSenateCalc() {
  const me = S.side, them = other(me), ups = S.members.filter(isUp);
  // neutral race records; an independent incumbent stays in the race (as electionPrep has it) and keeps the seat ~55% of the time
  const rows = ups.map(m => {
    const ind = m.party === 'I' ? { name: m.name, incumbent: true, str: 36 } : null;
    const p = raceChance({ m, retiring: false, cash: 0, noise: 0, primaried: false, bruised: false, ind, nominee: null, electability: 0 });
    return { m, p, pThem: ind ? Math.max(0, 0.45 - p) : 1 - p };
  });
  const notUp = S.members.filter(m => !isUp(m) && m.party === me).length, notUpThem = S.members.filter(m => !isUp(m) && m.party === them).length;
  const exp = notUp + rows.reduce((a, r) => a + r.p, 0), expThem = notUpThem + rows.reduce((a, r) => a + r.pThem, 0);
  // the exact distribution of (your seats − theirs), one race at a time; control is more seats than theirs (isMajority: independents don't count, a tie isn't yours)
  const n = rows.length; let dist = new Array(2 * n + 1).fill(0); dist[n] = 1;
  for (const r of rows) { const nd = new Array(2 * n + 1).fill(0); dist.forEach((q, k) => { if (!q) return; nd[k + 1] += q * r.p; nd[k - 1] += q * r.pThem; nd[k] += q * Math.max(0, 1 - r.p - r.pThem); }); dist = nd; }
  const d0 = notUp - notUpThem - n;
  let pMaj = 0, pTie = 0; dist.forEach((q, k) => { if (k + d0 > 0) pMaj += q; else if (k + d0 === 0) pTie += q; });
  return { rows, notUp, exp, expThem, pMaj, pTie, pres: isPresYear(nextElectionK()), pCtrl: pMaj, mineUp: ups.filter(m => m.party === me).length, indUp: ups.filter(m => m.party === 'I').length, close: rows.slice().sort((a, b) => Math.abs(a.p - 0.5) - Math.abs(b.p - 0.5)).slice(0, 5),
    gains: rows.filter(r => r.m.party !== me).sort((a, b) => b.p - a.p).slice(0, 3).filter(r => r.p >= 0.15), risks: rows.filter(r => r.m.party === me).sort((a, b) => a.p - b.p).slice(0, 3).filter(r => r.p <= 0.85) };
}
function pulseSenateRow(r) { return `<div class="salrow"><span><b style="color:${PARTY[r.m.party].color}">${r.m.state}</b> ${r.m.name} <small style="color:var(--dim)">(${r.m.party})</small></span><span class="mbar" style="width:30%"><i style="width:${Math.round(r.p * 100)}%;background:${chanceColor(r.p)}"></i></span><b style="min-width:34px;text-align:right">${Math.round(r.p * 100)}%</b></div>`; }
function pulseSenateHTML(O) {
  const me = S.side, them = other(me), year = electionYear(nextElectionK()), seatsNow = seats(me), e = Math.round(O.exp), et = Math.round(O.expThem), ei = 100 - e - et;
  const col = e > et ? 'var(--yes)' : e === et ? 'var(--gold2)' : 'var(--no)', theirsUp = O.rows.length - O.mineUp - O.indUp;
  const tieVP = O.pres ? 'whoever wins the White House breaks the tied votes' : `${vpYours() ? 'your' : 'their'} Vice President${S.vp ? ` (${lastName(S.vp)})` : ''} still breaks tied votes`;
  const read = O.pCtrl >= 0.85 ? `The ${PARTY[me].short} are heavy favorites to ${isMajority() ? 'keep' : 'take'} the Senate.` : O.pCtrl >= 0.6 ? `The ${PARTY[me].short} are favored, but a bad fall could cost them the gavel.` : O.pCtrl >= 0.4 ? 'The Senate is a toss-up: the majority runs through the closest five races below.' : O.pCtrl >= 0.15 ? `The ${PARTY[them].short} are favored. Your path to a majority needs an upset or two.` : `The math is brutal: the ${PARTY[me].short} would need a wave to ${isMajority() ? 'hold' : 'win'} the Senate.`;
  return `<div class="presbox"><b>🏛 The Senate outlook · ${year}</b> <small style="color:var(--dim)">· ${O.rows.length} seats up: ${O.mineUp} yours, ${theirsUp} theirs${O.indUp ? `, ${O.indUp} independent` : ''}</small>
    <div class="pulsecards">
      <div class="pc"><small>Projected ${PARTY[me].name} seats</small><b style="color:${col}">~${e}</b> <small>vs ~${et} ${PARTY[them].short}${ei > 0 ? ` and ${ei} independent${ei > 1 ? 's' : ''}` : ''} · now ${seatsNow}, ${O.notUp} not up</small></div>
      <div class="pc"><small>Chance of control</small><b style="color:${O.pCtrl >= 0.5 ? 'var(--yes)' : 'var(--no)'}">${Math.round(O.pCtrl * 100)}%</b> <small>More seats than the ${PARTY[them].short}. A tie (${Math.round(O.pTie * 100)}%) leaves you without the gavel, though ${tieVP}.</small></div>
    </div><p style="margin:4px 0 8px">${read}</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px">
      <div><b style="font-size:13px">The five closest races</b> <small style="color:var(--dim)">· your chance</small>${O.close.map(pulseSenateRow).join('')}</div>
      <div><b style="font-size:13px">Most likely to flip</b>${O.gains.length ? `<small style="display:block;color:var(--yes)">Pickups for you</small>${O.gains.map(pulseSenateRow).join('')}` : '<small style="display:block;color:var(--dim)">No real pickup chances yet.</small>'}${O.risks.length ? `<small style="display:block;color:var(--no);margin-top:4px">Your seats in danger</small>${O.risks.map(pulseSenateRow).join('')}` : '<small style="display:block;color:var(--dim);margin-top:4px">None of your seats look shaky.</small>'}</div>
    </div><small style="color:var(--dim)">Before retirements, primaries and campaign money. The closer the election, the less those move.</small></div>`;
}
function openPulse(back) {
  const P = S.president, gb = genericBallot(), rt = rightTrack(), pts = S.pulse || [];
  const sal = Object.entries(S.salience || {}).sort((a, b) => b[1] - a[1]), maxS = Math.max(...sal.map(x => x[1]), 1);
  const presYr = isPresYear(nextElectionK()), race = presYr && pulseNominees(), O = pulseSenate();
  const hm = race ? pulseMargin() : 0, hs = pulseShares(hm), N = S.nominees, me = S.side, dp = hs.me.toFixed(0) === hs.them.toFixed(0) && Math.abs(hm) >= 0.05 ? 1 : 0; // a lead never rounds into a tie
  const chyrons = [
    `SENATE OUTLOOK: ~${Math.round(O.exp)} SEATS FOR THE ${PARTY[me].short.toUpperCase()} — ${Math.round(O.pCtrl * 100)}% CHANCE OF CONTROL`,
    race ? `WHITE HOUSE: ${lastName(N[me]).toUpperCase()} ${hs.me.toFixed(dp)}, ${lastName(N[other(me)]).toUpperCase()} ${hs.them.toFixed(dp)} — ${pulseProj(hm).evMine} ELECTORAL VOTES FOR ${lastName(N[me]).toUpperCase()}` : presYr ? `THE ${electionYear(nextElectionK())} FIELD TAKES SHAPE: PRIMARIES OPEN IN THE SPRING` : '',
    P.approval >= 52 ? `${presTitle().toUpperCase()} RIDING HIGH AT ${P.approval}%` : P.approval <= 42 ? `${presTitle().toUpperCase()} SINKS TO ${P.approval}% — LOWEST YET` : `${presTitle().toUpperCase()} STUCK AT ${P.approval}%`,
    S.war ? `WAR IN ${S.war.place.toUpperCase()}: ${S.war.support}% SUPPORT, MONTH ${S.war.months}` : (gbm => gbm ? `GENERIC BALLOT: ${PARTY[S.side].short.toUpperCase()} ${gbm > 0 ? 'LEAD' : 'TRAIL'} BY ${Math.abs(gbm)} POINT${Math.abs(gbm) === 1 ? '' : 'S'}` : 'GENERIC BALLOT: DEAD EVEN')(+gb.toFixed(0) - +(100 - gb).toFixed(0)),
    `TOP ISSUE: ${TAG[sal[0][0]][1].toUpperCase()} — ${rt}% SAY COUNTRY ON RIGHT TRACK`,
    typeof localPulseChyron === 'function' ? localPulseChyron() : '',
    S.shutdown ? 'SHUTDOWN DRAGS ON — FEDERAL WORKERS MISS PAYCHECKS' : S.mood >= 3 ? `${PARTY[S.side].short.toUpperCase()} MOMENTUM BUILDS AHEAD OF ${electionYear(nextElectionK())}` : S.mood <= -3 ? `${PARTY[S.side].short.toUpperCase()} IN TROUBLE: VOTERS SOUR` : 'VOTERS SPLIT AS WASHINGTON GRIDLOCK GRINDS ON',
  ].filter(Boolean);
  const voices = shuffle(STATES.map(s => s[0])).slice(0, 3).map(code => {
    const t = pick(sal.slice(0, 3))[0];
    return `<p>“${pick(['All I care about is', 'Nobody in Washington is talking about', 'My whole town is worried about', 'I\'ll vote on one thing:', 'Fix'])} ${TAG[t][1].toLowerCase()}.” <small>— a voter in ${pick(HOMETOWNS[code])}, ${ST[code].name}</small></p>`;
  }).join('');
  showModal(`<div class="kicker">The Pulse · ${season(S.career.bills + 1)} ${billYear(S.career.bills + 1)}</div><h2>The Mood of the Country</h2>
    <div class="pulsecards">
      <div class="pc"><small>${presTitle()} approval</small><b style="color:${P.approval >= 50 ? 'var(--yes)' : 'var(--no)'}">${P.approval}%</b></div>
      <div class="pc"><small>Generic ballot</small><b><span style="color:${PARTY[S.side].color}">${PARTY[S.side].short[0]} ${gb.toFixed(0)}</span> – <span style="color:${PARTY[other(S.side)].color}">${(100 - gb).toFixed(0)} ${PARTY[other(S.side)].short[0]}</span></b></div>
      <div class="pc"><small>Right track / wrong track</small><b>${rt} / ${100 - rt}</b></div>
      <div class="pc"><small>National mood for your party</small><b style="color:${S.mood >= 0 ? 'var(--yes)' : 'var(--no)'}">${fmt(S.mood)}</b></div>
      ${S.war ? `<div class="pc war"><small>⚔ War in ${S.war.place}</small><b>${S.war.support}% support</b></div>` : ''}
    </div>
    <div class="chyron">${chyrons.map(c => `<span>${c}</span>`).join('')}</div>
    ${presYr ? pulseRaceHTML() : ''}
    ${pulseSenateHTML(O)}
    <div class="pulsegrid"><div><b>Trends</b>${pts.length > 1 ? lineChart([{ pts: pts.map(p => p.ap), color: PARTY[P.party].color, label: 'Approval' }, { pts: pts.map(p => p.gb), color: '#e3b54a', label: 'Your party' }]) : '<p style="color:var(--dim)">Trends appear after your first bill.</p>'}</div>
      <div><b>What voters care about</b>${sal.map(([t, v]) => `<div class="salrow"><span>${TAG[t][0]} ${TAG[t][1]}</span><span class="mbar"><i style="width:${v / maxS * 100}%;background:#e3b54a"></i></span></div>`).join('')}<small style="color:var(--dim)">Bills on the top issues move public opinion more.</small></div></div>
    <div class="voices"><b>Voices from the states</b>${voices}</div>
    <div class="choices"><button class="btn primary adv" id="pulseok">Back</button></div>`);
  $('#pulseok').onclick = () => { if (back) back(); else hideModal(); };
  $('#modal-card').querySelectorAll('[data-pprof]').forEach(a => a.onclick = e => { e.preventDefault(); const p = a.dataset.pprof, person = pulsePerson(S.nominees[p], p); if (person) profileModal(person, `${PARTY[p].name} nominee for President`, () => openPulse(back)); });
}

/* ---------------- between bills: the executive branch acts ---------------- */
function worldNews() {
  const out = [], P = S.president;
  // war grinds on
  if (S.war) out.push(...warTick());
  else if (Math.random() < 0.07 && !S.pendingAUMF) {
    const [place, what] = pick(CRISES);
    S.crisis = { place, what };
  }
  // executive orders
  if (Math.random() < 0.35) {
    const [name, tag] = pick(EO_LIST[P.party].filter(e => !S.eos.some(x => x.name === e[0] && x.party === P.party)) || EO_LIST[P.party]) || pick(EO_LIST[P.party]);
    S.eos.push({ name, tag, party: P.party, year: currentYear() });
    S.salience[tag] = (S.salience[tag] || 1) + 2;
    if (Math.random() < 0.5) P.approval += 1;
    if (P.party === S.side) S.mood += 0.3; else S.mood -= 0.3;
    if (Math.random() < 0.4) S.laws.push({ name: `${presTitle()}'s ${name}`, party: P.party, inBills: ri(1, 3), eo: true });
    out.push(`🖋️ ${presTitle()} signs the <b>${name}</b> (${TAG[tag][1]}).${P.party === S.side ? '' : ' Your base is furious.'}`);
  }
  // cabinet turnover
  if (Math.random() < 0.06) {
    const [post, title] = pick(CABINET_POSTS), c = S.cabinet[post];
    if (c) { hist(c, `Resigned as ${title}`); S.formers.push(c); S.cabinetVacancy = post; out.push(`📤 ${title} <b>${c.name}</b> ${pick(['resigns amid a scandal', 'steps down to spend time with family', 'resigns after a public clash with the President', 'announces a run for governor'])}. The President will name a replacement.`); P.approval -= 1; }
  }
  // a cabinet's competence shows up in the polls
  const comp = Object.values(S.cabinet).reduce((a, c) => a + (c.competence || 3), 0) / CABINET_POSTS.length;
  P.approval = clamp(Math.round(P.approval + (comp - 3) * 0.3 + (Math.random() < 0.5 ? 0 : -0.5)), 18, 82);
  // big moments: rare, sharp swings in the national mood
  if (Math.random() < 0.09) {
    const up = Math.random() < 0.5, d = ri(5, 10);
    const [h, why] = up ? pick([['a booming jobs report', 'The economy roars'], ['a hostage rescue', 'A daring rescue abroad'], ['a stirring address to the nation', 'A speech for the ages'], ['a historic peace deal', 'Peace breaks out']]) : pick([['a stock market crash', 'Markets plunge'], ['a botched disaster response', 'A hurricane response goes wrong'], ['a White House scandal', 'Scandal engulfs the West Wing'], ['soaring gas prices', 'Prices at the pump spike']]);
    P.approval = clamp(P.approval + (up ? d : -d), 18, 82);
    S.mood = clamp(S.mood + (P.party === S.side ? 1 : -1) * (up ? d : -d) * 0.35, -15, 15);
    out.push(`${up ? '📈' : '📉'} <b>${why}.</b> After ${h}, ${presTitle()}'s approval ${up ? 'jumps' : 'drops'} ${d} points.`);
  }
  // governors come and go
  if (Math.random() < 0.05) { const code = pick(Object.keys(S.governors)), g = S.governors[code]; if (g) { hist(g, 'Resigned as governor'); S.formers.push(g); governorSucceeded(code, 'resigned'); out.push(`🏛️ Gov. ${g.name} of ${ST[code].name} resigns; the lieutenant governor takes over.`); } }
  for (const f of HOOKS.worldNews) out.push(...(f() || []));
  return out;
}

/* ---------------- war: weariness, a Congress in revolt, and a hard stop ---------------- */
function warIsWPR(d) { return !!(d && d.name && d.name.startsWith('War Powers')); }
function warEnded() { const moot = warIsWPR(S.docket); if (moot) S.docket = null; S.war = null; return moot ? ' The War Powers vote on the docket is moot.' : ''; }
function warTick() {
  const W = S.war, P = S.president, out = [], weary = [], def = (S.cabinet.defense && S.cabinet.defense.competence) || 3, yours = P.party === S.side;
  W.months += 4;
  W.support = clamp(W.support - ri(2, 7) + def - 3, 5, 90);
  if (P.party === W.party) P.approval += W.support >= 50 ? 0 : -1;
  // war weariness: the President owns it, whoever started it
  if (W.support < 40) {
    const d = ri(1, 2);
    P.approval = clamp(P.approval - d, 18, 82); S.mood = clamp(S.mood + (yours ? -0.3 : 0.3), -15, 15);
    W.weary = (W.weary || 0) + 1;
    if (W.weary % 2 === 1) weary.push(`⚔ <b>Month ${W.months} in ${W.place}: ${W.support}% support.</b> ${pick([`The war is eating ${presTitle()}'s approval (−${d}).`, `Another flag-draped homecoming at Dover; ${presTitle()} slips ${d} more.`, `Town halls turn ugly over ${W.place}. ${presTitle()} −${d}.`, `"What are we still doing there?" is the most-asked question in the focus groups. ${presTitle()} −${d}.`])} ${yours ? 'Your party is paying for it too.' : `The ${PARTY[S.side].short} gain a little ground.`}`);
  }
  // the old roll: victory, or a bitter withdrawal
  if (Math.random() < 0.12 + def * 0.02) {
    const win = Math.random() < W.support / 100 + 0.1;
    if (P.party === W.party) P.approval += win ? 6 : -4;
    hist(P, win ? `Declared victory in ${W.place} after ${W.months} months` : `Withdrew U.S. forces from ${W.place} after ${W.months} months`);
    out.push((win ? `🕊️ <b>The war in ${W.place} ends in victory.</b> ${presTitle()}'s approval jumps.` : `🏳️ <b>U.S. forces withdraw from ${W.place}</b> after ${W.months} months. A bitter end.`) + warEnded());
    return out;
  }
  // a hard stop: no President survives a sixth year of this
  if (W.months >= 60) {
    const place = W.place, n = W.months;
    P.approval = clamp(P.approval - 4, 18, 82); S.mood = clamp(S.mood + (yours ? -1 : 1), -15, 15);
    hist(P, `Withdrew U.S. forces from ${place} after ${n} months`);
    out.push(`🏳️ <b>"It is time to come home."</b> In a ${pick(['somber Oval Office address', 'prime-time address from the Situation Room', 'speech at West Point'])}, ${presTitle()} announces the withdrawal of U.S. forces from ${place} after ${n} months and ${ri(900, 4800).toLocaleString()} American dead. No parade. ${presTitle()} −4; ${yours ? 'your party takes the hit' : `the ${PARTY[S.side].short} gain ground`}.${warEnded()}`);
    return out;
  }
  out.push(...weary);
  if (W.months >= 24 && W.support < 40) out.push(...warRevolt(W));
  return out;
}
// Congress revolts: a War Powers Resolution forced onto the docket
function warRevolt(W) {
  const P = S.president, yours = P.party === S.side;
  if (warIsWPR(S.docket) || S.pendingAUMF || (S.nominee && P.party === S.side && S.court.length < 9) || Math.random() >= 0.5) return [];
  const doves = p => S.members.filter(m => m.party === p && !T(m, 'leader')).sort((a, b) => ((a.w && a.w.security) || 0) - ((b.w && b.w.security) || 0));
  const inside = doves(P.party)[0], across = doves(other(P.party))[0];
  if (!inside || !across) return [];
  const n = ri(8, 15), who = `${sen(inside)} and ${sen(across)}`;
  if (S.docket) return [`🏛 <b>Congress is restless.</b> ${who} are whipping a War Powers Resolution on ${W.place}. Your pick, the ${S.docket.name}, holds the floor for now; the next opening may not be yours.`];
  const name = `War Powers Resolution on ${W.place}`;
  S.docket = { name, forced: true, tpl: [name, `Order U.S. forces out of ${W.place} within 30 days. Congress has run out of patience.`, { security: -2, welfare: 1, taxes: 1 }] }; S.docketOffer = null;
  W.revolts = (W.revolts || 0) + 1;
  const when = (S.career.bills + 1) % 3 === 0 ? 'It comes to the floor right after the budget.' : 'It comes to the floor next.';
  hist(inside, `Led a bipartisan revolt to force a War Powers vote on ${W.place}`); hist(across, `Co-sponsored the War Powers Resolution on ${W.place}`);
  return [yours
    ? `🏛 <b>Congress revolts, and it starts inside your own caucus:</b> ${sen(inside)} and ${n} other ${PARTY[P.party].name} senators join ${sen(across)} to force a War Powers vote on ${W.place} onto the docket. Month ${W.months}, ${W.support}% support. ${when} ${presTitle()} would rather sign a way out than lose a veto fight to their own party: pass it and the troops come home.`
    : `🏛 <b>Congress revolts:</b> a bipartisan bloc led by ${who}, with ${n} of ${presTitle()}'s own party behind them, forces a War Powers vote on ${W.place} onto the docket. Month ${W.months}, ${W.support}% support. ${when} Pass it, beat the veto if it comes, and the troops come home.`];
}
function warCardHTML() {
  const W = S.war; if (!W) return '';
  const P = S.president, col = W.support >= 50 ? 'var(--yes)' : W.support >= 40 ? 'var(--gold2)' : 'var(--no)';
  const status = warIsWPR(S.docket) ? `🏛 A War Powers Resolution is on the docket: ${S.docket.forced ? 'a bipartisan bloc forced it there' : 'you put it there'}. ${vpYours() ? `${presTitle()} will sign it if it passes` : 'Pass it and beat the veto'}, and the troops come home.`
    : W.months >= 24 && W.support < 40 ? '🏛 Congress is restless: a War Powers vote could be forced onto the docket at any time.'
    : W.support < 45 ? 'The public has turned against it.' : 'The country is behind it, for now.';
  return `<div class="primnews"><b>⚔ War in ${W.place}</b> <small style="color:var(--dim)">· ${W.party === P.party ? `${presTitle()}'s war` : `inherited from a ${PARTY[W.party].name} administration`}${W.revolts ? ` · ${W.revolts} revolt${W.revolts > 1 ? 's' : ''} in Congress` : ''}</small>
    <div class="salrow"><span>Month ${W.months} (year ${Math.floor(W.months / 12) + 1}) · public support <b style="color:${col}">${W.support}%</b></span><span class="mbar"><i style="width:${W.support}%;background:${col}"></i></span></div>
    <p>${status}</p>${W.months >= 44 ? `<small style="color:var(--dim)">The Pentagon's planners admit privately that no President can hold this past month 60.</small>` : ''}</div>`;
}

// confirmation votes for the cabinet: projected votes, and you can whip for or against
function cabinetConfirmations(posts, done) {
  const P = S.president;
  const noms = posts.map(post => ({ post, title: CABINET_POSTS.find(c => c[0] === post)[1], icon: CABINET_POSTS.find(c => c[0] === post)[2], p: cabinetPick(P.party), work: 0 }));
  const proj = n => {
    const mine = S.members.filter(m => m.party === P.party).length, ind = S.members.filter(m => m.party === 'I').length;
    const cross = Math.round((1 - n.p.controversy) * 14 + (n.p.from === 'senator' || n.p.from === 'former' ? 6 : 0) + (n.p.competence - 3) * 2);
    return clamp(mine - Math.round(n.p.controversy * 4) + Math.round(ind * 0.5) + cross + n.work, 30, 99);
  };
  const need = () => S.president.party === S.side ? (vpYours() ? 50 : 51) : 51;
  const draw = () => {
    const yours = P.party === S.side;
    showModal(`<div class="kicker">Advice and consent</div><h2>Cabinet Confirmations</h2>
      <p>${presTitle()} (${PARTY[P.party].name}) has sent ${noms.length} nominee${noms.length > 1 ? 's' : ''} to the Senate. ${yours ? 'Whip your caucus and the persuadable to confirm them.' : 'You can lead the opposition against the weakest picks.'} You have <b style="color:var(--gold2)">${S.career.capital}</b> capital.</p>
      <div class="races" style="max-height:none">${noms.map((n, i) => `<div class="race nom"><span class="nomp">${portrait(n.p)}</span><span style="flex:1"><b>${n.icon} ${n.title}</b><br><a href="#" data-prof="${i}">${n.p.name}</a> <small style="color:var(--dim)">(${n.p.faction || PARTY[n.p.party].name}) · ${{ senator: 'sitting senator', governor: 'sitting governor', former: 'former official', outsider: 'outsider' }[n.p.from]} · competence ${'★'.repeat(n.p.competence)}${'☆'.repeat(5 - n.p.competence)}${n.p.controversy > 0.65 ? ' · <span style="color:var(--no)">controversial</span>' : ''}</small><br><small>Projected: <b style="color:${proj(n) >= need() ? 'var(--yes)' : 'var(--no)'}">~${proj(n)} yeas</b> (needs ${need()})</small></span>
        <span class="cashctl">${yours ? `<button class="btn" data-cw="${i}" ${S.career.capital < 1 ? 'disabled' : ''}>Whip for<small>1 cap</small></button>` : `<button class="btn" data-co="${i}" ${S.career.capital < 1 ? 'disabled' : ''}>Oppose<small>1 cap</small></button>`}</span></div>`).join('')}</div>
      <div class="choices"><button class="btn primary big" id="cvote">Hold the votes</button></div>`);
    const card = $('#modal-card');
    card.querySelectorAll('[data-cw]').forEach(b => b.onclick = () => { if (S.career.capital < 1) return; S.career.capital--; noms[+b.dataset.cw].work += 4; sfx.click(); draw(); });
    card.querySelectorAll('[data-co]').forEach(b => b.onclick = () => { if (S.career.capital < 1) return; S.career.capital--; noms[+b.dataset.co].work -= 4; sfx.click(); draw(); });
    card.querySelectorAll('[data-prof]').forEach(a => a.onclick = e => { e.preventDefault(); profileModal(noms[+a.dataset.prof].p, noms[+a.dataset.prof].title, draw); });
    $('#cvote').onclick = () => {
      const lines = [];
      for (const n of noms) {
        const y = clamp(proj(n) + ri(-3, 3), 20, 99), ok = y >= need() || (y === 50 && vpYours());
        if (ok) {
          hist(n.p, `Confirmed as ${n.title}, ${y}–${100 - y}`);
          if (n.p.from === 'senator') { const m = S.members[n.p.fromId]; const nm = { ...m }; delete nm.b; S.cabinet[n.post] = { ...n.p, ...nm, history: n.p.history, competence: n.p.competence, controversy: n.p.controversy }; lines.push(`✅ ${n.title}: <b>${n.p.name}</b> confirmed ${y}–${100 - y}. ${vacateSeat(m, `joined the cabinet as ${n.title}`)}`); continue; }
          if (n.p.from === 'governor') { governorSucceeded(n.p.fromState, `joined the cabinet as ${n.title}`); }
          S.cabinet[n.post] = n.p; lines.push(`✅ ${n.title}: <b>${n.p.name}</b> confirmed ${y}–${100 - y}.`);
          if (P.party === S.side) addLegacy(3);
        } else {
          hist(n.p, `Nomination as ${n.title} rejected by the Senate, ${y}–${100 - y}`);
          P.approval -= 2;
          const alt = cabinetPick(P.party, false); alt.controversy = 0.1; hist(alt, `Confirmed as ${n.title} after the first nominee was rejected`); S.cabinet[n.post] = alt;
          lines.push(`❌ ${n.title}: <b>${n.p.name}</b> rejected ${y}–${100 - y}. The President sends a safer pick, ${alt.name}, who is confirmed.`);
          if (P.party !== S.side) { S.mood += 0.5; addLegacy(3); }
        }
      }
      sfx.gavel();
      showModal(`<div class="kicker">Advice and consent</div><h2>The Votes</h2>${lines.map(l => `<p>${l}</p>`).join('')}<div class="choices"><button class="btn primary big" id="cdone">Continue</button></div>`);
      $('#cdone').onclick = done;
    };
  };
  draw();
}

// a foreign crisis: how the President responds, and what Congress gets asked
function crisisModal(done) {
  const C = S.crisis, P = S.president, yours = P.party === S.side; S.crisis = null;
  const body = `<p>${C.what.charAt(0).toUpperCase() + C.what.slice(1)} in <b>${C.place}</b>. The Situation Room is lit up all night. ${S.cabinet.defense ? `Defense Secretary ${S.cabinet.defense.name} (competence ${'★'.repeat(S.cabinet.defense.competence)}) briefs the President.` : ''}</p>`;
  const finish = text => { showModal(`${frontPage({ headline: text.h, sub: text.d, body: [text.b], mood: 'storm' })}<div class="choices"><button class="btn primary big" id="crok">Continue</button></div>`); $('#crok').onclick = done; };
  if (yours) {
    showModal(`<div class="kicker">Crisis · The White House calls</div><h2>Crisis in ${C.place}</h2>${body}<p>${presTitle()} wants your advice as whip.</p>
      <div class="choices"><button class="btn" id="cr1">Seek a vote: an Authorization for Use of Military Force<small>It goes on the docket next. Pass it and the country goes in united.</small></button>
      <button class="btn" id="cr2">Strike now, without Congress<small>A quick rally for the President, but a war Congress never voted for.</small></button>
      <button class="btn" id="cr3">Pursue diplomacy<small>Safe for now, but the President looks weak (−2 approval).</small></button></div>`);
    $('#cr1').onclick = () => { S.pendingAUMF = C.place; finish({ h: `PRESIDENT ASKS CONGRESS FOR WAR VOTE ON ${C.place.toUpperCase()}`, d: 'Senate to take up a use-of-force resolution.', b: `${presTitle()} will not act without the Senate's blessing. The whip's count begins tonight.` }); };
    $('#cr2').onclick = () => { startWar(C.place, 55); P.approval += 3; finish({ h: `U.S. STRIKES ${C.place.toUpperCase()}`, d: 'Congress was not consulted.', b: 'Missiles flew before dawn. Critics in both parties question the President\'s authority.' }); };
    $('#cr3').onclick = () => { P.approval -= 2; finish({ h: `DIPLOMATS RUSH TO ${C.place.toUpperCase()}`, d: 'The President holds fire, for now.', b: 'Allies welcome the restraint; hawks call it weakness.' }); };
  } else {
    if (Math.random() < 0.55) { startWar(C.place, 55); P.approval += 3; finish({ h: `${presTitle().toUpperCase()} ORDERS STRIKES ON ${C.place.toUpperCase()}`, d: 'No vote in Congress.', b: `The White House calls it self-defense. You can bring a War Powers Resolution to the floor from the docket to force the troops home.` }); }
    else finish({ h: `STANDOFF IN ${C.place.toUpperCase()}`, d: 'The President weighs options.', b: 'For now, no shots fired.' });
  }
}
function startWar(place, support) { S.war = { place, months: 0, support, party: S.president.party }; S.salience.security = (S.salience.security || 1) + 4; }

/* ---------------- governor elections ---------------- */
function govOpen(code, g) { return GOV_ONE_TERM.includes(code) || ((g.terms || 1) >= 2 && !GOV_EVERY_TWO.includes(code)); }
// the field: the incumbent (unless the seat is open) against a challenger; now and then a mayor or a statehouse leader runs (local.js)
function govField(code, year) {
  const g = S.governors[code], A = g.party, open = govOpen(code, g), loc = p => typeof localGovCandidate === 'function' ? localGovCandidate(p, code, year) : null;
  const la = open ? loc(A) : null, lb = loc(other(A)), a = open ? la || govNewCand(A, code, year) : null, b = lb || govNewCand(other(A), code, year);
  return { code, A, open, cA: open ? a.p : g, offA: open ? a.office : 'Governor', cB: b.p, offB: b.office, starA: !!la, starB: !!lb };
}
// a fresh nominee with a statewide-sized résumé
function govNewCand(party, code, year) {
  const p = newPerson(party, code, { age: ri(42, 66) }), st = ST[code].name;
  p.faction = pick(FACTIONS[party] || FACTIONS.D)[0];
  const [office, line] = pick([[`Lieutenant Governor`, `Elected ${st} Lieutenant Governor`], [`${st} Attorney General`, `Elected ${st} Attorney General`], [`Secretary of State`, `Elected ${st} Secretary of State`], [`state treasurer`, `Elected ${st} State Treasurer`], [`state senator`, `Elected to the ${st} State Senate`], [p.gender === 'f' ? 'Congresswoman' : 'Congressman', `Elected to the U.S. House (${districtOf(code)})`], ['businessman', `Built a regional business empire`], [`former mayor of ${p.hometown}`, `Elected mayor of ${p.hometown}`]]);
  hist(p, `Worked as ${p.background}`, year - ri(14, 26)); hist(p, line, year - ri(3, 10));
  return { p, office: office === 'businessman' && p.gender === 'f' ? 'businesswoman' : office };
}
// the holder party's margin before the night's noise: lean, the national mood, the wave, the President's drag off-cycle, incumbency, money
function govMargin(f, year) {
  const A = f.A, code = f.code, sg = A === S.side ? 1 : -1, P = S.president, inPres = P.party === A ? 1 : P.party === other(A) ? -1 : 0;
  const adv = (A === 'R' ? ST[code].lean : -ST[code].lean) * 0.35;
  let pm = sg * (S.mood * 0.5 + ((S.election && S.election.wave) || 0) * 0.8) - (inPres > 0 && year % 4 ? 2 : 0);
  if (year % 2) pm += inPres * ((P.approval - 50) * 0.12 - 1.5); // the off-year: a referendum on the President
  const star = (f.starA ? 1.5 : 0) - (f.starB ? 1.5 : 0); // a big-city mayor or a Speaker brings a following
  return adv + pm + (f.open ? 0 : 5) + star + sg * cashEff((S.election && S.election.govCash) || 0, 1.2);
}
let govLastRun = null; // the latest even-year governors' races, for local.js's results log (not saved)
function runGovernors(year) { const races = runGovernorsIn(Object.keys(S.governors).filter(c => govUp(c, year)), year); govLastRun = { year, races }; return races; }
// opts.fields: pre-drawn fields by state; opts.help: your-side points by state
function runGovernorsIn(codes, year, opts = {}) {
  const races = [];
  for (const code of codes) {
    const g = S.governors[code]; if (!g) continue;
    const f = (opts.fields && opts.fields[code]) || govField(code, year), A = f.A, open = f.open;
    const mg = govMargin(f, year) + (A === S.side ? 1 : -1) * ((opts.help && opts.help[code]) || 0) + gauss() * 8;
    const np = mg >= 0 ? A : other(A), wc = np === A ? f.cA : f.cB, lc = np === A ? f.cB : f.cA;
    const wPct = clamp(49.25 + Math.abs(mg) / 2, 49.5, 75), lPct = 98.5 - wPct, tv = turnout(code), sc = `${wPct.toFixed(0)}–${lPct.toFixed(0)}`;
    let winner;
    if (np === A && !open) { winner = g; g.terms = (g.terms || 1) + 1; hist(g, `Re-elected Governor, ${sc}`, year); }
    else {
      if (!open) { hist(g, `Lost re-election as Governor`, year); } else hist(g, GOV_ONE_TERM.includes(code) ? 'Left office (Virginia allows one term at a time)' : 'Left office (term-limited)', year);
      S.formers.push(g);
      winner = wc || govNewCand(np, code, year).p; winner.terms = 1; hist(winner, `Elected Governor of ${ST[code].name}, ${sc}`, year);
      if (typeof localLeave === 'function') localLeave(winner, `was elected Governor of ${ST[code].name}`);
      S.governors[code] = winner;
    }
    if (lc && lc !== g) hist(lc, `Lost the race for Governor of ${ST[code].name}, ${lPct.toFixed(0)}–${wPct.toFixed(0)}`, year);
    const loser = lc ? lc.name : fullName(), wOff = np === A ? f.offA : f.offB, lOff = np === A ? f.offB : f.offA;
    races.push({ code, wName: winner.name, wParty: np, lName: loser, lParty: other(np), wOff: wOff || null, lOff: lOff || null, wPct, lPct, wVotes: tv * wPct / 100, lVotes: tv * lPct / 100, margin: wPct - lPct, flip: np !== A, open, incumbent: open ? null : g.name, call: callTime(code, wPct - lPct),
      cands: [{ name: winner.name, party: np, pct: wPct, votes: tv * wPct / 100, inc: winner === g, office: wOff || null }, { name: loser, party: other(np), pct: lPct, votes: tv * lPct / 100, inc: np !== A && !open, office: lOff || null }] });
  }
  return races;
}

/* ---------------- the White House, as seen from the whip's office ---------------- */
function execHTML() {
  const P = S.president, yours = P.party === S.side, used = S.execUsed === S.career.bills;
  const lastTheirs = (S.eos || []).slice().reverse().find(e => e.party !== S.side && !e.sued);
  const nextPrimaryIn = (() => { for (let k = 1; k <= 8; k++) { const n = S.career.bills + k; if (n % 6 === 4 && billYear(n) % 4 === 0) return k; } return 99; })();
  const underUsed = S.underUsed === S.career.bills;
  const undermine = yours ? `<details class="cdet under"><summary>🗡️ Undermine the President${S.undermine ? ` · undermined ${S.undermine}×` : ''}${S.challenger ? ' · challenger recruited' : ''}</summary>
      <p style="font-size:12px;color:var(--dim)">${presTitle()} leads your party, but you don't have to follow. Undermining drags down their approval (and your party's mood with it) and weakens them in a primary. It also starts a feud: the President stops making calls for you, backs challengers against your wing, can veto your bills and will hit back between bills (see <b>You and the President</b> below). One move between bills.</p>
      <div class="shop">
        <button class="btn" data-und="leak" ${underUsed || S.career.capital < 1 ? 'disabled' : ''}><span>Leak damaging stories<small>Approval −3 to −6, your party's mood −0.4.</small></span><span class="cost">1 cap</span></button>
        <button class="btn" data-und="slow" ${underUsed || S.career.capital < 2 ? 'disabled' : ''}><span>Slow-walk the President's agenda<small>Approval −4. The President's own faction resents you (relationship −1).</small></span><span class="cost">2 cap</span></button>
        ${P.terms < 2 ? `<button class="btn" data-und="recruit" ${underUsed || S.challenger || S.career.capital < 3 || nextPrimaryIn > 6 ? 'disabled' : ''}><span>Recruit a primary challenger<small>${S.challenger ? 'Done: the President will face a primary.' : nextPrimaryIn > 6 ? 'Only in the run-up to primary season (within six bills).' : `The President will face a real primary in ${nextPrimaryIn} bill${nextPrimaryIn > 1 ? 's' : ''}. If they lose, the White House changes hands within your party.`}</small></span><span class="cost">3 cap</span></button>` : ''}
      </div></details>` : '';
  return `<hr><b>🏛️ The White House</b> <small style="color:var(--dim)">· ${presTitle()} (${P.party}, ${P.faction}) at ${P.approval}%${S.war ? ` · ⚔ at war in ${S.war.place} (${S.war.support}% support)` : ''}</small>
    ${yours ? `<p style="margin:6px 0 4px;color:var(--dim);font-size:12px">Ask the President for an executive order (2 capital, once between bills). It moves the mood on its issue, but the courts may challenge it, and it doesn't keep a campaign promise: only laws do.</p>
      ${undermine}
      <div class="shop sinks">${EO_LIST[P.party].map((e, i) => `<button class="btn" data-eo="${i}" ${used || S.career.capital < 2 ? 'disabled' : ''}><span>${TAG[e[1]][0]} ${e[0]}<small>${TAG[e[1]][1]}</small></span><span class="cost">2 cap</span></button>`).join('')}</div>`
    : lastTheirs ? `<div class="shop"><button class="btn" data-sue="1" ${S.career.capital < 2 ? 'disabled' : ''}><span>⚖️ Sue to block the ${lastTheirs.name}<small>Your party's attorneys general take it to court. The Supreme Court (${courtLabel()}) decides.</small></span><span class="cost">2 cap</span></button></div>` : ''}`;
}
function bindExec(draw) {
  const card = $('#modal-card'), P = S.president;
  card.querySelectorAll('[data-eo]').forEach(b => b.onclick = () => {
    if (S.career.capital < 2 || S.execUsed === S.career.bills) return;
    const [name, tag] = EO_LIST[P.party][+b.dataset.eo];
    S.career.capital -= 2; S.execUsed = S.career.bills;
    S.eos.push({ name, tag, party: P.party, year: currentYear() }); S.salience[tag] = (S.salience[tag] || 1) + 2;
    P.approval = clamp(P.approval + 1, 22, 75); S.mood += 0.6; hist(P, `Signed the ${name}`);
    if (Math.random() < 0.45) S.laws.push({ name: `${presTitle()}'s ${name}`, party: P.party, inBills: ri(1, 3), eo: true });
    sfx.up(); toast(`${presTitle()} signs the ${name}.`); draw();
  });
  card.querySelectorAll('[data-und]').forEach(b => b.onclick = () => {
    const k = b.dataset.und, cost = { leak: 1, slow: 2, recruit: 3 }[k];
    if (S.career.capital < cost || S.underUsed === S.career.bills) return;
    S.career.capital -= cost; S.underUsed = S.career.bills; S.undermine = (S.undermine || 0) + 1;
    if (typeof wingHit === 'function') wingHit(k === 'recruit' ? -3 : -2);
    if (k === 'leak') { const d = ri(3, 6); P.approval = clamp(P.approval - d, 18, 82); S.mood -= 0.4; hist(P, 'Battered by leaks from inside their own party'); toast(`The leaks land: ${presTitle()} −${d}.`); }
    if (k === 'slow') { P.approval = clamp(P.approval - 4, 18, 82); for (const m of S.members) if (m.party === P.party && m.faction === P.faction) m.rel -= 1; hist(P, 'Agenda stalled by their own party in the Senate'); toast('The President\'s agenda grinds to a halt.'); }
    if (k === 'recruit') { S.challenger = true; hist(P, 'Drew a primary challenger recruited by Senate leadership'); toast('A challenger is ready to take on the President.'); }
    sfx.gavel(); draw();
  });
  card.querySelectorAll('[data-sue]').forEach(b => b.onclick = () => {
    const e = (S.eos || []).slice().reverse().find(x => x.party !== S.side && !x.sued); if (!e || S.career.capital < 2) return;
    S.career.capital -= 2; e.sued = true; S.laws.push({ name: `${e.name}`, party: e.party, inBills: 1, eo: true });
    sfx.click(); toast(`Lawsuit filed against the ${e.name}.`); draw();
  });
}
function openAdmin(back) {
  const P = S.president, rows = CABINET_POSTS.map(([post, title, icon]) => { const c = S.cabinet[post]; return c ? `<div class="race"><span class="nomp">${portrait(c)}</span><span style="flex:1"><b>${icon} ${title}</b><br><a href="#" data-cab="${post}">${c.name}</a> <small style="color:var(--dim)">· competence ${'★'.repeat(c.competence || 3)}${'☆'.repeat(5 - (c.competence || 3))}</small></span></div>` : `<div class="race"><span>${icon} ${title}: <i>vacant</i></span></div>`; }).join('');
  const eos = (S.eos || []).slice(-6).reverse();
  showModal(`<div class="kicker">The Administration</div><h2>${presTitle()}</h2>
    <div class="race"><span class="nomp">${portrait(P)}</span><span style="flex:1"><b style="color:${PARTY[P.party].color}">President ${P.name}</b> <small>(${P.party} · ${P.faction})</small><br><small>Approval ${P.approval}% · term ${P.terms}</small> · <a href="#" id="profP">profile</a></span></div>
    ${S.vp ? `<div class="race"><span class="nomp">${portrait(S.vp)}</span><span style="flex:1"><b>Vice President ${S.vp.name}</b><br><small>Breaks ties in the Senate${vpYours() ? ' for you' : ' against you'}</small> · <a href="#" id="profV">profile</a></span></div>` : ''}
    ${warCardHTML()}
    <hr><b>The Cabinet</b><div class="races" style="max-height:none">${rows}</div>
    ${eos.length ? `<hr><b>Recent executive orders</b>${eos.map(e => `<p style="margin:4px 0">🖋️ ${e.name} <small style="color:var(--dim)">(${e.party}, ${e.year}${e.sued ? ', challenged in court' : ''})</small></p>`).join('')}` : ''}
    <div class="choices"><button class="btn primary" id="adback">Back</button></div>`);
  const me = () => openAdmin(back);
  $('#modal-card').querySelectorAll('[data-cab]').forEach(a => a.onclick = e => { e.preventDefault(); profileModal(S.cabinet[a.dataset.cab], CABINET_POSTS.find(c => c[0] === a.dataset.cab)[1], me); });
  $('#profP').onclick = e => { e.preventDefault(); profileModal(P, 'President of the United States', me); };
  if ($('#profV')) $('#profV').onclick = e => { e.preventDefault(); profileModal(S.vp, 'Vice President', me); };
  $('#adback').onclick = back;
}

