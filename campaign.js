'use strict';
/* =====================================================================
   CAMPAIGN — the presidential general election. The fall campaign runs
   in five rounds between the Senate primaries and the Senate trail:
   Labor Day (the message and the map), the first debate, October (the
   running mates' debate and the second debate), the October Surprise
   and the final weekend (ads, surrogates, turnout). It also renders the
   presidential battleground on the Senate campaign trail.
   Loaded after convention.js and before night.js. Defines
   fallCampaign(done) (called by electionPrep in game.js),
   campaignEffects() and campaignStateD(c, noms) (called by presSetup /
   stateMarginD in night.js), presBattleHTML() and bindPresBattle(draw).
   ===================================================================== */

/* ---------------- constants ---------------- */
const CAMP_ROUNDS = ['Labor Day', 'The First Debate', 'October', 'The October Surprise', 'The Final Weekend'];
const CAMP_MAPS = {
  rust: { name: 'The Rust Belt', prose: 'a Rust Belt strategy', where: 'the Rust Belt', icon: '🏭', states: ['MI', 'WI', 'PA', 'MN', 'OH', 'IA'], blurb: 'Union halls, county fairs and shuttered mills: six states, 77 electoral votes.' },
  sun: { name: 'The Sun Belt', prose: 'a Sun Belt strategy', where: 'the Sun Belt', icon: '☀️', states: ['AZ', 'GA', 'NV', 'NC', 'FL', 'TX'], blurb: 'Booming suburbs and brand-new voters: six states, 119 electoral votes.' },
  expand: { name: 'Expand the map', prose: 'an expand-the-map strategy', where: 'an expanded map', icon: '🧭', states: null, blurb: 'Contest every state the other ticket leads by less than 6. Ambitious, and thin.' },
  base: { name: 'Run up the base', prose: 'a base-turnout strategy', where: 'their own base', icon: '📣', states: [], blurb: 'Turn out your own voters everywhere: +0.6 nationally, but −0.4 in the swing states you stop visiting.' },
};
const CAMP_COAST = { TX: ['Galveston', 'Corpus Christi', 'Port Arthur'], LA: ['Lake Charles', 'Houma', 'Grand Isle'], MS: ['Biloxi', 'Pascagoula', 'Gulfport'], AL: ['Mobile', 'Gulf Shores', 'Dauphin Island'], FL: ['Pensacola', 'Fort Myers', 'Panama City', 'Tampa'], GA: ['Savannah', 'Brunswick'] };
// poll labels: [short label under the chart, how the moment reads after "since"]
const CAMP_POLL_LBL = { 'July': ['Jul', 'July'], 'After the conventions': ['Conv.', 'the conventions'], 'Labor Day': ['Labor Day', 'Labor Day'], 'Mid-September': ['Mid-Sep', 'mid-September'], 'After the first debate': ['Debate 1', 'the first debate'], 'Mid-October': ['Mid-Oct', 'mid-October'], 'Late October': ['Late Oct', 'late October'], 'Election Eve': ['Eve', 'the final weekend'] };
const CAMP_THEME_LINE = { economy: 'Paychecks, plants and prices.', environment: 'Clean air and the next storm.', security: 'The border and the barracks.', welfare: 'Hospitals, pensions and the safety net.', rural: 'Main Street and the farm bill.', urban: 'Rent, transit and the cities.', taxes: 'What Washington takes.', tech: 'Chips, labs and the future.' };
const CAMP_DEBATE = {
  attack: { name: 'Attack', icon: '🗡️', blurb: 'Prosecute the opponent\'s record all night.', beats: 'reassure', loses: 'policy', drill: 'sharpening attacks on your nominee\'s record' },
  policy: { name: 'Policy', icon: '📋', blurb: 'Specifics, numbers, a plan for everything.', beats: 'attack', loses: 'viral', drill: 'cramming briefing books' },
  reassure: { name: 'Reassure', icon: '🤝', blurb: 'Calm, presidential, above the fray.', beats: 'viral', loses: 'attack', drill: 'practicing the calm, presidential tone' },
  viral: { name: 'Viral', icon: '📱', blurb: 'One rehearsed zinger built for the clip.', beats: 'policy', loses: 'reassure', drill: 'workshopping one-liners with a comedy writer' },
};
const CAMP_DEBATE_CITIES = ['Cleveland', 'Houston', 'St. Louis', 'Philadelphia', 'Las Vegas', 'Nashville', 'Milwaukee', 'Salt Lake City', 'Atlanta', 'Denver', 'Miami', 'Detroit'];
const CAMP_ZINGERS = ['Senator, you\'re no Lincoln, and this is no joke.', 'You can\'t fix a roof with a press release.', 'I\'ve read your plan. It\'s a bumper sticker.', 'Folks, that\'s not a record. That\'s a rap sheet.', 'The only thing you\'ve ever balanced is your campaign\'s books.', 'There you go again, and again, and again.', 'My opponent has a plan for everything except Tuesday.'];
// [what happened, the headline that followed the running mate's name]
const CAMP_GAFFES = [['called Ohio "Iowa" twice', 'CALLS OHIO "IOWA" — TWICE'], ['could not name the price of a gallon of milk', 'STUMPED BY THE PRICE OF MILK'], ['said the ticket would "look at" cutting Social Security, then un-said it', 'FLOATS SOCIAL SECURITY CUTS, THEN RETREATS'], ['froze for eleven seconds on a question about the deficit', 'FREEZES ON LIVE TV'], ['called the moderator "sweetheart"', 'CALLS MODERATOR "SWEETHEART"'], ['did not seem to know the ticket\'s own healthcare plan', 'FLUBS THE TICKET\'S OWN HEALTH PLAN'], ['said "the folks in flyover country" to a hall full of them', '"FLYOVER COUNTRY" REMARK STUNS RALLY'], ['promised a tax cut the nominee ruled out last week', 'CONTRADICTS NOMINEE ON TAXES']];
const CAMP_HURRICANES = ['Beryl', 'Celia', 'Dorian', 'Estelle', 'Fausto', 'Greta', 'Harlan', 'Imelda', 'Lorenzo', 'Nadine'];
const CAMP_CELEBS = [['Dax Marlowe', 'the country star'], ['Juniper Vale', 'the pop singer'], ['Rook Castellanos', 'the quarterback'], ['Imogen Frye', 'the Oscar winner'], ['DJ Halcyon', 'the festival headliner'], ['Tobias Wrenfield', 'the late-night host'], ['Sienna Okoro', 'the Olympic sprinter'], ['Cal Brightwater', 'the action-movie star']];
const CAMP_PAPERS = ['Tribune', 'Post-Dispatch', 'Sentinel', 'Herald', 'Gazette', 'Courier', 'Star-Ledger', 'Register', 'Free Press', 'Observer'];
let CAMP_UI = null;        // { done, draw } for the campaign on screen (never saved)
let CAMP_EVT_LIVE = null;  // the October surprise's live definition (functions; never saved)

/* ---------------- small helpers ---------------- */
const campC = () => (S.election && S.election.camp) || null;
const campSign = () => S.side === 'D' ? 1 : -1;              // D-positive → your-ticket-positive
const campYear = () => S.election ? S.election.year : electionYear(nextElectionK());
const campLast = n => (n && n.name ? (lastName(n) || n.name) : '—');
const campNum = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
const campAn = w => (/^([aeiou]|8|11\b|18\b)/i.test(w) ? 'an ' : 'a ') + w;   // the right article, numbers included
function campNoms() { return presSetup().noms; }
function campIsPres(n, p) { return !!n && S.president.party === p && n.name === S.president.name; }
function campOffice(n, p) { return campIsPres(n, p) ? 'President of the United States' : (n.office || `${PARTY[p].name} nominee`); }
// the live person behind a nominee record (after a save/load the record's `p` is a detached copy)
function campPersonOf(n) {
  if (!n) return null;
  if (S.president && S.president.name === n.name) return S.president;
  return S.members.find(m => m.name === n.name) || Object.values(S.governors || {}).find(g => g.name === n.name) || n.p || null;
}
function campVpPerson(vp) {
  if (!vp) return null;
  if (vp.id != null && S.members[vp.id] && S.members[vp.id].name === vp.name) return S.members[vp.id];
  return S.members.find(m => m.name === vp.name) || (S.vp && S.vp.name === vp.name ? S.vp : null) || vp.p || null;
}
function campRisk(vp) { let r = vp && vp.risk != null ? +vp.risk : 0.25; if (!(r >= 0)) r = 0.25; if (r > 1) r /= 100; return clamp(r, 0, 1); }
function campCharisma(x) { const c = x ? +x.charisma : 1; return c > 0 ? clamp(c, 0.5, 1.6) : 1; }
function campStars(c) { const n = clamp(Math.round((c - 0.75) / 0.75 * 5), 0, 5); return '★'.repeat(n) + '☆'.repeat(5 - n); }
function campAdj(code, pts) { const C = campC(); if (!C || !EV[code]) return; C.stateAdj[code] = +((C.stateAdj[code] || 0) + pts * campSign()).toFixed(3); }
function campLeadText(pt) { const l = pt.me - pt.them; return Math.abs(l) < 1 ? 'a dead heat' : `${l > 0 ? 'you lead' : 'you trail'} by ${Math.abs(l).toFixed(1)}`; }
function campTopSalience(n) { return Object.entries(S.salience || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]); }

/* ---------------- the effects night.js reads ---------------- */
// the accumulated national effect of the campaign, from your ticket's point of view
function campaignEffects() {
  const C = campC(); if (!C) return 0;
  const N = S.nominees || {}, my = N[S.side] || {}, their = N[other(S.side)] || {};
  const u = n => n.unity == null ? 1 : n.unity;
  return C.national + 0.5 * ((my.bounce || 0) - (their.bounce || 0)) + 3 * (u(my) - u(their));
}
// Democratic-positive points for one state: focus states, surrogates and events, plus the platform planks
function campaignStateD(c, noms) {
  const C = campC();
  let d = C && C.stateAdj ? (C.stateAdj[c] || 0) : 0;
  const st = ST[c]; if (!st || !noms) return d;
  let pl = 0;
  for (const p of ['D', 'R']) {
    const n = noms[p]; if (!n || !n.planks || !n.planks.length) continue;
    const sg = p === 'D' ? 1 : -1, hostile = p === 'D' ? st.lean >= 10 : st.lean <= -10;
    for (const k of n.planks) {
      if (!k || !st.voter[k.tag]) continue;
      const v = st.voter[k.tag];
      pl += sg * v * 0.6;                                   // attention to what this state cares about
      if (k.dir === 1 && hostile) pl -= sg * 0.3 * Math.abs(v); // a flank plank plays badly deep in enemy territory
    }
  }
  return d + clamp(pl, -2.5, 2.5);
}

/* ---------------- nominees: cope with old saves and missing conventions ---------------- */
function campEnsureNominees() {
  const base = presSetup().noms, N = S.nominees || {};
  for (const p of ['D', 'R']) {
    if (!N[p]) {
      const b = base[p];
      let person = b.p, office = 'President of the United States', state = b.state;
      if (!person) {
        state = pick(STATES)[0]; person = newPerson(p, state, { age: ri(46, 70) }); person.faction = b.faction || pick(FACTIONS[p])[0];
        office = `Former Governor of ${ST[state].name}`;
        hist(person, `Elected Governor of ${ST[state].name}`, campYear() - ri(6, 12));
        hist(person, `Won the ${campYear()} ${PARTY[p].name} presidential nomination`, campYear());
      }
      N[p] = { p: person, name: person.name, state, faction: person.faction || b.faction, office, charisma: person === S.president ? 1.05 : rnd(0.85, 1.2), vp: null, fallback: true };
    }
    const n = N[p];
    if (!n.vp) {
      // no running mate named: the ticket is completed quietly
      if (campIsPres(n, p) && S.vp && S.vp.party === p) n.vp = { name: S.vp.name, state: S.vp.state, faction: S.vp.faction, charisma: 1, risk: 0.2 };
      else {
        const m = shuffle(S.members.filter(m => m.party === p && m.name !== n.name && m.state !== n.state && Math.abs(ST[m.state].lean) <= 6))[0] || S.members.find(m => m.party === p && m.name !== n.name && m.state !== n.state) || S.members.find(m => m.party === p && m.name !== n.name);
        if (m) { n.vp = { name: m.name, state: m.state, id: m.id, faction: m.faction, charisma: rnd(0.8, 1.2), risk: rnd(0.1, 0.5) }; hist(m, `Named ${n.name}'s running mate`, campYear()); }
      }
    }
  }
  S.nominees = N;
}

/* ---------------- polls: truth plus noise ---------------- */
function campTruth() { const s = presSetup(); return (s.inc === S.side ? 1 : -1) * s.base; }
function campPoll(lbl, und, truth) {
  const C = campC(); if (truth == null) truth = campTruth();
  const tp = C.thirdParty ? C.thirdParty.share : 0, pool = 100 - und - tp;
  // each ticket's share carries its own sampling error (about ±1.5 on the margin); the undecided absorb the difference
  const me = clamp(pool / 2 + truth / 2 + gauss() * 1.1, pool * 0.3, pool * 0.7), them = clamp(pool / 2 - truth / 2 + gauss() * 1.1, pool * 0.3, pool * 0.7);
  const L = CAMP_POLL_LBL[lbl] || [lbl, lbl.toLowerCase()];
  const pt = { lbl, short: L[0], since: L[1], me: +me.toFixed(1), them: +them.toFixed(1), und: +Math.max(1, 100 - tp - me - them).toFixed(1), tp: +tp.toFixed(1) };
  C.polls.push(pt); return pt;
}
// the tracker: both tickets over the fall, with the moments labeled and the end labels kept apart
function campChart(C) {
  const mine = S.side, noms = campNoms(), pts = C.polls, n = pts.length;
  const W = 640, H = 210, pl = 36, pr = 118, pt = 16, pb = 30, short = s => s.length > 11 ? s.slice(0, 10) + '…' : s;
  const vals = pts.flatMap(p => [p.me, p.them]);
  let lo = Math.floor((Math.min(...vals) - 3) / 5) * 5, hi = Math.ceil((Math.max(...vals) + 3) / 5) * 5;
  if (hi - lo < 20) { const mid = (hi + lo) / 2; lo = Math.floor((mid - 10) / 5) * 5; hi = lo + 20; }
  const x = i => pl + (n < 2 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (n - 1)), y = v => pt + (hi - v) / (hi - lo) * (H - pt - pb);
  let svg = `<svg viewBox="0 0 ${W} ${H}" class="lchart camp-chart">`;
  for (let v = lo; v <= hi; v += 5) svg += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 50 ? '#9aa3b2' : '#2a3242'}" stroke-dasharray="${v === 50 ? '4 3' : ''}"/><text x="${pl - 6}" y="${y(v) + 4}" font-size="10" fill="#6b7587" text-anchor="end">${v}%</text>`;
  pts.forEach((p, i) => { svg += `<line x1="${x(i)}" x2="${x(i)}" y1="${pt}" y2="${H - pb + 4}" stroke="#2a3242" stroke-dasharray="2 4"/><text x="${x(i)}" y="${H - 8}" font-size="10" fill="#9aa3b2" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}" font-weight="${i === n - 1 ? 800 : 400}">${p.short || p.lbl}</text>`; });
  const series = [{ k: 'me', color: PARTY[mine].color, label: campLast(noms[mine]) }, { k: 'them', color: PARTY[other(mine)].color, label: campLast(noms[other(mine)]) }];
  const last = pts[n - 1], ends = series.map(s => y(last[s.k]));
  if (Math.abs(ends[0] - ends[1]) < 15) { const d = (15 - Math.abs(ends[0] - ends[1])) / 2; if (ends[0] <= ends[1]) { ends[0] -= d; ends[1] += d; } else { ends[0] += d; ends[1] -= d; } }
  series.forEach((s, si) => {
    svg += `<polyline fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" points="${pts.map((p, i) => `${x(i)},${y(p[s.k])}`).join(' ')}"/>`;
    pts.forEach((p, i) => { svg += `<circle cx="${x(i)}" cy="${y(p[s.k])}" r="${i === n - 1 ? 4.5 : 2.5}" fill="${s.color}"><title>${p.lbl}: ${s.label} ${p[s.k].toFixed(1)}%</title></circle>`; });
    svg += `<text x="${W - pr + 8}" y="${ends[si] + 4}" font-size="11.5" fill="${s.color}" font-weight="800">${short(s.label)} ${last[s.k].toFixed(1)}%</text>`;
  });
  if (last.tp) svg += `<text x="${W - pr + 8}" y="${H - pb - 2}" font-size="10" fill="${PARTY.I.color}" font-weight="700">${short(C.thirdParty ? lastName(C.thirdParty) || C.thirdParty.name : 'Ind.')} ${last.tp.toFixed(1)}%</text>`;
  return svg + '</svg>';
}
function campStartPolls() {
  const N = S.nominees || {}, my = N[S.side] || {}, their = N[other(S.side)] || {};
  const u = n => n.unity == null ? 1 : n.unity;
  const conv = 0.5 * ((my.bounce || 0) - (their.bounce || 0)) + 3 * (u(my) - u(their));
  const t = campTruth();
  campPoll('July', 9, t - conv);               // before the conventions
  campPoll('After the conventions', 8.5, t);   // the bounces land
  campPoll('Labor Day', 8, t);
}

