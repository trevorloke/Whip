'use strict';
/* =====================================================================
   DEPTH — achievements and legacy, the opposing whip's personality and
   poison pills, campaign promises, and newspaper headlines.
   Loaded after game.js, content.js and art.js.
   ===================================================================== */

/* ---------------- achievements & legacy ---------------- */
const ACH = [
  ['first', '🖋', 'First Law', 'Get a bill signed into law.'],
  ['budget', '💵', 'Power of the Purse', 'Pass a yearly budget.'],
  ['landmark', '🏛', 'Landmark', 'Pass a 60-vote landmark bill.'],
  ['treaty', '📜', 'Two-Thirds', 'Pass a 67-vote treaty or amendment.'],
  ['override', '⚔️', 'Veto Slayer', 'Override a presidential veto.'],
  ['tiebreak', '⚖️', 'Tiebreaker', 'Win on the Vice President\'s tiebreaking vote.'],
  ['blowout', '🌊', 'Landslide', 'Pass a bill with 70 or more yeas.'],
  ['streak5', '🔥', 'Hot Streak', 'Win 5 votes in a row.'],
  ['streak10', '☄️', 'Unstoppable', 'Win 10 votes in a row.'],
  ['justice', '🧑‍⚖️', 'Lifetime Appointment', 'Confirm a Supreme Court justice.'],
  ['shutdown', '🚧', 'Lights Out', 'Suffer a government shutdown. Ouch.'],
  ['deal', '🤝', 'Strange Bedfellows', 'Cut a deal with an independent.'],
  ['dirt', '🕵️', 'Dirty Hands', 'Use dirt on a senator.'],
  ['leader', '👑', 'Win the Bloc', 'Lock in a faction leader.'],
  ['pill', '💊', 'Antidote', 'Defeat a poison-pill amendment.'],
  ['primary', '🗡️', 'Primary Colors', 'Back a primary challenger who wins.'],
  ['flip3', '🗺️', 'Map Changer', 'Flip 3 or more Senate seats in one election.'],
  ['super60', '🦅', 'Filibuster-Proof', 'Hold 60 Senate seats.'],
  ['trifecta', '🎩', 'Trifecta', 'Hold the Senate, the House and the White House after an election.'],
  ['promise', '🤞', 'Promise Keeper', 'Keep every campaign promise for a full term.'],
  ['master', '🏆', 'Master of the Senate', 'Reach the rank of Master of the Senate.'],
];
function achState() { try { return JSON.parse(localStorage.getItem('floorfight.ach')) || {}; } catch (e) { return {}; } }
function unlock(id) {
  const a = achState(); if (a[id]) return;
  a[id] = Date.now(); try { localStorage.setItem('floorfight.ach', JSON.stringify(a)); } catch (e) { }
  const x = ACH.find(z => z[0] === id); if (!x) return;
  const el = document.createElement('div'); el.className = 'toast ach'; el.textContent = `🏆 Achievement unlocked: ${x[1]} ${x[2]}`;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), 4200);
  if (S && S.career) S.career.legacy = (S.career.legacy || 0) + 10;
}
function legacyHTML() {
  const a = achState(), got = ACH.filter(x => a[x[0]]).length, r = getRecords();
  return `<h3>Hall of Legacy · ${got}/${ACH.length}${r.legacy ? ` · best legacy ${r.legacy}` : ''}</h3><div class="achgrid">${ACH.map(x => `<div class="ach ${a[x[0]] ? 'got' : ''}"><span class="ai">${x[1]}</span><span><b>${x[2]}</b>${x[3]}</span></div>`).join('')}</div>`;
}
function addLegacy(n) { S.career.legacy = (S.career.legacy || 0) + n; }

/* ---------------- the opposing whip ---------------- */
const RIVAL_STYLES = {
  bulldog: ['Bulldog', 'Leans on one more senator every night.'],
  schemer: ['Schemer', 'Loves poison-pill amendments and procedural tricks.'],
  charmer: ['Charmer', 'Works fewer senators, but each visit lands 40% harder.'],
};
function rivalStyle() { if (!S.rivalStyle) S.rivalStyle = pick(Object.keys(RIVAL_STYLES)); return S.rivalStyle; }
function rivalMoves(base) { const st = rivalStyle(); return st === 'bulldog' ? base + 1 : st === 'charmer' ? Math.max(1, base - 1) : base; }
function rivalPush() { return rivalStyle() === 'charmer' ? 1.4 : 1; }

