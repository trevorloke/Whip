'use strict';
/* =====================================================================
   EVENTS — more breaking news on the floor (pushed into EVENTS), more
   world news between bills (HOOKS.worldNews) and interactive moments
   between bills (HOOKS.interlude). Loaded after campaign.js.
   Everything here is prefixed evt / EVT_ and stores only plain data on S:
   S.econ (−3..3), S.impeachment, S.lastVacancy, S.courtRumor,
   S.evtPledge, S.bookScrutiny, S.evtLastMoment, S.evtRedistrict,
   plus m.star / m.retireNudge on senators.
   ===================================================================== */

/* ---------------- shared helpers ---------------- */
const EVT_FLANK = { D: 'Progressives', R: 'Freedom Caucus' };
const EVT_AGENCY = { economy: 'the Commerce Department', environment: 'the EPA', security: 'the Pentagon', welfare: 'Health and Human Services', rural: 'the Agriculture Department', urban: 'HUD', taxes: 'the Treasury', tech: 'the Office of Science and Technology Policy' };
const EVT_COMMITTEES = ['Finance', 'Appropriations', 'Armed Services', 'Judiciary', 'Commerce', 'Agriculture', 'Foreign Relations', 'HELP', 'Intelligence', 'Energy and Natural Resources', 'Banking', 'Environment and Public Works'];
const EVT_NATIONS = ['Valoria', 'the Tamar Isles', 'Ostrava', 'the Kessan Republic', 'Sarnia', 'Mardova', 'Lusitania'];
const evtN = n => Math.round(n).toLocaleString('en-US');
function evtMine() { return S.members.filter(m => side(m) === 'you' && !m.b.absent && !isLockedYes(m)); }
function evtOpp() { return S.members.filter(m => side(m) === 'opp' && !m.b.absent && !isLockedYes(m)); }
function evtWarm(list, d) { for (const m of list) { m.b.bonus += d; m.b.last = d; } return list.length; }
function evtFxTop(fx) { const e = Object.entries(fx).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]; return e ? e[0] : 'economy'; }
function evtFavTag(m) { return TAGS.slice().sort((a, b) => m.w[b] - m.w[a])[0]; }
function evtSal(t, d) { S.salience = S.salience || {}; S.salience[t] = Math.max(0.5, (S.salience[t] || 1) + d); }
function evtMood(d) { S.mood = clamp(S.mood + d, -15, 15); }
function evtApproval(d) { S.president.approval = clamp(Math.round(S.president.approval + d), 18, 82); }
function evtCap(d) { S.career.capital = Math.max(0, S.career.capital + d); }
function evtLeanAdv(code, party) { return (party === 'R' ? 1 : -1) * ST[code].lean; }
function evtPlain(html) { return String(html).replace(/<[^>]+>/g, ''); }
// change the bill's issue mix and show every senator the swing (as amendments do)
function evtApplyFx(name, fx) {
  const B = S.bill, before = new Map(S.members.map(m => [m.id, support(m)]));
  for (const t in fx) B.fx[t] = (B.fx[t] || 0) + fx[t];
  B.applied.push(name);
  for (const m of S.members) m.b.last = support(m) - before.get(m.id);
}
// a senator who arrives mid-bill needs the per-bill state everyone else got at startBill, including the
// calibration offset startBill folded into everyone's mood (the average of the others' moods recovers it)
function evtFreshB(m) {
  const others = S.members.filter(x => x !== m && x.b && typeof x.b.mood === 'number');
  const off = others.length ? others.reduce((a, x) => a + x.b.mood, 0) / others.length : 0;
  m.b = { bonus: 0, mood: rnd(-12, 12) + off, intel: false, pledged: false, blackmailed: false, absent: false, touches: 0, fuzzy: has('pollster') ? rnd(-14, 14) : null, last: 0 };
  if (T(m, 'leader') && m.party !== 'I') { m.b.intel = true; m.knownTraits = true; m.b.start = leaderStance(m); }
}
// a senator on a presidential ticket (or in the primaries) can't die, resign or switch parties on the floor
function evtOnTicket(m) {
  const N = S.nominees; if (!N) return false;
  return ['D', 'R'].some(p => N[p] && (N[p].name === m.name || (N[p].vp && N[p].vp.name === m.name) || (N[p].runnerUp && N[p].runnerUp.name === m.name)));
}
function evtFixLeaders() {
  if (!S.bill) return;
  for (const m of S.members) {
    if (!m.b) evtFreshB(m);
    else if (T(m, 'leader') && m.party !== 'I' && m.b.start == null) { m.b.start = leaderStance(m); m.b.intel = true; m.knownTraits = true; }
  }
}
// moderates in states that lean hard the other way are the ones who switch parties
function evtSwitchCands(party) { return S.members.filter(m => m.party === party && m.faction === MODERATE[party] && !T(m, 'loyal') && !evtOnTicket(m) && evtLeanAdv(m.state, other(party)) >= 8); }
function evtFlipParty(m, live) {
  const from = m.party, to = other(from);
  m.party = to; m.faction = MODERATE[to];
  if (T(m, 'leader')) m.traits = m.traits.filter(t => t !== 'leader');
  m.knownTraits = true;
  hist(m, `Switched parties: left the ${PARTY[from].short} for the ${PARTY[to].short}`);
  assignBosses(); layoutSeats();
  if (live && S.bill) { if (m.b) m.b.intel = true; evtFixLeaders(); }
  return to;
}
function evtPerson(m, sub) { return `<div class="evt-person">${portrait(m)}<div><b>${m.name}</b> <small style="color:${PARTY[m.party].color}">(${m.party === 'I' ? 'I' : tagOf(m)})</small><br><small>${sub || `${m.faction} · ${ST[m.state] ? ST[m.state].name : m.state}`}</small></div></div>`; }
const EVT_MEMBER = { Progressives: 'a Progressive', 'New Democrats': 'a New Democrat', 'Labor Democrats': 'a Labor Democrat', 'Blue Dogs': 'a Blue Dog', 'Freedom Caucus': 'a Freedom Caucus conservative', Establishment: 'an Establishment Republican', Populists: 'a Populist', 'GOP Moderates': 'a GOP Moderate', Independents: 'an independent' };
function evtMemberOf(m) { return EVT_MEMBER[m.faction] || `a member of the ${m.faction}`; }
// the vote slips a day (the calendar can only stretch so far)
function evtSlip(B) { if (B.days < 10) B.days++; return B.days; }
function evtDate() { const n = S.career.bills + 1; return `${season(n)} ${billYear(n)} · Recess`; }

/* =====================================================================
   1. BREAKING NEWS ON THE FLOOR — pushed into EVENTS (see runEvent in game.js)
   ===================================================================== */
