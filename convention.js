'use strict';
/* =====================================================================
   CONVENTION — the two parties' national conventions in the summer of a
   presidential year: the running mate, the platform, the speeches, the
   bounce. Loaded after primaries.js. Defines conventionsDue() and
   conventionsModal(done), which game.js calls from interlude().

   Your party's convention is interactive (the roll call if nobody
   clinched, the running mate, the platform, the keynote, the acceptance
   speech, one or two convention-floor events, the bounce); the other
   party's is a watch-only report. Everything lands on S.nominees[p]
   (vp, bounce, unity, planks, theme, city, keynote) and S.conventions.
   EV, presSetup and the night.js helpers load later, so they are only
   touched inside functions.
   ===================================================================== */

/* ---------------- setup ---------------- */
// convention-sized host cities: [city, state, the hall]
const CONV_CITIES = [
  ['Milwaukee', 'WI', 'the arena on the lakefront'], ['Chicago', 'IL', 'the big arena on the West Side'], ['Houston', 'TX', 'the downtown arena'],
  ['Philadelphia', 'PA', 'the arena in South Philly'], ['Charlotte', 'NC', 'the uptown arena'], ['Cleveland', 'OH', 'the arena on the lake'],
  ['Denver', 'CO', 'the arena by the river'], ['Atlanta', 'GA', 'the arena downtown'], ['Las Vegas', 'NV', 'the arena off the Strip'],
  ['Phoenix', 'AZ', 'the arena downtown'], ['Detroit', 'MI', 'the arena in Midtown'], ['Nashville', 'TN', 'the arena on Broadway'],
  ['Salt Lake City', 'UT', 'the arena downtown'], ['Tampa', 'FL', 'the arena on the bay'],
];
const CONV_CELEBS = ['a country music legend', 'an Oscar-winning actor', 'a retired quarterback with two rings', 'a late-night host', 'a pop star with 90 million followers', 'a celebrity chef', 'an astronaut turned TV personality', 'a Nobel-winning economist who writes bestsellers'];
const CONV_RISKS = ['an old DUI the local paper never ran', 'three years of unpaid taxes on a lake house', 'a law-review article lifted from a classmate', 'a consulting contract with a foreign airline', 'a brother-in-law under federal indictment', `a 2019 op-ed calling the nominee "a lightweight"`, 'a nanny paid off the books', 'a shouting match with a flight attendant, on video', 'a stock trade two days before a committee vote', 'a résumé that says "Harvard" where it should say "Harvard Extension School"'];
// the planks each wing of each party wants, by issue: [flank version, center version]
const CONV_PLANK_TEXT = {
  D: {
    economy: ['A federal jobs guarantee and a 32-hour week.', 'Growth first: trade, training and a tax code that rewards building things.'],
    environment: ['A climate emergency: no new drilling leases, net zero by 2040.', 'All of the above: gas, nuclear and renewables, no mandates.'],
    security: ['Cut the Pentagon budget and end the forever wars.', 'Fund the troops, secure the border, stand by our allies.'],
    welfare: ['Medicare for All, no exceptions.', 'Protect what works, means-test the rest, balance the books.'],
    rural: ['End farm subsidies for agribusiness; break up the meatpackers.', 'A rural renaissance: broadband, hospitals and a farm bill that pays.'],
    urban: ['A federal housing guarantee and fare-free transit.', 'Back to basics: public safety first, then everything else.'],
    taxes: ['A wealth tax on fortunes over $50 million; no tax cuts.', 'A middle-class tax cut, paid for by closing loopholes.'],
    tech: ['Break up Big Tech and make broadband a public utility.', 'Let innovation breathe: light-touch rules, more skilled visas.'],
  },
  R: {
    economy: ['Tariffs and energy dominance: make it here again.', 'Free trade, free markets, and a bonfire of regulations.'],
    environment: ['Drill, baby, drill: end the EPA\'s war on American energy.', 'Conservation is conservative: clean air, clean water, nuclear power.'],
    security: ['Finish the wall, deport the criminals, no amnesty ever.', 'Secure the border and fix legal immigration, with a deal both parties can sign.'],
    welfare: ['Repeal the health law, block-grant Medicaid, shrink the safety net.', 'Protect Social Security and Medicare. No cuts, period.'],
    rural: ['Farm country first: subsidies, ethanol and water rights.', 'End the handouts to agribusiness and let the market plant the fields.'],
    urban: ['Cut off every sanctuary city.', 'An opportunity agenda for the cities: enterprise zones and school choice.'],
    taxes: ['A flat tax and the end of the IRS as we know it.', 'Hold the line on rates; pay down the debt before cutting more.'],
    tech: ['Break up Big Tech\'s censorship cartel.', 'Keep government out of the internet.'],
  },
};
ACH.push(['broker', '🤝', 'Kingmaker', 'Broker a contested convention.'], ['bounce', '🎈', 'Balloon Drop', 'Leave your convention with a bounce of 5 or more.']);
// depth.js drew the menu's Hall of Legacy before these two existed: repaint it so they show from the first visit
if (typeof legacyHTML === 'function' && $('#legacy')) $('#legacy').innerHTML = legacyHTML();
let CONV_TAKEN = [];

/* ---------------- small helpers ---------------- */
function convTotalDel() { return Object.values(EV).reduce((a, b) => a + b, 0) * 10; }
function convNeed() { return Math.floor(convTotalDel() / 2) + 1; }
function convYear() { return billYear(S.career.bills + 1); }
const convNum = n => Math.round(n).toLocaleString('en-US');
const convNth = n => ['first', 'second', 'third', 'fourth', 'fifth'][Math.max(1, n) - 1] || `${n}th`;
const convFlank = p => p === 'D' ? 'Progressives' : 'Freedom Caucus';
function convMoodOf(p) { return IND() ? 0 : (p === S.side ? S.mood : -S.mood); }   // an independent career's S.mood is the independents' mood
function convMoodWord(m) { return m >= 6 ? 'euphoric' : m >= 3 ? 'upbeat' : m >= 1 ? 'hopeful' : m > -1 ? 'wary' : m > -3 ? 'anxious' : m > -6 ? 'sour' : 'despairing'; }
function convUnityWord(u) { return u >= 0.9 ? 'united' : u >= 0.8 ? 'mostly united' : u >= 0.7 ? 'restless' : u >= 0.6 ? 'fractured' : 'at war with itself'; }
function convRiskWord(r) { return r >= 0.8 ? 'radioactive' : r >= 0.55 ? 'red flags' : r >= 0.25 ? 'some baggage' : 'clean'; }
// the live record of a politician, by name, so history lands on the real person even when a save holds a copy
function convLive(name) {
  if (!name) return null;
  if (S.president && S.president.name === name) return S.president;
  if (S.vp && S.vp.name === name) return S.vp;
  return S.members.find(m => m && m.name === name) || Object.values(S.governors || {}).find(g => g && g.name === name) || Object.values(S.cabinet || {}).find(c => c && c.name === name) || (S.reps || []).find(r => r.name === name) || (S.formers || []).find(f => f.name === name) || null;
}
function convHist(p, text) { if (!p) return; const live = convLive(p.name); if (live && live !== p) hist(live, text); hist(p, text); }
function convOfficeOf(p) {
  if (!p) return 'Nominee';
  if (S.president && p.name === S.president.name) return 'President of the United States';
  if (S.vp && p.name === S.vp.name) return 'Vice President';
  const m = S.members.find(x => x.name === p.name); if (m) return `Senator from ${ST[m.state].name}`;
  const g = Object.keys(S.governors || {}).find(c => S.governors[c].name === p.name); if (g) return `Governor of ${ST[g].name}`;
  const post = Object.keys(S.cabinet || {}).find(k => S.cabinet[k] && S.cabinet[k].name === p.name); if (post) return (CABINET_POSTS.find(c => c[0] === post) || [0, 'Cabinet secretary'])[1];
  const r = (S.reps || []).find(x => x.name === p.name); if (r) return `Representative (${r.district})`;
  return p.office || 'Former official';
}
// an office with its state, without saying the state twice ("Senator from Texas", but "Representative (SC-04), SC")
function convOfficeAt(office, st) { const o = office || 'Nominee'; return st && ST[st] && o.includes(ST[st].name) ? o : `${o}, ${st}`; }
// a fully fleshed-out person for a name the save only knows as a string
function convMakePerson(party, name, state, faction, age) {
  const x = newPerson(party, state && ST[state] ? state : pick(STATES)[0], { age: age || ri(45, 68) });
  if (name) x.name = name; x.faction = faction || pick(FACTIONS[party])[0];
  hist(x, `Worked as ${x.background}`, convYear() - ri(12, 25));
  const [won, office] = pick([[`Elected Governor of ${ST[x.state].name}`, `Former Governor of ${ST[x.state].name}`], [`Elected to the U.S. House (${districtOf(x.state)})`, 'Former House member'], [`Elected mayor of ${x.hometown}`, `Former mayor of ${x.hometown}`], [`Elected ${ST[x.state].name} Attorney General`, `Former ${ST[x.state].name} Attorney General`]]);
  hist(x, won, convYear() - ri(4, 10)); x.office = office;
  return x;
}
// make sure both parties have a nominee record the convention can work with (old saves, direct calls)
function convEnsureNominees() {
  if (!S.nominees) S.nominees = { conventionsDone: false };
  const need = convNeed();
  for (const p of ['D', 'R']) {
    let N = S.nominees[p];
    if (!N || !N.name) {
      const f = presSetup().noms[p];
      const person = f.p || convLive(f.name) || convMakePerson(p, f.name, f.state, f.faction);
      N = S.nominees[p] = { p: person, name: person.name, state: person.state, faction: person.faction || f.faction || pick(FACTIONS[p])[0], office: convOfficeOf(person), charisma: f.charisma || 1, del: need + ri(200, 900), runnerUp: null, contested: false, vp: null };
    }
    if (!N.p) N.p = convLive(N.name) || convMakePerson(p, N.name, N.state, N.faction);
    if (!N.state) N.state = N.p.state;
    if (!N.faction) N.faction = N.p.faction || pick(FACTIONS[p])[0];
    if (!N.office) N.office = convOfficeOf(N.p);
    if (!N.charisma) N.charisma = 1;
    if (N.del == null) N.del = N.contested ? need - ri(200, 600) : need + ri(200, 900);
    if (N.runnerUp === undefined) N.runnerUp = null;
    if (N.runnerUp && !N.runnerUp.p) N.runnerUp.p = convLive(N.runnerUp.name) || convMakePerson(p, N.runnerUp.name, N.runnerUp.state, N.runnerUp.faction);
    if (N.contested && !N.runnerUp) { const m = pick(S.members.filter(m => m.party === p && m.name !== N.name)); N.runnerUp = { name: m.name, faction: m.faction, del: need - ri(400, 900), p: m, office: `Senator from ${ST[m.state].name}`, state: m.state, charisma: rnd(0.8, 1.2) }; }
    N.contested = !!N.contested;
    if (N.vp === undefined) N.vp = null;
  }
}
// the two-way national horse race from your side: margin in points for S.side's ticket (bounces already banked included).
// An independent career reads it from the Democratic frame (frameP)
function convMargin() {
  const s = presSetup(); let m = IND() ? presEnvD(s) : (s.inc === S.side ? 1 : -1) * s.base;
  const N = S.nominees || {};
  for (const p of ['D', 'R']) if (N[p] && typeof N[p].bounce === 'number') m += (p === frameP() ? 1 : -1) * (0.5 * N[p].bounce + 3 * ((N[p].unity == null ? 1 : N[p].unity) - 1));   // what the fall campaign actually carries (campaignEffects)
  return m;
}
function convShares(m) { const und = 6; m = clamp(m, -40, 40); return { me: (100 - und) / 2 + m / 2, them: (100 - und) / 2 - m / 2, und }; }
function convPollHTML(before, after, label) {
  const mine = frameP(), theirs = other(mine), N = S.nominees;
  const row = (lbl, m) => { const s = convShares(m); return `<div class="conv-pollrow"><span class="conv-plbl">${lbl}</span><div class="conv-pbar"><div style="width:${s.me}%;background:${PARTY[mine].color}">${lastName(N[mine])} ${s.me.toFixed(1)}</div><div style="width:${s.und}%;background:#3a4250"></div><div style="width:${s.them}%;background:${PARTY[theirs].color}">${s.them.toFixed(1)} ${lastName(N[theirs])}</div></div></div>`; };
  const d = after - before;
  return `<div class="conv-poll"><b>📊 ${label || 'National poll'}</b>${row('Before', before)}${row('After', after)}<small>${IND() ? `The ${PARTY[mine].short}' margin` : `Your ticket's margin`} ${fmt(before) === fmt(after) ? 'holds' : `moves from ${before >= 0 ? '+' : ''}${before.toFixed(1)} to ${after >= 0 ? '+' : ''}${after.toFixed(1)}`} (${d >= 0 ? '+' : ''}${d.toFixed(1)}) · 6% undecided</small></div>`;
}
function convUnityHTML(u) { return `<div class="conv-unity"><span>Party unity</span><div class="conv-umeter"><i style="width:${((u - 0.5) / 0.5 * 100).toFixed(0)}%;background:${u >= 0.8 ? 'var(--yes)' : u >= 0.65 ? 'var(--gold)' : 'var(--no)'}"></i></div><b>${Math.round(u * 100)}% · ${convUnityWord(u)}</b></div>`; }
function convHallHTML(C, big) {
  return `<div class="conv-hall ${big ? 'big' : ''}" style="--pc:${PARTY[C.p].color}"><div class="conv-bunting"></div>
    <div class="conv-stage"><div class="conv-city">${C.city} ${C.year}</div><div class="conv-sub">${PARTY[C.p].name} National Convention${big ? ` · ${C.hall} · ${convNum(C.total)} delegates` : ` · ${C.month}`}</div></div>${big ? '<div class="conv-crowd"></div>' : ''}</div>`;
}
function convTicketHTML(C) {
  const N = C.N, vp = N.vp, vpP = vp ? (C.vp && C.vp.name === vp.name && C.vp.p) || convLive(vp.name) || convMakePerson(C.p, vp.name, vp.state, vp.faction) : null;
  return `<div class="conv-ticket" style="border-color:${PARTY[C.p].color}"><div class="conv-tk">${portrait(N.p)}<div><small>For President</small><b>${N.name}</b><span>${N.office} · ${N.faction}</span></div></div>
    ${vpP ? `<div class="conv-tk">${portrait(vpP)}<div><small>For Vice President</small><b>${vp.name}</b><span>${convOfficeAt(vp.office || convOfficeOf(vpP), vp.state)} (${EV[vp.state] || 3} EV)</span></div></div>` : '<div class="conv-tk"><div><small>For Vice President</small><b>To be announced</b></div></div>'}</div>`;
}
function convKicker(C, phase) { return `${C.year} ${PARTY[C.p].name} National Convention · ${phase}`; }
// repaint the screen the player is on without losing their place: showModal scrolls the card to the top, which is right
// for a new screen but not for a redraw after a vet, a plank, a ballot or an event choice (same kicker and headline)
function convShow(html) {
  const card = $('#modal-card'), sc = card.scrollTop, key = () => `${(card.querySelector('.kicker') || {}).textContent}|${(card.querySelector('h2') || {}).textContent}`, was = key();
  showModal(html);
  if (key() === was) card.scrollTop = Math.min(sc, Math.max(0, card.scrollHeight - card.clientHeight));
}
function convCity(p) {
  const pool = CONV_CITIES.filter(c => !CONV_TAKEN.includes(c[0]));
  const w = pool.map(c => Math.max(0.5, 9 - Math.abs(ST[c[1]].lean)) + (Math.sign(ST[c[1]].lean) === (p === 'R' ? 1 : -1) ? 1.5 : 0));
  let r = Math.random() * w.reduce((a, b) => a + b, 0), i = 0; while (r > w[i] && i < w.length - 1) { r -= w[i]; i++; }
  CONV_TAKEN.push(pool[i][0]); return pool[i];
}
// the convention's working state for one party
function convState(p, month) {
  const N = S.nominees[p], P = S.president, [city, st, hall] = convCity(p), total = convTotalDel();
  let unity = 1;
  if (N.runnerUp) unity -= clamp(N.runnerUp.del / total, 0, 0.5) * 0.5;
  if (N.contested) unity -= 0.1;
  if (N.name === P.name && N.runnerUp) unity -= 0.05;
  return { p, q: other(p), mine: p === S.side, year: convYear(), month, N, P, isPres: N.name === P.name, holdsWH: P.party === p, city, st, hall, total, need: convNeed(),
    unity: clamp(unity, 0.5, 1), parts: { ballots: 0, vp: 0, platform: 0, keynote: 0, speech: 0, events: 0 }, lines: [], planks: [], plankDefs: convPlankTags(p), plankChoice: [null, null, null], theme: null,
    keynote: null, vpField: null, deal: false, ballots: [], brokered: false, speech: null, events: [], evDone: 0, nEvents: Math.random() < 0.5 ? 2 : 1, bounce: null };
}
function convBounce(C) {
  const parts = C.parts, raw = 1.2 + (C.unity - 0.75) * 4 + parts.ballots + parts.vp + parts.platform + parts.keynote + parts.speech + parts.events + gauss() * 0.4;
  return Math.round(clamp(raw, -2, 6) * 10) / 10;
}

