'use strict';
/* =====================================================================
   MIDTERM — the midterm campaign: a lighter, Senate-focused version of the
   fall campaign for the even years without a presidential race. Loaded
   after campaign.js. Defines midtermCampaign(done), midtermRaceAdj(rc) and
   midtermHouseAdj(), which game.js calls from electionPrep, projMargin and
   countBallots, and midSeatChart(polls, side), which results.js reuses.
   Three rounds: Labor Day (the message and the map), October (three Senate
   debates and a midterm surprise) and the final weekend (ads, turnout,
   surrogates), then an Election Eve front page and the Senate trail.
   ===================================================================== */

/* ---------------- constants ---------------- */
const MID_ROUNDS = ['Labor Day', 'October', 'The Final Weekend', 'Election Eve'];
const MID_STRATS = {
  defend: { icon: '🛡', name: 'Defend the seats you hold', prose: 'a defensive map', blurb: 'Money, staff and the candidate\'s calendar go to your own close seats.' },
  offense: { icon: '⚔', name: 'Go on offense', prose: 'an offensive map', blurb: 'Raid the other side\'s close seats and let your safe incumbents fend for themselves.' },
  nationalize: { icon: '🏛', name: 'Nationalize the midterms', prose: 'a referendum on the White House', blurb: 'Every race becomes a vote on the President. Great if the country agrees with you about him.' },
  localize: { icon: '🏘', name: 'All politics is local', prose: 'a race-by-race, all-politics-is-local campaign', blurb: 'Potholes, plants and hometown names: every candidate runs away from Washington.' },
};
const MID_MSG = { economy: 'Paychecks, prices and the plant that closed.', environment: 'Clean water, wildfires and the next storm.', security: 'The border, the base and the bad guys.', welfare: 'Medicare, the clinic and the pension.', rural: 'The farm bill, the feed store and rural broadband.', urban: 'Rent, transit and safe streets.', taxes: 'What Washington takes out of your check.', tech: 'Chips, broadband and the jobs of the future.' };
const MID_CITY = { AL: 'Birmingham', AK: 'Anchorage', AZ: 'Phoenix', AR: 'Little Rock', CA: 'Sacramento', CO: 'Denver', CT: 'Hartford', DE: 'Wilmington', FL: 'Tampa', GA: 'Atlanta', HI: 'Honolulu', ID: 'Boise', IL: 'Springfield', IN: 'Indianapolis', IA: 'Des Moines', KS: 'Wichita', KY: 'Louisville', LA: 'Baton Rouge', ME: 'Portland', MD: 'Baltimore', MA: 'Worcester', MI: 'Grand Rapids', MN: 'Duluth', MS: 'Jackson', MO: 'Springfield', MT: 'Billings', NE: 'Omaha', NV: 'Reno', NH: 'Manchester', NJ: 'Newark', NM: 'Albuquerque', NY: 'Buffalo', NC: 'Raleigh', ND: 'Fargo', OH: 'Columbus', OK: 'Tulsa', OR: 'Eugene', PA: 'Pittsburgh', RI: 'Providence', SC: 'Columbia', SD: 'Sioux Falls', TN: 'Nashville', TX: 'San Antonio', UT: 'Provo', VT: 'Burlington', VA: 'Richmond', WA: 'Spokane', WV: 'Charleston', WI: 'Green Bay', WY: 'Casper' };
const MID_VENUES = ['a high-school gym in', 'the public-TV studio in', 'a union hall in', 'a packed VFW post in', 'the fairgrounds pavilion in', 'a university ballroom in', 'a church fellowship hall in', 'the chamber of commerce luncheon in'];
const MID_ZINGERS = ['You\'ve been in Washington so long you think a gallon of gas is a rounding error.', 'I\'ve read your plan. All three pages of it.', 'You don\'t get to vote against the bridge and then cut the ribbon.', 'That\'s not a record. That\'s an alibi.', 'The only thing you\'ve delivered for this state is speeches.', 'You voted for it right up until the lobbyists voted against it.', 'My opponent knows every donor in Georgetown and not one pothole on Route 9.', 'If you want a senator who answers to Washington, you\'ve got one.'];
const MID_GAFFES = ['mispronounced the name of the state\'s biggest county', 'could not name a single bill they would sponsor', 'said "I don\'t really follow the farm bill" in a farm state', 'called the moderator by the wrong name, twice', 'froze for nine seconds on a question about Social Security', 'admitted to owning a house in Virginia "and, well, a condo in Naples"', 'promised to "look at" the retirement age, then spent four minutes un-promising it', 'blamed the local paper for "a hit piece" the moderator had written'];
const MID_PACS = ['Americans for a Brighter Tomorrow', 'the Heartland Values Fund', 'Citizens for Common Sense', 'the Prosperity Project', 'Main Street Majority PAC', 'the Liberty and Opportunity Fund', 'Working Families Forward', 'the American Renewal Network'];
const MID_STORMS = ['Ana', 'Bertrand', 'Colette', 'Dmitri', 'Esme', 'Fabian', 'Gwen', 'Hector', 'Isadora', 'Joaquin'];
const MID_COAST = ['TX', 'LA', 'MS', 'AL', 'FL', 'GA', 'SC', 'NC', 'VA'];
const MID_RULING = {
  economy: ['strikes down the federal overtime rule', 'upholds the national minimum-wage indexing law'],
  environment: ['guts the EPA\'s power-plant rules', 'upholds the clean-water rule for every wetland'],
  security: ['strikes down the state\'s border-patrol compact', 'limits warrantless surveillance at the border'],
  welfare: ['lets states add work requirements to Medicaid', 'blocks states from cutting Medicaid rolls'],
  rural: ['voids the federal water-rights rule out West', 'upholds the federal grazing-fee increase'],
  urban: ['strikes down the city handgun-licensing law', 'upholds the city rent-stabilization ordinance'],
  taxes: ['strikes down the new wealth-reporting rule', 'upholds the corporate minimum tax'],
  tech: ['shields app stores from antitrust suits', 'upholds the state\'s data-privacy law'],
};
let MID_UI = null;        // { done, draw, screen } for the campaign on screen (never saved)
let MID_EVT_LIVE = null;  // the live surprise (functions; never saved)

/* ---------------- small helpers ---------------- */
const midM = () => (S.election && S.election.mid) || null;
const midYear = () => S.election ? S.election.year : electionYear(nextElectionK());
const midNum = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(d);
const midCap = s => s.charAt(0).toUpperCase() + s.slice(1);
const midStrip = s => String(s || '').replace(/<[^>]+>/g, '');
const midRaces = () => (S.election && S.election.races) || [];
const midRc = code => midRaces().find(rc => rc.m.state === code) || null;
const midNeed = () => vpYours() ? 50 : 51;
const midCity = c => MID_CITY[c] || stName(c);
function midTopSal(n) { return Object.entries(S.salience || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]); }
function midAdj(code, pts) { const M = midM(); if (!M || !code) return; M.races[code] = +((M.races[code] || 0) + pts).toFixed(3); }
function midMargin(rc) { const mg = projMargin(rc); return majorParty(rc) === S.side ? mg : -mg; } // your-side margin
function midClose(list) { return (list || midRaces()).slice().sort((a, b) => Math.abs(raceChance(a) - 0.5) - Math.abs(raceChance(b) - 0.5)); }
function midSeats() { const E = S.election; return S.members.filter(m => m.cls !== E.cls && m.party === S.side).length + midRaces().reduce((a, rc) => a + raceChance(rc), 0); }
function midGB() { const M = midM(); return clamp(genericBallot() + (M ? (M.national + M.houseAdj) * 0.4 : 0), 30, 70); }
// who carries each party's banner in a race (challengers are only named on Election Night, so here they go by their role)
function midCand(rc, p) {
  const m = rc.m;
  if (m.party === p && !rc.retiring) return rc.primaried && rc.nominee ? rc.nominee.name : `Sen. ${m.name}`;
  return `the ${PARTY[p].name} ${m.party === p || m.party === 'I' ? 'nominee' : 'challenger'}`;
}
function midInc(rc) { return !rc.retiring && !rc.primaried && rc.m.party !== 'I' ? rc.m : null; }

/* ---------------- the hooks game.js calls ---------------- */
// your-side points in one Senate race: the national campaign plus whatever happened in that state (O(1): projMargin calls it constantly)
function midtermRaceAdj(rc) { const M = S.election && S.election.mid; if (!M || !rc || !rc.m) return 0; return M.national + (M.races[rc.m.state] || 0); }
function midtermHouseAdj() { const M = S.election && S.election.mid; return M ? M.houseAdj || 0 : 0; }