// a poison pill: the opposing whip offers the amendment that would cost you the most votes
function worstAmendment() {
  const B = S.bill;
  let worst = null, worstCount = 1e9;
  for (const a of shuffle(AMENDMENTS.slice()).slice(0, 8)) {
    for (const t in a[1]) B.fx[t] = (B.fx[t] || 0) + a[1][t];
    const yes = S.members.filter(m => isLockedYes(m) || support(m) > 0).length;
    for (const t in a[1]) B.fx[t] -= a[1][t];
    if (yes < worstCount) { worstCount = yes; worst = a; }
  }
  return worst;
}
function applyFx(name, fx) {
  const B = S.bill, before = new Map(S.members.map(m => [m.id, support(m)]));
  for (const t in fx) B.fx[t] = (B.fx[t] || 0) + fx[t];
  B.applied.push(name);
  for (const m of S.members) m.b.last = support(m) - before.get(m.id);
}
EVENTS.push({
  id: 'poison', w: 1, cond: () => !S.bill.nomination && S.bill.day >= 2, weight: () => rivalStyle() === 'schemer' ? 3 : 0.8,
  make: () => {
    const a = worstAmendment(); if (!a) return null;
    const B = S.bill, odds = clamp(0.45 + ((IND() ? seats('I') + (S.bill.patron ? seats(S.bill.patron) : 0) : seats(S.side)) - 50) * 0.03 + (isMajority() ? 0.12 : 0), 0.25, 0.85);
    return { title: `Poison Pill: the ${a[0]}`, paper: 'storm', text: `Sen. ${S.rival} moves to attach the <b>${a[0]}</b> to your bill. It's built to split your coalition: ${Object.entries(a[1]).map(([t, v]) => `${TAG[t][1]} ${v > 0 ? '+' : '−'}${Math.abs(v)}`).join(', ')}. The amendment vote is tonight.`, choices: [
      { t: 'Whip against it', s: `2 actions · ${Math.round(odds * 100)}% chance to defeat it`, can: () => S.bill.ap >= 2, f: B => { B.ap -= 2; if (Math.random() < odds) { log(`You beat back the ${a[0]}.`, 'good'); unlock('pill'); } else { applyFx(`${a[0]} (poison pill)`, a[1]); log(`The ${a[0]} passed despite you.`, 'bad'); } } },
      { t: 'Move to table it', s: '2 capital · the majority controls procedure', can: () => isMajority() && S.career.capital >= 2, f: () => { S.career.capital -= 2; log(`You tabled the ${a[0]}.`, 'good'); unlock('pill'); } },
      { t: 'Let it through', s: 'Free, but the bill changes', f: () => { applyFx(`${a[0]} (poison pill)`, a[1]); log(`You let the ${a[0]} onto the bill.`, 'bad'); } },
    ] };
  },
});