/* ---------------- hooks called from game.js ---------------- */
function conventionsDue() { const n = S.career.bills + 1; return n % 6 === 5 && billYear(n) % 4 === 0 && !!S.nominees && !S.nominees.conventionsDone; }
function conventionsModal(done) {
  convEnsureNominees();
  CONV_TAKEN = [];
  const P = S.president, order = P.party === 'I' ? ['D', 'R'] : [other(P.party), P.party];
  let finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    S.nominees.conventionsDone = true;
    const rec = { year: convYear() };
    for (const p of ['D', 'R']) { const N = S.nominees[p]; rec[p] = { nominee: N.name, city: N.city, vp: N.vp ? { name: N.vp.name, state: N.vp.state } : null, bounce: N.bounce, unity: N.unity, planks: (N.planks || []).slice(), theme: N.theme, keynote: N.keynote, events: (N._lines || []).slice(0, 8) }; delete N._lines; }
    S.conventions = rec;
    done();
  };
  const run = i => { if (i >= 2) return finish(); const p = order[i], month = i === 0 ? 'late July' : 'August'; (p === S.side ? convMine : convTheirs)(p, month, () => run(i + 1)); };
  // the state above is ready at once; the first screen paints in a microtask (instant for the player, but after the
  // script that opened the interlude has finished, so an automated driver sees the end of the vote, not a new flow)
  Promise.resolve().then(() => run(0));
}
// bank everything on S.nominees[p]
function convStore(C) {
  const N = C.N;
  N.bounce = C.bounce; N.unity = Math.round(C.unity * 100) / 100; N.planks = C.planks.slice(); N.theme = C.theme; N.city = C.city; N.keynote = C.keynote ? C.keynote.name : null;
  N._lines = C.lines.slice();
  convHist(N.p, `Accepted the ${PARTY[C.p].name} nomination for President in ${C.city}`);
  if (C.mine) { if (C.bounce >= 3) addLegacy(5); if (C.bounce >= 5) unlock('bounce'); }
}

/* ---------------- running mates ---------------- */
function convVPField(C) {
  const p = C.p, N = C.N, P = C.P, used = new Set([N.name]), out = [];
  const mk = (person, office, kind, riskScale = 1) => {
    if (!person || used.has(person.name)) return null; used.add(person.name);
    const m = S.members.find(x => x.name === person.name), lean = ST[person.state] ? ST[person.state].lean : 0;
    return { p: person, name: person.name, office, kind, state: person.state, lean, faction: person.faction || pick(FACTIONS[p])[0], charisma: Math.round(rnd(0.8, 1.3) * 100) / 100, risk: Math.round(Math.min(1, Math.pow(Math.random(), 1.5) * riskScale) * 100) / 100, id: m ? m.id : undefined, vetted: false };
  };
  if (C.isPres && S.vp) out.push(mk(S.vp, 'Vice President', 'vp', 0.5));
  const ru = N.runnerUp;
  if (ru && ru.name !== P.name) { const live = convLive(ru.name) || ru.p; if (live) out.push(mk(live, ru.office || convOfficeOf(live), 'runnerUp')); }
  const senScore = m => EV[m.state] * 0.6 + (Math.abs(ST[m.state].lean) <= 6 ? 10 : 0) + (m.faction !== N.faction ? 6 : 0) + (T(m, 'ambitious') ? 3 : 0) + rnd(0, 8);
  const sens = S.members.filter(m => m.party === p && !used.has(m.name)).sort((a, b) => senScore(b) - senScore(a));
  const swing = sens.filter(m => Math.abs(ST[m.state].lean) <= 6);
  if (swing[0] || sens[0]) { const m = swing[0] || sens[0]; out.push(mk(m, `Senator from ${ST[m.state].name}`, 'senator')); }
  const govScore = c => EV[c] * 0.5 - Math.abs(ST[c].lean) * 1.2 + rnd(0, 8);
  const govs = Object.keys(S.governors || {}).filter(c => S.governors[c].party === p && !used.has(S.governors[c].name)).sort((a, b) => govScore(b) - govScore(a));
  if (govs[0]) out.push(mk(S.governors[govs[0]], `Governor of ${ST[govs[0]].name}`, 'governor'));
  // the wildcard: a House member, a cabinet secretary if the party holds the White House, a second senator, or a general
  const rep = pick((S.reps || []).filter(r => r.party === p && !used.has(r.name)));
  const cabPost = C.holdsWH ? pick(Object.keys(S.cabinet || {}).filter(k => S.cabinet[k] && !used.has(S.cabinet[k].name))) : null;
  const wild = [];
  if (cabPost && Math.random() < 0.5) wild.push(mk(S.cabinet[cabPost], (CABINET_POSTS.find(c => c[0] === cabPost) || [0, 'Cabinet secretary'])[1], 'cabinet', 1.3));
  if (rep) wild.push(mk(rep, `Representative (${rep.district})`, 'rep', 1.3));
  if (cabPost) wild.push(mk(S.cabinet[cabPost], (CABINET_POSTS.find(c => c[0] === cabPost) || [0, 'Cabinet secretary'])[1], 'cabinet', 1.3));
  for (const m of sens.filter(m => !used.has(m.name)).slice(0, 2)) wild.push(mk(m, `Senator from ${ST[m.state].name}`, 'senator'));
  for (const c of govs.filter(c => !used.has(S.governors[c].name)).slice(0, 1)) wild.push(mk(S.governors[c], `Governor of ${ST[c].name}`, 'governor'));
  if (wild.filter(Boolean).length === 0) { const g = convMakePerson(p, null, null, MODERATE[p], ri(58, 66)); g.background = 'a four-star general'; g.history = []; hist(g, 'Commanded U.S. forces abroad', C.year - ri(3, 8)); hist(g, 'Retired from the Army', C.year - 1); wild.push(mk(g, 'Retired four-star general', 'general', 1.2)); }
  const field = out.concat(wild).filter(Boolean).slice(0, 4);
  // the nominee's own preference: swing-state votes, balance and star power, a deal if one was struck
  const score = c => (6 - Math.min(6, Math.abs(c.lean))) * 0.4 + (EV[c.state] || 3) * 0.05 + (c.faction !== N.faction ? 1 : 0) + (c.charisma - 1) * 3 + (c.kind === 'runnerUp' ? (N.contested ? 1.5 : 0.5) : 0) + (c.kind === 'vp' ? 3 : 0) + (c.state === N.state ? -2 : 0) + rnd(0, 1.2);
  let pref = field.slice().sort((a, b) => score(b) - score(a))[0];
  if (C.isPres) pref = field.find(c => c.kind === 'vp') || pref;             // a President keeps the Vice President unless you say otherwise
  if (C.deal) pref = field.find(c => c.kind === 'runnerUp') || pref;
  field.forEach(c => c.pref = c === pref);
  return field;
}
function convVPBrings(C, c) {
  const N = C.N, bits = [], st = ST[c.state];
  if (st) bits.push(c.state === N.state ? `shares the nominee's home state: no new map, no new votes` : Math.abs(c.lean) <= 6 ? `<b>puts ${st.name} (${EV[c.state]} EV, ${leanLabel(c.lean)}) in play</b>: a true battleground` : `${st.name} (${EV[c.state]} EV, ${leanLabel(c.lean)}) is already ${Math.sign(c.lean) === (C.p === 'R' ? 1 : -1) ? 'safe' : 'out of reach'}: little help on the map`);
  if (c.kind === 'runnerUp') bits.push('<b>heals the primary wounds</b>: the runner-up\'s delegates come home (unity +)');
  else if (c.kind === 'vp') bits.push('continuity: the voters already know them');
  else bits.push(c.faction !== N.faction ? `balances the ticket: the ${c.faction} next to the nominee's ${N.faction}` : `doubles down on the ${c.faction}`);
  bits.push(c.charisma >= 1.15 ? 'a natural on the stump' : c.charisma <= 0.9 ? 'a cautious, scripted speaker' : 'steady on television');
  const age = ageOf(c.p);
  if (age >= 70) bits.push(`${age}: the oldest name on the list`); else if (age <= 45) bits.push(`${age}: youth and energy`);
  if (c.kind === 'senator') bits.push('a Senate seat the governor would fill if the ticket wins');
  if (c.kind === 'governor') bits.push('executive experience, no Washington votes to defend');
  if (c.kind === 'rep') bits.push('nobody outside the district knows them (yet)');
  if (c.kind === 'cabinet') bits.push('the administration\'s record, for better or worse');
  if (c.kind === 'general') bits.push('stars on the shoulders, zero political instincts');
  return bits;
}
function convVPScreen(C, next) {
  const N = C.N, P = C.P;
  if (!C.vpField) C.vpField = convVPField(C);
  const F = C.vpField, pref = F.find(c => c.pref) || F[0];
  const draw = () => {
    const broke = S.career.capital < 1;   // re-read on every paint: a vet can spend the last point
    const cards = F.map((c, i) => `<div class="conv-vp ${c.pref ? 'pref' : ''}" style="--pc:${PARTY[C.p].color}">${portrait(c.p)}<div class="conv-vpbody"><b>${c.pref ? '★ ' : ''}${c.name}</b><small>${c.office} · ${c.state} · ${EV[c.state] || 3} EV · ${c.faction} · age ${ageOf(c.p)}</small>
        <ul>${convVPBrings(C, c).map(b => `<li>${b}</li>`).join('')}<li>${c.vetted ? `<b style="color:${c.risk >= 0.55 ? 'var(--no)' : c.risk >= 0.25 ? 'var(--gold2)' : 'var(--yes)'}">Vetting: ${convRiskWord(c.risk)}</b> · ${c.risk >= 0.55 ? c.riskStory : c.risk >= 0.25 ? `${c.riskStory}; survivable, probably` : 'the file is boring: a parking ticket in 2009 and a fondness for karaoke'}` : '<span style="color:var(--dim)">Hidden risk: unknown until vetted</span>'}</li></ul>
        <div class="conv-vpbtns">${c.vetted ? '' : `<button class="btn ghost" data-choice="vet:${i}" ${broke ? 'disabled' : ''}>Vet<small>1 capital</small></button>`}<button class="btn ${c.pref ? 'primary' : ''}" data-choice="vp:${i}" ${!c.pref && broke ? 'disabled' : ''}>${c.pref ? (C.deal ? 'Honor the deal' : C.isPres && c.kind === 'vp' ? 'Keep on the ticket' : 'Pick (nominee\'s choice)') : C.isPres && pref.kind === 'vp' ? 'Dump the VP for them' : 'Pick'}${c.pref ? '' : '<small>1 capital' + (C.isPres && pref.kind === 'vp' ? ', unity −10%' : C.deal ? ', breaks the deal' : '') + '</small>'}</button></div></div></div>`).join('');
    convShow(`<div class="kicker">${convKicker(C, 'The running mate')}</div><h2>Night 2 · Who runs with ${lastName(N.p)}?</h2>${convHallHTML(C)}
      <p>${C.deal ? `<b>The deal is done:</b> ${pref.name}'s delegates put ${lastName(N.p)} over the top, and the price was the second slot on the ticket.` : C.isPres ? `${presTitle()} is inclined to keep Vice President ${S.vp ? S.vp.name : pref.name}. Dumping a sitting Vice President is a story for a week and a wound for a season.` : `${N.name} has a short list of four. The nominee's own favorite is marked ★ and costs you nothing; steering them to someone else takes <b>1 capital</b>.`} Vetting a name (1 capital) reveals what the opposition will find in the fall. You have <b style="color:var(--gold2)">${S.career.capital}</b> capital.</p>
      <div class="conv-vpgrid">${cards}</div>
      <div class="choices"><button class="btn primary big adv" id="convvpgo">${C.deal ? `Honor the deal: ${pref.name} for Vice President` : C.isPres && pref.kind === 'vp' ? `Keep Vice President ${pref.name} on the ticket` : `Go with the nominee's choice: ${pref.name}`}</button></div>`);
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice^="vet:"]').forEach(b => b.onclick = () => {
      const c = F[+b.dataset.choice.slice(4)]; if (!c || c.vetted || S.career.capital < 1) return;
      S.career.capital--; c.vetted = true; c.riskStory = c.riskStory || pick(CONV_RISKS); sfx.click(); draw();
    });
    card.querySelectorAll('[data-choice^="vp:"]').forEach(b => b.onclick = () => { const c = F[+b.dataset.choice.slice(3)]; if (!c) return; if (!c.pref) { if (S.career.capital < 1) return; S.career.capital--; } convPickVP(C, c); next(); });
    $('#convvpgo').onclick = () => { convPickVP(C, pref); next(); };
  };
  draw();
}
// what a running mate adds to the bounce: star power, a battleground state, healed wounds; minus baggage and a shared home state
function convVPValue(C, c) { return clamp((c.charisma - 1) * 1.5 + (Math.abs(c.lean) <= 6 ? 0.4 : 0) + (c.kind === 'runnerUp' ? 0.3 : 0) - (c.risk > 0.7 ? 0.4 : 0) + (c.state === C.N.state ? -0.3 : 0), -0.5, 1); }
function convPickVP(C, c) {
  const N = C.N, pref = C.vpField.find(x => x.pref);
  N.vp = { name: c.name, state: c.state, faction: c.faction, office: c.office, charisma: c.charisma, risk: c.risk };
  if (c.id != null) N.vp.id = c.id;
  C.vp = c;
  if (c.kind === 'runnerUp') C.unity = Math.min(1, C.unity + 0.1);
  else if (c.faction !== N.faction) C.unity = Math.min(1, C.unity + 0.03);
  const sitting = C.vpField.find(x => x.kind === 'vp');
  if (C.isPres && sitting && c !== sitting) { C.unity = Math.max(0.5, C.unity - 0.1); C.lines.push(`Dumped Vice President ${sitting.name} from the ticket`); convHist(sitting.p, `Dropped from the ticket by ${presTitle()} in favor of ${c.name}`); }
  if (C.deal && c.kind !== 'runnerUp') { C.unity = Math.max(0.5, C.unity - 0.15); C.lines.push(`Broke the convention deal with ${pref ? pref.name : 'the runner-up'}`); }
  C.parts.vp = convVPValue(C, c);
  convHist(c.p, `Chosen as ${N.name}'s running mate`);
  C.lines.push(`Running mate: ${c.name} (${convOfficeAt(c.office, c.state)})`);
  if (C.mine) sfx.up();
}

