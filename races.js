'use strict';
/* =====================================================================
   RACES — Senate primaries for every seat (fields, vote totals, endorse and run) and your involvement in individual Senate races. Defines senatePrimaries(E, done), raceCampaignAdj(rc), raceDetailBtn(rc, i), bindRaceDetails(card, draw).
   Every seat up gets a Democratic and a Republican primary: incumbents
   (challenged when game.js's challenge logic says so), open fields of two
   to five drawn from mayors, House members, former senators and state
   officials, runoffs in the South, raw vote totals for every race. You
   endorse up to three in your party and plan their campaigns; you may
   quietly back one in theirs. On the Senate trail every race has a race
   room: nominees, the state, a poll trend and things you can do there.
   ===================================================================== */

const RS_CAL = [['March', ['AL', 'AR', 'IL', 'MS', 'NC', 'TX']], ['May', ['GA', 'ID', 'IN', 'KY', 'NE', 'OH', 'OR', 'PA', 'WV']], ['June', ['CA', 'CO', 'IA', 'ME', 'MD', 'MT', 'NV', 'NJ', 'NM', 'NY', 'ND', 'OK', 'SC', 'SD', 'UT', 'VA']], ['August', ['AK', 'AZ', 'CT', 'FL', 'HI', 'KS', 'MI', 'MN', 'MO', 'TN', 'VT', 'WA', 'WI', 'WY']], ['September', ['DE', 'LA', 'MA', 'NH', 'RI']]];
const RS_RUNOFF = ['AL', 'AR', 'GA', 'MS', 'OK', 'SC', 'TX'];
const RS_COLORS = ['#f59e0b', '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fb7185', '#facc15'];
const RS_SD = 0.3; // per-candidate election-day noise (log scale)
const RS_FLANKS = ['Progressives', 'Freedom Caucus'];
// [office, quality 0..1, extra $M, elected?, background]
const RS_OFFICES = [
  [s => `${s.name} Attorney General`, 0.8, 0, 1], [s => `Lieutenant Governor of ${s.name}`, 0.75, 0, 1], [s => `${s.name} Secretary of State`, 0.6, 0, 1],
  [s => `${s.name} State Treasurer`, 0.5, 0, 1], [s => `U.S. Representative (${districtOf(s.code)})`, 0.8, 1, 1], [s => `${s.name} State Senator`, 0.45, 0, 1],
  [s => `${s.name} State Representative`, 0.3, 0, 1], [(s, p) => `Mayor of ${p.hometown}`, 0.6, 0, 1], [s => `${pick(HOMETOWNS[s.code] || [s.name])} County Commissioner`, 0.3, 0, 1],
  [(s, p) => p.gender === 'f' ? 'Self-funding businesswoman' : 'Self-funding businessman', 0.45, 5, 0, 'a startup founder'], [() => pick(['Retired Army colonel', 'Marine Corps veteran', 'Former Navy pilot', 'Retired Air Force general']), 0.55, 0, 0, 'an Army officer'],
  [s => `Former ${s.name} Supreme Court justice`, 0.5, 0, 0, 'a state Supreme Court clerk'], [() => 'Local TV news anchor', 0.5, 0, 0, 'a TV news anchor'], [() => 'Former college football coach', 0.6, 1, 0, 'a football coach'],
  [() => 'Surgeon and hospital executive', 0.5, 3, 0, 'an emergency room doctor'], [() => 'Megachurch pastor', 0.35, 0, 0, 'a pastor'],
];
const RS_GADFLY = ['Perennial candidate', 'Retired schoolteacher', 'Long-haul trucker', 'Activist and podcaster', 'Retired machinist', 'Crypto entrepreneur'];
const RS_OPPO = ['missed 41% of the votes in their last job', 'a lobbying contract nobody had heard of', 'a 2014 bankruptcy and three unpaid contractors', 'a homestead exemption on a house in another state', 'a decade-old blog full of things they would rather not explain', 'stock trades timed suspiciously well', 'a résumé that promoted them twice', 'campaign money spent at a golf resort'];
const RS_DEBATE = { win: ['owned the stage from the opening answer', 'turned the moderator\'s toughest question into a closing argument', 'landed the line every station replayed at eleven', 'had a number for everything and a story for every number'], lose: ['froze on a question about the state\'s biggest employer', 'got caught reading a talking point off a card', 'lost a fight with the moderator and the room', 'answered a question about farm prices with a speech about Washington'] };
let RS_LIVE = null; // the primary season on screen (never saved)

/* ---------------- small helpers ---------------- */
const rsN = v => Math.round(v).toLocaleString('en-US');
const rsP = v => v.toFixed(1) + '%';
const rsF = v => (v > 0.04 ? '+' : v < -0.04 ? '−' : '±') + Math.abs(v).toFixed(1);
const rsKey = rc => rc.m.state + ':' + rc.m.cls;
const rsMonth = code => (RS_CAL.find(c => c[1].includes(code)) || ['September'])[0];
const rsAdv = (p, code) => (p === 'R' ? 1 : p === 'D' ? -1 : 0) * ST[code].lean;
const rsFx = (p, f) => (FACTIONS[p].find(x => x[0] === f) || [0, {}])[1];
const rsDead = f => (f.history || []).some(h => /Died/.test(h.t));
const rsYours = c => c.party === S.side && c.faction === S.myFaction;
const rsLeanLabel = code => { const l = ST[code].lean; return l === 0 ? 'EVEN' : (l > 0 ? 'R+' : 'D+') + Math.abs(l); };
function rsProbit(p) { // inverse normal CDF (Abramowitz–Stegun 26.2.23)
  const q = p < 0.5 ? p : 1 - p, t = Math.sqrt(-2 * Math.log(q)), x = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  return p < 0.5 ? -x : x;
}
function rsTerms(m) { return (m.history || []).filter(h => /(Elected|Re-elected) to the U\.S\. Senate/.test(h.t)).length; }
const rsNth = m => rsTerms(m) ? rsOrd(rsTerms(m) + 1) : 'first full';
function rsSince(m) { const h = (m.history || []).find(x => /Elected to the U\.S\. Senate|Appointed to the U\.S\. Senate/.test(x.t)); return h ? h.y : currentYear() - 6; }
const rsOrd = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
// a primary electorate's favorite factions: the ones whose issues fit the state, the flank in safe seats, the cross-pressured wing in hostile ones
function rsFaction(p, code, taken = []) {
  const adv = rsAdv(p, code), w = FACTIONS[p].map(([f, fx]) => {
    let x = Math.exp(0.5 * clamp(stateFit(code, fx), -3, 3));
    if (f === CROSS[p]) x *= adv < -4 ? 2.2 : adv < 4 ? 0.8 : 0.15;
    x *= Math.pow(0.35, taken.filter(t => t === f).length); // crowded lanes thin out
    if (f === MODERATE[p]) x *= adv < 4 ? 1.6 : 0.6;
    if (RS_FLANKS.includes(f)) x *= adv > 8 ? 1.8 : adv < 0 ? 0.6 : 1;
    return x;
  });
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) <= 0) return FACTIONS[p][i][0];
  return FACTIONS[p][0][0];
}
function rsPerson(p, code, o = {}) {
  const g = o.name ? (NAMES_F.includes(o.name.split(' ')[0]) ? 'f' : 'm') : null;
  const per = newPerson(p, code, { age: ri(36, 68), gender: g });
  if (o.name) per.name = o.name;
  per.faction = o.faction || rsFaction(p, code, o.taken);
  return per;
}

