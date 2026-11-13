'use strict';
/* =====================================================================
   FLOOR — who controls the floor, what comes up next, and which bills
   your caucus wants passed or killed. The schedule (S.schedule: the
   next three bills), the majority's and the minority's tools, the
   kill-mode newspaper. Loaded after world.js; game.js's startBill()
   takes every non-budget bill from docketTemplate(n).
   The aim and the filibuster themselves live in game.js (aimSign,
   sponsor, billParty, needNum, passes, calibrate).
   ===================================================================== */

ACH.push(['killshot', '🗡', 'Dead on Arrival', 'Kill the other side\'s bill on the Senate floor.'],
  ['lastline', '🗣', 'The Last Line', 'From the minority, kill a bill that needed 60 votes.'],
  ['nuclear', '☢️', 'Nuclear Option', 'Abolish the legislative filibuster.'],
  ['discharge', '📜', 'Discharged', 'Force your own bill onto the floor from the minority.']);

/* ---------------- badges ---------------- */
function aimBadge(aim) { return `<span class="fl-aim ${aim === 'kill' ? 'kill' : 'pass'}">Your caucus: ${aim === 'kill' ? 'KILL IT' : 'PASS IT'}</span>`; }
// who put this bill on the floor, and what it takes
function floorByline() {
  const B = S.bill, them = PARTY[other(S.side)].name;
  const who = B.budget ? (B.by === 'them' ? `Written by the ${them} majority` : '') : B.by === 'them' ? `Scheduled by the ${them} majority` : B.note ? '' : isMajority() ? 'Your pick for the floor' : '';
  const bits = [who, B.note, B.cloture ? (killing() ? 'needs 60 for cloture: 41 nays kill it' : 'needs 60 to beat the filibuster') : ''].filter(Boolean);
  return bits.length ? `<small class="fl-by">${bits.join(' · ')}</small>` : '';
}

/* ---------------- forced votes: they preempt the schedule ---------------- */
function flNomDue() { return !!(S.nominee && S.court.length < 9 && (S.nominee.party || S.side) === S.president.party); }
function flForced() {
  const out = [];
  if (S.pendingAUMF) out.push({ name: `War vote: Authorization for Use of Military Force in ${S.pendingAUMF}`, why: `${presTitle()} asked Congress for a war vote`, aim: IND() ? flAimI(FL_AUMF_FX, S.president.party) : 'pass' });
  if (S.docket) out.push({ name: S.docket.name, why: S.docket.forced ? 'a bipartisan bloc forced it onto the floor' : 'already on the calendar', aim: IND() ? flAimI(S.docket.tpl[2], billParty(S.docket.tpl[0]) || (S.docket.forced ? floorParty() : 'I')) : 'pass' });
  if (flNomDue()) out.push({ name: `Supreme Court confirmation: Judge ${S.nominee.name}`, why: 'a seat on the Court is open, and nominations jump the line', aim: IND() ? flNomination().aim : (S.nominee.party || S.side) === S.side ? 'pass' : 'kill' });
  return out;
}
function forcedNext(n) {
  if (n % 3 === 0) return 'The yearly budget';
  const f = flForced()[0];
  return f ? `${f.name}, because ${f.why}` : null;
}

