'use strict';
/* =====================================================================
   WORLD — governors, the Vice President and cabinet, executive orders,
   war, the docket, the Pulse (national mood coverage) and presidential
   primaries. Loaded after game.js, names.js, art.js and depth.js.
   ===================================================================== */

const GOV_PRES_YEAR = ['DE', 'IN', 'MO', 'MT', 'NC', 'ND', 'UT', 'WA', 'WV'];
const GOV_EVERY_TWO = ['NH', 'VT'];
function govUp(code, year) { return GOV_EVERY_TWO.includes(code) || (year % 4 === 0 ? GOV_PRES_YEAR.includes(code) : !GOV_PRES_YEAR.includes(code)); }
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
    g.faction = pick(FACTIONS[party])[0]; g.terms = ri(1, 2);
    const since = 2026 - (g.terms - 1) * 4 - (GOV_PRES_YEAR.includes(code) ? 2 : 0);
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
  S.pulse.push({ lbl: `${season(S.career.bills || 1)[0]}${String(billYear(Math.max(1, S.career.bills))).slice(2)}`, ap: S.president.approval, gb: Math.round(genericBallot()), rt: rightTrack(), wh: S.president.party });
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
    const last = s.pts.length - 1; svg += `<circle cx="${x(last)}" cy="${y(s.pts[last])}" r="4" fill="${s.color}"/><text x="${x(last) - 4}" y="${y(s.pts[last]) - 8}" font-size="11" text-anchor="end" fill="${s.color}" font-weight="800">${s.label} ${Math.round(s.pts[last])}%</text>`;
  }
  return svg + '</svg>';
}
function openPulse(back) {
  const P = S.president, gb = genericBallot(), rt = rightTrack(), pts = S.pulse || [];
  const sal = Object.entries(S.salience || {}).sort((a, b) => b[1] - a[1]), maxS = Math.max(...sal.map(x => x[1]), 1);
  const chyrons = [
    P.approval >= 52 ? `${presTitle().toUpperCase()} RIDING HIGH AT ${P.approval}%` : P.approval <= 42 ? `${presTitle().toUpperCase()} SINKS TO ${P.approval}% — LOWEST YET` : `${presTitle().toUpperCase()} STUCK AT ${P.approval}%`,
    S.war ? `WAR IN ${S.war.place.toUpperCase()}: ${S.war.support}% SUPPORT, MONTH ${S.war.months}` : `GENERIC BALLOT: ${PARTY[S.side].short.toUpperCase()} ${gb >= 50 ? 'LEAD' : 'TRAIL'} ${Math.abs(gb - (100 - gb)).toFixed(0)} POINTS`,
    `TOP ISSUE: ${TAG[sal[0][0]][1].toUpperCase()} — ${rt}% SAY COUNTRY ON RIGHT TRACK`,
    S.shutdown ? 'SHUTDOWN DRAGS ON — FEDERAL WORKERS MISS PAYCHECKS' : S.mood >= 3 ? `${PARTY[S.side].short.toUpperCase()} MOMENTUM BUILDS AHEAD OF ${electionYear(nextElectionK())}` : S.mood <= -3 ? `${PARTY[S.side].short.toUpperCase()} IN TROUBLE: VOTERS SOUR` : 'VOTERS SPLIT AS WASHINGTON GRIDLOCK GRINDS ON',
  ];
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
    <div class="pulsegrid"><div><b>Trends</b>${pts.length > 1 ? lineChart([{ pts: pts.map(p => p.ap), color: PARTY[P.party].color, label: 'Approval' }, { pts: pts.map(p => p.gb), color: '#e3b54a', label: 'Your party' }]) : '<p style="color:var(--dim)">Trends appear after your first bill.</p>'}</div>
      <div><b>What voters care about</b>${sal.map(([t, v]) => `<div class="salrow"><span>${TAG[t][0]} ${TAG[t][1]}</span><span class="mbar"><i style="width:${v / maxS * 100}%;background:#e3b54a"></i></span></div>`).join('')}<small style="color:var(--dim)">Bills on the top issues move public opinion more.</small></div></div>
    <div class="voices"><b>Voices from the states</b>${voices}</div>
    <div class="choices"><button class="btn primary" id="pulseok">Back</button></div>`);
  $('#pulseok').onclick = () => { if (back) back(); else hideModal(); };
}

/* ---------------- between bills: the executive branch acts ---------------- */
function worldNews() {
  const out = [], P = S.president;
  // war grinds on
  if (S.war) {
    const W = S.war; W.months += 4;
    W.support = clamp(W.support - ri(2, 7) + ((S.cabinet.defense && S.cabinet.defense.competence) || 3) - 3, 5, 90);
    if (P.party === W.party) P.approval += W.support >= 50 ? 0 : -1;
    if (Math.random() < 0.12 + ((S.cabinet.defense && S.cabinet.defense.competence) || 3) * 0.02) {
      const win = Math.random() < W.support / 100 + 0.1;
      out.push(win ? `🕊️ <b>The war in ${W.place} ends in victory.</b> ${presTitle()}'s approval jumps.` : `🏳️ <b>U.S. forces withdraw from ${W.place}</b> after ${W.months} months. A bitter end.`);
      if (P.party === W.party) P.approval += win ? 6 : -4;
      S.war = null;
    }
  } else if (Math.random() < 0.07 && !S.pendingAUMF) {
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
  return out;
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

/* ---------------- the docket: what comes to the floor next ---------------- */
function forcedNext(n) {
  if (n % 3 === 0) return 'The yearly budget';
  if (S.pendingAUMF) return `War vote: Authorization for Use of Military Force in ${S.pendingAUMF}`;
  if (S.nominee && S.president.party === S.side && S.court.length < 9) return `Supreme Court confirmation: Judge ${S.nominee.name}`;
  return null;
}
function billPool() { return AGENDA[S.side].concat(AGENDA.both).filter(b => !(S.history || []).slice(-8).some(h => h.name === b[0])); }
function docketHTML() {
  const n = S.career.bills + 1, forced = forcedNext(n);
  if (forced) return `<hr><b>📋 The Docket</b><p style="margin:6px 0">Next up: <b>${forced}</b> <small style="color:var(--dim)">(this one can't wait)</small></p>`;
  const D = S.docketOffer || (S.docketOffer = shuffle(billPool()).slice(0, 3));
  const landmark = n % 5 === 0, maj = isMajority();
  const promTags = (S.promises || []).filter(p => !p.done && !p.broken && promiseOf(p.id)[2] === 'tag').map(p => promiseOf(p.id)[3]);
  const pick1 = S.docket ? S.docket.name : (landmark ? 'a landmark bill (leadership\'s choice)' : D[0][0]);
  return `<hr><b>📋 The Docket</b> <small style="color:var(--dim)">· ${maj ? 'your party controls the floor' : 'the other party controls the floor: anything but their pick takes a discharge petition (2 capital, 60% odds)'}</small>
    <p style="margin:6px 0">Next up: <b>${pick1}</b>${S.docket ? ' <small style="color:var(--gold2)">(your pick)</small>' : ''}</p>
    <div class="shop docket">${D.map((b, i) => `<button class="btn ${S.docket && S.docket.name === b[0] ? 'on' : ''}" data-dk="${i}"><span>${b[0]}<small>${b[1]} ${Object.entries(b[2]).map(([t, v]) => `${TAG[t][0]}${v > 0 ? '+' : '−'}`).join(' ')}${Object.keys(b[2]).some(t => promTags.includes(t) && b[2][t] >= 2) ? ' · <b style="color:var(--gold2)">★ keeps a promise</b>' : ''}</small></span><span class="cost">${maj ? (i === 0 && !landmark ? 'free' : 'free') : '2 cap'}</span></button>`).join('')}</div>
    <div class="ownbill"><small>Bring your own bill on an issue (${maj ? '1 capital' : 'discharge petition: 2 capital'}):</small> ${TAGS.map(t => `<button class="btn tagb ${promTags.includes(t) ? 'promise' : ''}" data-own="${t}">${TAG[t][0]} ${TAG[t][1]}${promTags.includes(t) ? ' ★' : ''}</button>`).join('')}</div>
    ${S.war && (S.war.party !== S.side || S.war.support < 45) ? `<button class="btn" data-wpr="1" style="margin-top:6px">☮ War Powers Resolution: end the war in ${S.war.place}<small>${maj ? '1 capital' : '2 capital, 60% odds'}</small></button>` : ''}`;
}
function bindDocket(redraw) {
  const card = $('#modal-card'), maj = isMajority(), c = S.career;
  const tryFloor = (tpl, cost, label) => {
    if (c.capital < cost) { toast('Not enough capital.'); return; }
    c.capital -= cost;
    if (!maj && Math.random() > 0.6) { toast('The discharge petition fell short. Leadership keeps its pick.'); sfx.down(); redraw(); return; }
    S.docket = { name: tpl[0], tpl }; toast(`${label}: ${tpl[0]} is next.`); sfx.up(); redraw();
  };
  card.querySelectorAll('[data-dk]').forEach(b => b.onclick = () => { const t = S.docketOffer[+b.dataset.dk]; tryFloor(t, maj ? 0 : 2, 'On the docket'); });
  card.querySelectorAll('[data-own]').forEach(b => b.onclick = () => {
    const tag = b.dataset.own, pool = billPool().filter(x => (x[2][tag] || 0) >= 2);
    const t = pool.length ? pick(pool) : pick(AGENDA.both.concat(AGENDA[S.side]).filter(x => (x[2][tag] || 0) >= 1)) || pick(billPool());
    tryFloor(t, maj ? 1 : 2, 'You brought it to the floor');
  });
  card.querySelectorAll('[data-wpr]').forEach(b => b.onclick = () => tryFloor([`War Powers Resolution on ${S.war.place}`, `Order U.S. forces out of ${S.war.place} within 30 days.`, { security: -2, welfare: 1, taxes: 1 }], maj ? 1 : 2, 'Forced a vote'));
}
// startBill asks here first
function docketTemplate(n) {
  if (S.pendingAUMF) { const place = S.pendingAUMF; return { tpl: [`Authorization for Use of Military Force in ${place}`, `The President asks Congress to authorize force in ${place}. A simple majority; the nation is watching.`, { security: 3, taxes: -1, welfare: -1 }], aumf: place }; }
  if (S.docket) { const d = S.docket; S.docket = null; S.docketOffer = null; return { tpl: d.tpl, wpr: d.name.startsWith('War Powers') }; }
  S.docketOffer = null;
  return null;
}

/* ---------------- presidential primaries ---------------- */
const PRIMARY_CAL = [['Iowa', ['IA']], ['New Hampshire', ['NH']], ['Nevada', ['NV']], ['South Carolina', ['SC']], ['Super Tuesday', ['AL', 'AR', 'CA', 'CO', 'ME', 'MA', 'MN', 'NC', 'OK', 'TN', 'TX', 'UT', 'VT', 'VA']], ['Mid-March', ['GA', 'MS', 'WA', 'MI', 'MO']], ['St. Patrick\'s Day', ['AZ', 'FL', 'IL', 'KS', 'OH', 'LA']], ['April', ['CT', 'DE', 'MD', 'NY', 'PA', 'RI', 'WI', 'HI', 'AK', 'WY']], ['May', ['IN', 'NE', 'WV', 'KY', 'OR', 'ID']], ['June', ['MT', 'NJ', 'NM', 'SD', 'ND', 'DC']]];
const CAND_COLORS = ['#f59e0b', '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fb7185', '#facc15'];
function primaryField(party) {
  const P = S.president, field = [];
  const add = (p, office, ref) => { if (p && !field.some(f => f.name === p.name)) field.push({ name: p.name, p, office, ref, party, faction: p.faction || pick(FACTIONS[party])[0], state: p.state, charisma: rnd(0.75, 1.3), money: rnd(0.8, 1.2), del: 0, wins: 0, active: true, color: CAND_COLORS[field.length % CAND_COLORS.length] }); };
  if (P.party === party && S.vp) add(S.vp, 'Vice President', { type: 'vp' });
  const sens = shuffle(S.members.filter(m => m.party === party)).sort((a, b) => (T(b, 'ambitious') ? 1 : 0) - (T(a, 'ambitious') ? 1 : 0)).slice(0, 2 + ri(0, 1));
  sens.forEach(m => add(m, `Senator from ${ST[m.state].name}`, { type: 'sen', id: m.id }));
  shuffle(Object.keys(S.governors).filter(c => S.governors[c].party === party)).slice(0, 2).forEach(c => add(S.governors[c], `Governor of ${ST[c].name}`, { type: 'gov', code: c }));
  if (P.party === party) { const post = pick(CABINET_POSTS.slice(0, 4))[0]; if (S.cabinet[post]) add(S.cabinet[post], CABINET_POSTS.find(c => c[0] === post)[1], { type: 'cab', post }); }
  const rep = pick((S.reps || []).filter(r => r.party === party)); if (rep) add(rep, `Representative (${rep.district})`, { type: 'rep' });
  return field.slice(0, 6);
}
function contestShares(field, states, endorsed) {
  const res = {};
  for (const code of states) {
    const act = field.filter(f => f.active);
    const raw = act.map(f => {
      const fx = (FACTIONS[f.party].find(x => x[0] === f.faction) || [0, {}])[1];
      let fit = 0; if (ST[code]) for (const t of TAGS) fit += (fx[t] || 0) * ST[code].voter[t] * 0.08;
      return Math.max(0.05, f.charisma * f.money * (1 + fit) * (f.state === code ? 1.6 : 1) * (1 + f.wins * 0.06) * (endorsed === f.name ? 1.15 : 1) * rnd(0.75, 1.25));
    });
    const tot = raw.reduce((a, b) => a + b, 0);
    res[code] = act.map((f, i) => ({ f, pct: raw[i] / tot * 100 })).sort((a, b) => b.pct - a.pct);
  }
  return res;
}
function primaryPoll(field) {
  const act = field.filter(f => f.active); if (!act.length) return {};
  const tot = {}; act.forEach(f => tot[f.name] = 0);
  const r = contestShares(field, Object.keys(EV), null);
  let w = 0;
  for (const [code, rows] of Object.entries(r)) { const ev = EV[code] || 3; w += ev; rows.forEach(x => tot[x.f.name] += x.pct * ev); }
  const undecided = Math.max(4, 14 - Object.values(field).reduce((a, f) => a + f.wins, 0));
  const out = {}; for (const f of act) out[f.name] = tot[f.name] / w * (100 - undecided) / 100;
  out._undecided = undecided;
  return out;
}
function runPrimaryFor(party, endorsed, step) {
  const field = primaryField(party), results = {}, totalDel = Object.values(EV).reduce((a, b) => a + b, 0) * 10, need = Math.floor(totalDel / 2) + 1;
  let i = 0;
  const nextContest = () => {
    if (i >= PRIMARY_CAL.length) return false;
    const [label, states] = PRIMARY_CAL[i++];
    const r = contestShares(field, states, endorsed);
    for (const code of states) {
      results[code] = r[code];
      const del = (EV[code] || 3) * 10, elig = r[code].filter(x => x.pct >= 15), et = elig.reduce((a, b) => a + b.pct, 0) || 1;
      elig.forEach(x => x.f.del += Math.round(del * x.pct / et));
      r[code][0].f.wins++;
    }
    // weak candidates drop out after the early states
    if (i >= 4) { const act = field.filter(f => f.active).sort((a, b) => b.del - a.del); act.slice(2).forEach(f => { if (f.del < act[0].del * 0.25 && f.name !== endorsed) { f.active = false; f.out = label; } }); }
    if (i >= 6) { const act = field.filter(f => f.active).sort((a, b) => b.del - a.del); act.slice(2).forEach(f => { f.active = false; f.out = f.out || label; }); }
    return label;
  };
  return { field, results, need, totalDel, nextContest, done: () => i >= PRIMARY_CAL.length || field.some(f => f.del >= need) };
}
function primariesModal(done) {
  const P = S.president, year = billYear(S.career.bills + 1);
  const parties = ['D', 'R'];
  const incumbent = p => P.party === p && P.terms < 2;
  const state = {};
  for (const p of parties) state[p] = incumbent(p) ? null : runPrimaryFor(p, null);
  let endorsed = null, lastLabel = '';
  const mine = S.side, R = state[mine];
  const finishAll = () => {
    for (const p of parties) if (state[p]) { while (!state[p].done()) state[p].nextContest(); }
    S.nominees = {};
    for (const p of parties) {
      let nom, office;
      if (!state[p]) { nom = P; office = 'President'; hist(P, `Renominated for President without serious opposition`); }
      else {
        const f = state[p].field.slice().sort((a, b) => b.del - a.del)[0]; nom = f.p; office = f.office;
        hist(f.p, `Won the ${year} ${PARTY[p].name} presidential nomination`);
        state[p].field.filter(x => x !== f).forEach(x => hist(x.p, `Ran for President in ${year}; lost the nomination`));
        if (p === mine && endorsed) { if (endorsed === f.name) { S.career.capital += 3; addLegacy(5); } else { S.career.capital = Math.max(0, S.career.capital - 1); } }
      }
      const vpPick = shuffle(S.members.filter(m => m.party === p && Math.abs(ST[m.state].lean) <= 6 && m.name !== nom.name))[0] || S.members.find(m => m.party === p && m.name !== nom.name);
      S.nominees[p] = { p: nom, name: nom.name, state: nom.state, faction: nom.faction, office, charisma: state[p] ? state[p].field.find(f => f.p === nom).charisma : 1.05, vp: vpPick ? { name: vpPick.name, state: vpPick.state, id: vpPick.id } : null };
      if (vpPick) hist(vpPick, `Chosen as ${nom.name}'s running mate`);
    }
    const n = S.nominees;
    const showConvention = () => { showModal(`${frontPage({ headline: `IT'S ${lastName(n.D.p).toUpperCase()} VS. ${lastName(n.R.p).toUpperCase()}`, sub: `The ${year} presidential matchup is set.`, body: [`Democrats nominate ${n.D.name} (${n.D.office}), with ${n.D.vp ? n.D.vp.name : 'a running mate TBD'} on the ticket.`, `Republicans nominate ${n.R.name} (${n.R.office}), with ${n.R.vp ? n.R.vp.name : 'a running mate TBD'}.`, endorsed ? `Your endorsement went to ${endorsed}${endorsed === n[mine].name ? ' — a winning bet (+3 capital).' : '. They lost (−1 capital).'}` : 'You stayed neutral in the primaries.'], mood: 'dawn', date: `Summer ${year} · Convention edition` })}
      <div class="choices"><button class="btn ghost" id="nprof1">Profile: ${n.D.name}</button><button class="btn ghost" id="nprof2">Profile: ${n.R.name}</button><button class="btn primary big" id="primdone">On with the session</button></div>`);
    $('#nprof1').onclick = () => profileModal(n.D.p, 'Democratic nominee', showConvention);
    $('#nprof2').onclick = () => profileModal(n.R.p, 'Republican nominee', showConvention);
    $('#primdone').onclick = done; };
    showConvention();
  };
  if (!R) {
    // your party has a sitting President running again: just watch the other side
    showModal(`<div class="kicker">${year} · Presidential primaries</div><h2>Primary Season</h2><p>${presTitle()} is running for re-election, so your party has no real contest. The ${PARTY[other(mine)].name} field battles it out.</p><div class="choices"><button class="btn primary big" id="primgo">Watch the results</button></div>`);
    $('#primgo').onclick = finishAll;
    return;
  }
  const draw = () => {
    const field = R.field.slice().sort((a, b) => b.del - a.del);
    const endF = endorsed ? R.field.find(f => f.name === endorsed) : null, endOut = endF && !endF.active;
    const poll = R.poll || (R.poll = primaryPoll(R.field));
    const lastIdx = PRIMARY_CAL.findIndex(c => c[0] === lastLabel), lastStates = lastIdx >= 0 ? PRIMARY_CAL[lastIdx][1] : [];
    const resultRows = codes => codes.filter(c => R.results[c]).map(c => `<div class="prow"><b>${stName(c)}</b><span>${R.results[c].slice(0, 3).map((x, i) => `<span style="color:${x.f.color}">${i === 0 ? '✓ ' : ''}${lastName(x.f.p)} ${x.pct.toFixed(0)}%</span>`).join(' · ')}</span></div>`).join('');
    const decided = PRIMARY_CAL.slice(0, lastIdx + 1);
    const mapHTML = usMap({
      fill: code => { const r = R.results[code]; return r ? { c: r[0].f.color, op: 0.5 + Math.min(0.5, (r[0].pct - (r[1] ? r[1].pct : 0)) / 30) } : null; },
      sub: code => R.results[code] ? lastName(R.results[code][0].f.p).slice(0, 6) : '',
      attr: code => R.results[code] ? `data-pst="${code}"` : '',
      title: code => R.results[code] ? `${stName(code)}: ${R.results[code].map(x => `${lastName(x.f.p)} ${x.pct.toFixed(0)}%`).join(', ')}` : stName(code),
    });
    showModal(`<div class="kicker">${year} · ${PARTY[mine].name} presidential primaries</div><h2>${lastLabel ? `After ${lastLabel}` : 'The Field'}</h2>
      <p>${R.need.toLocaleString()} delegates to win. ${endOut ? `<b style="color:var(--no)">${endorsed}, your candidate, has dropped out.</b> You can endorse someone still in the race (1 capital).` : endorsed ? `You endorsed <b>${endorsed}</b>.` : 'Endorse a candidate (1 capital) to give them a boost: back the winner and you\'ll have a friend at the top of the ticket (+3 capital); back a loser and it costs you.'}</p>
      <div class="pollbox"><b>📊 National primary poll</b>${field.filter(f => f.active).sort((a, b) => (poll[b.name] || 0) - (poll[a.name] || 0)).map(f => `<div class="salrow"><span style="color:${f.color};font-weight:700">${f.name}</span><span class="mbar"><i style="width:${Math.min(100, (poll[f.name] || 0) * 2)}%;background:${f.color}"></i></span><b>${(poll[f.name] || 0).toFixed(0)}%</b></div>`).join('')}<small style="color:var(--dim)">Undecided ${poll._undecided}% · polls move with wins and momentum</small></div>
      <div class="cands">${field.map(f => `<div class="cand2 ${f.active ? '' : 'out'}"><span class="cp">${portrait(f.p)}</span><span style="flex:1"><b style="color:${f.color}">${f.name}</b> <small>· ${f.office} · ${f.faction}${f.active ? '' : ` · dropped out after ${f.out}`}</small>
        <div class="dbar"><i style="width:${Math.min(100, f.del / R.need * 100)}%;background:${f.color}"></i></div><small>${f.del.toLocaleString()} delegates · ${f.wins} state${f.wins === 1 ? '' : 's'} won${f.active ? ` · polling ${(poll[f.name] || 0).toFixed(0)}%` : ''}${f.name === endorsed ? ' · <b style="color:var(--gold2)">your endorsement</b>' : ''}</small></span>
        <span style="display:flex;flex-direction:column;gap:4px"><a href="#" data-cprof="${R.field.indexOf(f)}">profile</a>${(!endorsed || endOut) && f.active ? `<button class="btn" data-endorse=""${R.field.indexOf(f)}" ${S.career.capital < 1 ? 'disabled' : ''}>Endorse</button>` : ''}</span></div>`).join('')}</div>
      ${lastStates.length ? `<div class="presults"><b>🗳️ ${lastLabel} results</b>${resultRows(lastStates)}</div>` : '<p style="color:var(--dim)">No votes cast yet. Iowa is first.</p>'}
      <div class="campmap">${mapHTML}</div>
      ${decided.length > 1 ? `<details class="cdet"><summary>All results so far (${decided.reduce((a, c) => a + c[1].length, 0)} states)</summary>${decided.map(([lbl, codes]) => `<div class="plbl">${lbl}</div>${resultRows(codes)}`).join('')}</details>` : ''}
      <div class="choices">${R.done() ? '<button class="btn primary big" id="pfin">See the nominees</button>' : `<button class="btn primary big" id="pnext">Next: ${PRIMARY_CAL[PRIMARY_CAL.findIndex(c => c[0] === lastLabel) + 1 || 0][0]} ▶</button><button class="btn ghost" id="pskip">Skip to the end</button>`}</div>`);
    const card = $('#modal-card');
    card.querySelectorAll('[data-endorse]').forEach(b => b.onclick = () => { if (S.career.capital < 1) return; S.career.capital--; endorsed = R.field[+b.dataset.endorse].name; R.poll = null; R.field[+b.dataset.endorse].charisma *= 1.12; const f = R.field[+b.dataset.endorse]; hist(f.p, `Endorsed for President by the ${PARTY[mine].name} whip`); sfx.up(); draw(); });
    card.querySelectorAll('[data-cprof]').forEach(a => a.onclick = e => { e.preventDefault(); const f = R.field[+a.dataset.cprof]; profileModal(f.p, f.office, draw); });
    if ($('#pnext')) $('#pnext').onclick = () => { lastLabel = R.nextContest(); R.poll = null; sfx.click(); draw(); };
    if ($('#pskip')) $('#pskip').onclick = () => { while (!R.done()) lastLabel = R.nextContest(); R.poll = null; draw(); };
    if ($('#pfin')) $('#pfin').onclick = finishAll;
  };
  draw();
}
function presPrimariesDue() { const n = S.career.bills + 1; return n % 6 === 4 && billYear(n) % 4 === 0 && !S.nominees; }

/* ---------------- governor elections ---------------- */
function runGovernors(year) {
  const races = [];
  for (const code of Object.keys(S.governors)) {
    if (!govUp(code, year)) continue;
    const g = S.governors[code], open = (g.terms || 1) >= 2 && !GOV_EVERY_TWO.includes(code);
    const A = g.party, adv = (A === 'R' ? ST[code].lean : -ST[code].lean) * 0.35;
    const pm = (A === S.side ? 1 : -1) * (S.mood * 0.5 + ((S.election && S.election.wave) || 0) * 0.8) - (S.president.party === A && year % 4 ? 2 : 0);
    const gc = (S.election && S.election.govCash) || 0;
    const mg = adv + pm + (open ? 0 : 5) + (A === S.side ? 1 : -1) * cashEff(gc, 1.2) + gauss() * 8;
    const np = mg >= 0 ? A : other(A);
    const wPct = clamp(49.25 + Math.abs(mg) / 2, 49.5, 75), lPct = 98.5 - wPct, tv = turnout(code);
    let winner;
    if (np === A && !open) { winner = g; g.terms = (g.terms || 1) + 1; hist(g, `Re-elected Governor, ${wPct.toFixed(0)}–${lPct.toFixed(0)}`, year); }
    else {
      if (!open) { hist(g, `Lost re-election as Governor`, year); } else hist(g, 'Left office (term-limited)', year);
      S.formers.push(g);
      winner = newPerson(np, code, { age: ri(42, 66) }); winner.faction = pick(FACTIONS[np])[0]; winner.terms = 1; governorBackstory(winner, year);
      winner.history[winner.history.length - 1].t = `Elected Governor, ${wPct.toFixed(0)}–${lPct.toFixed(0)}`;
      S.governors[code] = winner;
    }
    const loser = np === A || open ? fullName() : g.name;
    races.push({ code, wName: winner.name, wParty: np, lName: loser, lParty: other(np), wPct, lPct, wVotes: tv * wPct / 100, lVotes: tv * lPct / 100, margin: wPct - lPct, flip: np !== A, open, incumbent: open ? null : g.name, call: callTime(code, wPct - lPct),
      cands: [{ name: winner.name, party: np, pct: wPct, votes: tv * wPct / 100, inc: winner === g }, { name: loser, party: other(np), pct: lPct, votes: tv * lPct / 100, inc: np !== A && !open }] });
  }
  return races;
}

/* ---------------- the White House, as seen from the whip's office ---------------- */
function execHTML() {
  const P = S.president, yours = P.party === S.side, used = S.execUsed === S.career.bills;
  const lastTheirs = (S.eos || []).slice().reverse().find(e => e.party !== S.side && !e.sued);
  return `<hr><b>🏛️ The White House</b> <small style="color:var(--dim)">· ${presTitle()} (${P.party}, ${P.faction}) at ${P.approval}%${S.war ? ` · ⚔ at war in ${S.war.place} (${S.war.support}% support)` : ''}</small>
    ${yours ? `<p style="margin:6px 0 4px;color:var(--dim);font-size:12px">Ask the President for an executive order (2 capital, once between bills). It moves the mood on its issue, but the courts may challenge it, and it doesn't keep a campaign promise: only laws do.</p>
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
    ${S.war ? `<div class="primnews"><b>⚔ War in ${S.war.place}</b><p>Month ${S.war.months} · public support ${S.war.support}%. ${S.war.support < 45 ? 'The public is turning against it.' : 'The country is behind it, for now.'}</p></div>` : ''}
    <hr><b>The Cabinet</b><div class="races" style="max-height:none">${rows}</div>
    ${eos.length ? `<hr><b>Recent executive orders</b>${eos.map(e => `<p style="margin:4px 0">🖋️ ${e.name} <small style="color:var(--dim)">(${e.party}, ${e.year}${e.sued ? ', challenged in court' : ''})</small></p>`).join('')}` : ''}
    <div class="choices"><button class="btn primary" id="adback">Back</button></div>`);
  const me = () => openAdmin(back);
  $('#modal-card').querySelectorAll('[data-cab]').forEach(a => a.onclick = e => { e.preventDefault(); profileModal(S.cabinet[a.dataset.cab], CABINET_POSTS.find(c => c[0] === a.dataset.cab)[1], me); });
  $('#profP').onclick = e => { e.preventDefault(); profileModal(P, 'President of the United States', me); };
  if ($('#profV')) $('#profV').onclick = e => { e.preventDefault(); profileModal(S.vp, 'Vice President', me); };
  $('#adback').onclick = back;
}

/* ---------------- the presidential battleground on the campaign trail ---------------- */
function presBattleHTML() {
  const E = S.election; E.presStates = E.presStates || {};
  const pr = presProjection(), mine = S.side, sign = mine === 'D' ? 1 : -1;
  const my = pr.noms[mine], their = pr.noms[other(mine)];
  const battle = Object.keys(EV).map(c => ({ c, m: pr.margins[c] * sign })).filter(x => Math.abs(x.m) < 9).sort((a, b) => EV[b.c] - EV[a.c]);
  const mapHTML = usMap({
    fill: code => { if (!EV[code]) return null; const m = pr.margins[code] * sign; return { c: m >= 0 ? PARTY[mine].color : PARTY[other(mine)].color, op: 0.3 + Math.min(0.7, Math.abs(m) / 15) }; },
    sub: code => EV[code] ? `${EV[code]}` : '',

    title: code => `${stName(code)}: ${pr.margins[code] * sign >= 0 ? 'your ticket' : 'theirs'} +${Math.abs(pr.margins[code]).toFixed(1)} · ${EV[code]} EV`,
  });
  return `<div class="presbox"><b>🇺🇸 The race for the White House</b>
    <div class="ticket">${[my, their].map((n, i) => `<div class="tk" style="border-color:${PARTY[i ? other(mine) : mine].color}">${n.p ? portrait(n.p) : ''}<span><b>${n.name}</b><br><small>${n.office || (n.p === S.president ? 'President' : 'Nominee')} · ${n.faction || ''}${n.state ? ' · ' + n.state : ''}${n.vp ? `<br>Running mate: ${n.vp.name} (${n.vp.state})` : ''}</small></span></div>`).join('<span class="vs">vs</span>')}</div>
    <p>Projected Electoral College for your ticket: <b style="color:${pr.evMine >= 270 ? 'var(--yes)' : 'var(--no)'}">${pr.evMine}</b> of 270. Home states and running mates swing their states. The campaign decides where to spend; you set the budget.</p>
    <div class="campmap">${mapHTML}</div>
    <div class="battle"><b>Battlegrounds</b> ${battle.map(x => `<span class="bchip" style="border-color:${x.m >= 0 ? 'var(--yes)' : 'var(--no)'}">${x.c} ${EV[x.c]} · <b style="color:${x.m >= 0 ? 'var(--yes)' : 'var(--no)'}">${x.m >= 0 ? '+' : '−'}${Math.abs(x.m).toFixed(1)}</b></span>`).join('') || '<small style="color:var(--dim)">None: this race isn\'t close.</small>'}</div>
    <div class="races" style="max-height:none">
      <div class="race"><span>🇺🇸 <b>Presidential campaign</b><br><small style="color:var(--dim)">Transfer money to your ticket. The first unit ≈ +1.2 points nationwide; more units, a bit less each.</small></span><span class="cashctl"><button class="btn" data-pc="-1" ${E.presCash ? '' : 'disabled'}>−</button><span class="dots">${money(E.presCash)}</span><button class="btn" data-pc="1" ${E.cash < 1 ? 'disabled' : ''}>+</button></span></div>
      <div class="race"><span>🎤 <b>The debates</b><br><small style="color:var(--dim)">${E.debate == null ? 'Prep your nominee (1 capital) or let them wing it.' : E.debate >= 1 ? `Your nominee won the debates (+${E.debate.toFixed(1)}).` : E.debate > -0.5 ? 'The debates were a draw.' : `Your nominee stumbled (${E.debate.toFixed(1)}).`}</small></span>${E.debate == null ? `<span class="cashctl"><button class="btn" data-debate="prep" ${S.career.capital < 1 ? 'disabled' : ''}>Debate prep<small>1 cap</small></button><button class="btn ghost" data-debate="wing">Wing it</button></span>` : ''}</div></div></div>`;
}
function bindPresBattle(draw) {
  const card = $('#modal-card'), E = S.election; if (!E.pres) return;
  E.presStates = E.presStates || {};
  const add = (code, d) => { if (d > 0 && E.cash < 1) return; if (d < 0 && !(E.presStates[code] > 0)) return; E.presStates[code] = (E.presStates[code] || 0) + d; E.cash -= d; sfx.click(); draw(); };

  card.querySelectorAll('[data-debate]').forEach(b => b.onclick = () => {
    if (b.dataset.debate === 'prep') { if (S.career.capital < 1) return; S.career.capital--; E.debate = clamp(gauss() * 1.4 + 1.4, -2, 4); }
    else E.debate = clamp(gauss() * 1.8, -3, 3);
    sfx.gavel(); draw();
  });
}