/* ---------------- the Electoral College projection ---------------- */
function campProj() {
  const pr = presProjection(), sg = campSign(), by = {};
  const states = Object.keys(EV).map(c => { const x = { c, m: pr.margins[c] * sg, ev: EV[c] }; by[c] = x; return x; });
  const battle = states.filter(x => Math.abs(x.m) < 8).sort((a, b) => b.ev - a.ev);
  return { pr, states, by, battle, evMine: pr.evMine, evTheirs: 538 - pr.evMine, noms: pr.noms };
}
// where a surrogate or a dollar can matter: the battlegrounds, or the closest states when nothing is close
function campTargets(P) { return P.battle.length ? P.battle : P.states.slice().sort((a, b) => Math.abs(a.m) - Math.abs(b.m)).slice(0, 8); }
function campPath(P) {
  const sum = a => a.reduce((s, x) => s + x.ev, 0);
  const safe = sum(P.states.filter(x => x.m >= 8)), likely = P.states.filter(x => x.m >= 4 && x.m < 8), base = safe + sum(likely);
  if (safe >= 270) return `Your ticket clears 270 on its safe states alone (${safe} EV); the battlegrounds are gravy.`;
  if (base >= 270) return `${safe} EV are safe and ${sum(likely)} more lean your way (${likely.map(x => x.c).join(', ')}): hold them and you have ${base}.`;
  const need = 270 - base, path = []; let got = 0;
  for (const x of P.states.filter(x => x.m > -4 && x.m < 4).sort((a, b) => b.m - a.m)) { if (got >= need) break; path.push(x); got += x.ev; }
  if (got < need) return `No clean path: ${base} EV are safe or leaning your way, and even sweeping every toss-up (${got} EV) leaves you short of 270. You need a wave.`;
  const shown = path.length > 7 ? path.slice(0, 6) : path;
  return `Path to 270: ${base} EV safe or leaning your way, plus ${shown.map(x => `<b>${x.c}</b> (${x.ev})`).join(' + ')}${path.length > 7 ? ` + ${path.length - 6} more toss-ups` : ''} = ${base + got}.`;
}
function campChip(x, extra = '') { const col = x.m >= 0 ? 'var(--yes)' : 'var(--no)'; return `<span class="camp-chip ${extra}" style="border-color:${col}">${x.c} <small>${x.ev}</small> <b style="color:${col}">${x.m >= 0 ? '+' : '−'}${Math.abs(x.m).toFixed(1)}</b></span>`; }
function campMapHTML(P) {
  const C = campC() || {}, mine = S.side, focus = new Set(C.focus || []), sur = {}, osur = {};
  (C.surrogates || []).forEach(s => sur[s.code] = s.name);
  ((C.opp && C.opp.surrogates) || []).forEach(s => osur[s.code] = s.name);
  return usMap({
    fill: c => { const x = P.by[c]; if (!x) return null; return { c: x.m >= 0 ? PARTY[mine].color : PARTY[other(mine)].color, op: 0.3 + Math.min(0.7, Math.abs(x.m) / 15) }; },
    sub: c => P.by[c] ? `${EV[c]}` : '',
    ring: c => focus.has(c) ? '#f6d27a' : sur[c] ? '#ffffff' : osur[c] ? PARTY[other(mine)].color : null,
    title: c => { const x = P.by[c]; if (!x) return stName(c); return `${stName(c)}: ${x.m >= 0 ? 'your ticket' : 'theirs'} +${Math.abs(x.m).toFixed(1)} · ${EV[c]} EV${focus.has(c) ? ' · your focus state' : ''}${sur[c] ? ` · ${sur[c]} barnstorming for you` : ''}${osur[c] ? ` · ${osur[c]} barnstorming for the other side` : ''}`; },
  });
}

/* ---------------- shared pieces of every campaign screen ---------------- */
function campTicketsHTML(noms) {
  const mine = S.side, C = campC();
  return `<div class="camp-tickets">${[mine, other(mine)].map(p => {
    const n = noms[p], person = campPersonOf(n), office = campOffice(n, p);
    // the message: the one the campaign chose on Labor Day once it has, the convention's before that
    const theme = (p === mine ? C && C.theme : C && C.opp && C.opp.theme) || n.theme;
    return `<div class="camp-tk" style="border-color:${PARTY[p].color}">${person && person.seed != null ? portrait(person) : '<span class="camp-noport">🇺🇸</span>'}<div>
      <div class="camp-tkn"><b>${n.name}</b>${p === mine ? '<span class="camp-you">your ticket</span>' : ''}${person ? `<a href="#" data-cprof="${p}">profile</a>` : ''}</div>
      <small>${office} · ${n.faction || PARTY[p].name}${n.state && !office.includes(stName(n.state)) ? ' · ' + stName(n.state) : ''}</small>
      <small>${n.vp ? `with <b>${n.vp.name}</b>${n.vp.state ? ` of ${stName(n.vp.state)}` : ''}` : 'no running mate named'}${theme && TAG[theme] ? ` · message: ${TAG[theme][0]} ${TAG[theme][1]}` : ''}${n.unity != null ? ` · party ${Math.round(n.unity * 100)}% united` : ''}</small></div></div>`;
  }).join('<span class="vs">vs</span>')}</div>`;
}
function campTrackerHTML() {
  const C = campC(), mine = S.side, noms = campNoms();
  const last = C.polls[C.polls.length - 1], prev = C.polls[C.polls.length - 2];
  const lead = last.me - last.them, trend = prev ? lead - (prev.me - prev.them) : 0;
  return `<div class="camp-card"><div class="camp-ch"><b>📊 National poll of polls</b><span>${last.lbl}</span></div>${campChart(C)}
    <div class="camp-pop"><span style="color:${PARTY[mine].color}"><b>${last.me.toFixed(1)}</b>${campLast(noms[mine])}</span><span style="color:${PARTY[other(mine)].color}"><b>${last.them.toFixed(1)}</b>${campLast(noms[other(mine)])}</span>${last.tp ? `<span style="color:${PARTY.I.color}"><b>${last.tp.toFixed(1)}</b>${C.thirdParty ? C.thirdParty.name : 'Independent'} (I)</span>` : ''}<span style="color:var(--dim)"><b>${last.und.toFixed(0)}</b>undecided</span></div>
    <div class="camp-lead">${campLeadText(last).replace(/^./, ch => ch.toUpperCase())}${prev ? ` · ${trend > 0.3 ? '📈 moving your way' : trend < -0.3 ? '📉 slipping' : '➡ steady'} since ${prev.since || prev.lbl}` : ''}</div>
    <div class="camp-polls">${C.polls.map(p => `<span class="camp-pt">${p.lbl}: <b>${p.me.toFixed(0)}–${p.them.toFixed(0)}</b></span>`).join('')}</div></div>`;
}
function campMapCardHTML(P) {
  const mine = S.side, C = campC() || {};
  return `<div class="camp-card"><div class="camp-ch"><b>🗺️ Electoral College projection</b><span>270 to win</span></div>
    <div class="camp-evrow"><div class="camp-ev" style="color:${PARTY[mine].color}"><b>${P.evMine}</b><small>${campLast(P.noms[mine])}</small></div><div class="camp-evbar"><i style="width:${P.evMine / 538 * 100}%;background:${PARTY[mine].color}"></i><i style="width:${P.evTheirs / 538 * 100}%;background:${PARTY[other(mine)].color}"></i><em></em></div><div class="camp-ev" style="color:${PARTY[other(mine)].color}"><b>${P.evTheirs}</b><small>${campLast(P.noms[other(mine)])}</small></div></div>
    <div class="campmap">${campMapHTML(P)}</div>
    <div class="camp-chips"><b>Battlegrounds</b> ${P.battle.map(x => campChip(x, (C.focus || []).includes(x.c) ? 'focus' : C.opp && (C.opp.focus || []).includes(x.c) ? 'oppfocus' : '')).join('') || '<small style="color:var(--dim)">none within 8 points: this one isn\'t close</small>'}</div>
    <p class="camp-path">${campPath(P)}${C.focus && C.focus.length ? ` <span style="color:var(--gold2)">Gold rings and glowing chips: your focus states.</span>` : ''}${C.opp && C.opp.focus && C.opp.focus.length ? ' <span style="color:var(--dim)">Dashed chips: where their campaign is camped.</span>' : ''}</p></div>`;
}
function campMoneyHTML() {
  const E = S.election;
  return `<div class="camp-money"><span>💰 <b>${E.cash}</b> campaign unit${E.cash === 1 ? '' : 's'} left, shared with the Senate races: every unit here is a unit not spent on a Senate seat.</span>
    <span class="cashctl"><small>Bulk money for the ticket</small><button class="btn" data-pc="-1" ${E.presCash ? '' : 'disabled'}>−</button><span class="dots">${money(E.presCash)}</span><button class="btn" data-pc="1" ${E.cash < 1 ? 'disabled' : ''}>+</button><small>${E.presCash ? `${campNum(cashEff(E.presCash, 1.2))} national` : 'first unit ≈ +1.2 national'}</small></span></div>`;
}
function campPickHTML(label, key, note = '') { return `<div class="camp-pick">✓ <b>${label}</b>${note ? `<small>${note}</small>` : ''}<a href="#" data-camp="re:${key}">change</a></div>`; }
function campFrame(title, intro, decisions, nextLabel) {
  const C = campC(), P = campProj(), card = $('#modal-card');
  // a redraw of the same screen (a pick, a money click, back from a profile) keeps the scroll position; a new round starts at the top
  const key = `${C.stage}:${title}`, sc = CAMP_UI && CAMP_UI.screen === key ? card.scrollTop : 0;
  showModal(`<div class="kicker">The Fall Campaign · ${CAMP_ROUNDS[C.round]} · ${campYear()}</div><h2>${title}</h2>
    ${campTicketsHTML(P.noms)}<p>${intro}</p>
    ${campTrackerHTML()}${campMapCardHTML(P)}${campMoneyHTML()}
    ${decisions}
    <div class="choices"><button class="btn primary big adv" id="campnext">${nextLabel}</button><button class="btn ghost adv" id="campauto">Let the campaign run itself ⏩<small>The campaign manager makes every remaining call.</small></button></div>`);
  card.classList.add('camp-wide'); card.scrollTop = sc;
  if (CAMP_UI) CAMP_UI.screen = key;
  campBindCommon();
}
function campBindCommon() {
  const card = $('#modal-card');
  card.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => { const E = S.election, d = +b.dataset.pc; if (d > 0 && E.cash < 1) return; if (d < 0 && !E.presCash) return; E.presCash += d; E.cash -= d; sfx.click(); CAMP_UI.draw(); });
  card.querySelectorAll('[data-cprof]').forEach(a => a.onclick = e => { e.preventDefault(); const p = a.dataset.cprof, person = campPersonOf(campNoms()[p]); if (person) profileModal(person, `${PARTY[p].name} nominee`, () => CAMP_UI.draw()); });
  card.querySelectorAll('[data-camp^="re:"]').forEach(a => a.onclick = e => { e.preventDefault(); const C = campC(); if (C.ui) C.ui[a.dataset.camp.slice(3)] = null; sfx.click(); CAMP_UI.draw(); });
  if ($('#campauto')) $('#campauto').onclick = () => campAutoRun();
}

/* ---------------- entry ---------------- */
function fallCampaign(done) {
  const E = S.election;
  if (!E || !E.pres || (E.camp && E.camp.stage === 'done')) { done(); return; }
  campEnsureNominees();
  E.presCash = E.presCash || 0;
  E.camp = { round: 0, stage: 'r1', polls: [], strategy: null, theme: null, themeHot: false, focus: [], debates: [], events: [], surrogates: [], national: 0, stateAdj: {}, thirdParty: null, momentum: false, adBuy: 0, gotv: false, opp: null, ui: {}, autoLog: [] };
  CAMP_UI = { done, draw: null };
  campStartPolls();
  log(`The fall campaign begins: ${S.nominees[S.side].name} vs ${S.nominees[other(S.side)].name}.`, 'sys');
  campRound1();
}

/* ---------------- round 1: Labor Day ---------------- */
function campDefaultTheme() {
  const my = (S.nominees || {})[S.side] || {};
  if (my.theme && TAGS.includes(my.theme)) return my.theme;
  const sal = Object.entries(S.salience || {}).sort((a, b) => b[1] - a[1]), prior = PARTY[S.side].prior;
  const best = sal.find(([t]) => (prior[t] || 0) > 0);
  return best ? best[0] : sal[0] ? sal[0][0] : 'economy';
}
function campDefaultMap(P) {
  const inPlay = key => CAMP_MAPS[key].states.reduce((a, c) => a + (P.by[c] && Math.abs(P.by[c].m) < 8 ? EV[c] : 0), 0);
  return inPlay('rust') >= inPlay('sun') ? 'rust' : 'sun';
}
function campApplyStrategy(key, P) {
  const C = campC();
  let focus = key === 'expand' ? P.states.filter(x => x.m < 0 && x.m > -6).map(x => x.c) : CAMP_MAPS[key].states.slice();
  if (key === 'expand' && !focus.length) focus = P.states.filter(x => x.m < 0).sort((a, b) => b.m - a.m).slice(0, 3).map(x => x.c);
  C.strategy = key; C.focus = focus;
  if (key === 'base') { C.national += 0.6; for (const x of P.battle) campAdj(x.c, -0.4); }
  else for (const c of Object.keys(EV)) campAdj(c, focus.includes(c) ? 1.5 : -0.3);
}
// the other side campaigns too: their message and their map, mirrored
function campOpponentLaborDay(P) {
  const C = campC(), theirs = other(S.side), their = P.noms[theirs], prior = PARTY[theirs].prior;
  const sal = Object.entries(S.salience || {}).sort((a, b) => b[1] - a[1]);
  const theme = their.theme && TAGS.includes(their.theme) ? their.theme : ((sal.find(([t]) => (prior[t] || 0) > 0) || sal[0] || ['economy'])[0]);
  const hot = campTopSalience(2).includes(theme);
  if (hot) C.national -= 1;
  const inPlay = key => CAMP_MAPS[key].states.reduce((a, c) => a + (P.by[c] && Math.abs(P.by[c].m) < 8 ? EV[c] : 0), 0);
  const r = Math.random(), key = r < 0.2 ? 'base' : r < 0.4 ? 'expand' : inPlay('rust') >= inPlay('sun') ? 'rust' : 'sun';
  let focus = key === 'expand' ? P.states.filter(x => x.m > 0 && x.m < 6).map(x => x.c) : CAMP_MAPS[key].states.slice();
  if (key === 'expand' && !focus.length) focus = P.states.filter(x => x.m > 0).sort((a, b) => a.m - b.m).slice(0, 3).map(x => x.c);
  if (key === 'base') { C.national -= 0.6; for (const x of P.battle) campAdj(x.c, 0.4); }
  else for (const c of Object.keys(EV)) campAdj(c, focus.includes(c) ? -1.5 : 0.3);
  C.opp = { theme, themeHot: hot, strategy: key, focus, surrogates: [], adBuy: 0, gotv: false };
  const tp = campPersonOf(their); if (tp) hist(tp, `Ran for President on ${TAG[theme][1].toLowerCase()} with ${CAMP_MAPS[key].prose}`, campYear());
  log(`Across the aisle, ${campLast(their)} runs on ${TAG[theme][1]}${hot ? ' (a top issue, −1 for you)' : ''} with ${CAMP_MAPS[key].prose}.`, 'sys');
}
// their closing weekend: surrogates, late money and turnout
function campOpponentFinal(P) {
  const C = campC(), theirs = other(S.side), their = P.noms[theirs], O = C.opp || (C.opp = { theme: null, themeHot: false, strategy: null, focus: [], surrogates: [], adBuy: 0, gotv: false });
  const pool = S.members.filter(m => m.party === theirs && m.name !== their.name && !(their.vp && m.name === their.vp.name)).map(m => ({ m, s: (m.rec || 0) + (T(m, 'leader') ? 3 : 0) + (m.star ? 3 : 0) })).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.m);
  const targets = campTargets(P).slice().sort((a, b) => Math.abs(a.m) - Math.abs(b.m)), used = new Set();
  O.surrogates = pool.map(m => { const t = targets.find(x => x.c === m.state && !used.has(x.c)) || targets.find(x => !used.has(x.c)); if (!t) return null; used.add(t.c); campAdj(t.c, -1.2); hist(m, `Barnstormed ${stName(t.c)} for the ${campLast(their)} ticket`, campYear()); return { id: m.id, name: m.name, code: t.c }; }).filter(Boolean);
  O.adBuy = ri(0, 2); if (O.adBuy) C.national -= cashEff(O.adBuy, 0.7);
  O.gotv = Math.random() < 0.5; if (O.gotv) C.national -= 0.5;
  log(`Their closing weekend: ${campOppLine(O)}.`, 'sys');
}
function campOppLine(O) {
  if (!O) return '';
  return `${O.surrogates.map(s => `${s.name} → ${s.code}`).join(', ') || 'no surrogates'}${O.surrogates.length ? ' (−1.2 each)' : ''}; ${O.adBuy ? `${O.adBuy} unit${O.adBuy > 1 ? 's' : ''} of late ads (${campNum(-cashEff(O.adBuy, 0.7))})` : 'no late ads'}; ${O.gotv ? 'a paid turnout operation (−0.5)' : 'no turnout money'}`;
}
function campApplyR1() {
  const C = campC(), P = campProj(), ui = C.ui || {}, noms = P.noms, my = noms[S.side];
  const theme = TAGS.includes(ui.theme) ? ui.theme : campDefaultTheme();
  C.theme = theme; C.themeHot = campTopSalience(2).includes(theme);
  if (C.themeHot) C.national += 1;
  S.salience = S.salience || {}; S.salience[theme] = (S.salience[theme] || 1) + 1.5;
  const key = CAMP_MAPS[ui.map] ? ui.map : campDefaultMap(P);
  campApplyStrategy(key, P);
  campOpponentLaborDay(P);
  const mp = campPersonOf(my);
  if (mp) hist(mp, `Ran for President on ${TAG[theme][1].toLowerCase()} with ${CAMP_MAPS[key].prose}`, campYear());
  log(`Labor Day: the ${campLast(my)} campaign runs on ${TAG[theme][1]}${C.themeHot ? ' (a top issue, +1)' : ''} with ${CAMP_MAPS[key].prose}.`, 'sys');
  C.stage = 'r2';
  campPoll('Mid-September', 7);
}
function campRound1() {
  const C = campC(); C.round = 0; C.stage = 'r1'; C.ui = { theme: null, map: null };
  const draw = () => {
    const P = campProj(), noms = P.noms, mine = S.side, my = noms[mine], their = noms[other(mine)], hot = campTopSalience(2);
    const hasConv = ['D', 'R'].some(p => noms[p].city || noms[p].bounce != null || noms[p].unity != null);
    const convLine = p => { const n = noms[p]; if (!hasConv) return p === mine ? `The conventions are over and the matchup is set: your nominee ${n.name} against ${noms[other(p)].name}` : ''; const un = n.unity != null && n.unity < 0.85 ? `, and a party only ${Math.round(n.unity * 100)}% united` : ''; return `${p === mine ? 'Your nominee ' : ''}${n.name} left ${n.city ? n.city : 'the convention'} with ${n.bounce != null ? `a ${campNum(n.bounce, 0)}-point bounce` : 'the nomination'}${un}`; };
    const vp = my.vp, vpx = vp && vp.state && P.by[vp.state] ? P.by[vp.state] : null;
    const vpLine = vp ? (vpx ? ` Running mate <b>${vp.name}</b> puts ${stName(vp.state)} (${vpx.ev} EV) in play: +2 there, where you ${vpx.m >= 0 ? 'lead' : 'trail'} by ${Math.abs(vpx.m).toFixed(1)}.` : ` Running mate <b>${vp.name}</b> brings little geography and a lot of energy.`) : '';
    const pres = S.president.party === mine && campIsPres(my, mine) ? ` ${presTitle()} is on the ballot at ${S.president.approval}% approval.` : campIsPres(their, other(mine)) ? ` ${presTitle()} seeks a second term at ${S.president.approval}% approval; you're trying to take the White House.` : ` ${presTitle()} is not on the ballot, and sits at ${S.president.approval}%.`;
    const intro = `It's Labor Day, ${campYear()}: nine weeks to Election Day. ${convLine(mine)}${hasConv ? `; ${convLine(other(mine))}` : ''}.${pres}${vpLine} Choose the message your ticket repeats until the country is sick of it, and the map you'll bet the fall on.`;
    const themeHTML = C.ui.theme ? campPickHTML(`${TAG[C.ui.theme][0]} ${TAG[C.ui.theme][1]}`, 'theme', hot.includes(C.ui.theme) ? 'A top-2 issue with voters: +1 national.' : CAMP_THEME_LINE[C.ui.theme])
      : `<div class="camp-opts">${TAGS.map(t => `<button class="btn" data-choice="theme:${t}"><span>${TAG[t][0]} ${TAG[t][1]}<small>${CAMP_THEME_LINE[t]}${hot.includes(t) ? ' <b style="color:var(--gold2)">🔥 top issue: +1 national</b>' : ''}${t === my.theme ? ' <b>★ the convention\'s theme</b>' : ''}</small></span></button>`).join('')}</div>`;
    const standing = key => { const st = CAMP_MAPS[key].states; if (!st) { const ex = P.states.filter(x => x.m < 0 && x.m > -6); return `${ex.length} state${ex.length === 1 ? '' : 's'}, ${ex.reduce((a, x) => a + x.ev, 0)} EV: ${ex.map(x => x.c).join(', ') || 'none right now'}`; } if (!st.length) return 'everywhere at once'; const lead = st.filter(c => P.by[c].m >= 0).length; return `you lead in ${lead} of ${st.length}, ${st.reduce((a, c) => a + EV[c], 0)} EV`; };
    const mapHTML = C.ui.map ? campPickHTML(`${CAMP_MAPS[C.ui.map].icon} ${CAMP_MAPS[C.ui.map].name}`, 'map', standing(C.ui.map))
      : `<div class="camp-opts">${Object.entries(CAMP_MAPS).map(([k, m]) => `<button class="btn" data-choice="map:${k}"><span>${m.icon} ${m.name}<small>${m.blurb} <i>${standing(k)}.</i>${k !== 'base' ? ' Focus states +1.5; everywhere else −0.3.' : ''}</small></span></button>`).join('')}</div>`;
    campFrame('Labor Day: the message and the map', intro,
      `<div class="camp-dec"><h3>1. The message</h3><p>One issue, repeated. Picking what voters already care about is worth +1 nationally; picking your party's convention theme keeps the base happy either way.</p>${themeHTML}</div>
       <div class="camp-dec"><h3>2. The map</h3><p>Where the candidate sleeps, where the ads run, where the field offices open.</p>${mapHTML}</div>`, 'Next week ▶');
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice^="theme:"]').forEach(b => b.onclick = () => { C.ui.theme = b.dataset.choice.slice(6); sfx.click(); draw(); });
    card.querySelectorAll('[data-choice^="map:"]').forEach(b => b.onclick = () => { C.ui.map = b.dataset.choice.slice(4); sfx.click(); draw(); });
    $('#campnext').onclick = () => { campApplyR1(); sfx.up(); campRound2(); };
  };
  CAMP_UI.draw = draw; draw();
}