/* ---------------- the schedule ---------------- */
// one slot: { name, tpl: [name, blurb, fx], aim, by: 'you'|'them', note, sup?, lm? (landmark), win? (forced on by a minority tool), ride? (your rider's tag) }
// independent career: the caucus's aim is its Banner's verdict on the bill (caucus.js), whoever owns it
const flAimI = (fx, owner) => typeof cauAim === 'function' ? cauAim(fx, owner) : 'pass';
const FL_AUMF_FX = { security: 3, taxes: -1, welfare: -1 };
function flItem(t, by, extra) {
  const lm = t.length > 3, p = billParty(t[0]);
  return { name: t[0], tpl: [t[0], t[1], t[lm ? 3 : 2]], aim: IND() ? flAimI(t[lm ? 3 : 2], by === 'you' && !p ? 'I' : p || floorParty()) : by === 'them' && p && p !== S.side ? 'kill' : 'pass', by, note: '', ...(lm ? { sup: t[2], lm: true } : {}), ...extra };
}
// the queue; when control of the floor changes, the old majority's picks fall off (bills forced on by petition stay)
// (always the same array, edited in place: callers hold on to it)
function flQueue() {
  if (!Array.isArray(S.schedule)) S.schedule = [];
  const q = S.schedule, ctl = isMajority() ? 'you' : IND() ? 'them:' + floorParty() : 'them', flip = S.schedCtl !== ctl;
  for (let i = q.length - 1; i >= 0; i--) { const x = q[i]; if (!x || !x.tpl || (!S.war && warIsWPR(x)) || (flip && !x.win)) q.splice(i, 1); }
  S.schedCtl = ctl;
  return q;
}
function flTaken() { return new Set(flQueue().map(x => x.name).concat((S.history || []).slice(-8).map(h => h.name), S.bill ? [S.bill.name] : [])); }
// what the party that controls the floor brings up in slot bn
function flGen(p, bn) {
  const taken = flTaken(), fresh = a => a.filter(b => !taken.has(b[0]));
  const by = p === S.side ? 'you' : 'them';
  if (bn % 5 === 0 && !flQueue().some(x => x.lm)) { const l = pick(fresh(LANDMARKS[p].concat(LANDMARKS.both))); if (l) return flItem(l, by); }
  const divided = S.president.party !== p || (S.house[p] || 0) < 218;
  const src = divided && Math.random() < (by === 'you' ? 0.55 : 0.3) ? AGENDA.both : AGENDA[p].concat(by === 'you' ? AGENDA.both : []);
  return flItem(pick(fresh(src)) || pick(fresh(AGENDA[p].concat(AGENDA.both))) || pick(AGENDA.both), by);
}
// the next bill numbers that aren't budgets
function flSlotBills(k) { const out = []; for (let bn = S.career.bills + 1; out.length < k; bn++) if (bn % 3) out.push(bn); return out; }
function flFill() {
  const q = flQueue(), p = isMajority() ? S.side : other(S.side), bills = flSlotBills(4);
  while (q.length < 3) q.push(flGen(p, bills[q.length]));
  return q;
}
// startBill asks here for every bill that isn't the budget
function docketTemplate(n) {
  if (S.pendingAUMF) { const place = S.pendingAUMF; return { tpl: [`Authorization for Use of Military Force in ${place}`, `The President asks Congress to authorize force in ${place}. A simple majority; the nation is watching.`, { security: 3, taxes: -1, welfare: -1 }], aumf: place, aim: IND() ? flAimI(FL_AUMF_FX, S.president.party) : 'pass', by: 'you', note: `${presTitle()} asked for it` }; }
  if (S.docket) { const d = S.docket; S.docket = null; S.docketOffer = null; return { ...flItem(d.tpl, d.forced ? 'them' : 'you'), aim: IND() ? flAimI(d.tpl[2], billParty(d.tpl[0]) || (d.forced ? floorParty() : 'I')) : 'pass', note: d.forced ? 'Forced onto the floor by a bipartisan bloc' : '', wpr: warIsWPR(d) }; }
  if (flNomDue()) return flNomination();
  const it = flFill().shift();
  return { ...it, wpr: warIsWPR(it) };
}
function flNomination() {
  const N = S.nominee, p = N.party || S.side, pr = PARTY[p === 'I' ? other(S.side) : p].prior, fx = {}, mod = 1 / (1 + (N.tries || 0)), mine = p === S.side;
  TAGS.slice().sort((a, b) => Math.abs(pr[b] || 0) - Math.abs(pr[a] || 0)).slice(0, 3).forEach(t => fx[t] = Math.round((pr[t] || 0) * 2 * mod) || Math.sign(pr[t] || 0));
  return { tpl: [`Confirmation of Judge ${N.name}`, mine ? `${presTitle()}'s nominee for the Supreme Court. No filibuster: a simple majority confirms. The other side calls the nominee an extremist.`
    : IND() ? `${presTitle()}'s nominee for the Supreme Court, rushed to the floor by the ${PARTY[floorParty()].name} majority. No filibuster for judges: a simple majority confirms. Both parties will bid for your caucus's votes.`
    : `${presTitle()}'s nominee for the Supreme Court, rushed to the floor by the ${PARTY[other(S.side)].name} majority. No filibuster for judges: a simple majority confirms. Your caucus calls the nominee an extremist; peel off enough of theirs and the seat stays open.`, fx],
    nomination: true, aim: IND() ? flAimI(fx, p) : (mine ? 'pass' : 'kill'), by: mine ? 'you' : 'them', note: N.tries ? `Nominee #${N.tries + 1} for this seat` : '' };
}
// old saves call this
function billPool() { return AGENDA[S.side].concat(AGENDA.both).filter(b => !(S.history || []).slice(-8).some(h => h.name === b[0])); }