/* ---------------- the Senate tracker ---------------- */
function midPoll(lbl, short) { const M = midM(); const pt = { lbl, short: short || lbl, seats: +midSeats().toFixed(2), gb: +midGB().toFixed(1) }; M.polls.push(pt); return pt; }
// projected seats over the campaign, on a seat axis with the control line; pure data in, SVG out (results.js draws archived ones with it)
function midSeatChart(polls, side, opts = {}) {
  const pts = (polls || []).filter(p => p && p.seats != null), n = pts.length;
  if (!n) return '';
  const narrow = window.innerWidth < 640, W = narrow ? 380 : 560, H = narrow ? 180 : 190, pl = 30, pr = narrow ? 70 : 76, pt = 14, pb = 28, fs = narrow ? 11.5 : 10;
  const need = opts.need || 51, vals = pts.map(p => +p.seats);
  let lo = Math.floor(Math.min(...vals, need) - 2), hi = Math.ceil(Math.max(...vals, need) + 2);
  if (hi - lo < 8) { const mid = (hi + lo) / 2; lo = Math.floor(mid - 4); hi = lo + 8; }
  const step = hi - lo > 16 ? 4 : hi - lo > 9 ? 2 : 1;
  const x = i => pl + (n < 2 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (n - 1)), y = v => pt + (hi - v) / (hi - lo) * (H - pt - pb), col = PARTY[side].color;
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="lchart mid-chart">`;
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="#2a3242"/><text x="${pl - 5}" y="${y(v) + 4}" font-size="${fs}" fill="#6b7587" text-anchor="end">${v}</text>`;
  svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(51)}" y2="${y(51)}" stroke="#e3b54a" stroke-dasharray="5 3" stroke-width="1.4"/><text x="${W - pr + 6}" y="${y(51) + 4}" font-size="${fs}" fill="#e3b54a" font-weight="700">51 · control</text>`;
  if (need === 50) svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(50)}" y2="${y(50)}" stroke="#e3b54a" stroke-opacity=".45" stroke-dasharray="2 4"/><text x="${W - pr + 6}" y="${y(50) + 4}" font-size="${fs}" fill="#b8a24a">50 + VP</text>`;
  pts.forEach((p, i) => { svg += `<line x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${H - pb + 4}" stroke="#2a3242" stroke-dasharray="2 4"/>`; if (narrow && n > 3 && (n - 1 - i) % 2) return; svg += `<text x="${x(i)}" y="${H - 8}" font-size="${fs}" fill="#9aa3b2" text-anchor="${n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle'}" font-weight="${i === n - 1 ? 800 : 400}">${String(p.short || p.lbl || '').slice(0, 12)}</text>`; });
  svg += `<polyline fill="none" stroke="${col}" stroke-width="2.6" stroke-linejoin="round" points="${pts.map((p, i) => `${x(i)},${y(+p.seats)}`).join(' ')}"/>`;
  pts.forEach((p, i) => { svg += `<circle cx="${x(i)}" cy="${y(+p.seats)}" r="${i === n - 1 ? 4.5 : 2.8}" fill="${col}"><title>${p.lbl}: ${(+p.seats).toFixed(1)} seats projected${p.gb != null ? `, generic ballot ${(+p.gb).toFixed(1)}%` : ''}</title></circle>`; });
  const last = vals[n - 1], ly = Math.abs(y(last) - y(51)) < 12 ? y(last) + (last >= 51 ? -10 : 14) : y(last) + 4;
  return svg + `<text x="${W - pr + 6}" y="${ly}" font-size="${narrow ? 13 : 12}" fill="${col}" font-weight="800">~${last.toFixed(1)}</text></svg>`;
}
function midTrackerHTML() {
  const M = midM(), side = S.side, last = M.polls[M.polls.length - 1], prev = M.polls[M.polls.length - 2], need = midNeed();
  const d = prev ? last.seats - prev.seats : 0;
  const verdict = last.seats >= need + 1 ? `on course for <b style="color:var(--yes)">control</b>` : last.seats <= need - 1 ? `<b style="color:var(--no)">short of control</b>` : '<b style="color:var(--gold2)">a coin flip for control</b>';
  return `<div class="camp-card"><div class="camp-ch"><b>📈 The Senate tracker</b><span>${PARTY[side].name} seats, projected</span></div>${midSeatChart(M.polls, side, { need })}
    <div class="mid-lead">~${last.seats.toFixed(1)} ${PARTY[side].name} seats: ${verdict}${prev ? ` · ${d > 0.15 ? `📈 ${midNum(d)} since ${prev.short}` : d < -0.15 ? `📉 ${midNum(d)} since ${prev.short}` : `➡ steady since ${prev.short}`}` : ''}</div>
    <div class="camp-polls">${M.polls.map(p => `<span class="camp-pt">${p.short}: <b>${p.seats.toFixed(1)}</b> seats · GB <b>${p.gb.toFixed(1)}%</b></span>`).join('')}</div></div>`;
}
function midMapHTML() {
  const M = midM(), by = {}; midRaces().forEach(rc => by[rc.m.state] = rc);
  const sur = new Set((M.surrogates || []).map(s => s.code)), osur = new Set(((M.opp && M.opp.surrogates) || []).map(s => s.code)), deb = new Set(M.debatePlan || []);
  return usMap({
    fill: c => { const rc = by[c]; if (!rc) return null; const p = raceChance(rc); return { c: chanceColor(p), op: 0.35 + Math.abs(p - 0.5) * 1.3 }; },
    sub: c => by[c] ? `${Math.round(raceChance(by[c]) * 100)}%` : '',
    ring: c => sur.has(c) || M.coach === c ? '#f6d27a' : osur.has(c) ? PARTY[other(S.side)].color : deb.has(c) ? '#ffffff' : null,
    title: c => { const rc = by[c]; if (!rc) return `${stName(c)}: no Senate race this year`; const a = midtermRaceAdj(rc); return `${stName(c)}: your chance ${Math.round(raceChance(rc) * 100)}% · campaign ${midNum(a)}${deb.has(c) ? ' · debate' : ''}${sur.has(c) ? ' · your surrogate' : ''}${osur.has(c) ? ' · their surrogate' : ''}`; },
  });
}
function midMapCardHTML() {
  const rs = midRaces(), mine = rs.filter(rc => rc.m.party === S.side), lean = rs.filter(rc => raceChance(rc) >= 0.6).length, toss = rs.filter(rc => { const p = raceChance(rc); return p > 0.4 && p < 0.6; }).length;
  return `<div class="camp-card"><div class="camp-ch"><b>🗺️ The Senate map</b><span>${rs.length} seats up · class ${S.election.cls}</span></div>
    <div class="campmap">${midMapHTML()}</div>
    <p class="camp-path">Your chance in each race: ${lean} lean your way, ${toss} toss-up${toss === 1 ? '' : 's'}, ${rs.length - lean - toss} lean theirs. You are defending ${mine.length} of the ${rs.length}. <span style="color:var(--gold2)">Gold rings: your coach and surrogates.</span> White rings: the debates.</p></div>`;
}
function midRaceRow(rc) {
  const p = raceChance(rc), a = midtermRaceAdj(rc), c = rc.m.state, mine = S.side;
  const ind = rc.ind ? ` · <span style="color:${PARTY.I.color}">${rc.m.party === 'I' ? `Sen. ${rc.m.name} (I) holds it` : `+ ${rc.ind.name} (I)`}</span>` : '';
  return `<div class="mid-race"><b class="mid-code" style="color:${PARTY[rc.m.party].color}">${c}</b><span class="mid-rn">${stName(c)}${rc.retiring ? ' <i>(open)</i>' : ''}<small>${midCand(rc, mine)} vs ${midCand(rc, other(mine))}${ind}</small></span>
    <span class="mid-adj ${a > 0.05 ? 'good' : a < -0.05 ? 'bad' : ''}">campaign ${midNum(a)}</span><span class="chance"><b style="color:${chanceColor(p)}">${Math.round(p * 100)}%</b><span class="mbar"><i style="width:${p * 100}%;background:${chanceColor(p)}"></i></span></span></div>`;
}
function midCloseHTML() {
  return `<div class="camp-card"><div class="camp-ch"><b>🎯 The five closest races</b><span>your chance</span></div><div class="mid-races">${midClose().slice(0, 5).map(midRaceRow).join('')}</div></div>`;
}
function midStakesHTML() {
  const E = S.election, P = S.president, mine = S.side, upMine = E.races.filter(rc => rc.m.party === mine).length, gb = midGB();
  const stat = (lbl, val, sub, col) => `<div class="mid-stat"><small>${lbl}</small><b${col ? ` style="color:${col}"` : ''}>${val}</b><i>${sub}</i></div>`;
  return `<div class="mid-stakes">${stat(`${PARTY[mine].short} hold`, seats(mine), isMajority() ? 'the majority' : `need ${midNeed()} for control`, PARTY[mine].color)}
    ${stat('Seats up', E.races.length, `${upMine} yours · ${E.races.length - upMine} theirs`)}
    ${stat(presTitle(), `${P.approval}%`, `${PARTY[P.party].short.slice(0, -1) || P.party} · ${P.party === mine ? 'your White House' : 'their White House'}`, PARTY[P.party].color)}
    ${stat('Generic ballot', `${gb.toFixed(1)}%`, `${PARTY[mine].short} share, House`, gb >= 50 ? 'var(--yes)' : 'var(--no)')}
    ${stat('Forecast wave', midNum(E.waveSignal), E.waveSignal >= 0 ? 'for your party' : 'against your party', E.waveSignal >= 0 ? 'var(--yes)' : 'var(--no)')}</div>`;
}
function midMoneyHTML() {
  const E = S.election;
  return `<div class="camp-money"><span>💰 <b>${E.cash}</b> campaign unit${E.cash === 1 ? '' : 's'} left · 🪙 <b>${S.career.capital}</b> capital. The money is the same pot you will spend on the Senate trail after the campaign: every unit spent here is one you can't put in a race later.</span></div>`;
}
function midOppHTML() {
  const O = midM().opp; if (!O || !O.lines || !O.lines.length) return '';
  return `<div class="mid-opp"><b>Across the aisle, the ${PARTY[other(S.side)].name} campaign committee:</b>${O.lines.map(t => `<div>• ${t}</div>`).join('')}</div>`;
}
function midPickHTML(label, key, note = '') { return `<div class="camp-pick">✓ <b>${label}</b>${note ? `<small>${note}</small>` : ''}<a href="#" data-mid="re:${key}">change</a></div>`; }
function midFrame(title, intro, decisions, nextLabel) {
  const M = midM(), card = $('#modal-card'), key = `${M.stage}:${title}`, sc = MID_UI && MID_UI.screen === key ? card.scrollTop : 0;
  showModal(`<div class="kicker">The Midterm Campaign · ${MID_ROUNDS[M.round]} · ${midYear()}</div><h2>${title}</h2>
    ${midStakesHTML()}<p class="mid-intro">${intro}</p>${midOppHTML()}
    <div class="mid-grid">${midTrackerHTML()}${midMapCardHTML()}</div>${midCloseHTML()}${midMoneyHTML()}
    ${decisions}
    <div class="choices"><button class="btn primary big adv" id="midnext">${nextLabel}</button>${midAutoBtn()}</div>`);
  card.classList.add('camp-wide'); card.scrollTop = sc;
  if (MID_UI) MID_UI.screen = key;
  midBindCommon();
}
function midAutoBtn() { return '<button class="btn ghost adv" id="midauto">Let the campaign run itself ⏩<small>The campaign committee makes every remaining call.</small></button>'; }
function midBindCommon() {
  const card = $('#modal-card');
  card.querySelectorAll('[data-mid^="re:"]').forEach(a => a.onclick = e => { e.preventDefault(); const M = midM(); if (M.ui) M.ui[a.dataset.mid.slice(3)] = null; sfx.click(); MID_UI.draw(); });
  if ($('#midauto')) $('#midauto').onclick = () => midAutoRun();
}

/* ---------------- entry ---------------- */
function midtermCampaign(done) {
  const E = S.election;
  if (!E || E.pres || !E.races || !E.races.length || (E.mid && E.mid.stage === 'done')) { done(); return; }
  E.mid = { round: 0, stage: 'r1', polls: [], message: null, msgHot: false, strategy: null, debatePlan: [], debates: [], coach: null, events: [], surrogates: [], adBuy: 0, gotv: false, national: 0, houseAdj: 0, races: {}, opp: { lines: [], surrogates: [] }, ui: {}, autoLog: [] };
  MID_UI = { done, draw: null, screen: null }; MID_EVT_LIVE = null;
  midPoll('After the primaries', 'Primaries');
  log(`The ${E.year} midterm campaign begins: ${E.races.length} Senate seats up, ~${midSeats().toFixed(1)} projected for the ${PARTY[S.side].short}.`, 'sys');
  midRound1();
}

/* ---------------- round 1: Labor Day ---------------- */
function midDefaultMsg() {
  const sal = Object.entries(S.salience || {}).sort((a, b) => b[1] - a[1]), prior = PARTY[S.side].prior;
  const best = sal.slice(0, 2).find(([t]) => (prior[t] || 0) > 0) || sal.find(([t]) => (prior[t] || 0) > 0) || sal[0];
  return best ? best[0] : 'economy';
}
function midNatGood(p) { const P = S.president; return (P.party === p && P.approval >= 52) || (P.party !== p && P.approval <= 45); }
// what a strategy would do, from side p's point of view, race by race (margins measured before anything is applied)
function midStratPlan(key, p) {
  const sg = p === S.side ? 1 : -1, out = { races: {}, national: 0, house: 0 };
  for (const rc of midRaces()) {
    const c = rc.m.state, mg = sg * midMargin(rc), held = rc.m.party === p;
    if (key === 'defend') out.races[c] = held && Math.abs(mg) < 8 ? 1.5 : -0.5;
    else if (key === 'offense') out.races[c] = !held && Math.abs(mg) < 8 ? 1.5 : held && mg >= 8 ? -0.5 : 0;
  }
  if (key === 'nationalize') { const g = midNatGood(p); out.national = g ? 1.2 : -1.2; out.house = g ? 0.6 : -0.6; }
  if (key === 'localize') out.national = -0.5 * sg * S.election.waveSignal;
  return out;
}
function midApplyPlan(plan, p) {
  const M = midM(), sg = p === S.side ? 1 : -1;
  for (const [c, v] of Object.entries(plan.races)) if (v) midAdj(c, sg * v);
  M.national += sg * plan.national; M.houseAdj += sg * plan.house;
}
function midDefaultStrat() {
  const opts = Object.keys(MID_STRATS).map(k => { const pl = midStratPlan(k, S.side); return { k, v: pl.national * midRaces().length * 0.6 + Object.values(pl.races).reduce((a, v) => a + v, 0) * 0.5 }; });
  return opts.sort((a, b) => b.v - a.v)[0].k;
}
// the message: a top-2 issue lifts every race; every message also plays better where voters care about it
function midMsgRaces(tag) { const o = {}; for (const rc of midRaces()) o[rc.m.state] = +(0.4 * clamp(ST[rc.m.state].voter[tag] || 0, -1, 1.5)).toFixed(2); return o; }
function midApplyMsg(tag, p) {
  const M = midM(), sg = p === S.side ? 1 : -1, hot = midTopSal(2).includes(tag);
  if (hot) M.national += sg * 0.8;
  for (const [c, v] of Object.entries(midMsgRaces(tag))) if (v) midAdj(c, sg * v);
  S.salience = S.salience || {}; S.salience[tag] = (S.salience[tag] || 1) + 0.5;
  return hot;
}
function midOppPick() {
  const theirs = other(S.side), prior = PARTY[theirs].prior;
  const sal = Object.entries(S.salience || {}).sort((a, b) => b[1] - a[1]);
  const msg = ((Math.random() < 0.7 && sal.slice(0, 2).find(([t]) => (prior[t] || 0) > 0)) || sal.find(([t]) => (prior[t] || 0) > 0) || sal[0] || ['economy'])[0];
  const ws = S.election.waveSignal, r = Math.random();
  let key;
  if (ws >= 3 && r < 0.6) key = 'localize';
  else if (midNatGood(theirs) && r < 0.7) key = 'nationalize';
  else {
    const close = midRaces().filter(rc => Math.abs(midMargin(rc)) < 8), theirsClose = close.filter(rc => rc.m.party === theirs).length;
    key = theirsClose >= close.length - theirsClose ? 'defend' : 'offense';
    if (Math.random() < 0.25) key = key === 'defend' ? 'offense' : 'defend';
  }
  return { msg, key, plan: midStratPlan(key, theirs) };
}
function midOppApply({ msg, key, plan }) {
  const M = midM(), theirs = other(S.side), O = M.opp;
  O.message = msg; O.msgHot = midApplyMsg(msg, theirs); O.strategy = key;
  midApplyPlan(plan, theirs);
  const hit = Object.entries(plan.races).filter(([, v]) => v >= 1.5).map(([c]) => c);
  O.lines.push(`Labor Day: ran on ${TAG[msg][0]} ${TAG[msg][1]}${O.msgHot ? ' (a top issue: −0.8 for you everywhere)' : ''} with ${MID_STRATS[key].prose}${hit.length ? ` (−1.5 for you in ${hit.join(', ')})` : key === 'nationalize' ? ` (${midNum(-plan.national)} for you everywhere)` : key === 'localize' ? ` (${midNum(-plan.national)} for you everywhere)` : ''}.`);
}
function midApplyR1() {
  const M = midM(), ui = M.ui || {};
  const msg = TAGS.includes(ui.msg) ? ui.msg : midDefaultMsg(), key = MID_STRATS[ui.strat] ? ui.strat : midDefaultStrat();
  const plan = midStratPlan(key, S.side), opp = midOppPick(); // both campaigns plan off the same Labor Day map
  M.message = msg; M.msgHot = midApplyMsg(msg, S.side); M.strategy = key;
  midApplyPlan(plan, S.side);
  midOppApply(opp);
  log(`Labor Day: your Senate campaign runs on ${TAG[msg][1]}${M.msgHot ? ' (a top issue, +0.8)' : ''} with ${MID_STRATS[key].prose}.`, 'sys');
  M.stage = 'r2'; midPoll('Labor Day');
}
function midStratStanding(key) {
  const pl = midStratPlan(key, S.side), P = S.president, up = Object.entries(pl.races).filter(([, v]) => v >= 1.5).map(([c]) => c), dn = Object.entries(pl.races).filter(([, v]) => v < 0).length;
  if (key === 'defend' || key === 'offense') return `+1.5 in ${up.length} race${up.length === 1 ? '' : 's'}${up.length ? ` (${up.slice(0, 8).join(', ')}${up.length > 8 ? '…' : ''})` : ''}; −0.5 in ${dn} other${dn === 1 ? '' : 's'}.`;
  if (key === 'nationalize') return `${presTitle()} is ${P.party === S.side ? 'yours' : 'theirs'} at ${P.approval}%: <b style="color:${pl.national > 0 ? 'var(--yes)' : 'var(--no)'}">${midNum(pl.national)} in every race, ${midNum(pl.house)} for the House</b>. It works with your own President at 52% or better, or theirs at 45% or worse.`;
  return `The forecast wave is ${midNum(S.election.waveSignal)} for your party: localizing is worth <b style="color:${pl.national > 0 ? 'var(--yes)' : pl.national < 0 ? 'var(--no)' : 'var(--dim)'}">${midNum(pl.national)} in every race</b>${pl.national < -0.2 ? ' — you would be throwing away a wave that is breaking your way' : pl.national > 0.2 ? ' — half the headwind, gone' : ''}.`;
}
function midRound1() {
  const M = midM(); M.round = 0; M.stage = 'r1'; M.ui = { msg: null, strat: null };
  const draw = () => {
    const E = S.election, P = S.president, hot = midTopSal(2), mine = S.side, whMine = P.party === mine;
    const upMine = E.races.filter(rc => rc.m.party === mine).length;
    const intro = `It's Labor Day, ${midYear()}: nine weeks to the midterms. No one is running for President this year, which means the country will vote on one anyway: ${presTitle()} sits at ${P.approval}%, and the party in the White House ${whMine ? 'is yours — history says you lose seats' : 'is theirs — history says they lose seats'}. You are defending ${upMine} of the ${E.races.length} seats up. Pick the message every one of your candidates will repeat, and how the party plays the map.`;
    const msgOpt = t => { const pl = midMsgRaces(t), best = Object.entries(pl).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0.2).slice(0, 4).map(([c]) => c), worst = Object.entries(pl).filter(([, v]) => v < -0.2).map(([c]) => c); return `${MID_MSG[t]}${hot.includes(t) ? ' <b style="color:var(--gold2)">🔥 top issue: +0.8 in every race</b>' : ''}${best.length ? ` Plays best in ${best.join(', ')}.` : ''}${worst.length ? ` Hurts in ${worst.slice(0, 4).join(', ')}.` : ''}`; };
    const msgHTML = M.ui.msg ? midPickHTML(`${TAG[M.ui.msg][0]} ${TAG[M.ui.msg][1]}`, 'msg', msgOpt(M.ui.msg))
      : `<div class="camp-opts">${TAGS.map(t => `<button class="btn" data-choice="msg:${t}"><span>${TAG[t][0]} ${TAG[t][1]}<small>${msgOpt(t)}</small></span></button>`).join('')}</div>`;
    const stratHTML = M.ui.strat ? midPickHTML(`${MID_STRATS[M.ui.strat].icon} ${MID_STRATS[M.ui.strat].name}`, 'strat', midStratStanding(M.ui.strat))
      : `<div class="camp-opts">${Object.entries(MID_STRATS).map(([k, s]) => `<button class="btn" data-choice="strat:${k}"><span>${s.icon} ${s.name}<small>${s.blurb} <i>${midStratStanding(k)}</i></small></span></button>`).join('')}</div>`;
    midFrame('Labor Day: the map and the message', intro,
      `<div class="camp-dec"><h3>1. The message</h3><p>One issue, in every race. A top-two issue with voters is worth +0.8 everywhere; every message also plays better in states that care about it, and worse where they don't.</p>${msgHTML}</div>
       <div class="camp-dec"><h3>2. The strategy</h3><p>Where the money, the staff and the attention go. The other side picks theirs at the same time.</p>${stratHTML}</div>`, 'Next week ▶');
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice^="msg:"]').forEach(b => b.onclick = () => { M.ui.msg = b.dataset.choice.slice(4); sfx.click(); draw(); });
    card.querySelectorAll('[data-choice^="strat:"]').forEach(b => b.onclick = () => { M.ui.strat = b.dataset.choice.slice(6); sfx.click(); draw(); });
    $('#midnext').onclick = () => { midApplyR1(); sfx.up(); midRound2(); };
  };
  MID_UI.draw = draw; draw();
}