/* ---------------- campaign promises ---------------- */
// [id, label, kind, tag, blurb]
const PROMISES = [
  ['tag:welfare', 'Protect healthcare', 'tag', 'welfare', 'Pass a law that strengthens healthcare and the safety net.'],
  ['tag:taxes', 'Cut your taxes', 'tag', 'taxes', 'Pass a law that cuts taxes.'],
  ['tag:environment', 'Act on climate', 'tag', 'environment', 'Pass a law with real climate action.'],
  ['tag:security', 'Secure the border', 'tag', 'security', 'Pass a law that strengthens defense or the border.'],
  ['tag:economy', 'Bring jobs home', 'tag', 'economy', 'Pass a law that creates jobs.'],
  ['tag:rural', 'Stand with farmers', 'tag', 'rural', 'Pass a law for farm country.'],
  ['tag:urban', 'Make housing affordable', 'tag', 'urban', 'Pass a law for cities and housing.'],
  ['tag:tech', 'Win the future', 'tag', 'tech', 'Pass a law for tech and science.'],
  ['budgets', 'No shutdowns', 'budgets', null, 'Pass both yearly budgets this term.'],
  ['landmark', 'Think big', 'landmark', null, 'Pass a 60- or 67-vote landmark this term.'],
  ['bipartisan', 'Work across the aisle', 'bipartisan', null, 'Pass two bipartisan bills this term.'],
  ['clean', 'Clean up Washington', 'clean', null, 'No scandals and no dirt this term.'],
];
const promiseOf = id => PROMISES.find(p => p[0] === id);
// how much a promise helps in a given state's race
function promiseBoost(code) {
  let b = 0;
  for (const id of (S.election && S.election.platform) || []) {
    const P = promiseOf(id);
    b += P[2] === 'tag' ? clamp(ST[code].voter[P[3]] * 1.6, -2, 2.5) + 0.5 : 0.9;
  }
  return b;
}
function platformHTML() {
  const E = S.election, picked = E.platform || [];
  return `<div class="platform"><b>Your platform</b> <small style="color:var(--dim)">· pick up to 3 promises. Each one lifts your candidates where voters care about it. If your party holds the Senate, they become obligations for the next term: kept promises pay off, broken ones cost you.</small>
    <div class="pgrid">${PROMISES.map(P => `<button class="btn ${picked.includes(P[0]) ? 'on' : ''}" data-promise="${P[0]}" ${!picked.includes(P[0]) && picked.length >= 3 ? 'disabled' : ''}>${P[2] === 'tag' ? TAG[P[3]][0] + ' ' : ''}${P[1]}<small>${P[4]}</small></button>`).join('')}</div></div>`;
}
// called after the election: promises become obligations if your party holds the Senate
function adoptPromises() {
  const E = S.election, plat = E.platform || [];
  if (!plat.length) return '';
  if (IND() ? !caucusDecides() : !isMajority()) { S.promises = []; return IND() ? `<p>🤞 Your caucus doesn't hold the balance of power, so nobody will hold you to your platform.</p>` : `<p>🤞 Your party lost the Senate, so nobody will hold you to your platform.</p>`; }
  S.promises = plat.map(id => ({ id, due: S.career.bills + 6, done: false, count: 0, broken: false }));
  S.termBudgets = { passed: 0, total: 0 };
  return `<p>🤞 <b>${IND() ? 'You hold the balance, so now you have to deliver:' : 'You won, so now you have to deliver:'}</b> ${plat.map(id => promiseOf(id)[1]).join(', ')}. You have six bills.</p>`;
}
// a bill just finished: credit any promises it fulfills
function creditPromises(won, isLaw) {
  const B = S.bill, out = [];
  if (!S.promises || !S.promises.length) return out;
  if (B.budget) { S.termBudgets.total++; if (won) S.termBudgets.passed++; }
  for (const p of S.promises) {
    if (p.done || p.broken) continue;
    const P = promiseOf(p.id);
    if (P[2] === 'tag' && won && isLaw && (B.fx[P[3]] || 0) >= 2) p.done = true;
    if (P[2] === 'landmark' && won && (B.landmark || B.super >= 60)) p.done = true;
    if (P[2] === 'bipartisan' && won && isLaw && isBipartisan()) { p.count++; if (p.count >= 2) p.done = true; }
    if (P[2] === 'budgets' && B.budget && !won) p.broken = true;
    if (P[2] === 'clean' && S.dirtied) p.broken = true;
    if (p.done) out.push(`🤞 Promise kept: <b>${P[1]}</b>.`);
    if (p.broken) out.push(`💔 Promise broken: <b>${P[1]}</b>.`);
  }
  return out;
}
// the term is over: settle up
function judgePromises() {
  if (!S.promises || !S.promises.length) return '';
  const c = S.career, lines = [];
  let kept = 0;
  for (const p of S.promises) {
    const P = promiseOf(p.id);
    if (P[2] === 'budgets' && !p.broken && S.termBudgets.passed >= 2) p.done = true;
    if (P[2] === 'clean' && !p.broken) p.done = true;
    if (p.done && !p.broken) { kept++; c.capital += 3; S.mood += 1; addLegacy(15); lines.push(`✅ <b>${P[1]}</b>: kept. +3 capital, national mood +1.`); }
    else { c.confidence--; S.mood -= 2; for (const m of S.members) if (side(m) === 'you') m.rel -= 0.5; lines.push(`❌ <b>${P[1]}</b>: broken. −1 confidence, national mood −2.`); }
  }
  if (kept === S.promises.length) unlock('promise');
  S.promises = [];
  return `<div class="primnews"><b>Your promises from last time</b>${lines.map(t => `<p>${t}</p>`).join('')}</div>`;
}
function promiseStrip() {
  if (!S.promises || !S.promises.length) return '';
  const B = S.bill, left = Math.max(0, S.promises[0].due - S.career.bills);
  const helps = p => { const P = promiseOf(p.id); return !p.done && P[2] === 'tag' && (B.fx[P[3]] || 0) >= 2; };
  return `<div class="promises">🤞 Promises (${left} bill${left === 1 ? '' : 's'} left): ${S.promises.map(p => { const P = promiseOf(p.id); return `<span class="pchip ${p.done ? 'done' : p.broken ? 'broken' : helps(p) ? 'helps' : ''}">${p.done ? '✓' : p.broken ? '✗' : helps(p) ? '★' : '○'} ${P[1]}</span>`; }).join('')}${S.promises.some(helps) ? ' <small style="color:var(--gold2)">★ this bill would keep one</small>' : ''}</div>`;
}