/* ---------------- the Docket in the Whip's Office ---------------- */
// per-visit UI state (not saved): offers, the selected slot (majority), your bill (minority), tools used
let flUI = { bills: -1 };
function flState() {
  if (flUI.bills !== S.career.bills || flUI.S !== S) {
    const taken = flTaken(), fresh = a => shuffle(a.filter(b => !taken.has(b[0])));
    const due = flSlotBills(3).some(bn => bn % 5 === 0);
    const offers = isMajority()
      ? fresh(AGENDA[S.side]).slice(0, due ? 2 : 3).concat(fresh(AGENDA.both).slice(0, 2), due ? fresh(LANDMARKS[S.side].concat(LANDMARKS.both)).slice(0, 1) : [])
      : fresh(AGENDA[S.side]).slice(0, 2).concat(fresh(AGENDA.both).slice(0, 1));
    flUI = { S, bills: S.career.bills, offers: offers.map(t => flItem(t, 'you')), sel: 0, pick: null, used: {} };
    flUI.pick = flUI.offers[0] || null;
  }
  return flUI;
}
function flPromTags() { return (S.promises || []).filter(p => !p.done && !p.broken && promiseOf(p.id)[2] === 'tag').map(p => promiseOf(p.id)[3]); }
function flOwnBill(tag) {
  const pool = billPool().filter(x => (x[2][tag] || 0) >= 2);
  return pool.length ? pick(pool) : pick(AGENDA.both.concat(AGENDA[S.side]).filter(x => (x[2][tag] || 0) >= 1)) || pick(billPool());
}
function flNeed(x) { return x.sup ? `needs ${x.sup}` : x.nomination || x.budget || x.aumf || warIsWPR(x) ? 'simple majority' : billParty(x.name) && !S.nuclear ? 'needs 60 (filibuster)' : 'simple majority'; }
function flFx(fx) { return Object.entries(fx).filter(([, v]) => v).map(([t, v]) => `${TAG[t][0]}${v > 0 ? '+' : '−'}`).join(' '); }
// the next three bills: budgets and forced votes in their place, then the queue
function flRows() {
  const q = flFill(), forced = flForced(), rows = [];
  let qi = 0, fi = 0, bn = S.career.bills + 1;
  for (let i = 0; i < 3; i++, bn++) {
    if (bn % 3 === 0) rows.push({ forced: true, name: `FY${billYear(bn) + 1} Budget`, why: isMajority() ? 'every Fall; you write it' : `every Fall; the ${PARTY[other(S.side)].name} majority writes it`, aim: isMajority() ? 'pass' : 'kill', budget: true });
    else if (fi < forced.length) rows.push({ forced: true, ...forced[fi++] });
    else rows.push({ ...q[qi], qi: qi++ });
  }
  return rows;
}
function flRowHTML(r, i, U) {
  const when = ['This week', 'Next', 'After that'][i], maj = isMajority(), promTags = flPromTags();
  const star = !r.forced && r.tpl && Object.keys(r.tpl[2]).some(t => promTags.includes(t) && r.tpl[2][t] >= 2) && r.aim === 'pass' ? ' <b class="fl-star">★ keeps a promise</b>' : '';
  const who = r.forced ? `<i>${r.why}</i>` : r.by === 'them' ? `their pick${billParty(r.name) ? '' : ' · a bipartisan deal'}` : r.win ? 'your bill, forced on' : maj ? 'your pick' : 'your bill';
  const ctl = r.forced ? '<span class="fl-lock">🔒 can\'t wait</span>'
    : maj ? `<button class="btn fl-mini ${U.sel === r.qi ? 'on' : ''}" data-slot="${r.qi}">${U.sel === r.qi ? 'Choosing…' : 'Change'}</button>${r.qi > 0 ? `<button class="btn fl-mini" data-mv="${r.qi}" title="Move up">▲</button>` : ''}`
    : r.by === 'them' && (IND() || !billParty(r.name)) ? `<button class="btn fl-mini" data-aim="${r.qi}">${r.aim === 'kill' ? 'Back it instead' : 'Oppose it instead'}</button>` : '';
  return `<div class="fl-slot ${r.aim} ${r.forced ? 'forced' : ''} ${maj && U.sel === r.qi ? 'sel' : ''}"><span class="fl-when">${when}</span>
    <span class="fl-what"><b>${r.name}</b>${r.lm ? ' <span class="fl-lm">LANDMARK</span>' : ''}${star}<small>${who}${r.tpl ? ` · ${flNeed(r)} · ${flFx(r.tpl[2])}` : ''}${r.ride ? ` · <b class="fl-star">your ${TAG[r.ride][1]} rider rides along</b>` : ''}${r.note ? ` · ${r.note}` : ''}</small></span>
    <span class="fl-tag ${r.aim}">${r.aim === 'kill' ? 'KILL' : 'PASS'}</span>${IND() && typeof cauRowChip === 'function' ? cauRowChip(r) : ''}<span class="fl-ctl">${ctl}</span></div>`;
}
function docketHTML() {
  const U = flState(), maj = isMajority(), c = S.career, rows = flRows(), promTags = flPromTags(), them = PARTY[other(S.side)];
  const open = rows.filter(r => !r.forced);
  if (maj && !open.some(r => r.qi === U.sel)) U.sel = open.length ? open[0].qi : 0;
  // a tool button: attr is its data attribute, id the key it's spent under (once per visit)
  const tool = (attr, id, label, sub, cost, ok = true) => `<button class="btn" ${attr} ${c.capital < cost || U.used[id] || !ok ? 'disabled' : ''}><span>${label}${U.used[id] ? ' ✓' : ''}<small>${sub}</small></span><span class="cost">${cost} capital</span></button>`;
  const selRow = rows.find(r => r.qi === U.sel);
  const offerBtn = (o, i) => `<button class="btn ${!maj && U.pick === o ? 'on' : ''}" data-dk="${i}" ${maj && flQueue().some(x => x.name === o.name) ? 'disabled' : ''}><span>${o.name}${o.lm ? ' <span class="fl-lm">LANDMARK</span>' : ''}<small>${o.tpl[1]} ${flFx(o.tpl[2])} · ${flNeed(o)}${Object.keys(o.tpl[2]).some(t => promTags.includes(t) && o.tpl[2][t] >= 2) ? ' · <b class="fl-star">★ keeps a promise</b>' : ''}</small></span><span class="cost">${maj ? 'free' : U.pick === o ? 'your bill' : 'pick'}</span></button>`;
  const own = `<div class="ownbill"><small>${maj ? `Or bring your own bill on an issue (1 capital), into <b>${selRow ? ['This week', 'Next', 'After that'][rows.indexOf(selRow)] : 'the next slot'}</b>:` : 'Or draft your own bill on an issue:'}</small> ${TAGS.map(t => `<button class="btn tagb ${promTags.includes(t) ? 'promise' : ''} ${!maj && U.pick && U.pick.own === t ? 'on' : ''}" data-own="${t}">${TAG[t][0]} ${TAG[t][1]}${promTags.includes(t) ? ' ★' : ''}</button>`).join('')}</div>`;
  const wpr = S.war && (S.war.party !== S.side || S.war.support < 45) && !warIsWPR(S.docket) && !flQueue().some(x => warIsWPR(x));
  let body;
  if (maj) {
    const hold = flHoldTarget();
    body = `<p class="fl-sub">Options for <b>${selRow ? ['This week', 'Next', 'After that'][rows.indexOf(selRow)] : 'the next open slot'}</b>${selRow ? ` (now: ${selRow.name})` : ''}:</p>
      <div class="shop docket">${U.offers.map(offerBtn).join('')}</div>${own}
      <div class="shop fl-tools">${tool('data-ft', 'ft', '⏩ Fast-track', 'The next bill gets an extra day on the floor.', 1, !S.prep.fast)}
        ${tool('data-hold', 'hold', '🛡 Hold the floor', hold ? `Pull the ${hold.it.name}: ${hold.ms.length} of your senators up in ${electionYear(nextElectionK())} would have to vote on it (${hold.ms.slice(0, 3).map(m => 'Sen. ' + lastName(m)).join(', ')}${hold.ms.length > 3 ? '…' : ''}). Their record back home improves.` : 'Nothing on your schedule is a tough vote for your members up next year.', 1, !!hold)}
        ${S.nuclear ? '' : tool('data-nuke', 'nuke', '☢️ Go nuclear', `Abolish the legislative filibuster: your agenda needs a simple majority from now on. So will theirs, the next time they run the place. National mood −1.`, 3)}
        ${wpr ? tool('data-wpr', 'wpr', `☮ War Powers Resolution on ${S.war.place}`, 'Put it in the selected slot: order the troops home.', 1) : ''}</div>`;
  } else {
    const head = flTheirs(flQueue()), pk = U.pick, rideOn = flQueue().find(x => x.by === 'them' && x.aim === 'pass');
    const rideT = pk && flTopTag(pk.tpl[2]);
    body = `<p class="fl-sub">Your bill${pk ? `: <b>${pk.name}</b> <small>${flFx(pk.tpl[2])}</small>` : ''}. Pick one, then use the minority's tools to fight for floor time:</p>
      <div class="shop docket">${U.offers.map(offerBtn).join('')}</div>${own}
      <div class="shop fl-tools">${tool('data-mt="discharge"', 'discharge', '📜 Discharge petition', '60% odds: a majority of senators sign, and your bill is pried out of committee. It takes their next slot; theirs goes to the back.', 2, !!pk)}
        ${IND() && S.cau && S.cau.floorOwed > 0 ? tool('data-mt="owed"', 'owed', '🎫 Call in a floor vote', `The ${PARTY[floorParty()].short} owe your caucus ${S.cau.floorOwed} floor vote${S.cau.floorOwed > 1 ? 's' : ''}: your bill goes in right after this week's.`, 0, !!pk) : ''}
        ${tool('data-mt="uc"', 'uc', '🎯 Unanimous-consent ambush', 'A 30% shot: ask for a vote while their whip is at lunch. Your bill goes in right after this week\'s.', 1, !!pk)}
        ${tool('data-mt="pull"', 'pull', '🧱 Threaten to filibuster everything', head ? `50% they blink and postpone the ${head.name} to the back of the line.` : 'Nothing of theirs to bump.', 2, !!head)}
        ${tool('data-mt="ride"', 'ride', '🐎 Ride it as an amendment', rideOn && rideT ? `Offer your ${TAG[rideT][1]} language as an amendment on the ${rideOn.name}: an extra card in that fight.` : 'Pick a bill, and they need a bill your caucus backs on the schedule.', 1, !!(rideOn && rideT && !rideOn.ride))}
        ${tool('data-mt="message"', 'message', '📣 Message vote', pk ? `Force a show vote on the ${pk.name}. It fails, but their senators up in ${electionYear(nextElectionK())} from states that like it go on the record (record back home −2); your party's mood rises.` : 'Pick a bill first.', 1, !!pk)}
        ${wpr ? tool('data-wpr', 'wpr', `☮ War Powers Resolution on ${S.war.place}`, '60% odds: force a vote to bring the troops home.', 2) : ''}</div>`;
  }
  return `<hr><div class="fl-dock"><b>📋 The Floor Schedule</b> <small style="color:var(--dim)">· ${maj ? 'your party controls the floor: you set the picks and the order' : IND() ? `the ${them.name} majority controls the floor · flip PASS/KILL on any of their bills (your Banner set the default)` : `the ${them.name} majority controls the floor: they set the schedule, and you fight it`}${S.nuclear ? ' · <b style="color:var(--gold2)">the filibuster is gone</b>' : ''}</small>
    <div class="fl-sched">${rows.map((r, i) => flRowHTML(r, i, U)).join('')}</div>${body}</div>`;
}
function flTopTag(fx) { const e = Object.entries(fx).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]; return e ? e[0] : null; }
// the scheduled bill (yours) that's the toughest vote for your members facing re-election
function flHoldTarget() {
  let best = null;
  for (const it of flQueue()) {
    if (it.by !== 'you' || it.win) continue;
    const ms = S.members.filter(m => m.party === S.side && isUp(m) && stateFit(m.state, it.tpl[2]) < -1.5);
    if (ms.length && (!best || ms.length > best.ms.length)) best = { it, ms };
  }
  return best;
}
// the majority's next bill on the schedule, the target of threats and riders: one they want and you don't, if there is one
function flTheirs(q) { return q.find(x => x.by === 'them' && x.aim === 'kill') || q.find(x => x.by === 'them') || null; }
function bindDocket(redraw0) {
  const redraw = () => { const sc = $('#modal-card').scrollTop; redraw0(); $('#modal-card').scrollTop = sc; };
  const card = $('#modal-card'), maj = isMajority(), c = S.career, U = flState(), q = flQueue();
  const pay = (key, cost) => { if (c.capital < cost || U.used[key]) return false; c.capital -= cost; U.used[key] = true; return true; };
  const done = (msg, good) => { toast(msg); good ? sfx.up() : sfx.down(); redraw(); };
  const place = it => { flFill(); const i = clamp(U.sel, 0, q.length - 1); q[i] = it; };
  card.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { U.sel = +b.dataset.slot; sfx.click(); redraw(); });
  card.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const i = +b.dataset.mv; if (i > 0 && q[i]) { [q[i - 1], q[i]] = [q[i], q[i - 1]]; U.sel = i - 1; sfx.click(); redraw(); } });
  card.querySelectorAll('[data-aim]').forEach(b => b.onclick = () => { const it = q[+b.dataset.aim]; if (!it || (billParty(it.name) && !IND())) return; it.aim = it.aim === 'kill' ? 'pass' : 'kill'; sfx.click(); toast(it.aim === 'kill' ? `Your caucus will fight the ${it.name}.` : `Your caucus will back the ${it.name}.`); redraw(); });
  card.querySelectorAll('[data-dk]').forEach(b => b.onclick = () => {
    const o = U.offers[+b.dataset.dk]; if (!o) return;
    if (!maj) { U.pick = o; sfx.click(); redraw(); return; }
    if (q.some(x => x.name === o.name)) return;
    place({ ...o }); done(`On the schedule: the ${o.name}.`, true);
  });
  card.querySelectorAll('[data-own]').forEach(b => b.onclick = () => {
    const tag = b.dataset.own, it = { ...flItem(flOwnBill(tag), 'you'), own: tag };
    if (!maj) { U.pick = it; sfx.click(); redraw(); return; }
    if (!pay('own' + tag, 1)) { toast('Not enough capital.'); return; }
    place(it); done(`You brought the ${it.name} to the floor.`, true);
  });
  card.querySelectorAll('[data-ft]').forEach(b => b.onclick = () => { if (S.prep.fast || !pay('ft', 1)) return; S.prep.fast = 1; done('Fast-tracked: the next bill gets an extra day.', true); });
  card.querySelectorAll('[data-hold]').forEach(b => b.onclick = () => {
    const h = flHoldTarget(); if (!h || !pay('hold', 1)) return;
    q.splice(q.indexOf(h.it), 1);
    for (const m of h.ms) { m.rec = clamp((m.rec || 0) + 2, -15, 15); hist(m, `Spared a tough vote on the ${h.it.name} when leadership held the floor`); }
    done(`You held the floor: the ${h.it.name} goes back on the shelf. ${h.ms.length} of your members breathe easier.`, true);
  });
  card.querySelectorAll('[data-nuke]').forEach(b => b.onclick = () => {
    if (S.nuclear || !pay('nuke', 3)) return;
    S.nuclear = true; S.mood = clamp(S.mood - 1, -15, 15); unlock('nuclear');
    for (const m of S.members) if (m.party === other(S.side) && T(m, 'leader')) hist(m, 'Called the end of the filibuster "a day of shame for the Senate"');
    done('☢️ The nuclear option: the legislative filibuster is dead. Simple majorities from now on, for everyone.', true);
  });
  card.querySelectorAll('[data-wpr]').forEach(b => b.onclick = () => {
    const it = { ...flItem([`War Powers Resolution on ${S.war.place}`, `Order U.S. forces out of ${S.war.place} within 30 days.`, { security: -2, welfare: 1, taxes: 1 }], 'you'), win: !maj, note: maj ? '' : 'Forced on by petition' };
    if (maj) { if (!pay('wpr', 1)) return; place(it); return done(`The War Powers Resolution on ${S.war.place} is on the schedule.`, true); }
    if (!pay('wpr', 2)) return;
    if (Math.random() > 0.6) return done('The War Powers petition fell short. The majority keeps the floor.', false);
    q.unshift(it); done(`You forced a War Powers vote on ${S.war.place}: it comes up next.`, true);
  });
  card.querySelectorAll('[data-mt]').forEach(b => b.onclick = () => flTool(b.dataset.mt, pay, done));
}
// the minority's tools
function flTool(k, pay, done) {
  const U = flState(), q = flFill(), pk = U.pick, them = PARTY[other(S.side)].name;
  const mine = () => ({ ...pk, by: 'you', aim: 'pass', win: true });
  if (k === 'discharge') {
    if (!pk || !pay(k, 2)) return;
    if (Math.random() > 0.6) return done('The discharge petition fell short of a majority. Leadership keeps its pick.', false);
    const h = flTheirs(q); if (h) q.splice(q.indexOf(h), 1); q.unshift({ ...mine(), note: 'Discharge petition' }); if (h) q.push(h); unlock('discharge');
    return done(`Discharge petition succeeds: the ${pk.name} comes up next.`, true);
  }
  if (k === 'owed') {
    if (!pk || !(S.cau && S.cau.floorOwed > 0) || !pay(k, 0)) return;
    S.cau.floorOwed--; q.splice(1, 0, { ...mine(), note: 'Owed to the Independent caucus' });
    return done(`The ${pk.name} goes on the schedule right after this week's bill.`, true);
  }
  if (k === 'uc') {
    if (!pk || !pay(k, 1)) return;
    if (Math.random() > 0.3) return done(`"Objection." The ${them} whip was not, in fact, at lunch.`, false);
    q.splice(1, 0, { ...mine(), note: 'Unanimous-consent ambush' }); unlock('discharge');
    return done(`Nobody objected! The ${pk.name} goes on the schedule right after this week's bill.`, true);
  }
  if (k === 'pull') {
    const t = flTheirs(q); if (!t || !pay(k, 2)) return;
    if (Math.random() > 0.5) return done(`Leadership calls your bluff: the ${t.name} stays put.`, false);
    q.splice(q.indexOf(t), 1); q.push(t);
    return done(`They blinked. The ${t.name} goes to the back of the line.`, true);
  }
  if (k === 'ride') {
    const t = q.find(x => x.by === 'them' && x.aim === 'pass'), tag = pk && flTopTag(pk.tpl[2]); if (!t || !tag || t.ride || !pay(k, 1)) return;
    t.ride = tag;
    return done(`Your ${TAG[tag][1]} language will ride as an amendment on the ${t.name}.`, true);
  }
  if (k === 'message') {
    if (!pk || !pay(k, 1)) return;
    const hit = S.members.filter(m => m.party === other(S.side) && isUp(m) && stateFit(m.state, pk.tpl[2]) > 0.5);
    for (const m of hit) { m.rec = clamp((m.rec || 0) - 2, -15, 15); hist(m, `Voted against the ${pk.name} in a message vote`); }
    const d = Math.min(1.5, 0.5 + hit.length * 0.15); S.mood = clamp(S.mood + d, -15, 15);
    log(`Message vote on the ${pk.name}: it failed, as planned.`, 'good');
    return done(`Message vote: the ${pk.name} fails, and ${hit.length} ${them}${hit.length === 1 ? '' : 's'} up next year are on record against it. Your party's mood +${d.toFixed(1)}.`, true);
  }
}