/* ---------------- the debates ---------------- */
function campOpponentPick(their) {
  const flank = FLANKS.includes(their.faction), mod = MODERATES.includes(their.faction);
  const w = flank ? { attack: 4, viral: 2.5, policy: 2, reassure: 1.5 } : mod ? { reassure: 3.5, policy: 3, attack: 2, viral: 1.5 } : { attack: 2.5, policy: 2.5, reassure: 2.5, viral: 2.5 };
  let r = Math.random() * Object.values(w).reduce((a, b) => a + b, 0);
  for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) return k; }
  return 'policy';
}
function campDefaultDebate(ui) { const h = ui && ui.hint; return (h && Object.keys(CAMP_DEBATE).find(k => CAMP_DEBATE[k].beats === h)) || 'policy'; }
// sets up the decision state for debate `which` (1 or 2); the second one also holds the running mates' debate
function campPrepDebateUI(which) {
  const C = campC(), their = campNoms()[other(S.side)], used = C.debates.map(d => d.city);
  const theirPick = campOpponentPick(their);
  C.ui = { prep: null, deb: null, which, theirPick, theirPrep: Math.random() < 0.5, hint: Math.random() < 0.6 ? theirPick : pick(Object.keys(CAMP_DEBATE).filter(k => k !== theirPick)), city: pick(CAMP_DEBATE_CITIES.filter(c => !used.includes(c))), mod: fullName(), when: pick(['Tuesday night', 'Wednesday night', 'Thursday night', 'Sunday night']) };
  if (which === 2) C.ui.vp = campVpDebate();
}
function campDebate(which, mineKey, prep, theirsKey, city, theirPrep) {
  const C = campC(), noms = campNoms(), mine = S.side, my = noms[mine], their = noms[other(mine)];
  let score = 0, how;
  if (CAMP_DEBATE[mineKey].beats === theirsKey) { score += 1.0; how = `${CAMP_DEBATE[mineKey].name} beat ${CAMP_DEBATE[theirsKey].name.toLowerCase()}`; }
  else if (CAMP_DEBATE[theirsKey].beats === mineKey) { score -= 1.0; how = `${CAMP_DEBATE[theirsKey].name} beat ${CAMP_DEBATE[mineKey].name.toLowerCase()}`; }
  else { score += (campCharisma(my) - campCharisma(their)) * 1.5; how = mineKey === theirsKey ? `both came to ${CAMP_DEBATE[mineKey].name.toLowerCase()}, so stage presence decided it` : 'the game plans cancelled out and stage presence decided it'; }
  if (prep) score += 0.7;
  if (theirPrep) score -= 0.7;
  const prepNote = prep && theirPrep ? '; both camps had drilled for days' : prep ? '; debate camp showed' : theirPrep ? `; ${campLast(their)}'s preparation showed` : '';
  score += gauss() * 0.8;
  const result = clamp(score, -3, 3), winner = result > 0.4 ? mine : result < -0.4 ? other(mine) : null;
  const W = winner ? noms[winner] : null, L = winner ? noms[other(winner)] : null, wk = winner === mine ? mineKey : theirsKey;
  const snap = winner ? Math.round(50 + Math.abs(result) * 6 + rnd(0, 3)) : ri(44, 49);
  const color = { attack: [`${W && W.name} went for the throat from the first question and ${L && campLast(L)} spent ninety minutes on the back foot.`, `"You've had years to fix this," ${W && campLast(W)} said, turning to the camera. The hall gasped.`], policy: [`${W && campLast(W)} had a number for everything; ${L && campLast(L)} had adjectives.`, `When ${L && campLast(L)} tried to interrupt, ${W && campLast(W)} finished the sentence, then the paragraph.`], reassure: [`${W && campLast(W)} never raised a voice, and by the end ${L && campLast(L)}'s attacks sounded like shouting in a library.`, `The split screen was brutal: ${L && campLast(L)} scowling, ${W && campLast(W)} smiling.`], viral: [`${W && campLast(W)}'s line — "${pick(CAMP_ZINGERS)}" — was clipped and shared twenty million times before the closing statements.`, `${L && campLast(L)} had the better arguments and nobody will remember a single one of them.`] };
  const loserColor = { attack: 'The attacks read as desperation.', policy: 'Reciting white papers to a room that wanted a fight.', reassure: 'Calm, yes. Also sedated.', viral: 'The rehearsed zinger landed with a thud; the only clip that trended was the silence after it.' };
  let text;
  if (winner) text = `${pick(color[wk])} ${L && campLast(L)}'s plan was ${CAMP_DEBATE[winner === mine ? theirsKey : mineKey].name.toLowerCase()}: ${loserColor[winner === mine ? theirsKey : mineKey].toLowerCase()} ${how.charAt(0).toUpperCase() + how.slice(1)}${prepNote}.`;
  else text = `${pick(['Both candidates survived; neither won. The panels spent the night arguing about the moderator.', 'Ninety minutes of interruptions and one memorable exchange about the price of eggs. A wash.', `A draw, by any honest scorecard. ${campLast(my)} edged the first half; ${campLast(their)} the second.`])} ${how.charAt(0).toUpperCase() + how.slice(1)}${prepNote}.`;
  C.national += result;
  const rec = { round: which, city, mine: mineKey, theirs: theirsKey, prep: !!prep, theirPrep: !!theirPrep, result: +result.toFixed(2), winner, snap, text };
  C.debates.push(rec);
  const wp = W && campPersonOf(W); if (wp) hist(wp, `Won the ${which === 1 ? 'first' : 'second'} ${campYear()} presidential debate in ${city}`, campYear());
  log(`Debate ${which} in ${city}: ${winner ? `${campLast(W)} wins (${snap}% in the snap poll)` : 'a draw'}; ${campNum(result)} for your ticket.`, result > 0.4 ? 'good' : result < -0.4 ? 'bad' : 'sys');
  return rec;
}
function campVpDebate() {
  const C = campC(), noms = campNoms(), mine = S.side, my = noms[mine], their = noms[other(mine)], mv = my.vp, tv = their.vp;
  const city = pick(CAMP_DEBATE_CITIES.filter(c => !C.debates.some(d => d.city === c)));
  let score = (campCharisma(mv) - campCharisma(tv)) * 1.2 + gauss() * 0.6;
  const gm = Math.random() < clamp(campRisk(mv) * 0.6, 0.04, 0.5), gt = Math.random() < clamp(campRisk(tv) * 0.6, 0.04, 0.5);
  if (gm) score -= 0.8; if (gt) score += 0.8;
  const result = clamp(score, -1, 1), winner = result > 0.3 ? mine : result < -0.3 ? other(mine) : null;
  const mn = mv ? mv.name : 'your running mate', tn = tv ? tv.name : 'their running mate', lines = [];
  const g1 = pick(CAMP_GAFFES), g2 = pick(CAMP_GAFFES.filter(g => g !== g1));
  if (gm) lines.push(`<b>${mn} ${g1[0]}.</b>`);
  if (gt) lines.push(`<b>${tn} ${(gm ? g2 : g1)[0]}.</b>`);
  if (!gm && !gt) lines.push(result > 0.3 ? `${mn} was crisp and funny; ${tn} was forgettable.` : result < -0.3 ? `${tn} owned the stage while ${mn} read from notes.` : 'Two running mates, ninety minutes, no news.');
  else lines.push(winner === mine ? `${mn} came out ahead anyway.` : winner ? `${tn} walked off the winner.` : 'Both camps claimed victory and nobody believed either.');
  const text = `The running mates met in ${city}. ${lines.join(' ')}`;
  C.national += result;
  const rec = { round: 'vp', city, result: +result.toFixed(2), gaffeMine: gm, gaffeTheirs: gt, winner, text };
  C.debates.push(rec);
  const mp = campVpPerson(mv), tp = campVpPerson(tv);
  if (mp && gm) hist(mp, `Gaffed in the ${campYear()} vice-presidential debate`, campYear()); else if (mp && winner === mine) hist(mp, `Won the ${campYear()} vice-presidential debate`, campYear());
  if (tp && gt) hist(tp, `Gaffed in the ${campYear()} vice-presidential debate`, campYear()); else if (tp && winner === other(mine)) hist(tp, `Won the ${campYear()} vice-presidential debate`, campYear());
  log(`VP debate in ${city}: ${winner === mine ? `${mn} wins` : winner ? `${tn} wins` : 'a wash'} (${campNum(result)}).`, result > 0.3 ? 'good' : result < -0.3 ? 'bad' : 'sys');
  return rec;
}
function campDebateVerdict(rec) { const noms = campNoms(); return rec.winner ? `${campLast(noms[rec.winner])} won, ${rec.snap}% in the snap poll (${campNum(rec.result)})` : `a draw (${campNum(rec.result)})`; }
function campDebateDecisionsHTML(ui, again) {
  const cap = S.career.capital;
  const prep = ui.prep != null ? campPickHTML(ui.prep ? '🎓 Debate camp (1 capital)' : '🎲 Wing it', 'prep', ui.prep ? 'Three days of mock debates: +0.7 to the result.' : 'The nominee trusts their instincts.')
    : `<div class="camp-opts"><button class="btn" data-choice="prep:1" ${cap < 1 ? 'disabled' : ''}><span>🎓 Debate camp${again ? ' again' : ''}<small>Three days of mock debates with a stand-in opponent: +0.7 to the result. Costs 1 capital (you have ${cap}).</small></span></button><button class="btn" data-choice="prep:0"><span>🎲 Wing it<small>Keep your capital for the Senate; trust the nominee's instincts.</small></span></button></div>`;
  const deb = ui.deb ? campPickHTML(`${CAMP_DEBATE[ui.deb].icon} ${CAMP_DEBATE[ui.deb].name}`, 'deb', `${CAMP_DEBATE[ui.deb].blurb} Beats ${CAMP_DEBATE[CAMP_DEBATE[ui.deb].beats].name.toLowerCase()}, loses to ${CAMP_DEBATE[CAMP_DEBATE[ui.deb].loses].name.toLowerCase()}.`)
    : `<div class="camp-opts">${Object.entries(CAMP_DEBATE).map(([k, d]) => `<button class="btn" data-choice="deb:${k}"><span>${d.icon} ${d.name}<small>${d.blurb} Beats <b>${CAMP_DEBATE[d.beats].name}</b>, loses to <b>${CAMP_DEBATE[d.loses].name}</b>.</small></span></button>`).join('')}</div>`;
  return `<div class="camp-dec"><h3>1. Preparation</h3>${prep}</div><div class="camp-dec"><h3>2. The game plan</h3><p>Rock, paper, scissors with podiums: a mismatch is decided by the plans, a matched pair by stage presence, and chance has a vote. The result lands between −3 and +3 nationally.</p>${deb}</div>`;
}
function campBindDebateDecisions(draw) {
  const C = campC(), card = $('#modal-card');
  card.querySelectorAll('[data-choice^="prep:"]').forEach(b => b.onclick = () => { const v = b.dataset.choice.slice(5) === '1'; if (v && S.career.capital < 1) return; C.ui.prep = v; sfx.click(); draw(); });
  card.querySelectorAll('[data-choice^="deb:"]').forEach(b => b.onclick = () => { C.ui.deb = b.dataset.choice.slice(4); sfx.click(); draw(); });
}
function campScorecard(rec, next) {
  const C = campC(), noms = campNoms(), mine = S.side, my = noms[mine], their = noms[other(mine)], W = rec.winner, wn = W ? noms[W] : null, ln = W ? noms[other(W)] : null;
  const share = W ? [rec.snap, Math.max(0, 100 - rec.snap - 8), 8] : [rec.snap, 100 - rec.snap - 10, 10];
  const draw = () => {
    showModal(`<div class="kicker">The Fall Campaign · ${CAMP_ROUNDS[C.round]} · ${campYear()}</div><h2>Debate night in ${rec.city}</h2>${campTicketsHTML(noms)}
      <div class="camp-score" id="campscore"><div class="camp-sc-head">
        <div class="camp-sc-side" style="border-color:${PARTY[mine].color}"><small>${campLast(my)}'s plan</small><b>${CAMP_DEBATE[rec.mine].icon} ${CAMP_DEBATE[rec.mine].name}</b><small>${rec.prep ? 'after debate camp' : 'no prep'}</small></div>
        <div class="camp-sc-verdict"><small>Scorecard</small><b style="color:${W ? PARTY[W].color : 'var(--gold2)'}">${W ? `${campLast(wn)} wins` : 'A draw'}</b><span class="camp-fx ${rec.result > 0.4 ? 'good' : rec.result < -0.4 ? 'bad' : ''}">${campNum(rec.result)} national for your ticket</span></div>
        <div class="camp-sc-side" style="border-color:${PARTY[other(mine)].color}"><small>${campLast(their)}'s plan</small><b>${CAMP_DEBATE[rec.theirs].icon} ${CAMP_DEBATE[rec.theirs].name}</b><small>${rec.theirPrep ? 'after debate camp' : 'no prep'}${C.ui && C.ui.hint ? (C.ui.hint === rec.theirs ? ' · the leak was right' : ' · the leak was wrong') : ''}</small></div></div>
        <div class="camp-snap"><small>Snap poll: who won the debate?</small><div class="pv"><div style="width:${share[0]}%;background:${W ? PARTY[W].color : '#6b7587'}">${W ? `${campLast(wn)} ${share[0]}%` : `${campLast(my)} ${share[0]}%`}</div><div style="width:${share[2]}%;background:#3a4250"></div><div style="width:${share[1]}%;background:${W ? PARTY[other(W)].color : '#6b7587'}">${W ? `${share[1]}% ${campLast(ln)}` : `${share[1]}% ${campLast(their)}`}</div></div></div>
        <p>${rec.text}</p></div>
      ${campTrackerHTML()}
      <div class="choices"><button class="btn primary big adv" id="campnext">Continue ▶</button></div>`);
    $('#modal-card').classList.add('camp-wide'); campBindCommon();
    $('#campnext').onclick = next;
  };
  CAMP_UI.draw = draw; draw();
}

