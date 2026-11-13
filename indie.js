'use strict';
/* =====================================================================
   INDIE — independents and third parties. Labels (Green, Libertarian,
   Constitution, Democratic Socialist, Working Families, Forward, Common
   Ground, Heartland) for independent senators and Senate three-way
   candidates; the independent presidential primary, a ballot-access
   contest in thirteen states plus a national convention vote, run next
   to the major primaries (primaries.js shows it as a third tab); and
   the rare major independent who launches a real campaign after the
   primaries. Writes S.nominees.I = { name, label, p, strength, major,
   home, lean, color, ... } for campaign.js and night.js.
   Defines indLabelHTML(m) (renderMember) and indSenateEntrants(rc).
   ===================================================================== */

// lean: −1 left … +1 right (which major party the label draws from); base: the national % a typical nominee polls
const IND_LABELS = {
  'Green': { lean: -0.8, color: '#4ade80', group: 'Greens', base: 2.4, issues: { environment: 2, urban: 1, welfare: 1, security: -1, economy: -0.5 }, line: 'climate first and corporate money out of politics' },
  'Democratic Socialist': { lean: -1, color: '#f472b6', group: 'Socialists', base: 1.8, issues: { welfare: 2, urban: 1, taxes: -1.5, economy: -0.5, security: -1.5 }, line: 'Medicare for all and a union card in every pocket' },
  'Working Families': { lean: -0.6, color: '#fb923c', group: 'Working Families Party', base: 1.5, issues: { welfare: 1.5, economy: 1, urban: 1, rural: 0.5 }, line: 'wages, rent and the price of insulin' },
  'Forward': { lean: 0, color: '#2dd4bf', group: 'Forward Party', base: 2, issues: { tech: 2, economy: 1, urban: 0.5 }, line: 'open primaries, ranked ballots and a government that works' },
  'Common Ground': { lean: 0.1, color: '#c4b5fd', group: 'Common Ground Party', base: 2.6, issues: { economy: 1, taxes: 0.5, security: 0.5, welfare: 0.5 }, line: 'the sensible middle both parties abandoned' },
  'Libertarian': { lean: 0.5, color: '#facc15', group: 'Libertarians', base: 2.8, issues: { taxes: 2, economy: 1.5, tech: 1, security: -1.5, welfare: -1 }, line: 'cut the government in half and leave people alone' },
  'Heartland': { lean: 0.7, color: '#d6a35c', group: 'Heartland Party', base: 1.6, issues: { rural: 2, economy: 1, security: 1, urban: -1, tech: -0.5 }, line: 'factories home, farms first and Washington out' },
  'Constitution': { lean: 0.9, color: '#cbd5e1', group: 'Constitutionalists', base: 1.3, issues: { security: 1.5, rural: 1.5, taxes: 2, tech: -1, welfare: -1.5 }, line: 'the Constitution as written, and not a word more' },
};
// the Independent Ballot Alliance's calendar: party primaries, caucuses and petition conventions on the major-party dates
const IND_CAL = [['New Hampshire', ['NH']], ['Super Tuesday', ['CA', 'TX', 'CO', 'ME']], ['Mid-March', ['MI']], ['St. Patrick\'s Day', ['AZ', 'OH']], ['April', ['NY', 'AK']], ['May', ['OR', 'WV']], ['June', ['MT']]];
const IND_CITIES = [['Denver', 'the Bluebird Theater'], ['St. Louis', 'a union hall on Locust Street'], ['Albuquerque', 'the state fairgrounds'], ['Reno', 'a casino ballroom'], ['Des Moines', 'the Hy-Vee Hall'], ['Pittsburgh', 'a converted steel mill'], ['Louisville', 'a bourbon distillery\'s event barn'], ['Spokane', 'the convention center annex']];
const IND_NO_FIELD = [
  'every third party fell short of the signatures to make the ballot in enough states to win',
  'courts threw out the Alliance\'s petitions in Texas, Ohio and Pennsylvania, and the coalition collapsed',
  'the Libertarian and Green nominees-in-waiting both withdrew, one over a tax lien and one over a feud, and nobody replaced them',
  'the Ballot Alliance broke apart in a fight over its rules before a single vote was cast',
  'with both major parties fighting over the middle, no third party could raise the money to qualify anywhere that matters',
];
const IND_CELEBS = ['Talk-radio host', 'Podcast host', 'Country singer', 'Former NBA All-Star', 'Hollywood actor', 'Bestselling author', 'Former astronaut', 'Celebrity chef'];
const IND_BIZ = ['Founder of a solar company', 'Supermarket-chain heir', 'Trucking magnate', 'Software billionaire', 'Hedge-fund manager', 'Founder of a crypto exchange'];
const indSh = v => (+v).toFixed(1).replace(/\.0$/, '');

