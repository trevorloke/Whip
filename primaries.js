'use strict';
/* =====================================================================
   PRIMARIES — presidential primaries, state by state. Both parties'
   races, fields of two to nine, sitting Presidents who draw challengers
   when they're weak, full results with raw vote totals for every state,
   and an endorsement that hands you the candidate's campaign: you plan
   their days, ads, attacks, debates and favors contest by contest.
   Loaded after world.js; conventions follow in convention.js.
   ===================================================================== */

const PRIMARY_CAL = [['Iowa', ['IA']], ['New Hampshire', ['NH']], ['Nevada', ['NV']], ['South Carolina', ['SC']], ['Super Tuesday', ['AL', 'AR', 'CA', 'CO', 'ME', 'MA', 'MN', 'NC', 'OK', 'TN', 'TX', 'UT', 'VT', 'VA']], ['Mid-March', ['GA', 'MS', 'WA', 'MI', 'MO']], ['St. Patrick\'s Day', ['AZ', 'FL', 'IL', 'KS', 'OH', 'LA']], ['April', ['CT', 'DE', 'MD', 'NY', 'PA', 'RI', 'WI', 'HI', 'AK', 'WY']], ['May', ['IN', 'NE', 'WV', 'KY', 'OR', 'ID']], ['June', ['MT', 'NJ', 'NM', 'SD', 'ND', 'DC']]];
const CAND_COLORS = ['#f59e0b', '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fb7185', '#facc15', '#60a5fa', '#c084fc', '#2dd4bf'];
const PRIM_CAUCUS = ['IA', 'ND', 'WY', 'AK'];
const PRIM_DEBATES = { 'Iowa': 'Des Moines', 'New Hampshire': 'Manchester', 'South Carolina': 'Charleston', 'Super Tuesday': 'Houston' };
const PRIM_DEBATE_PLANS = { attack: ['Go after the frontrunner', 'High risk, high reward; the leader gets less from it'], policy: ['Win on substance', 'Steady, modest gains'], unity: ['Stay above the fray', 'Best for a frontrunner protecting a lead'], zinger: ['Hunt for the viral moment', 'Wild swings either way'] };
ACH.push(['campaign', '🎯', 'Campaign Manager', 'Run your endorsed candidate all the way to the nomination.'], ['regicide', '🗡️', 'Regicide', 'Back a primary challenger who beats a sitting President.']);

const primN = v => Math.round(v).toLocaleString('en-US');
const primDays = label => label === 'Super Tuesday' ? 7 : 5;
const primTotalDel = () => Object.values(EV).reduce((a, b) => a + b, 0) * 10;

/* ---------------- who runs ---------------- */
// how likely a sitting President is to draw a primary challenger: never when popular, sometimes around 50%, almost surely near 30%
function primChallengeOdds(approval) { return approval >= 58 ? 0 : approval >= 52 ? 0.08 : approval >= 47 ? 0.3 : approval >= 40 ? 0.55 : approval >= 33 ? 0.8 : 0.97; }
function primaryField(party, withIncumbent) {
  const P = S.president, field = [], used = new Set(withIncumbent ? [] : [P.name]);
  const add = (p, office, ref, extra = {}) => {
    if (!p || used.has(p.name)) return; used.add(p.name);
    const money = rnd(0.8, 1.2);
    field.push({ name: p.name, p, office, ref, party, faction: p.faction || pick(FACTIONS[party])[0], state: p.state, charisma: rnd(0.75, 1.3), money, cash: Math.round(money * rnd(8, 14)), del: 0, wins: 0, votes: 0, mo: 0, active: true, color: CAND_COLORS[field.length % CAND_COLORS.length], ...extra });
  };
  const outsider = () => {
    const st = pick(STATES)[0], o = newPerson(party, st, { age: ri(44, 72) }); o.faction = pick(FACTIONS[party])[0];
    const office = pick([`Former Governor of ${ST[st].name}`, o.gender === 'f' ? 'Businesswoman' : 'Businessman', 'Retired four-star general', 'Television host', `Mayor of ${pick(HOMETOWNS[st] || [ST[st].name])}`, 'Former ambassador']);
    hist(o, `Worked as ${o.background}`, currentYear() - ri(12, 25)); hist(o, `Became a national figure as ${office.toLowerCase().replace(/^former /, 'a former ').replace(/^(mayor|television|retired|business)/, 'a $1')}`, currentYear() - ri(2, 8));
    return [o, office];
  };
  const formers = shuffle((S.formers || []).filter(f => f && f.party === party && f.name !== P.name && !(S.vp && f.name === S.vp.name) && !(f.history || []).some(h => /Died/.test(h.t))));
  const pool = [];
  shuffle(S.members.filter(m => m.party === party)).sort((a, b) => (T(b, 'ambitious') ? 1 : 0) - (T(a, 'ambitious') ? 1 : 0)).slice(0, 4).forEach(m => pool.push(() => add(m, `Senator from ${ST[m.state].name}`, { type: 'sen', id: m.id })));
  shuffle(Object.keys(S.governors).filter(c => S.governors[c].party === party)).slice(0, 3).forEach(c => pool.push(() => add(S.governors[c], `Governor of ${ST[c].name}`, { type: 'gov', code: c })));
  if (P.party === party && !withIncumbent) shuffle(CABINET_POSTS.slice(0, 5)).slice(0, 2).forEach(([post, title]) => { if (S.cabinet[post]) pool.push(() => add(S.cabinet[post], title, { type: 'cab', post })); });
  shuffle((S.reps || []).filter(r => r.party === party)).slice(0, 2).forEach(r => pool.push(() => add(r, `Representative (${r.district})`, { type: 'rep' })));
  formers.slice(0, 1).forEach(f => pool.push(() => add(f, f.cls ? `Former Senator from ${ST[f.state] ? ST[f.state].name : f.state}` : 'Former official', { type: 'former' })));
  const fill = n => { const order = shuffle(pool.slice()); while (field.length < n && order.length) order.shift()(); while (field.length < n) { const [o, office] = outsider(); add(o, office, { type: 'outsider' }); } };
  if (withIncumbent) {
    // a sitting President's strength rides on approval and on how much their own party has undermined them
    const a = P.approval;
    add(P, 'President of the United States', { type: 'pres' }, { charisma: clamp(1.15 + (a - 50) / 60 - (party === S.side ? (S.undermine || 0) * 0.06 : 0), 0.4, 1.5), money: a < 35 ? 1.25 : 1.35, cash: a < 35 ? 22 : 30, incumbent: true });
    fill(1 + (a <= 32 ? ri(1, 3) : a <= 45 ? ri(1, 2) : 1));
    // a weak President draws a heavyweight: someone who can actually take them out
    const ch = field.filter(f => !f.incumbent).sort((x, y) => y.charisma - x.charisma)[0];
    if (ch && a <= 40) Object.assign(ch, { charisma: rnd(a <= 32 ? 0.95 : 0.9, a <= 32 ? 1.3 : 1.15), money: rnd(1.05, 1.25), cash: ri(16, 24), heavy: true });
  } else {
    if (P.party === party && S.vp) add(S.vp, 'Vice President', { type: 'vp' }, { charisma: rnd(0.9, 1.3), money: rnd(1.05, 1.3) });
    fill(pick([2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 8, 9]));
  }
  field.forEach(f => { const fx = (FACTIONS[party].find(x => x[0] === f.faction) || [0, {}])[1]; f.msg = TAGS.slice().sort((a, b) => (fx[b] || 0) - (fx[a] || 0))[0]; });
  return field;
}