/* ---------------- round 2: the first debate ---------------- */
function campApplyR2() {
  const C = campC(), ui = C.ui && C.ui.which === 1 ? C.ui : (campPrepDebateUI(1), C.ui);
  const prep = ui.prep === true && S.career.capital >= 1; if (prep) S.career.capital--;
  const key = CAMP_DEBATE[ui.deb] ? ui.deb : campDefaultDebate(ui);
  const rec = campDebate(1, key, prep, ui.theirPick, ui.city, ui.theirPrep);
  C.stage = 'r3'; campPoll('After the first debate', 6.5);
  return rec;
}
function campRound2() {
  const C = campC(); C.round = 1; C.stage = 'r2'; campPrepDebateUI(1);
  const draw = () => {
    const noms = campNoms(), my = noms[S.side], their = noms[other(S.side)], ui = C.ui, O = C.opp;
    const oppLine = O && O.strategy && TAG[O.theme] ? ` Across the aisle, ${their.name} is running on ${TAG[O.theme][1]}${O.themeHot ? ' — a top issue with voters, and it\'s biting (−1 for you)' : ', which few voters are asking about'} and has planted the flag in ${CAMP_MAPS[O.strategy].where}${O.strategy === 'base' ? ' (−0.6 for you nationally, +0.4 in the swing states they\'ve abandoned)' : ` (${O.focus.length ? O.focus.join(', ') + ': ' : ''}−1.5 for you there, +0.3 everywhere else)`}.` : '';
    const intro = `The first debate is ${ui.when} in <b>${ui.city}</b>, moderated by ${ui.mod}. Stage presence: ${campLast(my)} <span class="camp-stars">${campStars(campCharisma(my))}</span>, ${campLast(their)} <span class="camp-stars">${campStars(campCharisma(their))}</span>.${oppLine} Insiders say ${their.name}'s team has spent the week ${CAMP_DEBATE[ui.hint].drill}. Leaks have been wrong before.`;
    campFrame('The first debate', intro, campDebateDecisionsHTML(ui, false), 'Debate night ▶');
    campBindDebateDecisions(draw);
    $('#campnext').onclick = () => { const rec = campApplyR2(); sfx.gavel(); campScorecard(rec, () => campRound3()); };
  };
  CAMP_UI.draw = draw; draw();
}

/* ---------------- round 3: October ---------------- */
function campApplyR3() {
  const C = campC();
  if (!C.ui || C.ui.which !== 2) campPrepDebateUI(2);
  const ui = C.ui, prep = ui.prep === true && S.career.capital >= 1; if (prep) S.career.capital--;
  const key = CAMP_DEBATE[ui.deb] ? ui.deb : campDefaultDebate(ui);
  const rec = campDebate(2, key, prep, ui.theirPick, ui.city, ui.theirPrep);
  const won = C.debates.filter(d => d.round !== 'vp' && d.winner === S.side).length;
  if (won >= 2) { C.momentum = true; C.national += 0.5; log('Momentum: your nominee swept the debates (+0.5).', 'good'); unlock('debater'); }
  C.stage = 'r4'; campPoll('Mid-October', 5.5);
  return rec;
}
function campRound3() {
  const C = campC(); C.round = 2; C.stage = 'r3'; campPrepDebateUI(2);
  const draw = () => {
    const noms = campNoms(), my = noms[S.side], their = noms[other(S.side)], ui = C.ui, vp = ui.vp, d1 = C.debates.find(d => d.round === 1);
    const intro = `October. ${d1 && d1.winner === S.side ? `${campLast(my)} carries the glow of the first debate` : d1 && d1.winner ? `${campLast(my)} has a debate to make up for` : 'The first debate settled nothing'}, and the second one, a town hall in <b>${ui.city}</b> ${ui.when}, is the last big audience before the vote. Insiders say ${their.name}'s team is ${CAMP_DEBATE[ui.hint].drill} this time. ${d1 && d1.winner === S.side ? 'Win this one too and the momentum is worth another +0.5.' : ''}`;
    const vpBox = `<div class="camp-vpbox ${vp.result > 0.3 ? 'good' : vp.result < -0.3 ? 'bad' : ''}"><div class="camp-ch"><b>🎙️ The running mates' debate</b><span>automatic</span></div><p>${vp.text}</p><span class="camp-fx ${vp.result > 0.3 ? 'good' : vp.result < -0.3 ? 'bad' : ''}">${campNum(vp.result)} national</span>${vp.gaffeMine ? '<span class="camp-fx bad">your running mate gaffed</span>' : ''}${vp.gaffeTheirs ? '<span class="camp-fx good">their running mate gaffed</span>' : ''}</div>`;
    campFrame('October: the second debate', intro, vpBox + campDebateDecisionsHTML(ui, true), 'Debate night ▶');
    campBindDebateDecisions(draw);
    $('#campnext').onclick = () => { const rec = campApplyR3(); sfx.gavel(); campScorecard(rec, () => campRound4()); };
  };
  CAMP_UI.draw = draw; draw();
}