/* ---------------- the newspaper, when you were killing it ---------------- */
function floorHeadline(won, headline, y, n) {
  const B = S.bill, name = B.name.toUpperCase(), me = PARTY[S.side].short, them = PARTY[other(S.side)].short, P = lastName(S.president).toUpperCase();
  if (B.budget) return won ? { h: 'GOVERNMENT SHUTS DOWN', d: `The ${them}' budget dies ${headline === 'DEAD IN THE HOUSE' ? 'in the House' : /VETO/.test(headline) ? 'by veto' : `on the Senate floor, ${y}–${n}`}; the ${me} dig in and dare the majority to blink.`, mood: 'storm' }
    : { h: `${them.toUpperCase()} PUSH THEIR BUDGET THROUGH`, d: `A ${y}–${n} vote over ${me}' objections. The lights stay on; the priorities are theirs.`, mood: 'night' };
  if (B.nomination) return won ? { h: 'SENATE REJECTS NOMINEE', d: `A ${n}–${y} rebuke for ${presTitle()}. The seat stays open.`, mood: 'dawn' }
    : { h: `SENATE CONFIRMS ${B.name.replace('Confirmation of Judge ', '').toUpperCase()}`, d: `Over ${me}' objections, ${y}–${n}. The Court now stands ${courtLabel()}.`, mood: 'night' };
  if (won) {
    if (headline === 'FILIBUSTERED') return { h: `FILIBUSTER KILLS ${name}`, d: `${y} votes, ${(B.cloture || B.super) - y} short of cloture. The ${me} hold the line.`, mood: 'dawn' };
    if (headline === 'DEAD IN THE HOUSE') return { h: `${name} DIES IN THE HOUSE`, d: `It cleared the Senate ${y}–${n}, then hit a wall across the Capitol.`, mood: 'dawn' };
    if (headline === 'VETOED') return { h: `${P} VETOES ${name}`, d: 'The President\'s pen finishes what the Senate couldn\'t.', mood: 'dawn' };
    if (headline === 'VETO SUSTAINED') return { h: 'THE VETO STANDS', d: `The override falls short; the ${B.name} is dead.`, mood: 'dawn' };
    return pick([{ h: 'BILL DIES ON THE FLOOR', d: `The ${B.name} goes down ${y}–${n}. ${S.rival} counted wrong.`, mood: 'dawn' }, { h: `SENATE REJECTS ${name}, ${n}–${y}`, d: `The ${me} whip operation holds; ${them} leaders vow to try again.`, mood: 'dawn' }]);
  }
  if (headline === 'VETO OVERRIDDEN') return { h: 'CONGRESS OVERRIDES VETO', d: `The ${B.name} becomes law over ${presTitle()}'s objection.`, mood: 'storm' };
  if (y - n <= 2) return { h: `BY A HAIR: ${name} SQUEAKS THROUGH`, d: `A ${y}–${n} nail-biter; the ${me} whip comes up one short.`, mood: 'night' };
  return { h: `${name} BECOMES LAW`, d: `The Senate passes it ${y}–${n} over ${me}' objections; ${presTitle()} signs.`, mood: 'night' };
}
function floorPaperBody(won, headline) {
  const B = S.bill, L = pick(S.members.filter(m => T(m, 'leader') && m.party === S.side)) || pick(S.members);
  const O = pick(S.members.filter(m => side(m) === 'opp')) || pick(S.members);
  return [
    `WASHINGTON — ${won ? 'In a win for the ' + PARTY[S.side].short : 'In a setback for the ' + PARTY[S.side].short}, the ${B.name} is ${won ? 'dead' : B.nomination ? 'done: the nominee is confirmed' : 'the law of the land'} after ${B.days} day${B.days === 1 ? '' : 's'} of furious whipping on the Senate floor${won && headline === 'FILIBUSTERED' ? ', felled by a filibuster' : won && headline === 'DEAD IN THE HOUSE' ? ', then left for dead in the House' : won && /VETO/.test(headline || '') ? ', then finished off by a veto' : ''}.`,
    `"${won ? pick(['We said no, and we meant it.', 'Some bills deserve to die. This was one.', 'The minority still has a voice in this chamber.']) : pick(['We\'ll repeal it the day we take this place back.', 'They had the votes. We had the arguments.', 'Remember this vote in November.'])}" said Sen. ${L.name} (${tagOf(L)}).`,
    `"${won ? pick(['Obstruction, plain and simple.', 'They\'d filibuster the Pledge of Allegiance.', 'The American people will remember who said no.']) : pick(['Today the Senate worked.', 'Promises made, promises kept.', 'The obstruction is over.'])}" countered Sen. ${O.name} (${tagOf(O)}).`,
  ];
}