/* ---------------- round 2: October, the debates ---------------- */
function midPlanDebates() { const M = midM(); if (!M.debatePlan.length) M.debatePlan = midClose().slice(0, 3).map(rc => rc.m.state); return M.debatePlan; }
function midDebate(code, coached, oppCoached) {
  const rc = midRc(code), mine = S.side, theirs = other(mine), me = midCand(rc, mine), them = midCand(rc, theirs), m = rc.m;
  const q = (m.party === mine && midInc(rc) ? 0.2 + (m.rec >= 3 ? 0.2 : 0) : 0) - (m.party === theirs && midInc(rc) ? 0.2 : 0);
  const roll = clamp(gauss() * 0.85 + q, -1.5, 1.5);
  let res = coached && oppCoached ? roll : coached ? 1 + Math.max(0, roll) * 0.6 : oppCoached ? -1 + Math.min(0, roll) * 0.6 : roll;
  res = +clamp(res, -2, 2).toFixed(1);
  midAdj(code, res);
  const winner = res >= 0.4 ? mine : res <= -0.4 ? theirs : null, W = winner === mine ? me : them, L = winner === mine ? them : me;
  const z = pick(MID_ZINGERS), g = pick(MID_GAFFES), venue = `${pick(MID_VENUES)} ${midCity(code)}`;
  const text = winner ? pick([
    () => `${midCap(W)} landed the line of the night — "${z}" — and ${L} spent the rest of the hour answering it.`,
    () => `${midCap(L)} ${g}. ${midCap(W)} didn't have to say a word; the clip was on every station by morning.`,
    () => `${midCap(W)} was calm, specific and a little funny; ${L} was none of those things. The line everyone quoted: "${z}"`,
    () => `It was close until the closing statements, when ${L} ${g} and ${W} pounced: "${z}"`,
  ])() : pick([
    () => `Ninety minutes, two talking points each, no knockouts. ${midCap(me)} and ${them} both declared victory before the studio lights cooled.`,
    () => `The moderator asked about ${TAG[pick(TAGS)][1].toLowerCase()} four times and got four non-answers. A draw, and a dull one.`,
    () => `${midCap(me)} won the first half, ${them} the second; the snap poll called it even.`,
  ])();
  const snap = winner ? Math.round(clamp(50 + Math.abs(res) * 6 + rnd(0, 4), 51, 68)) : Math.round(rnd(45, 48)), snapL = winner ? 100 - snap - ri(4, 9) : snap + ri(-1, 1);
  const inc = midInc(rc); if (inc) hist(inc, `${winner === inc.party ? 'Won' : winner ? 'Lost' : 'Fought to a draw in'} a televised Senate debate in ${midCity(code)}`, midYear());
  return { code, mine: me, theirs: them, venue, result: res, winner, snap, snapL, coached: !!coached, oppCoached: !!oppCoached, text };
}
function midApplyR2() {
  const M = midM(), ui = M.ui || {}, plan = midPlanDebates();
  const coach = ui.coach && plan.includes(ui.coach) && S.career.capital >= 1 ? ui.coach : null;
  if (coach) { S.career.capital--; M.coach = coach; }
  // their committee coaches one debate too, more often than not: the one they most need
  const oc = Math.random() < 0.6 ? plan.slice().sort((a, b) => raceChance(midRc(b)) - raceChance(midRc(a)))[plan.length > 1 && Math.random() < 0.4 ? 1 : 0] : null;
  M.opp.coach = oc;
  M.debates = plan.map(c => midDebate(c, coach === c, oc === c));
  const W = M.debates.filter(d => d.winner === S.side).length, Lo = M.debates.filter(d => d.winner && d.winner !== S.side).length;
  M.opp.lines.push(`October: ${oc ? `sent their debate coach to ${stName(oc)} (−1 for you there, no bad nights for them)` : 'skipped the debate coaching'}.`);
  log(`Debate night: your candidates won ${W}, lost ${Lo}${3 - W - Lo > 0 ? `, drew ${3 - W - Lo}` : ''}.`, W > Lo ? 'good' : W < Lo ? 'bad' : 'sys');
  M.stage = 'deb'; midPoll('After the debates', 'Debates');
}
function midRound2() {
  const M = midM(); M.round = 1; M.stage = 'r2'; M.ui = { coach: null };
  midPlanDebates();
  const draw = () => {
    const cap = S.career.capital, plan = M.debatePlan;
    const card3 = plan.map(c => { const rc = midRc(c), p = raceChance(rc); return `<div class="mid-debcard"><small>${stName(c)} · your chance ${Math.round(p * 100)}%</small><b>${midCand(rc, S.side)}</b><span>vs</span><b>${midCand(rc, other(S.side))}</b></div>`; }).join('');
    const coachHTML = M.ui.coach ? midPickHTML(M.ui.coach === 'none' ? '🪙 No coach: keep the capital' : `🎓 The coach goes to ${stName(M.ui.coach)}`, 'coach', M.ui.coach === 'none' ? 'Your candidates are on their own.' : '+1 there, and the bad-night roll can\'t hurt you. 1 capital.')
      : `<div class="camp-opts">${plan.map(c => `<button class="btn" data-choice="coach:${c}" ${cap < 1 ? 'disabled' : ''}><span>🎓 Coach ${midCand(midRc(c), S.side)} in ${c}<small>+1 in ${stName(c)} and no downside roll. Costs 1 capital (you have ${cap}).</small></span></button>`).join('')}<button class="btn" data-choice="coach:none"><span>🪙 Keep the capital<small>Three candidates, three podiums, no safety net.</small></span></button></div>`;
    midFrame('October: the debates', `Columbus Day weekend, ${midYear()}. The three closest Senate races hold their televised debates this week: ${plan.map(stName).join(', ')}. Each one can swing about a point and a half either way, and the clips will run until Election Day. You can send the party's best debate coach — a former network anchor who has prepped four senators and one Vice President — to one of them.`,
      `<div class="mid-debs">${card3}</div><div class="camp-dec"><h3>The debate coach</h3><p>One race, one coach. The other side has a coach too.</p>${coachHTML}</div>`, 'Debate night ▶');
    $('#modal-card').querySelectorAll('[data-choice^="coach:"]').forEach(b => b.onclick = () => { M.ui.coach = b.dataset.choice.slice(6); sfx.click(); draw(); });
    $('#midnext').onclick = () => { midApplyR2(); sfx.gavel(); midDebateNight(); };
  };
  MID_UI.draw = draw; draw();
}
function midDebateRow(d) {
  const mine = S.side, col = d.result > 0 ? 'var(--yes)' : d.result < 0 ? 'var(--no)' : 'var(--dim)';
  const verdict = d.winner === mine ? 'WON' : d.winner ? 'LOST' : 'DRAW';
  return `<div class="mid-deb ${d.winner === mine ? 'good' : d.winner ? 'bad' : ''}"><div class="mid-debh"><b>${stName(d.code)}</b><small>${d.venue}</small><span class="mid-verdict" style="color:${col}">${verdict} ${midNum(d.result)}</span></div>
    <div class="mid-debm">${midCap(d.mine)} vs ${d.theirs}${d.coached ? ' · <span style="color:var(--gold2)">🎓 your coach</span>' : ''}${d.oppCoached ? ' · <span style="color:var(--dim)">their coach</span>' : ''}${d.snap ? ` · snap poll ${d.snap}–${d.snapL}${d.winner ? '' : ', a wash'}` : ''}</div><p>${d.text}</p></div>`;
}
function midDebateNight() {
  const M = midM();
  const draw = () => {
    showModal(`<div class="kicker">The Midterm Campaign · ${MID_ROUNDS[1]} · ${midYear()}</div><h2>Debate night</h2>
      <p class="mid-intro">Three states, three stages, three snap polls.</p>${M.debates.map(midDebateRow).join('')}${midOppHTML()}${midTrackerHTML()}
      <div class="choices"><button class="btn primary big adv" id="midnext">Breaking news ▶</button>${midAutoBtn()}</div>`);
    $('#modal-card').classList.add('camp-wide'); midBindCommon();
    $('#midnext').onclick = () => { M.stage = 'ev'; sfx.click(); midSurprise(); };
  };
  MID_UI.draw = draw; MID_UI.screen = 'deb'; draw();
}

