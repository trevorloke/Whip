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
// scale (races.js, parity): 0.4 after a failed pre-primary roll (indSenateRoll), so the total third-candidate rate holds
function indSenateEntrants(rc, scale = 1) {
  const m = rc.m, code = m.state;
  if (m.party === 'I') return { name: m.name, incumbent: true, str: rnd(30, 42), label: indLabel(m) };
  const chance = ((Math.abs(ST[code].lean) <= 12 ? 0.14 : 0.06) + (rc.primaried ? 0.15 : 0)) * scale;
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
// cashR: the war-chest range per unit of money (the old Alliance race: $3–7M; the national calendar: $6–11M)
function indEntry(p, office, label, kind, ref, cashR) {
  const L = indLabelInfo(label), celeb = kind === 'celeb' || kind === 'biz';
  const charisma = rnd(0.75, 1.2) + (celeb ? 0.15 : 0) + (kind === 'sen' || kind === 'gov' ? 0.1 : 0), money = rnd(0.7, 1.05) + (kind === 'biz' ? 0.35 : 0);
  return { name: p.name, p, office, ref, party: 'I', label, faction: L.group, kind, state: p.state, charisma, money, cash: Math.round(money * rnd(cashR ? cashR[0] : 3, cashR ? cashR[1] : 7)), del: 0, wins: 0, votes: 0, mo: 0, active: true, color: L.color, msg: (Object.entries(L.issues).sort((a, b) => b[1] - a[1])[0] || ['economy'])[0] };
}
// who runs: nobody (about a third of cycles), one party's contest, or a field from several labels, left and right
function indField() {
  const r = Math.random();
  if (r < 0.35 && !IND()) return { kind: 'none', field: [] };   // an independent caucus guarantees the Alliance a ballot line
  const labels = shuffle(Object.keys(IND_LABELS));
  // your caucus's banner leads the Alliance's field (a reorder, not a draw)
  if (IND() && S.cau && labels.indexOf(S.cau.label) > 0) labels.unshift(labels.splice(labels.indexOf(S.cau.label), 1)[0]);
  const one = r < 0.6, picks = one ? Array(ri(2, 3)).fill(labels[0]) : labels.slice(0, pick([2, 2, 3, 3, 3, 4, 4, 5]));
  const field = [], used = new Set();
  // the rare sitting independent senator, and the former senator who quit a party, take the first slots
  const sens = shuffle(S.members.filter(m => m.party === 'I'));
  const formers = shuffle((S.formers || []).filter(f => f && (f.party === 'D' || f.party === 'R') && f.name !== S.president.name && !(S.vp && f.name === S.vp.name) && !nameTaken(f.name) && !(f.history || []).some(h => /Died/.test(h.t))));
  picks.forEach((label, i) => {
    const L = indLabelInfo(label);
    const sen = sens.find(m => !used.has(m.name) && indLabel(m) === label);
    if (sen && Math.random() < (IND() ? 0.5 : 0.25)) { used.add(sen.name); hist(sen, `Ran for the ${currentYear()} ${label} presidential line`); field.push(indEntry(sen, `Senator from ${ST[sen.state].name}`, label, 'sen', { type: 'sen', id: sen.id })); return; }
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
  // the national calendar (parity path): the same states and dates as the majors, plus at-large Alliance officers
  if (R.label) return `<div class="ind-pills">${labels.map(l => indPill(l, true)).join('')}</div><p><b>The Independent Ballot Alliance</b> pools ${labels.length > 1 ? `${labels.length} member parties' petition drives` : `the ${indLabelInfo(labels[0]).group} ballot lines`} into one line on all fifty ballots, and only one candidate gets it${labels.length > 1 ? `: ${labels.map(l => `${l} (${indLabelInfo(l).line})`).join('; ')}` : `, running on ${indLabelInfo(labels[0]).line}`}. The Alliance votes on the national calendar, every state on the majors' dates. <span class="ind-dels">${primN(R.pledged)} pledged + ${primN(R.atLarge)} at-large · need ${primN(R.need)}</span>: the at-large Alliance officers are released at the convention by label, so a candidate who wins less than ${Math.round(R.need / R.pledged * 100)}% of the pledged delegates faces a floor fight.${R.incumbentRace ? ` ${presTitle()} is defending the line.` : ''}${IND() ? '' : ' <i>You can watch this race, but no whip runs it.</i>'}</p>`;
  return `<div class="ind-pills">${labels.map(l => indPill(l, true)).join('')}</div><p><b>The Independent Ballot Alliance</b> pools ${labels.length > 1 ? `${labels.length} third parties' petition drives` : `the ${indLabelInfo(labels[0]).group.replace(/s$/, 's\'').replace(/([^'])$/, '$1\'s')} ballot lines`} into one line on all fifty ballots, and only one candidate gets it${labels.length > 1 ? `: ${labels.map(l => `${l} (${indLabelInfo(l).line})`).join('; ')}` : `, running on ${indLabelInfo(labels[0]).line}`}. Thirteen states vote in party primaries, caucuses and petition conventions (${primN(R.pledged)} pledged delegates); ${primN(R.atLarge)} at-large delegates ${labels.length > 1 ? 'are seated in equal blocks by the member parties' : 'follow the national poll'} at the convention, and ${primN(R.need)} nominate.${IND() ? ' <i>Your caucus runs this one: endorse a candidate and your network lifts them everywhere (+8%).</i>' : ' <i>You can watch this race, but no whip runs it.</i>'}</p>`;
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
function indMajorOdds(bolter) { return IND() ? (0.055 + (bolter ? 0.035 : 0) + (S.president.approval < 40 ? 0.02 : 0)) * 1.5 : 0.055 + (bolter ? 0.035 : 0) + (S.president.approval < 40 ? 0.02 : 0); }
// a primary loser who can bolt: a close second in a race that was settled, from outside the Senate, the statehouses and the cabinet
function indBolter(state, n) {
  for (const p of shuffle(['D', 'R'])) {
    const R = state[p], N = n[p]; if (!R || !N || N.contested || !N.runnerUp) continue;
    const f = R.field.find(x => x.name === N.runnerUp.name);
    if (f && f.ref && ['outsider', 'former', 'rep'].includes(f.ref.type) && (f.del >= N.del * 0.4 || f.wins >= 5)) return { p, f };
  }
  return null;
}
// onlyBolter (the national-calendar Alliance, CONTRACT §5.4): the heavyweight now enters the primary itself, so after the
// primaries only a major-party runner-up who bolts can still launch a campaign
function indMajor(state, n, minor, onlyBolter) {
  const bolt = indBolter(state, n);
  if (onlyBolter && !bolt) return null;
  if (Math.random() >= indMajorOdds(bolt)) return null;
  const y = currentYear(), kind = onlyBolter ? 'bolter' : bolt && Math.random() < 0.55 ? 'bolter' : pick(['governor', 'billionaire', 'general', 'anchor']);
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
  const I = { p, name: p.name, label, office, home: p.state, state: p.state, lean: +lean.toFixed(2), color: centrist ? indLabelInfo(label).color : PARTY.I.color, strength: +rnd(21, 30).toFixed(1), major: true, charisma: +rnd(1.1, 1.45).toFixed(2), kind, why, minor: minor ? { name: minor.name, label: minor.label, strength: minor.strength, stepped: centrist } : null };
  if (minor) hist(minor.p, centrist ? `Stepped aside to hand the ${minor.label} ballot line to ${p.name}` : `Was eclipsed by ${p.name}'s independent campaign`, y);
  return I;
}
// end of the primaries: finish the Alliance's contests, hold its convention, maybe launch a major independent; S.nominees.I is set (or not)
// (the 8a88a40 path, kept for D/R careers with the parity switch off; indFinish below dispatches)
function indFinishOld(R, state, n, year) {
  const P = S.president;
  if (P.party === 'I' && P.terms < 2) { // a sitting independent President runs again: the Alliance stands aside
    n.I = { p: P, name: P.name, label: P.label || 'Independent', office: 'President of the United States', home: P.state || null, state: P.state || null, lean: 0, color: P.label ? indLabelInfo(P.label).color : PARTY.I.color, strength: 16, major: true, charisma: 1.05, kind: 'incumbent', incumbent: true };
    return { line: `<b>Independents:</b> ${presTitle()} seeks a second term outside both parties; the Ballot Alliance stands aside.`, major: null, minor: null, conv: null };
  }
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
  n.I = major || minor || null;   // null = the Alliance ran and nobody qualified (night.js presThird tests 'I' in S.nominees)
  // an independent caucus's ticket: its senators' networks and the independent mood lift whoever carries the line
  if (IND() && n.I) { n.I.strength = +(n.I.strength + 1 + seats('I') * 0.5 + Math.max(0, S.mood) * 0.2).toFixed(1); n.I.yours = true; }
  if (n.I) n.I.p.label = n.I.label;
  return { line, major, minor, conv: R && R.conv };
}
// the first three-way poll after a launch (your ticket's margin from presSetup, the newcomer drawing by lean)
function indThreeWay(I) {
  const s = presSetup(), mD = presEnvD(s), und = 9, tp = I.strength, fD = clamp(0.5 - 0.3 * I.lean, 0.1, 0.9);
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

/* =====================================================================
   PARITY (CONTRACT §5.4): one presidential primary engine. With the parity
   switch on, and always in the independent career, the Ballot Alliance runs
   on the national calendar through primaries.js runPrimaryFor('I'): fields
   sized by the movement's strength, a heavyweight who can enter the race,
   sitting independent Presidents who draw challengers like anyone else, and
   the Alliance's own convention (indConventionFlow, called by convention.js).
   The functions above stay as the switch-off path.
   ===================================================================== */

// two bills per label, in the AGENDA row format [name, blurb, fx]: the President's bill (floor.js) and billParty (game.js)
const IND_LABEL_BILLS = {
  'Green': [['Carbon Dividend Act', 'A fee on carbon at the well and the mine, every dollar paid back to households as a dividend.', { environment: 3, welfare: 1, economy: -1 }],
    ['Small Donor Democracy Act', 'Six-to-one public matching for small gifts, and corporate PAC money out of federal races.', { environment: 1, urban: 1, welfare: 1, taxes: -1 }]],
  'Democratic Socialist': [['Medicare for All Act', 'One public health plan for every resident, from birth.', { welfare: 3, urban: 1, taxes: -2 }],
    ['Workplace Democracy Act', 'Card-check union elections and worker seats on corporate boards.', { welfare: 2, urban: 1, economy: -1 }]],
  'Working Families': [['Rent Stabilization Act', 'Caps yearly rent hikes on corporate landlords at five percent.', { urban: 2, welfare: 2, economy: -1 }],
    ['Paid Family Leave for All Act', 'Twelve paid weeks for a new child or a sick parent, for every worker.', { welfare: 2, economy: 1, rural: 1, taxes: -1 }]],
  'Forward': [['Ranked Choice Voting Act', 'Ranked ballots and open primaries for every federal race.', { tech: 1, urban: 1, rural: 1, economy: 1 }],
    ['Government Tech Modernization Act', 'Retire the mainframes, put every federal form online and publish the data.', { tech: 3, economy: 1 }]],
  'Common Ground': [['National Service Act', 'A paid year of civilian or military service for every eighteen-year-old who wants one.', { security: 1, welfare: 1, economy: 1, rural: 1 }],
    ['Fiscal Commission Act', 'A bipartisan deficit commission whose plan gets a straight up-or-down vote.', { economy: 2, taxes: 1, welfare: -1 }]],
  'Libertarian': [['Rulebook Sunset Act', 'Every major federal regulation lapses after seven years unless Congress renews it.', { taxes: 2, economy: 2, tech: 1, welfare: -1 }],
    ['Federal Spending Cap Act', 'Federal spending capped at eighteen percent of GDP, enforced by automatic cuts.', { taxes: 3, economy: 1, welfare: -2, security: -1 }]],
  'Heartland': [['Buy American Manufacturing Act', 'Federal contracts go to goods made in American factories.', { economy: 2, rural: 2, security: 1, tech: -1 }],
    ['Family Farm Protection Act', 'Breaks up the meatpacking giants and bars foreign buyers of farmland.', { rural: 3, economy: 1, security: 1 }]],
  'Constitution': [['Balanced Budget Mandate Act', 'Congress balances the budget every year, or its members forfeit their pay.', { taxes: 3, economy: 1, welfare: -2 }],
    ['Tenth Amendment Restoration Act', 'Federal mandates on the states lapse unless Congress names the clause that allows them.', { rural: 2, taxes: 2, security: 1, urban: -1 }]],
};

/* ---------------- labels, strength and the delegate math ---------------- */
// a person's or a field entry's label lane. Read-only: it never assigns a label (renders and polls call it)
function indLaneOf(x) { return (x && x.label) || null; }
// how strong the independent movement is: its senators, an independent White House, the caucus's mood, the last ticket's share
function indPower() {
  const P = S.president;
  return seats('I') + (P && P.party === 'I' ? 3 : 0) + 2 * Math.max(0, IND() ? (S.mood || 0) : 0) + ((S.lastIndPct || 0) >= 10 ? 2 : 0);
}
// the Alliance on the national calendar: every primary delegate (as the majors) plus at-large Alliance officers (balance knob:
// 20% puts about a quarter of Alliance conventions past the first ballot)
const IND_ATLARGE = 0.2;
function indDelegates() { const pledged = primTotalDel(), atLarge = Math.round(IND_ATLARGE * pledged), totalDel = pledged + atLarge; return { pledged, atLarge, totalDel, need: Math.floor(totalDel / 2) + 1 }; }
// an open year's field: none at all (never for an independent caucus), one member party's contest, or a field of labels
function indFieldPlan(withIncumbent) {
  if (withIncumbent) return { none: false, size: 0, oneLabel: false };
  const pw = indPower(), iwh = S.president.party === 'I';
  const [sizes, pNone, pOne] = pw >= 10 || iwh ? [null, 0.03, 0] : pw >= 4 ? [[2, 3, 3, 4, 4, 5, 6], 0.15, 0.1] : [[2, 2, 3, 3, 4], 0.3, 0.2];
  if (!IND() && Math.random() < pNone) return { none: true, size: 0, oneLabel: false };
  const oneLabel = pOne > 0 && Math.random() < pOne;
  return { none: false, size: sizes ? pick(sizes) : ri(2, 9), oneLabel };
}
// the Alliance field (mirrors primaryField): the sitting President, the Vice President and the cabinet of an independent White
// House, independent senators, former senators who quit their parties, then outsiders from the member parties
function primaryFieldI(withIncumbent, plan) {
  const P = S.president, field = [], used = new Set(withIncumbent ? [] : [P.name]), CASH = [6, 11];
  const banner = IND() && S.cau && IND_LABELS[S.cau.label] ? S.cau.label : null;
  const labels = shuffle(Object.keys(IND_LABELS)); if (banner) labels.unshift(labels.splice(labels.indexOf(banner), 1)[0]);
  const one = plan && plan.oneLabel ? labels[0] : null;
  const labelOf = p => IND_LABELS[p.label] ? p.label : indPickLabel(p.w, p.state, p.cause && p.cause[1]);
  const add = (p, office, label, kind, ref, extra = {}) => {
    if (!p || used.has(p.name) || (one && label !== one)) return false; used.add(p.name);
    field.push({ ...indEntry(p, office, label, kind, ref, CASH), ...extra }); return true;
  };
  const kindFor = L => pick(L.lean > 0.3 ? ['act', 'act', 'celeb', 'biz', 'general', 'gov'] : L.lean < -0.3 ? ['act', 'act', 'act', 'celeb', 'gov'] : ['act', 'celeb', 'biz', 'biz', 'general', 'gov']);
  const pool = [];
  // an independent White House's people, when the President is not on the ballot
  if (P.party === 'I' && !withIncumbent) shuffle(CABINET_POSTS.slice(0, 5)).slice(0, 2).forEach(([post, title]) => { const c = S.cabinet && S.cabinet[post]; if (c && c.party === 'I') pool.push(() => Math.random() < 0.5 && add(c, title, labelOf(c), 'gov', { type: 'cab', post })); });
  // independent senators: the ambitious first (and, for a caucus, its loyal members)
  shuffle(S.members.filter(m => m.party === 'I')).sort((a, b) => (IND() ? ((b.rel || 0) >= 1) - ((a.rel || 0) >= 1) : 0) || (T(b, 'ambitious') ? 1 : 0) - (T(a, 'ambitious') ? 1 : 0)).slice(0, 4)
    .forEach(m => pool.push(() => Math.random() < (IND() ? 0.45 : 0.3) && add(m, `Senator from ${ST[m.state].name}`, labelOf(m), 'sen', { type: 'sen', id: m.id })));
  // a former senator who already left a party, or one who quits to run (the old Alliance's 15%)
  const formers = shuffle((S.formers || []).filter(f => f && f.name !== P.name && !(S.vp && f.name === S.vp.name) && !nameTaken(f.name) && !(f.history || []).some(h => /Died/.test(h.t))));
  const exI = formers.find(f => f.party === 'I'), exDR = formers.find(f => f.party === 'D' || f.party === 'R');
  if (exI) pool.push(() => Math.random() < 0.3 && add(exI, `Former Senator from ${ST[exI.state] ? ST[exI.state].name : exI.state}${exI.exParty ? ` (ex-${exI.exParty})` : ''}`, labelOf(exI), 'gov', { type: 'former' }));
  if (exDR) pool.push(() => {
    if (Math.random() >= 0.15) return false;
    const label = one || indPickLabel(exDR.w, exDR.state, null, exDR.party === 'D' ? -0.6 : 0.6);
    if (!add(exDR, `Former Senator from ${ST[exDR.state] ? ST[exDR.state].name : exDR.state} (ex-${exDR.party})`, label, 'gov', { type: 'former' })) return false;
    exDR.exParty = exDR.party; hist(exDR, `Left the ${PARTY[exDR.party].name} Party to seek the ${label} presidential line`); exDR.party = 'I'; exDR.label = label; return true;
  });
  const fill = n => {
    for (const fn of pool) { if (field.length >= n) break; fn(); }
    for (let g = 0; field.length < n && g < 40; g++) {
      const taken = new Set(field.map(f => f.label)), label = one || labels.find(l => !taken.has(l)) || labels[g % labels.length];
      const kind = kindFor(indLabelInfo(label)), x = indPerson(label, kind);
      add(x.p, x.office, label, kind, { type: 'outsider' });
    }
  };
  if (withIncumbent) {
    // a sitting independent President: the D/R formula, less 0.1 charisma (no party machine behind them; balance knob, tuned so
    // an independent at 35% approval is renominated about half the time, about as often as a major-party President)
    const a = P.approval, label = P.label || 'Independent';
    add(P, 'President of the United States', label, 'incumbent', { type: 'pres' }, { charisma: clamp(1.15 + (a - 50) / 60 - (IND() ? (S.undermine || 0) * 0.06 : 0), 0.4, 1.5) - 0.1, money: a < 35 ? 1.25 : 1.35, cash: a < 35 ? 22 : 30, incumbent: true });
    fill(1 + (a <= 32 ? ri(1, 3) : a <= 45 ? ri(1, 2) : 1));
    const ch = field.filter(f => !f.incumbent).sort((x, y) => y.charisma - x.charisma)[0];
    if (ch && a <= 40) Object.assign(ch, { charisma: rnd(a <= 32 ? 0.95 : 0.9, a <= 32 ? 1.3 : 1.15), money: rnd(1.05, 1.25), cash: ri(16, 24), heavy: true });
  } else {
    if (P.party === 'I' && S.vp && S.vp.party === 'I') add(S.vp, 'Vice President', labelOf(S.vp), 'gov', { type: 'vp' }, { charisma: rnd(0.9, 1.3), money: rnd(1.05, 1.3) });
    fill(plan ? plan.size : 3);
    // the heavyweight: a billionaire, a general, a governor or a star who runs for the line (CONTRACT §5.4)
    if (Math.random() < indMajorOdds(false)) {
      const kind = pick(['biz', 'general', 'gov', 'celeb']), label = one || pick(['Forward', 'Common Ground']), x = indPerson(label, kind);
      add(x.p, x.office, label, kind, { type: 'outsider' }, { heavy: true, big: true, charisma: rnd(1.1, 1.35), cash: ri(20, 30) });
    }
  }
  // the caucus's banner is always on the Alliance ballot
  if (banner && !field.some(f => f.label === banner)) { const kind = kindFor(indLabelInfo(banner)), x = indPerson(banner, kind); add(x.p, x.office, banner, kind, { type: 'outsider' }); }
  // two candidates of one label get their own colors
  const seen = new Set();
  field.forEach((f, i) => { if (one || seen.has(f.color)) f.color = CAND_COLORS.find(c => !seen.has(c)) || CAND_COLORS[i % CAND_COLORS.length]; seen.add(f.color); });
  return field;
}
// the heir of an independent White House starts here (balance knob, CONTRACT §9: the I-WH open-year successor target)
const IND_HEIR_BASE = 14;
// a non-incumbent Alliance nominee's national share (the single owner of it; the incumbent's is presSetup's)
function indNomStrength(N, R, f) {
  const P = S.president, beat = !!(R && R.incumbentRace && !N.incumbent);
  let s;
  if (N.big) s = ri(21, 30);   // the national heavyweight (an incumbent race's 'heavy' challenger is a strong challenger, no more)
  // an independent White House's heir (an open year, or the winner over a beaten President): continuity, as a major's successor has
  else if (P.party === 'I') s = clamp(IND_HEIR_BASE + (P.approval - 45) * 0.5 + (N.ref && N.ref.type === 'vp' ? 3 : 0) + (N.ref && N.ref.type === 'cab' ? 1 : 0), 8, 34) - (beat ? 2 : 0);
  else s = indStrength(f || N);
  return +(s + 0.5 * seats('I') - (beat ? 1.5 : 0)).toFixed(1);
}
// the end of the Alliance race on the new path: primaries.js has built n.I with primFinishParty('I'), or n.I is null
function indFinish(R, state, n, year) {
  if (!primNewI()) return indFinishOld(R, state, n, year);
  const P = S.president, none = { line: '', major: null, minor: null, conv: null };
  if (R && R.none) { n.I = null; return { ...none, line: `<b>No third party on the ballot:</b> ${R.why}.` }; }
  const N = n.I; if (!N) return none;
  N.engine = 'prim';
  const incF = R ? R.field.find(f => f.incumbent) : null;
  let line, major = null;
  if (N.incumbent) {
    // presSetup owns a running independent President's strength; the primary leaves its bruise in adj (16: the old fallback)
    N.adj = R ? -1.5 : 0; N.strength = 16;
    line = !R ? `<b>Independents:</b> ${presTitle()} was renominated without opposition and carries the Alliance line again.`
      : N.contested ? `<b>Independents:</b> ${presTitle()} leads the Alliance revolt's count with ${primN(N.del)} delegates${N.runnerUp ? ` to ${N.runnerUp.name}'s ${primN(N.runnerUp.del)}` : ''}, short of the ${primN(N.need)} needed: the at-large officers will decide on the convention floor.`
      : `<b>Independents:</b> ${presTitle()} beat back an Alliance revolt, ${primN(N.del)} delegates to ${N.runnerUp ? `${N.runnerUp.name}'s ${primN(N.runnerUp.del)}` : 'none'}.`;
  } else {
    const f = R.field.find(x => x.name === N.name);
    N.strength = indNomStrength(N, R, f);
    if (IND()) N.strength = +(N.strength + 1 + seats('I') * 0.5 + Math.max(0, S.mood) * 0.2).toFixed(1);
    line = `<b>Independents:</b> ${N.name} (${N.label}, ${N.office}) ${N.contested ? `leads the Alliance with ${primN(N.del)} delegates, short of the ${primN(N.need)} needed: the convention floor will settle it` : `clinched the Alliance line with ${primN(N.del)} delegates`}${incF ? N.contested && incF.active ? `, with ${presTitle()} still fighting for the line on the floor` : `, ending ${presTitle()}'s bid for a second term` : ''}; the line polls around ${indSh(N.strength)}% nationally.`;
    // only a major-party runner-up can still bolt (the heavyweight now runs in the primary itself)
    if (!R.field.some(x => x.big)) major = indMajor(state, n, N, true);
    if (major) { major.engine = 'prim'; n.I = major; if (IND()) major.strength = +(major.strength + 1 + seats('I') * 0.5 + Math.max(0, S.mood) * 0.2).toFixed(1); }
  }
  if (IND() && n.I) n.I.yours = true;
  if (n.I) n.I.p.label = n.I.label;
  return { line, major, minor: N.incumbent ? null : N, conv: null };
}

/* ---------------- the Senate side (races.js calls these) ---------------- */
// the pre-primary chance that an open independent lane draws a field: 0.6 of the old third-candidate odds
function indSenateRoll(rc) {
  const code = rc.m.state, E = S.election || {};
  return Math.min(0.3, 0.6 * ((Math.abs(ST[code].lean) <= 12 ? 0.14 : 0.06) + (rc.primary ? 0.15 : 0)) * (E.indWave > 3 ? 1.5 : 1));
}
function indOfficeFor(label) {
  const L = indLabelInfo(label), r = Math.random();
  return r < 0.12 ? pick(IND_CELEBS) : r < 0.22 ? pick(IND_BIZ) : pick([`Chair of the ${L.group}`, `${label} organizer`, 'Former state legislator', 'City council member', 'Small-business owner', 'School board president', 'County commissioner', 'Union local president']);
}

/* ---------------- the Alliance convention (I career: five screens; D/R careers: one front page) ---------------- */
const IND_CITY_LEAN = [-0.4, 0.1, -0.3, 0.2, 0.3, -0.1, 0.6, 0.5];   // Denver … Spokane: where each label feels at home
function indConvCity(lean) {
  const w = IND_CITIES.map((c, i) => Math.exp(-2.5 * Math.abs(IND_CITY_LEAN[i] - lean)));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return IND_CITIES[i]; }
  return IND_CITIES[IND_CITIES.length - 1];
}
// the floor: pledged delegates as won (released ones already moved), and the at-large officers in one bloc per member party
// that ran, each with its own candidate; a party whose candidates are all out sits the first ballot out uncommitted and is
// released after it to the nearest label still standing (a one-label race: blocs by delegates)
function indConvSetup(N) {
  const roll = (N.roll && N.roll.length ? N.roll : [{ name: N.name, label: N.label, color: N.color, del: N.del, active: true }]).map(x => ({ ...x }));
  const act = roll.filter(x => x.active), atLarge = N.atLarge || 0;
  const C = { N, roll, need: N.need || 1, atLarge, pledged: N.pledged || 0, ballots: [], blocs: [], moved: false, moves: [], vpDeal: null, released: null, decided: false, winner: null, plurality: false };
  const near = (lean, pool) => pool.slice().sort((a, b) => Math.abs(indLabelInfo(a.label).lean - lean) - Math.abs(indLabelInfo(b.label).lean - lean))[0];
  const labels = [...new Set(roll.map(x => x.label))];
  if (labels.length > 1) {
    const block = Math.floor(atLarge / labels.length);
    for (const l of labels) { const own = act.filter(x => x.label === l).sort((a, b) => b.del - a.del)[0]; C.blocs.push({ label: l, del: block, to: own ? own.name : null }); }
    const lead = act.slice().sort((a, b) => b.del - a.del)[0]; C.blocs.push({ label: null, del: atLarge - block * labels.length, to: lead.name });
  } else {
    const tot = act.reduce((a, x) => a + x.del, 0) || 1; let left = atLarge;
    act.sort((a, b) => b.del - a.del).forEach((x, i) => { const d = i === act.length - 1 ? left : Math.round(atLarge * x.del / tot); left -= d; C.blocs.push({ label: x.label, del: d, to: x.name }); });
  }
  return C;
}
const indConvAct = C => C.roll.filter(x => x.active);
const indConvTotal = (C, x) => x.del + C.blocs.filter(b => b.to === x.name).reduce((a, b) => a + b.del, 0);
const indConvRank = C => indConvAct(C).map(x => ({ x, t: indConvTotal(C, x) })).sort((a, b) => b.t - a.t);
// take a roll call; a majority (or the sixth ballot's plurality rule, or a lone candidate) decides it
function indConvBallot(C) {
  const rk = indConvRank(C), n = C.ballots.length + 1;
  C.ballots.push({ n, rows: rk.map(r => ({ name: r.x.name, del: r.t })), unc: C.blocs.filter(b => !b.to).reduce((a, b) => a + b.del, 0), moves: C.moves.slice() });
  C.moves = []; C.moved = false;
  if (rk[0].t >= C.need || rk.length < 2 || n >= 6) { C.decided = true; C.winner = rk[0].x; C.plurality = rk[0].t < C.need && rk.length > 1; }
}
// between ballots the last-place candidate is out: most of their pledged delegates go to the nearest label, the rest to the
// leader; their at-large blocs follow label affinity
function indConvDrop(C) {
  const rk = indConvRank(C); if (rk.length < 2) return;
  const out = rk[rk.length - 1].x, live = rk.slice(0, -1).map(r => r.x), lead = live[0];
  const near = lean => live.slice().sort((a, b) => Math.abs(indLabelInfo(a.label).lean - lean) - Math.abs(indLabelInfo(b.label).lean - lean))[0];
  const nr = near(indLabelInfo(out.label).lean), toNear = Math.round(out.del * rnd(0.55, 0.8));
  nr.del += toNear; lead.del += out.del - toNear; out.del = 0; out.active = false;
  C.blocs.filter(b => b.to === out.name || !b.to).forEach(b => { b.to = near(b.label ? indLabelInfo(b.label).lean : indLabelInfo(out.label).lean).name; });
  C.ballots[C.ballots.length - 1].dropped = out.name; C.ballots[C.ballots.length - 1].to = nr.name;
}
// the caucus's floor moves (one per ballot): release your candidate's delegates, or trade the running-mate slot for a bloc
function indConvMoves(C) {
  const N = C.N, rk = indConvRank(C), lead = rk[0] && rk[0].x, mine = N.endorsed ? indConvAct(C).find(x => x.name === N.endorsed) : null;
  // the deal goes to a power broker: the runner-up when you back the leader, otherwise the best of the rest (not the leader)
  const target = mine || lead, partner = rk.map(r => r.x).find(x => x !== target && !x.incumbent && (target === lead || x !== lead));
  const bloc = partner ? C.blocs.filter(b => b.to === partner.name).reduce((a, b) => a + b.del, 0) : 0;
  return {
    release: mine && mine !== lead && !C.released ? { mine, lead } : null,
    vp: partner && target && !target.incumbent && !C.vpDeal && !N.incumbent && bloc > 0 ? { target, partner, bloc } : null,
  };
}
function indConvApply(C, k) {
  const mv = indConvMoves(C);
  if (k === 'release' && mv.release) {
    const { mine, lead } = mv.release; lead.del += mine.del; mine.del = 0; mine.active = false;
    C.blocs.filter(b => b.to === mine.name).forEach(b => b.to = lead.name);
    C.released = mine.name; C.unityAdj = (C.unityAdj || 0) + 0.1;
    C.moves.push(`${mine.name} released ${mine.name === C.N.endorsed ? 'your' : 'their'} delegates to ${lead.name}`);
  } else if (k === 'vp' && mv.vp) {
    const { target, partner, bloc } = mv.vp;
    C.blocs.filter(b => b.to === partner.name).forEach(b => b.to = target.name);
    C.vpDeal = partner.name; C.vpFor = target.name; C.unityAdj = (C.unityAdj || 0) + 0.05;
    C.moves.push(`${partner.name} took the running-mate slot and sent ${primN(bloc)} at-large delegates to ${target.name}`);
  } else return false;
  C.moved = true; return true;
}
function indConvTableHTML(C) {
  const names = C.roll.filter(x => x.active || C.ballots.some(b => b.rows.some(r => r.name === x.name))).map(x => x.name);
  const last = C.ballots[C.ballots.length - 1];
  return `<div class="ind-conv"><table><thead><tr><th>Candidate</th>${C.ballots.map(b => `<th>Ballot ${b.n}</th>`).join('')}</tr></thead><tbody>
    ${names.map(nm => { const x = C.roll.find(r => r.name === nm); return `<tr><td><span class="ind-dot" style="background:${x.color || indLabelInfo(x.label).color}"></span>${nm} ${indPill(x.label)}</td>${C.ballots.map(b => { const r = b.rows.find(y => y.name === nm); return r ? `<td class="${b === last && C.decided && r.name === C.winner.name ? 'win' : ''}">${primN(r.del)}</td>` : '<td class="out">out</td>'; }).join('')}</tr>`; }).join('')}
    ${C.ballots.some(b => b.unc) ? `<tr class="ind-unc"><td>Uncommitted officers</td>${C.ballots.map(b => `<td>${b.unc ? primN(b.unc) : '—'}</td>`).join('')}</tr>` : ''}
  </tbody></table><div class="nsub">${primN(C.need)} of ${primN(C.pledged + C.atLarge)} nominate: ${primN(C.pledged)} pledged in the primaries and ${primN(C.atLarge)} at-large Alliance officers, released by label (a member party with no candidate left sits the first ballot out).${C.ballots.filter(b => b.dropped).map(b => ` After ballot ${b.n}, ${b.dropped} was eliminated and most of the delegates went to ${b.to}.`).join('')}${C.ballots.filter(b => b.moves && b.moves.length).map(b => ` Before ballot ${b.n}: ${b.moves.join('; ')}.`).join('')}</div></div>`;
}
const indOrd = n => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'][n - 1] || `${n}th`;
// the nominee leaves the floor: an upset rewrites S.nominees.I (keeping the D/R fields), and the bookkeeping follows
function indConvSettle(C, year) {
  const N = C.N, w = C.winner, P = S.president;
  if (w.name !== N.name) {
    const old = { name: N.name, label: N.label, del: N.del, p: N.p, office: N.office, state: N.state, charisma: N.charisma, faction: N.faction }, wasInc = !!N.incumbent;
    const L = indLabelInfo(w.label);
    Object.assign(N, { p: w.p, name: w.name, state: w.state, home: w.state, office: w.office, charisma: +(+w.charisma || 1).toFixed(2), label: w.label, color: L.color, faction: L.group, kind: w.kind, ref: w.ref, heavy: !!w.heavy, big: !!w.big, major: !!w.big, incumbent: false,
      lean: +clamp(L.lean, -1, 1).toFixed(2), del: indConvTotal(C, w), runnerUp: { name: old.name, label: old.label, faction: old.faction, del: old.del, p: old.p, office: old.office, state: old.state, charisma: old.charisma }, upset: true });
    delete N.adj;
    if (w.incumbent) {
      // the sitting President trailed in the primaries and won the line back on the floor: still the incumbent (presSetup owns
      // the strength; the bruising race stays in adj)
      Object.assign(N, { p: w.p || P, kind: 'incumbent', ref: { type: 'pres' }, incumbent: true, lean: +(P.lean != null ? P.lean : L.lean), adj: -1.5, strength: 16 });
    } else {
      N.strength = indNomStrength(N, { incumbentRace: wasInc || C.roll.some(x => x.incumbent) }, w);
      if (IND()) N.strength = +(N.strength + 1 + seats('I') * 0.5 + Math.max(0, S.mood) * 0.2).toFixed(1);
    }
    if (w.p) { hist(w.p, `Won the ${year} Alliance nomination on the convention floor, ${indOrd(C.ballots.length)} ballot`); w.p.label = w.label; }
    if (old.p) hist(old.p, wasInc ? `Denied renomination on the floor of the ${year} Ballot Alliance convention` : `Led the ${year} Alliance primaries but lost the nomination on the convention floor`);
    if (IND() && N.endorsed) {
      if (N.endorsed === w.name) { S.career.capital += 2; unlock('campaign'); if (wasInc) unlock('regicide'); C.yourLine = `Your candidate won on the floor (+2 capital).`; }
      else if (N.endorsed === old.name) { S.career.capital = Math.max(0, S.career.capital - 1); C.yourLine = `Your candidate led into the hall and lost it on the floor (−1 capital).`; }
    }
  } else if (N.p) hist(N.p, `Accepted the ${year} Independent Ballot Alliance nomination for President in ${C.city}${C.ballots.length > 1 ? ` on the ${indOrd(C.ballots.length)} ballot` : ''}`);
  N.ballots = C.ballots.length; N.brokered = C.ballots.length > 1;
  return N;
}
// platform: the nominee's label's top issue against the runner-up's
function indConvPlanks(N) {
  const top = l => Object.entries(indLabelInfo(l).issues).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  const mineT = top(N.label), ru = N.runnerUp && N.runnerUp.label ? top(N.runnerUp.label) : [];
  const a = mineT[0] || 'economy', b = ru.find(t => t !== a) || mineT[1] || TAGS.find(t => t !== a);
  return { a, b, ruLabel: N.runnerUp && N.runnerUp.label && N.runnerUp.label !== N.label ? N.runnerUp.label : null };
}
function indConvPlank(C, k) {
  const N = C.N, pk = indConvPlanks(N);
  if (k === 'pure') { C.unity -= 0.1; C.strAdj += 0.3; C.planks = [{ tag: pk.a, dir: 1 }]; C.plankLine = `a pure ${N.label} platform: ${TAG[pk.a][1].toLowerCase()} first`; }
  else { C.unity += 0.1; N.lean = +((+N.lean || 0) * 0.8).toFixed(2); C.planks = [{ tag: pk.a, dir: 1 }, { tag: pk.b, dir: 1 }]; C.plankLine = `a coalition platform: ${TAG[pk.a][1].toLowerCase()} and ${TAG[pk.b][1].toLowerCase()}`; }
  C.theme = pk.a; C.unity = clamp(C.unity, 0.5, 1);
}
// the running mate when the caucus doesn't pick one: the deal partner, a senator of the label, the runner-up or a general
function indAutoVP(C) {
  const N = C.N;
  if (N.incumbent) return S.vp ? { name: S.vp.name, state: S.vp.state, faction: S.vp.faction || 'Independents' } : null;
  // a floor deal binds only the candidate it was struck for (void if someone else took the line)
  const deal = C.vpDeal && C.vpFor === N.name && C.roll.find(x => x.name === C.vpDeal);
  if (deal) return { name: deal.name, state: deal.state, faction: indLabelInfo(deal.label).group, deal: true };
  const sen = S.members.filter(m => m.party === 'I' && m.name !== N.name && m.label === N.label)[0];
  if (sen) return { name: sen.name, state: sen.state, faction: 'Independents' };
  const ru = N.runnerUp; if (ru && ru.state && ru.name !== S.president.name) return { name: ru.name, state: ru.state, faction: ru.label ? indLabelInfo(ru.label).group : 'Independents' };
  const st = pick(STATES)[0], p = newPerson('I', st, { age: ri(50, 68) }); hist(p, 'Retired from the Army as a lieutenant general', currentYear() - ri(2, 6));
  return { name: p.name, state: st, faction: 'Independents' };
}
const IND_TONES = { unity: ['Heal the hall', 'Thank the losers by name and promise every label a seat at the table'], fire: ['Burn down the two-party system', 'Both parties failed you, and here is the list'], outsider: ['The outsider\'s case', 'I owe nothing to anybody in Washington'] };
// how a speech plays with this nominee and this hall
function indToneFit(C, t) {
  const N = C.N, lean = Math.abs(indLabelInfo(N.label).lean);
  if (t === 'unity') return C.ballots.length > 1 || C.unity < 0.8 ? 0.7 : 0.2;
  if (t === 'fire') return lean >= 0.6 ? 0.6 : lean >= 0.3 ? 0.2 : -0.2;
  return lean <= 0.2 || ['celeb', 'biz', 'general'].includes(N.kind) ? 0.6 : 0;
}
function indConvSpeech(C, t) { C.tone = t; C.bounce = +(rnd(0.5, 2.5) + indToneFit(C, t)).toFixed(1); }
// bank the convention on S.nominees.I: the bounce moves a non-incumbent's strength, an incumbent's adj (presSetup owns the rest)
function indConvStore(C) {
  const N = C.N, d = 0.5 * C.bounce - (N.brokered ? 0.5 : 0) + (C.strAdj || 0);
  Object.assign(N, { bounce: C.bounce, unity: Math.round(clamp(C.unity, 0.5, 1) * 100) / 100, planks: C.planks || [], theme: C.theme || null, city: C.city, tone: C.tone });
  if (!N.vp) N.vp = indAutoVP(C);
  if (N.incumbent) N.adj = +((N.adj || 0) + d).toFixed(1); else N.strength = +((+N.strength || 0) + d).toFixed(1);
  if (N.roll) N.roll.forEach(x => delete x.p);   // the roll call stays in the record; the people don't need to be saved twice
}
function indConvFront(C, year, month) {
  const N = C.N, nm = lastName(N.p || { name: N.name }).toUpperCase(), city = C.city.toUpperCase(), d = 0.5 * C.bounce - (N.brokered ? 0.5 : 0) + (C.strAdj || 0);
  const headline = N.upset && N.incumbent ? `PRESIDENT ${nm} WINS THE ALLIANCE LINE BACK ON THE FLOOR` : N.upset ? `FLOOR REVOLT: ${nm} SEIZES THE ALLIANCE LINE` : N.brokered ? `${nm} WINS THE ALLIANCE ON THE ${indOrd(C.ballots.length).toUpperCase()} BALLOT` : N.incumbent ? `THE ALLIANCE RENOMINATES PRESIDENT ${nm}` : `${nm} ACCEPTS THE ALLIANCE LINE IN ${city}`;
  const ballots = C.ballots.length > 1 ? `It took ${C.ballots.length} roll calls${C.plurality ? ', and in the end the rules committee\'s sixth-ballot plurality rule' : ''} to settle it.` : C.clinched ? `${N.name} arrived with a majority won in the primaries and was nominated by acclamation.` : 'The at-large officers broke for the delegate leader and settled it on the first ballot.';
  return frontPage({ headline, sub: `${N.name} (${N.label}) leaves ${C.city} with ${N.vp ? `${N.vp.name} as running mate` : 'the ticket set'} and a convention bounce of ${C.bounce >= 0 ? '+' : ''}${indSh(C.bounce)} points.`, mood: 'dawn', date: `${month.replace(/^./, c => c.toUpperCase())} ${year} · ${C.city}`,
    body: [`Delegates of the Independent Ballot Alliance packed ${C.hall}. ${ballots}`, C.plankLine ? `The platform: ${C.plankLine}.` : '', C.tone ? `The acceptance speech: "${IND_TONES[C.tone][0]}." ${indToneFit(C, C.tone) >= 0.5 ? 'The hall loved it.' : indToneFit(C, C.tone) > 0 ? 'It played well enough.' : 'It fell flat in places.'}` : '', `Party unity leaves the hall at ${Math.round(clamp(C.unity, 0.5, 1) * 100)}%; the ticket ${d >= 0 ? 'gains' : 'loses'} about ${indSh(Math.abs(d))} points nationally.`, C.yourLine || ''].filter(Boolean) });
}
// the Alliance convention. conventionsModal (convention.js) calls it only for a new-path nominee (engine 'prim') that is not a
// bolter; it never builds a major-party convention state for the independents
function indConventionFlow(month, next) {
  const N = S.nominees && S.nominees.I; let called = false;
  const go = () => { if (!called) { called = true; next(); } };
  if (!N || N.engine !== 'prim' || (N.major && !N.heavy)) return go();
  const year = currentYear(), [city, hall] = indConvCity(+N.lean || indLabelInfo(N.label).lean), C = indConvSetup(N);
  Object.assign(C, { city, hall, clinched: (N.del || 0) >= C.need && !N.contested, unity: 1, strAdj: 0 });
  if (N.runnerUp) C.unity -= clamp((N.runnerUp.del || 0) / Math.max(1, C.pledged + C.atLarge), 0, 0.5) * 0.5;
  if (N.contested) C.unity -= 0.1;
  indConvBallot(C);
  const kick = `<div class="kicker">Independent Ballot Alliance convention · ${city}</div>`;
  const finishFloor = () => { indConvSettle(C, year); C.unity += C.unityAdj || 0; C.unity = clamp(C.unity, 0.5, 1); };
  if (!IND()) {
    // D/R careers: one front page, every choice made by the Alliance itself
    while (!C.decided) { indConvDrop(C); indConvBallot(C); }
    finishFloor(); indConvPlank(C, C.ballots.length > 1 ? 'coal' : 'pure');
    const best = Object.keys(IND_TONES).sort((a, b) => indToneFit(C, b) - indToneFit(C, a))[0]; indConvSpeech(C, best); indConvStore(C);
    showModal(`${kick}${indConvFront(C, year, month)}<div class="choices"><button class="btn primary big adv" id="ic-go">Continue</button></div>`);
    $('#ic-go').onclick = go; return;
  }
  // 1. the roll call: one screen, redrawn per ballot
  const roll = () => {
    const mv = C.decided ? {} : indConvMoves(C), w = C.decided ? C.winner : null, b = C.ballots[C.ballots.length - 1];
    const h = C.clinched ? `${N.name} by acclamation` : w ? `${w.name} wins on the ${indOrd(b.n)} ballot` : `Ballot ${b.n}: no majority`;
    const moves = C.decided ? '' : `<div class="ind-moves"><b>Your floor move</b> <small>One per ballot. ${C.moved ? 'Made for this ballot.' : 'Or just call the next ballot.'}</small><div class="choices">
      ${mv.release ? `<button class="btn" data-choice="ic:release" ${C.moved ? 'disabled' : ''}>Release ${mv.release.mine.name}'s delegates to ${mv.release.lead.name}<small>ends the fight sooner; unity +10%</small></button>` : `<button class="btn" disabled>Release your delegates<small>${N.endorsed ? 'your candidate leads or is out' : 'you endorsed no one'}</small></button>`}
      ${mv.vp ? `<button class="btn" data-choice="ic:vp" ${C.moved ? 'disabled' : ''}>Offer ${mv.vp.partner.name} the running-mate slot<small>${primN(mv.vp.bloc)} at-large delegates move to ${mv.vp.target.name}</small></button>` : `<button class="btn" disabled>Offer the running-mate slot<small>${C.vpDeal ? `already promised to ${C.vpDeal}` : 'no one to deal with'}</small></button>`}</div></div>`;
    showModal(`${kick}<h2>${h}</h2>
      <p>${month.replace(/^./, c => c.toUpperCase())}, ${hall}. ${primN(C.pledged)} pledged + ${primN(C.atLarge)} at-large · need ${primN(C.need)}. ${C.clinched ? `${N.name} won a majority in the primaries; the roll call is a formality.` : C.decided ? (C.plurality ? 'Six ballots and no majority: the rules committee hands the line to the plurality leader.' : 'A majority at last.') : 'Nobody has a majority. After each ballot the last-place candidate is eliminated and the delegates scatter by label.'}</p>
      ${indConvTableHTML(C)}${C.moves.length ? `<p class="prim-note">Before the next ballot: ${C.moves.join('; ')}.</p>` : ''}${moves}
      <div class="choices"><button class="btn primary big adv" id="ic-go">${C.decided ? 'To the platform ▶' : `Call ballot ${b.n + 1} ▶`}</button></div>`);
    $('#modal-card').querySelectorAll('[data-choice^="ic:"]').forEach(x => x.onclick = () => { if (indConvApply(C, x.dataset.choice.split(':')[1])) { sfx.click(); roll(); } });
    $('#ic-go').onclick = () => { if (C.decided) { finishFloor(); sfx.gavel(); platform(); } else { indConvDrop(C); indConvBallot(C); sfx.click(); roll(); } };
  };
  // 2. the platform
  const platform = () => {
    const pk = indConvPlanks(N);
    showModal(`${kick}<h2>The platform</h2><p>${N.name} ${indPill(N.label)} takes the line${N.upset ? ' after a floor revolt' : ''}. The platform committee has two drafts on the table${pk.ruLabel ? `: the nominee's own, and one the ${pk.ruLabel} delegates can live with` : ''}.</p>
      <div class="choices">
        <button class="btn" data-choice="ic:plank:pure">${TAG[pk.a][0]} The pure ${N.label} platform<small>${TAG[pk.a][1]} first and last: strength +0.3, unity −10%</small></button>
        <button class="btn" data-choice="ic:plank:coal">${TAG[pk.b][0]} The coalition platform<small>${TAG[pk.a][1]} and ${TAG[pk.b][1].toLowerCase()}: unity +10%, the ticket edges toward the center</small></button>
      </div><div class="choices"><button class="btn primary big adv" id="ic-go">Adopt the coalition platform ▶</button></div>`);
    const pickP = k => { indConvPlank(C, k); sfx.click(); mate(); };
    $('#modal-card').querySelectorAll('[data-choice^="ic:plank:"]').forEach(x => x.onclick = () => pickP(x.dataset.choice.split(':')[2]));
    $('#ic-go').onclick = () => pickP('coal');
  };
  // 3. the running mate: the caucus's pick (caucus.js), a floor deal, or the sitting Vice President
  const mate = () => {
    if (!N.vp && !N.incumbent && !(C.vpDeal && C.vpFor === N.name) && N.yours && typeof cauRunningMate === 'function') return cauRunningMate(speech);
    if (!N.vp) N.vp = indAutoVP(C);
    speech();
  };
  // 4. the acceptance speech
  const speech = () => {
    showModal(`${kick}<h2>The acceptance speech</h2><p>${N.name} ${indPill(N.label)}${N.vp ? ` and ${N.vp.name}` : ''} take the stage in ${city}. ${N.label === 'Independent' ? 'An independent with no label to lean on' : `The ${indLabelInfo(N.label).group}' line is "${indLabelInfo(N.label).line}"`}${C.ballots.length > 1 ? `, and the hall is still sore from ${C.ballots.length} ballots` : ''}. Pick the speech.</p>
      <div class="choices">${Object.entries(IND_TONES).map(([k, [t, s]]) => `<button class="btn" data-choice="ic:tone:${k}">${t}<small>${s}${indToneFit(C, k) >= 0.5 ? ' · the hall is ready for it' : ''}</small></button>`).join('')}</div>
      <div class="choices"><button class="btn primary big adv" id="ic-go">Let the speechwriters decide ▶</button></div>`);
    const say = t => { indConvSpeech(C, t); indConvStore(C); sfx.fanfare(); wrap(); };
    $('#modal-card').querySelectorAll('[data-choice^="ic:tone:"]').forEach(x => x.onclick = () => say(x.dataset.choice.split(':')[2]));
    $('#ic-go').onclick = () => say(Object.keys(IND_TONES).sort((a, b) => indToneFit(C, b) - indToneFit(C, a))[0]);
  };
  // 5. the front page
  const wrap = () => {
    showModal(`${kick}${indConvFront(C, year, month)}<div class="choices"><button class="btn primary big adv" id="ic-go">On to the major conventions ▶</button></div>`);
    $('#ic-go').onclick = go;
  };
  roll();
}