/* ---------------- the platform ---------------- */
// the three issues the party's wings disagree about most, with each wing's direction (+1 = more of it)
function convPlankTags(p) {
  const fw = FACTIONS[p].find(f => f[0] === convFlank(p))[1], mw = FACTIONS[p].find(f => f[0] === MODERATE[p])[1], pr = PARTY[p].prior;
  return shuffle(TAGS.slice()).map(t => ({ tag: t, d: Math.abs((fw[t] || 0) - (mw[t] || 0)) + rnd(0, 0.5), fdir: sgn(fw[t] || 0) || -sgn(mw[t] || 0) || sgn(pr[t] || 0) || 1 }))
    .sort((a, b) => b.d - a.d).slice(0, 3).map(x => ({ tag: x.tag, fdir: x.fdir, cdir: -x.fdir, flank: CONV_PLANK_TEXT[p][x.tag][0], center: CONV_PLANK_TEXT[p][x.tag][1] }));
}
function convDefaultTheme(C) {
  const picked = C.planks[0]; if (picked) return picked.tag;
  return Object.entries(PARTY[C.p].prior).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))[0][0];
}
// settle a plank: 'flank' | 'center' | 'vague'
function convSetPlank(C, i, how) {
  const d = C.plankDefs[i]; C.plankChoice[i] = how;
  if (how === 'flank') { C.unity = Math.min(1, C.unity + 0.05); C.parts.platform -= 0.2; C.planks.push({ tag: d.tag, dir: d.fdir }); }
  else if (how === 'center') { C.unity = Math.max(0.5, C.unity - 0.05); C.parts.platform += 0.2; C.planks.push({ tag: d.tag, dir: d.cdir }); }
  else if (Math.random() < 0.2) { C.parts.platform -= 1; C.unity = Math.max(0.5, C.unity - 0.03); d.fight = true; C.lines.push(`Floor fight over the ${TAG[d.tag][1]} plank`); }
  C.lines.push(`${TAG[d.tag][1]} plank: ${how}`);
}
function convPlatformScreen(C, next) {
  const N = C.N, nomFx = (FACTIONS[C.p].find(f => f[0] === N.faction) || [0, {}])[1];
  const nomDefault = d => { const w = nomFx[d.tag] || 0; return w === 0 ? 'vague' : sgn(w) === d.fdir ? 'flank' : 'center'; };
  const draw = () => {
    const allSet = C.plankChoice.every(Boolean), fights = C.plankDefs.filter(d => d.fight);
    const planks = C.plankDefs.map((d, i) => { const ch = C.plankChoice[i]; return `<div class="conv-plank ${ch ? 'set' : ''}"><div class="conv-ptitle">${TAG[d.tag][0]} <b>${TAG[d.tag][1]}</b> <small>· the ${convFlank(C.p)} vs. the ${MODERATE[C.p]} · the nominee's draft: ${nomDefault(d)}</small></div>
        ${ch ? `<div class="conv-pset">${ch === 'flank' ? `<b>The base's version:</b> ${d.flank}` : ch === 'center' ? `<b>The center's version:</b> ${d.center}` : `<b>Left vague:</b> “We believe in a ${TAG[d.tag][1].toLowerCase()} policy that works for every American.”${d.fight ? ' <span style="color:var(--no)">The flank forced a 40-minute floor fight anyway; cable ran the shouting on a loop.</span>' : ''}`}</div>`
        : `<div class="conv-pvers"><button class="btn" data-choice="plank:${i}:flank"><span><b>${convFlank(C.p)}:</b> ${d.flank}<small>The base's taste · unity +5% · swing voters −</small></span></button><button class="btn" data-choice="plank:${i}:center"><span><b>${MODERATE[C.p]}:</b> ${d.center}<small>Reaches the middle · unity −5% · swing voters +</small></span></button></div><button class="btn ghost" data-choice="plank:${i}:vague">Leave it vague<small>Unity holds, but the fall campaign has no plank to run on: states that care about this issue get nothing from it. 20%: the flank forces a floor fight (bounce −1)</small></button>`}</div>`; }).join('');
    const themeRow = allSet ? `<div class="conv-theme"><b>Which plank headlines the campaign?</b> <small style="color:var(--dim)">The campaign's central message; the fall campaign runs on it.</small><div class="conv-themebtns">${C.planks.length ? C.planks.map(pl => `<button class="btn ${C.theme === pl.tag ? 'on' : ''}" ${C.theme ? 'disabled' : ''} data-choice="theme:${pl.tag}">${TAG[pl.tag][0]} ${TAG[pl.tag][1]}</button>`).join('') : `<span style="color:var(--dim)">Every plank is vague; the campaign will run on ${TAG[convDefaultTheme(C)][1]}, the party's old favorite.</span>`}</div></div>` : '';
    convShow(`<div class="kicker">${convKicker(C, 'The platform')}</div><h2>Night 3 · The platform fight</h2>${convHallHTML(C)}
      <p>Three planks split the ${convFlank(C.p)} from the ${MODERATE[C.p]}. The base's version buys unity and costs you with swing voters; the center's version does the reverse. ${convUnityHTML(C.unity)}</p>
      <div class="conv-planks">${planks}</div>${themeRow}
      <div class="choices"><button class="btn primary big adv" id="convplatgo">${allSet ? (C.theme || !C.planks.length ? 'Adopt the platform' : `Adopt the platform; run on ${TAG[convDefaultTheme(C)][1]}`) : 'Adopt the platform as the nominee\'s team drafted it'}</button></div>`);
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice^="plank:"]').forEach(b => b.onclick = () => { const [, i, how] = b.dataset.choice.split(':'); if (C.plankChoice[+i]) return; convSetPlank(C, +i, how); sfx.click(); draw(); });
    card.querySelectorAll('[data-choice^="theme:"]').forEach(b => b.onclick = () => { if (C.theme) return; C.theme = b.dataset.choice.slice(6); sfx.click(); draw(); });
    $('#convplatgo').onclick = () => { C.plankDefs.forEach((d, i) => { if (!C.plankChoice[i]) convSetPlank(C, i, nomDefault(d)); }); if (!C.theme) C.theme = convDefaultTheme(C); C.lines.push(`Theme: ${TAG[C.theme][1]}`); next(); };
  };
  draw();
}

/* ---------------- the roll call: a contested convention ---------------- */
function convRollCall(C, next) {
  const N = C.N, ru = N.runnerUp, P = C.P, third = (N.others || []).filter(o => o.del > 0);
  const L = { name: N.name, p: N.p, del: N.del }, R = { name: ru.name, p: ru.p, del: ru.del };
  let U = Math.max(0, C.total - L.del - R.del);
  const kingmaker = third[0] ? third[0].name : 'uncommitted';
  C.ballots.push({ n: 1, L: L.del, R: R.del, U, note: `Pledged delegates vote as instructed. No majority. Under the rules, every delegate is now free.` });
  let brokeredBy = null, result = null;
  const tally = b => `<div class="conv-ballot"><div class="conv-bhead"><b>${b.n === 1 ? 'First' : b.n === 2 ? 'Second' : b.n === 3 ? 'Third' : 'Fourth'} ballot</b><span>${convNum(b.L)} · ${convNum(b.R)} · ${convNum(b.U)} free</span></div>
    <div class="conv-delbar"><i style="width:${b.L / C.total * 100}%;background:${PARTY[C.p].color}"></i><i style="width:${b.R / C.total * 100}%;background:var(--gold)"></i><i style="width:${b.U / C.total * 100}%;background:#3a4250"></i><b class="conv-need" style="left:${C.need / C.total * 100}%"></b></div><small>${b.note}</small></div>`;
  const ballot = how => {
    const n = C.ballots.length + 1; let note;
    if (how === 'back') { const g = U * rnd(0.55, 0.85), d = R.del * rnd(0, 0.08); L.del += g + d; R.del -= d; U -= g; if (!brokeredBy) C.unity = Math.min(1, C.unity + 0.05); note = `You work the ${kingmaker} delegations for ${lastName(L.p)}: ${convNum(g)} free delegates and a trickle from ${lastName(R.p)}'s column.`; }
    else if (how === 'upset') { const g = U * rnd(0.45, 0.8), d = L.del * rnd(0.03, 0.12); R.del += g + d; L.del -= d; U -= g; C.unity = Math.max(0.5, C.unity - 0.05); note = `You go all in for ${lastName(R.p)}: ${convNum(g)} free delegates break their way and ${convNum(d)} of ${lastName(L.p)}'s defect. The hall is a wall of noise.`; }
    else if (how === 'deal') { const g = Math.min(U, Math.max(U * rnd(0.3, 0.6), C.need - L.del - R.del)); L.del += R.del + g; U -= g; R.del = 0; C.unity = Math.min(1, C.unity + 0.1); C.deal = true; C.parts.ballots += 0.3; note = `The deal: ${lastName(R.p)} releases every delegate to ${lastName(L.p)} in exchange for the second slot on the ticket. The two walk onto the stage together.`; }
    else { const s = Math.random(), g = U * rnd(0.15, 0.45), d = Math.min(L.del, R.del) * rnd(0, 0.08); if (s < 0.5) L.del += g; else R.del += g; U -= g; if (Math.random() < 0.5) { L.del -= d; R.del += d; } else { R.del -= d; L.del += d; } C.parts.ballots -= 0.6; note = pick([`No deal. State chairs trade delegations on the floor like baseball cards; the networks run it live for three hours.`, `The ${pick(['Texas', 'California', 'Ohio', 'Pennsylvania'])} delegation splits on live television and its chair is seen weeping. ${convNum(g)} free delegates move; nobody can say exactly where.`, `A two-hour recess for "consultations." When the roll resumes, ${convNum(g)} free delegates have picked a side and ${convNum(d)} pledged ones have changed their minds.`]); }
    U = Math.max(0, U); L.del = Math.max(0, L.del); R.del = Math.max(0, R.del);
    if (how !== 'floor') brokeredBy = how;
    C.ballots.push({ n, L: L.del, R: R.del, U, note }); C.ballotCount = n;
    if (L.del >= C.need) result = 'L'; else if (R.del >= C.need) result = 'R';
    else if (n >= 4) { const w = L.del >= R.del ? L : R, l = w === L ? R : L, sw = l.del * 0.5; w.del += U + sw; l.del -= sw; U = 0; C.unity = Math.max(0.5, C.unity - 0.05); const last = C.ballots[C.ballots.length - 1]; last.L = L.del; last.R = R.del; last.U = 0; last.note += ` Exhausted, the chair moves to nominate by acclamation.`; result = w === L ? 'L' : 'R'; }
    if (result) {
      const won = result === 'L' ? L : R, lost = result === 'L' ? R : L;
      C.parts.ballots -= 0.5;
      if (result === 'R') {
        C.brokered = true;
        S.nominees[C.p] = { ...N, p: won.p, name: won.name, state: won.p.state, faction: won.p.faction || ru.faction || N.faction, office: ru.office || convOfficeOf(won.p), charisma: ru.charisma || rnd(0.85, 1.2), del: Math.round(won.del), runnerUp: { name: L.name, faction: N.faction, del: Math.round(lost.del), p: L.p, office: N.office, state: N.state, charisma: N.charisma }, contested: true, brokered: true, vp: null };
        C.N = S.nominees[C.p]; C.isPres = C.N.name === P.name;
        if (L.name === P.name) convHist(P, `Denied renomination by the ${C.year} ${PARTY[C.p].name} convention`);
      }
      convHist(won.p, `Won the ${C.year} ${PARTY[C.p].name} nomination on the ${convNth(n)} ballot of a contested convention in ${C.city}`);
      convHist(lost.p, `Lost the ${C.year} ${PARTY[C.p].name} nomination on the ${convNth(n)} ballot in ${C.city}`);
      C.lines.push(`Nominated on the ${convNth(n)} ballot${result === 'R' ? ' (upset over the primary leader)' : ''}`);
      if (C.mine && brokeredBy) unlock('broker');
      if (C.mine) sfx.gavel();
    }
  };
  const draw = () => {
    const b = C.ballots[C.ballots.length - 1];
    const choices = result ? '' : `<div class="choices">
        <button class="btn" data-choice="ballot:back"><span>Back the frontrunner, ${L.name}<small>Deliver the free delegates. Unity +5%. The safe play.</small></span></button>
        <button class="btn" data-choice="ballot:upset"><span>Back the runner-up, ${R.name}<small>An upset, if the ${kingmaker} delegates follow you. Unity −5%, and the loser's people will remember.</small></span></button>
        <button class="btn" data-choice="ballot:deal" ${R.name === P.name ? 'disabled' : ''}><span>Broker a ticket: ${lastName(R.p)} releases the delegates for the VP slot<small>${R.name === P.name ? 'A sitting President will not take the second slot.' : 'Settles it now. Unity +10%. The running mate is decided for you.'}</small></span></button>
        <button class="btn ghost" data-choice="ballot:floor"><span>Let the floor fight it out<small>Anything can happen. The spectacle costs the party on television (bounce −).</small></span></button></div>`;
    const resultBox = result ? `<div class="conv-result" style="border-color:${PARTY[C.p].color}"><b>${C.N.name} is the ${PARTY[C.p].name} nominee for President</b>, on the ${convNth(b.n)} ballot, ${convNum(result === 'L' ? L.del : R.del)} delegates to ${convNum(result === 'L' ? R.del : L.del)}. ${result === 'R' ? `The primary leader is beaten on the floor; ${lastName(L.p)}'s delegates file out of the hall in silence.` : `${lastName(R.p)} ${C.deal ? 'is on the ticket' : 'concedes from the floor and asks for the vote to be made unanimous'}.`}${C.mine && brokeredBy ? ' <b style="color:var(--gold2)">You brokered it.</b>' : ''}</div><div class="choices"><button class="btn primary big adv" id="convrcgo">On to the running mate</button></div>` : '';
    convShow(`<div class="kicker">${convKicker(C, 'The roll call')}</div><h2>Night 2 · A contested convention</h2>${convHallHTML(C)}
      <p>Nobody left the primaries with a majority. ${L.name} arrived with <b>${convNum(C.ballots[0].L)}</b> delegates, ${R.name} with <b>${convNum(C.ballots[0].R)}</b>, and <b>${convNum(C.ballots[0].U)}</b> ${third[0] ? `pledged to ${third[0].name}, who finished third and is listening to offers` : 'uncommitted'}. <b>${convNum(C.need)}</b> wins. ${C.mine ? 'The whip of the Senate caucus is the most useful person in the building: delegations take your calls.' : ''}</p>
      <div class="conv-ballots">${C.ballots.map(tally).join('')}</div>${convUnityHTML(C.unity)}${choices}${resultBox}`);
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice^="ballot:"]').forEach(x => x.onclick = () => { if (result) return; ballot(x.dataset.choice.slice(7)); sfx.click(); draw(); });
    if ($('#convrcgo')) $('#convrcgo').onclick = next;
  };
  draw();
}
// the other party's roll call, settled without you
function convAutoRollCall(C) {
  const N = C.N, ru = N.runnerUp, P = C.P;
  const n = ri(2, 4), upset = ru.name !== P.name && Math.random() < 0.3;
  C.parts.ballots -= 0.5 + (n - 2) * 0.3; C.unity = Math.max(0.5, C.unity - 0.03 * n); C.ballotCount = n;
  const won = upset ? { p: ru.p, name: ru.name } : { p: N.p, name: N.name }, lost = upset ? { p: N.p, name: N.name } : { p: ru.p, name: ru.name };
  if (upset) {
    S.nominees[C.p] = { ...N, p: ru.p, name: ru.name, state: ru.p.state, faction: ru.p.faction || ru.faction, office: ru.office || convOfficeOf(ru.p), charisma: ru.charisma || rnd(0.85, 1.2), del: C.need + ri(50, 400), runnerUp: { name: N.name, faction: N.faction, del: N.del, p: N.p, office: N.office, state: N.state, charisma: N.charisma }, contested: true, brokered: true, vp: null };
    C.N = S.nominees[C.p]; C.isPres = C.N.name === P.name; C.brokered = true;
    if (N.name === P.name) convHist(P, `Denied renomination by the ${C.year} ${PARTY[C.p].name} convention`);
  }
  convHist(won.p, `Won the ${C.year} ${PARTY[C.p].name} nomination on the ${convNth(n)} ballot of a contested convention in ${C.city}`);
  convHist(lost.p, `Lost the ${C.year} ${PARTY[C.p].name} nomination on the ${convNth(n)} ballot in ${C.city}`);
  C.lines.push(`Nominated on the ${convNth(n)} ballot${upset ? ' (upset over the primary leader)' : ''}`);
  return `The roll call goes ${n} ballots. ${upset ? `<b>An upset:</b> ${won.name} overtakes ${lost.name} as the free delegates break late, and the primary leader's people leave the hall in silence.` : `${won.name} grinds out a majority as the uncommitted delegations fall in line; ${lost.name} asks that the vote be made unanimous.`}`;
}