EVENTS.push(
  // a faction leader's ultimatum: change the bill or we walk
  { id: 'evt_ultimatum', w: 0.9, cond: () => !S.bill.nomination, make: () => {
    const B = S.bill, leaders = S.members.filter(m => side(m) === 'you' && T(m, 'leader') && !isLockedYes(m) && !m.b.absent && factionOf(m).length >= 2);
    const L = pick(leaders.filter(l => support(l) < 25)) || pick(leaders); if (!L) return null;
    const fx = (FACTIONS[L.party].find(f => f[0] === L.faction) || [0, {}])[1];
    const t = Object.entries(fx).sort((a, b) => b[1] - a[1])[0][0], n = factionOf(L).length;
    return { title: `${L.faction} Ultimatum`, paper: 'storm', text: `${sen(L)}, who speaks for ${n} ${L.faction}, corners you off the floor: "<b>More for ${TAG[t][1]}, in the text, by tonight — or my people walk.</b>" The ${L.faction} are ${n + 1} votes you were counting on.`, choices: [
      { t: 'Give them what they want', s: `${TAG[t][1]} +1 for everyone · ${lastName(L)} +12 (and the faction follows)`, f: () => { evtApplyFx(`${L.faction} language (${TAG[t][1]})`, { [t]: 1 }); evtWarm([L], 12); log(`You rewrote the bill for the ${L.faction}: ${TAG[t][1]} +1, ${sen(L)} +12.`, 'good'); } },
      { t: 'Call the bluff', s: 'Gamble: they fold (+6) or walk (−14, faction −3 each)', f: () => { if (Math.random() < 0.45) { evtWarm([L], 6); log(`${sen(L)} blinked. The ${L.faction} stay (+6).`, 'good'); } else { evtWarm([L], -14); evtWarm(factionOf(L).filter(x => !isLockedYes(x)), -3); log(`${sen(L)} walked out of the caucus lunch. The ${L.faction} cool (−14, −3 each).`, 'bad'); } } },
      { t: 'Promise a subcommittee gavel', s: `1 capital · ${lastName(L)} +8, relationship +1`, can: () => S.career.capital >= 1, f: () => { S.career.capital--; evtWarm([L], 8); L.rel += 1; log(`A gavel for ${sen(L)} buys peace with the ${L.faction} (+8).`, 'good'); } },
    ] };
  } },
  // an independent names their price
  { id: 'evt_indcause', w: 0.8, cond: () => !S.bill.nomination, make: () => {
    const m = randOf(x => x.party === 'I' && x.cause && !x.b.dealt && !x.b.absent && !isLockedYes(x)); if (!m) return null;
    const t = m.cause[1];
    return { title: `${lastName(m)} Names a Price`, text: `${sen(m)}, who answers to no whip, stops you by the candy desk: write <b>${m.cause[0]}</b> into the bill (${TAG[t][1]} +1) and their vote is yours. No capital, no favors, just the ink — and everyone else's math changes too.`, choices: [
      { t: 'Write it in', s: `${TAG[t][1]} +1 for everyone · ${lastName(m)} +25, known`, f: () => { evtApplyFx(`${m.cause[0]} (Sen. ${lastName(m)}'s price)`, { [t]: 1 }); m.b.dealt = true; evtWarm([m], 25); m.b.intel = true; m.knownTraits = true; unlock('deal'); log(`${m.cause[0]} goes into the bill. ${sen(m)} is all but a yea (+25).`, 'good'); } },
      { t: 'Not this bill', s: `${lastName(m)} −10`, f: () => { evtWarm([m], -10); log(`${sen(m)} shrugs and walks off (−10).`, 'bad'); } },
    ] };
  } },
  // a filibuster threat from the other side's flank, on landmark bills
  { id: 'evt_filibuster', w: 1, cond: () => S.bill.landmark && S.bill.super >= 60 && !S.bill.nomination, make: () => {
    const m = randOf(x => side(x) === 'opp' && x.faction === EVT_FLANK[other(S.side)] && !x.b.absent) || randOf(x => side(x) === 'opp' && !x.b.absent); if (!m) return null;
    const hours = ri(14, 27), flank = evtOpp().filter(x => x.faction === EVT_FLANK[other(S.side)]), mods = evtOpp().filter(x => x.faction === MODERATE[other(S.side)]);
    return { title: `${lastName(m)} Vows ${hours}-Hour Filibuster`, paper: 'night', text: `${sen(m)} wheels a cot into the cloakroom and promises to hold the floor for ${hours} hours against the ${S.bill.name}: "<b>They'll have to drag me off.</b>" The ${m.faction} cheer. Everyone else checks their flights.`, choices: [
      { t: 'Let them talk', s: 'Lose 2 actions · opinion +4 (obstruction plays badly)', f: B => { B.ap -= 2; B.opinion += 4; log(`${sen(m)} talked for ${hours} hours. You lost a day's work and won the news cycle (+4).`, 'sys'); } },
      { t: 'File cloture early', s: `2 capital · their ${EVT_FLANK[other(S.side)]} harden (−6), their moderates warm (+5)`, can: () => S.career.capital >= 2, f: () => { S.career.capital -= 2; evtWarm(flank, -6); evtWarm(mods, 5); log(`Cloture filed. The ${EVT_FLANK[other(S.side)]} fume (−6); the ${MODERATE[other(S.side)]} are relieved (+5).`, 'good'); } },
      { t: 'Trade floor time for a vote on their amendment', s: `1 action · ${lastName(m)} +6, relationship +1`, f: B => { B.ap -= 1; evtWarm([m], 6); m.rel += 1; log(`You gave ${sen(m)} a vote. They folded the cot (+6).`, 'good'); } },
    ] };
  } },
  // a whistleblower
  { id: 'evt_whistle', w: 0.7, cond: () => !S.bill.nomination, make: () => {
    const B = S.bill, t = evtFxTop(B.fx), ag = EVT_AGENCY[t];
    const claim = pick([`buried a cost estimate ${ri(30, 80)}% higher than the one Congress saw`, 'has already promised the contracts to three firms', `cannot actually spend the money for ${ri(2, 4)} years`, 'was ordered to stop answering senators\' letters']);
    return { title: `Whistleblower at ${ag}`, text: `A career official at ${ag} tells the Ledger, on the record, that the agency that would run the ${B.name} ${claim}. Both sides are quoting it by lunch.`, choices: [
      { t: 'Call an emergency hearing', s: 'Vote slips a day · opinion +6', f: B => { evtSlip(B); B.opinion += 6; log(`Your hearing on the ${ag} claims plays well (+6). The vote slips to Day ${B.days}.`, 'sys'); } },
      { t: 'Refer it to the Inspector General', s: 'Opinion −3, nothing else', f: B => { B.opinion -= 3; log('You sent the whistleblower to the IG. The story dies slowly (−3).'); } },
      { t: 'Discredit the whistleblower', s: 'Gamble: opinion +4, or −8 and scrutiny +15', f: B => { if (Math.random() < 0.5) { B.opinion += 4; log('Your staff found the whistleblower\'s old tweets. The story turned (+4).', 'good'); } else { B.opinion -= 8; B.scrutiny += 15; log('Attacking the whistleblower backfired badly (−8, scrutiny +15).', 'bad'); } } },
    ] };
  } },
  // a damning or glowing report, with a twist in the footnotes
  { id: 'evt_report', w: 0.9, cond: () => !S.bill.nomination, make: () => {
    const B = S.bill, good = Math.random() < 0.5;
    if (good) {
      const farm = S.members.filter(m => ST[m.state].voter.rural >= 1.5 && !isLockedYes(m) && !m.b.absent), bn = ri(40, 180);
      return { title: `GAO: Bill Saves $${bn} Billion`, paper: 'dawn', text: `The Government Accountability Office finds the ${B.name} would save taxpayers <b>$${bn} billion</b> over ten years. Page ${ri(140, 260)}, footnote ${ri(4, 19)}: most of the savings come out of farm programs. The ${farm.length} farm-state senators have read the footnote.`, choices: [
        { t: 'Lead with the headline', s: `Opinion +8 · farm-state senators −6`, f: B => { B.opinion += 8; evtWarm(farm, -6); log(`"$${bn} billion in savings" leads the news (+8). Farm country notices the footnote (−6).`, 'good'); } },
        { t: 'Get ahead of the footnote', s: '1 action · opinion +4, farm-state senators −2', f: B => { B.ap -= 1; B.opinion += 4; evtWarm(farm, -2); log('You briefed the farm-state offices before the press did (+4, −2).', 'good'); } },
      ] };
    }
    const codes = [...new Set(evtMine().map(m => m.state))], code = pick(codes) || pick(STATES)[0], ms = S.members.filter(m => m.state === code && !isLockedYes(m) && !m.b.absent), jobs = ri(12, 60);
    return { title: 'GAO: Costs Double', paper: 'storm', text: `The GAO says the ${B.name} costs <b>twice</b> what its sponsors claimed. Buried on page ${ri(180, 300)}: it would create about <b>${jobs},000 jobs in ${ST[code].name}</b>, most of them around ${pick(HOMETOWNS[code])}.`, choices: [
      { t: 'Change the subject to the jobs', s: `1 action · opinion −4 instead of −8 · ${ST[code].name}'s senators +12`, f: B => { B.ap -= 1; B.opinion -= 4; evtWarm(ms, 12); log(`"${jobs},000 jobs in ${ST[code].name}" blunts the GAO story (−4). ${ST[code].name} warms (+12).`, 'good'); } },
      { t: 'Dispute the math', s: 'Opinion −8, scrutiny +10', f: B => { B.opinion -= 8; B.scrutiny += 10; log('You attacked the GAO. Nobody believed you (−8).', 'bad'); } },
    ] };
  } },
  // the markets lurch
  { id: 'evt_market', w: 0.7, weight: () => (S.econ || 0) < -1 ? 1.5 : 0.7, make: () => {
    const B = S.bill, pts = ri(600, 1900), pro = (B.fx.economy || 0) > 0, swing = S.members.filter(m => T(m, 'swing') && !isLockedYes(m) && !m.b.absent);
    S.econ = clamp((S.econ || 0) - 0.3, -3, 3); evtSal('economy', 1);
    return { title: `Dow Plunges ${evtN(pts)} Points`, paper: 'storm', text: `Markets tumble ${evtN(pts)} points on ${pick(['a bad jobs report', 'a bank failure in Ohio', 'a bond-market tantrum', 'tariff talk', 'an AI stock collapse'])}. ${pro ? `Suddenly a bill with "jobs" in it looks like the grown-up thing to do.` : `Suddenly every senator wants to talk about the economy, and your bill doesn't.`}`, choices: [
      { t: pro ? 'Sell the bill as the answer' : 'Blame the other side', s: pro ? 'Opinion +7, swing-state senators +4' : 'Opinion +2', f: B => { if (pro) { B.opinion += 7; evtWarm(swing, 4); log('Your bill became the economic answer of the week (+7).', 'good'); } else { B.opinion += 2; log('You blamed the other side for the markets. Mildly convincing (+2).'); } } },
      { t: 'Add a market-stability rider', s: 'Jobs & Industry +1 for everyone', f: () => { evtApplyFx('Market Stability Rider', { economy: 1 }); log('A market-stability rider rides along (Jobs & Industry +1).', 'sys'); } },
      { t: 'Stay out of it', s: pro ? 'Opinion +3' : 'Opinion −4', f: B => { B.opinion += pro ? 3 : -4; log(pro ? 'The markets did your talking (+3).' : 'The markets ate the news cycle (−4).', pro ? 'good' : 'bad'); } },
    ] };
  } },
  // a town-hall revolt in the state that hates the bill most
  { id: 'evt_townhall', w: 0.9, cond: () => !S.bill.nomination, make: () => {
    const B = S.bill, mine = evtMine(); if (!mine.length) return null;
    const code = [...new Set(mine.map(m => m.state))].sort((a, b) => stateFit(a, B.fx) - stateFit(b, B.fx))[0];
    if (stateFit(code, B.fx) > -1.5) return null;
    const ms = mine.filter(m => m.state === code), town = pick(HOMETOWNS[code]), n = ri(300, 1400);
    return { title: `Revolt in ${town}`, paper: 'storm', text: `${sen(ms[0])}'s town hall in ${town} turns into a wall of signs and boos: ${evtN(n)} people chanting "<b>${pick(['KILL THE BILL', 'VOTE NO OR GO', `NOT IN ${code}`, 'WE REMEMBER IN NOVEMBER'])}</b>." ${ST[code].name} (${leanLabel(ST[code].lean)}) hates this bill more than any state you hold${ms.length > 1 ? ', and both your senators there felt it' : ''}.`, choices: [
      { t: `Give ${ST[code].name} something to take home`, s: `−$20M earmarks · ${ms.length > 1 ? 'both senators' : lastName(ms[0])} +12`, can: () => S.bill.pork >= 20, f: B => { B.pork -= 20; evtWarm(ms, 12); log(`A ${ST[code].name} project calms the home front (+12).`, 'good'); } },
      { t: 'Tell them to hold the line', s: 'They cool (−10); one may hold it against you', f: () => { evtWarm(ms, -10); if (Math.random() < 0.35) { const x = pick(ms); x.rel -= 1; log(`${sen(x)} resents being told to ignore ${town} (−10, relationship −1).`, 'bad'); } else log(`${ST[code].name}'s senators grit their teeth (−10).`, 'bad'); } },
      { t: 'Let them vote their state', s: 'They cool (−5) but thank you (+1 relationship)', f: () => { evtWarm(ms, -5); ms.forEach(x => x.rel += 1); log(`You loosened the leash on ${ST[code].name} (−5, relationship +1).`); } },
    ] };
  } },
  // a committee chair wants hearings
  { id: 'evt_hearings', w: 0.8, make: () => {
    const maj = isMajority(), chair = randOf(x => x.party === (maj ? S.side : other(S.side)) && !x.b.absent && !isLockedYes(x)); if (!chair) return null;
    const com = pick(EVT_COMMITTEES), yours = side(chair) === 'you';
    return { title: `${lastName(chair)} Demands Hearings`, text: `${sen(chair)}, who chairs ${com}, says the ${S.bill.name} "hasn't had a single day of hearings" and wants two before any vote. ${yours ? 'Your own chair, your own problem.' : 'The other side holds the gavel.'}`, choices: [
      { t: 'Grant the hearings', s: `Vote slips a day (another night for Sen. ${S.rival})${yours ? ` · ${lastName(chair)} +10, relationship +1` : ' · opinion +3'}`, f: B => { evtSlip(B); if (yours) { evtWarm([chair], 10); chair.rel += 1; } else B.opinion += 3; log(`Two days of ${com} hearings. The vote slips to Day ${B.days}.`, 'sys'); } },
      { t: yours ? 'Overrule the chair' : 'Buy a time agreement', s: `2 capital${yours ? ` · ${lastName(chair)} −8, relationship −1` : ''}`, can: () => S.career.capital >= 2, f: () => { S.career.capital -= 2; if (yours) { evtWarm([chair], -8); chair.rel -= 1; } log(yours ? `You rolled ${sen(chair)}. They won't forget (−8).` : 'A time agreement, bought and paid for.', yours ? 'bad' : 'sys'); } },
      { t: 'Promise hearings "next session"', s: `${lastName(chair)} −5, opinion −2`, f: B => { evtWarm([chair], -5); B.opinion -= 2; log(`${sen(chair)} knows what "next session" means (−5).`, 'bad'); } },
    ] };
  } },
  // the parliamentarian rules on a budget bill
  { id: 'evt_parliamentarian', w: 1, cond: () => S.bill.budget, make: () => {
    const B = S.bill, t = evtFxTop(B.fx), mods = evtMine().filter(m => m.faction === MODERATE[S.side]);
    return { title: 'Parliamentarian Strikes a Provision', text: `The Senate Parliamentarian rules that the ${B.name}'s <b>${TAG[t][1]}</b> language is "merely incidental" to the budget and violates the Byrd Rule. Keep it in and the bill loses its reconciliation shield; take it out and the bill changes.`, choices: [
      { t: 'Strip the provision', s: `${TAG[t][1]} −1 for everyone`, f: () => { evtApplyFx(`Byrd Rule: ${TAG[t][1]} provision stripped`, { [t]: -1 }); log(`The Parliamentarian wins: ${TAG[t][1]} −1.`, 'sys'); } },
      { t: 'Overrule the chair', s: `Norms shatter · opinion −8, opposing caucus −6, your ${MODERATE[S.side]} −5`, f: B => { B.opinion -= 8; evtWarm(evtOpp(), -6); evtWarm(mods, -5); evtMood(-0.5); log('You overruled the Parliamentarian. Institutionalists in both parties are appalled (−8).', 'bad'); } },
      { t: 'Rewrite it overnight', s: '1 action + 1 capital · the provision survives', can: () => S.career.capital >= 1, f: B => { B.ap -= 1; S.career.capital--; log(`Your drafters rewrote the ${TAG[t][1]} language to pass muster.`, 'good'); } },
    ] };
  } },
  // the House moves its own bill
  { id: 'evt_housebill', w: 0.8, cond: () => !S.bill.nomination, make: () => {
    const B = S.bill, hm = houseMaj(), yours = hm === S.side, blocs = HOUSE_FAC[hm], big = blocs.slice().sort((a, b) => b[1] - a[1])[0][0], modc = blocs[blocs.length - 1][0];
    const pr = PARTY[hm].prior, t = Object.keys(pr).sort((a, b) => pr[b] - pr[a])[0], ay = ri(218, 250), nv = ri(0, 6);
    return { title: `The House Passes Its Own Version`, text: `The ${PARTY[hm].name} House passes a rival ${B.name.split(' ').slice(0, 2).join(' ')} bill, ${ay}–${435 - ay - nv}, ${yours ? 'with far more ' + TAG[t][1] + ' in it. The Speaker wants the Senate to take the House text.' : 'built to embarrass you. The Speaker says the Senate bill is "dead on arrival" in the House.'}`, choices: yours ? [
      { t: 'Take the House language', s: `${TAG[t][1]} +1 for everyone · House odds up`, f: B => { evtApplyFx(`House language (${TAG[t][1]})`, { [t]: 1 }); B.hw[big] = (B.hw[big] || 0) + 1; log(`You pre-conferenced with the Speaker: ${TAG[t][1]} +1, House odds up.`, 'sys'); } },
      { t: 'Insist on the Senate text', s: `Your caucus +3 (Senate pride) · opinion −2 (a party at war with itself)`, f: B => { evtWarm(evtMine(), 3); B.opinion -= 2; log(`You told the Speaker the Senate writes its own bills. Your caucus liked that (+3); the papers called it a feud (−2).`, 'sys'); } },
    ] : [
      { t: 'Cut a deal with the Speaker', s: `2 capital · House odds up sharply`, can: () => S.career.capital >= 2, f: B => { S.career.capital -= 2; B.hw[big] = (B.hw[big] || 0) + 2; log('A deal with the Speaker: your bill will get a House vote.', 'good'); } },
      { t: `Work the ${modc}`, s: `1 action · House odds up a little`, f: B => { B.ap -= 1; B.hw[modc] = (B.hw[modc] || 0) + 1; log(`You worked the ${modc} directly.`, 'good'); } },
      { t: 'Dare the Speaker to kill it', s: 'Opinion +3 · opposing caucus hardens −3', f: B => { B.opinion += 3; evtWarm(evtOpp(), -3); log('You dared the Speaker. Voters like a fight; the other side closed ranks (+3, −3).', 'sys'); } },
    ] };
  } },
  // the President posts in the small hours
  { id: 'evt_presstorm', w: 0.8, make: () => {
    const P = S.president, yours = vpYours(), ap = P.approval, hour = pick(['1:47', '2:12', '3:05', '4:40']), B = S.bill;
    if (yours) {
      const hot = ap >= 50, loyal = evtMine().filter(m => T(m, 'loyal'));
      return { title: `The President Posts at ${hour} a.m.`, paper: 'night', text: hot ? `${presTitle()} fires off ${ri(7, 14)} posts praising the ${B.name} and naming the senators "who need to get on board." At ${ap}% approval, the base listens.` : `${presTitle()} spends the small hours attacking senators of their own party, by name, over the ${B.name}. At ${ap}% approval, that hurts you more than them.`, choices: hot ? [
        { t: 'Amplify it', s: '1 action · opinion +7, your loyalists +6', f: B => { B.ap -= 1; B.opinion += 7; evtWarm(loyal, 6); log(`The President's posts, amplified (+7, loyalists +6).`, 'good'); } },
        { t: 'Let it ride', s: 'Opinion +3, loyalists +3', f: B => { B.opinion += 3; evtWarm(loyal, 3); log('The President\'s posts did some good on their own (+3).', 'good'); } },
      ] : [
        { t: 'Ask the White House to stand down', s: '1 capital · opinion −2, the senators named −3', can: () => S.career.capital >= 1, f: B => { S.career.capital--; B.opinion -= 2; evtWarm(shuffle(evtMine()).slice(0, 3), -3); log('You got the posts deleted by breakfast. Some damage done (−2).', 'sys'); } },
        { t: 'Grin and bear it', s: 'Opinion −5 · three of your senators −8', f: B => { B.opinion -= 5; const hit = shuffle(evtMine()).slice(0, 3); evtWarm(hit, -8); log(`${hit.map(sen).join(', ')} woke up to presidential insults (−8).`, 'bad'); } },
      ] };
    }
    const weak = ap < 45, omods = evtOpp().filter(m => m.faction === MODERATE[other(S.side)]);
    return { title: `The President Posts at ${hour} a.m.`, paper: 'night', text: `${presTitle()} (${ap}%) calls the ${B.name} "${pick(['a disgrace', 'the worst bill in the history of the Senate, maybe ever', 'a scam cooked up by losers', 'treason, basically'])}" in ${ri(6, 14)} posts before dawn. ${weak ? 'Unpopular presidents make excellent foils.' : 'A popular President just put your bill on the ballot.'}`, choices: weak ? [
      { t: 'Pile on', s: 'Opinion +7 · your caucus +3 · their moderates +4 (embarrassed)', f: B => { B.opinion += 7; evtWarm(evtMine(), 3); evtWarm(omods, 4); log(`You made the ${ap}% President the face of the opposition (+7).`, 'good'); } },
      { t: 'Stay above it', s: 'Opinion +4, national mood +0.3', f: B => { B.opinion += 4; evtMood(0.3); log('You let the posts speak for themselves (+4).', 'good'); } },
    ] : [
      { t: 'Hit back', s: 'Gamble: opinion +5 or −6', f: B => { const win = Math.random() < 0.5; B.opinion += win ? 5 : -6; log(win ? 'Your reply to the President landed (+5).' : 'Picking a fight with a popular President went badly (−6).', win ? 'good' : 'bad'); } },
      { t: 'Ignore it', s: 'Opinion −5 · opposing caucus hardens −5', f: B => { B.opinion -= 5; evtWarm(evtOpp(), -5); log('The President\'s posts set the other side in concrete (−5).', 'bad'); } },
    ] };
  } },
  // a retirement announcement frees a senator to vote their conscience
  { id: 'evt_retire', w: 0.8, make: () => {
    const m = randOf(x => isUp(x) && !x.retireNudge && !isLockedYes(x) && !x.b.absent && x.party !== 'I'); if (!m) return null;
    const d = (Math.random() < 0.5 ? -1 : 1) * ri(10, 25), yours = side(m) === 'you';
    const announce = () => { m.retireNudge = true; m.b.intel = true; m.knownTraits = true; hist(m, 'Announced retirement from the Senate'); evtWarm([m], d); };
    return { title: `${lastName(m)} Won't Seek Re-election`, paper: 'dawn', text: `${sen(m)}, ${ageOf(m)}, announces from ${m.hometown || ST[m.state].name} that ${electionYear(nextElectionK())} will be the end: "<b>${pick(['It\'s time to go home.', 'I\'ve done what I came to do.', 'This place isn\'t what it was.', 'My grandchildren don\'t know my face.'])}</b>" With no voters left to fear, ${lastName(m)} is free to vote their conscience on your bill — whatever that turns out to be.${yours ? ` And ${ST[m.state].name} becomes an open seat your party must defend.` : ''}`, choices: [
      { t: 'Toast their career on the floor', s: `Relationship +1 · their true position is revealed`, f: () => { announce(); m.rel += 1; log(`${sen(m)} is retiring and now ${d > 0 ? 'likes' : 'hates'} your bill a little more (${fmt(d)}).`, d > 0 ? 'good' : 'bad'); } },
      { t: 'Ask for one last favor', s: `1 capital · +15 on top of wherever they land`, can: () => S.career.capital >= 1, f: () => { announce(); S.career.capital--; evtWarm([m], 15); log(`${sen(m)}, retiring, grants you one last favor (${fmt(d + 15)} all told).`, 'good'); } },
      ...(yours ? [] : [{ t: 'Court the open seat', s: `Your party's mood +0.5 (an open ${ST[m.state].name} seat)`, f: () => { announce(); evtMood(0.5); log(`${ST[m.state].name} is an open seat next year (${fmt(d)} on this bill).`, 'sys'); } }]),
    ] };
  } },
  // the Ledger's editorial board weighs in
  { id: 'evt_editorial', w: 0.8, cond: () => !S.bill.nomination, make: () => {
    const B = S.bill, pro = Math.random() < 0.5 + (B.opinion - 50) / 200, swing = S.members.filter(m => T(m, 'swing') && !isLockedYes(m) && !m.b.absent);
    return { title: pro ? 'The Ledger: Pass It' : 'The Ledger: A Bad Bill, Badly Written', paper: pro ? 'dawn' : 'storm', text: `<i>From the editorial board.</i> ${pro ? `The ${B.name} is imperfect, as all laws are, but the Senate has spent ${B.day} day${B.day > 1 ? 's' : ''} proving it can still do hard things. <b>Senators should pass it.</b>` : `The ${B.name} was written in a hurry by people who will not read it. It rewards the loud and bills the quiet. <b>Senators should send it back.</b>`} Every office in the building gets the paper.`, choices: pro ? [
      { t: 'Reprint it in every state', s: '1 action · opinion +9, swing-state senators +4', f: B => { B.ap -= 1; B.opinion += 9; evtWarm(swing, 4); log('The editorial ran in 40 newspapers by your arrangement (+9).', 'good'); } },
      { t: 'Enjoy it quietly', s: 'Opinion +6', f: B => { B.opinion += 6; log('The Ledger endorsed the bill (+6).', 'good'); } },
    ] : [
      { t: 'Write a rebuttal op-ed', s: '1 action · opinion −3 instead of −7', f: B => { B.ap -= 1; B.opinion -= 3; log('Your op-ed answered the Ledger point by point (−3).', 'sys'); } },
      { t: 'Ignore the ink-stained wretches', s: 'Opinion −7', f: B => { B.opinion -= 7; log('The Ledger\'s editorial was read aloud on the floor by the other side (−7).', 'bad'); } },
    ] };
  } },
  // a foreign leader's visit
  { id: 'evt_foreign', w: 0.6, make: () => {
    const B = S.bill, nation = pick(EVT_NATIONS), leader = pick(['Prime Minister', 'President', 'Chancellor']), sec = (B.fx.security || 0) > 0;
    const vain0 = S.members.filter(m => (T(m, 'vain') || T(m, 'ambitious')) && !isLockedYes(m) && !m.b.absent), vain = vain0.length ? vain0 : shuffle(evtMine()).slice(0, 3);
    return { title: `${leader} of ${nation} Addresses Congress`, paper: 'dawn', text: `The ${leader} of ${nation} addresses a joint session at noon; the floor is closed for the speech and every senator wants a photo in the receiving line. ${sec ? 'The speech praises American resolve — and your bill is about exactly that.' : 'Nobody will talk about your bill for a day.'}`, choices: [
      { t: 'Work the receiving line', s: `1 action · camera-hungry senators +6`, f: B => { B.ap -= 1; evtWarm(vain, 6); log(vain.length ? `You worked the receiving line: ${vain.length} camera-hungry senators glowed (+6).` : 'You worked the receiving line, but every camera-hungry senator was already committed.', vain.length ? 'good' : 'sys'); } },
      { t: 'Skip the speech and whip', s: 'Opinion −2 (it looked rude)', f: B => { B.opinion -= 2; log(`You skipped the ${leader}'s speech. The Ledger noticed (−2).`, 'bad'); } },
      ...(sec ? [{ t: 'Tie the bill to the alliance', s: 'Opinion +6 · Defense & Border salience +1', f: B => { B.opinion += 6; evtSal('security', 1); log(`"${nation} is watching." Your bill became a test of resolve (+6).`, 'good'); } }] : []),
    ] };
  } },
  // a staffer leaks
  { id: 'evt_leak', w: 0.7, make: () => {
    return { title: 'Your Whip Count Leaks', text: `A ${pick(['24-year-old legislative correspondent', 'disgruntled scheduler', 'former intern now at a lobbying shop'])} on your staff hands the Ledger your whip count, complete with margin notes ("<i>${pick(['greedy — give pork', 'thin-skinned, DO NOT TWIST', 'owes us, remind him', 'vain: photo op'])}</i>"). Scrutiny is going up either way; the only question is how much.`, choices: [
      { t: 'Fire the leaker publicly', s: 'Scrutiny +10 net · your caucus −2 (nervous)', f: B => { B.scrutiny += 10; evtWarm(evtMine(), -2); log('You fired the leaker on camera. Your colleagues wonder what else is in the notebook (−2).', 'bad'); } },
      { t: 'Circle the wagons', s: 'Scrutiny +20 · opinion −4', f: B => { B.scrutiny += 20; B.opinion -= 4; log('"No comment on internal documents." The leak dominated the day (−4).', 'bad'); } },
      { t: 'Leak a better count back', s: 'Scrutiny +25 · opinion +5', f: B => { B.scrutiny += 25; B.opinion += 5; log('Your counter-leak showed a bill cruising to passage. It isn\'t, yet (+5).', 'sys'); } },
    ] };
  } },
  // a bipartisan gang forms
  { id: 'evt_gang', w: 0.7, cond: () => !S.bill.nomination, make: () => {
    const all = S.members.filter(m => m.party !== 'I' && m.faction === MODERATE[m.party] && !isLockedYes(m) && !m.b.absent);
    if (all.length < 4) return null;
    const gang = shuffle(all.slice()).slice(0, Math.min(all.length, ri(6, 10)));
    const names = shuffle(gang.slice()).slice(0, 2).map(m => `Sen. ${lastName(m)} (${tagOf(m)})`).join(' and '), flank = evtMine().filter(m => m.faction === EVT_FLANK[S.side]);
    return { title: `A Gang of ${gang.length} Forms`, paper: 'dawn', text: `${names} convene a bipartisan "gang" of ${gang.length} ${MODERATE.D} and ${MODERATE.R} in a hideaway office off the Rotunda. They want a compromise on the ${S.bill.name}, and they want the credit.`, choices: [
      { t: 'Bless the gang', s: `Moderates on both sides +10 · your ${EVT_FLANK[S.side]} −4`, f: () => { evtWarm(gang, 10); evtWarm(flank, -4); unlock('evt_gang'); log(`You blessed the Gang of ${gang.length} (+10). The ${EVT_FLANK[S.side]} grumble (−4).`, 'good'); } },
      { t: 'Co-opt it', s: '1 action + 1 capital · moderates +14, opinion +4', can: () => S.career.capital >= 1, f: B => { B.ap -= 1; S.career.capital--; evtWarm(gang, 14); B.opinion += 4; unlock('evt_gang'); log(`You wrote the gang's compromise yourself (+14, opinion +4).`, 'good'); } },
      { t: 'Freeze them out', s: 'Moderates +4 anyway · opinion −3', f: B => { evtWarm(gang, 4); B.opinion -= 3; log('You iced the gang. It met anyway (+4, opinion −3).', 'bad'); } },
    ] };
  } },
  // news from the front
  { id: 'evt_warnews', w: 1, cond: () => !!S.war, make: () => {
    const W = S.war, B = S.bill, bad = Math.random() < 0.6, sec = (B.fx.security || 0) > 0, bySec = S.members.filter(m => !isLockedYes(m) && !m.b.absent).sort((a, b) => b.w.security - a.w.security), hawks = bySec.slice(0, 16), doves = bySec.slice(-8).filter(m => m.w.security < 0);
    const n = ri(3, 19);
    const fxs = sec ? `hawks ${bad ? '+8' : '+5'}, doves ${bad ? '−6' : '−2'}` : bad ? 'hawks −4' : '';
    const apply = () => { W.support = clamp(W.support + (bad ? -ri(3, 8) : ri(3, 8)), 5, 90); evtSal('security', 2); if (sec) { evtWarm(hawks, bad ? 8 : 5); evtWarm(doves, bad ? -6 : -2); } else evtWarm(hawks, bad ? -4 : 0); };
    return { title: bad ? `${n} Americans Killed in ${W.place}` : `Breakthrough in ${W.place}`, paper: bad ? 'night' : 'dawn', text: bad ? `A ${pick(['roadside bomb', 'drone strike on a forward base', 'helicopter crash', 'ambush outside the capital'])} kills ${n} U.S. service members in ${W.place}, month ${W.months} of the war. Flags come down to half-staff; ${sec ? 'hawks say your bill is how you honor them' : 'nobody is in the mood for your bill'}.` : `U.S. forces take ${pick(['the provincial capital', 'the last rebel stronghold', 'the port', 'the mountain passes'])} in ${W.place} with light casualties. ${presTitle()} declares "the tide has turned."${sec ? ' Hawks want to press the advantage in your bill.' : ''}`, choices: [
      { t: bad ? 'A moment of silence, then press on' : 'Congratulate the troops', s: fxs ? fxs.charAt(0).toUpperCase() + fxs.slice(1) : 'No effect on the bill', f: () => { apply(); log(bad ? `${n} dead in ${W.place}. The Senate paused (war support ${W.support}%).` : `Good news from ${W.place} (war support ${W.support}%).`, 'sys'); } },
      { t: 'Tie the bill to the troops', s: `1 action · opinion ${sec ? '+6' : '−3'}${fxs ? ' · ' + fxs : ''}`, f: B => { apply(); B.ap -= 1; B.opinion += sec ? 6 : -3; log(sec ? 'You made the bill about the troops (+6).' : 'You tried to make the bill about the troops. It isn\'t (−3).', sec ? 'good' : 'bad'); } },
      { t: 'Call for a war debate', s: `Vote slips a day · war support −2${W.party !== S.side ? ' · opinion +3' : ''}${fxs ? ' · ' + fxs : ''}`, f: B => { apply(); evtSlip(B); W.support = clamp(W.support - 2, 5, 90); if (W.party !== S.side) B.opinion += 3; log(`A day of war debate; the vote slips to Day ${B.days}.`, 'sys'); } },
    ] };
  } },
  // the Supreme Court rules mid-fight
  { id: 'evt_scotus', w: 0.6, cond: () => !S.bill.nomination && S.court.length >= 5, make: () => {
    const B = S.bill, t = evtFxTop(B.fx), n = S.court.length, tied = courtCount(S.side) === courtCount(other(S.side));
    const mine = tied ? Math.random() < 0.5 : courtCount(S.side) > courtCount(other(S.side));
    const maj = Math.min(n, Math.max(Math.ceil((n + 1) / 2), mine ? courtCount(S.side) : courtCount(other(S.side))));
    const cases = { economy: 'a sweeping challenge to federal regulatory power', environment: 'the EPA\'s authority over power-plant emissions', security: 'warrantless searches at the border', welfare: 'a state\'s Medicaid work requirements', rural: 'federal control of Western water rights', urban: 'local rent-control laws', taxes: 'the constitutionality of a wealth tax', tech: 'liability for what platforms recommend' };
    const flank = evtMine().filter(m => m.faction === EVT_FLANK[S.side]);
    return { title: `Supreme Court Rules ${maj}–${n - maj}`, paper: mine ? 'dawn' : 'storm', text: `Mid-fight, the Court (${courtLabel()}) hands down ${cases[t]}. The ${mine ? PARTY[S.side].name : PARTY[other(S.side)].name} appointees carry the day${tied ? ' with a single crossover vote' : ''}, and the opinion lands squarely on your bill's ${TAG[t][1]} provisions: <b>${mine ? 'it blesses your approach' : 'it cuts the legs out from under you'}</b>.`, choices: mine ? [
      { t: 'Make the ruling your argument', s: '1 action · opinion +9, your caucus +4', f: B => { B.ap -= 1; B.opinion += 9; evtWarm(evtMine(), 4); log(`"Even the Supreme Court agrees." (+9)`, 'good'); } },
      { t: 'Take the win quietly', s: 'Opinion +5', f: B => { B.opinion += 5; log('The Court\'s ruling helped your bill (+5).', 'good'); } },
    ] : [
      { t: 'Rally against the Court', s: `Your ${EVT_FLANK[S.side]} +8 · opinion −5`, f: B => { evtWarm(flank, 8); B.opinion -= 5; log(`You attacked the Court. The ${EVT_FLANK[S.side]} loved it (+8); voters didn't (−5).`, 'sys'); } },
      { t: 'Rewrite around the ruling', s: `1 action · ${TAG[t][1]} −1 for everyone, opinion +2`, f: B => { B.ap -= 1; evtApplyFx(`Court fix (${TAG[t][1]})`, { [t]: -1 }); B.opinion += 2; log(`You rewrote the ${TAG[t][1]} language to survive the Court (+2).`, 'sys'); } },
      { t: 'Shrug', s: 'Opinion −6 · opposing caucus +4', f: B => { B.opinion -= 6; evtWarm(evtOpp(), 4); log('The Court\'s ruling handed the other side a talking point (−6).', 'bad'); } },
    ] };
  } },
  // a death or resignation (rare): the governor appoints a successor
  { id: 'evt_death', w: 0.15, make: () => {
    const dies = Math.random() < 0.55, pool = S.members.filter(m => !isLockedYes(m) && !m.b.absent && m.party !== 'I' && !evtOnTicket(m));
    const m = dies ? (pick(pool.filter(x => ageOf(x) >= 68)) || pick(pool)) : pick(pool); if (!m) return null;
    const gov = S.governors[m.state], age = ageOf(m);
    const reason = dies ? pick(['died in office', 'died suddenly of a heart attack', 'died after a short illness']) : pick(['resigned to become ambassador to Ireland', 'resigned under a federal indictment', 'resigned to run a foundation', 'resigned, citing exhaustion']);
    let done = false;
    const vacate = () => {
      if (done) return; done = true;
      S.formers = S.formers || [];
      hist(m, dies ? `Died in office at ${age}` : `Resigned from the Senate`);
      if (!dies) S.formers.push({ ...m, b: undefined });
      const line = vacateSeat(m, reason), nm = S.members[m.id];
      evtFreshB(nm); evtFixLeaders();
      S.lastVacancy = { id: m.id, name: nm.name, old: m.name, reason, bill: S.bill.n };
      log(evtPlain(line), 'sys'); toast(`${nm.name} is sworn in for ${ST[m.state].name}.`);
    };
    const govLine = gov ? `Gov. ${gov.name} (${gov.party}) ${gov.party !== m.party ? '<b>will name a successor from the other party</b>' : 'will name a successor'}` : 'A successor will be named';
    return { title: dies ? `Senator ${lastName(m)} Dies at ${age}` : `${lastName(m)} Resigns`, paper: dies ? 'night' : 'storm', text: dies ? `${sen(m)}, ${evtMemberOf(m)} who came to the Senate in ${((m.history || []).find(h => /U\.S\. Senate/.test(h.t)) || { y: billYear(1) }).y}, ${reason} overnight. The chamber falls silent; a black drape goes over the desk. ${govLine} to the ${ST[m.state].name} seat.` : `${sen(m)} ${reason}, effective immediately. ${govLine} to the ${ST[m.state].name} seat${gov && gov.party !== m.party ? ' — the seat flips' : ''}.`, choices: dies ? [
      { t: 'Adjourn in their memory', s: 'The Senate loses the day · the vote slips a day', f: B => { vacate(); B.ap = 0; evtSlip(B); log(`The Senate adjourned for Sen. ${lastName(m)}. The vote slips to Day ${B.days}.`, 'sys'); } },
      { t: 'A moment of silence, then back to work', s: 'Opinion −4: it looks cold', f: B => { vacate(); B.opinion -= 4; log('You pressed on through the mourning. It looked cold (−4).', 'bad'); } },
    ] : [
      { t: /indictment/.test(reason) ? 'Say as little as possible' : 'Thank them for their service', s: `${gov ? `Gov. ${lastName(gov)}` : 'The governor'} names the successor`, f: () => vacate() },
      { t: 'Call the governor about the pick', s: '1 capital · the appointee arrives known, relationship +1', can: () => S.career.capital >= 1, f: () => { vacate(); S.career.capital--; const nm = S.members[m.id]; nm.rel += 1; nm.b.intel = true; nm.knownTraits = true; log(`You had a word with the governor. ${nm.name} arrives owing you a small one.`, 'good'); } },
    ] };
  } },
  // a party switch (rare)
  { id: 'evt_switch', w: 0.15, make: () => {
    const cands = evtSwitchCands('D').concat(evtSwitchCands('R')).filter(m => !isLockedYes(m) && !m.b.absent && !evtOnTicket(m));
    const m = pick(cands); if (!m) return null;
    const from = m.party, to = other(from), toYou = to === S.side, dA = seats('D') + (to === 'D' ? 1 : -1), rA = seats('R') + (to === 'R' ? 1 : -1);
    let done = false;
    const flip = () => { if (done) return; done = true; evtFlipParty(m, true); evtMood(toYou ? 1 : -1); if (toYou) unlock('evt_switch'); log(`${sen(m)} switched parties. The Senate is now ${dA}D–${rA}R${seats('I') ? `–${seats('I')}I` : ''}.`, toYou ? 'good' : 'bad'); };
    return { title: `${lastName(m)} Switches Parties`, paper: toYou ? 'dawn' : 'storm', text: `At a hastily called press conference in ${m.hometown || ST[m.state].name}, ${sen(m)}, ${evtMemberOf(m)} from a state that is ${leanLabel(ST[m.state].lean)}, announces they are leaving the ${PARTY[from].short} for the ${PARTY[to].short}: "<b>${pick(['I didn\'t leave the party. The party left me.', 'My state deserves a senator whose calls get returned.', 'I\'ve voted with them for two years. I might as well caucus with them.', 'This isn\'t about me. It\'s about ' + ST[m.state].name + '.'])}</b>" The Senate will stand ${dA}D–${rA}R.`, choices: toYou ? [
      { t: 'Welcome them with a committee seat', s: '1 capital · relationship +2 · national mood +1', can: () => S.career.capital >= 1, f: () => { flip(); S.career.capital--; m.rel += 2; } },
      { t: 'A handshake and a back-row desk', s: 'They join · national mood +1', f: () => flip() },
    ] : [
      { t: 'Burn the bridge', s: 'They hold a grudge · your caucus rallies (+4) · mood −1', f: () => { flip(); m.grudge = true; m.rel -= 2; evtWarm(evtMine(), 4); } },
      { t: 'Keep the door open', s: 'Relationship +1 · your caucus is shaken (−3) · mood −1', f: () => { flip(); m.rel += 1; evtWarm(evtMine(), -3); } },
    ] };
  } },
  // a blizzard shuts Washington
  { id: 'evt_snow', w: 0.6, make: () => {
    const inches = ri(9, 26);
    return { title: `${inches} Inches Bury Washington`, paper: 'night', text: `A nor'easter drops ${inches} inches on the capital overnight. The Metro is closed, Reagan National is a parking lot, and Sen. ${S.rival} is stuck ${pick(['at O\'Hare', 'in Denver', 'on a runway in Atlanta', 'at a Hampton Inn in Newark'])}. Half the Senate can't get in; the other half won't.`, choices: [
      { t: 'Close the Senate for the day', s: 'Nobody works today · the vote slips a day', f: B => { B.ap = 0; evtSlip(B); log(`Snow day. The vote slips to Day ${B.days}.`, 'sys'); } },
      { t: 'Trudge in through the snow', s: `Lose 2 actions · Sen. ${S.rival} is snowed in: no overnight pressure tonight`, f: B => { B.ap -= 2; B.plan = []; log(`You whipped in snow boots while Sen. ${S.rival} sat in an airport. No rival moves tonight.`, 'good'); } },
    ] };
  } },
  // a viral floor speech by one of yours
  { id: 'evt_viralspeech', w: 0.8, make: () => {
    const m = randOf(x => side(x) === 'you' && !x.b.absent && (T(x, 'vain') || T(x, 'ambitious'))) || randOf(x => side(x) === 'you' && !x.b.absent); if (!m) return null;
    const views = ri(6, 40), mins = ri(4, 14);
    const go = () => { m.star = true; hist(m, `Floor speech on the ${S.bill.name} went viral`); S.bill.opinion += 6; if (!isLockedYes(m)) evtWarm([m], 10); };
    return { title: `${lastName(m)}'s Speech Goes Viral`, paper: 'dawn', text: `${sen(m)}'s ${mins}-minute floor speech on the ${S.bill.name} — "<b>${pick(['Look them in the eye and tell them no.', 'I didn\'t come here to be comfortable.', 'Count me. Then count again.', 'This is the whole job. Right here.'])}</b>" — has ${views} million views by morning. ${lastName(m)} is suddenly a star.`, choices: [
      { t: 'Book them on every Sunday show', s: '1 action · opinion +10, relationship +1', f: B => { B.ap -= 1; go(); B.opinion += 4; m.rel += 1; log(`${sen(m)} did all five Sunday shows (+10).`, 'good'); } },
      { t: 'Let the clip speak', s: 'Opinion +6', f: () => { go(); log(`${sen(m)}'s speech carried the bill for a day (+6).`, 'good'); } },
    ] };
  } },
  // a state-by-state poll on the bill
  { id: 'evt_statepoll', w: 0.8, make: () => {
    const B = S.bill, clear = S.members.filter(m => !m.b.intel && !isLockedYes(m) && Math.abs(stateFit(m.state, B.fx)) >= 2);
    if (clear.length < 3) return null;
    const sorted = shuffle(clear.slice()).sort((a, b) => Math.abs(stateFit(b.state, B.fx)) - Math.abs(stateFit(a.state, B.fx)));
    const reveal = n => { const got = sorted.slice(0, n); got.forEach(m => { m.b.intel = true; m.knownTraits = true; }); return got; };
    const pro = STATES.filter(([c]) => stateFit(c, B.fx) > 2).length, con = STATES.filter(([c]) => stateFit(c, B.fx) < -2).length;
    return { title: 'A 50-State Poll Lands', text: `A new survey maps the ${B.name} state by state: it polls above water in <b>${pro}</b> states and underwater in <b>${con}</b>. Where opinion is lopsided, you can guess how a senator will vote — the crosstabs say exactly which ones.`, choices: [
      { t: 'Buy the crosstabs', s: '1 capital · intel on up to 8 senators', can: () => S.career.capital >= 1, f: () => { S.career.capital--; const g = reveal(8); log(`The crosstabs reveal where ${g.length} senators stand: ${g.map(x => lastName(x)).join(', ')}.`, 'good'); } },
      { t: 'Read the free toplines', s: 'Intel on 3 senators', f: () => { const g = reveal(3); log(`The toplines reveal ${g.map(sen).join(', ')}.`, 'good'); } },
    ] };
  } },
  // a megadonor calls
  { id: 'evt_donor', w: 0.7, cond: () => !S.bill.nomination, make: () => {
    const B = S.bill, pr = PARTY[S.side].prior, t = Object.keys(pr).filter(k => pr[k] > 0 && (B.fx[k] || 0) <= 0).sort((a, b) => pr[b] - pr[a])[0] || Object.keys(pr).sort((a, b) => pr[b] - pr[a])[0];
    const donor = pick(['a hedge-fund billionaire', 'a casino magnate', 'a shipping heiress', 'the founder of a crypto exchange', 'a retired oilman']), m = ri(20, 90);
    return { title: 'A Donor Calls', text: `${donor.charAt(0).toUpperCase() + donor.slice(1)} who wrote your party $${m} million last cycle calls the cloakroom phone: the ${B.name} does nothing for <b>${TAG[t][1]}</b>, and "<b>the checkbook is closed until it does.</b>"`, choices: [
      { t: 'Tell them to pound sand', s: 'Opinion +3 · national mood +0.5 (the story leaks, voters love it)', f: B => { B.opinion += 3; evtMood(0.5); log(`You hung up on ${donor}. Voters approve (+3).`, 'good'); } },
      { t: 'Add their pet provision', s: `${TAG[t][1]} +1 for everyone · +1 campaign cash next election · scrutiny +10`, f: B => { evtApplyFx(`${TAG[t][1]} rider (a donor's request)`, { [t]: 1 }); S.warchest = (S.warchest || 0) + 1; B.scrutiny += 10; log(`A ${TAG[t][1]} rider, courtesy of ${donor}. The checkbook reopens.`, 'sys'); } },
      { t: 'Take the check, keep the bill', s: '+1 campaign cash next election · scrutiny +25', f: B => { S.warchest = (S.warchest || 0) + 1; B.scrutiny += 25; log(`You took ${donor}'s money and changed nothing. Reporters are asking.`, 'bad'); } },
    ] };
  } },
  // a hot-mic moment
  { id: 'evt_hotmic', w: 0.7, make: () => {
    const m = randOf(x => side(x) === 'you' && !x.b.absent); if (!m) return null;
    const quote = pick([`this bill is a turd sandwich and we're all taking a bite`, `half my caucus couldn't find the Capitol with a map`, `${S.rival} has the IQ of a houseplant`, `the whip's count is held together with duct tape and prayer`, `my constituents will believe anything if I say it slowly`]);
    return { title: `Hot Mic Catches ${lastName(m)}`, paper: 'storm', text: `A studio microphone catches ${sen(m)} between interviews: "<b>…${quote}.</b>" The clip is everywhere by noon. Opinion −6.`, choices: [
      { t: 'Make them apologize', s: 'Opinion −2 net · relationship −1', f: B => { B.opinion -= 2; m.rel -= 1; log(`${sen(m)} apologized through gritted teeth (−2).`, 'sys'); } },
      { t: 'Laugh it off', s: `Opinion −6 · ${lastName(m)} +6, relationship +1`, f: B => { B.opinion -= 6; if (!isLockedYes(m)) evtWarm([m], 6); m.rel += 1; log(`You laughed off ${lastName(m)}'s hot mic. They owe you (+6).`, 'good'); } },
    ] };
  } },
  // the late-night roast
  { id: 'evt_roast', w: 0.5, make: () => {
    const show = pick(['a late-night host', 'the Saturday sketch show', 'the most-downloaded comedy podcast in America']), B = S.bill;
    return { title: 'Late Night Roasts the Bill', paper: 'night', text: `${show.charAt(0).toUpperCase() + show.slice(1)} spends ${ri(6, 11)} minutes on the ${B.name}: ${pick(['a senator played by a man in a bathrobe', 'the whip count performed as a magic trick', 'your bill read aloud as a bedtime story', 'a musical number about earmarks'])}. ${evtN(ri(8, 30))} million people laughed.`, choices: [
      { t: 'Go on the show yourself', s: 'Gamble: opinion +4 or −9', f: B => { const win = Math.random() < 0.6; B.opinion += win ? 4 : -9; log(win ? 'You killed on late night. The bill is cool now (+4).' : 'You bombed on late night. Painfully (−9).', win ? 'good' : 'bad'); } },
      { t: 'Ignore it', s: 'Opinion −5', f: B => { B.opinion -= 5; log('The roast ran all week (−5).', 'bad'); } },
    ] };
  } },
  // a procedural trap by the opposing whip
  { id: 'evt_trap', w: 0.8, make: () => {
    const B = S.bill, trick = pick(['raises a point of order against the whole bill', 'demands a live quorum call at 11:40 p.m.', 'forces a vote on a motion to recommit', 'objects to every unanimous consent request for 48 hours', 'files 212 amendments and asks to debate each one']);
    const unused = () => B.amends.filter(a => !a.used);
    return { title: `${S.rival.split(' ')[1] || S.rival} Springs a Trap`, paper: 'night', text: `Sen. ${S.rival}, the ${RIVAL_STYLES[rivalStyle()][0]}, ${trick}. It's a stunt, but stunts eat floor time, and floor time is the only thing you can't buy more of.`, choices: [
      { t: 'Fight it on the floor', s: 'Lose 2 actions', f: B => { B.ap -= 2; log(`You fought ${S.rival}'s trap for most of the day.`, 'bad'); } },
      { t: 'Give up an amendment', s: 'One of your unused amendments is withdrawn', can: () => unused().length > 0, f: () => { const a = pick(unused()); a.used = true; log(`You withdrew the ${a.name} to clear ${S.rival}'s objection.`, 'sys'); } },
      { t: 'Cut a procedural deal', s: '1 capital', can: () => S.career.capital >= 1, f: () => { S.career.capital--; log(`A quiet deal lifted ${S.rival}'s trap.`); } },
    ] };
  } },
  // the nominee's past surfaces (confirmation fights)
  { id: 'evt_nominee', w: 1, cond: () => S.bill.nomination && !!S.nominee, make: () => {
    const B = S.bill, omods = evtOpp().filter(m => m.faction === MODERATE[other(S.side)]), yr = ri(1998, 2016);
    return { title: `Judge ${lastName(S.nominee)}'s ${yr} Memo`, paper: 'storm', text: `A ${yr} memo surfaces in which Judge ${S.nominee.name} ${pick(['called a landmark precedent "a mistake we will someday correct"', 'argued the Senate "should rarely defer" to the President', 'joked about "the three branches: the one that matters and two others"', 'described a whole area of law as "mostly vibes"'])}. The other side calls it disqualifying. Opinion −6.`, choices: [
      { t: 'Release the full record', s: '1 action · opinion −2 net, your caucus +3', f: B => { B.ap -= 1; B.opinion -= 2; evtWarm(evtMine(), 3); log('You released every page. Context helped (−2 net).', 'sys'); } },
      { t: 'Call it a smear', s: 'Opinion −6 · your caucus +4, their moderates −4', f: B => { B.opinion -= 6; evtWarm(evtMine(), 4); evtWarm(omods, -4); log('"A smear." Your caucus rallied; their moderates recoiled.', 'sys'); } },
      { t: 'Let the nominee answer in writing', s: 'Vote slips a day · opinion −3 net', f: B => { evtSlip(B); B.opinion -= 3; log(`Written answers bought the nominee a day. The vote slips to Day ${B.days}.`, 'sys'); } },
    ] };
  } },
  // the majority fills the amendment tree (minority only)
  { id: 'evt_tree', w: 0.8, cond: () => !isMajority() && !S.bill.nomination && S.bill.amends.some(a => !a.used), make: () => {
    const B = S.bill, unused = () => B.amends.filter(a => !a.used);
    return { title: 'Majority Fills the Amendment Tree', text: `The ${PARTY[other(S.side)].name} leader fills the amendment tree with placeholder amendments, blocking yours: ${unused().map(a => a.name).join(', ')}. In the minority, the floor is theirs.`, choices: [
      { t: 'Accept it', s: 'Your amendments are dead · opinion +2 (you look reasonable)', f: B => { unused().forEach(a => a.used = true); B.opinion += 2; log('Your amendments died in the tree (+2 for grace).', 'bad'); } },
      { t: 'Force a vote to table', s: '2 capital · keep your amendments', can: () => S.career.capital >= 2, f: () => { S.career.capital -= 2; log('You won a vote to clear the tree. Your amendments live.', 'good'); } },
      { t: 'Trade: keep one', s: 'All but one amendment withdrawn', can: () => unused().length >= 2, f: () => { const u = unused(); u.slice(1).forEach(a => a.used = true); log(`You kept the ${u[0].name}; the rest are gone.`, 'sys'); } },
    ] };
  } },
  // a unanimous-consent objection (majority only)
  { id: 'evt_uc', w: 0.8, cond: () => isMajority() && !S.bill.nomination, make: () => {
    const m = randOf(x => side(x) === 'opp' && !x.b.absent && !isLockedYes(x)); if (!m) return null;
    const t = evtFavTag(m);
    return { title: `${lastName(m)} Objects`, text: `You ask unanimous consent to skip the reading of the ${S.bill.name} and go straight to debate. "<b>Objection,</b>" says ${sen(m)}, and the clerk begins reading all ${evtN(ri(300, 1800))} pages aloud. ${lastName(m)} wants a vote on a ${TAG[t][1]} amendment.`, choices: [
      { t: 'Give them their amendment vote', s: `${TAG[t][1]} +1 for everyone · ${lastName(m)} +12`, f: () => { evtApplyFx(`${lastName(m)} amendment (${TAG[t][1]})`, { [t]: 1 }); evtWarm([m], 12); log(`${sen(m)}'s amendment got a vote and passed (+12).`, 'sys'); } },
      { t: 'Let the clerk read', s: 'Lose 1 action', f: B => { B.ap -= 1; log(`The clerk read for ${ri(5, 11)} hours. ${sen(m)} smirked.`, 'bad'); } },
      { t: 'Lean on them', s: `1 capital · ${lastName(m)} +8, relationship −1`, can: () => S.career.capital >= 1, f: () => { S.career.capital--; evtWarm([m], 8); m.rel -= 1; log(`You leaned on ${sen(m)}. The objection vanished (+8, relationship −1).`, 'sys'); } },
    ] };
  } },
  // the Vice President camps out in the Senate (your White House, simple-majority bills)
  { id: 'evt_vpwhip', w: 0.7, cond: () => vpYours() && !S.bill.super && !!S.vp, make: () => {
    const V = S.vp, vf = V.faction || null, fac = S.members.filter(m => m.party === S.side && vf && m.faction === vf && !isLockedYes(m) && !m.b.absent);
    const fence = S.members.filter(m => Math.abs(support(m)) < 15 && !isLockedYes(m) && !m.b.absent && m.party !== 'I').sort((a, b) => (b.faction === V.faction ? 1 : 0) - (a.faction === V.faction ? 1 : 0));
    return { title: `Vice President ${lastName(V)} Moves In`, paper: 'dawn', text: `Vice President ${V.name} sets up in the ceremonial office off the floor "for as long as it takes," ready to break a tie${vf ? ` — and to twist a few arms of fellow ${vf}. ${fac.length} of your senators share the VP's faction` : ''}.`, choices: [
      { t: 'Send the VP to a fence-sitter', s: `1 action · ${fence[0] ? sen(fence[0]) : 'nobody'} +12${vf ? ', VP\'s faction +4' : ''}`, can: () => fence.length > 0, f: B => { B.ap -= 1; evtWarm([fence[0]], 12); evtWarm(fac.filter(m => m !== fence[0]), 4); log(`Vice President ${lastName(V)} worked ${sen(fence[0])} (+12).`, 'good'); } },
      { t: 'Keep the VP in the chair', s: `Your caucus +2${vf ? ', VP\'s faction +4 more' : ''}`, f: () => { evtWarm(evtMine(), 2); evtWarm(fac, 4); log(`The Vice President presides. Your caucus stands a little straighter (+2).`, 'good'); } },
    ] };
  } },
  // the opposing White House counter-offers (their White House)
  { id: 'evt_whcounter', w: 0.8, cond: () => !vpYours() && !S.bill.nomination, make: () => {
    const mods = evtMine().filter(m => m.faction === MODERATE[S.side]), pv = presVec(), t = TAGS.slice().sort((a, b) => pv[b] - pv[a])[0];
    if (mods.length < 2) return null;
    return { title: 'Breakfast at the White House', paper: 'night', text: `${presTitle()} invites ${mods.length} of your ${MODERATE[S.side]} to breakfast in the Residence: eggs, a tour, and a quiet pitch to vote no on the ${S.bill.name}. ${pick(['Nobody says no to the Residence.', 'The French toast is said to be excellent.', 'Two of them bring their spouses.'])}`, choices: [
      { t: 'Crash the breakfast', s: `1 capital · your ${MODERATE[S.side]} +2 (flattered by all the attention)`, can: () => S.career.capital >= 1, f: () => { S.career.capital--; evtWarm(mods, 2); log(`You showed up at the White House uninvited. The ${MODERATE[S.side]} were amused (+2).`, 'good'); } },
      { t: 'Let them eat', s: `Your ${MODERATE[S.side]} −6`, f: () => { evtWarm(mods, -6); log(`Breakfast at the White House: your ${MODERATE[S.side]} came back wobbly (−6).`, 'bad'); } },
      { t: 'Offer the White House a concession', s: `${TAG[t][1]} +1 for everyone · veto risk drops · your ${MODERATE[S.side]} −2`, f: B => { evtApplyFx(`White House concession (${TAG[t][1]})`, { [t]: 1 }); B.softened = true; evtWarm(mods, -2); log(`You gave the President ${TAG[t][1]} language. The veto threat fades.`, 'sys'); } },
    ] };
  } },
  // the shutdown bites (while the government is shut)
  { id: 'evt_shutdown', w: 1, cond: () => S.shutdown > 0 || (S.history || []).slice(-2).some(h => /Budget$/.test(h.name) && !h.won && S.evtStopgap !== h.n), make: () => {
    const B = S.bill, day = ri(9, 31), yours = vpYours();
    return { title: `Shutdown, Day ${day}`, paper: 'storm', text: `Day ${day} of the government shutdown: TSA lines stretch out the terminal doors at ${pick(['Atlanta', 'O\'Hare', 'Dulles', 'DFW'])}, ${evtN(ri(300, 800))},000 federal workers miss a paycheck, and the national parks are closed. Both parties blame each other; voters blame everyone.`, choices: [
      { t: 'Blame the other side', s: 'Opinion +3 · national mood −0.3', f: B => { B.opinion += 3; evtMood(-0.3); log('You blamed the other side for the shutdown (+3).'); } },
      { t: 'Propose a stopgap', s: `1 capital · shutdown ends a bill early · ${yours ? 'President\'s approval +2' : 'opinion +4'}`, can: () => S.career.capital >= 1, f: B => { S.career.capital--; S.shutdown = Math.max(0, S.shutdown - 1); S.evtStopgap = ((S.history || []).slice(-2).find(h => /Budget$/.test(h.name) && !h.won) || {}).n; if (yours) evtApproval(2); else B.opinion += 4; log('Your stopgap reopens the government sooner.', 'good'); } },
      { t: 'Hold firm', s: 'Opinion −4 · your caucus loyalists +4', f: B => { B.opinion -= 4; evtWarm(evtMine().filter(m => T(m, 'loyal')), 4); log('You held firm on the shutdown. The base cheered; nobody else did (−4).', 'bad'); } },
    ] };
  } },
  // leadership calls in the pledge you made between bills
  { id: 'evt_pledge_due', w: 0.6, weight: () => 500, cond: () => !!S.evtPledge && !S.bill.nomination, make: () => {
    const pr = PARTY[S.side].prior, t = Object.keys(pr).sort((a, b) => pr[b] - pr[a])[0], loyal = evtMine().filter(m => T(m, 'loyal')), lead = isMajority() ? 'Majority Leader' : 'Minority Leader';
    const clear = () => { S.evtPledge = null; };
    return { title: 'Leadership Calls In Your Pledge', paper: 'night', text: `The ${lead} reminds you of the folder you took between bills. Leadership wants its <b>${TAG[t][1]}</b> language in the ${S.bill.name}, tonight, no questions. A pledge is a pledge — or it isn't.`, choices: [
      { t: 'Honor the pledge', s: `${TAG[t][1]} +1 for everyone · opinion −5 · your loyalists +6`, f: B => { clear(); evtApplyFx(`Leadership's ${TAG[t][1]} language`, { [t]: 1 }); B.opinion -= 5; evtWarm(loyal, 6); log(`You kept your word to leadership: ${TAG[t][1]} +1 (opinion −5).`, 'sys'); } },
      { t: 'Break your word', s: '−3 capital · national mood −1 · faction leaders −1 relationship', f: () => { clear(); evtCap(-3); evtMood(-1); S.members.filter(m => side(m) === 'you' && T(m, 'leader')).forEach(m => m.rel -= 1); log('You broke your pledge to leadership. They have long memories (−3 capital).', 'bad'); } },
    ] };
  } },
  // excerpts from the book you signed between bills leak
  { id: 'evt_bookleak', w: 0.6, weight: () => 500, cond: () => !!S.bookScrutiny, make: () => {
    const clear = () => { S.bookScrutiny = null; };
    const title = pick(['Counting to Fifty-One', 'The Cloakroom Diaries', 'Whip Hand', 'Arms I Have Twisted']);
    return { title: 'Your Memoir Leaks', paper: 'storm', text: `Excerpts from <i>${title}</i>, your forthcoming memoir, leak to the Ledger: candid chapters on earmarks, on "the senator who cried," and on exactly how the sausage gets made. Scrutiny +30.`, choices: [
      { t: 'Own it: a press tour', s: '1 action · scrutiny +30, opinion +4', f: B => { clear(); B.ap -= 1; B.scrutiny += 30; B.opinion += 4; log(`You toured the morning shows for <i>${title}</i> (+4).`, 'sys'); } },
      { t: 'Pull the book', s: '−1 capital · scrutiny +20', f: B => { clear(); evtCap(-1); B.scrutiny += 20; log(`You pulled <i>${title}</i> from the publisher. The excerpts live on.`, 'bad'); } },
      { t: 'No comment', s: 'Scrutiny +30, opinion −4', f: B => { clear(); B.scrutiny += 30; B.opinion -= 4; log('"The book speaks for itself." It did (−4).', 'bad'); } },
    ] };
  } },
);