/* ---------------- who runs ---------------- */
// one party's primary for one seat; `used` keeps names unique across the season
function rsPrimary(rc, i, p, used) {
  const m = rc.m, code = m.state, s = ST[code], yr = currentYear();
  const P = { i, party: p, code, cls: m.cls, label: rsMonth(code), field: [], plan: null, rec: null, winner: null, rc };
  const add = (per, office, q, cash = 0, extra = {}) => {
    if (!per || !per.name || (!extra.inc && used.has(per.name))) return null; used.add(per.name);
    if (!per.party) per.party = p;
    if (!per.faction) per.faction = rsFaction(p, code, P.field.map(c => c.faction));
    const c = { name: per.name, p: per, party: p, office, faction: per.faction, ch: clamp(rnd(0.72, 0.95) + q * 0.35, 0.6, 1.35), cash: Math.max(1, Math.round(rnd(1, 2.5) + q * 3 + cash)), inc: false, k: 1, color: RS_COLORS[P.field.length % RS_COLORS.length], ...extra };
    P.field.push(c); return c;
  };
  const gen = (qCap = 1, gadfly = false, o = {}) => {
    const taken = P.field.map(c => c.faction);
    let per = rsPerson(p, code, { ...o, taken }); while (used.has(per.name)) per = rsPerson(p, code, { faction: o.faction, taken });
    hist(per, `Worked as ${per.background}`, yr - ri(10, 24));
    if (gadfly) return add(per, pick(RS_GADFLY), 0.02, -2);
    const pool = RS_OFFICES.filter(x => x[1] <= qCap + 0.05 && (!o.strong || x[1] >= 0.45)), [fo, q, cash, elected, bg] = pick(pool.length ? pool : RS_OFFICES);
    const office = fo(s, per);
    if (elected) hist(per, `Elected ${office.replace(/^U\.S\. Representative \((.+)\)$/, 'to the U.S. House ($1)')}`, yr - ri(2, 9)); else if (bg) per.background = bg;
    return add(per, office, Math.min(q, qCap) + (o.strong ? 0.15 : 0), cash + (o.strong ? 1 : 0));
  };
  if (m.party === p && !rc.retiring) {
    const inc = add(m, `U.S. Senator since ${rsSince(m)}`, 0.8, 4, { inc: true, ch: clamp(1 + (m.rec || 0) * 0.02 + rnd(-0.05, 0.1), 0.85, 1.25) });
    if (rc.primary) {
      const ch = gen(1, false, { name: used.has(rc.primary.name) ? null : rc.primary.name, faction: rc.primary.faction, strong: true });
      if (Math.random() < 0.35) gen(1, true);
      rsCalibrate(P, inc, ch, clamp(rc.primary.odds * 0.56, 0.04, 0.45));
    } else if (Math.random() < 0.5) { const g = gen(1, true), sh = rnd(0.76, 0.9); if (g) { inc.k = 1; inc.k = rsStr(P, g, 'bare') / rsStr(P, inc, 'bare') * sh / (1 - sh); } }
    return P;
  }
  const hold = holderAdv(m), safeHolder = m.party !== p && m.party !== 'I' && !rc.retiring;
  const n = !safeHolder ? pick([2, 2, 3, 3, 3, 4, 4, 5]) : hold > 10 ? pick([1, 1, 2, 2, 3]) : hold > 4 ? pick([2, 2, 3, 3, 4]) : pick([2, 3, 3, 4, 5]);
  const qCap = safeHolder && hold > 10 ? 0.5 : 1, pool = [];
  (typeof localPrimaryPool === 'function' ? localPrimaryPool(p, code) || [] : []).forEach(x => x && x.p && pool.push([x.p, x.office, 0.65, 0]));
  (S.reps || []).filter(r => r.party === p && r.state === code).forEach(r => pool.push([r, `U.S. Representative (${r.district})`, 0.8, 1]));
  (S.formers || []).filter(f => f.party === p && f.state === code && f.cls && !rsDead(f) && ageOf(f) < 78 && Math.random() < 0.35).slice(0, 1).forEach(f => pool.push([f, 'Former U.S. Senator', 0.6, 1, { former: true }]));
  shuffle(pool);
  while (P.field.length < n && pool.length) { const [per, off, q, cash, ex] = pool.shift(); add(per, off, Math.min(q, qCap), cash, ex); }
  while (P.field.length < n) gen(qCap);
  return P;
}
// a challenged incumbent's edge is set so the challenger wins with probability q before networks, wings and your campaigns
function rsCalibrate(P, inc, ch, q) {
  if (!inc || !ch) return;
  inc.k = 1; inc.k = rsStr(P, ch, 'bare') / rsStr(P, inc, 'bare') * Math.exp(rsProbit(1 - q) * RS_SD * Math.SQRT2);
}

/* ---------------- the vote ---------------- */
// same-faction senators and the governor of the party campaign for their own in their state
function rsNet(c, code) {
  let n = S.members.filter(m => m.party === c.party && m.state === code && m.faction === c.faction && m.name !== c.name && !T(m, 'ambitious')).length;
  const g = S.governors && S.governors[code]; if (g && g.party === c.party && g.faction === c.faction && g.name !== c.name) n++;
  return 0.06 * Math.min(n, 2);
}
function rsPlanK(P, c, mode) {
  const pl = P.plan; if (!pl) return 1;
  let k = 1;
  if (pl.cand === c.name) k *= (pl.meddle ? 1.04 : 1.08) * (1 + 0.05 * pl.rally) * (1 + 0.2 * (1 - Math.exp(-pl.ads / 3))) * (1 + (pl.favor || 0)) * (mode === 'vote' && P.leak ? 0.9 : 1) * (mode === 'vote' && pl.attack && P.backfire ? 0.93 : 1);
  if (pl.attack === c.name) k *= mode === 'vote' ? (P.backfire ? 1.03 : 0.88) : 0.92;
  return k;
}
// mode: 'bare' (talent, money, fit), 'poll' (plus networks and your plan, expected), 'vote' (attacks resolved)
function rsStr(P, c, mode) {
  const code = P.code, adv = rsAdv(c.party, code), flank = RS_FLANKS.includes(c.faction), mod = c.faction === MODERATE[c.party] || c.faction === CROSS[c.party];
  const fit = clamp(stateFit(code, rsFx(c.party, c.faction)) * 0.05, -0.25, 0.3) + (adv > 6 ? (flank ? 0.12 : mod ? -0.06 : 0) : adv < -2 ? (mod ? 0.08 : flank ? -0.06 : 0) : 0);
  const s = c.ch * (1 + 0.3 * (1 - Math.exp(-c.cash / 4))) * (1 + fit) * c.k;
  if (mode === 'bare') return s;
  return Math.max(0.02, s * (1 + rsNet(c, code) + (typeof wingPrimaryBoost === 'function' ? wingPrimaryBoost(c) : 0)) * rsPlanK(P, c, mode));
}
function rsPoll(P) {
  const raw = P.field.map(c => rsStr(P, c, 'poll')), tot = raw.reduce((a, b) => a + b, 0) || 1, out = {};
  P.field.forEach((c, i) => out[c.name] = raw[i] / tot * 100);
  return out;
}
function rsTurnout(P) { const sh = clamp(0.5 - ST[P.code].lean / 70, 0.2, 0.8); return POP[P.code] * 1e6 * rnd(0.08, 0.15) * (P.party === 'D' ? sh : 1 - sh) * (P.field.length > 1 ? 1 : 0.6); }
function rsCount(P, cands, tv, bonus) {
  const raw = cands.map((c, i) => rsStr(P, c, 'vote') * (bonus && i === 0 ? bonus : 1) * Math.exp(gauss() * RS_SD)), tot = raw.reduce((a, b) => a + b, 0) || 1;
  const rows = cands.map((c, i) => ({ c, votes: Math.max(1, Math.round(tv * raw[i] / tot)) })).sort((a, b) => b.votes - a.votes), total = rows.reduce((a, r) => a + r.votes, 0);
  rows.forEach(r => r.pct = r.votes / total * 100);
  return { rows, total };
}
const rsRow = (r, poll) => ({ name: r.c.name, office: r.c.office, faction: r.c.faction, votes: r.votes, pct: +r.pct.toFixed(2), poll: +(poll[r.c.name] || 0).toFixed(1), inc: !!r.c.inc, color: r.c.color });
// how an incumbent's primary ended, in one clause: rounds and runoffs included
function rsIncLine(r) {
  const fin = (r.runoff || r).rows, w = fin[0], i1 = r.rows.find(x => x.inc), i2 = r.runoff && r.runoff.rows.find(x => x.inc);
  return `${w.name} ${rsP(w.pct)}${r.runoff ? ' in the runoff' : ''}, Sen. ${i1.name.split(' ').slice(1).join(' ')} ${rsP((i2 || i1).pct)}${r.runoff && !i2 ? ' (out in the first round)' : ''}`;
}
function rsRun(P) {
  const pl = P.plan;
  if (pl && pl.attack) P.backfire = Math.random() < 0.25;
  if (pl && pl.meddle) P.leak = Math.random() < 0.25;
  const poll = rsPoll(P), first = rsCount(P, P.field, rsTurnout(P));
  let run = null;
  if (first.rows.length >= 3 && first.rows[0].pct < 50 && RS_RUNOFF.includes(P.code)) run = rsCount(P, first.rows.slice(0, 2).map(r => r.c), first.total * rnd(0.5, 0.7), 1.06);
  const fin = (run || first).rows, w = fin[0].c, inc = P.field.find(c => c.inc), margin = fin[0].pct - (fin[1] ? fin[1].pct : 0);
  const fav = P.field.slice().sort((a, b) => poll[b.name] - poll[a.name])[0];
  P.winner = w;
  P.rec = { party: P.party, code: P.code, cls: P.cls, label: P.label, total: first.total, rows: first.rows.map(r => rsRow(r, poll)), runoff: run ? { total: run.total, rows: run.rows.map(r => rsRow(r, poll)) } : null,
    winner: w.name, fav: fav.name, margin: +margin.toFixed(2), unopp: P.field.length === 1, incLost: !!inc && w !== inc, upset: P.field.length > 1 && ((!!inc && w !== inc) || poll[w.name] < poll[fav.name] - 6), photo: P.field.length > 1 && margin < 2,
    endorsed: pl ? pl.cand : null, meddle: !!(pl && pl.meddle), leak: !!P.leak, backfire: !!P.backfire };
  return P.rec;
}