/* ---------------- prime time: the keynote and the acceptance speech ---------------- */
function convKeynoteOptions(C) {
  const p = C.p, N = C.N, P = C.P, opts = [], vpName = N.vp ? N.vp.name : null;
  const pool = S.members.filter(m => m.party === p && m.name !== N.name && m.name !== vpName && !m.star).map(m => ({ m, s: (T(m, 'ambitious') ? 10 : 0) + (ageOf(m) < 50 ? 6 : 0) + (ageOf(m) < 42 ? 4 : 0) + rnd(0, 8) })).sort((a, b) => b.s - a.s);
  const star = pool[0] && pool[0].m;
  if (star) opts.push({ key: 'star', who: star, label: `A rising star: Sen. ${star.name} (${star.state}), ${ageOf(star)}`, sub: 'Introduce the party\'s future to the country. Careers are made on this stage.' });
  // a President who was the runner-up appears as the runner-up (below), and one the floor just denied renomination stays home
  if (C.holdsWH && !C.isPres && !(N.runnerUp && N.runnerUp.name === P.name)) opts.push({ key: 'pres', who: P, label: presTitle(), sub: `The sitting President, at ${P.approval}% approval. ${P.approval >= 50 ? 'An asset to show off.' : 'A liability to manage.'}` });
  if (C.isPres && S.vp && S.vp.name !== vpName && !(C.vp && C.vp.kind !== 'vp')) opts.push({ key: 'veep', who: S.vp, label: `Vice President ${S.vp.name}`, sub: 'Loyal, steady, and nobody will remember a word.' });
  const ru = N.runnerUp && N.runnerUp.name !== N.name && N.runnerUp.name !== vpName ? (convLive(N.runnerUp.name) || N.runnerUp.p) : null;
  if (ru) opts.push({ key: 'runnerUp', who: ru, label: `${ru.name === P.name ? presTitle() : ru.name}, the runner-up`, sub: 'Heal the primary wounds on live television. Unity +10%.' });
  if (opts.length < 3) {
    let elder = pick((S.formers || []).filter(f => f.party === p && f.name !== N.name && f.name !== vpName)) || null;
    if (!elder) { elder = convMakePerson(p, null, null, MODERATE[p], ri(68, 79)); elder.history = []; hist(elder, `Worked as ${elder.background}`, C.year - ri(40, 50)); hist(elder, `Elected Governor of ${ST[elder.state].name}`, C.year - ri(24, 32)); hist(elder, `Ran for President; lost the ${PARTY[p].name} nomination`, C.year - ri(12, 20)); }
    opts.push({ key: 'elder', who: elder, label: `An elder statesman: ${elder.name}, ${ageOf(elder)}`, sub: 'A warm bath of nostalgia. Unity +5%.' });
  }
  opts.push({ key: 'celeb', who: null, celeb: pick(CONV_CELEBS), label: `A celebrity`, sub: 'Ratings guaranteed. The speech, less so. High variance.' });
  return opts.slice(0, 4);
}
function convKeynote(C, o) {
  const P = C.P; let k, text;
  if (o.key === 'star') { k = clamp(0.3 + gauss() * 0.5, -0.4, 1.3); o.who.star = true; if (C.mine) o.who.rel = (o.who.rel || 0) + 1; convHist(o.who, `Delivered the keynote at the ${C.year} ${PARTY[C.p].name} National Convention`); text = k > 0.8 ? `<b>A star is born.</b> Sen. ${o.who.name} talks about ${o.who.hometown} and ${o.who.background} for nineteen minutes without notes; by midnight the clip has 40 million views and three columnists are writing the ${C.year + 8} field.` : k > 0.1 ? `Sen. ${o.who.name} gives a polished, confident speech about growing up in ${o.who.hometown}. The party has found a new surrogate.` : `Sen. ${o.who.name} is fine. The crowd is polite, the networks cut to a panel halfway through.`; }
  else if (o.key === 'pres') { k = clamp((P.approval - 50) / 12 + gauss() * 0.3, -1.5, 1.5); convHist(P, `Spoke for ${C.N.name} at the ${C.year} ${PARTY[C.p].name} convention`); text = P.approval >= 50 ? `${presTitle()} (${P.approval}%) takes a victory lap and hands the baton: “${lastName(C.N.p)} will finish what we started.” The hall eats it up.` : `${presTitle()} (${P.approval}%) is received warmly inside the hall and coolly outside it; the nominee's team winces at every mention of the record.`; }
  else if (o.key === 'veep') { k = clamp(0.2 + gauss() * 0.3, -0.5, 0.8); convHist(o.who, `Keynoted the ${C.year} ${PARTY[C.p].name} convention`); text = `Vice President ${o.who.name} makes the case for four more years in a speech that is competent, loyal and forgotten by the second commercial break.`; }
  else if (o.key === 'runnerUp') { k = clamp(0.3 + gauss() * 0.3, -0.3, 0.9); C.unity = Math.min(1, C.unity + 0.1); convHist(o.who, `Endorsed ${C.N.name} in a keynote speech at the ${C.year} ${PARTY[C.p].name} convention`); text = `${o.who.name} walks out to the longest ovation of the week and asks every one of their delegates to come home. “We fought. We lost. Now we win together.” The primary is officially over.`; }
  else if (o.key === 'elder') { k = clamp(0.2 + gauss() * 0.25, -0.3, 0.7); C.unity = Math.min(1, C.unity + 0.05); convHist(o.who, `Returned to the stage for the keynote at the ${C.year} ${PARTY[C.p].name} convention`); text = `${o.who.name} reminds the hall what the party used to stand for and gets misty doing it. Nostalgia polls well with the base.`; }
  else { k = clamp(gauss() * 1.2, -2, 2); text = k > 0.8 ? `${o.celeb.charAt(0).toUpperCase() + o.celeb.slice(1)} turns out to be funny, fluent and furious about ${TAG[C.theme || convDefaultTheme(C)][1].toLowerCase()}. The ratings beat the finale of everything.` : k > -0.5 ? `${o.celeb.charAt(0).toUpperCase() + o.celeb.slice(1)} is charming, slightly off-message and over by six minutes. The ratings are huge; the reviews are mixed.` : `${o.celeb.charAt(0).toUpperCase() + o.celeb.slice(1)} freelances a riff about the other party's nominee that is profane, unfunny and the only thing anyone remembers from Night 3. Twelve million people watched it live.`; }
  C.parts.keynote = k; C.keynote = { key: o.key, name: o.who ? o.who.name : o.celeb, text };
  C.lines.push(`Keynote: ${C.keynote.name}${k > 0.8 ? ' (a triumph)' : k < -0.5 ? ' (a flop)' : ''}`);
  return text;
}
const CONV_TONES = {
  unity: ['Unity', 'Bind the wounds, thank the runner-up, one party.', ['There are no red delegates or blue delegates in this hall tonight — only Americans who want their country back on its feet', 'We fought hard, and the fight made us stronger. Now we fight together', 'To everyone who backed someone else this spring: this is your campaign too']],
  fighting: ['Fighting', 'Name the enemy, rally the base, draw blood.', ['They have the lobbyists. We have you', 'I didn\'t come to {city} to make peace with the people who broke this country', 'If they want a fight over {theme}, they\'ve got one']],
  vision: ['Vision', 'The next decade, the big picture, the sunrise.', ['Picture a country where {theme} is not a slogan but a promise kept', 'The next decade belongs to the nation that builds first — and we are going to build', 'Not left, not right: forward']],
  humble: ['Humble', 'Admit the doubts, ask for the chance, no swagger.', ['I know the polls. I know the doubts. I have read every one of them, and I am still here', 'I have made mistakes, and I will make more. But I will never stop working for you', 'I am not the hero of this story. You are']],
};
function convToneFit(C, tone) {
  const mood = convMoodOf(C.p), P = C.P;
  if (tone === 'unity') return C.unity < 0.85 ? 1 : -0.5;
  if (tone === 'fighting') return !C.holdsWH || mood < 0 ? 1 : P.approval >= 55 ? -1 : 0;
  if (tone === 'vision') return mood >= 0 && !C.isPres ? 1 : mood < -3 ? -0.5 : 0;
  return (C.isPres && P.approval < 48) || C.N.contested ? 1 : mood > 3 ? -1 : -0.3;
}
function convSpeech(C, tone) {
  const N = C.N, fit = convToneFit(C, tone), q = (N.charisma - 1) * 2 + fit * 0.5 + gauss() * 0.55;
  const tier = q > 0.7 ? 3 : q > 0.1 ? 2 : q > -0.5 ? 1 : 0;
  const quote = pick(CONV_TONES[tone][2]).replace('{city}', C.city).replace('{theme}', TAG[C.theme || convDefaultTheme(C)][1].toLowerCase());
  const mins = ri(38, 71), applause = ri(21, 64);
  const text = [
    `<b>It falls flat.</b> ${mins} minutes that feel like ninety. The “${quote}” line gets scattered applause, the teleprompter pace drags, and the cameras keep finding delegates checking their phones. A cable panel calls it “a missed moment” before the balloons are down.`,
    `<b>It's fine.</b> ${mins} minutes, a little long, one good line — “${quote}” — and a lot of lists. The hall is warm, the reviews are respectful, nobody is quoting it tomorrow.`,
    `<b>It lands.</b> ${applause} applause breaks by the networks' count. “${quote}” leads every morning show, and the ${tone === 'fighting' ? 'base is roaring' : tone === 'unity' ? 'runner-up\'s delegates are on their feet' : 'undecideds in the focus groups turned their dials up'}.`,
    `<b>The speech of a career.</b> The hall is on its feet for four straight minutes after “${quote}”. It trends worldwide before the first balloon drops; the other party's war room goes quiet. Even the hostile anchors use the word “presidential.”`,
  ][tier];
  C.parts.speech = [-1.2, 0.4, 1.2, 1.8][tier];
  if (tone === 'unity' && tier >= 2) C.unity = Math.min(1, C.unity + 0.05);
  C.speech = { tone, tier, quote, text };
  C.lines.push(`Acceptance speech (${CONV_TONES[tone][0].toLowerCase()}): ${['fell flat', 'fine', 'landed', 'a triumph'][tier]}`);
  convHist(N.p, tier >= 2 ? `Brought the ${C.city} convention to its feet with the acceptance speech` : `Gave a ${tier === 1 ? 'workmanlike' : 'flat'} acceptance speech in ${C.city}`);
  return text;
}
function convPrimeTimeScreen(C, next) {
  const N = C.N, opts = convKeynoteOptions(C);
  let keyText = null, speechText = null;
  const draw = () => {
    const keyPart = keyText ? `<div class="conv-result"><b>Night 3 · The keynote:</b> ${keyText}</div>` : `<p><b>Night 3.</b> Who gets the keynote slot, the hour before the networks go back to their regular programming?</p><div class="choices">${opts.map(o => `<button class="btn" data-choice="key:${o.key}"><span>${o.label}${o.key === 'celeb' ? `: ${o.celeb}` : ''}<small>${o.sub}</small></span></button>`).join('')}</div>`;
    const speechPart = !keyText ? '' : speechText ? `<div class="conv-result" style="border-color:${PARTY[C.p].color}"><b>Night 4 · The acceptance speech:</b> ${speechText}</div><div class="choices"><button class="btn primary big adv" id="convptgo">Drop the balloons</button></div>`
      : `<p><b>Night 4.</b> ${N.name} steps up to accept. The speechwriters have four drafts. ${lastName(N.p)}'s charisma: <b>${N.charisma >= 1.2 ? 'electric' : N.charisma >= 1.05 ? 'solid' : N.charisma >= 0.9 ? 'uneven' : 'wooden'}</b>. The party is <b>${convMoodWord(convMoodOf(C.p))}</b> and <b>${convUnityWord(C.unity)}</b>; pick the tone that fits the room.</p>
        <div class="choices">${Object.entries(CONV_TONES).map(([k, t]) => `<button class="btn" data-choice="tone:${k}"><span><b>${t[0]}</b> · ${t[1]}<small>“${t[2][0].replace('{city}', C.city).replace('{theme}', TAG[C.theme || convDefaultTheme(C)][1].toLowerCase())}”</small></span></button>`).join('')}</div>`;
    convShow(`<div class="kicker">${convKicker(C, 'Prime time')}</div><h2>Nights 3 and 4 · Prime time</h2>${convHallHTML(C)}${keyPart}${speechPart}`);
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice^="key:"]').forEach(b => b.onclick = () => { if (keyText) return; const o = opts.find(x => x.key === b.dataset.choice.slice(4)); if (!o) return; keyText = convKeynote(C, o); if (C.mine) (C.parts.keynote >= 0 ? sfx.up : sfx.down)(); draw(); });
    card.querySelectorAll('[data-choice^="tone:"]').forEach(b => b.onclick = () => { if (speechText || !keyText) return; speechText = convSpeech(C, b.dataset.choice.slice(5)); if (C.mine) (C.speech.tier >= 2 ? sfx.fanfare : sfx.down)(); draw(); });
    if ($('#convptgo')) $('#convptgo').onclick = next;
  };
  draw();
}

