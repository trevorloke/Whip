'use strict';
/* =====================================================================
   ORG — the independents in a D/R career: who they caucus with, the
   Independents' Price, and an independent-led Senate seen from a party.
   Loaded after floor.js. game.js calls every function here through typeof
   guards (orgBillStart, orgBillEnd, orgApBonus, orgBillLog); wing.js's deal
   calls indsEnsure().

   Everything here runs only in a D/R career with the parity switch on
   (PARITY()), and nothing runs or is written during the first Congress
   (k = floor(bills / 6) < 1), except indsEnsure() called by the wing.js deal
   or an independent White House's own bill. The I career never runs this file's
   screens: its Senate control lives in caucus.js.

   State (CONTRACT §4):
     S.inds = { chair: { name, style } | null, label, partner: 'D'|'R', lead, k, courted: { D, R },
                trust: { D, R }, savedRival: { rival, rivalStyle } | null, led }
   S.org (game.js orgRefresh) is the cache of who organizes; this file only calls orgRefresh() and
   writes S.org.shownK (the marker that prints each control change on a front page once).
   Labels are never written here (no indLabel): only m.label as set at the fixed points.
   ===================================================================== */

const ORG_HOW = {
  alone: 'on its own', coalition: 'with the independents as the junior partner', bargain: 'under a Gavel Bargain: an independent Majority Leader',
  iplural: 'because the independents out-seat their partner', plurality: 'as the biggest bloc', 'two-party': 'on the two-party count',
};
const orgK = () => Math.floor(S.career.bills / 6);
const orgOn = () => !!S && !!S.career && !IND() && PARITY();
const orgCode = p => p === 'D' ? 1 : p === 'R' ? 2 : p === 'I' ? 3 : 0;
// one number per control change (Congress, before, after): S.org.shownK holds the last one printed
const orgStamp = () => S.org ? orgK() * 100 + orgCode(S.org.prevFloor) * 10 + orgCode(S.org.floor) : -1;
const orgWho = f => f === 'I' ? 'the Independent-led coalition' : `the ${PARTY[f].name} majority`;
// a score with one decimal (the partner scores move in halves)
const orgF1 = v => (v > 0 ? '+' : '') + (Math.round(v * 10) / 10);

/* ---------------- the NPC independents ---------------- */
function indsMembers() { return S.members.filter(m => m.party === 'I'); }
// where an independent sits, −1 (left, the Democrats' side) … +1 (right): the label's lean, else where they came from, else their issues
function indsLeanOf(m) {
  if (m.label && typeof IND_LABELS !== 'undefined' && IND_LABELS[m.label]) return indLabelInfo(m.label).lean;
  if (m.exParty === 'D') return -0.5;
  if (m.exParty === 'R') return 0.5;
  const dw = pr => TAGS.reduce((a, t) => a + ((m.w && m.w[t]) || 0) * (pr[t] || 0), 0), s = dw(PARTY.R.prior) - dw(PARTY.D.prior);
  return s < 0 ? -0.3 : s > 0 ? 0.3 : 0;
}
function indsAvgLean() { const I = indsMembers(); return I.length ? I.reduce((a, m) => a + indsLeanOf(m), 0) / I.length : 0; }
// the caucus's banner: the most common real label among the independents (ties: the first in Senate order), else Common Ground
function indsLabel() {
  const n = {}; let best = null;
  for (const m of indsMembers()) if (m.label && typeof IND_LABELS !== 'undefined' && IND_LABELS[m.label]) { n[m.label] = (n[m.label] || 0) + 1; if (!best || n[m.label] > n[best]) best = m.label; }
  return best || 'Common Ground';
}
// create S.inds (no-op when it exists). Called when the independents are pivotal, at the first election's interlude, or by the wing.js deal.
// k0: the Congress S.inds counts as organized for. The interlude hook passes −1 (it organizes them next); every other caller
// (the wing.js deal, an independent bill mid-Congress) gets the current Congress, so a mid-Congress creation never reads as a
// new Congress at the next interlude (no Price and no re-frozen partner in the middle of a Congress)
function indsEnsure(k0) {
  if (!S || IND() || !PARITY()) return null;
  if (!S.inds) S.inds = { chair: null, label: indsLabel(), partner: indsRulePartner(), lead: false, k: k0 === undefined ? (S.career ? orgK() : -1) : k0, courted: { D: 0, R: 0 }, trust: { D: 0, R: 0 }, savedRival: null, led: 0 };
  return S.inds;
}
// the independents' floor leader, drawn on first display
function indsChair() {
  const I = indsEnsure(); if (!I) return null;
  if (!I.chair) {
    let name = pick(RIVAL_FIRST) + ' ' + pick(LAST);
    if (name === S.rival) name = pick(RIVAL_FIRST) + ' ' + pick(LAST);
    I.chair = { name, style: pick(Object.keys(RIVAL_STYLES)) };
  }
  return I.chair;
}
function indsLeadScore(p) { const I = S.inds || {}; return indLeadScore(p, (I.trust && I.trust[p]) || 0, !!I.led); }
// what the independents would do if the Congress organized now. Pure: no RNG, no writes
//   score(p) = −3·|avg lean − (D −1 | R +1)| + courted[p] + trust[p] + 1 for the current partner; a tie keeps the partner
//   lead: a legal Gavel Bargain whose score is ≥ 0, and never taken from the player's own party (that has to be offered: ip:gavel)
function indsDecide() {
  const I = S.inds || { courted: {}, trust: {}, partner: null, led: 0 }, avg = indsAvgLean();
  const sc = p => -3 * Math.abs(avg - (p === 'D' ? -1 : 1)) + (I.courted[p] || 0) + (I.trust[p] || 0) + (p === I.partner ? 1 : 0);
  const d = sc('D'), r = sc('R');
  const partner = d === r ? (I.partner || indsRulePartner()) : d > r ? 'D' : 'R';
  const lead = partner !== S.side && indLeadLegal(partner) && indLeadScore(partner, I.trust[partner] || 0, !!I.led) >= 0;
  return { partner, lead, score: { D: d, R: r } };
}
// the Congress organizes: the independents pick a partner and maybe the gavel (deterministic), then the cache is frozen
function indsOrganizeAI() {
  const I = indsEnsure(); if (!I) return null;
  const d = indsDecide();
  I.partner = d.partner; I.lead = d.lead; I.label = indsLabel(); I.k = orgK();
  if (I.lead) I.led++;
  I.courted = { D: 0, R: 0 };
  orgRefresh({ freeze: true });
  return d;
}