/* ---------------- labels ---------------- */
function indLabelInfo(label) { return IND_LABELS[label] || { lean: 0, color: PARTY.I.color, group: 'Independents', base: 2, issues: {}, line: 'fixing what both parties broke' }; }
function indPill(label, big) { if (!label) return ''; const L = indLabelInfo(label); return `<span class="ind-pill${big ? ' big' : ''}" style="--ic:${L.color}">${label}</span>`; }
// the best label for a set of issue weights (and a cause), in a given state; a little luck so not every Vermonter is a Socialist
function indPickLabel(w, code, causeTag, tilt = 0) {
  const lean = code && ST[code] ? stLean(code) : 0;
  const avg = w ? TAGS.reduce((a, t) => a + (w[t] || 0), 0) / TAGS.length : 0;   // what they care about more than usual, not how much they care
  let best = 'Common Ground', bs = -1e9;
  for (const [k, L] of Object.entries(IND_LABELS)) {
    let s = rnd(0, 1.6) + L.lean * clamp(lean, -25, 25) / 20 + tilt * L.lean + (1 - Math.abs(L.lean)) * (Math.abs(lean) < 8 ? 0.9 : 0.3);
    const norm = Math.hypot(...Object.values(L.issues)) || 1;   // every platform gets the same pull, however long its list
    if (w) for (const t of TAGS) s += ((w[t] || 0) - avg) * (L.issues[t] || 0) / norm;
    if (causeTag) s += (L.issues[causeTag] || 0) * 0.7;
    if (s > bs) { bs = s; best = k; }
  }
  return best;
}
function indLabel(m) {
  if (!m || m.party !== 'I') return null;
  if (m.label && IND_LABELS[m.label]) return m.label;
  const rc = S.election && (S.election.races || []).find(r => r.ind && r.ind.name === m.name && IND_LABELS[r.ind.label]);
  m.label = rc ? rc.ind.label : indPickLabel(m.w, m.state, m.cause && m.cause[1]);
  return m.label;
}
// renderMember's hook: a small pill after "Independent"
function indLabelHTML(m) { const l = indLabel(m); return l ? ' ' + indPill(l) : ''; }
// a third candidate for a Senate race (races.js calls this when it exists): the old odds, now with a label
function indSenateEntrants(rc) {
  const m = rc.m, code = m.state;
  if (m.party === 'I') return { name: m.name, incumbent: true, str: rnd(30, 42), label: indLabel(m) };
  const chance = (Math.abs(ST[code].lean) <= 12 ? 0.14 : 0.06) + (rc.primaried ? 0.15 : 0);
  if (Math.random() >= chance) return null;
  // after a flank nominee wins, the opening is on the other side of them
  const cause = pick(IND_CAUSES), tilt = rc.primaried ? (m.party === 'D' ? 0.8 : -0.8) : 0;
  return { name: fullName(), label: indPickLabel(null, code, cause[1], tilt), cause, str: rnd(10, 26) + (rc.primaried ? 6 : 0) };
}
// a newly elected independent senator keeps the label they ran under
HOOKS.results.push({ html: nd => { (nd.races || []).filter(r => r.wParty === 'I').forEach(r => { const m = S.members.find(x => x.name === r.wName && x.party === 'I'); if (m && !m.label) indLabel(m); }); return ''; }, bind: () => {} });