/* ---------------- the vote ---------------- */
// a candidate's pull in one state: talent, money, faction fit, home state, momentum and this round's campaign
function primStrength(R, f, code, noise) {
  const fx = (FACTIONS[f.party].find(x => x[0] === f.faction) || [0, {}])[1];
  let fit = 0; if (f.party === 'I') fit = indFit(f, code); else if (ST[code]) for (const t of TAGS) fit += (fx[t] || 0) * ST[code].voter[t] * 0.08;
  let s = f.charisma * f.money * clamp(1 + fit, 0.4, 1.8) * (f.state === code ? 1.6 : 1) * (1 + f.mo) * (R.endorsed && R.endorsed() === f.name ? 1.08 : 1);
  const pl = R.plans && R.plans[f.name];
  if (pl) s *= 1 + 0.09 * Math.min(pl.visits[code] || 0, 4) + 0.25 * (1 - Math.exp(-(pl.ads[code] || 0) / 12)) + (pl.favor.includes(code) ? 0.12 : 0) + (pl.msg && ST[code] ? 0.06 * (ST[code].voter[pl.msg] - 1) : 0);
  if (R.hits && R.hits[f.name]) s *= R.hits[f.name];
  s *= 1 + primNetwork(f, code) + (typeof wingPrimaryBoost === 'function' ? wingPrimaryBoost(f) : 0);
  return Math.max(0.03, s * (noise ? rnd(0.8, 1.2) : 1));
}
// a faction takes care of its own: same-faction senators and governors of the party campaign for the candidate in their state
// (the ambitious, who have their own plans, and anyone running against them are the exceptions)
function primNetwork(f, code) {
  let n = S.members.filter(m => m.party === f.party && m.state === code && m.faction === f.faction && m.name !== f.name && !T(m, 'ambitious')).length;
  const g = S.governors && S.governors[code]; if (g && g.party === f.party && g.faction === f.faction && g.name !== f.name) n++;
  return 0.07 * n;
}
function primShares(R, code, noise) {
  const act = R.field.filter(f => f.active), raw = act.map(f => primStrength(R, f, code, noise)), tot = raw.reduce((a, b) => a + b, 0) || 1;
  return act.map((f, i) => ({ f, pct: raw[i] / tot * 100 })).sort((a, b) => b.pct - a.pct);
}
function primaryPoll(R) {
  const act = R.field.filter(f => f.active); if (!act.length) return { _undecided: 0 };
  const tot = {}; act.forEach(f => tot[f.name] = 0);
  const keep = R.plans; R.plans = null; let w = 0;
  for (const code of Object.keys(EV)) { const ev = EV[code]; w += ev; primShares(R, code, false).forEach(x => tot[x.f.name] += x.pct * ev); }
  R.plans = keep;
  const undecided = Math.max(3, Math.round(16 - R.rounds.length * 1.5));
  const out = {}; for (const f of act) out[f.name] = tot[f.name] / w * (100 - undecided) / 100;
  out._undecided = undecided;
  return out;
}
function primTurnout(R, code) {
  if (R.party === 'I') return indTurnout(code);
  const sh = clamp(0.5 - stLean(code) / 70, 0.2, 0.8), share = R.party === 'D' ? sh : 1 - sh;
  return POP[code] * 1e6 * (PRIM_CAUCUS.includes(code) ? rnd(0.08, 0.12) : rnd(0.17, 0.26)) * share * (R.incumbentRace ? 0.75 : 1);
}