/* ---------------- bills: an independent bill on the floor (game.js startBill / settle) ---------------- */
// your party's verdict on an independent bill: its fit with your party's priorities (a partner leans in)
function orgAim(fx) { return dotPrior(S.side, fx || {}) + (indPartner() === S.side ? 0.5 : 0) >= 0 ? 'pass' : 'kill'; }
function orgBillStart(B) {
  if (!orgOn() || !B) return;
  const it = typeof flLastIt !== 'undefined' ? flLastIt : null;
  if (!(it && it.aimSet && it.name === B.name)) B.aim = orgAim(B.fx);
  if (B.aim === 'kill' && (S.inds || orgK() >= 1)) {
    const ch = indsChair();
    if (ch) { if (!S.inds.savedRival) S.inds.savedRival = { rival: S.rival, rivalStyle: S.rivalStyle || rivalStyle() }; S.rival = ch.name; S.rivalStyle = ch.style; }
  }
}
// the log line for an independent bill (game.js calls it after startBill's log reset, when present)
function orgBillLog(B) {
  if (!orgOn() || !B || B.owner !== 'I') return;
  const wh = S.president.party === 'I' && floorParty() !== 'I';
  log(wh ? `The independent White House sends the ${B.name} to the floor. ${B.aim === 'kill' ? `Your caucus wants it dead; Sen. ${S.rival} whips it for the independents.` : 'Your caucus backs it.'}`
    : `The Independent-led coalition brings the ${B.name} to the floor. ${B.aim === 'kill' ? `Your caucus wants it dead; Sen. ${S.rival} whips it.` : 'Your caucus backs it.'}`, 'sys');
}
function orgBillEnd() {
  const I = S.inds; if (!orgOn() || !I || !I.savedRival) return;
  S.rival = I.savedRival.rival || S.rival; if (I.savedRival.rivalStyle) S.rivalStyle = I.savedRival.rivalStyle;
  I.savedRival = null;
}
// the junior partner's gavels: one more action a day
function orgApBonus() { return orgOn() && inCoalition() ? 1 : 0; }