/* ---------------- convention-floor events ---------------- */
function convTopIssue() { return Object.entries(S.salience || { economy: 3 }).sort((a, b) => b[1] - a[1])[0][0]; }
function convRoll(c) { return c + gauss() * 0.3 > 1.02; }
function convEventPool(C) {
  const p = C.p, N = C.N, P = C.P, vp = N.vp, party = PARTY[p].short, top = convTopIssue();
  const senOf = () => pick(S.members.filter(m => m.party === p && m.name !== N.name && !(vp && m.name === vp.name))) || S.members[0];
  const vpC = () => C.vp || { name: vp ? vp.name : 'the running mate', charisma: vp ? vp.charisma : 1 };
  const flankSide = C.planks.filter(pl => pl.dir === (C.plankDefs.find(d => d.tag === pl.tag) || {}).fdir).length, centerSide = C.planks.length - flankSide;
  const losers = flankSide >= centerSide ? MODERATE[p] : convFlank(p);
  const pool = [
    { id: 'protest', title: 'Protests outside the hall', text: `Several thousand marchers fill the streets around ${C.hall}, chanting about ${TAG[top][1].toLowerCase()}. Police in riot gear line the perimeter and the networks keep cutting away from the podium to the barricades.`, choices: [
      { key: 'meet', label: 'Send the nominee out to meet the organizers', sub: 'Risky optics. The base will love it.', apply: () => { C.unity = Math.min(1, C.unity + 0.06); const ok = convRoll(N.charisma); C.parts.events += ok ? 0.3 : -0.3; return ok ? `${lastName(N.p)} walks out through the barricades with two aides and a bullhorn and talks for twenty minutes. The pictures are extraordinary; the march becomes a rally.` : `${lastName(N.p)} is shouted down at the barricade and retreats to the motorcade. The clip runs all night.`; } },
      { key: 'police', label: 'Let the police handle it', sub: 'Keep the program on schedule and hope.', apply: () => { const ok = Math.random() < 0.55; C.parts.events += ok ? 0.1 : -0.8; if (!ok) C.unity = Math.max(0.5, C.unity - 0.04); return ok ? 'The crowd thins by midnight and the story dies before the morning shows.' : `Tear gas drifts across the live shot during the keynote. “CHAOS IN ${C.city.toUpperCase()}” runs under every picture from the hall for the rest of the week.`; } },
      { key: 'slot', label: 'Give the march\'s leader a three-minute slot on stage', sub: 'The base cheers; the middle flinches.', apply: () => { C.unity = Math.min(1, C.unity + 0.1); C.parts.events -= 0.4; S.salience[top] = (S.salience[top] || 1) + 1; return `The organizer gets the loudest ovation of Night 2 and uses it to demand things that are not in the platform. Swing voters watching at home see a protest leader on the nominee's stage.`; } }] },
    { id: 'hotmic', title: 'A hot mic', text: (() => { const s = senOf(); return { s, t: `A hot mic catches Sen. ${s.name} (${s.state}) telling a reporter the nominee is “${pick(['a lightweight', 'the least bad option', 'a mannequin with a donor list', 'fine, I guess', 'going to lose and we all know it'])}.” It is the most-played clip of Night 1.` }; })(), choices: [
      { key: 'laugh', label: 'The nominee laughs it off', sub: 'A joke, delivered well, ends it. Delivered badly…', apply: ev => { const ok = convRoll(N.charisma); C.parts.events += ok ? 0.3 : -0.4; if (ok) C.unity = Math.min(1, C.unity + 0.02); return ok ? `${lastName(N.p)} opens Night 2 with “Senator ${lastName(ev.s)}, I've been called worse by better,” and the hall roars. The clip is dead by morning.` : `The joke is a beat late and a shade too bitter. Now there are two clips.`; } },
      { key: 'apology', label: 'Demand a public apology', sub: 'Discipline. The senator will not forget it.', apply: ev => { C.unity = Math.max(0.5, C.unity - 0.05); if (C.mine) ev.s.rel = (ev.s.rel || 0) - 1; convHist(ev.s, `Forced to apologize for an open-mic remark about ${N.name}`); return `Sen. ${lastName(ev.s)} reads a stiff apology from the podium on Night 2 that nobody believes, least of all Sen. ${lastName(ev.s)}.`; } },
      { key: 'bury', label: 'Bury it yourself', sub: 'Three favors with the network. 1 capital.', cost: 1, apply: ev => { if (C.mine) ev.s.rel = (ev.s.rel || 0) + 1; return `You call in three favors and the clip quietly disappears from the rotation. Sen. ${lastName(ev.s)} owes you, and knows it.`; } }] },
    { id: 'walkout', title: 'A faction threatens to walk', ok: () => C.planks.length > 0, text: `The ${losers} — some ${convNum(C.total * rnd(0.08, 0.16))} delegates — threaten to walk out of the hall over the ${TAG[(C.planks[0] || { tag: top }).tag][1]} plank. Their chair is giving interviews from the floor.`, choices: [
      { key: 'concede', label: 'Concede the plank', sub: 'Rewrite it their way tonight. Unity +10%.', apply: () => { const pl = C.planks[0]; if (pl) pl.dir = -pl.dir; C.unity = Math.min(1, C.unity + 0.1); C.parts.events -= 0.2; return `The platform committee reconvenes at 1 a.m. and the plank is rewritten. The ${losers} stay. The press calls it a cave; the delegates call it a party.`; } },
      { key: 'bluff', label: 'Call their bluff', sub: '60% they fold. 40% they walk, on camera.', apply: () => { const ok = Math.random() < 0.6; if (ok) { C.unity = Math.min(1, C.unity + 0.05); C.parts.events += 0.1; return `By morning the ${losers} are back in their seats, pretending the whole thing was a misunderstanding. Strength, noted.`; } C.unity = Math.max(0.5, C.unity - 0.15); C.parts.events -= 1; return `Two hundred ${losers} delegates walk out during the roll of the states with their signs held high. Every network splits the screen.`; } },
      { key: 'slot', label: 'Buy them off with a prime-time slot', sub: 'Their chair speaks at 9 p.m. Unity +8%, bounce −.', apply: () => { C.unity = Math.min(1, C.unity + 0.08); C.parts.events -= 0.3; return `Their chair gets twelve minutes at 9 p.m. and uses eleven of them to relitigate the primary. The hall is polite. The ratings dip.`; } }] },
    { id: 'endorse', title: 'A surprise endorsement', text: (() => { const q = other(p), f = pick((S.formers || []).filter(f => f.party === q)) || convMakePerson(q, null, null, MODERATE[q], ri(58, 72)); const was = f.cls != null ? 'senator' : f.terms ? 'governor' : f.from ? 'cabinet secretary' : (f.office || 'former governor').replace(/^Former /i, '').toLowerCase(); return { f, t: `${f.name}, a former ${PARTY[q].name} ${was} and a lifelong ${PARTY[q].short.replace(/s$/, '')}, calls the campaign: they want to endorse ${lastName(N.p)} from the stage.` }; })(), choices: [
      { key: 'prime', label: 'Give them prime time', sub: 'Crossover appeal. The base grumbles.', apply: ev => { C.parts.events += 0.8; C.unity = Math.max(0.5, C.unity - 0.05); convHist(ev.f, `Crossed party lines to endorse ${N.name} at the ${C.year} ${PARTY[p].name} convention`); return `${ev.f.name} walks onto a ${PARTY[p].name} stage to a stunned, then thunderous, reception: “My party left me. ${lastName(N.p)} did not.” Every undecided focus group in America watched it.`; } },
      { key: 'video', label: 'A taped video message', sub: 'Safe. Still a headline.', apply: ev => { C.parts.events += 0.4; convHist(ev.f, `Endorsed ${N.name} across party lines`); return `A tight two-minute video plays before the keynote. The endorsement leads the morning papers; the base barely notices.`; } },
      { key: 'decline', label: 'Politely decline', sub: 'No turncoats on our stage. Unity +.', apply: () => { C.unity = Math.min(1, C.unity + 0.03); return `The campaign thanks them and says the stage is full. The endorsement comes anyway, by press release, on a Friday.`; } }] },
    { id: 'balloons', title: 'The balloon drop fails', text: `At the dress rehearsal for the final night the balloon rig jams. A hundred thousand balloons hang in the nets above an empty stage while the producers scream into their headsets.`, choices: [
      { key: 'fix', label: 'Fly in a crew to re-rig it overnight', sub: 'It will work. 1 capital.', cost: 1, apply: () => { C.parts.events += 0.2; return `A crew from Las Vegas works until dawn. On Night 4 the drop is perfect, and the nominee's grandchildren disappear under a tide of red, white and blue.`; } },
      { key: 'wing', label: 'Let the stagehands improvise', sub: '60% it works. 40% the balloons pick their own moment.', apply: () => { const ok = Math.random() < 0.6; C.parts.events += ok ? 0.1 : -0.5; return ok ? `It works, mostly. A few hundred balloons stay in the rafters, which is a few hundred fewer than usual.` : `The balloons come down during the invocation on Night 4. The bishop keeps praying. The internet does not.`; } },
      { key: 'cancel', label: 'Cancel the drop; end on the speech', sub: 'Dignified. Slightly flat.', apply: () => `No balloons. The nominee waves from an empty stage as the music swells; it looks, one critic writes, “like the end of a very good TED talk.”` }] },
    { id: 'heckler', title: 'A heckler', ok: () => !!vp, text: `A heckler interrupts ${vpC().name}'s Night 2 speech, shouting about ${TAG[top][1].toLowerCase()} for a full minute before security reaches the aisle.`, choices: [
      { key: 'engage', label: `Let ${vpC().name} engage`, sub: 'A running mate who can handle a room, or not.', apply: () => { const ok = convRoll(vpC().charisma); C.parts.events += ok ? 0.5 : -0.4; return ok ? `“Sir, I'll be happy to debate you — right after I finish beating the other side.” The hall erupts, and the running mate just won the week.` : `${vpC().name} tries to argue the point, loses the thread, and finishes the speech to a half-empty hall of people looking at their phones.`; } },
      { key: 'remove', label: 'Have security remove them fast', sub: 'Order restored. Not a great picture.', apply: () => { C.parts.events -= 0.2; return `Four guards drag the heckler up the aisle while the band plays louder. The picture runs under “DISSENT” in the morning papers.`; } },
      { key: 'chant', label: 'Drown them out', sub: 'The floor whips chant the heckler into silence.', apply: () => { C.parts.events += 0.1; return `The state chairs start the chant and the hall finishes it. The heckler is still shouting, but nobody can hear a word, and the speech goes on.`; } }] },
    { id: 'leak', title: 'The vetting file leaks', ok: () => !!vp && !!C.vp, text: `Someone leaks the campaign's vetting file on ${vpC().name} to a cable network. Anchors are reading from it live.`, choices: [
      { key: 'stand', label: 'Stand by the pick', sub: 'Ride it out. Depends on what\'s in the file.', apply: () => { const r = C.vp.risk; C.vp.vetted = true; C.parts.events += r >= 0.55 ? -1 : r >= 0.25 ? -0.3 : 0.2; return r >= 0.55 ? `The file has ${C.vp.riskStory || (C.vp.riskStory = pick(CONV_RISKS))}, in detail, with documents. The campaign stands firm and the story runs for six days.` : r >= 0.25 ? `The file has ${C.vp.riskStory || (C.vp.riskStory = pick(CONV_RISKS))}. Awkward, survivable; the story fades by the weekend.` : `The file is boring: a parking ticket, an overdue library book and a fondness for karaoke. The leaker looks ridiculous and the running mate looks human.`; } },
      { key: 'swap', label: 'Swap the running mate', sub: 'Pick the next name on the list tonight. Unity −5%, bounce −.', apply: () => { const alt = C.vpField.filter(c => c !== C.vp).sort((a, b) => (b.pref ? 1 : 0) - (a.pref ? 1 : 0))[0]; if (!alt) return 'There is nobody else on the list; the campaign stands by the pick.'; const old = C.vp; convHist(old.p, `Dropped from the ${PARTY[p].name} ticket after a vetting leak`); C.unity = Math.max(0.5, C.unity - 0.05); C.parts.events -= 0.5; C.lines.push(`Swapped running mates after a leak: ${alt.name} in, ${old.name} out`); N.vp = { name: alt.name, state: alt.state, faction: alt.faction, office: alt.office, charisma: alt.charisma, risk: alt.risk }; if (alt.id != null) N.vp.id = alt.id; C.vp = alt; C.parts.vp = convVPValue(C, alt); convHist(alt.p, `Chosen as ${N.name}'s running mate after ${old.name} was dropped`); return `${old.name} is off the ticket by 2 a.m.; ${alt.name} is on it by breakfast. The networks call it chaos. The campaign calls it decisiveness.`; } },
      { key: 'hunt', label: 'Hunt the leaker', sub: 'Your people find things. 1 capital.', cost: 1, apply: () => { const ok = Math.random() < 0.5; if (ok) { C.unity = Math.max(0.5, C.unity - 0.08); C.parts.events += 0.1; return `It was a staffer for ${N.runnerUp ? lastName(N.runnerUp.p || { name: N.runnerUp.name }) : 'a rival campaign'}. You leak that, too. The story becomes the leak, not the file.`; } C.parts.events -= 0.3; return `Nothing. The leaker is a ghost, the file is still on television, and you spent a week's worth of favors on a dead end.`; } }] },
    { id: 'storm', title: 'A hurricane', text: `A Category 3 hurricane is bearing down on the ${pick(['Gulf Coast', 'Carolinas', 'Florida panhandle', 'Texas coast'])} as Night 2 opens. Pictures of boarded windows run next to pictures of the balloons.`, choices: [
      { key: 'cancel', label: 'Cancel the night', sub: 'Donate the airtime to relief. Lose a night of coverage.', apply: () => { C.parts.events -= 0.4; C.unity = Math.min(1, C.unity + 0.02); return `The hall goes dark for a night and the nominee tapes an appeal for the Red Cross. Respectful, responsible, and a night of free television gone.`; } },
      { key: 'carry', label: 'Carry on', sub: 'The show must go on. 50% nobody minds.', apply: () => { const ok = Math.random() < 0.5; C.parts.events += ok ? 0 : -1; return ok ? `The storm weakens before landfall and the program runs as planned. Nobody remembers the dilemma by Night 3.` : `The storm makes landfall during the Night 2 headliner; the split screen is confetti on one side and a flooded hospital on the other. “Tone-deaf” trends by 11 p.m.`; } },
      { key: 'go', label: 'Send the nominee to the storm zone', sub: 'Skip a night. Lead the news instead.', apply: () => { C.parts.events += 0.6; convHist(N.p, 'Left the convention to tour a hurricane zone'); return `${lastName(N.p)} is in a shelter handing out water bottles by midnight. The hall watches it on the big screen and cheers; the pictures lead every newscast in America.`; } }] },
    { id: 'viral', title: 'A viral speech', text: (() => { const code = pick(STATES)[0], r = newPerson(p, code, { age: ri(31, 44) }); r.faction = pick(FACTIONS[p])[0]; r.district = districtOf(code); r.star = true; return { r, t: `${r.name}, a ${ageOf(r)}-year-old state legislator from ${r.hometown}, ${ST[code].name}, running for an open House seat, turns a four-minute slot on Night 1 into the speech of the week. By morning the clip has ${ri(30, 90)} million views.` }; })(), choices: [
      { key: 'tour', label: 'Put them on the ticket\'s road show', sub: 'A new face for the fall. Bounce +.', apply: ev => { C.parts.events += 0.5; convAddRep(ev.r, C); return `${ev.r.name} joins the ticket's bus tour and draws bigger crowds than the running mate. A star for the fall, and a headache for whoever has to introduce them.`; } },
      { key: 'warmup', label: 'Make them the warm-up for the big speech', sub: 'Night 4, 9 p.m. Bounce +.', apply: ev => { C.parts.events += 0.4; convAddRep(ev.r, C); return `${ev.r.name} introduces the nominee on Night 4 and the hall is already on its feet when ${lastName(N.p)} walks out.`; } },
      { key: 'ignore', label: 'Nice speech. Move on.', sub: 'They will be fine without you.', apply: ev => { C.parts.events += 0.2; convAddRep(ev.r, C); return `The campaign shrugs. ${ev.r.name} is on every Sunday show anyway and will be in Congress by January.`; } }] },
    { id: 'security', title: 'A security scare', text: `Secret Service agents rush the nominee off the stage during the Night 3 walkthrough after a drone is spotted over ${C.hall}. The hall is cleared; the networks go wall to wall.`, choices: [
      { key: 'dark', label: 'Go dark until it is cleared', sub: 'Safe. A lost evening.', apply: () => { C.parts.events -= 0.5; return `Two hours of empty-podium television and a press conference by a deputy director. The drone belonged to a wedding photographer.`; } },
      { key: 'resume', label: 'Resume in twenty minutes', sub: '85% calm under pressure. 15% a second drone.', apply: () => { const ok = Math.random() < 0.85; C.parts.events += ok ? 0.1 : -0.6; return ok ? `The program restarts with the band playing louder and the nominee waving from the stage. “Unshaken,” says the chyron.` : `A second drone. The hall is cleared again, for the night, and the Night 3 program runs at 11 p.m. to nobody.`; } },
      { key: 'speak', label: 'Have the nominee address it from the podium', sub: 'A moment, if they can hold the room.', apply: () => { const ok = convRoll(N.charisma); C.parts.events += ok ? 0.4 : -0.3; return ok ? `${lastName(N.p)} walks back out alone: “They can clear the hall. They can't clear this country.” The line is on T-shirts by Night 4.` : `${lastName(N.p)} reads a statement that sounds like a statement. The moment passes.`; } }] },
    { id: 'donor', title: 'A donor scandal', text: `The host committee's biggest donor, a ${pick(['crypto billionaire', 'casino magnate', 'private-prison executive', 'hedge fund founder', 'pharmaceutical heir'])} who paid for the stage, is indicted on Night 2.`, choices: [
      { key: 'return', label: 'Return the money', sub: 'Clean hands. The committee is broke.', apply: () => { C.parts.events -= 0.1; C.unity = Math.min(1, C.unity + 0.05); return `The committee wires back ${ri(4, 12)} million dollars it does not have and cancels the Night 3 fireworks. The press notes the honor; the vendors note the IOUs.`; } },
      { key: 'keep', label: 'Keep it and say nothing', sub: '50% it fades. 50% it does not.', apply: () => { const ok = Math.random() < 0.5; if (ok) { C.parts.events += 0.1; return `A two-day story. By Night 4 nobody can remember the donor's name.`; } C.parts.events -= 0.8; if (C.mine) S.mood = clamp(S.mood - 0.5, -15, 15); return `The indictment names the stage, the balloons and the nominee's hotel suite. “BOUGHT AND PAID FOR,” says the other side's ad, which is on the air before the balloons.`; } },
      { key: 'blame', label: 'Blame the host committee', sub: 'Throw the locals under the bus.', apply: () => { C.parts.events -= 0.3; return `The campaign says it had no idea who paid for what, which is true and sounds false. The mayor of ${C.city} stops returning calls.`; } }] },
    { id: 'prompter', title: 'The teleprompter dies', text: `The teleprompter dies ${pick(['six minutes into', 'halfway through', 'at the climax of'])} the Night 2 headline speech. ${vpC().name} is staring at a blank screen in front of twenty million people.`, choices: [
      { key: 'adlib', label: 'Ad-lib', sub: 'Talent shows. So does its absence.', apply: () => { const ok = convRoll(vpC().charisma); C.parts.events += ok ? 0.8 : -1; return ok ? `${vpC().name} shrugs, puts the pages down and talks for fourteen minutes from the heart. It is the best speech of the week and the one everyone remembers.` : `${vpC().name} repeats the last line three times, thanks the wrong state and finishes four minutes early. The pundits are merciless.`; } },
      { key: 'reboot', label: 'Pause and reboot', sub: 'Ninety seconds of dead air.', apply: () => { C.parts.events -= 0.3; return `Ninety seconds of a running mate smiling at nothing while a technician crawls across the stage. Memes by midnight.`; } },
      { key: 'paper', label: 'Hand over the paper copy', sub: 'Heads down, read it out.', apply: () => `An aide sprints out with a binder. ${vpC().name} reads the rest with their head down. Nobody notices, which is the point.` }] },
    { id: 'rules', title: 'A floor fight over the rules', text: `${N.runnerUp && N.runnerUp.name !== N.name ? `${N.runnerUp.name}'s delegates` : `The ${convFlank(p)} delegates`} force a floor vote on the rules, demanding ${pick(['a roll call on the running mate', 'an end to superdelegates', 'a minority report on the platform', 'open nominations from the floor'])}. The chair is losing control of the gavel.`, choices: [
      { key: 'concede', label: 'Give in', sub: 'Unity +8%. Weakness −.', apply: () => { C.unity = Math.min(1, C.unity + 0.08); C.parts.events -= 0.3; return `The rules change passes on a voice vote and the insurgents claim victory. The nominee's team spends the night rewriting the Night 3 script.`; } },
      { key: 'ram', label: 'Ram it through on a voice vote', sub: 'Unity −10%. The chair hears what the chair wants.', apply: () => { C.unity = Math.max(0.5, C.unity - 0.1); C.parts.events += 0.1; return `“The ayes have it,” says the chair, over a roar of nays, and bangs the gavel through the boos. Order, of a kind.`; } },
      { key: 'deal', label: 'Cut a deal in the back room', sub: 'Everyone gets something. 1 capital.', cost: 1, apply: () => { C.unity = Math.min(1, C.unity + 0.1); return `You spend an hour in a freight elevator with three state chairs and a lawyer. The motion is withdrawn, two people get committee seats, and nobody ever learns why.`; } }] },
    { id: 'rival', title: 'The other side\'s counter-programming', ok: () => C.mine, text: `The opposing whip, Sen. ${S.rival}, parks a “truth squad” press conference across the street from ${C.hall} every night at 6 p.m., with a different disgruntled ${party.slice(0, -1)} at the microphone each time.`, choices: [
      { key: 'ignore', label: 'Ignore it', sub: 'Never punch down.', apply: () => `The truth squad plays to a shrinking pack of bored reporters. By Night 3 the cameras have stopped coming.` },
      { key: 'respond', label: 'Send the nominee\'s sharpest surrogate', sub: 'Fight fire with fire, on their turf.', apply: () => { const ok = Math.random() < 0.55; C.parts.events += ok ? 0.3 : -0.3; return ok ? `Your surrogate crashes the presser, takes the questions and leaves with the cameras. Sen. ${S.rival} is not amused.` : `The shouting match across the street becomes the story. Two whips yelling in a parking lot is not the convention anyone planned.`; } },
      { key: 'oppo', label: 'Drop some opposition research', sub: 'A story about Sen. ' + S.rival + '. 1 capital.', cost: 1, apply: () => { C.parts.events += 0.3; return `A story about Sen. ${S.rival}'s travel expenses lands on Night 2 and the truth squad spends Night 3 answering questions about it.`; } }] },
  ];
  return pool.filter(e => !e.ok || e.ok());
}
function convAddRep(r, C) {
  S.reps = S.reps || [];
  hist(r, `Worked as ${r.background}`, C.year - ri(8, 16)); hist(r, `Elected to the ${ST[r.state].name} State House`, C.year - ri(2, 8));
  hist(r, `Won the ${PARTY[r.party].name} nomination for an open House seat (${r.district})`, C.year); hist(r, `Electrified the ${C.year} ${PARTY[r.party].name} National Convention with a viral speech`, C.year);
  S.reps.push(r);
  if (S.reps.length > 24) { const i = S.reps.findIndex(x => !x.star); if (i >= 0) S.reps.splice(i, 1); }
  C.lines.push(`A new star: ${r.name} (${r.state})`);
}
function convPickEvent(C) {
  const pool = convEventPool(C).filter(e => !C.events.some(x => x.id === e.id));
  const e = pick(pool); if (!e) return null;
  // text generators that also pick a person return { x, t }
  const ev = { id: e.id, title: e.title, choices: e.choices, data: {} };
  if (typeof e.text === 'object') { ev.text = e.text.t; ev.data = e.text; } else ev.text = e.text;
  C.events.push(ev); return ev;
}
function convEventScreen(C, next) {
  const ev = convPickEvent(C); if (!ev) return next();
  const night = C.evDone === 0 ? 'Night 2' : 'Night 3';
  let result = null, chosen = null;
  const draw = () => {
    convShow(`<div class="kicker">${convKicker(C, 'Breaking news')}</div><h2>${night} · ${ev.title}</h2>${convHallHTML(C)}
      <div class="conv-event"><p>${ev.text}</p></div>
      ${result ? `<div class="conv-result" style="border-color:${PARTY[C.p].color}"><b>${chosen.label}.</b> ${result}</div>${convUnityHTML(C.unity)}<div class="choices"><button class="btn primary big adv" id="convevgo">Continue</button></div>`
        : `<div class="choices">${ev.choices.map(c => `<button class="btn" data-choice="ev:${c.key}" ${c.cost && S.career.capital < c.cost ? 'disabled' : ''}><span>${c.label}<small>${c.sub}</small></span></button>`).join('')}</div>`}`);
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice^="ev:"]').forEach(b => b.onclick = () => { if (result) return; const c = ev.choices.find(x => x.key === b.dataset.choice.slice(3)); if (!c) return; if (c.cost) { if (S.career.capital < c.cost) return; S.career.capital -= c.cost; } chosen = c; result = c.apply(ev.data); C.lines.push(`${ev.title}: ${c.label.toLowerCase()}`); C.evDone++; sfx.click(); draw(); });
    if ($('#convevgo')) $('#convevgo').onclick = next;
  };
  draw();
}
// the other party resolves its events without you
function convAutoEvent(C) {
  const ev = convPickEvent(C); if (!ev) return null;
  const c = pick(ev.choices.filter(x => !x.cost)) || ev.choices[0];
  const result = c.apply(ev.data); C.lines.push(`${ev.title}: ${c.label.toLowerCase()}`); C.evDone++;
  return { ev, c, result };
}