/* ---------------- round 4: the October Surprise ---------------- */
// effects of an event, applied and remembered as labeled chips (all national/state numbers are your-ticket-positive)
function campFx() {
  const out = [], whMine = S.president.party === S.side;
  const add = (t, good) => out.push({ t, good });
  const F = {
    n(v, why) { campC().national += v; add(`${campNum(v)} national${why ? ` (${why})` : ''}`, v >= 0); return F; },
    st(code, v) { campAdj(code, v); add(`${campNum(v)} in ${code}`, v >= 0); return F; },
    sts(codes, v) { codes.forEach(c => campAdj(c, v)); add(`${campNum(v)} in ${codes.join(', ')}`, v >= 0); return F; },
    cash(v) { const E = S.election; const real = Math.max(-E.cash, v); E.cash += real; add(`${real > 0 ? '+' : '−'}${Math.abs(real)} campaign unit${Math.abs(real) === 1 ? '' : 's'}`, real >= 0); return F; },
    cap(v) { const real = Math.max(-S.career.capital, v); S.career.capital += real; add(`${campNum(real, 0)} capital`, real >= 0); return F; },
    appr(v) { S.president.approval = clamp(Math.round(S.president.approval + v), 18, 82); add(`${presTitle()} ${campNum(v, 0)} approval`, (v >= 0) === whMine); return F; },
    mood(v) { S.mood = clamp(S.mood + v, -15, 15); add(`party mood ${campNum(v)}`, v >= 0); return F; },
    sal(tag, v) { S.salience = S.salience || {}; S.salience[tag] = (S.salience[tag] || 1) + v; add(`voters talk more about ${TAG[tag][1].toLowerCase()}`, true); return F; },
    note(t, good) { add(t, good !== false); return F; },
    text: () => out.map(x => x.t).join(' · '),
    chips: () => out.map(x => `<span class="camp-fx ${x.good ? 'good' : 'bad'}">${x.t}</span>`).join(''),
    net: () => out.length ? out.reduce((a, x) => a + (x.good ? 1 : -1), 0) : 0,
  };
  return F;
}
function campCtx() {
  const C = campC(), E = S.election, P = S.president, mine = S.side, theirs = other(mine), noms = campNoms(), my = noms[mine], their = noms[theirs];
  return { C, E, P, mine, theirs, my, their, myL: campLast(my), theirL: campLast(their), whMine: P.party === mine, year: campYear(), myVp: my.vp, theirVp: their.vp, proj: campProj(), theme: C && TAGS.includes(C.theme) ? C.theme : 'economy' };
}
// the pool: each entry has a weight (0 = cannot happen) and a maker that writes the front page and the choices
const CAMP_EVENTS = [
  { id: 'tape_mine', w: () => 1, make: x => {
    const what = pick([`dismisses rural voters as "a lost cause we don't need"`, `jokes that the party's base "would vote for a lamppost with the right bumper sticker"`, `calls the governor of ${pick(['Pennsylvania', 'Michigan', 'Georgia', 'Arizona'])} "a useful idiot"`, `describes ${x.myVp ? x.myVp.name : 'the running mate'} as "the price of the nomination"`, `tells donors the campaign's promises are "for the rubes"`]);
    return { h: `HOT MIC: ${x.myL.toUpperCase()} CAUGHT ON TAPE`, d: 'A recording from a closed-door fundraiser leaks to the press.', mood: 'storm',
      body: [`In the forty-second clip, ${x.my.name} ${what}. Within an hour it has 40 million views; by dinner it has a hashtag.`, `${x.their.name}'s campaign calls it "a window into contempt." Your phone has not stopped ringing since lunch.`],
      stakes: 'The next 48 hours decide whether this is a bad week or a bad November.',
      choices: [
        { t: 'Apologize, fully and fast', s: '−0.7 national, and the story dies by the weekend.', go: fx => { fx.n(-0.7); return `${x.my.name} apologized at a hastily arranged event in ${pick(['Scranton', 'Dayton', 'Macon', 'Tucson'])}: "I was wrong, and the people I insulted deserve better." The cable panels moved on by Friday.`; } },
        { t: 'Deny it, and attack the leaker', s: 'A coin flip: −0.3 if the press moves on, −1.6 if the rest of the tape drops.', go: fx => { if (Math.random() < 0.5) { fx.n(-0.3); return 'The campaign called the clip "doctored and deceptively edited." Nobody could prove otherwise, and the story faded into the noise.'; } fx.n(-1.6); return 'The full tape dropped three days later, and it was worse. "Doctored," the anchors repeated, over and over, with the transcript on screen.'; } },
        { t: `Bury it under a policy blitz on ${TAG[x.theme][1].toLowerCase()}`, s: '−0.5 national; your message issue gets hotter with voters.', go: fx => { fx.n(-0.5); fx.sal(x.theme, 2); return 'Three rollouts in three days. The tape still led the news, but the second story was yours, and by the weekend the second story was the story.'; } },
      ] };
  } },
  { id: 'tape_theirs', w: () => 1, make: x => {
    const what = pick(['mocks veterans as "people who couldn\'t get a real job"', 'calls the party\'s own voters "the help"', 'brags about dodging taxes "like any smart person"', `says ${x.theirVp ? x.theirVp.name : 'the running mate'} "wouldn't be my first call in a crisis"`, 'laughs about raising the retirement age "the day after the election"']);
    return { h: `HOT MIC: ${x.theirL.toUpperCase()} CAUGHT ON TAPE`, d: 'A recording from a donor retreat surfaces three weeks before the vote.', mood: 'storm',
      body: [`In the clip, ${x.their.name} ${what}. The campaign confirmed it was authentic before it could deny it.`, 'Your war room has the ad cut within the hour. The question is what to do with it.'],
      stakes: 'Gifts like this are rare. They can also be squandered.',
      choices: [
        { t: 'Run it wall-to-wall (1 unit)', s: '+1.3 national; costs 1 campaign unit.', can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.n(1.3); return `The ad ran in every battleground during every football game for a week. ${x.their.name}'s own words, no narrator needed.`; } },
        { t: 'Let the press do the work', s: '+0.7 national, free.', go: fx => { fx.n(0.7); return 'You never mentioned it. You didn\'t have to: it led every newscast for four days.'; } },
        { t: 'Demand they leave the race', s: '30%: +1.6 as their party splits; 70%: +0.4, and it looks like overreach.', go: fx => { if (Math.random() < 0.3) { fx.n(1.6); return `Two of ${x.their.name}'s own senators called the remarks "disqualifying." The party spent a week fighting itself.`; } fx.n(0.4); return 'Their party closed ranks and called your demand a stunt. The tape still hurt them, a little.'; } },
      ] };
  } },
  { id: 'health', w: () => 0.9, make: x => {
    const mine = Math.random() < 0.5, N = mine ? x.my : x.their, L = mine ? x.myL : x.theirL, vp = mine ? x.myVp : x.theirVp;
    const base = { h: `${L.toUpperCase()} HOSPITALIZED OVERNIGHT`, d: `${N.name} ${pick(['collapses after a rally in', 'is rushed to a hospital from a fundraiser in', 'cancels three days of events after a "medical episode" in'])} ${pick(['Charlotte', 'Phoenix', 'Grand Rapids', 'Erie'])}.`, mood: 'storm', body: [`The campaign says "dehydration and exhaustion." The campaign would say that. ${N.name} is ${ageOf(campPersonOf(N) || { born: 1965 })} years old, and the age question is suddenly the only question.`, mine ? 'Doctors released a one-paragraph letter. Reporters want the records.' : `Your side has to decide how hard to lean on a hospital bed.`], stakes: mine ? 'Age is the question nobody asks politely.' : 'Handle with care: voters punish ghouls.' };
    base.choices = mine ? [
      { t: 'Release the full medical records', s: '−0.3 national; the story ends.', go: fx => { fx.n(-0.3); return 'Forty pages of bloodwork and a cardiologist on a conference call. Boring, which was the point.'; } },
      { t: `Send ${vp ? vp.name : 'the running mate'} everywhere this week`, s: `Depends on the running mate: ${campStars(campCharisma(vp))} stage presence.`, go: fx => { const v = clamp((campCharisma(vp) - 1) * 2 + gauss() * 0.4, -1, 1); fx.n(+v.toFixed(1)); return v > 0.2 ? `${vp ? vp.name : 'The running mate'} did eleven states in six days and the crowds grew every stop.` : v < -0.2 ? `${vp ? vp.name : 'The running mate'} did not grow into the role. The empty-chair jokes wrote themselves.` : 'A competent week on the trail; nobody noticed much either way.'; } },
      { t: '"It was dehydration." Say nothing more', s: '60%: −0.2 as it fades; 40%: −1.2 after a second episode.', go: fx => { if (Math.random() < 0.6) { fx.n(-0.2); return 'The nominee was back on stage in 48 hours, drank a bottle of water on camera, and the story drowned.'; } fx.n(-1.2); return 'A second stumble, on camera, nine days later. "Dehydration," the chyron said, with a question mark.'; } },
    ] : [
      { t: 'Say nothing but "get well soon"', s: '+0.6 national: the age question asks itself.', go: fx => { fx.n(0.6); return `${x.my.name} wished ${N.name} a speedy recovery and talked about nothing else for a week. The voters did the rest.`; } },
      { t: 'Raise "serious questions about fitness"', s: 'A coin flip: +1.1 if it sticks, −0.9 if it looks ghoulish.', go: fx => { if (Math.random() < 0.5) { fx.n(1.1); return 'The questions stuck. The other campaign spent a week releasing medical letters instead of talking about anything else.'; } fx.n(-0.9); return `${N.name} walked out of the hospital waving, and your surrogate's "fitness" line played on a loop next to it. Ghoulish, the pundits agreed.`; } },
    ];
    return base;
  } },
  { id: 'hurricane', w: () => 1, make: x => {
    const code = pick(['TX', 'LA', 'MS', 'AL', 'FL']), near = { TX: 'LA', LA: 'MS', MS: 'AL', AL: 'FL', FL: 'GA' }[code], name = pick(CAMP_HURRICANES), gov = S.governors && S.governors[code], cat = ri(3, 5), out = ri(3, 19) * 100, isP = campIsPres(x.my, x.mine);
    const ch = x.whMine ? [
      { t: 'Suspend the campaign; the ticket goes to the Gulf', s: `${isP ? `${presTitle()} tours the damage in person` : `${x.myL} tours the damage with ${presTitle()}`}: +0.8 in ${code} and ${near}, approval +2, −0.2 national from a lost week.`, go: fx => { fx.sts([code, near], 0.8); fx.appr(2); fx.n(-0.2); return `${x.my.name} handed out water in ${pick(CAMP_COAST[code])} ${isP ? 'with the Guard' : `beside ${presTitle()}`}. The pictures were good; the week of rallies was gone.`; } },
      { t: 'Keep campaigning; FEMA has it', s: 'The federal response rolls the dice: praised (+1 approval) or botched (−4 approval, −0.8 in the Gulf).', go: fx => { const comp = (S.cabinet && S.cabinet.dhs && S.cabinet.dhs.competence) || 3; if (Math.random() < 0.3 + comp * 0.09) { fx.appr(1); return `The response was quick and quiet. ${gov ? 'Gov. ' + gov.name : 'The governor'} thanked the President on camera.`; } fx.appr(-4); fx.sts([code, near], -0.8); return `Trucks sat in a lot outside ${pick(CAMP_COAST[near])} for four days. "WHERE IS THE PRESIDENT?" asked every front page on the coast.`; } },
      { t: `Blame Gov. ${gov ? lastName(gov) : 'the governor'} for the evacuation`, s: gov && gov.party !== x.mine ? `+0.4 in ${code}; −0.3 national for looking small.` : `The governor is your party's: −0.6 in ${code}.`, go: fx => { if (gov && gov.party !== x.mine) { fx.st(code, 0.4); fx.n(-0.3); return `The evacuation really was late. Voters in ${stName(code)} half agreed with you and the rest of the country wondered why you were pointing fingers in a flood.`; } fx.st(code, -0.6); return `You blamed a governor from your own party. The governor blamed you back, on every local station in ${stName(code)}.`; } },
    ] : [
      { t: 'Attack the federal response', s: `60%: it lands, −3 approval and +1.0 in ${code} and ${near}; 40%: it looks ghoulish, −0.5 national.`, go: fx => { if (Math.random() < 0.6) { fx.appr(-3); fx.sts([code, near], 1.0); return `The water took five days to arrive. ${x.my.name} was there on day two, in boots, asking why.`; } fx.n(-0.5); return 'The response was fine, actually, and your attack ran next to footage of the President comforting a family. Ghoulish.'; } },
      { t: 'Send your senators to help; say nothing political', s: '+0.3 national for statesmanship; the President gets +1 approval too.', go: fx => { fx.n(0.3); fx.appr(1); return 'Four of your senators filled sandbags on camera and refused every political question. It read as class.'; } },
      { t: 'Pledge federal aid in the ticket\'s name (1 unit)', s: `+0.7 in ${code} and ${near}; −1 campaign unit.`, can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.sts([code, near], 0.7); return `"${x.myL} Relief Centers" opened in six parishes. The lawyers hated the name. The locals didn't.`; } },
    ];
    return { h: `HURRICANE ${name.toUpperCase()} SLAMS ${stName(code).toUpperCase()}`, d: `Category ${cat} at landfall; ${out.toLocaleString()},000 without power along the Gulf.`, mood: 'storm',
      body: [`${name} came ashore near ${pick(CAMP_COAST[code])} at 3 a.m. with ${110 + cat * 15} mph winds. ${gov ? `Gov. ${gov.name} (${gov.party})` : 'The governor'} has asked for a federal disaster declaration; ${presTitle()} is ${x.whMine ? 'your party\'s President' : 'their party\'s President'}, and the response will be judged on live television.`, `Both campaigns pulled their ads in ${stName(code)}. Neither knows for how long.`],
      stakes: `${stName(code)} (${EV[code]} EV) and ${stName(near)} (${EV[near]} EV) will remember who showed up.`, choices: ch };
  } },
  { id: 'crisis', w: () => S.war ? 1.6 : 0.9, make: x => {
    if (S.war) {
      const W = S.war, warMine = W.party === x.mine, sup = W.support;
      return { h: `${W.place.toUpperCase()}: ${pick(['AMBUSH KILLS NINE AMERICANS', 'CEASEFIRE COLLAPSES OVERNIGHT', 'FORWARD BASE OVERRUN'])}`, d: `Month ${W.months} of the war; public support stands at ${sup}%.`, mood: 'storm',
        body: [`The worst day of the war in ${W.place} lands three weeks before the election. ${presTitle()}, who ${warMine ? 'is' : 'is not'} of your party, addressed the nation from the Oval Office for nine minutes.`, `${sup < 45 ? 'A majority now says the war was a mistake.' : 'The country, for now, is behind the troops and the President.'} Both tickets have to say something by morning.`],
        stakes: 'Wars make and break fall campaigns.',
        choices: [
          { t: 'Rally around the flag', s: `+0.5 for the President's party's ticket (${warMine ? 'yours' : 'theirs'}); approval +2.`, go: fx => { fx.n(warMine ? 0.5 : -0.5); fx.appr(2); return `${x.my.name} stood with the Commander in Chief. ${warMine ? 'Unity helped the ticket.' : 'Statesmanlike, and it helped the other side.'}`; } },
          { t: 'Call for a withdrawal timeline', s: sup < 45 ? '+0.9 national: the public wants out.' : '−0.6 national: it reads as retreat while the country backs the war.', go: fx => { fx.n(sup < 45 ? 0.9 : -0.6); fx.mood(sup < 45 ? 0.4 : -0.4); return sup < 45 ? `"Bring them home" became the rally chant of the final weeks.` : `"Cut and run," the other side said, and the country agreed with them.`; } },
          warMine && campIsPres(x.my, x.mine) ? { t: 'Announce a full review of the war plan', s: '+0.3 national; party mood −0.3 as the hawks grumble.', go: fx => { fx.n(0.3); fx.mood(-0.3); return `${presTitle()} ordered a top-to-bottom review from the Oval Office. The generals saluted; the hawks in your caucus seethed.`; } }
            : warMine ? { t: 'Quietly distance the ticket from the war', s: '+0.3 national; −2 approval for your own President; party mood −0.5.', go: fx => { fx.n(0.3); fx.appr(-2); fx.mood(-0.5); return `${x.my.name} talked about "the war we were handed." The White House noticed.`; } }
            : { t: 'Hammer the President for the fiasco', s: '+0.7 national; the President −3 approval.', go: fx => { fx.n(0.7); fx.appr(-3); return `"${presTitle()}'s war" was in every ad by Thursday.`; } },
        ] };
    }
    const [place, what] = pick(CRISES);
    return { h: `CRISIS IN ${place.toUpperCase()}`, d: `${what.charAt(0).toUpperCase() + what.slice(1)}; the Situation Room is lit all night.`, mood: 'storm',
      body: [`Three weeks before the election, ${what} in ${place}. ${presTitle()} (${S.president.party}) weighs a show of force; the networks are already running countdown clocks.`, 'A foreign crisis is the one October surprise nobody can spin for long.'],
      stakes: 'Rallies help the President\'s party. Fiascos do the opposite.',
      choices: [
        { t: 'Back a show of force', s: `Approval +3 (helps ${x.whMine ? 'your' : 'their'} ticket); ${x.whMine ? '+0.4' : '−0.4'} national.`, go: fx => { fx.appr(3); fx.n(x.whMine ? 0.4 : -0.4); fx.sal('security', 2); return `Carrier groups moved. ${x.my.name} said the right things about standing together. ${x.whMine ? 'The ticket rode the rally.' : 'The rally was the other side\'s.'}`; } },
        { t: 'Urge restraint and diplomacy', s: 'A coin flip: +0.5 if talks hold, −0.5 if the crisis worsens.', go: fx => { if (Math.random() < 0.5) { fx.n(0.5); return 'The talks held. "Grown-up foreign policy," the editorials said, and they meant your nominee.'; } fx.n(-0.5); return `${place.charAt(0).toUpperCase() + place.slice(1)} got worse while you counseled patience. "Weak," said the ads.`; } },
        { t: 'Demand the President consult Congress', s: x.whMine ? '−0.3 national: it reads as disloyalty to your own President.' : '+0.3 national: the whip defends the Senate\'s war powers.', go: fx => { fx.n(x.whMine ? -0.3 : 0.3); return x.whMine ? 'Your own President\'s aides called you "unhelpful." On the record.' : 'A letter signed by forty senators. Constitutional, and useful.'; } },
      ] };
  } },
  { id: 'jobs', w: () => 1.2, make: x => {
    const good = Math.random() < 0.5 + (S.president.approval - 50) / 100, rate = (good ? rnd(3.3, 3.9) : rnd(4.6, 5.6)).toFixed(1), n = good ? ri(240, 410) : ri(-80, 60);
    const ch = good ? (x.whMine ? [
      { t: 'Take a victory lap', s: '+0.3 national; 25% chance it looks out of touch (−0.4 instead).', go: fx => { if (Math.random() < 0.25) { fx.n(-0.4); return `"The economy has never been better," ${x.my.name} said in a diner where eggs cost nine dollars. The clip ran for a week.`; } fx.n(0.3); return 'Two days of jobs-report victory laps in factory towns. It worked.'; } },
      { t: 'Note it, then pivot to prices', s: '+0.2 national; steady.', go: fx => { fx.n(0.2); return 'Good numbers, no gloating, straight back to grocery bills. Boring and right.'; } },
    ] : [
      { t: 'Pivot hard to prices and rent', s: '+0.3 national.', go: fx => { fx.n(0.3); return '"Good for Wall Street," your nominee said, "but what about your rent?" It landed.'; } },
      { t: 'Dispute the numbers', s: '80%: −0.4, you sound like a crank; 20%: +0.5 if a revision proves you right.', go: fx => { if (Math.random() < 0.2) { fx.n(0.5); return 'The revision came three days later: 110,000 jobs fewer than reported. You looked like a prophet.'; } fx.n(-0.4); return 'The statisticians did not appreciate being called liars. Neither did the voters.'; } },
    ]) : (x.whMine ? [
      { t: 'Blame global headwinds', s: '−0.2 national.', go: fx => { fx.n(-0.2); return '"Headwinds" was the word of the week. Nobody bought it, but nobody expected to.'; } },
      { t: 'Promise a jobs plan (1 capital)', s: '+0.3 national; −1 capital spent on the policy shop.', can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); fx.n(0.3); return 'A forty-page plan in forty-eight hours. The press read the executive summary and called it "serious."'; } },
    ] : [
      { t: 'Hang it around the President\'s neck', s: '+0.6 national; the President −2 approval.', go: fx => { fx.n(0.6); fx.appr(-2); return `"${presTitle()}'s economy" was in the first line of every speech for two weeks.`; } },
      { t: 'Offer a plan instead of blame', s: '+0.4 national; party mood +0.5.', go: fx => { fx.n(0.4); fx.mood(0.5); return 'A plan, not a pile-on. The editorial boards swooned; the voters liked it fine.'; } },
    ]);
    return { h: good ? 'JOBS REPORT: UNEMPLOYMENT FALLS TO ' + rate + '%' : 'HIRING STALLS; UNEMPLOYMENT CLIMBS TO ' + rate + '%', d: `The economy ${good ? 'added' : n < 0 ? 'lost' : 'added just'} ${Math.abs(n)},000 jobs last month.`, mood: good ? 'dawn' : 'storm',
      body: [`The last jobs report before the election ${good ? 'is a gift to the White House' : 'is a problem for the White House'}: ${presTitle()} is ${x.whMine ? 'your' : 'their'} party's President, and the numbers move the incumbent party ${good ? 'up' : 'down'} on their own.`, `Wages ${good ? 'rose' : 'were flat'}; the markets ${good ? 'rallied' : 'shrugged'}.`],
      stakes: `The incumbent party's ticket already moved ${good ? '+0.8' : '−0.8'} on the news. The spin is what's left.`,
      auto: fx => { fx.n((good ? 0.8 : -0.8) * (x.whMine ? 1 : -1), 'the report itself'); fx.appr(good ? 2 : -2); }, choices: ch };
  } },
  { id: 'scotus', w: () => 0.9, make: x => {
    const maj = courtCount('R') > courtCount('D') ? 'R' : 'D', law = pick((S.laws || []).slice(-4)), strikes = law ? law.party !== maj : Math.random() < 0.6, energized = other(maj);
    const generic = { R: { strike: ['the student loan program', 'the clean power rules', 'a union organizing rule'], uphold: ['a state abortion ban', 'a voter-ID law', 'a concealed-carry law'] }, D: { strike: ['a state abortion ban', 'a voter-ID law', 'a border enforcement law'], uphold: ['the student loan program', 'the clean power rules', 'a social-media moderation law'] } };
    const target = law ? law.name : pick(generic[maj][strikes ? 'strike' : 'uphold']);
    return { h: `SUPREME COURT ${strikes ? 'STRIKES DOWN' : 'UPHOLDS'} ${target.toUpperCase()}`, d: `A ${courtLabel()} Court rules on the first Monday in October.`, mood: 'storm',
      body: [`The ${maj === 'R' ? 'conservative' : 'liberal'} majority ${strikes ? 'struck down' : 'upheld'} ${target} in a ${maj === 'R' ? `${courtCount('R')}–${courtCount('D')}` : `${courtCount('D')}–${courtCount('R')}`} decision. ${PARTY[energized].short} are furious; ${PARTY[maj].short} are quietly pleased, which in October is the weaker emotion.`, `By nightfall the losing side had raised $${ri(11, 40)} million online.`],
      stakes: `Backlash energizes the ${PARTY[energized].name} side: ${energized === x.mine ? '+0.5 for your ticket' : '−0.5 for your ticket'}, already in.`,
      // the Court has now ruled on this law: take it off the docket so the game's own Court doesn't rule on it a second time
      auto: fx => { if (law) S.laws = (S.laws || []).filter(l => l !== law); fx.n(energized === x.mine ? 0.5 : -0.5, 'the backlash'); },
      choices: [
        { t: 'Make the Court the closing argument', s: energized === x.mine ? '+0.7 national.' : 'A coin flip: ±0.5. Your side won the case; the losers are angrier.', go: fx => { if (energized === x.mine) { fx.n(0.7); return 'Every stump speech ended with the Court. The rallies got loud.'; } const up = Math.random() < 0.5; fx.n(up ? 0.5 : -0.5); return up ? 'You defended the ruling and your base loved you for it.' : 'You defended the ruling and the suburbs flinched.'; } },
        { t: 'Promise to remake the Court', s: '+0.4 with the base, −0.3 with swing voters: +0.1 net, party mood +0.6.', go: fx => { fx.n(0.1); fx.mood(0.6); return 'Term limits, more seats, a new code of ethics: the base roared and the moderates squinted.'; } },
        { t: 'Change the subject', s: 'No effect: the Court dominates the week anyway.', go: () => 'You talked about the economy. Nobody heard it over the Court.' },
      ] };
  } },
  { id: 'vpgaffe', w: x => 0.2 + 2.5 * Math.max(campRisk(x.myVp), campRisk(x.theirVp)), make: x => {
    const rm = campRisk(x.myVp), rt = campRisk(x.theirVp), mine = Math.random() < rm / (rm + rt || 1);
    const vp = mine ? x.myVp : x.theirVp, N = mine ? x.my : x.their, vn = vp ? vp.name : (mine ? 'your running mate' : 'their running mate'), [gaffe, gaffeHl] = pick(CAMP_GAFFES.filter(g => !/moderator/.test(g[0])));
    return { h: `${(vp ? lastName(vp) || vp.name : 'RUNNING MATE').toUpperCase()} ${gaffeHl}`, d: `${N.name}'s running mate ${gaffe} at a rally in ${pick(['Toledo', 'Reno', 'Raleigh', 'Kenosha'])}.`, mood: 'storm',
      body: [`${vn} ${gaffe}, in front of 4,000 people and every camera in the state. The clean-up statement contradicted the nominee's position, which made it two stories.`, mine ? 'Your campaign manager has stopped answering texts.' : 'Your war room has the clip on a loop.'],
      stakes: mine ? 'A bad running mate week costs about a point. A good response saves half of it.' : 'Pounce or let it breathe.',
      choices: mine ? [
        { t: 'Stand by them: "a slip of the tongue"', s: '−0.7 national.', go: fx => { fx.n(-0.7); return `"${vn} misspoke," ${x.my.name} said, and said it again, and again.`; } },
        { t: 'Have them apologize on every network', s: '−0.4 national; 30% chance the apology tour drags on (−0.9 instead).', go: fx => { if (Math.random() < 0.3) { fx.n(-0.9); return 'The apology needed an apology. Five interviews, five new headlines.'; } fx.n(-0.4); return 'A contrite morning on four networks. Humble, brief, over.'; } },
        { t: 'Quietly bench them from national TV', s: `−0.5 national; −0.5 in ${vp && vp.state ? stName(vp.state) : 'their home state'} as the home crowd notices.`, go: fx => { fx.n(-0.5); if (vp && vp.state && EV[vp.state]) fx.st(vp.state, -0.5); return `${vn} spent the rest of October at county fairs with no cameras. The home state noticed the snub.`; } },
      ] : [
        { t: 'Pounce: cut the ad tonight', s: '+0.8 national.', go: fx => { fx.n(0.8); return `${vn}'s face, ${vn}'s words, no narrator. The best thirty seconds of the cycle.`; } },
        { t: 'Let it breathe', s: '+0.5 national: the press does the rest.', go: fx => { fx.n(0.5); return 'You said nothing. The late-night hosts said everything.'; } },
        { t: 'Challenge them to a second VP debate', s: 'A coin flip: +0.9 if they refuse, +0.2 if they accept and recover.', go: fx => { if (Math.random() < 0.6) { fx.n(0.9); return `They refused. "Hiding ${vn}" was the headline for a week.`; } fx.n(0.2); return 'They accepted, and the rematch was dull. A small win.'; } },
      ] };
  } },
  { id: 'hack', w: () => 0.8, make: x => {
    const mine = Math.random() < 0.5, N = mine ? x.my : x.their, L = mine ? x.myL : x.theirL;
    return { h: `HACKERS DUMP ${L.toUpperCase()} CAMPAIGN EMAILS`, d: `Forty thousand internal messages from ${N.name}'s headquarters appear online overnight.`, mood: 'storm',
      body: [`The trove has everything: pollsters' panic, donors' demands, a memo calling ${mine ? 'your own Senate caucus' : 'their own Senate caucus'} "dead weight." Intelligence officials blame a foreign service; the voters mostly just read the emails.`, mine ? 'Reporters have begun calling your office about memos that mention you by name.' : 'Your opposition researchers have cancelled their weekends.'],
      stakes: 'Leaks are a slow poison: a little every day until November.',
      choices: mine ? [
        { t: 'Blame foreign interference', s: 'A coin flip: −0.3 if the spooks back you up, −0.9 if it sounds like an excuse.', go: fx => { if (Math.random() < 0.5) { fx.n(-0.3); return 'The intelligence community confirmed the attribution within a day. Sympathy, briefly, outran the schadenfreude.'; } fx.n(-0.9); return '"The hackers didn\'t write the emails," the other side said, every single day.'; } },
        { t: 'Own it: "nothing to hide"', s: '−0.5 national; it fades.', go: fx => { fx.n(-0.5); return 'The campaign released its own searchable archive. Transparency as a weapon; the press lost interest within a week.'; } },
        { t: 'Change the subject with a counter-leak', s: '−0.4 national; your own party\'s mood −0.5 for the dirty pool.', go: fx => { fx.n(-0.4); fx.mood(-0.5); return `Some of ${x.their.name}'s emails found their way to a friendly website. Nobody was fooled about the timing.`; } },
      ] : [
        { t: 'Feast on the emails', s: '+0.9 national; 25% chance a forgery is mixed in (−0.6 instead).', go: fx => { if (Math.random() < 0.25) { fx.n(-0.6); return 'The juiciest email was fake. You had quoted it on stage. Twice.'; } fx.n(0.9); return 'A new email every morning, read aloud at every rally. Cruel and effective.'; } },
        { t: 'Condemn the hack, enjoy it quietly', s: '+0.4 national.', go: fx => { fx.n(0.4); return `"We don't comment on stolen material," the campaign said, while every surrogate did.`; } },
      ] };
  } },
  { id: 'celeb', w: () => 1, make: x => {
    const [who, role] = pick(CAMP_CELEBS), mine = Math.random() < 0.55, N = mine ? x.my : x.their;
    return { h: `${who.toUpperCase()} ENDORSES ${(mine ? x.myL : x.theirL).toUpperCase()}`, d: `${role.charAt(0).toUpperCase() + role.slice(1)} tells ${ri(40, 90)} million followers to vote.`, mood: 'dawn',
      body: [`${who}, ${role}, posted a nine-minute video endorsing ${N.name} and walked ${ri(2, 9)}00,000 young voters to a registration site in a single afternoon.`, mine ? 'Your campaign wants them on stage this weekend.' : 'Your campaign is pretending not to care.'],
      stakes: `${mine ? '+0.4 for your ticket' : '−0.4 for your ticket'} among younger voters, already in.`,
      auto: fx => fx.n(mine ? 0.4 : -0.4, 'the endorsement'),
      choices: mine ? [
        { t: `Put ${who} on stage at the rallies`, s: '+0.5 national; 20% chance of an awkward moment (−0.3 instead).', go: fx => { if (Math.random() < 0.2) { fx.n(-0.3); return `${who} swore on live television and compared the opponent to a disease. The campaign spent two days apologizing for its own surprise guest.`; } fx.n(0.5); return `Three stadium rallies, three sold-out crowds, three nights of free coverage.`; } },
        { t: 'A thank-you post and nothing more', s: '+0.1 national.', go: fx => { fx.n(0.1); return 'Gracious, brief, forgotten by Tuesday.'; } },
      ] : [
        { t: 'Mock the celebrity politics', s: '+0.2 national with voters who roll their eyes at Hollywood.', go: fx => { fx.n(0.2); return `"I'll take the votes of nurses over ${campAn(role.replace(/^the /, ''))}," your nominee said in ${pick(['Dubuque', 'Erie', 'Fayetteville'])}. It got a laugh and a few votes.`; } },
        { t: 'Ignore it', s: 'No effect.', go: () => 'You said nothing. The endorsement was a two-day story.' },
      ] };
  } },
  { id: 'paper', w: () => 1, make: x => {
    const t = pick(campTargets(x.proj)), code = t.c, city = pick(HOMETOWNS[code] || ['the capital']), paper = `The ${city} ${pick(CAMP_PAPERS)}`, mine = Math.random() < 0.55, N = mine ? x.my : x.their;
    return { h: `${paper.toUpperCase()} ENDORSES ${(mine ? x.myL : x.theirL).toUpperCase()}`, d: `The biggest paper in ${stName(code)} (${EV[code]} EV) breaks ${Math.random() < 0.5 ? 'a 40-year tradition' : 'with its own publisher'}.`, mood: 'dawn',
      body: [`"${N.name} is the ${pick(['steadier', 'more serious', 'only acceptable'])} choice," the editorial board wrote, in ${pick(['1,800', '2,400', '3,100'])} words that the campaign had turned into a mailer by morning.`, `${stName(code)} is ${Math.abs(t.m) < 3 ? 'a coin flip' : campAn(`${Math.abs(t.m).toFixed(0)}-point race`)}; an endorsement there is worth about half a point.`],
      stakes: `${mine ? '+0.6' : '−0.6'} in ${code}, already in.`,
      auto: fx => fx.st(code, mine ? 0.6 : -0.6),
      choices: mine ? [
        { t: `Blanket ${stName(code)} with the quote (1 unit)`, s: `+0.9 more in ${code}; −1 campaign unit.`, can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.st(code, 0.9); return `The editorial's best line ran on every billboard between ${city} and the state line.`; } },
        { t: 'Pocket it', s: 'No further effect.', go: () => `The campaign said thank you and kept its money for the Senate.` },
      ] : [
        { t: 'Dismiss the "failing" paper', s: `A coin flip in ${code}: +0.3 with the base, −0.3 if it sounds thin-skinned.`, go: fx => { const up = Math.random() < 0.5; fx.st(code, up ? 0.3 : -0.3); return up ? 'The base loved the fight.' : 'Picking a fight with the hometown paper did not play in the hometown.'; } },
        { t: `Line up your own endorsements in ${stName(code)} (1 capital)`, s: `+0.5 in ${code}; −1 capital calling in favors.`, can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); fx.st(code, 0.5); return `Six mayors and two sheriffs, on one stage, the next morning.`; } },
      ] };
  } },
  { id: 'third', w: x => x.C.thirdParty ? 0 : 0.9, make: x => {
    const name = fullName(), cause = pick(IND_CAUSES), share = +rnd(4, 9).toFixed(1), hurts = Math.random() < 0.5 ? x.mine : x.theirs;
    return { h: `${name.toUpperCase()} SURGES TO ${Math.round(share)}% IN NEW POLL`, d: `The independent's "${cause[0]}" campaign catches fire ${hurts === x.mine ? 'among your voters' : 'among the other side\'s voters'}.`, mood: 'night',
      body: [`${name}, ${pick(BACKGROUNDS)} from ${pick(STATES)[1]} running on "${cause[0]}", qualified for the ballot in ${ri(38, 50)} states and is now drawing ${Math.round(share)}% nationally, mostly from ${hurts === x.mine ? x.my.name : x.their.name}.`, 'Third-party surges usually fade. Usually.'],
      stakes: `${hurts === x.mine ? '−0.5 for your ticket' : '+0.5 for your ticket'} already in; ${name} appears in the polls from here on.`,
      auto: fx => { x.C.thirdParty = { name, share, hurts, cause: cause[0] }; fx.n(hurts === x.mine ? -0.5 : 0.5, 'votes siphoned'); },
      choices: [
        { t: `Attack ${lastName({ name })} as a spoiler`, s: `Their share −2; ${hurts === x.mine ? '+0.3 national as voters come home' : '−0.2 national: you drove their voters back to the other side'}.`, go: fx => { x.C.thirdParty.share = Math.max(1, x.C.thirdParty.share - 2); fx.n(hurts === x.mine ? 0.3 : -0.2); return `"A vote for ${lastName({ name })} is a vote for ${hurts === x.mine ? x.theirL : x.myL}," the ads said. Some voters listened.`; } },
        { t: `Court their voters: adopt "${cause[0]}"`, s: 'A coin flip: +0.6 if it works, −0.3 if your base grumbles.', go: fx => { if (Math.random() < 0.5) { fx.n(0.6); fx.sal(cause[1], 1); return `${x.my.name} gave a whole speech on ${cause[0].toLowerCase() === cause[0] ? cause[0] : `"${cause[0]}"`}. ${lastName({ name })}'s voters noticed.`; } fx.n(-0.3); return 'Your base wondered why the nominee was suddenly talking like the independent.'; } },
        { t: 'Ignore them', s: 'No effect.', go: () => `The campaign never said ${lastName({ name })}'s name. ${lastName({ name })} said yours constantly.` },
      ] };
  } },
  { id: 'terror', w: () => 0.8, make: x => {
    const city = pick(['Chicago', 'Houston', 'Newark', 'Seattle', 'Minneapolis', 'Baltimore']), n = ri(2, 6);
    return { h: `FOILED PLOT IN ${city.toUpperCase()}; ${n} ARRESTED`, d: 'Federal agents say an attack on a transit hub was days away.', mood: 'storm',
      body: [`The FBI arrested ${n} men in a ${city} apartment with ${pick(['explosives', 'a van', 'maps and a manifesto'])}. ${presTitle()} praised the agents; both nominees cancelled their Saturday rallies.`, 'Security is the issue of the week whether anyone wants it or not.'],
      stakes: `Security weeks tilt toward the party voters trust on it: ${x.mine === 'R' ? '+0.4 for your ticket' : '−0.4 for your ticket'}, already in.`,
      auto: fx => { fx.n(x.mine === 'R' ? 0.4 : -0.4, 'the security mood'); fx.sal('security', 3); },
      choices: [
        { t: 'Call for unity', s: 'No national effect; party mood +0.3.', go: fx => { fx.mood(0.3); return 'A joint statement with the other ticket. Rare, and remembered fondly for about a day.'; } },
        { t: 'Hit the other ticket on security', s: x.mine === 'R' ? '+0.6 national.' : 'A coin flip: +0.5 if it lands, −0.5 if it sounds like opportunism.', go: fx => { if (x.mine === 'R' || Math.random() < 0.5) { fx.n(x.mine === 'R' ? 0.6 : 0.5); return `"Who do you trust at 3 a.m.?" asked the ad. The answer polled well.`; } fx.n(-0.5); return 'Attacking on security the day after a plot read as opportunism, and the other side said so.'; } },
        { t: campIsPres(x.my, x.mine) ? 'Stand on the response as Commander in Chief' : 'Praise the President\'s response', s: `Approval +2 (${x.whMine ? 'your' : 'their'} President); ${x.whMine ? '+0.3' : '−0.3'} national.`, go: fx => { fx.appr(2); fx.n(x.whMine ? 0.3 : -0.3); return campIsPres(x.my, x.mine) ? 'A somber address from the Oval Office, then straight back to the trail. It looked like command.' : x.whMine ? 'The President got the credit, and the ticket shared it.' : 'Gracious, and it helped the other side.'; } },
      ] };
  } },
  { id: 'recession', w: () => 1, make: x => {
    const drop = rnd(4, 9).toFixed(1);
    return { h: `MARKETS PLUNGE ${drop}% ON RECESSION FEARS`, d: `The worst day on Wall Street in ${ri(6, 14)} years, three weeks before the vote.`, mood: 'storm',
      body: [`A bad inflation print, a bank wobble and a bond auction nobody showed up for: the Dow lost ${drop}% by the close. ${presTitle()} (${x.whMine ? 'your party' : 'their party'}) called it "a correction, not a collapse."`, 'Retirement statements arrive in mailboxes the week before the election.'],
      stakes: `The incumbent party's ticket already moved ${x.whMine ? '−0.8' : '+0.8'}; the President −3 approval.`,
      auto: fx => { fx.n(x.whMine ? -0.8 : 0.8, 'the crash'); fx.appr(-3); fx.sal('economy', 3); },
      choices: x.whMine ? [
        { t: '"The fundamentals are strong"', s: 'A coin flip: −0.2 if the markets steady, −1.0 if they keep falling and the line is ridiculed.', go: fx => { if (Math.random() < 0.5) { fx.n(-0.2); return 'The markets clawed half of it back within a week, and the line aged fine.'; } fx.n(-1.0); return 'The markets fell again on Thursday. "Fundamentals" became a punchline.'; } },
        { t: 'Propose an emergency package (1 capital)', s: '+0.5 national; −1 capital.', can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); fx.n(0.5); return 'A $200 billion plan drafted overnight by your staff. It would never pass, and it didn\'t have to.'; } },
        { t: 'Blame the other party\'s obstruction', s: '+0.2 national; party mood −0.3.', go: fx => { fx.n(0.2); fx.mood(-0.3); return 'Half the country agreed it was their fault. The other half noticed who holds the White House.'; } },
      ] : [
        { t: 'Hang it on the President', s: '+0.7 national; the President −1 more approval.', go: fx => { fx.n(0.7); fx.appr(-1); return `"${presTitle()}'s recession" was on a thousand billboards by Monday.`; } },
        { t: 'Offer a steady hand: a plan', s: '+0.5 national; party mood +0.4.', go: fx => { fx.n(0.5); fx.mood(0.4); return 'A calm nominee with a five-point plan while the other side panicked. Presidential.'; } },
        { t: 'Say nothing and let it bleed', s: '+0.2 national.', go: fx => { fx.n(0.2); return 'You didn\'t need to say anything. The statements in the mail said it for you.'; } },
      ] };
  } },
  { id: 'caucus', w: () => S.members.some(m => m.party === S.side && T(m, 'shady')) ? 1 : 0, make: x => {
    const m = pick(S.members.filter(m => m.party === x.mine && T(m, 'shady'))), [what, said] = pick([['INDICTED ON BRIBERY CHARGES', 'was indicted on bribery charges'], ['CAUGHT IN FBI STING', 'was caught in an FBI sting'], ['ACCUSED OF SELLING ACCESS', 'is accused of selling access']]);
    return { h: `SEN. ${lastName(m).toUpperCase()} ${what}`, d: `A grand jury in ${pick(HOMETOWNS[m.state])} names a sitting ${PARTY[m.party].name} senator three weeks out.`, mood: 'storm',
      body: [`${sen(m)}, a member of your own caucus, ${said}: ${pick(['gold bars in a closet', 'a no-show job for a nephew', 'a yacht that belonged to a lobbyist', '$400,000 in "consulting fees"'])}. The other ticket's ad writes itself: "the party of ${lastName(m)}."`, `As whip, you have to say something about your own senator by morning.`],
      stakes: `−0.6 national and −1.0 in ${stName(m.state)} already in. Your answer sets the rest.`,
      auto: fx => { fx.n(-0.6, 'the scandal'); fx.st(m.state, -1.0); },
      choices: [
        { t: 'Demand their resignation', s: '+0.3 national back; the senator and their allies will remember (relationship −3).', go: fx => { fx.n(0.3); m.rel -= 3; m.grudge = true; hist(m, 'Told to resign by their own party\'s whip', x.year); return `You called for ${lastName(m)}'s resignation on the Senate steps. ${lastName(m)} refused, and will not forget who asked.`; } },
        { t: 'Stand by them: "innocent until proven guilty"', s: '−0.5 more national; the senator owes you (relationship +2).', go: fx => { fx.n(-0.5); m.rel += 2; hist(m, 'Defended by the whip through an indictment', x.year); return `Loyalty, on camera. ${lastName(m)} wept. The ad ran anyway.`; } },
        { t: 'Refer it to the Ethics Committee and say nothing', s: 'No further effect.', go: () => `"The process will play out," you said, forty times, in forty identical sentences.` },
      ] };
  } },
  { id: 'approval', w: () => 1, make: x => {
    const up = Math.random() < 0.5 + (50 - S.president.approval) / 120, d = ri(5, 8);
    const [h, why] = up ? pick([['a hostage rescue', 'a daring rescue abroad'], ['a stirring address to the nation', 'a speech for the ages'], ['a historic peace deal', 'peace breaking out'], ['a cancer-screening breakthrough from a federal lab', 'a breakthrough from the labs']]) : pick([['a White House scandal', 'a West Wing scandal'], ['a botched press conference', 'a press conference gone wrong'], ['soaring gas prices', 'four-dollar gas'], ['a chief of staff\'s resignation', 'chaos in the West Wing']]);
    return { h: `${presTitle().toUpperCase()} APPROVAL ${up ? 'SURGES' : 'CRATERS'} AFTER ${h.toUpperCase()}`, d: `${up ? 'Up' : 'Down'} ${d} points in a week, to ${clamp(S.president.approval + (up ? d : -d), 18, 82)}%.`, mood: up ? 'dawn' : 'storm',
      body: [`After ${why}, ${presTitle()}'s approval ${up ? 'jumped' : 'fell'} ${d} points. The President is ${x.whMine ? 'your party\'s' : 'their party\'s'}, so the ticket ${x.whMine === up ? 'gains' : 'loses'} with every point.`, `The ${up ? 'glow' : 'stench'} reaches every down-ballot race in the country.`],
      stakes: `Already in: ${campNum(up ? d : -d, 0)} approval, about ${campNum((up ? d : -d) / 5 * (x.whMine ? 1 : -1))} for your ticket.`,
      auto: fx => fx.appr(up ? d : -d),
      choices: x.whMine ? (up ? (campIsPres(x.my, x.mine) ? [
        { t: 'Lean into it: a victory-lap tour', s: '+0.4 national; approval +1.', go: fx => { fx.n(0.4); fx.appr(1); return `${presTitle()} did five rallies in five days. The crowds were enormous.`; } },
        { t: 'Stay humble; back to the grind', s: '+0.1 national.', go: fx => { fx.n(0.1); return 'No gloating. The numbers spoke for themselves, quietly.'; } },
      ] : [
        { t: 'Campaign with the President', s: '+0.4 national; approval +1.', go: fx => { fx.n(0.4); fx.appr(1); return `${x.my.name} and ${presTitle()} did five rallies together. The crowds were enormous.`; } },
        { t: 'Keep the focus on the nominee', s: '+0.1 national.', go: fx => { fx.n(0.1); return 'A gracious nod to the White House, then back to the nominee\'s own story.'; } },
      ]) : (campIsPres(x.my, x.mine) ? [
        { t: 'Reset: a new chief of staff and a prime-time address', s: '+0.3 national; approval +1.', go: fx => { fx.n(0.3); fx.appr(1); return `A shake-up in the West Wing and twenty minutes of prime time. "Steady," the pundits allowed.`; } },
        { t: 'Ride it out', s: 'No national effect; party mood −0.3.', go: fx => { fx.mood(-0.3); return 'The President changed nothing and waited for the news cycle to turn. It turned, slowly.'; } },
      ] : [
        { t: 'Distance the ticket from the White House', s: '+0.5 national; party mood −0.5; the President −1 more approval.', go: fx => { fx.n(0.5); fx.mood(-0.5); fx.appr(-1); return `"I'm not running for a third ${lastName(S.president)} term," your nominee said. The Oval Office took note.`; } },
        { t: 'Stand with the President', s: 'No national effect; party mood +0.3.', go: fx => { fx.mood(0.3); return 'Loyalty in a bad week. The base appreciated it; the swing voters did not notice.'; } },
      ])) : (up ? [
        { t: 'Attack the President anyway', s: 'A coin flip: ±0.3.', go: fx => { const ok = Math.random() < 0.5; fx.n(ok ? 0.3 : -0.3); return ok ? 'The attacks kept the base warm.' : 'Attacking a popular President in a good week looked sour.'; } },
        { t: `Change the subject to ${TAG[x.theme][1].toLowerCase()}`, s: '+0.2 national.', go: fx => { fx.n(0.2); fx.sal(x.theme, 1); return 'You could not beat the news, so you made your own.'; } },
      ] : [
        { t: `Tie ${x.theirL} to the President`, s: '+0.6 national.', go: fx => { fx.n(0.6); return `"${x.theirL} and ${lastName(S.president)}: a team" said the ad, with the two of them side by side.`; } },
        { t: 'Stay positive', s: '+0.2 national; party mood +0.3.', go: fx => { fx.n(0.2); fx.mood(0.3); return 'You let the President sink alone and talked about tomorrow.'; } },
      ]) };
  } },
  { id: 'debatespat', w: () => 0.9, make: x => {
    const theirs = Math.random() < 0.6, N = theirs ? x.their : x.my, L = theirs ? x.theirL : x.myL;
    const third = fx => { const r = +clamp((campCharisma(x.my) - campCharisma(x.their)) * 1.5 + gauss() * 0.8, -1.2, 1.2).toFixed(1); fx.n(r, 'the third debate'); return r; };
    return { h: `${L.toUpperCase()} THREATENS TO SKIP THE THIRD DEBATE`, d: `${N.name}'s campaign calls the format "rigged" and the moderator "biased."`, mood: 'night',
      body: [`The third debate was ${pick(['a foreign-policy forum in Phoenix', 'a town hall in Richmond', 'a Spanish-language debate in Miami'])}. ${N.name} says it won't happen without "fairness guarantees"; the commission says the rules were agreed in July.`, theirs ? 'Your side smells fear.' : 'Your own nominee is the one ducking.'],
      stakes: 'Debates are risky. So is looking scared of one.',
      choices: theirs ? [
        { t: 'Mock them as scared', s: '+0.5 national; 30% chance it backfires (−0.3 instead).', go: fx => { if (Math.random() < 0.3) { fx.n(-0.3); return 'A giant chicken costume outside their headquarters. It was funny for one day and childish for six.'; } fx.n(0.5); return `"Empty podium" became the hashtag. ${x.their.name} never found an answer to it.`; } },
        { t: 'Insist the debate go on', s: 'A third debate, decided by stage presence (±1.2).', go: fx => { const r = third(fx); return r > 0.3 ? `They showed up after all, and ${x.myL} won the night.` : r < -0.3 ? `They showed up after all, and ${x.theirL} won the night. Careful what you wish for.` : 'They showed up, and the debate was forgettable. A wash.'; } },
        { t: 'Let it go', s: 'No effect.', go: () => 'The debate was quietly cancelled. Nobody missed it.' },
      ] : [
        { t: 'Skip it', s: '−0.4 national.', go: fx => { fx.n(-0.4); return `The empty podium was on every channel for ninety minutes.`; } },
        { t: 'Show up anyway', s: 'A third debate, decided by stage presence (±1.2).', go: fx => { const r = third(fx); return r > 0.3 ? `${x.myL} showed up and won the night. The spat was forgotten.` : r < -0.3 ? `${x.myL} showed up and lost the night. Maybe the campaign had a point.` : 'A forgettable debate; the spat got more coverage than the event.'; } },
      ] };
  } },
  { id: 'haul', w: () => 1, make: x => {
    const mine = Math.random() < 0.6, N = mine ? x.my : x.their, amt = ri(180, 420);
    return { h: `${(mine ? x.myL : x.theirL).toUpperCase()} POSTS RECORD $${amt}M QUARTER`, d: `${N.name}'s campaign raises more money in three months than any ticket in history.`, mood: 'dawn',
      body: [`Small donors, big donors, a ${pick(['Hollywood', 'Silicon Valley', 'Texas oil', 'Wall Street'])} fundraiser that netted $${ri(20, 60)} million in one night: ${N.name} has $${amt} million to spend and ${ri(2, 4)} weeks to spend it.`, mine ? 'The Senate campaign committee would like a word about sharing.' : 'Their ad buy in the battlegrounds doubled overnight.'],
      stakes: mine ? 'Money is a decision.' : 'Their money is already moving the polls: −0.5 for your ticket, in.',
      auto: mine ? null : fx => fx.n(-0.5, 'their ad blitz'),
      choices: mine ? [
        { t: 'Pour it into the ticket now', s: '+0.8 national.', go: fx => { fx.n(0.8); return `A $${Math.round(amt / 3)} million buy across every battleground. Wall-to-wall for three weeks.`; } },
        { t: 'Bank it for the Senate races', s: '+2 campaign units for you to deploy.', go: fx => { fx.cash(2); return 'The ticket shared. Two units landed in the Senate committee\'s account by morning.'; } },
        { t: 'Split it', s: '+1 campaign unit; +0.4 national.', go: fx => { fx.cash(1); fx.n(0.4); return 'Half for the ticket, half for the Senate. Nobody was thrilled; nobody was angry.'; } },
      ] : [
        { t: 'Counter with a small-dollar push (1 capital)', s: '+1 campaign unit; −1 capital.', can: () => S.career.capital >= 1, go: fx => { fx.cap(-1); fx.cash(1); return 'A weekend of emails with the subject line "we\'re being outspent." It worked, a little.'; } },
        { t: 'Cry foul over dark money', s: 'A coin flip: +0.2 or nothing.', go: fx => { if (Math.random() < 0.5) { fx.n(0.2); return 'The "bought and paid for" line landed with a few voters.'; } fx.note('no measurable effect', false); return 'Nobody has ever won an election complaining about the other side\'s money.'; } },
        { t: 'Shrug', s: 'No effect.', go: () => 'You went back to work.' },
      ] };
  } },
  { id: 'pollerr', w: () => 0.8, make: x => {
    const hidden = ((x.E.wave || 0) - (x.E.waveSignal || 0)), right = Math.random() < 0.7, favors = (hidden >= 0) === right ? x.mine : x.theirs;
    return { h: `ANALYST: POLLS MAY BE UNDERCOUNTING ${PARTY[favors].short.toUpperCase()}`, d: `A famous forecaster warns that the public polls could be off by ${rnd(2, 4).toFixed(0)} points.`, mood: 'night',
      body: [`"Response rates are at historic lows," wrote ${fullName()} of ${pick(['the Ledger\'s polling desk', 'a well-known election blog', 'a university survey center'])}, "and the voters not answering lean ${PARTY[favors].name}." ${favors === x.mine ? 'Your donors are cheering.' : 'Your donors are panicking.'}`, 'Nobody will know who was right until Election Night. Forecasters have been wrong in both directions.'],
      stakes: 'Trust the polls, or trust the gut.',
      choices: [
        { t: `Shift a unit into turnout where the story says you're ${favors === x.mine ? 'stronger' : 'weaker'} (1 unit)`, s: '+0.6 national; −1 campaign unit.', can: () => S.election.cash >= 1, go: fx => { fx.cash(-1); fx.n(0.6); return 'Door-knockers in the counties the pollsters can\'t reach. Old-fashioned, and real.'; } },
        { t: 'Trust the polls', s: 'No effect.', go: () => 'You changed nothing. The forecaster\'s column got 4 million views and you did not read it.' },
        { t: 'Leak rosy internals to calm the donors', s: '+1 campaign unit; −0.2 national for looking worried.', go: fx => { fx.cash(1); fx.n(-0.2); return 'The internals "obtained" by a friendly reporter showed you up everywhere. The donors wrote checks; the press wrote about the leak.'; } },
      ] };
  } },
];
function campEnsureEvent() {
  const C = campC();
  if (CAMP_EVT_LIVE && C.evtId && CAMP_EVT_LIVE.id === C.evtId) return;
  const x = campCtx(), pool = CAMP_EVENTS.map(e => ({ e, w: e.w(x) })).filter(p => p.w > 0 && !(S.lastCampaign && S.lastCampaign.events && S.lastCampaign.events.some(ev => ev.id === p.e.id) && Math.random() < 0.7));
  let r = Math.random() * pool.reduce((a, p) => a + p.w, 0), def = pool[pool.length - 1].e;
  for (const p of pool) { r -= p.w; if (r <= 0) { def = p.e; break; } }
  const evt = def.make(x), fx = campFx();
  if (evt.auto) evt.auto(fx);
  CAMP_EVT_LIVE = { id: def.id, evt, autoChips: fx.chips(), autoText: fx.text() };
  C.evtId = def.id;
  log(`October surprise: ${evt.h}.`, 'sys');
}
function campApplyR4(i) {
  const C = campC(); campEnsureEvent();
  const ev = CAMP_EVT_LIVE.evt;
  if (i == null || !ev.choices[i] || (ev.choices[i].can && !ev.choices[i].can())) i = Math.max(0, ev.choices.findIndex(ch => !ch.can || ch.can()));
  const ch = ev.choices[i], fx = campFx(), res = ch.go(fx) || '';
  C.lastOutcome = { title: ev.h, choice: ch.t, result: res, chips: (CAMP_EVT_LIVE.autoChips || '') + fx.chips(), effect: [CAMP_EVT_LIVE.autoText, fx.text()].filter(Boolean).join(' · ') };
  C.events.push({ id: CAMP_EVT_LIVE.id, title: ev.h, choice: ch.t, effect: C.lastOutcome.effect, result: res.replace(/<[^>]+>/g, '') });
  log(`${ch.t}: ${res.replace(/<[^>]+>/g, '')}`, fx.net() > 0 ? 'good' : fx.net() < 0 ? 'bad' : 'sys');
  C.stage = 'r5'; campPoll('Late October', 4.5);
}
function campRound4() {
  const C = campC(); C.round = 3; C.stage = 'r4'; C.ui = {};
  campEnsureEvent();
  const draw = () => {
    const ev = CAMP_EVT_LIVE.evt, P = campProj(), last = C.polls[C.polls.length - 1];
    showModal(`<div class="kicker">The Fall Campaign · ${CAMP_ROUNDS[3]} · ${campYear()}</div><h2>Breaking news</h2>${campTicketsHTML(P.noms)}
      ${frontPage({ headline: ev.h, sub: ev.d, body: ev.body, mood: ev.mood || 'storm', date: `October ${campYear()} · Extra` })}
      <p class="camp-state">State of the race: ${campLeadText(last)} nationally; ${P.evMine} electoral votes projected for your ticket. ${ev.stakes || ''}${CAMP_EVT_LIVE.autoChips ? `<br>${CAMP_EVT_LIVE.autoChips}` : ''}</p>
      <div class="camp-dec"><h3>Your call, Whip</h3><div class="camp-opts camp-evopts">${ev.choices.map((ch, i) => `<button class="btn" data-choice="ev:${i}" ${ch.can && !ch.can() ? 'disabled' : ''}><span>${ch.t}<small>${ch.s}</small></span></button>`).join('')}</div></div>
      <div class="choices"><button class="btn primary big adv" id="campnext">Let the campaign manager decide ▶<small>Takes the first option you can afford.</small></button><button class="btn ghost adv" id="campauto">Let the campaign run itself ⏩</button></div>`);
    $('#modal-card').classList.add('camp-wide'); campBindCommon();
    $('#modal-card').querySelectorAll('[data-choice^="ev:"]').forEach(b => b.onclick = () => { campApplyR4(+b.dataset.choice.slice(3)); sfx.gavel(); campOutcome(() => campRound5()); });
    $('#campnext').onclick = () => { campApplyR4(null); sfx.gavel(); campOutcome(() => campRound5()); };
  };
  CAMP_UI.draw = draw; draw();
}
function campOutcome(next) {
  const C = campC(), o = C.lastOutcome;
  const draw = () => {
    showModal(`<div class="kicker">The Fall Campaign · ${CAMP_ROUNDS[3]} · ${campYear()}</div><h2>The fallout</h2>${campTicketsHTML(campNoms())}
      <div class="camp-out" id="campoutcome"><small>${o.title}</small><b>${o.choice}</b><p>${o.result}</p><div>${o.chips || '<span class="camp-fx">no measurable effect</span>'}</div></div>
      ${campTrackerHTML()}${campMapCardHTML(campProj())}
      <div class="choices"><button class="btn primary big adv" id="campnext">On to the final weekend ▶</button></div>`);
    $('#modal-card').classList.add('camp-wide'); campBindCommon();
    $('#campnext').onclick = next;
  };
  CAMP_UI.draw = draw; draw();
}