/* ---------------- campaigns: yours and the AI's ---------------- */
function primPlan(label) { return { visits: {}, ads: {}, favor: [], msg: null, msgSet: false, attack: null, debate: null, days: primDays(label), funded: 0, spent: 0, label }; }
function primAIPlan(R, f, label, states) {
  const pl = primPlan(label), ev = c => (EV[c] || 3) * (f.state === c ? 2.5 : 1) * rnd(0.5, 1.5);
  for (let d = 0; d < pl.days; d++) { let best = states[0], bw = -1; for (const c of states) { const w = ev(c) / (1 + (pl.visits[c] || 0)); if (w > bw) { bw = w; best = c; } } pl.visits[best] = (pl.visits[best] || 0) + 1; }
  let budget = Math.floor(f.cash * rnd(0.4, 0.7) / 3) * 3;
  while (budget >= 3) { const c = states.slice().sort((a, b) => ev(b) - ev(a))[0]; pl.ads[c] = (pl.ads[c] || 0) + 3; budget -= 3; f.cash -= 3; pl.spent += 3; }
  pl.msg = f.msg;
  const act = R.field.filter(x => x.active && x !== f).sort((a, b) => b.del - a.del || (R.poll ? (R.poll[b.name] || 0) - (R.poll[a.name] || 0) : 0));
  const leader = R.field.filter(x => x.active).sort((a, b) => b.del - a.del)[0];
  if (act.length && Math.random() < (leader === f ? 0.1 : 0.3)) pl.attack = (leader === f ? act[0] : leader).name;
  pl.debate = pick(Object.keys(PRIM_DEBATE_PLANS));
  return pl;
}
// a primary debate: talent, the game plan, and luck; moves momentum
function primDebate(R, label) {
  const act = R.field.filter(f => f.active); if (act.length < 2) return null;
  const leader = act.slice().sort((a, b) => b.del - a.del || (R.poll[b.name] || 0) - (R.poll[a.name] || 0))[0];
  const rows = act.map(f => {
    const plan = (R.plans[f.name] && R.plans[f.name].debate) || 'policy';
    const bonus = { attack: f === leader ? -0.05 : 0.15, policy: 0.08, unity: f === leader ? 0.12 : 0, zinger: gauss() * 0.3 }[plan];
    return { f, plan, score: f.charisma * 0.6 + bonus + gauss() * 0.28 };
  }).sort((a, b) => b.score - a.score);
  const mean = rows.reduce((a, r) => a + r.score, 0) / rows.length;
  rows.forEach(r => { r.d = clamp((r.score - mean) * 0.14, -0.1, 0.1); r.f.mo = clamp(r.f.mo + r.d, -0.35, 0.6); });
  const w = rows[0], l = rows[rows.length - 1];
  const target = w.f === leader ? rows[1].f : leader;
  const how = { attack: `went straight at ${lastName(target.p)} and drew blood`, policy: 'had a number for everything', unity: 'looked like the only adult on the stage', zinger: 'landed the line of the night' }[w.plan];
  const flop = { attack: 'swung wildly and hit nothing', policy: 'disappeared into talking points', unity: 'seemed to be somewhere else', zinger: 'tried a rehearsed zinger that died in the room' }[l.plan];
  return { city: PRIM_DEBATES[label], winner: w.f.name, rows: rows.map(r => ({ name: r.f.name, plan: r.plan, d: r.d })), text: `${w.f.name} ${how}; ${l.f.name} ${flop}.` };
}
// one contest night for one party
function primRunRound(R, label, states) {
  const act = R.field.filter(f => f.active);
  R.poll = R.poll || primaryPoll(R);
  for (const f of act) if (!R.plans[f.name]) R.plans[f.name] = primAIPlan(R, f, label, states);
  const news = [];
  // attacks land (or backfire) before the votes
  R.hits = {};
  for (const f of act) {
    const pl = R.plans[f.name], tg = pl.attack && R.field.find(x => x.name === pl.attack && x.active); if (!tg) continue;
    if (Math.random() < 0.25) { R.hits[f.name] = (R.hits[f.name] || 1) * 0.93; R.hits[tg.name] = (R.hits[tg.name] || 1) * 1.03; news.push(`💥 ${f.name}'s attack ads on ${lastName(tg.p)} <b>backfired</b>.`); }
    else { R.hits[tg.name] = (R.hits[tg.name] || 1) * 0.88; news.push(`🎯 ${f.name} went negative on ${lastName(tg.p)}, and it stuck.`); }
  }
  const debate = PRIM_DEBATES[label] ? primDebate(R, label) : null;
  if (debate) news.unshift(`🎤 <b>Debate in ${debate.city}:</b> ${debate.text}`);
  const exp = {}, out = { label, states, news, debate, results: [] };
  const expTot = {}, actTot = {}; act.forEach(f => { expTot[f.name] = 0; actTot[f.name] = 0; });
  for (const code of states) {
    const e = primShares(R, code, false); exp[code] = Object.fromEntries(e.map(x => [x.f.name, x.pct]));
    const sh = primShares(R, code, true), tv = primTurnout(R, code);
    const rows = sh.map(x => ({ f: x.f, votes: Math.round(tv * x.pct / 100) }));
    const total = rows.reduce((a, r) => a + r.votes, 0) || 1;
    rows.forEach(r => r.pct = r.votes / total * 100);
    const delTot = (EV[code] || 3) * 10; let elig = rows.filter(r => r.pct >= 15); if (!elig.length) elig = rows.slice(0, 2);
    const et = elig.reduce((a, r) => a + r.pct, 0) || 1; rows.forEach(r => r.del = elig.includes(r) ? Math.round(delTot * r.pct / et) : 0);
    rows.forEach(r => { r.f.del += r.del; r.f.votes += r.votes; expTot[r.f.name] += (exp[code][r.f.name] || 0) / 100 * total; actTot[r.f.name] += r.votes; });
    rows[0].f.wins++;
    const favorite = e[0].f, margin = rows[0].pct - (rows[1] ? rows[1].pct : 0);
    const rec = { code, total, delTot, caucus: PRIM_CAUCUS.includes(code), margin, upset: rows[0].f !== favorite && act.length > 1, rows: rows.map(r => ({ name: r.f.name, color: r.f.color, votes: r.votes, pct: r.pct, del: r.del, poll: exp[code][r.f.name] || 0 })) };
    R.results[code] = rec; out.results.push(rec);
  }
  // momentum: beating (or missing) expectations matters as much as winning
  const roundVotes = Object.values(actTot).reduce((a, b) => a + b, 0) || 1;
  for (const f of act) {
    const diff = (actTot[f.name] - expTot[f.name]) / roundVotes * 100, wonHere = out.results.filter(r => r.rows[0].name === f.name).length;
    f.lastDiff = diff; f.lastShare = actTot[f.name] / roundVotes * 100;
    f.mo = clamp(f.mo * 0.8 + clamp(diff * 0.012, -0.12, 0.15) + wonHere / states.length * 0.06, -0.35, 0.6);
    f.cash = Math.round(f.cash + 1.5 + 3 * f.money + wonHere * 2 + Math.max(0, diff) * 0.4);
  }
  // the story of the night
  const upsets = out.results.filter(r => r.upset), photos = out.results.filter(r => r.margin < 1.5);
  if (states.length === 1) {
    const r = out.results[0], w = r.rows[0], s2 = r.rows[1];
    out.headline = r.margin < 1.5 ? `PHOTO FINISH IN ${stName(r.code).toUpperCase()}` : r.upset ? `UPSET: ${lastName({ name: w.name }).toUpperCase()} STUNS ${stName(r.code).toUpperCase()}` : `${lastName({ name: w.name }).toUpperCase()} WINS ${stName(r.code).toUpperCase()}`;
    out.sub = `${w.name} ${pct(w.pct)}${s2 ? `, ${s2.name} ${pct(s2.pct)}` : ''}: a margin of ${primN(w.votes - (s2 ? s2.votes : 0))} votes out of ${primN(r.total)} cast.`;
  } else {
    const byWins = {}; out.results.forEach(r => byWins[r.rows[0].name] = (byWins[r.rows[0].name] || 0) + 1);
    const top = Object.entries(byWins).sort((a, b) => b[1] - a[1])[0], dels = {}; out.results.forEach(r => r.rows.forEach(x => dels[x.name] = (dels[x.name] || 0) + x.del));
    const dl = Object.entries(dels).sort((a, b) => b[1] - a[1])[0], big = out.results.slice().sort((a, b) => b.delTot - a.delTot)[0];
    out.headline = top[1] === states.length ? `${label.toUpperCase()} SWEEP FOR ${lastName({ name: top[0] }).toUpperCase()}` : `${label.toUpperCase()}: ${lastName({ name: top[0] }).toUpperCase()} TAKES ${top[1]} OF ${states.length}`;
    out.sub = `${dl[0]} wins the most delegates (${primN(dl[1])}); ${stName(big.code)}, the biggest prize, goes to ${big.rows[0].name} by ${big.margin.toFixed(1)} points.`;
  }
  upsets.slice(0, 3).forEach(r => news.push(`⚡ <b>Upset in ${stName(r.code)}:</b> ${r.rows[0].name} beat a final poll that had them at ${r.rows[0].poll.toFixed(0)}%.`));
  photos.slice(0, 2).forEach(r => news.push(`📸 <b>${stName(r.code)}</b> came down to ${primN(r.rows[0].votes - r.rows[1].votes)} votes.`));
  const surge = act.filter(f => f.active).sort((a, b) => b.lastDiff - a.lastDiff);
  if (surge[0] && surge[0].lastDiff >= 4) news.push(`📈 ${surge[0].name} beat expectations by ${surge[0].lastDiff.toFixed(1)} points and the money is pouring in.`);
  const sink = surge[surge.length - 1]; if (sink && sink !== surge[0] && sink.lastDiff <= -4) news.push(`📉 ${sink.name} ran ${(-sink.lastDiff).toFixed(1)} points behind the polls. Donors are nervous.`);
  R.plans = {}; R.hits = null;
  R.rounds.push(out);
  primDropouts(R, label, news);
  R.poll = primaryPoll(R);
  return out;
}
function primDropouts(R, label, news) {
  const i = R.rounds.length, P = S.president;
  const dropOut = (f, why) => {
    f.active = false; f.out = label; f.why = why;
    const act = R.field.filter(x => x.active).sort((a, b) => b.del - a.del); if (!act.length) return;
    const kin = act.filter(x => x.faction === f.faction), to = kin.length && Math.random() < 0.8 ? kin[0] : Math.random() < 0.7 ? act[0] : pick(act);
    f.backed = to.name; f.released = f.del; to.del += f.del; f.del = 0;
    if (to.faction === f.faction) news.push(`🤝 The ${f.faction} close ranks: ${f.name}'s supporters move to ${to.name}.`);
    news.push(`🚪 <b>${f.name} ${why === 'withdrew' ? 'withdraws from the race' : why === 'consolidated' ? `steps aside so the ${f.faction} can unite` : 'drops out'}</b>${f.released ? ` and releases ${primN(f.released)} delegates to ${to.name}` : `, endorsing ${to.name}`}.`);
  };
  const ranked = () => R.field.filter(f => f.active).sort((a, b) => b.del - a.del);
  // a battered President can walk away
  const inc = R.field.find(f => f.incumbent && f.active), lead = ranked()[0];
  if (inc && i >= 2 && P.approval < 34 && lead !== inc && inc.del < lead.del * 0.5 && Math.random() < 0.2) { dropOut(inc, 'withdrew'); news.unshift(`🏛️ <b>${presTitle()} will not seek re-election.</b> A sitting President bows out after ${label}.`); }
  // a faction consolidates behind its strongest candidate, unless the weaker one is ambitious, the President, or your candidate
  if (i >= 2) for (const [fac] of FACTIONS[R.party] || []) {
    const lane = ranked().filter(f => f.faction === fac); if (lane.length < 2) continue;
    for (const f of lane.slice(1)) if (!f.incumbent && !(f.p && f.p.traits && T(f.p, 'ambitious')) && !(R.endorsed && R.endorsed() === f.name) && Math.random() < 0.35) dropOut(f, 'consolidated');
  }
  // the broke and the beaten quit early; the field narrows to the serious after the early states
  for (const f of ranked().slice(1)) if (!f.incumbent && i >= 2 && f.cash < 3 && f.lastShare < 6) dropOut(f, 'broke');
  if (i >= 4) { const act = ranked(); act.slice(2).forEach(f => { if (f.del < act[0].del * 0.25 && !f.incumbent) dropOut(f, 'beaten'); }); }
  // after the sixth contest it's a two-way race, unless a third candidate has won enough to stay in through June
  if (i >= 6) { const act = ranked(); act.slice(2).forEach(f => { if (!f.incumbent && !(f.wins >= 4 && f.del >= act[0].del * 0.5)) dropOut(f, 'beaten'); }); }
}
function runPrimaryFor(party, endorsed, withIncumbent) {
  const field = primaryField(party, withIncumbent), totalDel = primTotalDel(), need = Math.floor(totalDel / 2) + 1;
  const R = { party, field, results: {}, need, totalDel, rounds: [], plans: {}, i: 0, endorsed, incumbentRace: !!withIncumbent, poll: null };
  R.poll = primaryPoll(R);
  R.nextContest = () => { if (R.i >= PRIMARY_CAL.length) return false; const [label, states] = PRIMARY_CAL[R.i++]; primRunRound(R, label, states); return label; };
  R.done = () => R.i >= PRIMARY_CAL.length || field.some(f => f.del >= need);
  R.contested = () => !field.some(f => f.del >= need);
  return R;
}