/* ---------------- the opening and the wrap ---------------- */
function convStakes(C) {
  const P = C.P, N = C.N, mood = convMoodOf(C.p), sen = seats(C.p);
  if (C.isPres) return `At stake: a second term. ${presTitle()} stands at ${P.approval}% approval${P.approval >= 50 ? ', a number an incumbent can win on' : P.approval >= 44 ? ', which is survivable with the right fall' : ', and no President has been re-elected from there without a miracle'}; the ${PARTY[C.p].short} hold ${sen} Senate seats.`;
  if (C.holdsWH) { const streak = S.whStreak || 1; return `At stake: holding the White House without the incumbent. ${presTitle()} leaves office at ${P.approval}% approval, ${P.approval >= 50 ? 'an asset the ticket will lean on' : 'a weight the ticket must carry'}; ${streak >= 2 ? `the ${PARTY[C.p].short} are asking for a ${convNth(streak + 1)} straight term, which voters rarely grant` : 'voters have not kept one party in the West Wing for a third term since 1988'}.`; }
  return `At stake: taking back the White House from ${presTitle()}'s ${PARTY[C.q].short}${P.approval < 45 ? `, who are defending a President at ${P.approval}%` : P.approval >= 52 ? `, who are defending a popular President (${P.approval}%)` : ''}. The ${PARTY[C.p].short} hold ${sen} Senate seats and a mood that is ${convMoodWord(mood)} (${fmt(mood)}).`;
}
function convOpeningScreen(C, next) {
  const N = C.N, ru = N.runnerUp, ranked = (S.nominees.ranked || []);
  const delLine = N.contested ? `${N.name} arrives with <b>${convNum(N.del)}</b> pledged delegates, ${ru ? `${ru.name} with <b>${convNum(ru.del)}</b>, ` : ''}and <b>nobody</b> has the ${convNum(C.need)} it takes. The roll call on Night 2 will decide it.`
    : N.del >= C.total ? `${N.name} arrives with every one of the <b>${convNum(C.total)}</b> delegates. The roll call is a formality; the drama is everywhere else.`
      : `${N.name} arrives with <b>${convNum(N.del)}</b> pledged delegates, <b>${convNum(N.del - C.need)}</b> more than the ${convNum(C.need)} needed${ru ? `; ${ru.name}'s ${convNum(ru.del)} will be released on the first ballot` : ''}.`;
  showModal(`<div class="kicker">${convKicker(C, 'Day 1')}</div><h2>${C.month === 'late July' ? 'Late July' : 'August'} · The gavel falls in ${C.city}</h2>${convHallHTML(C, true)}
    <div class="conv-nominee">${portrait(N.p)}<div><small>${N.contested ? 'Delegate leader' : 'Presumptive nominee'}</small><b>${N.name}</b><span>${N.office} · ${N.faction} · ${N.state}${ranked.includes(N.name) ? ' · <span style="color:var(--gold2)">your candidate in the primaries</span>' : ''}</span></div></div>
    <p>${delLine}</p>
    <div class="conv-delbar"><i style="width:${Math.min(100, N.del / C.total * 100)}%;background:${PARTY[C.p].color}"></i>${ru ? `<i style="width:${Math.min(100, ru.del / C.total * 100)}%;background:var(--gold)"></i>` : ''}<b class="conv-need" style="left:50%"></b></div>
    <div class="conv-facts"><div class="conv-fact"><small>Party mood</small><b style="color:${convMoodOf(C.p) >= 0 ? 'var(--yes)' : 'var(--no)'}">${fmt(convMoodOf(C.p))} · ${convMoodWord(convMoodOf(C.p))}</b></div>${C.holdsWH ? `<div class="conv-fact"><small>${presTitle()}'s approval</small><b style="color:${C.P.approval >= 50 ? 'var(--yes)' : 'var(--no)'}">${C.P.approval}%</b></div>` : ''}<div class="conv-fact"><small>Delegates</small><b>${convNum(C.total)} · ${convNum(C.need)} to win</b></div><div class="conv-fact"><small>Unity going in</small><b>${Math.round(C.unity * 100)}% · ${convUnityWord(C.unity)}</b></div></div>
    <p>${convStakes(C)}</p>
    <p style="color:var(--dim);font-size:12px">Four nights: ${N.contested ? 'the roll call, ' : ''}the running mate, the platform, the keynote and the acceptance speech. Every choice moves the party's unity and the bounce the ticket takes into the fall.</p>
    <div class="choices"><button class="btn primary big adv" id="convopengo">Call the convention to order</button></div>`);
  $('#convopengo').onclick = () => { if (C.mine) sfx.gavel(); next(); };
}
function convHeadline(C) {
  const N = C.N, who = lastName(N.p).toUpperCase(), vp = N.vp ? lastName({ name: N.vp.name }).toUpperCase() : null, party = PARTY[C.p].short.toUpperCase();
  if (C.brokered) return `UPSET IN ${C.city.toUpperCase()}: ${who} TAKES THE NOMINATION ON THE ${convNth(C.ballotCount || 2).toUpperCase()} BALLOT`;
  if (C.unity < 0.68) return `DIVIDED ${party} LEAVE ${C.city.toUpperCase()}`;
  if (C.N.contested) return `${who} SURVIVES THE FLOOR${vp ? `, PICKS ${vp}` : ''}`;
  if (C.isPres) return C.bounce >= 2.5 ? `FOUR MORE YEARS: ${who} RENOMINATED TO A ROAR` : C.bounce >= 1 ? `${who} RENOMINATED AS ${party} RALLY IN ${C.city.toUpperCase()}` : `${who} RENOMINATED; ${party} LOOK FOR A SPARK`;
  if (C.bounce >= 4 && C.unity >= 0.88) return `A CORONATION IN ${C.city.toUpperCase()}`;
  if (C.bounce < 1) return `${who} ACCEPTS; ${party} LEAVE ${C.city.toUpperCase()} FLAT`;
  return `${who} ACCEPTS NOMINATION${vp ? `, PICKS ${vp}` : ''}`;
}
function convWrapScreen(C, next) {
  const N = C.N, before = convMargin();
  C.bounce = convBounce(C);
  convStore(C);
  const after = convMargin(), cap1 = s => s.charAt(0).toUpperCase() + s.slice(1);
  const body = [
    `${C.city} — ${N.name} accepted the ${PARTY[C.p].name} nomination for President on the final night of a convention that leaves the party ${convUnityWord(C.unity)}${N.vp ? `, with ${N.vp.name} (${convOfficeAt(N.vp.office, N.vp.state)}) as the running mate` : ''}. ${C.speech ? C.speech.text.replace(/<[^>]+>/g, '') : ''}`,
    `The platform ${C.planks.length ? `calls for ${C.planks.map(pl => `${pl.dir > 0 ? 'more' : 'less'} on ${TAG[pl.tag][1].toLowerCase()}`).join(', ')}` : 'says as little as possible'}; the campaign will run on ${TAG[C.theme][1].toLowerCase()}. ${C.keynote ? `${cap1(C.keynote.name)} delivered the keynote.` : ''}`,
    `The first post-convention poll gives the ticket a <b>${C.bounce >= 0 ? '+' : ''}${C.bounce.toFixed(1)}-point</b> bounce${C.bounce >= 4 ? ', the best since the networks started counting' : C.bounce <= 0 ? ', which is to say none' : ''}.${(l => l.length ? ' ' + l.join('. ') + '.' : '')(C.events.map((ev, i) => `${ev.title}: ${(C.lines.find(x => x.startsWith(ev.title + ': ')) || '').slice(ev.title.length + 2)}`).filter(x => !x.endsWith(': ')).slice(0, 2))}`,
  ];
  showModal(`${frontPage({ headline: convHeadline(C), sub: `${PARTY[C.p].short} ${C.unity >= 0.8 ? 'leave united' : 'leave with scars'}; the race for the White House is ${Math.abs(after) < 3 ? 'a dead heat' : after > 0 ? 'yours to lose' : 'theirs to lose'}.`, body, mood: C.bounce >= 2 ? 'dawn' : 'night', date: `${C.month === 'late July' ? 'July' : 'August'} ${C.year} · Convention edition` })}
    <div class="kicker">${convKicker(C, 'The bounce')}</div><h2>The morning after</h2>
    <div class="conv-bounce"><div class="conv-bnum"><small>The bounce</small><b style="color:${C.bounce >= 3 ? 'var(--yes)' : C.bounce >= 1 ? 'var(--gold2)' : 'var(--no)'}">${C.bounce >= 0 ? '+' : ''}${C.bounce.toFixed(1)}</b><span>net national points</span></div>
      <div class="conv-bparts">${[['Unity', (C.unity - 0.75) * 4], ['Speech', C.parts.speech], ['Keynote', C.parts.keynote], ['Running mate', C.parts.vp], ['Platform', C.parts.platform], ['Events', C.parts.events], ['Roll call', C.parts.ballots]].filter(x => Math.abs(x[1]) >= 0.05).map(([l, v]) => `<span style="color:${v >= 0 ? 'var(--yes)' : 'var(--no)'}">${l} ${v >= 0 ? '+' : ''}${v.toFixed(1)}</span>`).join('')}</div></div>
    ${convPollHTML(before, after, 'National poll · before and after the convention')}
    ${convUnityHTML(C.unity)}
    ${convTicketHTML(C)}
    ${C.mine && C.bounce >= 5 ? '<p style="color:var(--gold2)"><b>🎈 Balloon Drop:</b> a bounce of five or more.</p>' : C.mine && C.bounce >= 3 ? '<p style="color:var(--gold2)">A bounce of three or more: +5 legacy.</p>' : ''}
    <div class="choices"><button class="btn primary big adv" id="convwrapgo">${C.month === 'late July' ? `On to the ${PARTY[C.q].name} convention` : 'Back to the Senate'}</button></div>`);
  if (N.vp && C.vp) convHist(C.vp.p, `Accepted the ${PARTY[C.p].name} nomination for Vice President in ${C.city}`);
  if (C.mine) sfx.fanfare();
  $('#convwrapgo').onclick = next;
}

/* ---------------- your party's convention ---------------- */
function convMine(p, month, next) {
  const C = convState(p, month);
  const steps = [
    n => convOpeningScreen(C, n),
    n => (C.N.contested && C.N.runnerUp ? convRollCall(C, n) : n()),
    n => convVPScreen(C, n),
    n => convPlatformScreen(C, n),
    n => convEventScreen(C, n),
    n => (C.nEvents > 1 ? convEventScreen(C, n) : n()),
    n => convPrimeTimeScreen(C, n),
    n => convWrapScreen(C, n),
  ];
  const run = i => { if (i >= steps.length) return next(); steps[i](() => run(i + 1)); };
  run(0);
}

/* ---------------- the other party's convention: a watch-only report ---------------- */
function convTheirs(p, month, next) {
  const C = convState(p, month);
  const N0 = C.N, unity0 = C.unity, margin0 = convMargin(), rc = C.N.contested && C.N.runnerUp ? convAutoRollCall(C) : null;
  const N = C.N;
  // the running mate, weighted to the nominee's own preference
  C.vpField = convVPField(C);
  const pref = C.vpField.find(c => c.pref) || C.vpField[0];
  convPickVP(C, Math.random() < (C.isPres ? 0.92 : 0.7) ? pref : pick(C.vpField));   // a sitting President almost always keeps the Vice President
  // the platform: the nominee's wing writes it, with a few concessions
  const nomFx = (FACTIONS[p].find(f => f[0] === N.faction) || [0, {}])[1];
  C.plankDefs.forEach((d, i) => { const w = nomFx[d.tag] || 0, r = Math.random(); convSetPlank(C, i, r < 0.2 ? 'vague' : w === 0 ? (r < 0.6 ? 'flank' : 'center') : (sgn(w) === d.fdir) === (r < 0.75) ? 'flank' : 'center'); });
  C.theme = convDefaultTheme(C); C.lines.push(`Theme: ${TAG[C.theme][1]}`);
  const evs = [convAutoEvent(C)].filter(Boolean);
  const kopts = convKeynoteOptions(C), ko = pick(kopts), keyText = convKeynote(C, ko);
  const tone = pick(Object.keys(CONV_TONES)), speechText = convSpeech(C, tone);
  const show2 = () => {
    const before = convMargin(); C.bounce = convBounce(C); convStore(C); const after = convMargin();
    if (N.vp && C.vp) convHist(C.vp.p, `Accepted the ${PARTY[p].name} nomination for Vice President in ${C.city}`);
    showModal(`${frontPage({ headline: convHeadline(C), sub: `Across the aisle, the ${PARTY[p].short} ${C.unity >= 0.8 ? 'leave ' + C.city + ' united' : 'leave ' + C.city + ' with scars'}. First poll: a ${C.bounce >= 0 ? '+' : ''}${C.bounce.toFixed(1)} bounce for their ticket.`, body: [`${C.city} — ${N.name} accepted the ${PARTY[p].name} nomination${N.vp ? ` and named ${N.vp.name} (${convOfficeAt(N.vp.office, N.vp.state)}) as running mate` : ''}. ${speechText.replace(/<[^>]+>/g, '')}`, `${rc ? rc.replace(/<[^>]+>/g, '') + ' ' : ''}${keyText.replace(/<[^>]+>/g, '')}`, `Their platform: ${C.planks.map(pl => `${pl.dir > 0 ? 'more' : 'less'} on ${TAG[pl.tag][1].toLowerCase()}`).join(', ') || 'deliberately vague'}; their message is ${TAG[C.theme][1].toLowerCase()}. ${evs.length ? evs[0].ev.title + ': ' + evs[0].result.replace(/<[^>]+>/g, '') : ''}`], mood: 'night', date: `${month === 'late July' ? 'July' : 'August'} ${C.year} · Convention edition` })}
      <div class="kicker">${convKicker(C, 'The report card')}</div>
      <div class="conv-report">${convTicketHTML(C)}
        <div class="conv-rgrid">
          <div><small>Their bounce</small><b style="color:${C.bounce >= 3 ? 'var(--no)' : C.bounce >= 1 ? 'var(--gold2)' : 'var(--yes)'}">${C.bounce >= 0 ? '+' : ''}${C.bounce.toFixed(1)}</b></div>
          <div><small>Keynote</small><b>${C.keynote.name}</b></div>
          <div><small>Acceptance speech</small><b>${['Fell flat', 'Fine', 'Landed', 'A triumph'][C.speech.tier]} (${CONV_TONES[tone][0].toLowerCase()})</b></div>
          <div><small>Platform</small><b>${C.planks.map(pl => `${TAG[pl.tag][0]} ${pl.dir > 0 ? 'more' : 'less'}`).join(' · ') || 'vague'} · runs on ${TAG[C.theme][1]}</b></div>
          ${N.vp ? `<div><small>Running mate's vetting</small><b>${convRiskWord(N.vp.risk)}${N.vp.risk >= 0.55 ? ' · the opposition research writes itself' : ''}</b></div>` : ''}
          ${evs.length ? `<div style="grid-column:1/-1"><small>${evs[0].ev.title}</small><b>${evs[0].c.label}.</b> ${evs[0].result}</div>` : ''}
        </div>
        ${convUnityHTML(C.unity)}
        ${convPollHTML(before, after, 'National poll · before and after their convention')}</div>
      <div class="choices"><button class="btn primary big adv" id="convthgo">${month === 'late July' ? `On to the ${PARTY[other(p)].name} convention` : 'Back to the Senate'}</button></div>`);
    $('#convthgo').onclick = next;
  };
  const ru = N0.runnerUp;
  showModal(`<div class="kicker">${convKicker(C, 'Watching from across the aisle')}</div><h2>${month === 'late July' ? 'Late July' : 'August'} · The ${PARTY[p].short} gather in ${C.city}</h2>${convHallHTML(C, true)}
    <div class="conv-nominee">${portrait(N0.p)}<div><small>${N0.contested ? 'Their delegate leader' : 'Their presumptive nominee'}</small><b>${N0.name}</b><span>${N0.office} · ${N0.faction} · ${N0.state}</span></div></div>
    <p>${N0.contested ? `Nobody clinched: ${N0.name} brings ${convNum(N0.del)} delegates, ${ru ? `${ru.name} ${convNum(ru.del)}, ` : ''}and ${convNum(C.need)} wins. Their roll call will be real.` : N0.del >= C.total ? `${presTitle()} arrives with every delegate and a party that is ${convUnityWord(unity0)}.` : `${N0.name} arrives with ${convNum(N0.del)} delegates, ${convNum(N0.del - C.need)} to spare${ru ? `; ${ru.name} finished second with ${convNum(ru.del)}` : ''}.`}</p>
    <div class="conv-facts"><div class="conv-fact"><small>Their mood</small><b style="color:${convMoodOf(p) >= 0 ? 'var(--yes)' : 'var(--no)'}">${fmt(convMoodOf(p))} · ${convMoodWord(convMoodOf(p))}</b></div>${C.holdsWH ? `<div class="conv-fact"><small>${presTitle()}'s approval</small><b>${C.P.approval}%</b></div>` : ''}<div class="conv-fact"><small>Unity going in</small><b>${Math.round(unity0 * 100)}% · ${convUnityWord(unity0)}</b></div><div class="conv-fact"><small>${IND() ? `The ${PARTY.D.short}' margin today` : `Your ticket's margin today`}</small><b>${fmt(margin0)}</b></div></div>
    <p>${convStakes(C)}</p>
    <p style="color:var(--dim);font-size:12px">You have no delegates in this hall. Watch the coverage: their running mate, their platform and how big a bounce they take into the fall.</p>
    <div class="choices"><button class="btn primary big adv" id="convth1">Watch the coverage</button></div>`);
  $('#convth1').onclick = show2;
}