/* ---------------- The Independents' Price (a new Congress where the independents decide) ---------------- */
function orgOutcomeLine(o) {
  return o.floor === 'I' ? `<b style="color:${PARTY.I.color}">the independents organize the Senate</b> ${ORG_HOW[o.how] || ''}${o.coal ? `, with the ${PARTY[o.coal.with].short} as the junior partner` : ''}`
    : `<b style="color:${PARTY[o.floor].color}">the ${PARTY[o.floor].short} organize the Senate</b> ${ORG_HOW[o.how] || ''}`;
}
function indsSenHTML(m) {
  const lb = m.label && typeof IND_LABELS !== 'undefined' && IND_LABELS[m.label] ? indPill(m.label) : '';
  return `<div class="org-sen">${portrait(m)}<div><b>Sen. ${m.name}</b> <small>(I-${m.state})</small><br>${lb}${m.exParty ? ` <small>ex-${m.exParty}</small>` : ''}</div></div>`;
}
function indsPriceModal(next) {
  const I = indsEnsure(), c = S.career, used = {}, year = billYear(c.bills + 1), K = `The Independents' Price · ${year}`;
  if (!I) return next();
  const before = floorParty(), ch = indsChair(), mine = PARTY[S.side];
  const draw = () => {
    const d = indsDecide(), o = orgOutcome(d.partner, d.lead), gavel = indLeadLegal(S.side), lead = d.lead ? indsLeadScore(d.partner) : null;
    const courtBtn = (n, label, sub) => `<button class="btn" data-choice="ip:court:${n}" ${used['c' + n] || c.capital < n ? 'disabled' : ''}><span>${label}${used['c' + n] ? ' ✓' : ''}<small>${sub}</small></span><span class="cost">${n} capital</span></button>`;
    const gp = indGavelPath();
    showModal(`<div class="kicker">${K}</div><h2>${gavel || indLeadLegal(other2(S.side)) ? 'The independents could take the gavel' : 'The independents hold the balance'}</h2>
      <p>The new Senate is <b>${blocLine()}</b>. Neither party can organize it alone${seats('I') > 1 ? `, and the ${seats('I')} independents know it` : ', and the independent knows it'}. Sen. ${ch.name}, who chairs their caucus${I.label ? ` (${indPill(I.label)})` : ''}, is taking calls from both leaders.</p>
      <div class="org-sens">${indsMembers().map(indsSenHTML).join('')}</div>
      <div class="org-proj"><b>If the Senate organized today:</b> ${orgOutcomeLine(o)}.<br>
        <small>The independents lean ${d.partner === 'D' ? 'Democratic' : 'Republican'} · their score: ${PARTY.D.short} ${orgF1(d.score.D)}, ${PARTY.R.short} ${orgF1(d.score.R)} (where they sit, what each side offered, trust, and +1 for their current partner)${d.lead ? ` · they would demand the gavel (bargain score ${fmt(lead)})` : ''}</small>
        <br><small>Path to the Gavel: ${gp.why}.</small></div>
      <p>The ${mine.short} can court them before the vote on the organizing resolution. Each offer can be made once.</p>
      <div class="shop org-shop">${courtBtn(1, 'Court them: dinner with the leader', 'Your party\'s offer counts for +1 when they choose.')}
        ${courtBtn(2, 'Court them: a committee gavel', 'A full chairmanship for one of theirs: +2.')}
        ${courtBtn(3, 'Court them: a seat at the leadership table', 'Their priorities in the leadership\'s weekly agenda: +3.')}
        ${gavel ? `<button class="btn org-gavel" data-choice="ip:gavel" ${used.g ? 'disabled' : ''}><span>Offer them the gavel<small>An independent Majority Leader with your party as the junior partner: you keep the other side out of power and get every third slot on the schedule and +1 action a day. Your base hates it (mood −0.5); their trust in you +1.</small></span><span class="cost">free</span></button>` : ''}</div>
      <div class="choices"><button class="btn primary big adv" id="ip-go" data-choice="ip:pass">Let them decide</button></div>`);
    const card = $('#modal-card');
    card.querySelectorAll('[data-choice^="ip:court:"]').forEach(b => b.onclick = () => {
      const n = +b.dataset.choice.split(':')[2]; if (used['c' + n] || c.capital < n) return;
      c.capital -= n; used['c' + n] = true; I.courted[S.side] = (I.courted[S.side] || 0) + n; sfx.click(); draw();
    });
    const g = card.querySelector('[data-choice="ip:gavel"]');
    if (g) g.onclick = () => {
      if (used.g || !indLeadLegal(S.side)) return; used.g = true;
      I.partner = S.side; I.lead = true; I.trust[S.side] = (I.trust[S.side] || 0) + 1; I.label = indsLabel(); I.k = orgK(); I.led++; I.courted = { D: 0, R: 0 };
      S.mood = clamp(S.mood - 0.5, -15, 15);
      orgRefresh({ freeze: true }); sfx.up(); after('gavel');
    };
    $('#ip-go').onclick = () => { indsOrganizeAI(); sfx.click(); after('pass'); };
  };
  const after = how => {
    const now = floorParty(), o = orgOutcome(), them = PARTY[other2(S.side)];
    const h = now === 'I' ? 'INDEPENDENTS TAKE THE GAVEL' : now !== before ? 'INDEPENDENTS SWITCH SIDES' : 'INDEPENDENTS HOLD THE BALANCE';
    const sub = now === 'I' ? `Sen. ${ch.name} becomes Majority Leader, with the ${PARTY[o.coal ? o.coal.with : S.inds.partner].short} as the junior partner. ${blocLine()}.`
      : `The independents caucus with the ${PARTY[S.inds.partner].short}: ${orgWho(now)} organizes the Senate. ${blocLine()}.`;
    const body = [how === 'gavel' ? `In a deal nobody saw coming, the ${mine.short} handed the gavel to the independents rather than let the ${them.short} run the floor. "We chose the country over the caucus," a ${mine.short} leader said, to boos from the base.`
      : now === 'I' ? `The ${PARTY[S.inds.partner].short} needed the votes more than they needed the title. For the first time in memory, the Senate has an independent Majority Leader.`
      : `The independents' votes went to the ${PARTY[S.inds.partner].short}, and the organizing resolution passed on schedule.`,
      inCoalition() ? `Your party is the junior partner: every third slot on the schedule is yours, and your whip operation gets an extra action a day.` : isMajority() ? 'Your party runs the floor.' : `Your party is in the minority.`];
    if (S.org) S.org.shownK = orgStamp();
    showModal(`<div class="kicker">${K}</div>${frontPage({ headline: h, sub, body, mood: now === 'I' ? 'dawn' : 'night', date: `January ${year} · The new Congress` })}
      <div class="choices"><button class="btn primary big adv" id="ip-ok">On to the new Congress</button></div>`);
    $('#ip-ok').onclick = () => next();
  };
  draw();
}