/* ---------------- round 2: the midterm surprise ---------------- */
function midFx() {
  const out = [], M = midM(), whMine = S.president.party === S.side;
  const add = (t, good) => out.push({ t, good });
  const F = {
    n(v) { M.national += v; add(`${midNum(v)} in every Senate race`, v >= 0); return F; },
    st(code, v) { midAdj(code, v); add(`${midNum(v)} in ${code}`, v >= 0); return F; },
    sts(codes, v) { codes.forEach(c => midAdj(c, v)); if (codes.length) add(`${midNum(v)} in ${codes.join(', ')}`, v >= 0); return F; },
    house(v) { M.houseAdj += v; add(`${midNum(v)} for the House`, v >= 0); return F; },
    cash(v) { const E = S.election, real = Math.max(-E.cash, v); E.cash += real; add(`${real >= 0 ? '+' : '−'}${Math.abs(real)} campaign unit${Math.abs(real) === 1 ? '' : 's'}`, real >= 0); return F; },
    cap(v) { const real = Math.max(-S.career.capital, v); S.career.capital += real; add(`${midNum(real, 0)} capital`, real >= 0); return F; },
    appr(v) { S.president.approval = clamp(Math.round(S.president.approval + v), 18, 82); add(`${presTitle()} ${midNum(v, 0)} approval`, (v >= 0) === whMine); return F; },
    mood(v) { S.mood = clamp(S.mood + v, -15, 15); add(`party mood ${midNum(v)}`, v >= 0); return F; },
    sal(tag, v) { S.salience = S.salience || {}; S.salience[tag] = (S.salience[tag] || 1) + v; add(`voters talk more about ${TAG[tag][1].toLowerCase()}`, true); return F; },
    note(t, good) { add(t, good !== false); return F; },
    text: () => out.map(x => x.t).join(' · '),
    chips: () => out.map(x => `<span class="camp-fx ${x.good ? 'good' : 'bad'}">${x.t}</span>`).join(''),
    net: () => out.reduce((a, x) => a + (x.good ? 1 : -1), 0),
  };
  return F;
}
function midCtx() {
  const P = S.president, mine = S.side, theirs = other(mine), close = midClose();
  const myClose = close.filter(rc => rc.m.party === mine), theirClose = close.filter(rc => rc.m.party !== mine);
  return { P, mine, theirs, whMine: P.party === mine, year: midYear(), close, myClose, theirClose, debated: midM().debatePlan, hot: midTopSal(2), pres: presTitle() };
}
// a close race not already on the debate stage, when there is one
const midFresh = (x, list) => list.find(rc => !x.debated.includes(rc.m.state)) || list[0] || null;
const MID_EVENTS = [
  { id: 'scandal_mine', w: x => x.myClose.length ? 1 : 0, make: x => {
    const rc = midFresh(x, x.myClose), c = rc.m.state, who = midCand(rc, x.mine), inc = midInc(rc);
    const [what, hl] = pick([['put a nephew on the campaign payroll for a no-show job', 'NEPOTISM'], ['traded $40,000 in defense stocks two days before a classified briefing', 'STOCK TRADES'], ['took a lobbyist-paid golf trip to St Andrews and left it off the disclosure form', 'THE GOLF TRIP'], ['was arrested for drunk driving in 2009, and it never made the papers', 'A HIDDEN ARREST'], ['lifted three chapters of a campaign memoir from a 1990s self-help book', 'PLAGIARISM']]);
    return { h: `${stName(c).toUpperCase()}: ${hl} SCANDAL ENGULFS ${PARTY[x.mine].name.toUpperCase()} CAMPAIGN`, d: `The ${midCity(c)} paper reports that ${who} ${what}.`, mood: 'storm',
      body: [`It was on the front page of the ${midCity(c)} paper on Sunday and on every station in ${stName(c)} by Monday. ${midCap(who)} ${what}, according to records the paper obtained.`, `The race was already within a few points. ${midCap(midCand(rc, x.theirs))} has called a press conference for noon. Your phone has not stopped buzzing.`],
      stakes: `${stName(c)} is ${Math.round(raceChance(rc) * 100)}% for you this morning.`,
      choices: [
        { t: 'Stand by the candidate', s: `A coin flip: −0.5 in ${c} if it blows over, −2.5 if there is more.`, go: fx => { if (Math.random() < 0.55) { fx.st(c, -0.5); return `The story ran for three days and then a county fair and a football rivalry took the front page back. ${midCap(who)} survived it.`; } fx.st(c, -2.5); if (inc) hist(inc, `Weathered a ${hl.toLowerCase()} scandal in the ${x.year} campaign`, x.year); return 'There was more. A second story ran Thursday, and a third the following Monday. The ads wrote themselves.'; } },
        { t: 'A public apology and a refund', s: `−1.2 in ${c}, +0.2 everywhere else: the party looks like it cleans house.`, go: fx => { fx.st(c, -1.2); fx.n(0.2); if (inc) hist(inc, `Apologized publicly over a ${hl.toLowerCase()} story during the ${x.year} campaign`, x.year); return `${midCap(who)} stood in front of the courthouse in ${midCity(c)} and said "I was wrong." It cost a point in the polls and bought the party a talking point everywhere else.`; } },
        { t: 'Bury it under money (1 unit)', s: `−0.4 in ${c}; costs 1 campaign unit.`, can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.st(c, -0.4); return `Two weeks of ads about ${TAG[midM().message || 'economy'][1].toLowerCase()} on every station in ${stName(c)}. Nobody forgot the story, but it stopped being the only one.`; } },
      ] };
  } },
  { id: 'scandal_theirs', w: x => x.theirClose.length ? 1 : 0, make: x => {
    const rc = midFresh(x, x.theirClose), c = rc.m.state, who = midCand(rc, rc.m.party === 'I' ? x.theirs : rc.m.party), inc = midInc(rc);
    const [what, hl] = pick([['billed taxpayers for $60,000 in "constituent meals" at a steakhouse they part-own', 'THE STEAKHOUSE'], ['sat on the board of a company that dumped solvent in a creek outside town', 'THE CREEK'], ['wrote a glowing letter for a donor\'s nursing-home license weeks before three residents died', 'THE NURSING HOME'], ['quietly moved their legal residence to Florida for the tax break', 'THE FLORIDA ADDRESS'], ['used a campaign credit card for a family ski vacation in Aspen', 'THE SKI TRIP']]);
    return { h: `${stName(c).toUpperCase()}: ${hl} STORY ROCKS ${PARTY[rc.m.party === 'I' ? x.theirs : rc.m.party].name.toUpperCase()} CAMPAIGN`, d: `Records show ${who} ${what}.`, mood: 'storm',
      body: [`The opposition file was thick, but this one came from a former staffer. ${midCap(who)} ${what}, according to documents now posted online.`, `Your candidate, ${midCand(rc, x.mine)}, has the ad cut within the hour. The question is how hard to swing.`],
      stakes: `${stName(c)} is ${Math.round(raceChance(rc) * 100)}% for you this morning.`,
      choices: [
        { t: 'Run it wall to wall (1 unit)', s: `+2 in ${c}; costs 1 campaign unit.`, can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.st(c, 2); return `The ad ran during every high-school football broadcast in ${stName(c)} for two weeks. No narrator: just the documents, and a slow zoom.`; } },
        { t: 'Let the local press do the work', s: `+1 in ${c}, free.`, go: fx => { fx.st(c, 1); if (inc) hist(inc, `Faced a ${hl.toLowerCase()} story during the ${x.year} campaign`, x.year); return `You never mentioned it. The ${midCity(c)} paper ran four follow-ups anyway.`; } },
        { t: 'Call for them to quit the race', s: `35%: +2.4 in ${c} and +0.3 everywhere; 65%: +0.4 there and −0.3 everywhere for overreaching.`, go: fx => { if (Math.random() < 0.35) { fx.st(c, 2.4); fx.n(0.3); return 'Two members of their own state party agreed with you on the record. The campaign spent a week fighting itself.'; } fx.st(c, 0.4); fx.n(-0.3); return 'Their party closed ranks and called your demand "a Washington stunt." The story still hurt them, a little.'; } },
      ] };
  } },
  { id: 'rally', w: () => 1, make: x => {
    const states = x.close.slice(0, 3).map(rc => rc.m.state), ap = x.P.approval, pts = +clamp((ap - 50) / 8, -1, 1).toFixed(1);
    if (x.whMine) return { h: `${x.pres.toUpperCase()} PLANS A ${states.length}-STATE RALLY TOUR`, d: `The White House wants to barnstorm ${states.map(stName).join(', ')} in the last three weeks. At ${ap}% approval, that is a gift or a grenade.`, mood: ap >= 50 ? 'dawn' : 'storm',
      body: [`The President's political director called your office at 7 a.m. with dates: ${states.map(midCity).join(', ')}. Air Force One, the band, the whole show.`, ap >= 50 ? `At ${ap}%, the President still draws crowds, and your candidates would like the pictures.` : `At ${ap}%, two of your candidates have already asked, quietly, whether the President could "focus on fundraising."`],
      stakes: `Each rally is worth ${midNum(pts)} in its state at today's approval.`,
      choices: [
        { t: `Welcome the President in ${states.join(', ')}`, s: `${midNum(pts)} in each${pts < 0 ? ' — the approval number is a drag, and the rallies will show it' : ''}.`, go: fx => { fx.sts(states, pts); return pts >= 0 ? `Twelve thousand in ${midCity(states[0])}, a hangar full in ${midCity(states[1] || states[0])}. The candidates got their pictures.` : `The crowds came; so did the protesters, and the cameras liked them better. "${x.pres.toUpperCase()} DRAGS DOWN TICKET," said the ${midCity(states[0])} paper.`; } },
        { t: 'Ask the President to raise money instead', s: '+1 campaign unit; −0.2 everywhere (the snub story).', go: fx => { fx.cash(1); fx.n(-0.2); return `${x.pres} did six closed-door fundraisers in Manhattan and Palm Beach. The money arrived; so did a story about candidates "hiding from the President."`; } },
        { t: 'Keep the President in Washington', s: `No rallies; ${x.pres} −1 approval from the feud headlines.`, go: fx => { fx.appr(-1); return `"Busy governing," said the press secretary, twice, with a look. The rally stages were taken down in ${midCity(states[0])}.`; } },
      ] };
    return { h: `${x.pres.toUpperCase()} HITS THE ROAD FOR THE ${PARTY[x.theirs].name.toUpperCase()}S`, d: `The White House sends the President to ${states.map(stName).join(', ')} for the last three weeks.`, mood: ap >= 50 ? 'storm' : 'dawn',
      auto: fx => fx.sts(states, -pts),
      body: [`${x.pres} will hold rallies in ${states.map(midCity).join(', ')} — the three closest Senate races in the country.`, ap >= 50 ? `At ${ap}%, the President is an asset to their candidates, and your people know it.` : `At ${ap}%, your people are delighted: every rally puts the face of an unpopular White House on their candidates.`],
      stakes: `At today's approval each rally is worth ${midNum(-pts)} for you in its state (already counted).`,
      choices: [
        { t: 'Counter-program every stop (1 capital)', s: pts > 0 ? `Claws back half: ${midNum(pts / 2)} in each state.` : '+0.3 in each: the rallies become your rallies.', can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); fx.sts(states, pts > 0 ? +(pts / 2).toFixed(1) : 0.3); return `Your candidates held town halls a mile from every rally, with the families the President's policies had hurt. The local news ran both.`; } },
        { t: 'Make the race about the President', s: ap <= 47 ? '+0.5 everywhere: they\'re unpopular, so tie every opponent to them.' : '−0.3 everywhere: it backfires while the President is popular.', go: fx => { if (ap <= 47) { fx.n(0.5); return `Every ad ended the same way: a photo of your opponent on stage with ${x.pres}. It worked.`; } fx.n(-0.3); return `At ${ap}%, the President was more popular than your candidates. The ads made that point for the other side.`; } },
        { t: 'Ignore it and stay local', s: 'No change.', go: () => 'Your candidates talked about potholes and plant closings. The rallies came and went.' },
      ] };
  } },
  { id: 'darkmoney', w: x => x.myClose.some(midInc) ? 1 : 0.3, make: x => {
    const pool = midRaces().filter(rc => rc.m.party === x.mine), rc = pool.filter(midInc).sort((a, b) => raceChance(a) - raceChance(b))[0] || pool.sort((a, b) => raceChance(a) - raceChance(b))[0] || x.close[0], c = rc.m.state, who = midCand(rc, x.mine), pac = pick(MID_PACS), amt = ri(12, 38);
    return { h: `$${amt} MILLION IN DARK MONEY FLOODS ${stName(c).toUpperCase()}`, d: `${midCap(pac)}, a group nobody had heard of in August, buys every available ad slot against ${who}.`, mood: 'storm',
      auto: fx => fx.st(c, -2),
      body: [`The donors are anonymous; the ads are not subtle. ${midCap(who)} appears in grainy black and white next to the words "Washington," "corrupt" and "your tax dollars," on a loop, in every market in ${stName(c)}.`, `The ${PARTY[x.mine].name} Senate campaign committee wants an answer. The money to give one would come out of the trail's war chest.`],
      stakes: `The buy is worth −2 for you in ${c} (already counted).`,
      choices: [
        { t: 'Answer it (1 unit)', s: `+1.5 in ${c}; costs 1 campaign unit.`, can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.st(c, 1.5); return `Your response ad had ${who} in a diner in ${midCity(c)}, looking into the camera: "They won't tell you who paid for that ad. I'll tell you who I work for."`; } },
        { t: 'Make the money the story', s: `A coin flip: +1 in ${c} if the press bites, +0.2 if it doesn't.`, go: fx => { if (Math.random() < 0.5) { fx.st(c, 1); return `The ${midCity(c)} paper traced ${pac} to a post-office box and two hedge-fund partners. "WHO IS BUYING ${stName(c).toUpperCase()}'S SEAT?"`; } fx.st(c, 0.2); return 'Reporters shrugged: outside money is a dog-bites-man story now.'; } },
        { t: 'Let it ride', s: 'Keep the money for the trail; take the hit.', go: () => `${midCap(who)} ran on, outspent four to one on the airwaves. The war chest is intact.` },
      ] };
  } },
  { id: 'hurricane', w: x => x.close.slice(0, 12).some(rc => MID_COAST.includes(rc.m.state)) ? 1 : 0, make: x => {
    const rc = x.close.find(r => MID_COAST.includes(r.m.state)), c = rc.m.state, gov = S.governors && S.governors[c], name = pick(MID_STORMS), cat = ri(2, 4), govMine = gov && gov.party === x.mine;
    return { h: `HURRICANE ${name.toUpperCase()} SLAMS ${stName(c).toUpperCase()}`, d: `A Category ${cat} storm makes landfall three weeks before the election; ${ri(2, 9) * 100},000 without power.`, mood: 'storm',
      body: [`${name} came ashore overnight with ${ri(110, 150)}-mph winds. ${gov ? `Gov. ${gov.name} (${gov.party})` : 'The governor'} has called out the Guard, and both Senate campaigns have gone quiet.`, `${x.whMine ? `The federal response is ${x.pres}'s to own, and so, to voters, is yours.` : `The federal response belongs to ${x.pres}; your side can say so, carefully.`} ${govMine ? 'The governor is a friend.' : gov ? 'The governor is not a friend.' : ''}`],
      stakes: `${stName(c)} is ${Math.round(raceChance(rc) * 100)}% for you.`,
      choices: [
        { t: 'Suspend the campaign; volunteers to the shelters', s: `+0.6 in ${c}; −0.2 everywhere (a lost week).`, go: fx => { fx.st(c, 0.6); fx.n(-0.2); return `Your candidate spent four days handing out water in ${midCity(c)} in a party T-shirt with the logo turned inside out. People noticed both things.`; } },
        x.whMine ? { t: 'Get the President there, fast', s: `${presTitle()} +2 approval and +0.8 in ${c} if FEMA delivers; −3 and −1 if it doesn't.`, go: fx => { if (Math.random() < 0.65) { fx.appr(2); fx.st(c, 0.8); return `${x.pres} was on the ground within 36 hours, sleeves rolled up${govMine ? `, beside Gov. ${gov.name}` : ''}. The trucks came the next day.`; } fx.appr(-3); fx.st(c, -1); return `The President came; the trucks did not. "WHERE IS THE WATER?" asked the front page in ${midCity(c)}.`; } }
          : { t: 'Hammer the federal response', s: `60%: +1 in ${c} and the President −2 approval; 40%: −0.5 everywhere (it looks political).`, go: fx => { if (Math.random() < 0.6) { fx.st(c, 1); fx.appr(-2); return `The generators sat in a federal lot for five days. Your candidate was there on day two, in boots, asking why.`; } fx.n(-0.5); return 'The response was fine, actually. Your attack ran next to footage of linemen working through the night.'; } },
        { t: 'Keep campaigning through it', s: `A coin flip: nothing, or −1 in ${c} for looking tone-deaf.`, go: fx => { if (Math.random() < 0.5) return 'The rallies went on in the half of the state with power. Nobody seemed to mind.'; fx.st(c, -1); return `A fundraiser photo surfaced the night the levee failed. "TONE-DEAF," said three columnists.`; } },
      ] };
  } },
  { id: 'court', w: () => S.court && S.court.length ? 0.9 : 0, make: x => {
    const tag = pick(x.hot.filter(t => MID_RULING[t]).concat(x.hot.some(t => MID_RULING[t]) ? [] : ['economy'])), cm = courtCount('R') > courtCount('D') ? 'R' : 'D', rul = MID_RULING[tag][cm === 'R' ? 0 : 1];
    const theirWin = cm !== x.mine, n = S.court.length, maj = Math.max(courtCount(cm), Math.ceil((n + 1) / 2)), au = pick(S.court.filter(j => j.party === cm)) || S.court[0], dis = pick(S.court.filter(j => j.party !== cm)) || null;
    return { h: `SUPREME COURT ${rul.toUpperCase()}, ${maj}–${n - maj}`, d: `A ruling on ${TAG[tag][1].toLowerCase()} — the issue voters already cared about — lands three weeks out.`, mood: theirWin ? 'storm' : 'dawn',
      auto: fx => { if (!theirWin) fx.n(-0.3); },
      body: [`The Court, ${courtLabel()}, ${rul} in a ${maj}–${n - maj} decision. Protesters were on the steps by noon.`, `Justice ${au.name} wrote for the majority that "the policy choice belongs to the people's representatives, not to this Court."${dis ? ` Justice ${dis.name}, in dissent: "${pick(['Today the Court reaches for an answer the law does not give it.', 'The majority mistakes its preferences for the Constitution.', 'Millions of Americans will feel this ruling before they read it.'])}"` : ''}`, theirWin ? `It's a loss for your side's voters on an issue they care about — and that is a turnout opportunity.` : `It's a win for your side's voters, and the other party's base is furious. Backlash is already in the polls (−0.3 everywhere).`],
      stakes: `${TAG[tag][0]} ${TAG[tag][1]} is a top-two issue.`,
      choices: theirWin ? [
        { t: 'Make it the closing argument', s: '+0.9 everywhere and +0.3 for the House; voters talk even more about it.', go: fx => { fx.n(0.9); fx.house(0.3); fx.sal(tag, 1.5); return `"The only way to change this ruling is the Senate," every one of your candidates said, every day, until Election Day.`; } },
        { t: 'Promise a bill to overturn it (1 capital)', s: '+0.6 everywhere, +0.4 House, +0.5 party mood.', can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); fx.n(0.6); fx.house(0.4); fx.mood(0.5); return 'You stood on the Senate steps with a bill number and forty cosponsors. It won\'t pass this year. It doesn\'t have to.'; } },
        { t: 'Stay on message', s: '+0.2 everywhere.', go: fx => { fx.n(0.2); return 'Your candidates issued statements and went back to the stump speech.'; } },
      ] : [
        { t: 'Celebrate it', s: 'A coin flip: +0.5 everywhere, or −0.5 as it fires up their base.', go: fx => { if (Math.random() < 0.5) { fx.n(0.5); return 'Your voters were thrilled and said so with yard signs.'; } fx.n(-0.5); return 'Their voters were angrier than yours were happy. Turnout models moved, the wrong way.'; } },
        { t: 'Lower the temperature', s: '+0.3 everywhere: "the Court has spoken; now let\'s talk about jobs."', go: fx => { fx.n(0.3); return 'Measured statements, no victory laps. The story faded faster than the other side wanted.'; } },
      ] };
  } },
  { id: 'shutdown', w: () => S.shutdown > 0 || (S.history || []).slice(-2).some(h => /Budget$/.test(h.name) && !h.won) ? 1.4 : 0, make: x => {
    const blamed = isMajority() ? x.mine : x.theirs;
    return { h: 'SHUTDOWN CLOCK TICKS AS CAMPAIGN ENTERS FINAL STRETCH', d: `With no budget, the government runs out of money on October ${ri(18, 31)}.`, mood: 'storm',
      body: [`Parks, passport offices and the paychecks of ${ri(7, 9)}00,000 federal workers are on the line. ${blamed === x.mine ? 'Your party runs the Senate, so the voters know whose desk it lands on.' : 'Their party runs the Senate, and your candidates have been saying so.'}`, `${x.pres} has called both leaders to the White House. Your caucus wants to know which way you are going to whip.`],
      stakes: blamed === x.mine ? 'A shutdown on your watch could cost you everywhere.' : 'A shutdown on their watch could be a gift.',
      choices: [
        { t: 'Whip a clean stopgap (1 capital)', s: '+0.6 everywhere, +0.5 party mood: the grown-ups in the room.', can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); fx.n(0.6); fx.mood(0.5); return 'The continuing resolution passed 71–28 at 11:40 p.m. Your candidates got to call it "putting the country first."'; } },
        { t: 'Hold the line and make them blink', s: '50%: +0.8 everywhere; 50%: −1.2 everywhere and −0.5 for the House.', go: fx => { if (Math.random() < 0.5) { fx.n(0.8); return 'They blinked on day two. Your side got the concession and the headline.'; } fx.n(-1.2); fx.house(-0.5); return 'Nobody blinked. Eleven days of closed parks and missed paychecks, and the voters blamed whoever they already disliked — which was mostly you.'; } },
        { t: x.whMine ? 'Blame their leaders, loudly' : 'Blame the White House', s: x.whMine ? '+0.3 everywhere.' : `+0.5 everywhere; ${x.pres} −2 approval.`, go: fx => { if (x.whMine) { fx.n(0.3); return 'Your candidates said "obstruction" more than four hundred times in a week, by one count.'; } fx.n(0.5); fx.appr(-2); return `"${x.pres.toUpperCase()}'S SHUTDOWN," said the ads. It stuck.`; } },
      ] };
  } },
  { id: 'health', w: x => x.close.length ? 0.8 : 0, make: x => {
    const rc = midFresh(x, x.close), c = rc.m.state, mineRace = Math.random() < 0.5, p = mineRace ? x.mine : x.theirs, who = midCand(rc, p), city = midCity(c);
    return { h: `${stName(c).toUpperCase()} CANDIDATE HOSPITALIZED`, d: `${midCap(who)} collapses at a rally in ${city}.`, mood: 'storm',
      body: [`${midCap(who)} was ${pick(['halfway through the stump speech', 'shaking hands on a rope line', 'at a pancake breakfast'])} in ${city} when they went down. The campaign says "exhaustion and a fainting spell." Doctors say little.`, mineRace ? 'It\'s your candidate, and the age-and-health question has been hanging over the race since summer.' : 'It\'s their candidate. Your campaign manager has two drafts ready: one gracious, one not.'],
      stakes: `${stName(c)} is ${Math.round(raceChance(rc) * 100)}% for you.`,
      choices: mineRace ? [
        { t: 'Release the full medical records', s: `−0.3 in ${c}; the story ends.`, go: fx => { fx.st(c, -0.3); return 'Twenty pages, a cardiologist on a conference call and a clean bill of health. Boring, which was the point.'; } },
        { t: 'Back on the trail in 48 hours', s: `60%: +0.4 in ${c} (sympathy and grit); 40%: −1.5 after a second episode.`, go: fx => { if (Math.random() < 0.6) { fx.st(c, 0.4); return `Back at the same rally site two days later, with a bottle of water and a joke. The crowd was bigger.`; } fx.st(c, -1.5); return 'A second stumble, on camera, eight days later. The question became the race.'; } },
        { t: 'Put the family on the trail', s: `+0.2 in ${c}.`, go: fx => { fx.st(c, 0.2); return 'The candidate\'s daughter, a nurse, did the rallies for a week. People liked her more than politics.'; } },
      ] : [
        { t: 'Go dark for a week and wish them well', s: `+0.5 in ${c}: decency is noticed.`, go: fx => { fx.st(c, 0.5); return 'Your candidate pulled every negative ad for a week. The local columnists called it class; the voters agreed.'; } },
        { t: 'Raise "serious questions about fitness"', s: `A coin flip: +1.2 in ${c} if it sticks, −1 if it looks ghoulish.`, go: fx => { if (Math.random() < 0.5) { fx.st(c, 1.2); return 'The question stuck. They spent the last two weeks releasing doctors\' letters instead of ads.'; } fx.st(c, -1); return `Their candidate walked out of the hospital waving, and your "fitness" line ran next to the footage. Ghoulish, the ${city} paper said.`; } },
      ] };
  } },
  { id: 'viral', w: x => x.close.length ? 1 : 0, make: x => {
    const rc = midFresh(x, x.close), c = rc.m.state, who = midCand(rc, x.mine);
    const ad = pick([['a 30-second spot of the candidate rebuilding a barn with their 84-year-old father', 'BARN'], ['a deadpan ad in which the candidate reads the other side\'s attack mailers to a herd of unimpressed cows', 'COWS'], ['a one-take spot walking the shuttered main street of their hometown, naming every store that closed', 'MAIN STREET'], ['an ad with the candidate\'s Marine drill instructor, who "still isn\'t impressed"', 'DRILL SERGEANT']]);
    return { h: `${ad[1]} AD GOES VIRAL: ${stName(c).toUpperCase()} RACE GOES NATIONAL`, d: `${midCap(who)}'s new spot passes ${ri(9, 30)} million views in three days.`, mood: 'dawn',
      body: [`It is ${ad[0]}. It cost $${ri(4, 18)},000 to make. Late-night hosts are playing it; so are the other party's consultants, enviously.`, 'The question is what to do with a lightning strike.'],
      stakes: `${stName(c)} is ${Math.round(raceChance(rc) * 100)}% for you.`,
      choices: [
        { t: 'Put national money behind it (1 unit)', s: `+1.2 in ${c} and +0.4 everywhere; costs 1 campaign unit.`, can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.st(c, 1.2); fx.n(0.4); return 'The committee bought it national airtime. Three other candidates made their own versions within the week.'; } },
        { t: 'Keep it local', s: `+0.8 in ${c}, free.`, go: fx => { fx.st(c, 0.8); return `It played in every market in ${stName(c)} and on every phone in it.`; } },
        { t: 'Turn it into a fundraising email', s: '+1 campaign unit.', go: fx => { fx.cash(1); return `"Chip in $5 and we'll make another one." Forty thousand people did.`; } },
      ] };
  } },
  { id: 'polls', w: () => 0.8, make: x => {
    const seatsNow = midSeats(), trailing = seatsNow < midNeed();
    return { h: 'ARE THE POLLS WRONG AGAIN?', d: `A widely shared analysis says Senate polls have missed by ${ri(3, 6)} points in ${ri(3, 5)} of the last six midterms, always in the same direction.`, mood: 'night',
      body: [`The forecast has your party at about ${seatsNow.toFixed(1)} seats. A data journalist with a large following says that number is "built on sand": response rates under 1%, and the people who answer are not the people who vote.`, trailing ? 'Your donors are reading it as hope. Your field staff are reading it as a reason to keep knocking.' : 'Your donors are reading it as a threat. So is your campaign manager.'],
      stakes: 'Nothing in the polls has changed. Everything about how people read them has.',
      choices: [
        { t: 'Run like you\'re ten points down (1 capital)', s: '+0.6 everywhere and +0.3 for the House.', can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); fx.n(0.6); fx.house(0.3); return 'An extra week of door-knocking in every state with a close race, paid for with favors you called in from the caucus.'; } },
        { t: 'Leak your internal poll', s: '50%: +0.5 everywhere (momentum); 50%: −0.4 when it\'s picked apart.', go: fx => { if (Math.random() < 0.5) { fx.n(0.5); return '"Internal polling shows a tightening race." The cable chyrons ran it as fact.'; } fx.n(-0.4); return 'A pollster took your leaked crosstabs apart on social media in a 31-post thread. Not a good look.'; } },
        { t: 'Trust the numbers', s: 'No change.', go: () => 'You told the caucus to ignore the noise. The numbers stayed the numbers.' },
      ] };
  } },
  { id: 'economy', w: () => 1, make: x => {
    const e = typeof S.econ === 'number' ? S.econ : gauss(), good = e > 0.4 || (e > -0.4 && Math.random() < 0.5), jobs = good ? ri(220, 410) : -ri(40, 160), forWh = good ? 1 : -1, forMe = x.whMine ? forWh : -forWh, base = +(0.6 * forMe).toFixed(1);
    return { h: good ? `JOBS REPORT BLOWS PAST FORECASTS: +${jobs},000` : `ECONOMY SHEDS ${-jobs},000 JOBS IN SEPTEMBER`, d: good ? `Unemployment ticks down; ${x.pres}'s team claims credit before the markets open.` : `The first negative report in ${ri(2, 4)} years lands three weeks before the vote.`, mood: forMe > 0 ? 'dawn' : 'storm',
      auto: fx => fx.n(base),
      body: [good ? `Employers added ${jobs},000 jobs, ${ri(80, 160)},000 more than economists expected. Wages are up ${rnd(3.5, 5.2).toFixed(1)}% on the year.` : `Payrolls fell by ${-jobs},000; factory and trucking jobs led the decline. The ${pick(['Dow', 'S&P'])} dropped ${rnd(2, 4).toFixed(1)}% by lunch.`, `The White House is ${x.whMine ? 'yours' : 'theirs'}, so voters give ${good ? 'credit' : 'blame'} ${forMe > 0 ? 'your way' : 'to your side'}: ${midNum(base)} everywhere (already counted).`],
      stakes: 'The economy is the economy. How you talk about it is up to you.',
      choices: forMe > 0 ? [
        { t: 'Take the victory lap', s: `+0.5 everywhere${x.whMine ? `, ${x.pres} +1 approval` : ''}.`, go: fx => { fx.n(0.5); if (x.whMine) fx.appr(1); return 'Every candidate had a hard hat and a factory floor by Friday.'; } },
        { t: '"There\'s more to do"', s: '+0.3 everywhere, +0.5 party mood.', go: fx => { fx.n(0.3); fx.mood(0.5); return 'Humble, steady, a little boring. Swing voters liked it.'; } },
      ] : [
        { t: x.whMine ? 'Blame the Fed and the world' : 'Hammer it in every race', s: x.whMine ? '40%: +0.4 everywhere; 60%: −0.4.' : '+0.7 everywhere.', go: fx => { if (!x.whMine) { fx.n(0.7); return 'Every ad, every debate answer, every mailer: "Can you afford two more years of this?"'; } if (Math.random() < 0.4) { fx.n(0.4); return 'The Fed had raised rates twice since spring; the argument landed.'; } fx.n(-0.4); return 'Voters were not interested in monetary policy. They were interested in their jobs.'; } },
        { t: 'Promise a relief bill in January (1 capital)', s: '+0.6 everywhere, +0.3 for the House.', can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); fx.n(0.6); fx.house(0.3); return 'You announced a jobs package with a bill number and a January vote date. Specific beats sorry.'; } },
      ] };
  } },
  { id: 'war', w: () => S.war ? 1.3 : 0, make: x => {
    const W = S.war, sup = W.support != null ? W.support : 45, weary = sup < 50;
    return { h: weary ? `WAR IN ${String(W.place).toUpperCase()} DRAGS INTO MONTH ${W.months || ri(8, 20)}; SUPPORT AT ${Math.round(sup)}%` : `${String(W.place).toUpperCase()}: TROOPS ADVANCE, PUBLIC RALLIES`, d: weary ? 'Flag-draped coffins and a supplemental spending request land in the same week.' : 'A rare clean week at the front, and the polls show it.', mood: weary ? 'storm' : 'dawn',
      body: [`Support for the war in ${W.place} stands at ${Math.round(sup)}%. ${x.whMine ? `It is ${x.pres}'s war, and your candidates are being asked about it at every stop.` : `It is ${x.pres}'s war, and your candidates are being asked whether they would have voted to fund it.`}`, weary ? 'Gold-star families have started showing up at town halls. Some of them are angry at everyone.' : 'For now, the war is helping whoever is closest to the commander in chief.'],
      stakes: `War support ${Math.round(sup)}%.`,
      choices: x.whMine ? [
        { t: 'Stand by the mission', s: weary ? '−0.8 everywhere: voters are tired.' : '+0.5 everywhere.', go: fx => { if (weary) { fx.n(-0.8); return '"We finish what we start," your candidates said. The voters had heard it before.'; } fx.n(0.5); return 'Your candidates stood with the troops and the polls stood with them.'; } },
        { t: 'Call for a timetable', s: `+0.6 everywhere; ${x.pres} −2 approval (a public split).`, go: fx => { fx.n(0.6); fx.appr(-2); return `Eleven of your candidates signed a letter asking ${x.pres} for "a clear plan to bring them home." The White House was not pleased.`; } },
        { t: 'Change the subject to the economy', s: '+0.1 everywhere.', go: fx => { fx.n(0.1); return 'Questions about the war got thirty-second answers and a pivot. It mostly worked.'; } },
      ] : [
        { t: 'Demand a vote on the war', s: weary ? '+0.8 everywhere and +0.3 for the House.' : '−0.4 everywhere: it looks like undercutting the troops.', go: fx => { if (weary) { fx.n(0.8); fx.house(0.3); return '"Congress never voted for this war. Let\'s vote now." Every one of their candidates had to answer it.'; } fx.n(-0.4); return 'In a week of good news from the front, your demand looked like hoping for bad news.'; } },
        { t: 'Support the troops, question the plan', s: '+0.4 everywhere.', go: fx => { fx.n(0.4); return 'Careful words, veterans on stage, no applause lines. It held up.'; } },
      ] };
  } },
  { id: 'indie', w: x => x.close.some(rc => !rc.ind && rc.m.party !== 'I') ? 0.9 : 0, make: x => {
    const rc = x.close.find(r => !r.ind && r.m.party !== 'I'), c = rc.m.state, cause = pick(IND_CAUSES), name = fullName(), hurtsMe = Math.random() < 0.5, hit = 1.2;
    return { h: `${stName(c).toUpperCase()}: ${name.toUpperCase()} JUMPS IN AS AN INDEPENDENT`, d: `A late, well-funded third candidate running on ${cause[0].toLowerCase()} scrambles a close Senate race.`, mood: 'night',
      auto: fx => { rc.ind = { name, cause, str: rnd(10, 18) }; fx.st(c, hurtsMe ? -hit : hit); fx.note(`${name} (I) on the ballot in ${c}`, !hurtsMe); },
      body: [`${name}, a ${pick(['former mayor', 'retired Army colonel', 'small-business owner', 'county sheriff', 'former news anchor'])} from ${midCity(c)}, filed with ${ri(18, 60)},000 signatures and a self-funded ad budget. The cause: ${cause[0]}.`, `Early numbers say the independent pulls mostly from ${hurtsMe ? 'your voters' : 'theirs'}: ${midNum(hurtsMe ? -hit : hit)} for you there (already counted).`],
      stakes: `${stName(c)} is now a three-way race.`,
      choices: [
        { t: 'Attack them as a spoiler', s: hurtsMe ? `+0.8 in ${c}: your voters come home.` : `−0.4 in ${c}: you are attacking someone who was helping you.`, go: fx => { if (hurtsMe) { fx.st(c, 0.8); return '"A vote for a spoiler is a vote for the other side." Blunt, effective, a little unfair.'; } fx.st(c, -0.4); return `The independent was splitting the other side's vote. Your attack sent some of those voters back home. Oops.`; } },
        { t: `Court their voters on ${cause[0].toLowerCase()}`, s: `+0.6 in ${c}; voters talk more about ${TAG[cause[1]][1].toLowerCase()}.`, go: fx => { fx.st(c, 0.6); fx.sal(cause[1], 1); return `Your candidate held a town hall on ${cause[0].toLowerCase()} and borrowed two of the independent's best lines.`; } },
        { t: 'Ignore them', s: 'No further change.', go: () => 'Third candidates usually fade. Usually.' },
      ] };
  } },
  { id: 'meltdown', w: x => x.close.length > 3 ? 0.9 : 0, make: x => {
    const rc = x.close.slice(3, 10).find(() => true) || x.close[0], c = rc.m.state, mineRace = Math.random() < 0.45, who = midCand(rc, mineRace ? x.mine : x.theirs), g = pick(MID_GAFFES);
    return { h: `DEBATE MELTDOWN IN ${stName(c).toUpperCase()}`, d: `${midCap(who)} ${g} in a local TV debate — and then walked off the stage.`, mood: 'storm',
      body: [`It was a second-tier race and a local station's debate, watched by maybe ninety thousand people. Now ${ri(6, 20)} million have seen ${who} unclip the microphone and leave.`, mineRace ? 'It\'s your candidate. Your campaign manager has asked you, specifically, to fix it.' : 'It\'s their candidate, and the clip is sitting on your war room\'s desktop.'],
      stakes: `${stName(c)} is ${Math.round(raceChance(rc) * 100)}% for you.`,
      choices: mineRace ? [
        { t: 'Spin it: "authentic, not polished"', s: `40%: −0.3 in ${c}; 60%: −1.5.`, go: fx => { if (Math.random() < 0.4) { fx.st(c, -0.3); return '"At least they\'re real," the focus groups said. It was a stretch, and it worked.'; } fx.st(c, -1.5); return 'Nobody bought it. The walk-off became the race.'; } },
        { t: 'Flood the zone with ads (1 unit)', s: `−0.6 in ${c}; costs 1 campaign unit.`, can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.st(c, -0.6); return `Two weeks of positive ads, wall to wall. It didn't erase the clip, but it buried it.`; } },
        { t: 'Demand a second debate', s: `50%: +0.5 in ${c}; 50%: −1.8.`, go: fx => { if (Math.random() < 0.5) { fx.st(c, 0.5); return 'The rematch was dull, steady and redemptive. The comeback was the story.'; } fx.st(c, -1.8); return 'Round two was worse. The station is selling the replay rights.'; } },
      ] : [
        { t: 'Cut the clip into an ad (1 unit)', s: `+1.8 in ${c}; costs 1 campaign unit.`, can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.st(c, 1.8); return 'The ad was the clip, then black, then: "Walked off on you once. Will again."'; } },
        { t: 'Let it play', s: `+1 in ${c}, free.`, go: fx => { fx.st(c, 1); return 'You never said a word. The clip did.'; } },
        { t: 'Rise above it', s: `+0.6 in ${c}.`, go: fx => { fx.st(c, 0.6); return '"I\'ll be here for the next debate, and the one after that." Classy, and it got its own clip.'; } },
      ] };
  } },
  { id: 'governor', w: x => x.close.slice(0, 8).some(rc => S.governors && S.governors[rc.m.state]) ? 1 : 0, make: x => {
    const rc = x.close.slice(0, 8).find(r => S.governors && S.governors[r.m.state]), c = rc.m.state, gov = S.governors[c], own = gov.party === x.mine, ap = ri(58, 71);
    return { h: own ? `GOV. ${lastName(gov).toUpperCase()} OFFERS TO CAMPAIGN IN ${stName(c).toUpperCase()}` : `${stName(c).toUpperCase()}: POPULAR GOV. ${lastName(gov).toUpperCase()} WEIGHS A CROSSOVER ENDORSEMENT`, d: `The most popular politician in ${stName(c)}, at ${ap}%, ${own ? 'wants in' : `hasn't endorsed in the Senate race — and hasn't ruled out ${PARTY[x.mine].name === 'Democratic' ? 'a Democrat' : 'a Republican'}`}.`, mood: 'dawn',
      body: [`Gov. ${gov.name} (${gov.party}) has the best numbers in the state and a famously independent streak. ${own ? `The governor's office called yours this morning with an offer: a week of joint appearances with ${midCand(rc, x.mine)}.` : `The governor has clashed with ${midCand(rc, x.theirs)} for years, and everyone in ${midCity(c)} knows it.`}`, own ? 'The governor will want something for it: a bridge, a base, a judgeship.' : 'A crossover endorsement would be the story of the cycle. Asking for one has a price.'],
      stakes: `${stName(c)} is ${Math.round(raceChance(rc) * 100)}% for you.`,
      choices: own ? [
        { t: 'A week of joint rallies (1 capital)', s: `+1.5 in ${c}; the governor's favor costs 1 capital.`, can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); fx.st(c, 1.5); hist(gov, `Campaigned across ${stName(c)} for the party's Senate candidate in ${x.year}`, x.year); return `Seven towns in seven days, the governor's arm around your candidate's shoulder in every photo.`; } },
        { t: 'A joint TV ad (1 unit)', s: `+1.2 in ${c}; costs 1 campaign unit.`, can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.st(c, 1.2); return 'Thirty seconds on a porch: the governor, the candidate, a dog. It tested through the roof.'; } },
        { t: 'Thanks — a quiet endorsement will do', s: `+0.4 in ${c}, free.`, go: fx => { fx.st(c, 0.4); return 'A statement, a photo, a nod. Fine.'; } },
      ] : [
        { t: 'Court the crossover (1 capital)', s: `40%: +2.2 in ${c}; 60%: they endorse their own, −0.5.`, can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); if (Math.random() < 0.4) { fx.st(c, 2.2); hist(gov, `Crossed party lines to endorse a ${PARTY[x.mine].name} Senate candidate in ${x.year}`, x.year); return `"I've known both of them a long time. I'm voting for the one who shows up." The governor's endorsement led every newscast in ${stName(c)}.`; } fx.st(c, -0.5); return 'The governor listened politely, then endorsed the party nominee at a rally the next morning.'; } },
        { t: 'Leave the governor alone', s: `−0.3 in ${c}: a lukewarm endorsement of their own nominee.`, go: fx => { fx.st(c, -0.3); return 'The governor endorsed the party nominee in a two-sentence press release on a Friday night. It barely counted.'; } },
      ] };
  } },
];
function midEnsureEvent() {
  const M = midM();
  if (MID_EVT_LIVE && M.evtId && MID_EVT_LIVE.id === M.evtId) return;
  const x = midCtx(), recent = (S.lastMidterm && S.lastMidterm.events) || [];
  let pool = MID_EVENTS.map(e => ({ e, w: e.w(x) })).filter(p => p.w > 0 && !(recent.some(ev => ev.id === p.e.id) && Math.random() < 0.7));
  if (!pool.length) pool = [{ e: MID_EVENTS.find(e => e.id === 'polls'), w: 1 }];
  let r = Math.random() * pool.reduce((a, p) => a + p.w, 0), def = pool[pool.length - 1].e;
  for (const p of pool) { r -= p.w; if (r <= 0) { def = p.e; break; } }
  const evt = def.make(x), fx = midFx();
  if (evt.auto) evt.auto(fx);
  MID_EVT_LIVE = { id: def.id, evt, autoChips: fx.chips(), autoText: fx.text() };
  M.evtId = def.id;
  log(`Midterm surprise: ${evt.h}.`, 'sys');
}
function midApplyEvent(i) {
  const M = midM(); midEnsureEvent();
  const ev = MID_EVT_LIVE.evt, ok = ch => ch && (!ch.can || ch.can());
  if (i == null || !ok(ev.choices[i])) i = Math.max(0, ev.choices.findIndex(ok));
  const ch = ev.choices[i], fx = midFx(), res = ch.go(fx) || '';
  M.lastOutcome = { title: ev.h, choice: ch.t, result: res, chips: (MID_EVT_LIVE.autoChips || '') + fx.chips(), effect: [MID_EVT_LIVE.autoText, fx.text()].filter(Boolean).join(' · ') };
  M.events.push({ id: MID_EVT_LIVE.id, title: ev.h, choice: ch.t, effect: M.lastOutcome.effect, result: midStrip(res) });
  log(`${ch.t}: ${midStrip(res)}`, fx.net() > 0 ? 'good' : fx.net() < 0 ? 'bad' : 'sys');
  M.stage = 'out'; midPoll('Late October', 'Late Oct');
}
function midSurprise() {
  const M = midM(); M.round = 1; M.stage = 'ev';
  midEnsureEvent();
  const draw = () => {
    const ev = MID_EVT_LIVE.evt;
    showModal(`<div class="kicker">The Midterm Campaign · ${MID_ROUNDS[1]} · ${midYear()}</div><h2>The midterm surprise</h2>
      ${frontPage({ headline: ev.h, sub: ev.d, body: ev.body, mood: ev.mood || 'storm', date: `October ${midYear()} · Extra` })}
      <p class="camp-state">The Senate: ~${midSeats().toFixed(1)} ${PARTY[S.side].name} seats projected. ${ev.stakes || ''}${MID_EVT_LIVE.autoChips ? `<br>${MID_EVT_LIVE.autoChips}` : ''}</p>
      <div class="camp-dec"><h3>Your call, Whip</h3><div class="camp-opts camp-evopts">${ev.choices.map((ch, i) => `<button class="btn" data-choice="ev:${i}" ${ch.can && !ch.can() ? 'disabled' : ''}><span>${ch.t}<small>${ch.s}</small></span></button>`).join('')}</div></div>
      ${midMoneyHTML()}
      <div class="choices"><button class="btn primary big adv" id="midnext">Let the campaign committee decide ▶<small>Takes the first option you can afford.</small></button>${midAutoBtn()}</div>`);
    $('#modal-card').classList.add('camp-wide'); midBindCommon();
    $('#modal-card').querySelectorAll('[data-choice^="ev:"]').forEach(b => b.onclick = () => { midApplyEvent(+b.dataset.choice.slice(3)); sfx.gavel(); midOutcome(); });
    $('#midnext').onclick = () => { midApplyEvent(null); sfx.gavel(); midOutcome(); };
  };
  MID_UI.draw = draw; MID_UI.screen = 'ev'; draw();
}
function midOutcome() {
  const M = midM(), o = M.lastOutcome;
  const draw = () => {
    showModal(`<div class="kicker">The Midterm Campaign · ${MID_ROUNDS[1]} · ${midYear()}</div><h2>The fallout</h2>
      <div class="camp-out"><small>${o.title}</small><b>${o.choice}</b><p>${o.result}</p><div>${o.chips || '<span class="camp-fx">no measurable effect</span>'}</div></div>
      <div class="mid-grid">${midTrackerHTML()}${midMapCardHTML()}</div>
      <div class="choices"><button class="btn primary big adv" id="midnext">On to the final weekend ▶</button>${midAutoBtn()}</div>`);
    $('#modal-card').classList.add('camp-wide'); midBindCommon();
    $('#midnext').onclick = () => { M.stage = 'r3'; sfx.click(); midRound3(); };
  };
  MID_UI.draw = draw; MID_UI.screen = 'out'; draw();
}