/* ---------------- the season ---------------- */
function rsBuild(E) {
  const used = new Set(S.members.map(m => m.name)), prims = [], mine = S.side;
  E.races.forEach((rc, i) => [mine, other(mine)].forEach(p => prims.push(rsPrimary(rc, i, p, used))));
  const nights = RS_CAL.map(([label, codes]) => ({ label, prims: prims.filter(P => codes.includes(P.code)), done: false })).filter(n => n.prims.length);
  return { E, prims, nights, night: 0, view: mine, sel: null, finished: false, lines: [] };
}
const rsOwnPlans = L => L.prims.filter(P => P.plan && !P.plan.meddle);
const rsMeddles = L => L.prims.filter(P => P.plan && P.plan.meddle);
function rsRunNight(L) {
  const N = L.nights[L.night]; if (!N) return null;
  N.prims.forEach(rsRun); N.done = true; L.night++;
  N.news = rsNews(N); N.head = rsHead(N);
  return N;
}
// the night's stories, most important first
function rsNews(N) {
  const out = [], mine = S.side, yr = currentYear(), sorted = N.prims.slice().sort((a, b) => (b.party === mine) - (a.party === mine));
  for (const P of sorted) {
    const r = P.rec, w = P.winner, st = stName(P.code), pn = PARTY[P.party].name, inc = P.field.find(c => c.inc), f = r.runoff ? r.runoff.rows : r.rows, s2 = f[1];
    const tag = `data-rsel="${P.i}:${P.party}"`;
    if (r.incLost) out.push([10, `<p ${tag}>🗡️ <b>Sen. ${inc.name} is out.</b> ${w.name} (${w.faction}) takes the ${st} ${pn} primary: ${rsIncLine(r)}${(inc.p.defy || 0) > 0 ? `; ${inc.p.defy} vote${inc.p.defy > 1 ? 's' : ''} against the party line came home to roost` : r.endorsed === w.name ? ', with your fingerprints all over it' : `, ${pick(['ending a career in a single night', 'the first incumbent in the state to lose a primary in a generation', 'and the caucus is already counting the cost'])}`}.</p>`]);
    else if (inc && P.field.length > 1 && r.rows.find(x => x.inc).pct < 60) out.push([6, `<p ${tag}>😰 Sen. ${inc.name} survives the ${st} ${pn} primary${r.runoff ? ` in a runoff, ${rsP(r.runoff.rows[0].pct)},` : `, ${rsP(r.rows.find(x => x.inc).pct)},`} against ${r.rows.find(x => !x.inc).name}: closer than anyone in the caucus wants to admit.</p>`]);
    if (r.endorsed && !r.meddle) out.push([9, `<p ${tag}>${r.endorsed === w.name ? `✅ <b>Your pick wins:</b> ${w.name} takes the ${st} ${pn} primary with ${rsP(f[0].pct)}${r.runoff ? ' in the runoff' : ''}${P.plan.attack && !r.backfire ? `, and the attack on ${P.plan.attack} did its job` : ''}.` : `❌ <b>Your pick loses:</b> ${r.endorsed} falls to ${w.name} in ${st}, ${rsP(f[0].pct)} to ${rsP((f.find(x => x.name === r.endorsed) || r.rows.find(x => x.name === r.endorsed)).pct)}${f.some(x => x.name === r.endorsed) ? '' : ' in the first round'}.`}</p>`]);
    if (r.meddle) out.push([8, `<p ${tag}>🕶️ ${r.endorsed === w.name ? `Your quiet money worked: ${w.name} is the ${pn} nominee in ${st}.` : `Your quiet money for ${r.endorsed} in ${st} bought nothing; ${w.name} won.`}${r.leak ? ' <b>And it leaked:</b> the winner thanked "our friends across the aisle" in a fundraising email.' : ''}</p>`]);
    if (r.runoff) out.push([5, `<p ${tag}>🔁 No one cleared 50% in ${st}: ${r.rows[0].name} (${rsP(r.rows[0].pct)}) and ${r.rows[1].name} (${rsP(r.rows[1].pct)}) went to a runoff, and ${w.name} won it ${rsP(r.runoff.rows[0].pct)} to ${rsP(r.runoff.rows[1].pct)}.</p>`]);
    if (r.upset && !r.incLost) out.push([7, `<p ${tag}>⚡ <b>Upset in ${st}:</b> ${w.name} (${w.office}) beat ${r.fav}, who led the final poll ${r.rows.find(x => x.name === r.fav).poll.toFixed(0)}% to ${r.rows.find(x => x.name === w.name).poll.toFixed(0)}%, for the ${pn} nomination.</p>`]);
    if (r.photo) out.push([4, `<p ${tag}>📸 ${st} ${pn}s: ${rsN(f[0].votes - s2.votes)} votes separate ${w.name} and ${s2.name}${r.margin < 0.5 ? '. A recount changed nothing' : ''}.</p>`]);
    if (w.former && !inc) out.push([5, `<p ${tag}>↩️ The comeback: former Sen. ${w.name} wins the ${st} ${pn} primary.</p>`]);
    if (/Self-funding/.test(w.office) && P.field.length > 1) out.push([3, `<p ${tag}>💸 ${w.name} spent a personal fortune and bought the ${st} ${pn} nomination with it.</p>`]);
    if (r.backfire) out.push([4, `<p ${tag}>💥 Your campaign's attack on ${P.plan.attack} in ${st} backfired.</p>`]);
  }
  return out.sort((a, b) => b[0] - a[0]).map(x => x[1]);
}
function rsHead(N) {
  const ps = N.prims, lost = ps.filter(P => P.rec.incLost), mine = ps.filter(P => P.rec.endorsed && !P.rec.meddle), ups = ps.filter(P => P.rec.upset && !P.rec.incLost), L = N.label.toUpperCase();
  const contested = ps.filter(P => P.field.length > 1).length, states = new Set(ps.map(P => P.code)).size;
  if (lost.length > 1) return { h: `${['TWO', 'THREE', 'FOUR', 'FIVE'][lost.length - 2] || lost.length} SENATORS FALL IN ${L} PRIMARIES`, s: lost.map(P => `Sen. ${lastName(P.field.find(c => c.inc))} (${P.party}-${P.code})`).join(', ') + ' lose to their own party\'s voters.', c: '#e3b54a' };
  if (lost.length) { const P = lost[0], inc = P.field.find(c => c.inc); return { h: `${lastName(P.winner).toUpperCase()} TOPPLES SEN. ${lastName(inc).toUpperCase()}`, s: `${stName(P.code)}'s ${PARTY[P.party].name} voters fire their senator: ${P.winner.name} wins by ${rsN((P.rec.runoff || P.rec).rows[0].votes - (P.rec.runoff || P.rec).rows[1].votes)} votes${P.rec.runoff ? ' in the runoff' : ''}.`, c: PARTY[P.party].color }; }
  if (mine.length) { const won = mine.filter(P => P.rec.endorsed === P.winner.name).length; return { h: won === mine.length ? `${L}: THE WHIP'S PICKS ${won > 1 ? 'SWEEP' : 'DELIVER'}` : won ? `${L}: A SPLIT NIGHT FOR THE WHIP` : `${L}: THE WHIP'S PICK${mine.length > 1 ? 'S' : ''} GO DOWN`, s: mine.map(P => `${stName(P.code)}: ${P.winner.name} ${P.rec.endorsed === P.winner.name ? '✓' : `beats ${P.rec.endorsed}`}`).join(' · '), c: PARTY[S.side].color }; }
  if (ups.length) { const P = ups[0]; return { h: `UPSET IN ${stName(P.code).toUpperCase()}`, s: `${P.winner.name} beats ${P.rec.fav} for the ${PARTY[P.party].name} nomination after trailing ${P.rec.rows.find(x => x.name === P.rec.fav).poll.toFixed(0)}% to ${P.rec.rows.find(x => x.name === P.winner.name).poll.toFixed(0)}% in the final poll.`, c: PARTY[P.party].color }; }
  return { h: `${L}: ${pick(['THE FAVORITES HOLD', 'NO SURPRISES', 'THE FRONTRUNNERS ROLL ON', 'A NIGHT FOR THE ESTABLISHMENT'])}`, s: `${contested} contested primar${contested === 1 ? 'y' : 'ies'} in ${states} state${states === 1 ? '' : 's'}; every frontrunner made it through.`, c: '#e3b54a' };
}
// an open-seat nominee's pull in November (your-side points come from the difference between the two)
function rsQuality(rc, P) {
  const c = P.winner; if (!c || c.inc || (rc.primaried && P.party === rc.m.party)) return 0;
  const adv = rsAdv(P.party, rc.m.state);
  let q = (c.ch - 1) * 3;
  if (RS_FLANKS.includes(c.faction) && adv < 6) q -= 1;
  if ((c.faction === MODERATE[P.party] || c.faction === CROSS[P.party]) && adv < 0) q += 0.8;
  return clamp(q, -2, 1.5);
}
// write every race's nominees onto the races, pay off endorsements, write the news; returns summary lines
function rsApply(L) {
  while (L.night < L.nights.length) rsRunNight(L);
  if (L.finished) return L.lines;
  L.finished = true;
  const E = L.E, mine = S.side, yr = E.year, lines = [], news = [];
  E.races.forEach((rc, i) => {
    const m = rc.m, pr = { D: L.prims.find(P => P.i === i && P.party === 'D'), R: L.prims.find(P => P.i === i && P.party === 'R') };
    rc.names = { D: pr.D.winner.name, R: pr.R.winner.name };
    rc.people = { D: pr.D.winner.p, R: pr.R.winner.p };
    rc.field = { D: pr.D.rec.rows, R: pr.R.rec.rows };
    rc.prim = { D: pr.D.rec, R: pr.R.rec };
    rc.rsCh = { D: +pr.D.winner.ch.toFixed(2), R: +pr.R.winner.ch.toFixed(2) };
    const H = pr[m.party];
    if (H && !rc.retiring) {
      const ir = H.rec.rows.find(x => x.inc), top = H.rec.rows.find(x => !x.inc);
      if (H.rec.incLost) {
        const w = H.winner; rc.primaried = true; rc.nominee = { name: w.name, faction: w.faction, office: w.office }; rc.electability = holderAdv(m) > 6 ? -1 : -5;
        news.push(`<b style="color:var(--gold2)">${ST[m.state].name}:</b> ${w.name} (${w.faction}) <b>defeats Sen. ${m.name}</b> in the ${PARTY[m.party].name} primary: ${rsIncLine(H.rec)}.`);
      } else if (H.field.length > 1) {
        rc.bruised = ir.pct < 60;
        hist(m, H.rec.runoff ? `Won the ${yr} ${PARTY[m.party].name} primary in a runoff, ${H.rec.runoff.rows[0].pct.toFixed(0)}–${H.rec.runoff.rows[1].pct.toFixed(0)}, over ${top.name}` : `Won the ${yr} ${PARTY[m.party].name} primary, ${ir.pct.toFixed(0)}% to ${top.pct.toFixed(0)}% for ${top.name}`, yr);
        if (rc.bruised) news.push(`${ST[m.state].name}: Sen. ${m.name} survives a challenge from ${top.name}, ${rsP((H.rec.runoff || H.rec).rows[0].pct)}${H.rec.runoff ? ' in a runoff' : ''}.`);
      }
    }
    rc.rsQual = +((rsQuality(rc, pr[mine]) - rsQuality(rc, pr[other(mine)])) * 0.6).toFixed(2);
    // the third candidates: indie.js decides when it is loaded
    if (m.party === 'I') rc.ind = { name: m.name, incumbent: true, str: rnd(30, 42) };
    else if (typeof indSenateEntrants === 'function') rc.ind = indSenateEntrants(rc) || null;
    else { const ch = (Math.abs(ST[m.state].lean) <= 12 ? 0.14 : 0.06) + (rc.primaried ? 0.15 : 0); rc.ind = Math.random() < ch ? { name: fullName(), cause: pick(IND_CAUSES), str: rnd(10, 26) + (rc.primaried ? 6 : 0) } : null; }
    for (const p of ['D', 'R']) { const w = pr[p].winner; if (!w.inc) hist(w.p, `Won the ${yr} ${PARTY[p].name} primary for the U.S. Senate in ${ST[m.state].name}${pr[p].field.length > 1 ? ` with ${rsP((pr[p].rec.runoff || pr[p].rec).rows[0].pct)}${pr[p].rec.runoff ? ' in a runoff' : ''}` : ', unopposed'}`, yr); }
    const m0 = (majorParty(rc) === mine ? 1 : -1) * projMargin(rc);
    rc.rsTrend = { pp: +(m0 + gauss() * 2.2 - (rc.bruised ? 1.5 : 0)).toFixed(1), ld: +(m0 + gauss() * 1.4).toFixed(1) };
  });
  // your endorsements pay off, or don't
  for (const P of L.prims.filter(P => P.plan)) {
    const pl = P.plan, won = P.winner.name === pl.cand, c = P.field.find(x => x.name === pl.cand), st = stName(P.code), inc = P.field.find(x => x.inc);
    if (pl.meddle) {
      if (won && inc && c !== inc) unlock('primary');
      lines.push(`🕶️ ${st} (${P.party}): ${won ? `your quiet money helped ${pl.cand} to the nomination` : `${pl.cand} lost to ${P.winner.name} despite your help`}${P.leak ? '; the meddling leaked' : ''}.`);
      continue;
    }
    if (won) {
      if (c.inc) c.p.rel += 2; else (S.rsPicks = S.rsPicks || []).push({ n: c.name, s: P.code, y: yr });
      if (inc && !c.inc) unlock('primary');
      addLegacy(1);
      lines.push(`✅ ${st}: ${pl.cand} won the primary you endorsed${c.inc ? ' and owes you one (+2 relationship)' : ' and owes you (+2 relationship if they reach the Senate)'}.`);
    } else {
      S.career.capital = Math.max(0, S.career.capital - 1);
      hist(c.p, `Lost the ${yr} ${PARTY[P.party].name} Senate primary in ${st} despite the whip's endorsement`, yr);
      if (inc && P.winner === inc && !c.inc) { inc.p.rel -= 2; inc.p.grudge = true; }
      lines.push(`❌ ${st}: ${pl.cand} lost to ${P.winner.name} (−1 capital)${inc && P.winner === inc && !c.inc ? `. Sen. ${inc.name} survived and will not forget it (−2 relationship, grudge)` : ''}.`);
    }
  }
  const races = E.races.length, lost = L.prims.filter(P => P.rec.incLost);
  E.primaryNews = news.concat(lines).slice(0, 12);
  if (!lost.length) E.primaryNews.unshift(`Every senator who sought renomination in ${yr} got it.`);
  L.lines = lines;
  log(`Senate primaries ${yr}: ${lost.length} incumbent${lost.length === 1 ? '' : 's'} defeated across ${races} races.`, 'sys');
  return lines;
}