/* ---------------- the independent primary: the field ---------------- */
function indPerson(label, kind) {
  const L = indLabelInfo(label), lean = L.lean;
  // home states fit the label: the left from blue states, the right from red ones, the center from anywhere
  const pool = STATES.filter(([c, , ln]) => lean < -0.3 ? ln < 4 : lean > 0.3 ? ln > -4 : true), st = pick(pool.length ? pool : STATES)[0];
  const p = newPerson('I', st, { age: ri(38, 74) }); p.faction = L.group; p.label = label;
  const y = currentYear(), town = pick(HOMETOWNS[st] || [ST[st].name]);
  let office;
  if (kind === 'celeb') { office = pick(IND_CELEBS); hist(p, `Became a household name as a ${office.toLowerCase().replace(/^former /, '')}`, y - ri(6, 15)); }
  else if (kind === 'biz') { office = pick(IND_BIZ); hist(p, `Built a fortune as ${p.background}-turned-executive`, y - ri(8, 20)); }
  else if (kind === 'general') { office = pick(['Retired Army general', 'Retired Marine general', 'Retired admiral']); p.background = 'a career officer'; hist(p, 'Commanded U.S. forces overseas', y - ri(4, 10)); hist(p, 'Retired from the military and began speaking out on politics', y - ri(1, 3)); }
  else if (kind === 'gov') { const ex = lean < 0 ? 'D' : lean > 0.3 ? 'R' : pick(['D', 'R']); office = `Former Governor of ${ST[st].name}`; hist(p, `Elected Governor of ${ST[st].name} as a ${PARTY[ex].name}`, y - ri(10, 16)); hist(p, `Left the ${PARTY[ex].name} Party, calling it "a racket with a logo"`, y - ri(1, 4)); p.exParty = ex; }
  else { office = pick([`Chair of the ${L.group}`, `${label} Party co-founder`, `Mayor of ${town}`, `State legislator from ${ST[st].name}`, `${label} organizer from ${town}`]); hist(p, `Joined the ${L.group} as ${p.background}`, y - ri(8, 20)); }
  hist(p, `Sought the ${label} line on the ${y} presidential ballot`, y);
  return { p, office, kind };
}
function indEntry(p, office, label, kind, ref) {
  const L = indLabelInfo(label), celeb = kind === 'celeb' || kind === 'biz';
  const charisma = rnd(0.75, 1.2) + (celeb ? 0.15 : 0) + (kind === 'sen' || kind === 'gov' ? 0.1 : 0), money = rnd(0.7, 1.05) + (kind === 'biz' ? 0.35 : 0);
  return { name: p.name, p, office, ref, party: 'I', label, faction: L.group, kind, state: p.state, charisma, money, cash: Math.round(money * rnd(3, 7)), del: 0, wins: 0, votes: 0, mo: 0, active: true, color: L.color, msg: Object.entries(L.issues).sort((a, b) => b[1] - a[1])[0][0] };
}
// who runs: nobody (about a third of cycles), one party's contest, or a field from several labels, left and right
function indField() {
  const r = Math.random();
  if (r < 0.35) return { kind: 'none', field: [] };
  const labels = shuffle(Object.keys(IND_LABELS)), one = r < 0.6, picks = one ? Array(ri(2, 3)).fill(labels[0]) : labels.slice(0, pick([2, 2, 3, 3, 3, 4, 4, 5]));
  const field = [], used = new Set();
  // the rare sitting independent senator, and the former senator who quit a party, take the first slots
  const sens = shuffle(S.members.filter(m => m.party === 'I'));
  const formers = shuffle((S.formers || []).filter(f => f && (f.party === 'D' || f.party === 'R') && f.name !== S.president.name && !(S.vp && f.name === S.vp.name) && !nameTaken(f.name) && !(f.history || []).some(h => /Died/.test(h.t))));
  picks.forEach((label, i) => {
    const L = indLabelInfo(label);
    const sen = sens.find(m => !used.has(m.name) && indLabel(m) === label);
    if (sen && Math.random() < 0.25) { used.add(sen.name); hist(sen, `Ran for the ${currentYear()} ${label} presidential line`); field.push(indEntry(sen, `Senator from ${ST[sen.state].name}`, label, 'sen', { type: 'sen', id: sen.id })); return; }
    const fm = formers.find(f => !used.has(f.name) && (f.party === 'D' ? L.lean <= 0.1 : L.lean >= 0));
    if (fm && Math.random() < 0.15) { used.add(fm.name); fm.exParty = fm.party; hist(fm, `Left the ${PARTY[fm.party].name} Party to seek the ${label} presidential line`); fm.party = 'I'; fm.label = label; field.push(indEntry(fm, `Former Senator from ${ST[fm.state] ? ST[fm.state].name : fm.state} (ex-${fm.exParty})`, label, 'gov', { type: 'former' })); return; }
    const kind = pick(L.lean > 0.3 ? ['act', 'act', 'celeb', 'biz', 'general', 'gov'] : L.lean < -0.3 ? ['act', 'act', 'act', 'celeb', 'gov'] : ['act', 'celeb', 'biz', 'biz', 'general', 'gov']);
    const x = indPerson(label, kind); used.add(x.p.name);
    field.push(indEntry(x.p, x.office, label, kind, { type: 'outsider' }));
  });
  field.forEach((f, i) => { if (one) f.color = CAND_COLORS[(i * 3) % CAND_COLORS.length]; });
  return { kind: one ? 'one' : 'field', field };
}
// a candidate's fit with one state: the label's issues against what its voters care about, and the state's lean
function indFit(f, code) {
  if (!ST[code]) return 0;
  const L = indLabelInfo(f.label); let fit = L.lean * stLean(code) / 60;
  for (const t of TAGS) fit += (L.issues[t] || 0) * ST[code].voter[t] * 0.05;
  return fit;
}
function indTurnout(code) { return POP[code] * 1e6 * rnd(0.0025, 0.007) * (PRIM_CAUCUS.includes(code) ? 0.5 : 1); }
// the race object mirrors primaries.js runPrimaryFor, so the board, the map and the state tables work unchanged
function indPrimaryFor() {
  const { kind, field } = indField();
  if (kind === 'none') return { party: 'I', none: true, why: pick(IND_NO_FIELD), field: [], results: {}, rounds: [] };
  const pledged = IND_CAL.reduce((a, [, cs]) => a + cs.reduce((b, c) => b + (EV[c] || 3) * 10, 0), 0), atLarge = Math.round(pledged * 0.4), totalDel = pledged + atLarge, need = Math.floor(totalDel / 2) + 1;
  const R = { party: 'I', kind, field, results: {}, need, pledged, atLarge, totalDel, rounds: [], plans: {}, i: 0, endorsed: null, incumbentRace: false, poll: null };
  R.poll = primaryPoll(R);
  R.nextContest = () => { if (R.i >= IND_CAL.length) return false; const [label, states] = IND_CAL[R.i++]; primRunRound(R, label, states); return label; };
  R.done = () => R.i >= IND_CAL.length;
  R.contested = () => !field.some(f => f.del >= need);
  return R;
}
// run every Alliance contest up to (and including) a major-party calendar date; null runs them all
function indCatchUp(R, label) {
  if (!R || R.none) return;
  const upTo = label == null ? 1e9 : PRIMARY_CAL.findIndex(c => c[0] === label);
  while (!R.done() && PRIMARY_CAL.findIndex(c => c[0] === IND_CAL[R.i][0]) <= upTo) R.nextContest();
}
function indIntroHTML(R) {
  const labels = [...new Set(R.field.map(f => f.label))];
  return `<div class="ind-pills">${labels.map(l => indPill(l, true)).join('')}</div><p><b>The Independent Ballot Alliance</b> pools ${labels.length > 1 ? `${labels.length} third parties' petition drives` : `the ${indLabelInfo(labels[0]).group.replace(/s$/, 's\'').replace(/([^'])$/, '$1\'s')} ballot lines`} into one line on all fifty ballots, and only one candidate gets it${labels.length > 1 ? `: ${labels.map(l => `${l} (${indLabelInfo(l).line})`).join('; ')}` : `, running on ${indLabelInfo(labels[0]).line}`}. Thirteen states vote in party primaries, caucuses and petition conventions (${primN(R.pledged)} pledged delegates); ${primN(R.atLarge)} at-large delegates ${labels.length > 1 ? 'are seated in equal blocks by the member parties' : 'follow the national poll'} at the convention, and ${primN(R.need)} nominate. <i>You can watch this race, but no whip runs it.</i></p>`;
}
function indNoFieldHTML(R, year) {
  return `<div class="race ind-none"><span style="font-size:30px">🗳️</span><span><b>No third-party candidate qualifies for the ${year} ballot.</b><br>The Independent Ballot Alliance will not field a presidential candidate: ${R.why}. Expect a straight two-way race in the fall${S.members.some(m => m.party === 'I') ? ', whatever the Senate\'s independents think of it' : ''}.</span></div>`;
}