/* ---------------- round 3: the final weekend ---------------- */
// who can barnstorm: your President (if yours, for better or worse), your Vice President, and your best senators who are not on the ballot
function midSurPool() {
  const E = S.election, out = [], P = S.president;
  if (P.party === S.side) out.push({ key: 'P', name: presTitle(), pts: +((P.approval - 50) / 10).toFixed(1), note: `${P.approval}% approval` });
  if (S.vp && vpYours()) out.push({ key: 'V', name: `Vice President ${S.vp.name}`, pts: 0.8, note: 'draws a crowd, moves a little' });
  S.members.filter(m => m.party === S.side && m.cls !== E.cls)
    .map(m => ({ m, s: (m.star ? 3 : 0) + (T(m, 'leader') ? 3 : 0) + (m.rec || 0) * 0.5 + (m.rel || 0) * 0.2 - (m.grudge ? 2 : 0) + Math.random() * 0.5 }))
    .sort((a, b) => b.s - a.s).slice(0, 4)
    .forEach(({ m }) => out.push({ key: String(m.id), name: `Sen. ${m.name}`, pts: 1.5, m, note: [m.star ? '⭐ rising star' : '', T(m, 'leader') ? 'faction leader' : '', (m.rec || 0) >= 3 ? 'popular at home' : '', `${m.faction}, ${m.state}`].filter(Boolean).join(' · ') }));
  return out;
}
function midR3UI() { return { ad: null, gotv: null, pending: null, sur: [], pool: midSurPool() }; }
function midSurTargets(taken) { return midClose().filter(rc => !taken.includes(rc.m.state)).slice(0, 8); }
function midSurrogatesHTML() {
  const ui = midM().ui, full = ui.sur.length >= 3, pending = ui.pending != null ? ui.pool.find(s => s.key === ui.pending) : null;
  const rows = ui.pool.map(s => {
    const a = ui.sur.find(x => x.key === s.key), ptsTxt = `<b style="color:${s.pts >= 0 ? 'var(--yes)' : 'var(--no)'}">${midNum(s.pts)}</b>`;
    let ctl;
    if (a) ctl = `<span class="camp-surgo">→ <b>${a.code}</b> ${stName(a.code)} <small>${midNum(s.pts)}</small> <a href="#" data-mid="unsur:${s.key}">✕</a></span>`;
    else if (pending && pending.key === s.key) ctl = '<span class="camp-surgo"><i>choose a race below</i> <a href="#" data-mid="cancelsur">cancel</a></span>';
    else if (full || pending) ctl = '';
    else ctl = `<button class="btn" data-choice="sur:${s.key}">Send</button>`;
    return `<div class="camp-sur ${a ? 'on' : ''}">${s.m ? portrait(s.m) : s.key === 'V' && S.vp && S.vp.seed != null ? portrait(S.vp) : s.key === 'P' && S.president.seed != null ? portrait(S.president) : '<span class="camp-noport">🎤</span>'}<span style="flex:1"><b>${s.name}</b> ${ptsTxt} in the race they visit<small>${s.note || ''}${s.key === 'P' && s.pts < 0 ? ' · <b style="color:var(--no)">warning: at this approval, a presidential visit costs votes</b>' : ''}</small></span>${ctl}</div>`;
  }).join('');
  const races = pending ? `<div class="camp-states"><small>Where does ${pending.name} go? Closest races first:</small>${midSurTargets(ui.sur.map(x => x.code)).map(rc => { const p = raceChance(rc); return `<button class="btn" data-choice="surst:${rc.m.state}" style="border-color:${chanceColor(p)}">${rc.m.state}${pending.m && pending.m.state === rc.m.state ? ' 🏠' : ''} <small>${Math.round(p * 100)}%</small></button>`; }).join('')}</div>` : '';
  return `<div class="camp-dec"><h3>3. Surrogates</h3><p>Send up to three big names to the races that need them. ${ui.sur.length}/3 sent${full ? '' : '; leave it blank and the committee sends its own picks'}. Senators on the ballot this year are busy with their own races.</p>${rows}${races}</div>`;
}
function midOppFinal() {
  const M = midM(), E = S.election, theirs = other(S.side), O = M.opp;
  const pool = S.members.filter(m => m.party === theirs && m.cls !== E.cls).map(m => ({ m, s: (m.star ? 3 : 0) + (T(m, 'leader') ? 3 : 0) + (m.rec || 0) * 0.5 + Math.random() })).sort((a, b) => b.s - a.s).slice(0, 2).map(x => x.m);
  const used = [];
  O.surrogates = pool.map(m => { const rc = midClose().find(r => !used.includes(r.m.state)); if (!rc) return null; used.push(rc.m.state); midAdj(rc.m.state, -1.2); hist(m, `Campaigned in ${stName(rc.m.state)} for the party's Senate candidate`, midYear()); return { who: `Sen. ${m.name}`, code: rc.m.state, pts: -1.2 }; }).filter(Boolean);
  O.adBuy = ri(0, 2); if (O.adBuy) M.national -= cashEff(O.adBuy, 0.6);
  O.gotv = Math.random() < 0.5; if (O.gotv) { M.national -= 0.5; M.houseAdj -= 0.3; }
  O.lines.push(`The final weekend: ${midOppLine(O)}.`);
}
function midOppLine(O) { return `${O.surrogates.length ? O.surrogates.map(s => `${s.who} → ${s.code}`).join(', ') + ' (−1.2 each)' : 'no surrogates'}; ${O.adBuy ? `${O.adBuy} unit${O.adBuy > 1 ? 's' : ''} of closing ads (${midNum(-cashEff(O.adBuy, 0.6))} everywhere)` : 'no closing ad buy'}; ${O.gotv ? 'a paid turnout operation (−0.5)' : 'no turnout money'}`; }
function midApplyR3() {
  const M = midM(), E = S.election;
  if (!M.ui || !M.ui.pool) M.ui = midR3UI();
  const ui = M.ui, n = clamp(Math.min(+ui.ad || 0, E.cash), 0, 3);
  if (n > 0) { E.cash -= n; M.adBuy = n; M.national += cashEff(n, 0.6); }
  if (ui.gotv === true && S.career.capital >= 1) { S.career.capital--; M.gotv = true; M.national += 0.5; M.houseAdj += 0.3; }
  const sur = ui.sur.slice(), taken = () => sur.map(s => s.code);
  if (ui.pending != null && !sur.some(s => s.key === ui.pending)) { const t = midSurTargets(taken())[0]; if (t) sur.push({ key: ui.pending, code: t.m.state }); }
  if (!sur.length) for (const s of ui.pool.filter(s => s.pts > 0).slice(0, 3)) { const home = s.m && midSurTargets(taken()).find(rc => rc.m.state === s.m.state), t = home || midSurTargets(taken())[0]; if (t) sur.push({ key: s.key, code: t.m.state }); }
  M.surrogates = sur.map(s => { const d = ui.pool.find(p => p.key === s.key); if (!d) return null; midAdj(s.code, d.pts); const who = d.m || (s.key === 'V' ? S.vp : s.key === 'P' ? S.president : null); if (who) hist(who, `Campaigned in ${stName(s.code)} for the party's Senate candidate`, midYear()); return { who: d.name, code: s.code, pts: d.pts }; }).filter(Boolean);
  midOppFinal();
  log(`The final weekend: ${n ? `${n} unit${n > 1 ? 's' : ''} of closing ads` : 'no closing ad buy'}; ${M.surrogates.map(s => `${s.who} → ${s.code}`).join(', ') || 'no surrogates'}; ${M.gotv ? 'paid turnout' : 'no turnout money'}.`, 'sys');
  M.stage = 'eve'; M.round = 3; midPoll('Election Eve', 'Eve');
}
function midRound3() {
  const M = midM(); M.round = 2; M.stage = 'r3'; M.ui = midR3UI();
  const draw = () => {
    const E = S.election, ui = M.ui, cap = S.career.capital;
    const opts = [0, 1, 2, 3].filter(n => n <= E.cash);
    const adLabel = n => n === 0 ? 'Go dark' : `${n} unit${n > 1 ? 's' : ''}${n === 3 ? ' (every slot left)' : ''}`;
    const adFx = n => n === 0 ? 'Keep every unit for the Senate trail.' : `${midNum(cashEff(n, 0.6))} in every Senate race. National airtime is pricey: the first unit is worth +0.6, each extra a bit less.`;
    const adHTML = ui.ad != null ? midPickHTML(`📺 ${adLabel(ui.ad)}`, 'ad', adFx(ui.ad)) : `<div class="camp-opts">${opts.map(n => `<button class="btn" data-choice="ad:${n}"><span>📺 ${adLabel(n)}<small>${adFx(n)}</small></span></button>`).join('')}</div>`;
    const gotvHTML = ui.gotv != null ? midPickHTML(ui.gotv ? '🚌 Pay the turnout machine (1 capital)' : '🪙 Keep the capital', 'gotv', ui.gotv ? '+0.5 in every race, +0.3 for the House.' : 'Volunteers knock doors for free.')
      : `<div class="camp-opts"><button class="btn" data-choice="gotv:1" ${cap < 1 ? 'disabled' : ''}><span>🚌 Pay the turnout machine<small>Vans, phone banks, poll watchers: +0.5 in every race and +0.3 for the House. 1 capital (you have ${cap}).</small></span></button><button class="btn" data-choice="gotv:0"><span>🪙 Keep the capital<small>The volunteers knock doors for free; you keep your chips for the next Congress.</small></span></button></div>`;
    const toss = midRaces().filter(rc => { const p = raceChance(rc); return p > 0.35 && p < 0.65; });
    midFrame('The final weekend', `Four days out. ${toss.length ? `${toss.length} race${toss.length === 1 ? ' is' : 's are'} inside the margin of error: ${toss.map(rc => rc.m.state).join(', ')}.` : 'Nothing is inside the margin of error, which is exactly when the polls are wrong.'} ${E.cash} campaign unit${E.cash === 1 ? '' : 's'} left in the account, and the Senate trail wants every one of them. Buy the closing ads, decide whether to pay for turnout, and send your best surrogates where they can move a race.`,
      `<div class="camp-dec"><h3>1. The closing ad buy</h3>${adHTML}</div><div class="camp-dec"><h3>2. Get out the vote</h3>${gotvHTML}</div>${midSurrogatesHTML()}`, 'Election Eve ▶');
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice^="ad:"]').forEach(b => b.onclick = () => { ui.ad = clamp(+b.dataset.choice.slice(3) || 0, 0, 3); sfx.click(); draw(); });
    card.querySelectorAll('[data-choice^="gotv:"]').forEach(b => b.onclick = () => { const v = b.dataset.choice.slice(5) === '1'; if (v && S.career.capital < 1) return; ui.gotv = v; sfx.click(); draw(); });
    card.querySelectorAll('[data-choice^="sur:"]').forEach(b => b.onclick = () => { if (ui.sur.length >= 3) return; ui.pending = b.dataset.choice.slice(4); sfx.click(); draw(); });
    card.querySelectorAll('[data-choice^="surst:"]').forEach(b => b.onclick = () => { if (ui.pending == null) return; ui.sur.push({ key: ui.pending, code: b.dataset.choice.slice(6) }); ui.pending = null; sfx.up(); draw(); });
    card.querySelectorAll('[data-mid^="unsur:"]').forEach(a => a.onclick = e => { e.preventDefault(); const k = a.dataset.mid.slice(6); ui.sur = ui.sur.filter(s => s.key !== k); sfx.click(); draw(); });
    if (card.querySelector('[data-mid="cancelsur"]')) card.querySelector('[data-mid="cancelsur"]').onclick = e => { e.preventDefault(); ui.pending = null; draw(); };
    $('#midnext').onclick = () => { midApplyR3(); sfx.fanfare(); midEveScreen(); };
  };
  MID_UI.draw = draw; draw();
}