/* ---------------- the screens ---------------- */
function rsTagsHTML(r, P) {
  const t = [];
  if (r.incLost) t.push('<span class="prim-tag rs-out">INCUMBENT DEFEATED</span>');
  else if (r.upset) t.push('<span class="prim-tag up">UPSET</span>');
  if (r.photo) t.push('<span class="prim-tag ph">PHOTO FINISH</span>');
  if (r.runoff) t.push('<span class="prim-tag rs-ro">RUNOFF</span>');
  if (r.unopp) t.push('<span class="prim-tag rs-un">UNOPPOSED</span>');
  if (r.endorsed && P && !r.meddle) t.push(`<span class="prim-tag rs-me">${r.endorsed === r.winner ? 'YOUR PICK ✓' : 'YOUR PICK ✗'}</span>`);
  if (r.meddle) t.push('<span class="prim-tag rs-me">QUIET MONEY</span>');
  return t.join(' ');
}
function rsTableHTML(rows, total, runoff, check) {
  return `<table class="prim-table"><thead><tr><th>Candidate</th><th>Votes</th><th>Share</th>${runoff ? '' : '<th>Final poll</th>'}</tr></thead><tbody>
    ${rows.map((x, i) => `<tr class="${i === 0 ? 'win' : ''}"><td><span class="dot" style="background:${x.color}"></span>${x.name}${x.inc ? ' <span class="rs-inc">INC</span>' : ''}${i === 0 && check ? ' <span class="check">✓</span>' : ''}<small class="rs-off">${x.office} · ${x.faction}</small></td><td>${rsN(x.votes)}</td><td><b>${rsP(x.pct)}</b><span class="prim-bar"><i style="width:${x.pct}%;background:${x.color}"></i></span></td>${runoff ? '' : `<td class="${x.pct - x.poll >= 3 ? 'beat' : x.pct - x.poll <= -3 ? 'miss' : ''}">${x.poll.toFixed(0)}% <small>(${x.pct - x.poll >= 0 ? '+' : '−'}${Math.abs(x.pct - x.poll).toFixed(1)})</small></td>`}</tr>`).join('')}
    </tbody></table><div class="nsub">${rsN(total)} votes · 100% reporting</div>`;
}
// a race's full results: every candidate's raw votes, share, the final poll, and the runoff
function rsDetailHTML(P) {
  const r = P.rec; if (!r) return '';
  const f = (r.runoff || r).rows, rc = P.rc;
  const ctx = rc.m.party === P.party && !rc.retiring ? (r.rows.length > 1 ? `Sen. ${rc.m.name} sought a ${rsNth(rc.m)} term` : `Sen. ${rc.m.name} unopposed`) : rc.m.party === 'I' ? `to face Sen. ${rc.m.name} (I)` : rc.retiring && rc.m.party === P.party ? `open seat: Sen. ${rc.m.name} retiring` : `to face ${rc.retiring ? 'the other party\'s nominee for an open seat' : `Sen. ${rc.m.name} (${rc.m.party})`}`;
  return `<div class="prim-detail"><div class="prim-dh"><b>${stName(P.code)} ${PARTY[P.party].name} primary</b><span>${P.label} · Class ${P.cls} · ${ctx}</span>${rsTagsHTML(r, P)}</div>
    ${rsTableHTML(r.rows, r.total, false, !r.runoff)}
    ${r.runoff ? `<div class="plbl">Runoff · top two, three weeks later</div>${rsTableHTML(r.runoff.rows, r.runoff.total, true, true)}` : ''}
    <div class="nsub">${r.unopp ? `${f[0].name} was unopposed.` : `${f[0].name} wins by ${rsN(f[0].votes - f[1].votes)} votes (${r.margin.toFixed(1)} points)${r.runoff ? ' in the runoff' : ''}.`}</div></div>`;
}
// where incumbents lost, survived, or the seat was open; states yet to vote are hatched
function rsMapHTML(L) {
  const st = {}, ends = new Set(L.prims.filter(P => P.plan && P.rec).map(P => P.code));
  for (const P of L.prims) {
    if (!P.rec) continue;
    const H = P.rc.m.party === P.party && !P.rc.retiring, v = P.rec.incLost ? 4 : H && P.rc.primary ? 3 : H ? 2 : 1;
    if (!st[P.code] || st[P.code].v < v) st[P.code] = { v, P };
  }
  return usMap({
    fill: c => { const x = st[c]; if (!x) return null; return x.v === 4 ? { c: '#e3b54a', op: 0.95 } : x.v === 1 ? { c: '#9aa3b2', op: 0.45 } : { c: PARTY[x.P.party].color, op: x.v === 3 ? 0.85 : 0.4 }; },
    sub: c => { const x = st[c]; return !x ? '' : x.v === 4 ? 'OUT' : x.v === 3 ? 'held' : x.v === 2 ? '' : 'open'; },
    ring: c => ends.has(c) ? '#fff' : null,
    attr: c => st[c] ? `data-rsel="${st[c].P.i}:${st[c].P.party}"` : '',
    title: c => { const x = st[c]; return x ? `${stName(c)}: ${x.v === 4 ? `Sen. ${x.P.field.find(f => f.inc).name} lost the primary to ${x.P.winner.name}` : x.v === 3 ? `Sen. ${x.P.field.find(f => f.inc).name} survived a challenge` : x.v === 2 ? `Sen. ${x.P.rc.m.name} renominated` : 'open seat'}` : `${stName(c)}: no Senate primary yet`; },
  }) + '<div class="rs-legend"><span><i style="background:#e3b54a"></i>Incumbent defeated</span><span><i style="background:#9aa3b2;opacity:.6"></i>Open seat</span><span><i style="background:#888"></i>Incumbent survived a challenge (solid) or ran unopposed (faint)</span><span>White ring: you endorsed</span></div>';
}
function rsRowHTML(P, sel) {
  const r = P.rec, f = (r.runoff || r).rows[0];
  return `<div class="prow prim-srow rs-row ${sel ? 'on' : ''}" data-rsel="${P.i}:${P.party}"><span><b style="color:${PARTY[P.party].color}">${P.party}</b> ${stName(P.code)} ${rsTagsHTML(r, P)}</span><span><b>${f.name}</b> ${rsP(f.pct)}${r.unopp ? '' : ` · +${r.margin.toFixed(1)}`}</span></div>`;
}
function rsResultsHTML(L, prims, title) {
  const sel = L.sel && prims.includes(L.sel) ? L.sel : prims.slice().sort((a, b) => (b.rec.incLost - a.rec.incLost) || ((b.party === S.side) - (a.party === S.side)) || (b.field.length - a.field.length))[0];
  L.sel = sel;
  const order = prims.slice().sort((a, b) => ((b.party === S.side) - (a.party === S.side)) || stName(a.code).localeCompare(stName(b.code)));
  return `<div class="rs-res"><div class="prim-rcol list rs-list"><b>${title} · click a race for its full count</b>${order.map(P => rsRowHTML(P, P === sel)).join('')}</div><div class="prim-rcol">${sel ? rsDetailHTML(sel) : ''}</div></div>`;
}
function rsWide() { $('#modal-card').classList.add('rs-wide'); }
function rsBindSel(L, redraw) {
  $('#modal-card').querySelectorAll('[data-rsel]').forEach(g => g.onclick = () => {
    const [i, p] = g.dataset.rsel.split(':'), P = L.prims.find(x => x.i === +i && x.party === p);
    if (!P || !P.rec) return;
    L.sel = P; sfx.click(); const card = $('#modal-card'), sc = card.scrollTop; redraw(); card.scrollTop = sc;
  });
}