/* ---------------- round 5: the final weekend ---------------- */
function campSurrogatePool() {
  const noms = campNoms(), my = noms[S.side];
  return S.members.filter(m => m.party === S.side && m.name !== my.name && !(my.vp && m.name === my.vp.name))
    .map(m => ({ m, s: (m.rec || 0) + (T(m, 'leader') ? 3 : 0) + (m.star ? 3 : 0) + (m.rel || 0) * 0.2 + (T(m, 'vain') ? -0.5 : 0) + (m.grudge ? -2 : 0) }))
    .sort((a, b) => b.s - a.s).slice(0, 6).map(x => x.m);
}
function campR5UI() { return { ad: null, gotv: null, pending: null, sur: [], poolIds: campSurrogatePool().map(m => m.id) }; }
function campSurrogatesHTML(P) {
  const C = campC(), ui = C.ui, pool = ui.poolIds.map(id => S.members[id]).filter(Boolean), assigned = ui.sur, full = assigned.length >= 3, pending = ui.pending != null ? S.members[ui.pending] : null;
  const targets = campTargets(P).slice().sort((a, b) => Math.abs(a.m) - Math.abs(b.m));
  const rows = pool.map(m => {
    const a = assigned.find(s => s.id === m.id), home = P.by[m.state] && Math.abs(P.by[m.state].m) < 8;
    const tags = [T(m, 'leader') ? 'faction leader' : '', m.star ? '⭐ convention star' : '', (m.rec || 0) >= 4 ? 'popular at home' : '', home ? `home state ${m.state} is a battleground` : ''].filter(Boolean).join(' · ');
    let ctl;
    if (a) ctl = `<span class="camp-surgo">→ <b>${a.code}</b> ${stName(a.code)} <small>+1.2</small> <a href="#" data-camp="unsur:${m.id}">✕</a></span>`;
    else if (pending && pending.id === m.id) ctl = `<span class="camp-surgo"><i>choose a state below</i> <a href="#" data-camp="cancelsur">cancel</a></span>`;
    else if (full || pending) ctl = '';
    else ctl = `<button class="btn" data-choice="sur:${m.id}">Send</button>`;
    return `<div class="camp-sur ${a ? 'on' : ''}">${portrait(m)}<span style="flex:1"><b>${sen(m)}</b><small>${m.faction}${tags ? ' · ' + tags : ''}</small></span>${ctl}</div>`;
  }).join('');
  const states = pending ? `<div class="camp-states"><small>Where does Sen. ${lastName(pending)} go? Closest first:</small>${targets.filter(x => !assigned.some(s => s.code === x.c)).slice(0, 12).map(x => `<button class="btn" data-choice="surst:${x.c}" style="border-color:${x.m >= 0 ? 'var(--yes)' : 'var(--no)'}">${x.c}${x.c === pending.state ? ' 🏠' : ''} <small>${x.ev} EV · ${x.m >= 0 ? '+' : '−'}${Math.abs(x.m).toFixed(1)}</small></button>`).join('')}</div>` : '';
  return `<div class="camp-dec"><h3>2. Surrogates</h3><p>Send up to three senators to barnstorm a battleground: +1.2 for your ticket in that state. ${assigned.length}/3 sent${full ? '' : '; the rest go where the campaign manager says if you leave it blank'}.</p>${rows}${states}</div>`;
}
function campApplyR5() {
  const C = campC(), E = S.election, P = campProj(), my = P.noms[S.side];
  if (!C.ui || !C.ui.poolIds) C.ui = campR5UI();
  const ui = C.ui;
  const n = clamp(Math.min(+ui.ad || 0, E.cash), 0, 3);
  if (n > 0) { E.cash -= n; C.adBuy = n; C.national += cashEff(n, 0.7); }
  const sur = (ui.sur || []).slice(), targets = campTargets(P).slice().sort((a, b) => Math.abs(a.m) - Math.abs(b.m));
  const free = () => targets.filter(x => !sur.some(s => s.code === x.c));
  if (ui.pending != null && !sur.some(s => s.id === ui.pending)) { const m = S.members[ui.pending], t = free().find(x => m && x.c === m.state) || free()[0]; if (t) sur.push({ id: ui.pending, code: t.c }); }
  if (!sur.length) for (const id of ui.poolIds.slice(0, 3)) { const m = S.members[id], t = m && (free().find(x => x.c === m.state) || free()[0]); if (t) sur.push({ id, code: t.c }); }
  C.surrogates = sur.map(s => { const m = S.members[s.id]; campAdj(s.code, 1.2); if (m) hist(m, `Barnstormed ${stName(s.code)} for the ${campLast(my)} ticket`, campYear()); return { id: s.id, name: m ? m.name : '?', code: s.code }; });
  if (ui.gotv === true && S.career.capital >= 1) { S.career.capital--; C.gotv = true; C.national += 0.5; }
  campOpponentFinal(P);
  log(`The final weekend: ${n ? `${n} unit${n > 1 ? 's' : ''} of late ads (${campNum(cashEff(n, 0.7))})` : 'no late ad buy'}; ${C.surrogates.map(s => `${lastName({ name: s.name })} → ${s.code}`).join(', ') || 'no surrogates'}; ${C.gotv ? 'paid turnout (+0.5)' : 'no turnout money'}.`, 'sys');
  C.stage = 'eve'; campPoll('Election Eve', 3);
  const labor = C.polls[2], last = C.polls[C.polls.length - 1];
  if (labor && labor.me < labor.them - 1 && last.me > last.them) unlock('comeback');
}
function campRound5() {
  const C = campC(); C.round = 4; C.stage = 'r5'; C.ui = campR5UI();
  const draw = () => {
    const E = S.election, P = campProj(), noms = P.noms, ui = C.ui, cap = S.career.capital;
    const intro = `Four days out. ${E.cash} campaign unit${E.cash === 1 ? '' : 's'} left in the account, and the Senate races want every one of them. The battlegrounds are ${P.battle.length ? P.battle.slice(0, 5).map(x => x.c).join(', ') + (P.battle.length > 5 ? ' and more' : '') : 'nowhere: this race is not close'}. Buy the last ads, send your best senators where they can move 1.2 points, and decide whether to pay for the turnout machine.`;
    const opts = [0, 1, 2, 3].filter(n => n <= E.cash);
    const adLabel = n => n === 0 ? 'Go dark' : `${n} unit${n > 1 ? 's' : ''}${n === 3 ? ' (the most the airwaves will take)' : ''}`;
    const adFx = n => n === 0 ? 'Keep the money for the Senate.' : `${campNum(cashEff(n, 0.7))} national. Late airtime is pricey: the first unit is worth +0.7, and the stations are sold out past three.`;
    const adHTML = ui.ad != null ? campPickHTML(`📺 ${adLabel(ui.ad)}`, 'ad', adFx(ui.ad)) : `<div class="camp-opts">${opts.map(n => `<button class="btn" data-choice="ad:${n}"><span>📺 ${adLabel(n)}<small>${adFx(n)}</small></span></button>`).join('')}</div>`;
    const gotvHTML = ui.gotv != null ? campPickHTML(ui.gotv ? '🚌 Pay the turnout machine (1 capital)' : '🪙 Keep the capital', 'gotv', ui.gotv ? '+0.5 national.' : 'The volunteers knock doors for free.')
      : `<div class="camp-opts"><button class="btn" data-choice="gotv:1" ${cap < 1 ? 'disabled' : ''}><span>🚌 Pay the turnout machine<small>Buses, phone banks, poll watchers: +0.5 national. Costs 1 capital (you have ${cap}).</small></span></button><button class="btn" data-choice="gotv:0"><span>🪙 Keep the capital<small>The volunteers knock doors for free; you keep your chips for the Senate.</small></span></button></div>`;
    campFrame('The final weekend', intro, `<div class="camp-dec"><h3>1. The last ad buy</h3>${adHTML}</div>${campSurrogatesHTML(P)}<div class="camp-dec"><h3>3. Get out the vote</h3>${gotvHTML}</div>`, 'Election Eve ▶');
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice^="ad:"]').forEach(b => b.onclick = () => { ui.ad = clamp(+b.dataset.choice.slice(3) || 0, 0, 3); sfx.click(); draw(); });
    card.querySelectorAll('[data-choice^="gotv:"]').forEach(b => b.onclick = () => { const v = b.dataset.choice.slice(5) === '1'; if (v && S.career.capital < 1) return; ui.gotv = v; sfx.click(); draw(); });
    card.querySelectorAll('[data-choice^="sur:"]').forEach(b => b.onclick = () => { if (ui.sur.length >= 3) return; ui.pending = +b.dataset.choice.slice(4); sfx.click(); draw(); });
    card.querySelectorAll('[data-choice^="surst:"]').forEach(b => b.onclick = () => { if (ui.pending == null) return; ui.sur.push({ id: ui.pending, code: b.dataset.choice.slice(6) }); ui.pending = null; sfx.up(); draw(); });
    card.querySelectorAll('[data-camp^="unsur:"]').forEach(a => a.onclick = e => { e.preventDefault(); const id = +a.dataset.camp.slice(6); ui.sur = ui.sur.filter(s => s.id !== id); sfx.click(); draw(); });
    if (card.querySelector('[data-camp="cancelsur"]')) card.querySelector('[data-camp="cancelsur"]').onclick = e => { e.preventDefault(); ui.pending = null; draw(); };
    $('#campnext').onclick = () => { campApplyR5(); sfx.fanfare(); campEveScreen(); };
  };
  CAMP_UI.draw = draw; draw();
}