/* ---------------- the end: Election Eve ---------------- */
// a compact, JSON-safe record of the campaign (S.lastMidterm, archived by results.js)
function midRecord() {
  const M = midM(), O = M.opp || {};
  return { year: midYear(), side: S.side, polls: M.polls.map(p => ({ ...p })), message: M.message, msgHot: M.msgHot, strategy: M.strategy, coach: M.coach,
    debates: M.debates.map(d => ({ ...d })), events: M.events.map(e => ({ ...e })), surrogates: M.surrogates.map(s => ({ ...s })), adBuy: M.adBuy, gotv: M.gotv,
    national: +M.national.toFixed(2), houseAdj: +M.houseAdj.toFixed(2), seatsProjected: +midSeats().toFixed(1), need: midNeed(), auto: M.autoLog.length > 0,
    president: { name: S.president.name, party: S.president.party, approval: S.president.approval },
    opp: { message: O.message || null, msgHot: !!O.msgHot, strategy: O.strategy || null, coach: O.coach || null, adBuy: O.adBuy || 0, gotv: !!O.gotv, surrogates: (O.surrogates || []).map(s => ({ ...s })) } };
}
// the campaign in review, from a record (the Eve screen and the results explorer share it)
function midRecapRows(R) {
  if (!R) return [];
  const side = R.side || S.side, O = R.opp || {}, st = k => MID_STRATS[k] ? MID_STRATS[k].name : k, tg = t => TAG[t] ? `${TAG[t][0]} ${TAG[t][1]}` : t;
  const deb = d => `${stName(d.code)}: ${d.winner === side ? '<span style="color:var(--yes)">won</span>' : d.winner ? '<span style="color:var(--no)">lost</span>' : 'a draw'} (${midNum(+d.result)})${d.coached ? ', with your coach' : ''}${d.oppCoached ? ', against their coach' : ''}`;
  return [
    R.message ? `<b>Message:</b> ${tg(R.message)}${R.msgHot ? ' — a top-two issue with voters (+0.8 everywhere)' : ''}` : '',
    R.strategy ? `<b>Strategy:</b> ${st(R.strategy)}` : '',
    O.strategy ? `<b>Their campaign:</b> ran on ${tg(O.message)}${O.msgHot ? ' (a top issue, −0.8 for you)' : ''} with ${MID_STRATS[O.strategy] ? MID_STRATS[O.strategy].prose : O.strategy}` : '',
    R.debates && R.debates.length ? `<b>The debates:</b> ${R.debates.map(deb).join(' · ')}` : '',
    ...(R.events || []).map(e => `<b>The surprise:</b> <span class="camp-hl">${e.title}</span> — <i>${e.choice}</i>${e.effect ? ` (${e.effect})` : ''}`),
    R.surrogates && R.surrogates.length ? `<b>Surrogates:</b> ${R.surrogates.map(s => `${s.who} → ${s.code} (${midNum(+s.pts)})`).join(', ')}` : '',
    `<b>The closing weekend:</b> ${R.adBuy ? `${R.adBuy} unit${R.adBuy > 1 ? 's' : ''} of national ads (${midNum(cashEff(R.adBuy, 0.6))})` : 'no closing ad buy'}; ${R.gotv ? 'paid the turnout machine (+0.5)' : 'no turnout money'}`,
    O.strategy ? `<b>Their closing weekend:</b> ${midOppLine({ surrogates: O.surrogates || [], adBuy: O.adBuy, gotv: O.gotv })}${O.coach ? `; their debate coach went to ${O.coach}` : ''}` : '',
    `<b>Net campaign effect:</b> ${midNum(+R.national || 0)} in every Senate race (before state-by-state moves), ${midNum(+R.houseAdj || 0)} for the House`,
  ].filter(Boolean);
}
function midEveScreen() {
  const M = midM(), mine = S.side, theirs = other(mine), s = midSeats(), need = midNeed(), last = M.polls[M.polls.length - 1], first = M.polls[0];
  const toss = midClose().filter(rc => { const p = raceChance(rc); return p > 0.3 && p < 0.7; }), holdMine = isMajority();
  const hl = s >= need + 1.5 ? `ELECTION EVE: ${PARTY[mine].short.toUpperCase()} FAVORED TO ${holdMine ? 'HOLD' : 'TAKE'} THE SENATE` : s <= need - 1.5 ? `ELECTION EVE: ${PARTY[theirs].short.toUpperCase()} FAVORED TO ${holdMine ? 'TAKE' : 'HOLD'} THE SENATE` : 'ELECTION EVE: THE SENATE ON A KNIFE\'S EDGE';
  const quote = pick(['It comes down to who shows up in the rain.', `Whoever wins ${toss[0] ? stName(toss[0].m.state) : 'the suburbs'} wins the Senate.`, 'If the polls are off by two, throw out every forecast.', 'We like our map. We do not love it.', 'Nobody on this staff is sleeping tonight.']);
  const draw = () => {
    showModal(`<div class="kicker">The Midterm Campaign · ${MID_ROUNDS[3]} · ${midYear()}</div><h2>Election Eve</h2>
      ${frontPage({ headline: hl, sub: `The final forecast: ${s.toFixed(1)} ${PARTY[mine].name} seats, ${need} needed for control; ${toss.length} race${toss.length === 1 ? '' : 's'} too close to call.`, mood: s >= need ? 'dawn' : 'night', date: `November ${midYear()} · Election Eve`,
        body: [`WASHINGTON — The last forecast of the ${midYear()} midterms gives the ${PARTY[mine].short} about ${s.toFixed(1)} Senate seats, ${midNum(s - first.seats)} since the primaries ended. The House generic ballot stands at ${last.gb.toFixed(1)}% for the ${PARTY[mine].short}, with ${presTitle()} at ${S.president.approval}% approval.`,
          toss.length ? `The races that will decide it: ${toss.slice(0, 6).map(rc => `${stName(rc.m.state)} (${Math.round(raceChance(rc) * 100)}%)`).join(', ')}. ${toss[0] ? `In ${stName(toss[0].m.state)}, ${midCand(toss[0], mine)} and ${midCand(toss[0], theirs)} closed with dueling rallies in ${midCity(toss[0].m.state)}.` : ''}` : 'Not a single race is inside the margin of error. That is usually when the polls are wrong.',
          `"${quote.replace(/\.$/, ',')}" said a senior ${PARTY[mine].name} strategist who asked not to be named. ${M.surrogates.length ? `${M.surrogates.map(x => x.who).join(', ')} spent the weekend on the road for the party's candidates.` : ''}`,
          M.opp && M.opp.surrogates ? `The ${PARTY[theirs].name} committee closed with ${midOppLine(M.opp)}.` : ''].filter(Boolean) })}
      ${M.autoLog.length ? `<div class="camp-autolog"><b>While you were whipping, the campaign committee:</b>${M.autoLog.map(t => `<div>• ${t}</div>`).join('')}</div>` : ''}
      <div class="camp-card"><div class="camp-ch"><b>📋 The midterm campaign in review</b><span>${midYear()}</span></div><div class="camp-recap">${midRecapRows(midRecord()).map(r => `<div>${r}</div>`).join('')}</div></div>
      <div class="mid-grid">${midTrackerHTML()}${midMapCardHTML()}</div>${midCloseHTML()}
      <div class="choices"><button class="btn primary big adv" id="mideve">To the trail ▶<small>${S.election.cash} campaign unit${S.election.cash === 1 ? '' : 's'} left to spend race by race.</small></button></div>`);
    $('#modal-card').classList.add('camp-wide'); MID_UI.screen = 'eve';
    $('#mideve').onclick = () => midFinish();
  };
  MID_UI.draw = draw; draw();
}
function midFinish() {
  const M = midM(), ui = MID_UI; if (!M || !ui) return;
  S.lastMidterm = midRecord();
  M.stage = 'done'; M.ui = null;
  $('#modal-card').classList.remove('camp-wide');
  MID_UI = null; MID_EVT_LIVE = null;
  log(`Election Eve: ~${S.lastMidterm.seatsProjected} ${PARTY[S.side].name} seats projected after the campaign.`, 'sys');
  ui.done();
}
// the campaign in review, folded, for the Senate trail in a midterm year (game.js may render it under the primary results)
function midTrailHTML() {
  const R = S.lastMidterm, E = S.election;
  if (!R || !E || E.pres || R.year !== E.year) return '';
  return `<details class="cdet"><summary>📋 The midterm campaign in review · ~${R.seatsProjected} ${PARTY[S.side].name} seats projected on Election Eve</summary>${midSeatChart(R.polls, S.side, { need: R.need })}<div class="camp-recap">${midRecapRows(R).map(r => `<div>${r}</div>`).join('')}</div></details>`;
}
// "Let the campaign run itself": the committee takes every remaining call with sensible defaults
function midAutoRun() {
  const M = midM(); if (!M) return;
  const note = t => M.autoLog.push(t);
  let guard = 0;
  while (M.stage !== 'eve' && M.stage !== 'done' && guard++ < 10) {
    if (M.stage === 'r1') { midApplyR1(); note(`Labor Day: ran on ${TAG[M.message][1]}${M.msgHot ? ' (a top issue, +0.8)' : ''} with ${MID_STRATS[M.strategy].prose}.`); }
    else if (M.stage === 'r2') { M.round = 1; if (!M.ui || !('coach' in M.ui)) M.ui = { coach: null }; midApplyR2(); note(`The debates: ${M.debates.map(d => `${d.code} ${d.winner === S.side ? 'won' : d.winner ? 'lost' : 'drew'} (${midNum(d.result)})`).join(', ')}; ${M.coach ? `your coach went to ${M.coach}` : 'no coach'}.`); }
    else if (M.stage === 'deb') M.stage = 'ev';
    else if (M.stage === 'ev') { midApplyEvent(null); note(`The surprise, <span class="camp-hl">${M.lastOutcome.title}</span>: ${M.lastOutcome.choice}${M.lastOutcome.effect ? ` (${M.lastOutcome.effect})` : ''}.`); }
    else if (M.stage === 'out') M.stage = 'r3';
    else if (M.stage === 'r3') { M.round = 2; if (!M.ui || !M.ui.pool) M.ui = midR3UI(); if (M.ui.ad == null) M.ui.ad = Math.min(1, S.election.cash); midApplyR3(); note(`The final weekend: ${M.adBuy ? `${M.adBuy} unit of closing ads` : 'no ad buy'}; ${M.surrogates.map(s => `${s.who} → ${s.code}`).join(', ') || 'no surrogates'}; ${M.gotv ? 'paid turnout' : 'kept the capital'}.`); }
    else break;
  }
  sfx.up();
  midEveScreen();
}

ACH.push(['midmaestro', '🗳️', 'Midterm Maestro', 'Gain Senate seats in a midterm while your party holds the White House.']);