/* ---------------- the screens ---------------- */
function primDetailHTML(R, code) {
  const r = R.results[code]; if (!r) return '';
  const w = r.rows[0];
  return `<div class="prim-detail"><div class="prim-dh"><b>${stName(code)} ${r.caucus ? 'caucuses' : 'primary'}</b><span>${R.party === 'I' ? 'Independent Ballot Alliance' : PARTY[R.party].name} · ${primN(r.delTot)} delegates · 100% reporting</span>${r.upset ? '<span class="prim-tag up">UPSET</span>' : ''}${r.margin < 1.5 ? '<span class="prim-tag ph">PHOTO FINISH</span>' : ''}</div>
    <table class="prim-table"><thead><tr><th>Candidate</th><th>Votes</th><th>Share</th><th>Final poll</th><th>Delegates</th></tr></thead><tbody>
    ${r.rows.map((x, i) => `<tr class="${i === 0 ? 'win' : ''}"><td><span class="dot" style="background:${x.color}"></span>${x.name}${i === 0 ? ' <span class="check">✓</span>' : ''}</td><td>${primN(x.votes)}</td><td><b>${pct(x.pct)}</b><span class="prim-bar"><i style="width:${x.pct}%;background:${x.color}"></i></span></td><td class="${x.pct - x.poll >= 3 ? 'beat' : x.pct - x.poll <= -3 ? 'miss' : ''}">${x.poll.toFixed(0)}% <small>(${x.pct - x.poll >= 0 ? '+' : '−'}${Math.abs(x.pct - x.poll).toFixed(1)})</small></td><td>${x.del ? primN(x.del) : '—'}</td></tr>`).join('')}
    </tbody></table><div class="nsub">${primN(r.total)} votes cast · ${w.name} wins by ${primN(w.votes - (r.rows[1] ? r.rows[1].votes : 0))} votes (${r.margin.toFixed(1)} points)${r.rows.some(x => x.pct < 15 && x.pct > 0) ? ' · candidates under 15% win no delegates' : ''}</div></div>`;
}
function primariesModal(done) {
  const P = S.president, year = billYear(S.career.bills + 1), mine = S.side, theirs = other(mine);
  const running = P.terms < 2;
  // does each party have a real contest? A sitting President draws challengers when weak (or when you recruit one)
  const contest = {}, challenged = {};
  for (const p of ['D', 'R']) {
    if (P.party !== p || !running) { contest[p] = true; continue; }
    challenged[p] = (p === mine && !!S.challenger) || Math.random() < primChallengeOdds(P.approval - (p === mine ? (S.undermine || 0) * 2 : 0));
    contest[p] = challenged[p];
  }
  let endorsed = null, lastLabel = '', view = contest[mine] ? mine : theirs, screen = 'board', hqPlan = null, note = '';
  const endorsedHist = [], sel = { D: null, R: null, I: null }, state = {};
  const myEnd = () => endorsed;
  for (const p of ['D', 'R']) state[p] = contest[p] ? runPrimaryFor(p, p === mine ? myEnd : null, !!challenged[p]) : null;
  // the independents' Ballot Alliance runs its own contests on the same dates (indie.js); IR.none = no field this year
  const IR = typeof indPrimaryFor === 'function' ? indPrimaryFor(year) : null;
  state.I = IR && !IR.none ? IR : null;
  const allDone = () => ['D', 'R'].every(p => !state[p] || state[p].done());
  const myRace = () => state[mine];
  const myCand = () => { const R = myRace(); return R && endorsed ? R.field.find(f => f.name === endorsed) : null; };
  const playing = () => { const f = myCand(); return !!(f && f.active && !myRace().done()); };
  const nextLabel = () => { const i = PRIMARY_CAL.findIndex(c => c[0] === lastLabel); return PRIMARY_CAL[i + 1] ? PRIMARY_CAL[i + 1] : null; };
  const autoMine = () => { const f = myCand(), R = myRace(), nx = nextLabel(); if (f && f.active && R && !R.done() && nx && !R.plans[f.name]) R.plans[f.name] = primAIPlan(R, f, nx[0], nx[1]); };
  const step = () => {
    let lbl = null;
    for (const p of ['D', 'R']) if (state[p] && !state[p].done()) lbl = state[p].nextContest() || lbl;
    if (!lbl) { const nx = nextLabel(); lbl = nx ? nx[0] : lastLabel; }
    lastLabel = lbl; hqPlan = null;
    if (state.I) indCatchUp(state.I, allDone() ? null : lbl);
    for (const p of ['D', 'R', 'I']) { const R = state[p]; if (R && R.rounds.length) { const last = R.rounds[R.rounds.length - 1]; if (last.label === lbl) sel[p] = last.results.slice().sort((a, b) => a.margin - b.margin)[0].code; } }
    const f = myCand(); if (endorsed && f && !f.active) note = `${f.name} is out of the race. Endorse someone still running to take over their campaign, or sit out the rest.`;
  };
  // the end of the primaries: delegate leaders, runners-up and whether anyone actually clinched.
  const finishAll = () => {
    while (!allDone()) { autoMine(); step(); }
    const totalDel = primTotalDel(), need = Math.floor(totalDel / 2) + 1;
    S.nominees = { conventionsDone: false, ranked: endorsedHist.slice() };
    const lines = [];
    for (const p of ['D', 'R']) {
      let nom, office, charisma = 1.05, del = totalDel, runnerUp = null, contested = false, others = [];
      if (!state[p]) { nom = P; office = 'President of the United States'; hist(P, 'Renominated for President without serious opposition'); }
      else {
        const sorted = state[p].field.slice().sort((a, b) => b.del - a.del), f = sorted[0], r = sorted[1];
        nom = f.p; office = f.office; charisma = f.charisma; del = f.del; contested = state[p].contested();
        if (r) runnerUp = { name: r.name, faction: r.faction, del: r.del, p: r.p, office: r.office, state: r.state, charisma: r.charisma };
        others = sorted.slice(2).filter(x => x.del > 0).map(x => ({ name: x.name, faction: x.faction, del: x.del, office: x.office, state: x.state }));
        const incF = state[p].field.find(x => x.incumbent);
        if (contested) {
          hist(f.p, `Led the ${year} ${PARTY[p].name} primaries with ${primN(f.del)} delegates, short of a majority`);
          if (r) hist(r.p, `Carried ${primN(r.del)} delegates into a contested ${year} ${PARTY[p].name} convention`);
          lines.push(`<b>The ${PARTY[p].short} head for an open convention:</b> ${f.name} leads with ${primN(f.del)} delegates${r ? `, ${r.name} holds ${primN(r.del)}` : ''}, and nobody has the ${primN(need)} needed.`);
        } else if (f.incumbent) { hist(P, `Survived a primary challenge to win renomination, ${f.wins} states to ${sorted.slice(1).reduce((a, x) => a + x.wins, 0)}`); lines.push(`${presTitle()} beat back the primary challenge in the ${PARTY[p].name} race.`); }
        else {
          hist(f.p, `Clinched the ${year} ${PARTY[p].name} presidential nomination with ${primN(f.del)} delegates and ${primN(f.votes)} votes`);
          if (incF) { hist(P, incF.why === 'withdrew' ? `Withdrew from the ${year} race for re-election after ${incF.out}` : `Lost the ${year} ${PARTY[p].name} primary to ${f.name}`); lines.push(incF.why === 'withdrew' ? `<b>A sitting President bowed out:</b> ${presTitle()} quit after ${incF.out}, and ${f.name} took the nomination.` : `<b>A sitting President falls:</b> ${presTitle()} loses the ${PARTY[p].name} nomination to ${f.name}.`); }
        }
        state[p].field.filter(x => x !== f && !x.incumbent && !(contested && x === r)).forEach(x => hist(x.p, `Ran for President in ${year}; ${x.out ? `dropped out after ${x.out}` : 'lost the nomination'} (${primN(x.votes)} votes)`));
        if (p === mine && endorsed) {
          const won = f.name === endorsed, verb = contested ? 'leads the delegate count into the convention' : 'won the nomination';
          if (won) {
            S.career.capital += 4; addLegacy(8); if (!contested) unlock('campaign');
            lines.push(`<b>Your campaign:</b> ${f.name} ${verb} (+4 capital).`);
            if (incF && !f.incumbent) unlock('regicide');
          } else {
            S.career.capital = Math.max(0, S.career.capital - 1); lines.push(`<b>Your campaign fell short:</b> ${endorsed} lost to ${f.name} (−1 capital).`);
            if (f.incumbent) { for (const m of S.members) if (m.party === mine && m.faction === P.faction) m.rel -= 1; S.career.capital = Math.max(0, S.career.capital - 1); lines.push(`${presTitle()} won't forget who ran the challenge: the President's faction cools on you (−1 relationship, −1 capital).`); }
          }
        }
      }
      S.nominees[p] = { p: nom, name: nom.name, state: nom.state, faction: nom.faction || pick(FACTIONS[p])[0], office, charisma, del, runnerUp, others, contested, vp: null };
    }
    S.challenger = false; S.undermine = 0;
    const n = S.nominees, outParty = other(P.party);
    const ind = typeof indFinish === 'function' ? indFinish(IR, state, n, year) : null;
    const head = p => n[p].contested ? `NO ONE CLINCHES: A CONTESTED ${PARTY[p].name.toUpperCase()} CONVENTION LOOMS` : `${lastName(n[p].p).toUpperCase()} CLINCHES THE ${PARTY[p].name.toUpperCase()} NOMINATION`;
    const headline = n.D.contested && n.R.contested ? 'NO ONE CLINCHES: TWO CONTESTED CONVENTIONS LOOM' : head(mine);
    const para = p => {
      const N = n[p], ru = N.runnerUp;
      if (!state[p]) return `${PARTY[p].short}: ${presTitle()} was renominated without serious opposition and arrives at the convention with all ${primN(totalDel)} delegates in hand.`;
      if (N.contested) return `${PARTY[p].short}: the June primaries end with ${N.name} (${N.office}) at ${primN(N.del)} delegates${ru ? `, ${ru.name} at ${primN(ru.del)}` : ''} and ${primN(need)} needed. The nomination will be settled on the convention floor.`;
      return `${PARTY[p].short}: ${N.name} (${N.office}) clinched with ${primN(N.del)} of ${primN(totalDel)} delegates${ru ? `; ${ru.name} finished second with ${primN(ru.del)}` : ''}.`;
    };
    const sub = `${n[theirs].contested ? `Across the aisle, the ${PARTY[theirs].short} have no majority${n[mine].contested ? ' either' : ''}.` : `Across the aisle, ${n[theirs].name} is the ${PARTY[theirs].name} nominee-in-waiting.`} The conventions open this summer: the ${PARTY[outParty].short} in late July, the ${PARTY[P.party].short} in August.`;
    const showNominees = () => {
      const major = ind && ind.major;
      showModal(`${frontPage({ headline, sub, body: [major ? `<b>Breaking:</b> ${major.name} (${major.office}) is launching an independent campaign for President. <i>See the extra edition.</i>` : '', para(mine), para(theirs), ...lines, ind ? ind.line : '', endorsed || !contest[mine] ? '' : 'You stayed neutral in your party\'s primary.', 'Running mates, platforms and the first real polls of the fall all wait on the conventions.'].filter(Boolean), mood: 'dawn', date: `June ${year} · End of the primaries` })}
      <div class="choices"><button class="btn ghost" id="nprof1">Profile: ${n.D.name}</button><button class="btn ghost" id="nprof2">Profile: ${n.R.name}</button>${n.I && !major ? `<button class="btn ghost" id="nprof3">Profile: ${n.I.name}</button>` : ''}${ind && ind.conv ? '<button class="btn ghost" id="nconv">The Alliance convention</button>' : ''}${major ? `<button class="btn primary big adv" id="primbreak">Extra: ${lastName(major.p)} launches an independent bid ▶</button>` : '<button class="btn primary big adv" id="primdone">On to the summer</button>'}</div>`);
      $('#nprof1').onclick = () => profileModal(n.D.p, n.D.contested ? 'Democratic delegate leader' : 'Democratic nominee', showNominees);
      $('#nprof2').onclick = () => profileModal(n.R.p, n.R.contested ? 'Republican delegate leader' : 'Republican nominee', showNominees);
      if ($('#nprof3')) $('#nprof3').onclick = () => profileModal(n.I.p, `${n.I.label} nominee`, showNominees);
      if ($('#nconv')) $('#nconv').onclick = () => indConvModal(ind.conv, IR, year, showNominees);
      if ($('#primdone')) $('#primdone').onclick = done;
      if ($('#primbreak')) $('#primbreak').onclick = () => { sfx.gavel(); showLaunch(); };
    };
    // the rare major independent gets an extra edition of its own
    const showLaunch = () => {
      const I = n.I;
      showModal(`${indLaunchHTML(I, year)}
      <div class="choices"><button class="btn ghost" id="nprofI">Profile: ${I.name}</button><button class="btn ghost" id="nback">Back to the nominees</button><button class="btn primary big adv" id="primdone">On to the summer</button></div>`);
      $('#nprofI').onclick = () => profileModal(I.p, 'Independent candidate for President', showLaunch);
      $('#nback').onclick = showNominees;
      $('#primdone').onclick = done;
    };
    showNominees();
  };

  /* ---- the campaign HQ: you run your endorsed candidate's campaign for the next contest ---- */
  const drawHQ = () => {
    const R = myRace(), f = myCand(), [label, states] = nextLabel();
    if (!hqPlan) { hqPlan = primPlan(label); hqPlan.msg = f.msg; R.plans[f.name] = hqPlan; }
    const pl = hqPlan, poll = R.poll || primaryPoll(R), cap = S.career.capital, rivals = R.field.filter(x => x.active && x !== f);
    const statePoll = code => { const sh = primShares(R, code, false), me = sh.findIndex(x => x.f === f); return sh.slice(0, 4).concat(me >= 4 ? [sh[me]] : []).map((x, i) => `<span style="color:${x.f.color};${x.f === f ? 'font-weight:800' : ''}">${i === 0 ? '' : ' · '}${lastName(x.f.p)} ${x.pct.toFixed(0)}</span>`).join(''); };
    const debate = PRIM_DEBATES[label];
    const sc = $('#modal-card') ? $('#modal-card').scrollTop : 0, same = screen === 'hq' && $('#modal-card') && /Campaign HQ/.test(($('#modal-card .kicker') || {}).textContent || '');
    showModal(`<div class="kicker">${year} · Presidential primaries · Campaign HQ</div><h2>Campaigning for ${label}</h2>
      <div class="prim-hqcand" style="border-color:${f.color}"><span class="cp">${portrait(f.p)}</span><span style="flex:1"><b style="color:${f.color}">${f.name}</b> <small>· ${f.office} · ${f.faction}</small><br>
        <small>${primN(f.del)} delegates of ${primN(R.need)} · polling ${(poll[f.name] || 0).toFixed(0)}% nationally · ${f.wins} state${f.wins === 1 ? '' : 's'} won · momentum ${f.mo > 0.1 ? '<b style="color:var(--yes)">▲ surging</b>' : f.mo < -0.08 ? '<b style="color:var(--no)">▼ fading</b>' : 'steady'}</small></span>
        <span class="prim-res"><b>${pl.days}</b><small>days left</small></span><span class="prim-res"><b>$${f.cash}M</b><small>war chest</small></span><span class="prim-res"><b>${cap}</b><small>your capital</small></span></div>
      <p>You endorsed ${lastName(f.p)}, so the campaign takes your calls. ${label} votes ${states.length > 1 ? `in ${states.length} states for ${primN(states.reduce((a, c) => a + (EV[c] || 3) * 10, 0))} delegates` : `for ${primN((EV[states[0]] || 3) * 10)} delegates`}. A day on the ground is worth about +9% of your strength in that state (up to four days), $3M of ads up to +25%, and a favor from the party's governors and senators +12%. Rivals plan their own weeks; you won't see their moves until the votes are counted.</p>
      ${note ? `<p class="prim-note">${note}</p>` : ''}
      <div class="prim-hq"><table class="prim-table hq"><thead><tr><th>State</th><th>Delegates</th><th>State poll (with your plan)</th><th>Days</th><th>Ads</th><th></th></tr></thead><tbody>
      ${states.map(code => `<tr><td><b>${code}</b> ${stName(code)}${f.state === code ? ' 🏠' : ''}${PRIM_CAUCUS.includes(code) ? ' <small>caucus</small>' : ''}</td><td>${primN((EV[code] || 3) * 10)}</td><td class="prim-sp">${statePoll(code)}</td><td>${pl.visits[code] || 0}</td><td>${pl.ads[code] ? `$${pl.ads[code]}M` : '—'}</td>
        <td class="prim-acts"><button class="btn" data-choice="visit:${code}" ${pl.days < 1 || (pl.visits[code] || 0) >= 4 ? 'disabled' : ''}>+ Day</button><button class="btn" data-choice="ad:${code}" ${f.cash < 3 ? 'disabled' : ''}>+ $3M ads</button><button class="btn" data-choice="favor:${code}" ${cap < 1 || pl.favor.includes(code) ? 'disabled' : ''}>Call in a favor<small>1 cap</small></button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="prim-hqrow"><b>📣 The message</b> <small style="color:var(--dim)">Plays better where voters care about it. ${pl.msgSet ? 'Set for this contest.' : 'You can change it once per contest.'}</small><div class="prim-tags">${TAGS.map(t => `<button class="btn ${pl.msg === t ? 'on' : ''}" ${pl.msg === t ? '' : `data-choice="msg:${t}"`} ${pl.msgSet && pl.msg !== t ? 'disabled' : ''}>${TAG[t][0]} ${TAG[t][1]}</button>`).join('')}</div></div>
      <div class="prim-hqrow"><b>🎯 Go negative</b> <small style="color:var(--dim)">One attack per contest: a day and $2M. Usually knocks the target down about 12% everywhere this round; one time in four it backfires.</small><div class="prim-tags">${pl.attack ? `<span>Attacking <b>${pl.attack}</b></span>` : rivals.map(x => `<button class="btn" data-choice="attack:${R.field.indexOf(x)}" ${pl.days < 1 || f.cash < 2 ? 'disabled' : ''} style="border-color:${x.color}">${x.name}</button>`).join('') || '<small>No rivals left.</small>'}</div></div>
      <div class="prim-hqrow"><b>💵 Fundraise</b> <small style="color:var(--dim)">A day with donors instead of voters: $${Math.round(2.5 * f.money)}–${Math.round(4.5 * f.money * (1 + Math.max(0, f.mo)))}M.</small> <button class="btn" data-choice="fund" ${pl.days < 1 ? 'disabled' : ''}>Spend a day dialing for dollars</button>${pl.funded ? ` <small>Raised $${pl.funded}M so far.</small>` : ''}</div>
      ${debate ? `<div class="prim-hqrow"><b>🎤 The ${debate} debate</b> <small style="color:var(--dim)">Before the votes. Pick the game plan.</small><div class="prim-tags">${Object.entries(PRIM_DEBATE_PLANS).map(([k, [t, s]]) => `<button class="btn ${pl.debate === k ? 'on' : ''}" ${pl.debate ? '' : `data-choice="deb:${k}"`} ${pl.debate && pl.debate !== k ? 'disabled' : ''}>${t}<small>${s}</small></button>`).join('')}</div></div>` : ''}
      <div class="choices"><button class="btn primary big adv" id="pnight">Election night: ${label} ▶</button><button class="btn ghost" id="pback">Back to the race</button><button class="btn ghost" id="pskip">Skip to the end</button></div>`);
    if (same) $('#modal-card').scrollTop = sc;
    screen = 'hq';
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => {
      const [k, v] = b.dataset.choice.split(':');
      if (k === 'visit' && pl.days >= 1 && (pl.visits[v] || 0) < 4) { pl.visits[v] = (pl.visits[v] || 0) + 1; pl.days--; }
      else if (k === 'ad' && f.cash >= 3) { pl.ads[v] = (pl.ads[v] || 0) + 3; f.cash -= 3; pl.spent += 3; }
      else if (k === 'favor' && S.career.capital >= 1 && !pl.favor.includes(v)) { S.career.capital--; pl.favor.push(v); const g = S.governors[v]; if (g && g.party === mine) hist(g, `Endorsed ${f.name} for President at the whip's request`); }
      else if (k === 'msg' && !pl.msgSet) { pl.msg = v; pl.msgSet = true; f.msg = v; }
      else if (k === 'attack' && pl.days >= 1 && f.cash >= 2 && !pl.attack) { const t = R.field[+v]; if (t) { pl.attack = t.name; pl.days--; f.cash -= 2; } }
      else if (k === 'fund' && pl.days >= 1) { const got = Math.round(rnd(2.5, 4.5) * f.money * (1 + Math.max(0, f.mo))); f.cash += got; pl.funded += got; pl.days--; }
      else if (k === 'deb' && !pl.debate) pl.debate = v;
      else return;
      sfx.click(); drawHQ();
    });
    $('#pnight').onclick = () => { step(); sfx.gavel(); screen = 'board'; draw(); };
    $('#pback').onclick = () => { screen = 'board'; draw(); };
    $('#pskip').onclick = () => { while (!allDone()) { autoMine(); step(); } screen = 'board'; draw(); };
  };

  /* ---- the board: the race, the latest results, every state's full count ---- */
  const draw = () => {
    const R = state[view], yours = view === mine;
    const tabs = `<div class="ptabs">${[mine, theirs].map(p => `<button class="btn ${view === p ? 'on' : ''}" data-pview="${p}" style="border-color:${PARTY[p].color}">${PARTY[p].short}${p === mine ? ' (your party)' : ' (watch only)'}</button>`).join('')}${IR ? `<button class="btn ${view === 'I' ? 'on' : ''}" data-pview="I" style="border-color:${PARTY.I.color}">Independents${state.I ? ` (${state.I.field.filter(f => f.active).length} running)` : ' (no field)'}</button>` : ''}</div>`;
    const nx = nextLabel();
    const nextBtn = allDone() ? '<button class="btn primary big adv" id="pfin">See the nominees</button>' : `<button class="btn primary big adv" id="pnext">${playing() ? `Campaign for ${nx ? nx[0] : 'the final contests'} ▶` : `Next: ${nx ? nx[0] : 'final contests'} votes ▶`}</button><button class="btn ghost" id="pskip">Skip to the end</button>`;
    const controls = `<div class="choices">${nextBtn}</div>`;
    if (!R && view === 'I') showModal(`<div class="kicker">${year} · Presidential primaries</div><h2>The independents</h2>${tabs}${indNoFieldHTML(IR, year)}${controls}`);
    else if (!R) {
      showModal(`<div class="kicker">${year} · Presidential primaries</div><h2>${PARTY[view].name} primary</h2>${tabs}
        <div class="race"><span class="nomp">${portrait(P)}</span><span>${presTitle()} (approval ${P.approval}%) is running for re-election with no serious challenge${view === mine ? '. To change that, you\'d have to undermine the President and recruit a challenger from the whip\'s office before primary season.' : '.'}</span></div>${controls}`);
    } else {
      const field = R.field.slice().sort((a, b) => b.del - a.del || (R.poll[b.name] || 0) - (R.poll[a.name] || 0));
      const poll = R.poll || (R.poll = primaryPoll(R));
      const last = R.rounds[R.rounds.length - 1];
      const selCode = sel[view] && R.results[sel[view]] ? sel[view] : last ? last.results[0].code : null;
      const started = lastLabel !== '', f0 = yours ? myCand() : null;
      const canEndorse = yours && (!f0 || !f0.active);
      const inc = R.field.find(x => x.incumbent);
      const intro = yours
        ? `<p>${primN(R.need)} delegates to win. ${R.field.length} candidate${R.field.length === 1 ? '' : 's'}${inc ? `, including ${presTitle()}, who drew ${R.field.length - 1 === 1 ? 'a challenger' : `${R.field.length - 1} challengers`} at ${P.approval}% approval` : ''}. <b>Endorse one and you run their campaign:</b> before each contest you plan their days on the ground, ads, attacks, message and debate strategy. If your candidate wins the nomination, +4 capital; if they lose, −1. ${started ? 'Switching horses mid-race costs 1 capital (free if your candidate has dropped out).' : 'Endorse freely until Iowa votes.'}</p>
           ${f0 ? `<div class="rankbar">Your candidate: <span class="rk ${f0.active ? '' : 'gone'}" style="border-color:${f0.color}">${f0.name}${f0.active ? '' : ' (out)'}</span>${f0.active ? '' : ' <i>pick someone still running, or sit out the rest</i>'}</div>` : ''}${note && yours ? `<p class="prim-note">${note}</p>` : ''}`
        : view === 'I' ? indIntroHTML(R) : `<p>${primN(R.need)} delegates to win. You're watching from across the aisle${inc ? `, and ${presTitle()} is fighting off a primary challenge` : ''}.</p>`;
      const banner = last ? `<div class="prim-banner" style="--pc:${PARTY[view].color}"><small>${last.label} · ${PARTY[view].name} results</small><b>${last.headline}</b><span>${last.sub}</span></div>` : '';
      const news = last && last.news.length ? `<div class="prim-news">${last.news.map(t => `<p>${t}</p>`).join('')}</div>` : '';
      const srow = code => { const r = R.results[code]; if (!r) return ''; const w = r.rows[0]; return `<div class="prow prim-srow ${code === selCode ? 'on' : ''}" data-pstate="${code}"><span><b>${code}</b> ${stName(code)} <small>${primN(r.delTot)} del.</small>${r.upset ? ' <span class="prim-tag up">UPSET</span>' : ''}${r.margin < 1.5 ? ' <span class="prim-tag ph">CLOSE</span>' : ''}</span><span><b style="color:${w.color}">${lastName({ name: w.name })} ${w.pct.toFixed(1)}%</b> · +${r.margin.toFixed(1)} · ${primN(r.total)} votes</span></div>`; };
      const mapHTML = usMap({
        fill: code => { const r = R.results[code]; return r ? { c: r.rows[0].color, op: 0.5 + Math.min(0.5, r.margin / 30) } : null; },
        sub: code => R.results[code] ? lastName({ name: R.results[code].rows[0].name }).slice(0, 7) : '',
        ring: code => code === selCode ? '#fff' : view === 'I' && !R.results[code] && IND_CAL.some(c => c[1].includes(code)) ? PARTY.I.color : null,
        attr: code => R.results[code] ? `data-pstate="${code}"` : '',
        title: code => R.results[code] ? `${stName(code)}: ${R.results[code].rows.map(x => `${lastName({ name: x.name })} ${x.pct.toFixed(1)}% (${primN(x.votes)})`).join(', ')}` : stName(code),
      });
      const cands = field.map(f => {
        const idx = R.field.indexOf(f), mineF = yours && f.name === endorsed;
        const endBtn = yours && f.active && !mineF && canEndorse ? `<button class="btn" data-choice="endorse:${idx}">Endorse &amp; run the campaign</button>` : yours && f.active && !mineF && f0 && f0.active ? `<button class="btn ghost" data-pswitch="${idx}" ${started && S.career.capital < 1 ? 'disabled' : ''}>Switch to them${started ? ' (1 cap)' : ''}</button>` : '';
        const mo = f.mo > 0.1 ? ' <b style="color:var(--yes)">▲</b>' : f.mo < -0.08 ? ' <b style="color:var(--no)">▼</b>' : '';
        return `<div class="cand2 ${f.active ? '' : 'out'} ${mineF ? 'prim-mine' : ''}" style="${mineF ? `border-color:${f.color}` : ''}"><span class="cp">${portrait(f.p)}</span><span style="flex:1"><b style="color:${f.color}">${f.name}</b>${f.label ? ' ' + indPill(f.label) : ''}${mineF ? ' <b class="prim-you">YOUR CAMPAIGN</b>' : ''}${f.heavy ? ' <small class="prim-tag up">HEAVYWEIGHT</small>' : ''} <small>· ${f.office}${f.party === 'I' ? '' : ` · ${f.faction}`}${f.active ? '' : f.why === 'withdrew' ? ` · withdrew after ${f.out}` : ` · dropped out after ${f.out}`}</small>
          <div class="dbar"><i style="width:${Math.min(100, f.del / R.need * 100)}%;background:${f.color}"></i></div><small>${f.active || !f.released ? `${primN(f.del)} delegates` : `released ${primN(f.released)} delegates to ${lastName({ name: f.backed })}`} · ${f.wins} state${f.wins === 1 ? '' : 's'} · ${primN(f.votes)} votes${f.active ? ` · polling ${(poll[f.name] || 0).toFixed(0)}%${mo}` : ''}${mineF && f.active ? ` · $${f.cash}M in the bank` : ''}</small></span>
          <span style="display:flex;flex-direction:column;gap:4px;align-items:flex-end"><a href="#" data-cprof="${idx}">profile</a>${endBtn}</span></div>`;
      }).join('');
      const decided = PRIMARY_CAL.filter(([lbl, codes]) => codes.some(c => R.results[c]));
      showModal(`<div class="kicker">${year} · Presidential primaries</div><h2>${last ? `After ${last.label}` : 'The Field'}</h2>${tabs}${banner}${intro}
        ${news}
        ${selCode ? `<div class="prim-results"><div class="prim-rcol list"><b>🗳️ ${last.label} · click a state for the full count</b>${last.results.map(r => srow(r.code)).join('')}</div><div class="prim-rcol">${primDetailHTML(R, selCode)}</div></div>` : '<p style="color:var(--dim)">No votes cast yet. Iowa is first.</p>'}
        <div class="pollbox"><b>📊 National ${PARTY[view].name} primary poll</b>${field.filter(f => f.active).sort((a, b) => (poll[b.name] || 0) - (poll[a.name] || 0)).map(f => `<div class="salrow"><span style="color:${f.color};font-weight:700">${f.name}</span><span class="mbar"><i style="width:${Math.min(100, (poll[f.name] || 0) * 2)}%;background:${f.color}"></i></span><b>${(poll[f.name] || 0).toFixed(0)}%</b></div>`).join('')}<small style="color:var(--dim)">Undecided ${poll._undecided}% · polls move with wins, debates and beating expectations</small></div>
        <div class="cands">${cands}</div>
        <div class="campmap">${mapHTML}${selCode ? '<small>Click any state that has voted for its full results</small>' : ''}${view === 'I' ? `<small> · Purple rings: Alliance contests still to come (${IND_CAL.filter(c => c[1].some(x => !R.results[x])).map(c => c[0]).join(', ') || 'none'})</small>` : ''}</div>
        ${decided.length > 1 ? `<details class="cdet"><summary>Every result so far (${Object.keys(R.results).length} states)</summary>${decided.map(([lbl, codes]) => `<div class="plbl">${lbl}</div>${codes.map(srow).join('')}`).join('')}</details>` : ''}
        ${controls}`);
    }
    screen = 'board';
    const card = $('#modal-card');
    card.querySelectorAll('[data-pview]').forEach(b => b.onclick = () => { view = b.dataset.pview; sfx.click(); draw(); });
    card.querySelectorAll('[data-pstate]').forEach(g => g.onclick = () => { const sc = card.scrollTop; sel[view] = g.dataset.pstate; sfx.click(); draw(); card.scrollTop = sc; });
    const endorse = (idx, paid) => {
      const R = state[mine], f = R.field[idx]; if (!f || !f.active) return;
      if (paid) { if (S.career.capital < 1) return; S.career.capital--; }
      const prev = myCand(); if (prev && hqPlan && R.plans[prev.name] === hqPlan) delete R.plans[prev.name];
      endorsed = f.name; endorsedHist.push(f.name); note = ''; hqPlan = null; R.poll = primaryPoll(R);
      hist(f.p, `Endorsed for President by the ${PARTY[mine].name} whip, who took over the campaign's strategy`);
      sfx.up(); draw();
    };
    card.querySelectorAll('[data-choice^="endorse:"]').forEach(b => b.onclick = () => endorse(+b.dataset.choice.split(':')[1], false));
    card.querySelectorAll('[data-pswitch]').forEach(b => b.onclick = () => endorse(+b.dataset.pswitch, lastLabel !== ''));
    card.querySelectorAll('[data-cprof]').forEach(a => a.onclick = e => { e.preventDefault(); const f = state[view].field[+a.dataset.cprof]; profileModal(f.p, f.office, draw); });
    if ($('#pnext')) $('#pnext').onclick = () => { if (playing()) { view = mine; drawHQ(); } else { step(); sfx.click(); draw(); } };
    if ($('#pskip')) $('#pskip').onclick = () => { while (!allDone()) { autoMine(); step(); } draw(); };
    if ($('#pfin')) $('#pfin').onclick = finishAll;
  };
  draw();
}
function presPrimariesDue() { const n = S.career.bills + 1; return n % 6 === 4 && billYear(n) % 4 === 0 && !S.nominees; }