/* ---------------- the end: Election Eve ---------------- */
function campRecapHTML(C) {
  if (!C) return '';
  const mine = S.side, deb = C.debates.filter(d => d.round !== 'vp'), vp = C.debates.find(d => d.round === 'vp'), N = S.nominees || {}, my = N[mine] || {}, their = N[other(mine)] || {};
  const u = n => n.unity == null ? 1 : n.unity, conv = 0.5 * ((my.bounce || 0) - (their.bounce || 0)) + 3 * (u(my) - u(their));
  const dline = d => `<b>${d.round === 1 ? 'First debate' : 'Second debate'} (${d.city}):</b> ${d.winner === mine ? '<span style="color:var(--yes)">won</span>' : d.winner ? '<span style="color:var(--no)">lost</span>' : 'a draw'}, ${CAMP_DEBATE[d.mine].name} vs ${CAMP_DEBATE[d.theirs].name}${d.prep ? ', after debate camp' : ''} (${campNum(d.result)})`;
  const rows = [
    C.theme && TAG[C.theme] ? `<b>Message:</b> ${TAG[C.theme][0]} ${TAG[C.theme][1]}${C.themeHot ? ' — a top issue with voters (+1)' : ''}` : '',
    C.strategy ? `<b>Map:</b> ${CAMP_MAPS[C.strategy].name}${C.focus && C.focus.length ? ` (${C.focus.join(', ')})` : ''}` : '',
    C.opp && C.opp.strategy && TAG[C.opp.theme] ? `<b>Their campaign:</b> ran on ${TAG[C.opp.theme][1]}${C.opp.themeHot ? ' (a top issue, −1)' : ''} with ${CAMP_MAPS[C.opp.strategy].prose}${C.opp.focus.length ? ` (${C.opp.focus.join(', ')})` : ''}` : '',
    ...deb.map(dline),
    vp ? `<b>Running mates' debate:</b> ${vp.winner === mine ? 'won' : vp.winner ? 'lost' : 'a wash'}${vp.gaffeMine ? ', your running mate gaffed' : ''}${vp.gaffeTheirs ? ', theirs gaffed' : ''} (${campNum(vp.result)})` : '',
    C.momentum ? '<b>Momentum:</b> swept the debates (+0.5)' : '',
    ...C.events.map(e => `<b>October surprise:</b> <span class="camp-hl">${e.title}</span> — <i>${e.choice}</i>${e.effect ? ` (${e.effect})` : ''}`),
    C.surrogates && C.surrogates.length ? `<b>Surrogates:</b> ${C.surrogates.map(s => `${s.name} → ${s.code}`).join(', ')} (+1.2 each)` : '',
    C.adBuy ? `<b>Late ads:</b> ${C.adBuy} unit${C.adBuy > 1 ? 's' : ''} (${campNum(cashEff(C.adBuy, 0.7))})` : '',
    C.gotv ? '<b>Turnout:</b> paid the machine (+0.5)' : '',
    C.opp && (C.opp.surrogates.length || C.opp.adBuy || C.opp.gotv) ? `<b>Their closing weekend:</b> ${campOppLine(C.opp)}` : '',
    S.election && S.election.presCash ? `<b>Bulk money:</b> ${money(S.election.presCash)} (${campNum(cashEff(S.election.presCash, 1.2))})` : '',
    `<b>Net campaign effect:</b> ${campNum(campaignEffects())} national for your ticket${conv ? ` (of which ${campNum(conv)} from the conventions' bounces and unity)` : ''}`,
  ].filter(Boolean);
  return `<div class="camp-recap">${rows.map(r => `<div>${r}</div>`).join('')}</div>`;
}
function campEveScreen() {
  const C = campC(), P = campProj(), noms = P.noms, mine = S.side, my = noms[mine], their = noms[other(mine)], last = C.polls[C.polls.length - 1], lead = last.me - last.them;
  const toss = P.states.filter(x => Math.abs(x.m) < 3).sort((a, b) => b.ev - a.ev), leader = lead > 0 ? my : their;
  const hl = Math.abs(lead) < 1 ? 'ELECTION EVE: POLLS SHOW A DEAD HEAT' : `ELECTION EVE: POLLS SHOW ${campLast(leader).toUpperCase()} UP ${Math.abs(lead) < 1.5 ? 'A HAIR' : Math.round(Math.abs(lead))}`;
  const quote = pick([`It comes down to turnout in ${P.battle[0] ? stName(P.battle[0].c) : 'the suburbs'}.`, 'If the polls are off by two, everything changes.', 'We like our map. We do not love it.', `Whoever wins ${P.battle[0] ? stName(P.battle[0].c) : 'Pennsylvania'} wins the night.`, 'Nobody sleeps tonight. Nobody.']);
  const draw = () => {
    showModal(`<div class="kicker">The Fall Campaign · ${CAMP_ROUNDS[4]} · ${campYear()}</div><h2>Election Eve</h2>${campTicketsHTML(noms)}
      ${frontPage({ headline: hl, sub: `${P.evMine} electoral votes projected for ${campLast(my)}, ${P.evTheirs} for ${campLast(their)}; ${toss.length} state${toss.length === 1 ? '' : 's'} inside the margin of error.`, mood: lead >= 0 ? 'dawn' : 'night', date: `November ${campYear()} · Election Eve`,
        body: [`WASHINGTON — The final national poll of polls has ${Math.abs(lead) < 1 ? 'a dead heat' : `${campLast(leader)} ahead by ${Math.abs(lead).toFixed(1)}`}: ${campLast(my)} ${last.me.toFixed(1)}%, ${campLast(their)} ${last.them.toFixed(1)}%${last.tp ? `, ${C.thirdParty.name} ${last.tp.toFixed(1)}%` : ''}, with ${last.und.toFixed(0)}% still undecided.`,
          toss.length ? `The toss-ups: ${toss.map(x => `${stName(x.c)} (${x.ev})`).join(', ')}. ${campPath(P).replace(/<[^>]+>/g, '')}` : `Not a single state is inside the margin of error. ${campPath(P).replace(/<[^>]+>/g, '')}`,
          `"${quote}" said a senior ${PARTY[mine].name} strategist who asked not to be named. ${C.surrogates.length ? `${C.surrogates.length} ${PARTY[mine].name} senators barnstormed battlegrounds in the final weekend.` : ''}`,
          C.opp && C.opp.surrogates ? `${their.name}'s campaign closed with ${C.opp.surrogates.length ? `${C.opp.surrogates.length} senators barnstorming ${C.opp.surrogates.map(s => stName(s.code)).join(', ')}` : 'no surrogates on the road'}, ${C.opp.adBuy ? 'a late ad blitz' : 'its airtime already spent'} and ${C.opp.gotv ? 'a paid turnout operation' : 'a shoestring turnout operation'}.` : ''].filter(Boolean) })}
      ${C.autoLog.length ? `<div class="camp-autolog"><b>While you were whipping, the campaign manager:</b>${C.autoLog.map(t => `<div>• ${t}</div>`).join('')}</div>` : ''}
      <div class="camp-card"><div class="camp-ch"><b>📋 The fall campaign in review</b><span>${campYear()}</span></div>${campRecapHTML(C)}</div>
      ${campTrackerHTML()}${campMapCardHTML(P)}
      <div class="choices"><button class="btn primary big adv" id="campeve">To the Senate trail ▶</button></div>`);
    $('#modal-card').classList.add('camp-wide'); campBindCommon();
    $('#campeve').onclick = () => campFinish();
  };
  CAMP_UI.draw = draw; draw();
}
function campFinish() {
  const C = campC(), N = S.nominees || {}, ui = CAMP_UI; if (!C || !ui) return;
  const tk = p => { const n = N[p] || {}; return { name: n.name || '?', vp: n.vp ? n.vp.name : null, faction: n.faction || null, state: n.state || null }; };
  S.lastCampaign = { year: campYear(), polls: C.polls, debates: C.debates.map(d => ({ ...d, text: undefined })), events: C.events, strategy: C.strategy, theme: C.theme, focus: C.focus, surrogates: C.surrogates, adBuy: C.adBuy, gotv: C.gotv, opp: C.opp, thirdParty: C.thirdParty, momentum: C.momentum, national: +C.national.toFixed(2), effect: +campaignEffects().toFixed(2), tickets: { D: tk('D'), R: tk('R') } };
  C.stage = 'done'; C.ui = null;
  $('#modal-card').classList.remove('camp-wide');
  CAMP_UI = null; CAMP_EVT_LIVE = null;
  ui.done();
}
// "Let the campaign run itself": the campaign manager takes every remaining decision
function campAutoRun() {
  const C = campC(); if (!C) return;
  const note = t => C.autoLog.push(t);
  let guard = 0;
  while (C.stage !== 'eve' && C.stage !== 'done' && guard++ < 8) {
    if (C.stage === 'r1') { campApplyR1(); note(`Labor Day: ran on ${TAG[C.theme][1]}${C.themeHot ? ' (a top issue, +1)' : ''} with ${CAMP_MAPS[C.strategy].prose}.`); if (C.opp && C.opp.strategy) note(`Across the aisle: ${campLast(campNoms()[other(S.side)])} ran on ${TAG[C.opp.theme][1]}${C.opp.themeHot ? ' (a top issue, −1)' : ''} with ${CAMP_MAPS[C.opp.strategy].prose}.`); }
    else if (C.stage === 'r2') { C.round = 1; const r = campApplyR2(); note(`First debate in ${r.city}: ${campDebateVerdict(r)}.`); }
    else if (C.stage === 'r3') { C.round = 2; const r = campApplyR3(); const vp = C.debates.find(d => d.round === 'vp'); if (vp) note(`Running mates' debate: ${vp.winner === S.side ? 'won' : vp.winner ? 'lost' : 'a wash'} (${campNum(vp.result)}).`); note(`Second debate in ${r.city}: ${campDebateVerdict(r)}.${C.momentum ? ' Momentum (+0.5).' : ''}`); }
    else if (C.stage === 'r4') { C.round = 3; campApplyR4(null); note(`October surprise, <span class="camp-hl">${C.lastOutcome.title}</span>: ${C.lastOutcome.choice}${C.lastOutcome.effect ? ` (${C.lastOutcome.effect})` : ''}.`); }
    else if (C.stage === 'r5') { C.round = 4; campApplyR5(); note(`Final weekend: ${C.surrogates.map(s => `${lastName({ name: s.name })} → ${s.code}`).join(', ') || 'no surrogates'}; ${C.adBuy ? `${C.adBuy} unit${C.adBuy > 1 ? 's' : ''} of late ads (${campNum(cashEff(C.adBuy, 0.7))})` : 'no late ads'}; ${C.gotv ? 'paid the turnout machine (+0.5)' : 'kept the capital'}.`); if (C.opp) note(`Their closing weekend: ${campOppLine(C.opp)}.`); }
  }
  sfx.up();
  campEveScreen();
}

/* ---------------- the presidential battleground on the Senate trail ---------------- */
function presBattleHTML() {
  const E = S.election, C = E.camp || null, P = campProj(), mine = S.side, noms = P.noms;
  const last = C && C.polls && C.polls.length ? C.polls[C.polls.length - 1] : null;
  return `<div class="presbox"><b>🇺🇸 The race for the White House</b>${campTicketsHTML(noms)}
    ${last ? `<div class="camp-pop camp-pop-sm"><span style="color:var(--dim)">Final poll of polls:</span><span style="color:${PARTY[mine].color}"><b>${last.me.toFixed(1)}</b>${campLast(noms[mine])}</span><span style="color:${PARTY[other(mine)].color}"><b>${last.them.toFixed(1)}</b>${campLast(noms[other(mine)])}</span>${last.tp ? `<span style="color:${PARTY.I.color}"><b>${last.tp.toFixed(1)}</b>${C.thirdParty ? C.thirdParty.name : 'Independent'}</span>` : ''}<span style="color:var(--dim)"><b>${last.und.toFixed(0)}</b>undecided</span></div>` : ''}
    <p>Projected Electoral College for your ticket: <b style="color:${P.evMine >= 270 ? 'var(--yes)' : 'var(--no)'}">${P.evMine}</b> of 270 (${P.evTheirs} for ${campLast(noms[other(mine)])}). ${campPath(P)}</p>
    <div class="campmap">${campMapHTML(P)}</div>
    <div class="camp-chips"><b>Battlegrounds</b> ${P.battle.map(x => campChip(x, C && (C.focus || []).includes(x.c) ? 'focus' : '')).join('') || '<small style="color:var(--dim)">none: this race isn\'t close</small>'}</div>
    ${C ? `<details class="cdet"><summary>📋 The fall campaign in review</summary>${campRecapHTML(C)}</details>` : ''}
    <div class="races" style="max-height:none"><div class="race"><span>💰 <b>Bulk presidential money</b><br><small style="color:var(--dim)">Transfer units to the ticket for the last 72 hours. The first unit ≈ +1.2 points nationwide; more units, a bit less each. Every unit here is a unit not spent on a Senate seat.</small></span><span class="cashctl"><button class="btn" data-pc="-1" ${E.presCash ? '' : 'disabled'}>−</button><span class="dots">${money(E.presCash)}</span><button class="btn" data-pc="1" ${E.cash < 1 ? 'disabled' : ''}>+</button></span></div></div></div>`;
}
function bindPresBattle(draw) {
  const card = $('#modal-card'), E = S.election; if (!E || !E.pres) return;
  // the money buttons are bound by the trail itself; this adds the nominees' profiles
  card.querySelectorAll('.presbox [data-cprof]').forEach(a => a.onclick = e => { e.preventDefault(); const p = a.dataset.cprof, person = campPersonOf(campNoms()[p]); if (person) profileModal(person, `${PARTY[p].name} nominee`, draw); });
}

ACH.push(['debater', '🎤', 'Debate Champion', 'Your nominee wins both presidential debates in a fall campaign.'], ['comeback', '🏇', 'Comeback Trail', 'Trail on Labor Day and lead on Election Eve.']);