/* ---------------- the convention, the nominee and the rare major independent ---------------- */
// the convention's roll calls, ballot by ballot
function indConvHTML(conv, R) {
  const names = conv.ballots[0].rows.map(r => r.name), col = nm => (R.field.find(f => f.name === nm) || {}).color || PARTY.I.color;
  return `<div class="ind-conv"><table><thead><tr><th>Candidate</th>${conv.ballots.map(b => `<th>Ballot ${b.n}</th>`).join('')}</tr></thead><tbody>
    ${names.map(nm => { const f = R.field.find(x => x.name === nm); return `<tr><td><span class="dot" style="display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;background:${col(nm)}"></span>${nm} ${f ? indPill(f.label) : ''}</td>${conv.ballots.map(b => { const r = b.rows.find(x => x.name === nm); return r ? `<td class="${b === conv.ballots[conv.ballots.length - 1] && r === b.rows[0] ? 'win' : ''}">${primN(r.del)}</td>` : '<td class="out">out</td>'; }).join('')}</tr>`; }).join('')}
  </tbody></table><div class="nsub">${primN(R.need)} of ${primN(R.totalDel)} to nominate (${primN(R.pledged)} pledged in thirteen states, ${primN(R.atLarge)} at-large${new Set(R.field.map(f => f.label)).size > 1 ? ' in equal blocks from each member party' : ' by the national poll'}).${conv.ballots.filter(b => b.dropped).map(b => ` After ballot ${b.n}, ${b.released ? `${b.dropped}'s delegates were released` : `${b.dropped} was eliminated`} and most of them went to ${b.to}.`).join('')}</div></div>`;
}
function indConvModal(conv, R, year, back) {
  const f = conv.f;
  showModal(`<div class="kicker">${year} · Independent Ballot Alliance convention</div><h2>${conv.city}: ${f.name} takes the line</h2>
    <div class="prim-hqcand" style="border-color:${f.color}"><span class="cp">${portrait(f.p)}</span><span style="flex:1"><b style="color:${f.color}">${f.name}</b> ${indPill(f.label, true)}<br><small>${f.office} · ${primN(f.votes)} primary votes · ${f.wins} state${f.wins === 1 ? '' : 's'} won · polls ${indSh(conv.strength)}% nationally</small></span></div>
    <p>Delegates packed ${conv.hall} for ${conv.ballots.length > 1 ? `${conv.ballots.length} roll calls` : 'a single roll call'}. ${conv.clinched ? `${f.name} arrived with a majority already won in the primaries.` : conv.ballots.length > 1 ? 'Nobody arrived with a majority, so the Alliance\'s rules dropped the last-place candidate after each ballot.' : 'The at-large delegates broke for the poll leader and settled it on the first ballot.'}</p>
    ${indConvHTML(conv, R)}<div class="choices"><button class="btn primary big adv" id="indback">Back to the front page</button></div>`);
  $('#indback').onclick = back;
}
function indStrength(f) {
  const L = indLabelInfo(f.label), discontent = clamp((48 - S.president.approval) / 12, 0, 1.2);
  return +clamp(L.base * (0.6 + 0.4 * f.charisma) * (f.kind === 'celeb' || f.kind === 'biz' ? 1.3 : 1) + discontent + rnd(-0.6, 0.8), 1, 6.5).toFixed(1);
}
// the national convention: pledged delegates as won; at-large delegates seated in equal blocks by each member party, who
// back their own party's candidate (or, in a one-party race, follow the national poll); ballots until someone has a majority
function indConvention(R) {
  indCatchUp(R, null);
  const act = R.field.filter(f => f.active), poll = primaryPoll(R), [city, hall] = pick(IND_CITIES), tally = {};
  const near = (lean, pool) => pool.slice().sort((a, b) => Math.abs(indLabelInfo(a.label).lean - lean) - Math.abs(indLabelInfo(b.label).lean - lean))[0];
  // pledged delegates stay bound to the candidate who won them on the first ballot, even one who has dropped out
  for (const r of Object.values(R.results)) for (const x of r.rows) if (x.del) tally[x.name] = (tally[x.name] || 0) + x.del;
  act.forEach(f => tally[f.name] = tally[f.name] || 0);
  const labels = [...new Set(R.field.map(f => f.label))];
  if (labels.length > 1) {
    const block = Math.floor(R.atLarge / labels.length);
    for (const l of labels) { const own = act.filter(f => f.label === l).sort((a, b) => b.del - a.del)[0] || near(indLabelInfo(l).lean, act); tally[own.name] += block; }
    tally[act.slice().sort((a, b) => b.del - a.del)[0].name] += R.atLarge - block * labels.length;
  } else { const pt = act.reduce((a, f) => a + (poll[f.name] || 0), 0) || 1; act.forEach(f => tally[f.name] += Math.round(R.atLarge * (poll[f.name] || 0) / pt)); }
  const ballots = [];
  const fOf = nm => R.field.find(f => f.name === nm);
  for (let n = 1; n <= 10; n++) {
    const order = Object.entries(tally).sort((a, b) => b[1] - a[1]), b = { n, rows: order.map(([name, d]) => ({ name, del: d })) };
    ballots.push(b);
    if ((order[0][1] >= R.need && fOf(order[0][0]).active) || order.length < 2) break;
    // candidates who quit the race release their delegates first; then the last-place candidate is out. Most of those
    // delegates go to the nearest label (or whoever the quitter endorsed), the rest to the leader
    const gone = order.filter(([nm]) => !fOf(nm).active), [outName, outDel] = gone.length ? gone[gone.length - 1] : order[order.length - 1], out = fOf(outName);
    const rest = order.filter(([nm]) => nm !== outName).map(([nm]) => fOf(nm)), live = rest.filter(f => f.active);
    const nr = (out.backed && live.find(f => f.name === out.backed)) || near(indLabelInfo(out.label).lean, live), lead = live.slice().sort((a, c) => tally[c.name] - tally[a.name])[0], toNear = Math.round(outDel * rnd(0.55, 0.8));
    tally[nr.name] += toNear; tally[lead.name] += outDel - toNear; delete tally[outName];
    Object.assign(b, { dropped: outName, to: nr.name, released: !out.active });
  }
  const win = Object.entries(tally).filter(([nm]) => fOf(nm).active).sort((a, b) => b[1] - a[1])[0][0], f = fOf(win);
  const second = R.field.filter(x => x !== f).sort((a, b) => b.del - a.del)[0];
  return { f, city, hall, ballots, second, clinched: !R.contested() };
}
function indNominee(f, conv) {
  const L = indLabelInfo(f.label);
  return { p: f.p, name: f.name, label: f.label, office: f.office, home: f.state, state: f.state, lean: +clamp(L.lean + rnd(-0.15, 0.15), -1, 1).toFixed(2), color: L.color, strength: indStrength(f), major: false, charisma: +f.charisma.toFixed(2), kind: f.kind,
    city: conv ? conv.city : null, ballots: conv ? conv.ballots.length : 1, del: conv ? conv.ballots[conv.ballots.length - 1].rows[0].del : 0, runnerUp: conv && conv.second ? { name: conv.second.name, label: conv.second.label } : null };
}
// about one presidential cycle in fifteen, a heavyweight runs outside both parties
function indMajorOdds(bolter) { return 0.055 + (bolter ? 0.035 : 0) + (S.president.approval < 40 ? 0.02 : 0); }
// a primary loser who can bolt: a close second in a race that was settled, from outside the Senate, the statehouses and the cabinet
function indBolter(state, n) {
  for (const p of shuffle(['D', 'R'])) {
    const R = state[p], N = n[p]; if (!R || !N || N.contested || !N.runnerUp) continue;
    const f = R.field.find(x => x.name === N.runnerUp.name);
    if (f && f.ref && ['outsider', 'former', 'rep'].includes(f.ref.type) && (f.del >= N.del * 0.4 || f.wins >= 5)) return { p, f };
  }
  return null;
}
function indMajor(state, n, minor) {
  const bolt = indBolter(state, n);
  if (Math.random() >= indMajorOdds(bolt)) return null;
  const y = currentYear(), kind = bolt && Math.random() < 0.55 ? 'bolter' : pick(['governor', 'billionaire', 'general', 'anchor']);
  let p, office, lean, why;
  if (kind === 'bolter') {
    const { p: party, f } = bolt, N = n[party];
    p = f.p; office = f.office; lean = (party === 'D' ? -1 : 1) * rnd(0.2, 0.5);
    why = `${p.name} never conceded. After finishing second to ${N.name} with ${primN(f.del)} delegates and ${f.wins} state${f.wins === 1 ? '' : 's'}, the ${PARTY[party].name} runner-up told a rally that the nomination was "bought, not won" and quit the party.`;
    hist(p, `Lost the ${y} ${PARTY[party].name} nomination to ${N.name}, then quit the party to run as an independent`, y);
    p.exParty = party; p.party = 'I';
    if (S.reps && S.reps.some(r => r.name === p.name)) { S.reps = S.reps.filter(r => r.name !== p.name); hist(p, 'Gave up a House seat to run for President', y); }
    const nx = (N.others || [])[0]; N.runnerUp = nx ? { ...nx } : null; N.others = (N.others || []).slice(1); N.bolted = p.name;
  } else {
    const ex = kind === 'governor' ? pick(['D', 'R']) : null;
    const pool = STATES.filter(([c, , ln]) => Math.abs(ln) < 12 && c !== n.D.state && c !== n.R.state), st = pick(pool.length ? pool : STATES)[0];
    p = newPerson('I', st, { age: ri(48, 70) });
    if (kind === 'governor') { office = `Former Governor of ${ST[st].name}`; lean = (ex === 'D' ? -1 : 1) * rnd(0.05, 0.35); hist(p, `Elected Governor of ${ST[st].name} as a ${PARTY[ex].name}`, y - ri(10, 14)); hist(p, `Left office with a ${ri(61, 72)}% approval rating`, y - ri(2, 5)); why = `Two-term ${PARTY[ex].name} governor of ${ST[st].name}, ${p.name} left office the most popular governor in America and has spent a year telling both parties' donors they backed the wrong horses. Now ${p.gender === 'f' ? 'she' : 'he'} has quit the ${PARTY[ex].name} Party.`; p.exParty = ex; }
    else if (kind === 'billionaire') { office = pick(['Billionaire founder of a logistics empire', 'Billionaire software founder', 'Billionaire investor']); lean = rnd(-0.3, 0.35); hist(p, `Built a ${ri(18, 90)}-billion-dollar fortune`, y - ri(5, 15)); why = `${p.name}, worth an estimated $${ri(18, 90)} billion, promises to spend "whatever it takes" from ${p.gender === 'f' ? 'her' : 'his'} own pocket and has already booked $${ri(300, 700)} million in airtime. Ballot access in all fifty states is being bought, petition by petition, by paid canvassers.`; }
    else if (kind === 'general') { office = pick(['Retired four-star general', 'Former Chairman of the Joint Chiefs']); lean = rnd(0.05, 0.4); p.background = 'a career Army officer'; hist(p, 'Commanded U.S. forces in two wars', y - ri(6, 12)); hist(p, 'Retired from the Army to rave reviews and a bestselling memoir', y - ri(2, 4)); why = `${p.name}, the most trusted name in uniform, spent forty years refusing to say which party ${p.gender === 'f' ? 'she' : 'he'} belonged to. Now the answer is official: neither.`; }
    else { office = pick(['Evening-news anchor', 'Television host', 'Late-night host']); lean = rnd(-0.35, 0.2); hist(p, `Became the face of ${pick(['the evening news', 'Sunday mornings', 'late-night television'])}`, y - ri(10, 20)); why = `${p.name} signed off ${p.gender === 'f' ? 'her' : 'his'} final broadcast Friday with "I'll see you on the campaign trail." ${ri(30, 60)} million viewers a week already know the face.`; }
  }
  p.faction = 'Independents';
  hist(p, `Launched an independent campaign for President`, y);
  const centrist = minor && Math.abs(indLabelInfo(minor.label).lean) <= 0.15 && Math.random() < 0.6;
  const label = centrist ? minor.label : 'Independent';
  const I = { p, name: p.name, label, office, home: p.state, state: p.state, lean: +lean.toFixed(2), color: centrist ? indLabelInfo(label).color : PARTY.I.color, strength: +rnd(19, 29).toFixed(1), major: true, charisma: +rnd(1.1, 1.45).toFixed(2), kind, why, minor: minor ? { name: minor.name, label: minor.label, strength: minor.strength, stepped: centrist } : null };
  if (minor) hist(minor.p, centrist ? `Stepped aside to hand the ${minor.label} ballot line to ${p.name}` : `Was eclipsed by ${p.name}'s independent campaign`, y);
  return I;
}
// end of the primaries: finish the Alliance's contests, hold its convention, maybe launch a major independent; S.nominees.I is set (or not)
function indFinish(R, state, n, year) {
  let minor = null, line;
  if (!R || R.none) line = R ? `<b>No third party on the ballot:</b> ${R.why}.` : '';
  else {
    const conv = indConvention(R); minor = indNominee(conv.f, conv);
    const ord = ['first', 'second', 'third', 'fourth', 'fifth'][conv.ballots.length - 1];
    hist(conv.f.p, `Won the ${year} ${conv.f.label} presidential nomination at the Ballot Alliance convention in ${conv.city}${conv.ballots.length > 1 ? ` on the ${ord} ballot` : ''}`, year);
    line = `<b>Independents:</b> the Ballot Alliance convention at ${conv.hall} in ${conv.city} nominated ${minor.name} (${minor.label}, ${minor.office}) ${conv.clinched ? 'by acclamation after a primary sweep' : conv.ballots.length > 1 ? `on the ${ord} ballot` : 'on the first ballot'}; the line polls around ${indSh(minor.strength)}% nationally.`;
    R.conv = conv; conv.strength = minor.strength;
  }
  const major = indMajor(state, n, minor);
  n.I = major || minor || undefined;
  if (!n.I) delete n.I;
  if (n.I) n.I.p.label = n.I.label;
  return { line, major, minor, conv: R && R.conv };
}
// the first three-way poll after a launch (your ticket's margin from presSetup, the newcomer drawing by lean)
function indThreeWay(I) {
  const s = presSetup(), mD = (s.inc === 'D' ? 1 : -1) * s.base, und = 9, tp = I.strength, fD = clamp(0.5 - 0.4 * I.lean, 0.1, 0.9);
  const D = (100 - und) / 2 + mD / 2 - tp * fD, R = (100 - und) / 2 - mD / 2 - tp * (1 - fD);
  return { D: +D.toFixed(1), R: +R.toFixed(1), I: tp, und };
}
function indLaunchHTML(I, year) {
  const n = S.nominees, poll = indThreeWay(I), from = I.lean < -0.12 ? 'D' : I.lean > 0.12 ? 'R' : null, nm = lastName(I.p).toUpperCase();
  const minorLine = I.minor ? (I.minor.stepped ? `The ${I.minor.label} nominee, ${I.minor.name}, stepped aside within the hour and handed over the party's ballot line in ${ri(31, 44)} states.` : `${I.minor.name}, the ${I.minor.label} nominee, vowed to stay in the race; nobody is asking for ${lastName(I.minor)}'s endorsement anymore.`) : `${pick(['Lawyers', 'Petition firms', 'Volunteers'])} are already collecting signatures in all fifty states; the filing deadlines start in August.`;
  return `${frontPage({ headline: `${nm} LAUNCHES INDEPENDENT BID`, sub: `The ${I.office.charAt(0).toLowerCase() + I.office.slice(1)} enters the race at ${indSh(poll.I)}% in the first three-way poll: the strongest third candidate in a generation.`, mood: 'storm', date: `June ${year} · Extra`,
    body: [I.why, `The snap national poll: ${n.D.name} (D) ${indSh(poll.D)}%, ${n.R.name} (R) ${indSh(poll.R)}%, ${I.name} (${I.label === 'Independent' ? 'I' : I.label}) ${indSh(poll.I)}%, ${poll.und}% undecided. ${from ? `${I.name} draws more from ${PARTY[from].name} voters, and ${PARTY[from].name} strategists are not hiding their panic.` : 'The newcomer draws evenly from both sides, which is to say nobody knows who it hurts.'}`, minorLine, `Analysts give ${lastName(I.p)} a real chance to carry states${I.strength >= 24 ? ' and, if the majors stumble, the whole thing' : ''}. Both conventions open this summer with a third name on every chart.`] })}
  <div class="prim-hqcand" style="border-color:${I.color}"><span class="cp">${portrait(I.p)}</span><span style="flex:1"><b style="color:${I.color}">${I.name}</b> ${indPill(I.label, true)} <span class="ind-major">a real contender</span><br><small>${I.office} · from ${stName(I.home)} · ${indSh(I.strength)}% nationally${from ? ` · draws more from ${PARTY[from].short}` : ' · draws from both sides'}</small></span></div>`;
}