/* ---------------- headlines ---------------- */
function billHeadline(won, headline, y, n) {
  const B = S.bill, name = B.name.toUpperCase();
  if (B.budget && !won) return { h: 'GOVERNMENT SHUTS DOWN', d: `Budget talks collapse; federal workers sent home. ${PARTY[S.side].short} whip under fire.`, mood: 'storm' };
  if (headline === 'VETOED' || headline === 'VETO SUSTAINED') return { h: `${lastName(S.president).toUpperCase()} VETOES ${name}`, d: 'The President\'s pen ends a hard-fought Senate win.', mood: 'storm' };
  if (headline === 'DEAD IN THE HOUSE') return { h: `${name} DIES IN THE HOUSE`, d: 'Senate victory turns to dust across the Capitol.', mood: 'storm' };
  if (B.nomination) return won ? { h: `SENATE CONFIRMS ${B.name.replace('Confirmation of Judge ', '').toUpperCase()}`, d: `The Court now stands ${courtLabel()}.`, mood: 'dawn' } : { h: 'NOMINEE REJECTED', d: 'A stinging defeat for the White House.', mood: 'storm' };
  if (!won) return { h: `${name} GOES DOWN, ${y}–${n}`, d: `${S.rival.split(' ')[1] ? 'Sen. ' + S.rival : S.rival} savors the win; the whip's count comes up short.`, mood: 'storm' };
  if (headline === 'VETO OVERRIDDEN') return { h: `CONGRESS OVERRIDES VETO`, d: `${B.name} becomes law over the President's objection.`, mood: 'dawn' };
  if (y - n <= 2) return { h: `BY A HAIR: ${name} SQUEAKS THROUGH`, d: `A ${y}–${n} nail-biter on the Senate floor.`, mood: 'dawn' };
  if (y >= 70) return { h: `${name} SAILS THROUGH, ${y}–${n}`, d: 'A rare show of unity in a divided capital.', mood: 'dawn' };
  return { h: `${name} BECOMES LAW`, d: `Senate passes it ${y}–${n}; ${presTitle()} signs.`, mood: 'dawn' };
}
function paperBody(won) {
  const B = S.bill, L = pick(S.members.filter(m => T(m, 'leader') && m.party === S.side)) || pick(S.members);
  const O = pick(S.members.filter(m => side(m) === 'opp')) || pick(S.members);
  return [
    `WASHINGTON — ${won ? 'In a win for the ' + PARTY[S.side].short : 'In a setback for the ' + PARTY[S.side].short}, the Senate ${won ? 'cleared' : 'rejected'} the ${B.name} after ${B.days} day${B.days === 1 ? '' : 's'} of furious whipping on the floor.`,
    `"${won ? pick(['The people sent us here to deliver. Today we delivered.', 'This is what governing looks like.', 'We counted every vote twice.']) : pick(['We\'ll be back.', 'The fight isn\'t over.', 'Some days the count just isn\'t there.'])}" said Sen. ${L.name} (${tagOf(L)}).`,
    `"${won ? pick(['A sad day for the country.', 'They\'ll regret this at the ballot box.', 'Rammed through, plain and simple.']) : pick(['Common sense won today.', 'The American people dodged a bullet.', 'Washington finally listened.'])}" countered Sen. ${O.name} (${tagOf(O)}).`,
  ];
}
// showMenu() runs from index.html once every module has loaded (achievements register at load)