/* ---------------- a control change between bills: one front page each ---------------- */
function orgControlPage(next) {
  const o = S.org, prev = o.prevFloor, now = o.floor, year = billYear(S.career.bills + 1);
  const h = now === 'I' ? 'INDEPENDENTS TAKE THE GAVEL' : prev === 'I' ? `THE GAVEL GOES BACK TO THE ${PARTY[now].short.toUpperCase()}` : 'INDEPENDENTS SWITCH SIDES';
  const sub = now === 'I' ? `The independents run the Senate ${ORG_HOW[o.how] || ''}. ${blocLine()}.` : `${orgWho(now)[0].toUpperCase() + orgWho(now).slice(1)} organizes the Senate. ${blocLine()}.`;
  const body = [now === 'I' ? 'The organizing resolution is rewritten overnight: committee gavels change hands and the floor schedule belongs to the independents.'
    : prev === 'I' ? 'The independent experiment is over: without the votes to hold it, the Majority Leader\'s desk changes hands.' : 'The independents\' votes moved, and the Senate moved with them.',
    inCoalition() ? 'Your party is the junior partner of the governing coalition.' : isMajority() ? 'Your party runs the floor.' : 'Your party is in the minority.'];
  o.shownK = orgStamp();
  showModal(`<div class="kicker">${h}</div>${frontPage({ headline: h, sub, body, mood: now === 'I' ? 'dawn' : 'night', date: `${season(S.career.bills + 1)} ${year}` })}
    <div class="choices"><button class="btn primary big adv" id="org-ok">Back to work</button></div>`);
  $('#org-ok').onclick = () => next();
}
// a control change worth a front page: to or from the independents, or a D↔R switch because the independents changed partners
// (p0: the frozen partner before this interlude; a D↔R change from seat moves alone is not the independents switching sides)
function orgChangeShown(p0) {
  const o = S.org; if (!o || !o.prevFloor || o.prevFloor === o.floor || o.shownK === orgStamp()) return false;
  if (o.prevFloor === 'I' || o.floor === 'I') return true;
  return seats('I') > 0 && !!o.partner && o.partner !== p0 && orgOutcome('D', false).floor !== orgOutcome('R', false).floor;
}

/* ---------------- between bills (D/R careers, PARITY, from the second Congress on) ---------------- */
HOOKS.interlude.push(() => {
  if (!orgOn()) return [];
  const k = orgK(); if (k < 1) return [];
  const steps = [];
  // a new Congress: S.inds not yet organized for it (created at the Congress's first interlude, right after the election)
  const newCong = S.inds ? S.inds.k !== k : S.career.bills % 6 === 0;
  const p0 = S.org ? S.org.partner : null;
  // the election night already printed this Congress's control headline: mark it as shown
  if (newCong && S.org && S.org.k === k) S.org.shownK = orgStamp();
  // the gavel is checked against the seats at every interlude (deaths, switches, the election)
  if (S.inds && S.inds.lead && orgOutcome().floor !== 'I') S.inds.lead = false;
  if (S.inds && !seats('I')) { S.inds.k = k; S.inds.lead = false; }
  let price = false;
  if (seats('I') > 0 && newCong) {
    if (indPivotal()) { indsEnsure(-1); price = true; steps.push(next => indsPriceModal(next)); }
    else { indsEnsure(-1); indsOrganizeAI(); }
  } else orgRefresh();
  if (!price && orgChangeShown(p0)) steps.push(next => orgControlPage(next));
  return steps;
});