/* ---- the endorsement board ---- */
function rsWhy(P) {
  const rc = P.rc, m = rc.m, inc = P.field.find(c => c.inc), ch = P.field.find(c => !c.inc);
  if (inc) return P.field.length === 1 ? `Sen. ${m.name} is unopposed for renomination.` : rc.primary ? `Sen. ${m.name} (${m.faction}${m.defy ? `, broke ranks ${m.defy}×` : ''}) faces a real challenge from the ${ch.faction}.` : `Sen. ${m.name} draws only token opposition.`;
  if (m.party === 'I') return `The winner takes on Sen. ${m.name} (I) and the other party's nominee.`;
  if (m.party === P.party) return `Open seat: Sen. ${m.name} is retiring after ${Math.max(1, rsTerms(m))} term${rsTerms(m) > 1 ? 's' : ''}.`;
  return rc.retiring ? `The winner runs for the open seat Sen. ${m.name} (${m.party}) is leaving.` : `The winner takes on Sen. ${m.name} (${m.party}) in November.`;
}
function rsCandHTML(P, c, ci, poll, btn) {
  const pl = P.plan, mineC = pl && pl.cand === c.name;
  return `<div class="rs-cand ${mineC ? 'on' : ''}"><span class="rs-pic">${portrait(c.p)}</span><span class="rs-cn"><b style="color:${c.color}">${c.name}</b>${c.inc ? ' <span class="rs-inc">INC</span>' : ''}${rsYours(c) ? ' <span class="rs-wing" title="Your wing">★</span>' : ''}${mineC ? ` <b class="prim-you">${pl.meddle ? 'QUIET MONEY' : 'YOUR PICK'}</b>` : ''}<small>${c.office} · ${c.faction}</small></span>
    <span class="rs-poll"><b>${poll[c.name].toFixed(0)}%</b><span class="mbar"><i style="width:${Math.min(100, poll[c.name])}%;background:${c.color}"></i></span></span>${btn}</div>`;
}
function rsBoard(L) {
  const E = L.E, mine = S.side, theirs = other(mine), own = rsOwnPlans(L).length, med = rsMeddles(L).length, cap = S.career.capital;
  const contested = p => L.prims.filter(P => P.party === p && P.field.length > 1);
  const rank = P => (P.field.some(c => c.inc) ? (P.rc.primary ? 0 : 3) : P.rc.m.party === P.party ? 1 : 2) * 100 + Math.abs(holderAdv(P.rc.m));
  const list = contested(L.view).sort((a, b) => rank(a) - rank(b)), chal = L.prims.filter(P => P.rc.primary && P.field.some(c => c.inc) && P.field.length > 1);
  const cards = list.map(P => {
    const poll = rsPoll(P), canOwn = P.party === mine && !P.plan && own < 3, canMed = P.party === theirs && !P.plan && med < 1;
    const cands = P.field.slice().sort((a, b) => poll[b.name] - poll[a.name]).map(c => {
      const ci = P.field.indexOf(c);
      const btn = canOwn ? `<button class="btn" data-choice="end:${L.prims.indexOf(P)}:${ci}">Endorse</button>` : canMed ? `<button class="btn" data-choice="end:${L.prims.indexOf(P)}:${ci}" ${cap < 2 ? 'disabled' : ''}>Back quietly<small>2 cap</small></button>` : '';
      return rsCandHTML(P, c, ci, poll, btn);
    }).join('');
    return `<div class="rs-card ${P.plan ? 'on' : ''}"><div class="rs-ch"><b>${stName(P.code)}</b><small>${PARTY[P.party].name} primary · ${P.label}${RS_RUNOFF.includes(P.code) ? ' · runoff if no one tops 50%' : ''} · ${rsLeanLabel(P.code)}</small>${P.plan ? `<button class="btn ghost rs-replan" data-rplan="${L.prims.indexOf(P)}">Campaign plan ▶</button>` : ''}</div><div class="rs-why">${rsWhy(P)}</div>${cands}</div>`;
  }).join('');
  const unopp = L.prims.filter(P => P.party === L.view && P.field.length === 1);
  showModal(`<div class="kicker">${E.year} · Senate primaries · Endorsements</div><h2>Primary Season</h2>
    <p>${E.races.length} Senate seats are up in ${E.year}, and every one of them needs a Democratic and a Republican nominee. ${contested(mine).length} ${PARTY[mine].name} and ${contested(theirs).length} ${PARTY[theirs].name} primaries are contested; ${chal.length ? `<b>${chal.length} senator${chal.length > 1 ? 's face' : ' faces'} a real challenge</b> (${chal.map(P => `${lastName(P.rc.m)}, ${P.party}-${P.code}`).join('; ')})` : 'no senator faces a serious challenge'}. Voting runs from March to September.</p>
    <p class="prim-note"><b>Endorse up to three</b> candidates in your party's primaries: each endorsement hands you their campaign plan (three days on the trail and their ad money). Winners owe you (+2 relationship); every endorsed loser costs 1 capital, and an incumbent you endorse against will hold a grudge if they survive. You may also <b>quietly back one</b> candidate in the ${PARTY[theirs].name} primaries for 2 capital: a weak nominee is easier to beat in November, but one time in four your fingerprints show.</p>
    <div class="rankbar rs-status">Endorsements <b>${own}/3</b> · Quiet money <b>${med}/1</b> · Capital <b style="color:var(--gold2)">${cap}</b></div>
    <div class="ptabs">${[mine, theirs].map(p => `<button class="btn ${L.view === p ? 'on' : ''}" data-rsview="${p}" style="border-color:${PARTY[p].color}">${PARTY[p].name} primaries (${contested(p).length})${p === mine ? ' · your party' : ''}</button>`).join('')}</div>
    <div class="rs-cards">${cards || '<p style="color:var(--dim)">No contested primaries on this side.</p>'}</div>
    ${unopp.length ? `<p class="nsub"><b>Unopposed:</b> ${unopp.map(P => `${P.field[0].name} (${P.code})`).join(', ')}.</p>` : ''}
    <div class="choices"><button class="btn primary big adv" id="rsgo">Hold the ${L.nights[0] ? L.nights[0].label : ''} primaries ▶</button><button class="btn ghost adv" id="rsskip">Skip to the results</button></div>`);
  rsWide();
  const card = $('#modal-card');
  card.querySelectorAll('[data-rsview]').forEach(b => b.onclick = () => { L.view = b.dataset.rsview; sfx.click(); rsBoard(L); });
  card.querySelectorAll('[data-choice^="end:"]').forEach(b => b.onclick = () => rsEndorse(L, ...b.dataset.choice.split(':').slice(1).map(Number)));
  card.querySelectorAll('[data-rplan]').forEach(b => b.onclick = () => rsPlanScreen(L, L.prims[+b.dataset.rplan]));
  $('#rsgo').onclick = () => { sfx.gavel(); rsRunNight(L); rsNight(L, L.nights[L.night - 1]); };
  $('#rsskip').onclick = () => { rsApply(L); rsSummary(L); };
}
function rsEndorse(L, pi, ci) {
  const P = L.prims[pi], c = P && P.field[ci]; if (!c || P.plan) return;
  const meddle = P.party !== S.side;
  if (meddle ? rsMeddles(L).length >= 1 || S.career.capital < 2 : rsOwnPlans(L).length >= 3) return;
  if (meddle) S.career.capital -= 2;
  P.plan = { cand: c.name, days: 3, rally: 0, ads: 0, budget: c.cash, favor: 0, favorBy: null, attack: null, meddle };
  if (!meddle) {
    hist(c.p, `Endorsed for the U.S. Senate by the ${PARTY[S.side].name} whip`);
    const inc = P.field.find(x => x.inc); if (inc && inc !== c) { inc.p.rel -= 2; toast(`Sen. ${inc.name} heard about your endorsement (−2 relationship).`); }
  }
  sfx.up(); rsPlanScreen(L, P);
}
// who can make calls for your candidate
function rsAlly(P) {
  const c = P.field.find(x => x.name === P.plan.cand), g = S.governors[P.code];
  if (P.plan.meddle) return null;
  if (g && g.party === P.party && !P.field.some(x => x.name === g.name)) return { name: `Gov. ${g.name}`, who: g, k: g.faction === c.faction ? 0.14 : 0.1 };
  const may = (typeof localPrimaryPool === 'function' ? localPrimaryPool(P.party, P.code) || [] : []).find(x => x && x.p && !P.field.some(f => f.name === x.p.name));
  if (may) return { name: `${may.p.name} (${may.office})`, who: may.p, k: 0.08 };
  const s2 = S.members.find(m => m.party === P.party && m.state === P.code && m.name !== c.name && m !== P.rc.m);
  if (s2) return { name: `Sen. ${s2.name}`, who: s2, k: s2.faction === c.faction ? 0.12 : 0.08 };
  return { name: `the ${stName(P.code)} ${PARTY[P.party].name} chair`, who: null, k: 0.06 };
}
function rsPlanScreen(L, P) {
  const pl = P.plan, c = P.field.find(x => x.name === pl.cand), poll = rsPoll(P), lead = P.field.filter(x => x !== c).sort((a, b) => poll[b.name] - poll[a.name])[0], ally = rsAlly(P), left = pl.budget - pl.ads;
  const row = (icon, title, sub, btn) => `<div class="prim-hqrow rs-prow"><span><b>${icon} ${title}</b><small>${sub}</small></span>${btn}</div>`;
  showModal(`<div class="kicker">${L.E.year} · Senate primaries · ${pl.meddle ? 'Quiet money' : 'Campaign plan'}</div><h2>${pl.meddle ? `Helping ${c.name}, quietly` : `Running ${lastName(c.p)}'s campaign`}</h2>
    <div class="prim-hqcand" style="border-color:${c.color}"><span class="cp">${portrait(c.p)}</span><span style="flex:1"><b style="color:${c.color}">${c.name}</b> <small>· ${c.office} · ${c.faction}</small><br><small>${stName(P.code)} ${PARTY[P.party].name} primary · ${P.label} · ${rsWhy(P)}</small></span>
      <span class="prim-res"><b>${pl.days}</b><small>days left</small></span><span class="prim-res"><b>$${left}M</b><small>ad money</small></span><span class="prim-res"><b>${poll[c.name].toFixed(0)}%</b><small>poll w/ plan</small></span></div>
    <p>${pl.meddle ? `Nobody in the ${PARTY[P.party].name} Party takes your calls, but money talks: a super PAC with an innocuous name can buy ads and hire canvassers.` : `The campaign takes your calls until the ${P.label} primary.`} A day on the trail is worth about +5% of their strength (up to three), ads about +20% for the first $6M, an attack knocks the frontrunner down about 12% (one time in four it backfires), and a phone call from someone who matters about +10%.</p>
    <div class="pollbox rs-pb"><b>📊 ${stName(P.code)} ${PARTY[P.party].name} primary poll, with your plan</b>${P.field.slice().sort((a, b) => poll[b.name] - poll[a.name]).map(x => `<div class="salrow"><span style="color:${x.color};font-weight:${x === c ? 800 : 600}">${x.name}${x.inc ? ' (inc.)' : ''}</span><span class="mbar"><i style="width:${Math.min(100, poll[x.name])}%;background:${x.color}"></i></span><b>${poll[x.name].toFixed(0)}%</b></div>`).join('')}</div>
    ${row('🎤', `Rally day${pl.rally ? ` · ${pl.rally} planned` : ''}`, 'Town halls, diners, a county fair: +5% each, up to three.', `<button class="btn" data-choice="pl:rally" ${pl.days < 1 || pl.rally >= 3 ? 'disabled' : ''}>+ Day</button>`)}
    ${row('📺', `Ad buy${pl.ads ? ` · $${pl.ads}M placed` : ''}`, `The candidate's own money: $${left}M of $${pl.budget}M left to spend.`, `<button class="btn" data-choice="pl:ads" ${left < 1 ? 'disabled' : ''}>+ $${Math.min(2, Math.max(1, left))}M</button>`)}
    ${row('🎯', pl.attack ? `Attacking ${pl.attack}` : 'Go after the frontrunner', lead ? `A day of contrast ads and a press call aimed at ${lead.name} (${poll[lead.name].toFixed(0)}%).` : 'Nobody to attack.', `<button class="btn" data-choice="pl:attack" ${pl.days < 1 || pl.attack || !lead ? 'disabled' : ''}>Attack</button>`)}
    ${row('📞', pl.favorBy ? `${pl.favorBy} is making calls` : `Call in ${ally ? ally.name : 'a favor'}`, ally ? 'A day spent working the phones with the people who run the state party.' : 'You have no friends in their party.', `<button class="btn" data-choice="pl:favor" ${pl.days < 1 || pl.favor || !ally ? 'disabled' : ''}>Call</button>`)}
    <div class="choices"><button class="btn primary big adv" id="rsplanok">Lock in the plan</button></div>`);
  rsWide();
  $('#modal-card').querySelectorAll('[data-choice^="pl:"]').forEach(b => b.onclick = () => {
    const k = b.dataset.choice.slice(3);
    if (k === 'rally' && pl.days >= 1 && pl.rally < 3) { pl.rally++; pl.days--; }
    else if (k === 'ads' && pl.ads < pl.budget) pl.ads += Math.min(2, pl.budget - pl.ads);
    else if (k === 'attack' && pl.days >= 1 && !pl.attack && lead) { pl.attack = lead.name; pl.days--; }
    else if (k === 'favor' && pl.days >= 1 && !pl.favor && ally) { pl.favor = ally.k; pl.favorBy = ally.name; pl.days--; if (ally.who) hist(ally.who, `Endorsed ${c.name} in the ${PARTY[P.party].name} Senate primary at the whip's request`); }
    else return;
    sfx.click(); rsPlanScreen(L, P);
  });
  $('#rsplanok').onclick = () => { sfx.click(); rsBoard(L); };
}