/* =====================================================================
   2. WORLD NEWS between bills — HOOKS.worldNews (each returns string[])
   ===================================================================== */
const evtSafe = f => () => { try { return f() || []; } catch (e) { console.error('events.js news', e); return []; } };
// the economy: an index that drifts and sometimes shocks
function evtNewsEcon() {
  const P = S.president, out = [];
  if (typeof S.econ !== 'number') S.econ = 0;
  S.econ = clamp(S.econ * 0.82 + gauss() * 0.7, -3, 3);
  if (Math.random() < 0.09) {
    const up = Math.random() < 0.5 + S.econ * 0.08, k = up ? 1 : -1, d = ri(1, 4);
    S.econ = clamp(S.econ + k * rnd(1, 2), -3, 3);
    evtApproval(k * d); evtMood((P.party === S.side ? k : -k) * d * 0.3); evtSal('economy', 1);
    const h = up ? pick([`The economy adds ${ri(280, 520)},000 jobs in a month and unemployment falls to ${(3.4 + rnd(0, 0.6)).toFixed(1)}%`, `Inflation cools to ${(1.8 + rnd(0, 0.6)).toFixed(1)}%, the lowest in years`, `The Dow closes above ${evtN(ri(48, 61) * 1000)} for the first time`, 'Wages outrun prices for a sixth straight month'])
      : pick([`Inflation jumps to ${(5 + rnd(0, 3)).toFixed(1)}%, with groceries leading the way`, `The Dow sheds ${evtN(ri(1200, 2600))} points in a week`, `The economy loses ${ri(90, 310)},000 jobs and unemployment climbs to ${(4.6 + rnd(0, 1.4)).toFixed(1)}%`, `Gas tops $${(4.2 + rnd(0, 1.3)).toFixed(2)} a gallon`]);
    out.push(`${up ? '📈' : '📉'} <b>${h}.</b> ${presTitle()}'s approval ${up ? 'rises' : 'falls'} ${d} point${d > 1 ? 's' : ''}.`);
  } else if (Math.abs(S.econ) >= 2 && Math.random() < 0.2) {
    evtApproval(sgn(S.econ));
    out.push(S.econ > 0 ? `📈 <b>The boom rolls on:</b> ${pick(['help-wanted signs in every window', 'record holiday spending', 'a 401(k) rally'])}, and ${presTitle()} takes the credit (+1).` : `📉 <b>The slump deepens:</b> ${pick(['layoffs spread from tech to trucking', 'foreclosures tick up', 'small towns lose their last bank branch'])}, and ${presTitle()} takes the blame (−1).`);
  }
  return out;
}
// a scandal across the aisle: you get the file
function evtNewsOppScandal() {
  if (Math.random() >= 0.04) return [];
  const pool = S.members.filter(m => side(m) === 'opp' && !m.dirt), m = pick(pool.filter(x => T(x, 'shady'))) || pick(pool); if (!m) return [];
  m.dirt = true; m.knownTraits = true;
  const what = pick(['is caught on tape promising a donor a federal contract', 'billed taxpayers for a family trip to Cabo', 'holds an undisclosed stake in a company their committee regulates', 'kept a no-show staffer on the payroll for two years', 'spent $14,000 of campaign money on a watch']);
  hist(m, 'Caught up in a scandal reported by the Capitol Ledger');
  return [`🗞️ <b>${sen(m)} ${what}.</b> Your oppo team quietly copies the file: you now have dirt on them.`];
}
// a governor goes down
function evtNewsGovIndicted() {
  if (Math.random() >= 0.02) return [];
  const code = pick(Object.keys(S.governors || {}).filter(c => !evtOnTicket(S.governors[c]))); if (!code) return [];
  const g = S.governors[code]; S.formers = S.formers || [];
  hist(g, 'Indicted on federal corruption charges; resigned as Governor'); S.formers.push(g);
  governorSucceeded(code, 'was indicted');
  return [`⚖️ <b>Gov. ${g.name} of ${ST[code].name} (${g.party}) is indicted</b> on ${ri(7, 23)} counts of wire fraud and bribery, and resigns within the hour. Lt. Gov. ${S.governors[code].name} is sworn in.`];
}
// a Supreme Court draft leaks
function evtNewsCourtLeak() {
  if (Math.random() >= 0.03) return [];
  const L = (S.laws || []).find(l => !l.eo);
  if (L) { const strike = Math.random() < 0.5, mine = L.party === S.side; evtMood(mine ? (strike ? -0.5 : 0.5) : (strike ? 0.5 : -0.5)); return [`📄 <b>A draft opinion leaks from the Supreme Court:</b> the justices appear ready to ${strike ? 'strike down' : 'uphold'} the ${L.name}. The Chief Justice orders an investigation of the clerks.`]; }
  const t = pick(TAGS); evtSal(t, 2);
  return [`📄 <b>A draft Supreme Court opinion on ${TAG[t][1].toLowerCase()} leaks</b> and sets Washington on fire. The Chief Justice calls it "a betrayal."`];
}
// a natural disaster
function evtNewsDisaster() {
  if (Math.random() >= 0.035) return [];
  const [emoji, kind, verb, noun, codes] = pick([['🌀', `Hurricane ${pick(['Delphine', 'Ignatius', 'Marguerite', 'Tobias', 'Wren', 'Octavia'])}`, 'slams', 'the hurricane', ['FL', 'LA', 'TX', 'NC', 'SC', 'MS', 'AL', 'GA']], ['🔥', 'Wildfires', 'sweep', 'the wildfires', ['CA', 'OR', 'WA', 'CO', 'MT', 'ID', 'AZ', 'NM']], ['🌪️', 'A tornado outbreak', 'tears through', 'the tornadoes', ['OK', 'KS', 'MO', 'AR', 'TN', 'IA', 'NE', 'TX']], ['🌊', 'Catastrophic flooding', 'swamps', 'the floods', ['KY', 'WV', 'PA', 'OH', 'IN', 'IL', 'MN', 'VT']], ['❄️', 'An ice storm', 'paralyzes', 'the ice storm', ['TX', 'OK', 'MI', 'WI', 'NY', 'ME', 'NH']], ['🏔️', `A magnitude-${(6 + ri(1, 3) / 10).toFixed(1)} earthquake`, 'rocks', 'the earthquake', ['CA', 'AK', 'WA', 'UT']]]);
  const code = pick(codes), g = S.governors[code], dead = ri(4, 90), bn = ri(3, 60);
  evtSal('environment', 1.5); evtSal('rural', 1);
  const botched = Math.random() < 0.3; if (botched) evtApproval(-2);
  if (g) hist(g, `Led ${ST[code].name} through ${noun} that killed ${dead}`);
  return [`${emoji} <b>${kind} ${verb} ${ST[code].name}:</b> ${dead} dead, $${bn} billion in damage, and Gov. ${g ? g.name : '—'} asking Washington for help. ${botched ? `${presTitle()}'s response is widely panned (−2).` : 'Climate and farm country move up the agenda.'}`];
}
// a trade war
function evtNewsTrade() {
  if (Math.random() >= 0.025) return [];
  evtSal('economy', 2); S.econ = clamp((S.econ || 0) - 0.6, -3, 3); evtApproval(-1);
  const [who, verb] = pick([['Beijing', 'slaps'], ['Brussels', 'slaps'], ['Ottawa and Mexico City', 'slap'], ['New Delhi', 'slaps']]);
  return [`🚢 <b>Trade war:</b> ${who} ${verb} retaliatory tariffs on ${pick(['soybeans and pork', 'bourbon and motorcycles', 'semiconductors', 'cars and auto parts', 'lobster and cranberries'])}. Farm country and factory towns brace (${presTitle()} −1).`];
}
// a tech boom or bust
function evtNewsTech() {
  if (Math.random() >= 0.025) return [];
  const boom = Math.random() < 0.5; evtSal('tech', 2); S.econ = clamp((S.econ || 0) + (boom ? 0.5 : -0.5), -3, 3);
  return [boom ? `💡 <b>Tech boom:</b> an AI startup lists at $${ri(400, 900)} billion and ${pick(['Austin', 'Columbus', 'Phoenix', 'Raleigh'])} becomes the hottest job market in America. Tech & Science moves up the agenda.` : `💡 <b>Tech bust:</b> ${pick(['an AI darling', 'a crypto exchange', 'a self-driving-car company'])} collapses and ${ri(20, 60)},000 engineers are laid off in a week. Tech & Science moves up the agenda, for the wrong reasons.`];
}
// a pandemic scare (rare)
function evtNewsPandemic() {
  if (Math.random() >= 0.01) return [];
  evtSal('welfare', 3); evtApproval(-2); if (S.president.party === S.side) evtMood(-0.5);
  return [`🦠 <b>A new respiratory virus spreads from ${pick(['a cruise ship off Miami', 'a mink farm in Wisconsin', 'a conference in Las Vegas'])}.</b> Hospitals brace, masks reappear, and ${presTitle()}'s approval slips 2 points.`];
}
// an impeachment inquiry against an unpopular opposing President, and its aftermath
function evtNewsImpeachment() {
  const P = S.president, I = S.impeachment, out = [];
  if (I) {
    if (I.pres !== P.name) { S.impeachment = null; return [`⚖️ The impeachment inquiry into former President ${I.pres.split(' ').slice(1).join(' ')} dies with the administration that spawned it.`]; }
    const age = S.career.bills - I.bill;
    if (I.stage === 1 && age >= 2) {
      if (Math.random() < 0.6) { I.stage = 2; I.bill = S.career.bills; evtApproval(-2); hist(P, 'Impeached by the House of Representatives'); const y = ri(218, 236); out.push(`⚖️ <b>The House impeaches ${presTitle()}, ${y}–${435 - y}</b>, on ${ri(2, 4)} articles. The Senate trial comes after the next bill; two-thirds are needed to remove.`); }
      else { S.impeachment = null; evtApproval(1); out.push(`⚖️ The impeachment inquiry into ${presTitle()} ends in a censure resolution instead. Both sides claim vindication (+1 approval).`); }
    } else if (I.stage === 2 && age >= 2) {
      S.impeachment = null;
      const y = clamp(seats(S.side) + ri(-2, 6), 30, 66);
      evtApproval(2); evtMood(-1); hist(P, `Acquitted by the Senate, ${y}–${100 - y}`);
      out.push(`⚖️ <b>The Senate acquits ${presTitle()}, ${y}–${100 - y}</b>, short of the 67 needed to remove. The President claims total exoneration; voters are tired of the whole affair (your party's mood −1).`);
    }
    return out;
  }
  if (P.party !== S.side && P.approval < 38 && houseMaj() === S.side && Math.random() < 0.5) {
    S.impeachment = { year: currentYear(), bill: S.career.bills, pres: P.name, stage: 1 };
    evtApproval(-3); evtMood(rnd(-1, 1)); hist(P, 'Became the subject of a House impeachment inquiry');
    out.push(`⚖️ <b>The House opens an impeachment inquiry into ${presTitle()}</b> over ${pick(['a foreign business deal', 'the misuse of disaster funds', 'pressure on the Justice Department', 'a shredded subpoena'])}. Approval −3; the country splits down the middle.`);
  }
  return out;
}
// an ally votes the wrong way
function evtNewsForeignVote() {
  if (Math.random() >= 0.025) return [];
  evtApproval(-1); evtSal('security', 1);
  return [`🗳️ <b>${pick(['Britain', 'Germany', 'Japan', 'Canada', 'Australia', 'France', 'Brazil'])} elects a government openly hostile to ${presTitle()}</b>; the new prime minister calls the alliance "under review." Defense moves up the agenda (−1 approval).`];
}
// redistricting fights in years ending in 2
function evtNewsRedistrict() {
  const y = currentYear();
  if (y % 10 !== 2 || S.evtRedistrict === y || Math.random() < 0.5) return [];
  S.evtRedistrict = y;
  const pool = STATES.filter(([c]) => (typeof EV !== 'undefined' ? EV[c] : 10) >= 8).map(s => s[0]), code = pick(pool) || 'TX', p = Math.random() < 0.5 ? 'D' : 'R', d = ri(1, 3), maj = houseMaj();
  const shift = p === maj ? d : Math.min(d, Math.max(0, S.house[maj] - 218));
  if (shift > 0) { S.house[p] += shift; S.house[other(p)] -= shift; }
  return [`🗺️ <b>Redistricting fight in ${stName(code)}:</b> the state supreme court throws out the congressional map as a partisan gerrymander. The new lines ${shift ? `hand the ${PARTY[p].short} about ${shift} House seat${shift > 1 ? 's' : ''}` : 'change little'} heading into the next election (House now ${S.house.D}D–${S.house.R}R).`];
}
// a celebrity flirts with a Senate run
function evtNewsCelebrity() {
  if (Math.random() >= 0.025) return [];
  const m = pick(S.members.filter(x => isUp(x) && side(x) === 'opp')) || pick(S.members.filter(isUp)); if (!m) return [];
  const celeb = pick(['A talk-show host', 'A retired quarterback', 'A country star', 'A tech billionaire', 'A reality-TV judge', 'An astronaut', 'A celebrity chef']);
  return [`⭐ <b>${celeb} is "seriously considering" a run for Senate in ${ST[m.state].name}</b> against ${sen(m)} next year. A first poll has the celebrity at ${ri(28, 44)}%; ${lastName(m)}'s office calls it "a stunt."`];
}
// a senator's memoir embarrasses leadership
function evtNewsMemoir() {
  if (Math.random() >= 0.025) return [];
  const yours = Math.random() < 0.5, m = pick(S.members.filter(x => (yours ? side(x) === 'you' : side(x) === 'opp'))); if (!m) return [];
  const title = pick(['Unbowed', 'The Last Honest Senator', 'What I Saw in the Cloakroom', 'Against the Grain', 'Fifty-One Reasons']);
  hist(m, `Published a score-settling memoir, "${title}"`);
  if (yours) { m.rel -= 1; evtMood(-0.4); return [`📚 <b>${sen(m)} publishes a memoir, <i>${title}</i>, that lands with a thud on leadership's desk:</b> the whip "counts votes like a drunk counts change." Relationship −1, your party's mood −0.4.`]; }
  m.rel += 1; evtMood(0.4);
  return [`📚 <b>${sen(m)} publishes a memoir, <i>${title}</i>, that savages their own leadership</b> as "cowards in good suits." They're suddenly easier to talk to (relationship +1); your party's mood +0.4.`];
}
// the retirement rumor you heard between bills pays off (or doesn't)
function evtNewsCourtRumor() {
  const R = S.courtRumor; if (!R || Math.random() < 0.5) return [];
  S.courtRumor = null;
  const j = S.court.find(x => x.name === R.name);
  if (!j || S.court.length < 9 || S.nominee) return [];
  if (Math.random() < 0.5) { return [`⚖️ Justice ${j.name} ends the retirement chatter from the bench: "<i>I'm not going anywhere.</i>"`]; }
  S.court = S.court.filter(x => x !== j);
  const ready = R.ready && S.president.party === S.side; if (ready) evtCap(1);
  return [`⚖️ <b>The rumor was true: Justice ${j.name} (${PARTY[j.party].name} appointee, ${j.age}) retires.</b> A Supreme Court seat is open${ready ? ', and your shortlist is already on the leader\'s desk (+1 capital)' : ''}.`];
}
HOOKS.worldNews.push(...[evtNewsEcon, evtNewsOppScandal, evtNewsGovIndicted, evtNewsCourtLeak, evtNewsDisaster, evtNewsTrade, evtNewsTech, evtNewsPandemic, evtNewsImpeachment, evtNewsForeignVote, evtNewsRedistrict, evtNewsCelebrity, evtNewsMemoir, evtNewsCourtRumor].map(evtSafe));

/* =====================================================================
   3. MOMENTS between bills — HOOKS.interlude (steps that must call next() once)
   ===================================================================== */
// the "Between bills" part of a kicker becomes a pill (the text content stays the same)
const evtKicker = k => `<div class="kicker">${k.replace(/^Between bills/, '<span class="evt-pill">Between bills</span>')}</div>`;
// a screen of choices: buttons carry data-choice; pick(k) runs after a click
function evtScreen({ kicker, h2, paper, body, choices, pick: onPick }) {
  showModal(`${evtKicker(kicker)}${paper ? frontPage(paper) : `<h2>${h2}</h2>${body || ''}`}${paper && body ? body : ''}<div class="choices">${choices.map(c => `<button class="btn ${c.cls || ''}" data-choice="${c.k}" ${c.dis ? 'disabled' : ''}>${c.t}${c.s ? `<small>${c.s}</small>` : ''}</button>`).join('')}</div>`);
  $('#modal-card').querySelectorAll('[data-choice]').forEach(b => b.onclick = () => { sfx.click(); onPick(b.dataset.choice); });
}
// the result screen; its .adv button calls next() exactly once
function evtAfter(next, kicker, h2, lines) {
  let done = false;
  showModal(`${evtKicker(kicker)}<h2>${h2}</h2><div class="evt-card">${lines.map(l => `<p>${l}</p>`).join('')}</div><div class="choices"><button class="btn primary big adv" id="evt-adv">Continue</button></div>`);
  $('#evt-adv').onclick = () => { if (done) return; done = true; sfx.click(); next(); };
}
const EVT_MOMENTS = [
  // a scandal in your own caucus
  { id: 'scandal', run: next => {
    const pool = S.members.filter(m => side(m) === 'you'), m = pick(pool.filter(x => T(x, 'shady'))) || pick(pool); if (!m) return next();
    const what = pick(['an affair with a lobbyist whose clients had business before their committee', 'a $2.1 million "consulting" payment routed through a brother-in-law', 'a decade of unpaid property taxes on a lake house', 'a hot-mic rant about their own constituents', 'a campaign treasurer who turned out to be a federal informant']);
    const K = 'Between bills · Scandal in the caucus';
    evtScreen({ kicker: K, paper: { headline: `${lastName(m).toUpperCase()} UNDER FIRE`, sub: `${sen(m)} faces questions over ${what}.`, body: [`WASHINGTON — The story broke at 6 a.m. and by noon every camera in the Capitol was parked outside ${lastName(m)}'s office. ${lastName(m)}, ${evtMemberOf(m)} from ${ST[m.state].name}, calls it "a partisan hit job."`, 'The caucus looks to its whip. Defend them, and the party owns the story. Cut them loose, and every senator wonders who\'s next.'], mood: 'storm', date: evtDate() }, choices: [
      { k: 'defend', t: `Stand by ${lastName(m)}`, s: `Relationship +2 · national mood −1 · ${T(m, 'shady') ? 'a real' : 'some'} risk it gets worse` },
      { k: 'cut', t: 'Cut them loose', s: 'They hold a grudge and their faction cools · mood +0.5 · +1 capital for acting fast' },
      { k: 'quiet', t: 'Say nothing and wait', s: 'National mood −0.5' },
    ], pick: k => {
      const lines = [];
      if (k === 'defend') {
        m.rel += 2; evtMood(-1); hist(m, 'Weathered a scandal with the whip\'s backing');
        lines.push(`You stood at ${lastName(m)}'s side through three days of cameras. ${lastName(m)} won't forget it (relationship +2); the party owns the story (mood −1).`);
        if (Math.random() < (T(m, 'shady') ? 0.45 : 0.25)) { evtMood(-1); evtCap(-1); lines.push(`Then the second shoe drops: <b>there was more.</b> You defended it anyway. Mood −1 more, −1 capital.`); }
        else lines.push('The story fades after a week. Nothing more surfaces.');
      } else if (k === 'cut') {
        m.rel -= 3; m.grudge = true; evtMood(0.5); evtCap(1); hist(m, 'Abandoned by the party leadership during a scandal');
        for (const x of S.members) if (x !== m && x.party === m.party && x.faction === m.faction) x.rel -= 0.5;
        lines.push(`"Sen. ${lastName(m)} should consider whether they can continue to serve." The story moved on (mood +0.5, +1 capital). ${lastName(m)} will never forgive you, and the ${m.faction} saw how fast you did it (−0.5 each).`);
      } else { evtMood(-0.5); lines.push(`You said nothing. The story dragged on for a week and cost your party a little (mood −0.5).`); }
      evtAfter(next, 'Between bills · Aftermath', `The ${lastName(m)} affair`, lines);
    } });
  } },
  // the leader's offer: capital now for a pledge
  { id: 'leader', cond: () => !S.evtPledge, run: next => {
    const L = isMajority() ? 'the Majority Leader' : 'the Minority Leader', K = 'Between bills · The leader\'s office';
    evtScreen({ kicker: K, h2: `${L.charAt(0).toUpperCase() + L.slice(1)} makes an offer`, body: `<p>Over a late scotch, ${L} slides a folder across the desk: <b>2 political capital</b>, right now, from the leadership fund. The price is a pledge. On your next bill, when leadership asks for its language, you deliver — no questions, no matter what it does to your count.</p><p style="color:var(--dim)">Pledges can be broken. Leadership has a long memory.</p>`, choices: [
      { k: 'take', t: 'Take the capital', s: '+2 capital now · leadership will call in the pledge on your next bill' },
      { k: 'no', t: 'Keep your independence', s: 'Nothing changes' },
    ], pick: k => {
      const lines = [];
      if (k === 'take') { evtCap(2); S.evtPledge = { n: S.career.bills + 1 }; lines.push(`You took the folder (<b>+2 capital</b>). Somewhere in the next bill, leadership will want its language — and it will cost you public opinion to give it.`); }
      else lines.push(`You pushed the folder back. ${L.charAt(0).toUpperCase() + L.slice(1)} shrugged: "Suit yourself." Nothing changes.`);
      evtAfter(next, 'Between bills · Aftermath', k === 'take' ? 'A pledge is made' : 'No deal', lines);
    } });
  } },
  // an opposing moderate thinks about switching
  { id: 'switch', cond: () => evtSwitchCands(other(S.side)).length > 0, run: next => {
    const m = pick(evtSwitchCands(other(S.side))); if (!m) return next();
    const adv = evtLeanAdv(m.state, S.side), odds = clamp(0.5 + m.rel * 0.03 + (adv - 8) * 0.01, 0.5, 0.65), K = 'Between bills · A quiet dinner';
    evtScreen({ kicker: K, h2: `${sen(m)} is thinking about switching`, body: `${evtPerson(m)}<p>${ST[m.state].name} is ${leanLabel(ST[m.state].lean)}, and ${lastName(m)}, ${evtMemberOf(m)}, has been voting like one of yours for a year. Over dinner at a Georgetown steakhouse they let it slip: <b>the party has stopped returning their calls.</b></p><p>A real pitch — committee seats, a chair at the leadership table, a fundraiser or two — costs <b>3 capital</b>. Your odds: <b>${Math.round(odds * 100)}%</b>. If it works, the Senate moves one seat your way.</p>`, choices: [
      { k: 'pitch', t: 'Make the pitch', s: `3 capital · ${Math.round(odds * 100)}% they switch to the ${PARTY[S.side].short}`, dis: S.career.capital < 3 },
      { k: 'wait', t: 'Let it lie', s: 'Nothing happens, for now' },
    ], pick: k => {
      const lines = [];
      if (k === 'pitch') {
        evtCap(-3);
        if (Math.random() < odds) { evtFlipParty(m, false); m.rel += 2; evtMood(1); unlock('evt_switch'); lines.push(`<b>${sen(m)} switches parties.</b> At a press conference in ${m.hometown}, they call it "coming home." The Senate now stands ${seats('D')}D–${seats('R')}R${seats('I') ? `–${seats('I')}I` : ''} (national mood +1, relationship +2).`); }
        else { m.rel -= 1; lines.push(`${lastName(m)} listened, thanked you, and stayed put. Worse, the dinner leaked: their leadership is furious with them, and they're a little embarrassed with you (relationship −1). −3 capital.`); }
      } else lines.push(`You let ${lastName(m)} pick up the check. Maybe next year.`);
      evtAfter(next, 'Between bills · Aftermath', k === 'pitch' ? 'The pitch' : 'Dinner, nothing more', lines);
    } });
  } },
  // a 60 Minutes profile
  { id: 'sixty', run: next => {
    const K = 'Between bills · Prime time';
    evtScreen({ kicker: K, h2: 'A 60 Minutes profile', body: `<p>A producer wants to shadow you for a week: the cloakroom, the whip count, the midnight calls, "the real you." Twelve million people watch on Sunday night. Whips who come off as masterminds get a national following; whips who come off as bullies get a hundred cable segments.</p>`, choices: [
      { k: 'yes', t: 'Let the cameras in', s: 'Gamble: national mood +2 and +1 capital, or mood −2 and −1 capital' },
      { k: 'no', t: 'Decline politely', s: 'Nothing happens' },
    ], pick: k => {
      const lines = [];
      if (k === 'yes') {
        if (Math.random() < 0.55) { evtMood(2); evtCap(1); unlock('evt_primetime'); lines.push(`<b>The segment is a love letter.</b> "The most effective legislator in Washington," the correspondent says over footage of you counting on your fingers. National mood +2, +1 capital.`); }
        else { evtMood(-2); evtCap(-1); lines.push(`<b>The segment is a hit job.</b> They kept the footage of you yelling at a staffer and cut everything else. "Washington's bully-in-chief." National mood −2, −1 capital.`); }
      } else lines.push('You declined. The producer profiled the opposing whip instead. It was fine.');
      evtAfter(next, 'Between bills · Aftermath', 'Sunday night', lines);
    } });
  } },
  // a book deal
  { id: 'book', cond: () => !S.bookScrutiny, run: next => {
    const adv = ri(1, 4), K = 'Between bills · A publisher calls';
    evtScreen({ kicker: K, h2: 'A book deal', body: `<p>A New York publisher offers a <b>$${adv}.${ri(1, 9)} million</b> advance for a memoir: the deals, the arm-twisting, the senator who cried. You'd have to actually write it — and excerpts have a way of leaking in the middle of a floor fight.</p>`, choices: [
      { k: 'sign', t: 'Sign the deal', s: '+2 capital now · excerpts will leak during your next bill (heavy scrutiny)' },
      { k: 'pass', t: 'Pass', s: 'Nothing happens' },
    ], pick: k => {
      const lines = [];
      if (k === 'sign') { evtCap(2); S.bookScrutiny = { n: S.career.bills + 1 }; lines.push(`You signed (<b>+2 capital</b>). Your ghostwriter starts Monday. Expect the juicy chapters to leak at the worst possible moment.`); }
      else lines.push('You passed. "Everyone in this town writes a book," the agent sighed. "Everyone."');
      evtAfter(next, 'Between bills · Aftermath', k === 'sign' ? 'Under contract' : 'No book', lines);
    } });
  } },
  // a Supreme Court retirement rumor
  { id: 'rumor', cond: () => S.court.length === 9 && !S.nominee && !S.courtRumor, run: next => {
    const j = S.court.slice().sort((a, b) => b.age - a.age)[0], K = 'Between bills · Court watch';
    evtScreen({ kicker: K, h2: `Is Justice ${lastName(j)} retiring?`, body: `<p>A clerk's cousin tells a reporter who tells your chief of staff: Justice <b>${j.name}</b> (${PARTY[j.party].name} appointee, ${j.age}) has been "getting their affairs in order." The Court is ${courtLabel()}. ${S.president.party === S.side ? `If it's true, ${presTitle()} gets a pick and you get a confirmation fight.` : `If it's true, ${presTitle()} gets a pick and your ${isMajority() ? 'majority decides whether there\'s a vote' : 'minority can only watch'}.`}</p>`, choices: [
      { k: 'prep', t: 'Quietly vet a shortlist', s: `If the rumor proves true${S.president.party === S.side ? ', you\'re ready: +1 capital' : ', you\'ll at least see it coming'}` },
      { k: 'ignore', t: 'Dismiss the chatter', s: 'Nothing changes' },
    ], pick: k => {
      S.courtRumor = { name: j.name, ready: k === 'prep', bill: S.career.bills };
      evtAfter(next, 'Between bills · Aftermath', 'Watching the Court', [k === 'prep' ? `Your staff spends the recess reading opinions by ${ri(4, 9)} appellate judges. If Justice ${lastName(j)} goes, you'll know the names before the President does.` : `You ignored it. Rumors about ${lastName(j)} retiring are an annual tradition.`, 'Watch the news between bills.']);
    } });
  } },
  // a donor retreat: pick a theme
  { id: 'donor', run: next => {
    const tags = shuffle(TAGS.slice()).slice(0, 3), place = pick(['Sea Island', 'Jackson Hole', 'Palm Beach', 'Napa', 'Aspen']), K = 'Between bills · Donor retreat';
    evtScreen({ kicker: K, h2: `The ${place} retreat`, body: `<p>Your party's biggest donors gather in ${place} for a weekend of panels and golf. They want the whip on stage to say what the party is <i>for</i>. Whatever you choose becomes the week's talking point, and the checks follow.</p>`, choices: tags.map(t => ({ k: t, t: `${TAG[t][0]} Make it about ${TAG[t][1]}`, s: `${TAG[t][1]} moves up the national agenda (salience +1) · +1 capital` })).concat([{ k: 'skip', t: 'Skip the retreat', s: 'Nothing happens' }]), pick: k => {
      const lines = [];
      if (k === 'skip') lines.push(`You sent regrets. The donors golfed without you.`);
      else { evtSal(k, 1); evtCap(1); lines.push(`Your ${place} speech on <b>${TAG[k][1]}</b> led the party's email blasts for a week (salience +1). The donors wrote checks (+1 capital).`); }
      evtAfter(next, 'Between bills · Aftermath', k === 'skip' ? 'A quiet weekend' : `The ${place} speech`, lines);
    } });
  } },
];
// a seat opened during the last bill: meet the governor's appointee
function evtMomentAppointment(next) {
  const V = S.lastVacancy; S.lastVacancy = null;
  const m = V && S.members[V.id];
  if (!m || m.name !== V.name) return next();
  const gov = S.governors[m.state], yours = side(m) === 'you', K = 'Between bills · The governor\'s pick';
  evtScreen({ kicker: K, h2: `${ST[m.state].name}'s new senator`, body: `${evtPerson(m, `${m.faction} · ${ST[m.state].name} · before politics, ${m.background}`)}<p>Gov. ${gov ? gov.name : 'the governor'}${gov ? ` (${gov.party})` : ''} has appointed <b>${m.name}</b> to Sen. ${V.old}'s seat after ${V.old.split(' ').slice(1).join(' ')} ${V.reason}. ${yours ? 'A new vote for your caucus — if you make them feel welcome.' : 'Not one of yours, but new senators remember who called first.'}</p>`, choices: [
    { k: 'court', t: 'Court the appointee', s: '1 capital · relationship +2 for good', dis: S.career.capital < 1 },
    { k: 'wait', t: 'Let them find their footing', s: 'Nothing happens' },
  ], pick: k => {
    const lines = [];
    if (k === 'court') { evtCap(-1); m.rel += 2; m.knownTraits = true; hist(m, `Welcomed to the Senate by the ${PARTY[S.side].name} whip`); lines.push(`You met ${m.name} at the airport, walked them to their desk and introduced them to everyone who matters. Relationship +2 (−1 capital).`); }
    else lines.push(`${m.name} found their own way to the floor. Someone else got there first.`);
    evtAfter(next, 'Between bills · Aftermath', `Senator ${lastName(m)}`, lines);
  } });
}
HOOKS.interlude.push(() => {
  if (!S || !S.career) return [];
  if (typeof presPrimariesDue === 'function' && presPrimariesDue()) return [];
  if (typeof conventionsDue === 'function' && conventionsDue()) return [];
  const wrap = f => next => { let called = false; const once = () => { if (called) return; called = true; next(); }; try { f(once); } catch (e) { console.error('events.js moment', e); once(); } };
  if (S.lastVacancy) { if (S.career.bills - (S.lastVacancy.bill || 0) <= 3) return [wrap(evtMomentAppointment)]; S.lastVacancy = null; }
  const since = S.career.bills - (S.evtLastMoment || 0);
  if (Math.random() >= 0.15 && since < 8) return [];
  const pool = EVT_MOMENTS.filter(m => !m.cond || m.cond()); if (!pool.length) return [];
  const mo = pick(pool); S.evtLastMoment = S.career.bills;
  return [wrap(mo.run)];
});

/* ---------------- achievements ---------------- */
ACH.push(
  ['evt_switch', '🔀', 'Aisle Crosser', 'Welcome a senator who switches to your party.'],
  ['evt_gang', '🤜', 'Gang Leader', 'Bless a bipartisan gang of moderates.'],
  ['evt_primetime', '📺', 'Prime Time', 'Come out ahead in a 60 Minutes profile.'],
);