/* ---- primary nights ---- */
function rsNight(L, N) {
  const nx = L.nights[L.night], contested = N.prims.filter(P => P.field.length > 1).length, states = new Set(N.prims.map(P => P.code)).size;
  const draw = () => {
    showModal(`<div class="kicker">${L.E.year} · Senate primaries · ${N.label}</div><h2>${N.label} primary night</h2>
      <div class="nsub">${states} state${states === 1 ? '' : 's'} · ${N.prims.length} primaries, ${contested} contested · night ${L.nights.indexOf(N) + 1} of ${L.nights.length}</div>
      <div class="prim-banner" style="--pc:${N.head.c}"><small>${N.label} · Senate primaries</small><b>${N.head.h}</b><span>${N.head.s}</span></div>
      ${N.news.length ? `<div class="prim-news rs-news">${N.news.slice(0, 8).join('')}</div>` : ''}
      ${rsResultsHTML(L, N.prims, `🗳️ ${N.label} results`)}
      <div class="campmap">${rsMapHTML(L)}</div>
      <div class="choices">${nx ? `<button class="btn primary big adv" id="rsnext">${nx.label} primaries ▶</button><button class="btn ghost adv" id="rsskip">Skip to the results</button>` : '<button class="btn primary big adv" id="rsnext">The primary season in review ▶</button>'}</div>`);
    rsWide();
    rsBindSel(L, draw);
    $('#rsnext').onclick = () => { sfx.gavel(); L.sel = null; if (nx) { rsRunNight(L); rsNight(L, nx); } else { rsApply(L); rsSummary(L); } };
    if ($('#rsskip')) $('#rsskip').onclick = () => { L.sel = null; rsApply(L); rsSummary(L); };
  };
  draw();
}
function rsSummary(L) {
  const E = L.E, mine = S.side, lost = L.prims.filter(P => P.rec.incLost), runs = L.prims.filter(P => P.rec.runoff), ups = L.prims.filter(P => P.rec.upset && !P.rec.incLost), chal = L.prims.filter(P => P.rc.primary && P.field.some(c => c.inc) && P.field.length > 1);
  const plans = L.prims.filter(P => P.plan && !P.plan.meddle), wins = plans.filter(P => P.winner.name === P.plan.cand).length;
  const head = lost.length >= 2 ? `${['TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'][lost.length - 2] || lost.length} SENATORS LOSE THEIR PRIMARIES` : lost.length ? `SEN. ${lastName(lost[0].field.find(c => c.inc)).toUpperCase()} IS THE PRIMARY SEASON'S ONLY CASUALTY` : 'EVERY SENATOR SURVIVES PRIMARY SEASON';
  const body = [
    `${L.prims.filter(P => P.field.length > 1).length} contested Senate primaries from March to September. ${chal.length ? `${chal.length} senator${chal.length > 1 ? 's' : ''} faced a real challenge and ${lost.length} lost.` : 'No senator faced a serious challenge.'} ${runs.length ? `${runs.length} race${runs.length > 1 ? 's' : ''} went to a runoff.` : ''}`,
    ...lost.map(P => `${stName(P.code)}: ${P.winner.name} (${P.winner.faction}) beat Sen. ${P.field.find(c => c.inc).name}: ${rsIncLine(P.rec)}.`),
    ups.length ? `Upsets: ${ups.slice(0, 4).map(P => `${P.winner.name} (${P.party}-${P.code})`).join(', ')}.` : '',
    plans.length ? `The whip's endorsements went ${wins} for ${plans.length}.` : 'The whip stayed out of the primaries.',
  ].filter(Boolean);
  const draw = () => {
    showModal(`${frontPage({ headline: head, sub: `${E.year} Senate primaries: ${L.prims.length} primaries in ${E.races.length} races, both parties.`, body, mood: lost.length ? 'storm' : 'dawn', date: `September ${E.year} · Primary season` })}
      <div class="kicker">${E.year} · Senate primaries · The season in review</div>
      ${L.lines.length ? `<div class="primnews"><b>Your endorsements</b>${L.lines.map(t => `<p>${t}</p>`).join('')}</div>` : ''}
      <div class="campmap">${rsMapHTML(L)}</div>
      ${rsResultsHTML(L, L.prims, `🗳️ All ${L.prims.length} primaries`)}
      <div class="choices"><button class="btn primary big adv" id="rsdone">On to the general election ▶</button></div>`);
    rsWide();
    rsBindSel(L, draw);
    $('#rsdone').onclick = () => { const done = L.done; RS_LIVE = null; $('#modal-card').classList.remove('rs-wide'); sfx.click(); done(); };
  };
  draw();
}

/* ---------------- the hook game.js calls ---------------- */
function senatePrimaries(E, done) {
  E.raceWork = {}; E.rsTours = 0; E.rsSur = { wing: 0, pres: 0 };
  const L = rsBuild(E); L.done = done; RS_LIVE = L;
  rsBoard(L);
}

/* ---------------- the race room ---------------- */
function raceCampaignAdj(rc) {
  const E = S.election; if (!E || !rc || !rc.m) return 0;
  const w = E.raceWork && E.raceWork[rc.m.state + ':' + rc.m.cls];
  return (w ? rsEff(w.adj) : 0) + (rc.rsQual || 0);
}
// a race soaks up only so much: past a few points each extra point of work counts for less (+6 of work is worth about +4)
function rsEff(a) { return a > 0 ? 4.5 * Math.tanh(a / 4.5) : a; }
function raceDetailBtn(rc, i) { return S.election && rc && rc.m ? ` <button class="btn rs-rbtn" data-rroom="${i}" title="Open the race room">🔍 Race</button>` : ''; }
function bindRaceDetails(card, draw) {
  card.querySelectorAll('[data-rroom]').forEach(b => b.onclick = e => {
    e.stopPropagation(); const rc = S.election && S.election.races[+b.dataset.rroom]; if (!rc) return;
    const sc = card.scrollTop; sfx.click(); rsRoom(rc, () => { draw(); $('#modal-card').scrollTop = sc; });
  });
}
// the nominees you endorsed who won their seats arrive owing you (the first interlude after the election)
HOOKS.worldNews.push(() => {
  if (!S.rsPicks || !S.rsPicks.length) return [];
  const out = [], yr = currentYear();
  S.rsPicks = S.rsPicks.filter(k => {
    const m = S.members.find(x => x.name === k.n && x.state === k.s);
    if (m) { m.rel = (m.rel || 0) + 2; hist(m, `Arrived in the Senate owing the whip, who endorsed them in the ${k.y} primary`); out.push(`🤝 Sen. ${m.name} (${m.party}-${m.state}), your pick in the ${k.y} primary, arrives in the Senate owing you (+2 relationship).`); return false; }
    return yr <= k.y;
  });
  return out;
});
function rsWork(rc) { const E = S.election; E.raceWork = E.raceWork || {}; return E.raceWork[rsKey(rc)] = E.raceWork[rsKey(rc)] || { adj: 0, done: [], notes: [], neg: 0 }; }
// both nominees as people; only needed if the primaries didn't run
function rsPeople(rc) {
  if (rc.people && rc.people.D && rc.people.R) return rc.people;
  const ppl = {};
  for (const p of ['D', 'R']) {
    if (rc.m.party === p && !rc.retiring && !rc.primaried) ppl[p] = rc.m;
    else { const per = rsPerson(p, rc.m.state, { name: rc.primaried && rc.m.party === p ? rc.nominee.name : rc.names && rc.names[p] }); hist(per, `Worked as ${per.background}`, currentYear() - ri(8, 20)); ppl[p] = per; }
  }
  rc.names = rc.names || { D: ppl.D.name, R: ppl.R.name };
  return rc.people = ppl;
}
const rsMine = rc => (majorParty(rc) === S.side ? 1 : -1) * projMargin(rc);
function rsTrendSVG(pts, col) {
  const W = 320, H = 130, pl = 34, pr = 52, pt = 14, pb = 26, v = pts.map(x => clamp(50 + x.m / 2, 25, 75));
  const lo = Math.min(45, Math.floor(Math.min(...v) - 2)), hi = Math.max(55, Math.ceil(Math.max(...v) + 2));
  const x = i => pl + i * (W - pl - pr) / (pts.length - 1), y = s => pt + (hi - s) / (hi - lo) * (H - pt - pb);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="lchart rs-trend">`;
  for (const g of [lo, 50, hi]) s += `<line x1="${pl}" x2="${W - pr}" y1="${y(g)}" y2="${y(g)}" stroke="${g === 50 ? '#9aa3b2' : '#2a3242'}" stroke-dasharray="${g === 50 ? '4 3' : ''}"/><text x="${pl - 4}" y="${y(g) + 4}" font-size="10" fill="#6b7587" text-anchor="end">${g}%</text>`;
  s += `<polyline fill="none" stroke="${col}" stroke-width="2.6" points="${v.map((s2, i) => `${x(i)},${y(s2)}`).join(' ')}"/>`;
  v.forEach((s2, i) => { s += `<circle cx="${x(i)}" cy="${y(s2)}" r="${i === v.length - 1 ? 4.5 : 3}" fill="${col}"/><text x="${x(i)}" y="${H - 8}" font-size="10" fill="#9aa3b2" text-anchor="${i === 0 ? 'start' : i === v.length - 1 ? 'end' : 'middle'}">${pts[i].lbl}</text>`; });
  return s + `<text x="${W - pr + 6}" y="${y(v[v.length - 1]) + 4}" font-size="12" font-weight="800" fill="${col}">${v[v.length - 1].toFixed(1)}%</text></svg>`;
}
// the surrogates you can send into a race
function rsSurrogates(rc) {
  const E = S.election, out = [], code = rc.m.state, me = rsPeople(rc)[S.side];
  const L = typeof wingLeader === 'function' ? wingLeader() : null;
  if (L && L !== me) out.push({ k: 'wing', name: `Sen. ${L.name}, leader of the ${L.faction}`, left: 3 - E.rsSur.wing, d: () => 1 + (stateFit(code, rsFx(S.side, L.faction)) > 1 ? 0.5 : 0) + rnd(0, 0.5) });
  const g = S.governors[code]; if (g && g.party === S.side && g !== me) out.push({ k: 'gov', name: `Gov. ${g.name}`, left: 1, d: () => rnd(1.2, 1.8) + ((g.terms || 1) >= 2 ? 0.2 : 0) });
  const P = S.president; if (P.party === S.side && P.approval >= 50) out.push({ k: 'pres', name: presTitle(), left: 2 - E.rsSur.pres, d: () => clamp(1 + (P.approval - 50) / 10, 1, 2) });
  return out;
}
const RS_ACTS = {
  debate: { icon: '🎓', name: 'Debate prep', cost: '1 capital', blurb: 'A weekend of mock debates before the big one. Scored at once: anywhere from −1.5 to +2.5.', ok: (rc, W) => W.done.includes('debate') ? 'Done' : S.career.capital < 1 ? 'Needs 1 capital' : '',
    run: (rc, W, me, them) => { S.career.capital--; const d = +clamp(0.5 + gauss() * 1.1 + ((rc.rsCh ? rc.rsCh[S.side] : 1) - 1) * 2, -1.5, 2.5).toFixed(1); return [d, d >= 0.5 ? `🎤 Debate in ${stName(rc.m.state)}: ${me.name} ${pick(RS_DEBATE.win)}. Snap poll: a clear win (${rsF(d)}).` : d > -0.5 ? `🎤 Debate in ${stName(rc.m.state)}: a draw. Nobody landed a punch (${rsF(d)}).` : `🎤 Debate in ${stName(rc.m.state)}: ${me.name} ${pick(RS_DEBATE.lose)}. The clip is everywhere (${rsF(d)}).`]; } },
  oppo: { icon: '🔎', name: 'Oppo research', cost: '1 capital', blurb: 'Dig into their nominee. Usually something turns up (+1.5); sometimes nothing; sometimes the digging is the story (−0.5).', ok: (rc, W) => W.done.includes('oppo') ? 'Done' : S.career.capital < 1 ? 'Needs 1 capital' : '',
    run: (rc, W, me, them) => { S.career.capital--; const r = Math.random(); return r < 0.6 ? [1.5, `🔎 The file on ${them.name}: ${pick(RS_OPPO)}. It led the evening news for three days.`] : r < 0.8 ? [0, `🔎 The researchers came back empty-handed: ${them.name} is exactly as boring as advertised.`] : [-0.5, `🔎 The story isn't ${them.name}: it's the whip's opposition researchers, caught photographing their mailbox.`]; } },
  blitz: { icon: '📺', name: 'Negative ad blitz', cost: '1 campaign unit', blurb: 'Repeatable. +1.2 each of the first two times; after that the voters tune out and turn on you (−0.3).', ok: () => S.election.cash < 1 ? 'No campaign units left' : '',
    run: (rc, W, me, them) => { S.election.cash--; W.neg++; const d = W.neg > 2 ? -0.3 : 1.2; return [d, W.neg > 2 ? `📺 A ${rsOrd(W.neg)} wave of attack ads on ${them.name}. The local paper's editorial: "Enough."` : `📺 ${pick(['Grainy black-and-white footage', 'An ominous narrator', 'A former employee on camera'])} and ${them.name}'s worst vote, on every station in ${stName(rc.m.state)}.`]; } },
  tour: { icon: '🚌', name: 'Tour with the candidate', cost: 'free · 3 races a cycle', blurb: 'Two days on the bus with your nominee: +0.6.', ok: (rc, W) => W.done.includes('tour') ? 'Done' : S.election.rsTours >= 3 ? 'Three tours already' : '',
    run: (rc, W, me) => { S.election.rsTours++; return [0.6, `🚌 Two days on the bus across ${stName(rc.m.state)} with ${me.name}: ${pick(['a packed diner in ' + pick(HOMETOWNS[rc.m.state] || ['town']), 'the county fair', 'a shift change at the plant', 'a high-school football game'])} and the local news at every stop.`]; } },
};
function rsRoom(rc, back) {
  const E = S.election, W = rsWork(rc), ppl = rsPeople(rc), mine = S.side, theirs = other(mine), m = rc.m, code = m.state, me = ppl[mine], them = ppl[theirs];
  const p = raceChance(rc), mg = rsMine(rc), tr = rc.rsTrend || (rc.rsTrend = { pp: +(mg - rsEff(W.adj) + gauss() * 2).toFixed(1), ld: +(mg - rsEff(W.adj) + gauss() * 1.2).toFixed(1) });
  const isInc = x => x === m && !rc.retiring && !rc.primaried;
  const nom = (pp, per) => { const r = rc.prim && rc.prim[pp], f = r && (r.runoff || r).rows[0];
    return `<div class="rs-nom" style="border-color:${PARTY[pp].color}"><span class="cp">${portrait(per)}</span><span><b style="color:${PARTY[pp].color}">${per.name}</b>${pp === mine ? ' <b class="prim-you">YOURS</b>' : ''}<small>${isInc(per) ? `U.S. Senator · seeking a ${rsNth(m)} term · ${m.faction}` : `${(r && r.rows.find(x => x.name === per.name) || {}).office || 'Nominee'} · ${per.faction || ''}`}</small>
      <small>${r ? (r.unopp ? `Unopposed in the ${r.label} primary` : `Won the ${r.label} primary with ${rsP(f.pct)}${r.runoff ? ' in a runoff' : ''}`) : ''}</small><a href="#" data-rprof="${pp}">profile</a></span></div>`; };
  const iss = TAGS.filter(t => ST[code].voter[t] > 0.15).sort((a, b) => ST[code].voter[b] - ST[code].voter[a]).slice(0, 4);
  const other2 = S.members.find(x => x.state === code && x !== m), g = S.governors[code];
  const rec = !rc.retiring && !rc.primaried && m.party !== 'I' ? `<p><b>${sen(m)}</b>: ${rsTerms(m) ? `${rsTerms(m)} term${rsTerms(m) > 1 ? 's' : ''} since ${rsSince(m)}` : `appointed in ${rsSince(m)}`} · ${m.faction} · record at home ${m.rec >= 4 ? '<b style="color:var(--yes)">popular</b>' : m.rec <= -4 ? '<b style="color:var(--no)">a liability</b>' : 'unremarkable'} (${fmt(m.rec || 0)})${m.defy ? ` · broke with the party ${m.defy}×` : ''}${m.party === mine ? ` · relationship with you ${fmt(m.rel || 0)}` : ''}${rc.bruised ? ' · <span style="color:var(--no)">bruised by the primary</span>' : ''}</p>` : `<p>${rc.primaried ? `Sen. ${m.name} lost the ${PARTY[m.party].name} primary to ${rc.nominee.name}: an open race in all but name.` : rc.retiring ? `Sen. ${m.name} (${m.party}) is retiring: an open seat.` : `Sen. ${m.name} (I) holds the seat and is running as an independent.`}</p>`;
  const acts = Object.entries(RS_ACTS).map(([k, a]) => { const why = a.ok(rc, W); return `<button class="btn" data-choice="rr:${k}" ${why ? 'disabled' : ''}><b>${a.icon} ${a.name}</b> <span class="rs-cost">${a.cost}</span><small>${why && why !== 'Done' ? why : a.blurb}${why === 'Done' ? ' · <b>done</b>' : ''}</small></button>`; }).join('');
  const surs = rsSurrogates(rc), surBtns = W.done.includes('sur') ? '<small>One surrogate per race: done.</small>' : surs.length ? surs.map(s => `<button class="btn" data-choice="rr:sur:${s.k}" ${s.left < 1 ? 'disabled' : ''}><b>📣 ${s.name}</b><small>${s.left > 0 ? `+1 to +2 · ${s.left} visit${s.left === 1 ? '' : 's'} left this cycle` : 'No visits left this cycle'}</small></button>`).join('') : '<small>No surrogate available: no wing leader, no friendly governor here, and no President of yours above 50%.</small>';
  showModal(`<div class="kicker">${E.year} · Senate race · Race room · Class ${m.cls}</div><h2>${stName(code)}: ${lastName(me)} vs ${lastName(them)}</h2>
    <div class="rs-noms">${nom(mine, me)}<span class="rs-vs">vs</span>${nom(theirs, them)}</div>
    ${rc.ind ? `<p class="nsub" style="color:${PARTY.I.color}">+ ${rc.ind.incumbent ? 'Sen. ' : ''}${rc.ind.name} (I${rc.ind.label ? `, ${rc.ind.label}` : ''}) polling ~${Math.round(rc.ind.str)}%</p>` : ''}
    <div class="rs-room"><div class="rs-col">
      <div class="pollbox"><b>📈 ${lastName(me)}'s share of the two-party vote</b>${rsTrendSVG([{ lbl: 'After the primary', m: tr.pp }, { lbl: 'Labor Day', m: tr.ld }, { lbl: 'Now', m: mg }], PARTY[mine].color)}
        <div class="salrow"><span>Your chance</span><b style="color:${chanceColor(p)}">${Math.round(p * 100)}%</b></div><div class="salrow"><span>Projected margin</span><b>${rsF(mg)}</b></div><div class="salrow"><span>Your work here${W.adj > 2.5 ? ` <small>(${rsF(W.adj)} on paper; a saturated race gives less back)</small>` : ""}</span><b>${rsF(rsEff(W.adj))}</b></div>${rc.rsQual ? `<div class="salrow"><span>Nominee quality</span><b>${rsF(rc.rsQual)}</b></div>` : ''}</div>
      <div class="pollbox"><b>🗺️ ${stName(code)} · ${rsLeanLabel(code)}</b>${iss.map(t => `<div class="salrow"><span>${TAG[t][0]} ${TAG[t][1]}</span><span class="mbar"><i style="width:${clamp(ST[code].voter[t] * 50, 0, 100)}%;background:var(--gold)"></i></span></div>`).join('') || '<p class="nsub">No single issue dominates here.</p>'}
        <small style="color:var(--dim)">Gov. ${g ? `${g.name} (${g.party})` : '—'} · other senator: ${other2 ? sen(other2) : '—'}</small></div>
      ${rec}
      <div class="salrow rs-money"><span>💰 Your committee money here: <b>${money(rc.cash)}</b> · ${E.cash} unit${E.cash === 1 ? '' : 's'} left</span><span class="cashctl"><button class="btn" data-rcash="-1" ${rc.cash ? '' : 'disabled'}>−</button><button class="btn" data-rcash="1" ${E.cash < 1 ? 'disabled' : ''}>+</button></span></div>
    </div><div class="rs-col">
      <div class="rs-acts">${acts}</div>
      <div class="prim-hqrow"><b>Bring in a surrogate</b><div class="rs-acts">${surBtns}</div></div>
      ${W.notes.length ? `<div class="prim-news rs-notes">${W.notes.map(t => `<p>${t}</p>`).join('')}</div>` : '<p class="nsub">Nothing done here yet.</p>'}
      ${rc.prim ? `<details class="cdet"><summary>Primary results in ${stName(code)}</summary>${[mine, theirs].map(pp => rsDetailHTML({ rec: rc.prim[pp], rc, party: pp, code, cls: m.cls, label: rc.prim[pp].label })).join('')}</details>` : ''}
    </div></div>
    <div class="choices"><button class="btn primary big adv" id="rsback">Back to the trail</button></div>`);
  rsWide();
  const card = $('#modal-card'), redo = () => { const sc = card.scrollTop; rsRoom(rc, back); card.scrollTop = sc; };
  card.querySelectorAll('[data-choice^="rr:"]').forEach(b => b.onclick = () => {
    const [, k, s] = b.dataset.choice.split(':');
    if (k === 'sur') {
      const x = surs.find(y => y.k === s); if (!x || x.left < 1 || W.done.includes('sur')) return;
      if (s !== 'gov') E.rsSur[s]++;
      const d = +x.d().toFixed(1); W.adj += d; W.done.push('sur');
      W.notes.push(`📣 ${x.name} campaigned with ${me.name} in ${pick(HOMETOWNS[code] || [stName(code)])} (${rsF(d)}).`);
      if (x.k !== 'pres') { const who = x.k === 'gov' ? S.governors[code] : wingLeader(); if (who) hist(who, `Campaigned for ${me.name} in ${stName(code)}`); }
    } else {
      const a = RS_ACTS[k]; if (!a || a.ok(rc, W)) return;
      const [d, text] = a.run(rc, W, me, them); W.adj += d; if (k !== 'blitz') W.done.push(k); W.notes.push(text);
    }
    W.adj = +W.adj.toFixed(2); sfx.click(); redo();
  });
  card.querySelectorAll('[data-rcash]').forEach(b => b.onclick = () => { const d = +b.dataset.rcash; if (d > 0 && E.cash < 1) return; if (d < 0 && rc.cash < 1) return; rc.cash += d; E.cash -= d; sfx.click(); redo(); });
  card.querySelectorAll('[data-rprof]').forEach(a => a.onclick = e => { e.preventDefault(); const pp = a.dataset.rprof; profileModal(ppl[pp], `${PARTY[pp].name} nominee · ${stName(code)}`, () => rsRoom(rc, back)); });
  $('#rsback').onclick = () => { card.classList.remove('rs-wide'); sfx.click(); back(); };
}
