'use strict';
/* =====================================================================
   CAUCUS — "Lead the Independents", the third career (IND-CONTRACT §7).
   You chair the Independent caucus in a 48–49–3 Senate. You pick a
   Banner, hold the Organizing Resolution, and on every bill both
   parties bid for your votes (the Bidding). Between bills: the Caucus
   Room, defectors, poaching. At elections: the Independent Slate, the
   Third Force fall campaign and the Elector Gambit.
   Loaded LAST (after results.js). Everything here is reachable only in
   an independent career: every hook returns early unless IND(), and
   every function other files call is typeof-guarded on their side.
   Test hook: window.CAU_FORCE = { pledge, offerOK, poach, sd } short-
   circuits the matching random roll (harness use only, I mode only).
   ===================================================================== */

/* ---------------- 7.1 data, at load ---------------- */
// two of the contract's names ('Right to Repair Act', 'Insulin Price Cap Act') are already Democratic agenda bills (content.js):
// billParty() would make them D bills with a filibuster, so the caucus versions carry their own names
if (!AGENDA.I) AGENDA.I = [
  ['Congressional Stock Trading Ban', 'No member of Congress trades individual stocks. Ever.', { economy: 1, tech: 1, taxes: 1 }],
  ['Open Primaries Act', 'Every voter gets a primary ballot, party card or not.', { urban: 1, rural: 1, tech: 1 }],
  ['Fix It Yourself Act', 'Farmers and families can fix what they own: parts, manuals and software, at fair prices.', { rural: 2, tech: 1, economy: 1 }],
  ['Insulin for Everyone Act', '$35 a month, insured or not, from every maker.', { welfare: 2, taxes: -1 }],
  ['Pay-As-You-Go Restoration Act', 'Every new dollar of spending needs a dollar of savings.', { taxes: 2, welfare: -1, economy: 1 }],
  ['Rural Hospitals Rescue Act', 'Keep the lights on in county hospitals.', { rural: 2, welfare: 2, taxes: -1 }],
  ['Housing Supply Act', 'Zoning-reform money for towns that build.', { urban: 2, economy: 1 }],
  ['Veterans Care Choice Act', 'See any doctor; the VA pays.', { security: 1, welfare: 2, taxes: -1 }],
  ['Clean Grid Permitting Act', 'Transmission lines in years, not decades.', { environment: 1, economy: 2, tech: 1 }],
  ['Campaign Finance Disclosure Act', 'Every dollar over $1,000, online within 48 hours.', { tech: 1, urban: 1, rural: 1 }],
];
if (!LANDMARKS.I) LANDMARKS.I = [
  ['Congressional Term Limits Amendment', 'Twelve years and out. A constitutional amendment: 67 votes.', 67, { taxes: 1, economy: 1, rural: 1, urban: 1 }],
  ['Clean Elections Act', 'Public financing for every federal campaign. Needs 60 for cloture.', 60, { tech: 1, welfare: 1, urban: 1, taxes: -1 }],
];
const CAU_RANKS = [[0, 'Caucus Coordinator'], [3, 'Swing Vote'], [7, 'Power Broker'], [12, 'Caucus Chair'], [20, 'Kingmaker'], [30, 'The Third Force'], [45, 'Founder of a Party']];
ACH.push(
  ['cau_org', '🔑', 'Organizing Resolution', 'Your caucus vote decides who runs the Senate.'],
  ['cau_jeffords', '🔀', 'The Jeffords', 'Hand the Senate to the other party mid-Congress.'],
  ['cau_kingmaker', '👑', 'Kingmaker', 'Decide 10 bills with your votes.'],
  ['cau_price', '💰', 'Name Your Price', 'A party raises its offer on a landmark.'],
  ['cau_balance', '⚖️', 'Balance of Power', 'An election leaves neither party able to organize alone.'],
  ['cau_defect', '🚪', 'Welcome Aboard', 'A party senator joins your caucus.'],
  ['cau_caucus5', '5️⃣', 'Caucus of Five', 'Lead 5 independent senators.'],
  ['cau_ten', '🎪', 'A Real Third Party', 'Lead 10 independent senators.'],
  ['cau_line', '📈', 'Five Percent', 'Your ticket wins 5% of the national vote.'],
  ['cau_electors', '🗳', 'Kingmaker Electors', 'Your electors choose the President.'],
  ['cau_wh', '🏛', 'Third Way to the White House', 'Elect an independent President.'],
  ['cau_standaside', '🌾', 'Stand Aside', 'Win a race a major party stood aside in.'],
  ['cau_rcv', '🔢', 'Ranked Choice', 'Win a race on transferred ballots.'],
);
// concessions a party can put on the table: key → [cost, label (p, B), side, timing, short label (p, B)]
// side 'owner': only the party that wants the bill law can write your rider into it. timing 'settle': paid only if you win and trust holds
const CAU_OFFERS = {
  cap1: [1, () => '+1 political capital', 'any', 'now', () => '+1 capital'],
  cap2: [2, () => '+2 political capital', 'any', 'now', () => '+2 capital'],
  pork: [1, () => '+$40M in earmarks for this fight', 'any', 'now', () => '+$40M earmarks'],
  table: [1, () => 'A seat at the leadership table: +1 action every day', 'any', 'now', () => 'a seat at the table'],
  rider: [2, () => { const t = cauTopIssue(); return `Your banner's top issue written into the bill: ${TAG[t][0]} ${TAG[t][1]} +1`; }, 'owner', 'now', () => `a ${TAG[cauTopIssue()][1]} rider`],
  floor: [2, p => `A floor vote on one of your bills (the ${PARTY[p].short} schedule it)`, 'any', 'settle', () => 'a floor vote'],
  gavel: [2, (p, B) => { const m = cauOfferTarget(p, B, 'gavel'); return `A subcommittee gavel for ${m ? `Sen. ${m.name}` : 'one of your senators'}`; }, 'any', 'settle', () => 'a gavel'],
  standdown: [3, (p, B) => { const m = cauOfferTarget(p, B, 'sd'), x = B.cauX && B.cauX[p]; return `No ${PARTY[p].name} nominee against ${m ? `Sen. ${m.name} (${m.state})` : 'your senator'} in ${x ? x.y : 'the next election'}`; }, 'any', 'settle', p => `a ${PARTY[p].short.replace(/s$/, '')} stand-aside`],
};
const CAU_STRAT = { national: 'A national campaign', region0: 'Win the West', region1: 'Win the heartland', region2: 'Win the East', deny: 'Deny them the swing states', five: 'Five percent or bust' };

/* ---------------- small helpers ---------------- */
const cauForce = k => IND() && typeof window !== 'undefined' && window.CAU_FORCE && window.CAU_FORCE[k] != null ? window.CAU_FORCE[k] : null;
function cauL() { return indLabelInfo(S.cau.label); }
function cauLabelLean(label) { return label ? indLabelInfo(label).lean : 0; }
// the Banner's top issue: its largest positive weight
function cauTopIssue() { const e = Object.entries(cauL().issues).filter(([t, v]) => v > 0 && TAG[t]).sort((a, b) => b[1] - a[1])[0]; return e ? e[0] : 'economy'; }
// the label's n strongest issues, for or against
function cauTopIssues(label, n) { return Object.entries(indLabelInfo(label).issues).filter(([t]) => TAG[t]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]) || b[1] - a[1]).slice(0, n); }
function cauMembers() { return S.members.filter(m => m.party === 'I'); }
function cauK() { return Math.floor(S.career.bills / 6); }
function cauRound(v) { return Math.round(v * 2) / 2; }
function cauTrust(p, d) { if (p !== 'D' && p !== 'R') return; S.cau.trust[p] = clamp(cauRound(S.cau.trust[p] + d), -5, 5); }
function cauLean(d) { S.cau.lean = clamp(+(S.cau.lean + d).toFixed(1), -10, 10); }
const cauToward = p => p === 'D' ? -1 : 1;   // the sign a move toward p has on the Lean meter
function cauRel(m, d) { m.rel = clamp(+((m.rel || 0) + d).toFixed(1), -4, 6); }
function cauOrganizes(p, partner) { const n = seats(p) + (partner === p ? seats('I') : 0); return n >= 51 || (n === 50 && S.president.party === p); }
function cauAlone(p) { return seats(p) >= 51 || (seats(p) === 50 && S.president.party === p); }
const cauP = p => p === 'D' || p === 'R' ? PARTY[p].short : 'nobody';
const cauSigned = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1).replace(/\.0$/, '');
function cauFit(label, fx) { const L = indLabelInfo(label); let s = 0; for (const t of TAGS) s += (L.issues[t] || 0) * ((fx && fx[t]) || 0); return s; }
function cauStateFit(label, code) { const L = indLabelInfo(label); let s = 0; for (const t of TAGS) s += (L.issues[t] || 0) * ST[code].voter[t] * 0.5; return clamp(s, -3, 3); }
// flip a senator between the caucus and a party (events.js's evtFlipParty when it takes a target party; otherwise by hand)
function cauFlip(m, to) {
  const from = m.party;
  if (typeof evtFlipParty === 'function' && evtFlipParty.length >= 3) evtFlipParty(m, false, to);   // events.js with a target party (lane 3)
  if (m.party !== to) {
    m.party = to; m.faction = to === 'I' ? 'Independents' : MODERATE[to];
    if (T(m, 'leader')) m.traits = m.traits.filter(t => t !== 'leader');
    hist(m, `Switched parties: left the ${PARTY[from].short} for the ${PARTY[to].short}`);
    assignBosses(); layoutSeats();
  }
  if (to === 'I') { m.faction = 'Independents'; m.exParty = from; indLabel(m); m.cause = m.cause || pick(IND_CAUSES); }
  else { m.label = null; }
  return m;
}
function cauScreen(kicker, h2, body, choices, adv) {
  showModal(`<div class="kicker">${kicker}</div><h2>${h2}</h2>${body}${choices ? `<div class="choices cau-choices">${choices}</div>` : ''}${adv ? `<div class="choices">${adv}</div>` : ''}`);
}

/* ---------------- 7.2 career start ---------------- */
function cauInit() {
  const styles = shuffle(Object.keys(RIVAL_STYLES)), used = new Set();
  const nm = () => { let n = pick(RIVAL_FIRST) + ' ' + pick(LAST); for (let i = 0; i < 30 && used.has(n); i++) n = pick(RIVAL_FIRST) + ' ' + pick(LAST); used.add(n); return n; };
  S.cau = {
    // orgK is −1 until the first Organizing Resolution, so a reload during the career-start screens reruns them
    label: 'Common Ground', partner: null, orgK: -1, jeffK: -1, gavels: 0, floorOwed: 0,
    trust: { D: 0, R: 0 }, lean: 0,
    whips: { D: { name: nm(), style: styles[0] }, R: { name: nm(), style: styles[1] } },
    pivots: 0, causes: [], promised: [], recruits: 0, defectAt: -99, momentAt: -99, poachAt: -99,
    pledge: null, presEnvD: null, ticketY: 0, log: [], stats: { defectors: 0, prices: 0 }, wiped: false,
  };
  for (const m of cauMembers()) indLabel(m);
  S.rival = S.cau.whips.R.name; S.rivalStyle = S.cau.whips.R.style;
}
function cauStartModal(done) { cauLabelPick(() => cauOrganize(done, { first: true })); }

// the Banner: which label the caucus runs under (data-choice="wing:<label>")
function cauLabelPick(next, switching) {
  const C = S.cau, c = S.career, broke = switching && c.capital < 3;
  const draws = L => L.lean < -0.3 ? 'draws from Democrats' : L.lean > 0.3 ? 'draws from Republicans' : 'draws from both';
  const cards = Object.keys(IND_LABELS).map(label => {
    const L = indLabelInfo(label), carry = cauMembers().filter(m => indLabel(m) === label), cur = switching && label === C.label;
    return `<button class="cau-card" data-choice="wing:${label}" style="--ic:${L.color}" ${cur || broke ? 'disabled' : ''}>
      <span class="cau-card-h">${indPill(label, true)}${cur ? ' <small>your banner</small>' : ''}</span>
      <small>${L.line}</small>
      <span class="wing-issues">${cauTopIssues(label, 3).map(([t, v]) => `<span class="wing-chip ${v > 0 ? 'pro' : 'con'}">${TAG[t][0]} ${TAG[t][1]} ${v > 0 ? '+' : '−'}</span>`).join('')}</span>
      <small class="cau-dim">${draws(L)} · ${carry.length ? `carried by ${carry.map(m => `Sen. ${lastName(m)}`).join(', ')}` : 'no senator carries it yet'}</small></button>`;
  }).join('');
  const body = `<p>${switching ? `Your caucus runs under the <b>${C.label}</b> banner. A new one costs <b>3 capital</b>: senators who carry it warm to you (relationship +2), senators far from it cool (−1), and the old banner's senators feel jilted (−1).` : `${seats('I')} independent${seats('I') === 1 ? '' : 's'}, ${seats('D')} Democrats, ${seats('R')} Republicans: ${caucusDecides() ? 'nobody runs this Senate without you' : 'every vote counts'}. First, the banner you fly. It sets which bills your caucus backs on the merits, what the parties have to pay you, and which voters your candidates reach.`}</p>
    <p class="cau-dim">Senators who already carry a banner warm to you if you raise theirs (+2); those whose banner sits far away cool a little (−1).</p>
    <div class="cau-grid">${cards}</div>`;
  cauScreen(switching ? 'Change banner · 3 capital' : 'Your banner · Independent caucus', switching ? 'Raise a new banner?' : 'Raise your banner', body, null,
    switching ? `<button class="btn primary big adv" id="cau-keep">Keep my banner</button>` : '');
  $('#modal-card').querySelectorAll('[data-choice^="wing:"]').forEach(b => b.onclick = () => {
    const label = b.dataset.choice.slice(5); if (!IND_LABELS[label] || (switching && (label === C.label || c.capital < 3))) return;
    const old = C.label, ln = cauLabelLean(label);
    if (switching) c.capital -= 3;
    C.label = label;
    for (const m of cauMembers()) {
      const ml = indLabel(m);
      if (ml === label) cauRel(m, 2);
      else if (Math.abs(cauLabelLean(ml) - ln) >= 1.2) cauRel(m, -1);
      if (switching && ml === old && ml !== label) cauRel(m, -1);
    }
    sfx.fanfare(); toast(`Your caucus flies the ${label} banner.`);
    next();
  });
  if ($('#cau-keep')) $('#cau-keep').onclick = () => { sfx.click(); next(); };
}

/* ---------------- 7.3 the Organizing Resolution ---------------- */
function cauPackage(p) {
  if (cauAlone(p)) return { cap: 1, gavels: 0, floor: 0, alone: true };
  const runs = floorPartyWith(p) === p, dec = caucusDecides();
  return { cap: dec ? 2 + seats('I') : 1, gavels: runs && dec ? 2 : runs ? 1 : 0, floor: runs ? 1 : 0 };
}
function cauOrgDefault() {
  const C = S.cau, l = cauLabelLean(C.label);
  if (l < -0.15) return 'D'; if (l > 0.15) return 'R';
  if (C.trust.D !== C.trust.R) return C.trust.D > C.trust.R ? 'D' : 'R';
  if (seats('D') !== seats('R')) return seats('D') > seats('R') ? 'D' : 'R';
  return floorPartyWith(null);
}
function cauPkgText(k) { const parts = []; if (k.cap) parts.push(`+${k.cap} capital`); if (k.gavels) parts.push(`${k.gavels} gavel${k.gavels > 1 ? 's' : ''} (+${k.gavels} action${k.gavels > 1 ? 's' : ''} a bill while they run the floor)`); if (k.floor) parts.push('a floor vote on one of your bills'); return parts.join(' · '); }
function cauOrganize(next, opts = {}) {
  const C = S.cau, c = S.career, k = cauK(), sw = !!opts.switching, blocked = sw && C.jeffK === k;
  const yr = billYear(S.career.bills + 1), dec = caucusDecides();
  const opt = o => {
    const partner = o === 'none' ? null : o, fp = floorPartyWith(partner), works = cauOrganizes(fp, partner);
    const n = seats(fp) + (partner === fp ? seats('I') : 0), cur = sw && (C.partner || null) === partner;
    const pkg = partner ? cauPackage(partner) : null;
    const title = o === 'none' ? 'Caucus with no one' : `Caucus with the ${PARTY[o].short}`;
    const line = `The <b style="color:${PARTY[fp].color}">${PARTY[fp].short}</b> organize the Senate · ${n} vote${n === 1 ? '' : 's'}${works ? ' · a working majority' : ' · no working majority: every vote is a fight'}${S.president.party === fp && n === 50 ? ' (with the Vice President)' : ''}`;
    const deal = sw ? (o === 'none' ? `Old partner trust −2 · ${pkg ? '' : 'no gavels · '}both parties bid harder` : `Old partner trust −3 · ${PARTY[o].short} trust +1 · ${pkg.gavels ? `${pkg.gavels} gavel${pkg.gavels > 1 ? 's' : ''}` : 'no gavels'}`)
      : o === 'none' ? 'No package · both parties trust you a little more (+0.5) · every bid is +1 for both parties · independent mood +0.5'
      : pkg.alone ? `The ${PARTY[o].short} don't need you this Congress: ${cauPkgText(pkg)}` : `Their package: ${cauPkgText(pkg)} · ${PARTY[o].short} trust +1, ${PARTY[other(o)].short} −1`;
    const dis = blocked || cur || (sw && c.capital < 3);
    return `<button class="cau-card cau-org${partner ? ' ' + partner.toLowerCase() : ''}" data-choice="org:${o}" ${dis ? 'disabled' : ''}><span class="cau-card-h"><b>${title}</b>${cur ? ' <small>your partner now</small>' : ''}</span><small>${line}</small><small class="cau-dim">${deal}</small></button>`;
  };
  const before = floorParty();
  const body = `${balanceBar()}
    <p>Senate: <b style="color:${PARTY.D.color}">D ${seats('D')}</b> · <b style="color:${PARTY.R.color}">R ${seats('R')}</b> · <b style="color:${PARTY.I.color}">I ${seats('I')}</b> · Vice President: ${PARTY[S.president.party].name}${dec ? ' · <b class="cau-key">🔑 your vote decides who runs the floor</b>' : ` · the ${PARTY[floorPartyWith('D')].short} run the floor whatever you do`}</p>
    ${sw ? (blocked ? '<p><b>You already switched once this Congress.</b> The parties would never trust you again.</p>' : `<p>The Jeffords: walk across the aisle mid-Congress. It costs <b>3 capital</b> and your old partner will not forget it. ${c.capital < 3 ? '<b>You can\'t afford it right now.</b>' : ''}</p>`)
      : `<p>Every Congress opens with a vote on who chairs the committees and controls the calendar. The floor party schedules the bills, writes the budget, and owes you what it promised.</p>`}
    <div class="cau-grid org">${['D', 'R', 'none'].map(opt).join('')}</div>`;
  const kicker = `The Organizing Resolution · ${yr}${sw ? ' · The Jeffords' : ''}`;
  const def = cauOrgDefault();
  cauScreen(kicker, sw ? 'Switch partners?' : 'Who runs the Senate?', body, null,
    sw ? `<button class="btn primary big adv" id="cau-keep">Keep things as they are</button>` : `<button class="btn primary big adv" id="cau-org-go">Caucus with the ${PARTY[def].short}</button>`);
  const choose = o => {
    const partner = o === 'none' ? null : o, old = C.partner || null;
    if (sw) {
      if (blocked || partner === old || c.capital < 3) return;
      c.capital -= 3;
      if (old) cauTrust(old, partner ? -3 : -2);
      if (partner) { cauTrust(partner, 1); cauLean(3 * cauToward(partner)); }
      else cauLean(-clamp(C.lean, -3, 3));
      C.partner = partner; C.gavels = partner ? cauPackage(partner).gavels : 0; C.jeffK = k; C.orgK = k;
    } else {
      C.partner = partner;
      if (partner) {
        const pkg = cauPackage(partner);
        c.capital += pkg.cap; C.gavels = pkg.gavels; C.floorOwed += pkg.floor;
        cauTrust(partner, 1); cauTrust(other(partner), -1); cauLean(3 * cauToward(partner));
      } else { C.gavels = 0; cauTrust('D', 0.5); cauTrust('R', 0.5); S.mood += 0.5; }
      C.orgK = k;
    }
    const fp = floorParty(), flipped = fp !== before;
    if (flipped && caucusDecides()) { unlock('cau_org'); addLegacy(10); }
    sfx.gavel();
    if (sw && flipped) {
      unlock('cau_jeffords'); addLegacy(12);
      const n = seats(fp) + (C.partner === fp ? seats('I') : 0);
      showModal(`${frontPage({ headline: `INDEPENDENTS HAND THE SENATE TO THE ${PARTY[fp].short.toUpperCase()}`, sub: `The caucus walks across the aisle mid-Congress. The ${PARTY[fp].short} take the gavels with ${n} votes.`, mood: 'storm', date: `${season(S.career.bills + 1)} ${yr} · Extra`,
        body: [`WASHINGTON — The committee nameplates were being unscrewed before the vote was even gaveled closed. The ${PARTY[before].short}, who ran the floor this morning, will spend the rest of the Congress in the minority because ${seats('I')} independents changed their minds.`,
          `"We didn't leave them. They left the middle of the country," said the caucus chair. ${PARTY[before].short} leaders called it "the most cynical act in the history of the Senate" and promised the independents would pay for it at the ballot box.`] })}
        <div class="choices"><button class="btn primary big adv" id="cau-ok">The Senate changes hands</button></div>`);
      $('#cau-ok').onclick = () => next();
      return;
    }
    toast(partner ? `The independents caucus with the ${PARTY[partner].short}. The ${PARTY[fp].short} run the floor.` : `The independents stand alone. The ${PARTY[fp].short} run the floor.`);
    if (!opts.first && flipped) {
      showModal(`${frontPage({ headline: `INDEPENDENTS HAND THE SENATE TO THE ${PARTY[fp].short.toUpperCase()}`, sub: `The Organizing Resolution passes with the caucus's votes. The ${PARTY[before].short} lose the gavels.`, mood: 'dawn', date: `January ${yr} · The new Congress`,
        body: [`WASHINGTON — The new Congress opened the way the last one ended: with ${seats('I')} independents deciding who holds the gavels. The ${PARTY[fp].short} will chair every committee and set the calendar.`] })}
        <div class="choices"><button class="btn primary big adv" id="cau-ok">On to the new Congress</button></div>`);
      $('#cau-ok').onclick = () => next();
      return;
    }
    next();
  };
  $('#modal-card').querySelectorAll('[data-choice^="org:"]').forEach(b => b.onclick = () => choose(b.dataset.choice.slice(4)));
  if ($('#cau-org-go')) $('#cau-org-go').onclick = () => choose(def);
  if ($('#cau-keep')) $('#cau-keep').onclick = () => { sfx.click(); next(); };
}

/* ---------------- 7.4 per-bill hooks ---------------- */
function cauOwner(it) {
  if (it.budget) return floorParty();
  if (it.nomination) return (S.nominee && S.nominee.party) || S.president.party;
  if (it.aumf) return S.president.party;
  const bp = it.tpl ? billParty(it.tpl[0]) : null;
  if (bp) return bp;
  if (it.by === 'you') return 'I';
  return floorParty();
}
function cauAim(fx, owner) {
  if (owner === 'I' || !S.cau) return 'pass';
  const s = cauFit(S.cau.label, fx || {}) + (owner === S.cau.partner ? 0.5 : 0);
  return s >= 0 ? 'pass' : 'kill';
}
function cauApBonus() { return S.cau && S.cau.partner && S.cau.partner === floorParty() ? S.cau.gavels : 0; }
function cauSetRival() { if (!S.cau) return; const W = S.cau.whips[rivalOf()]; if (!W) return; S.rival = W.name; S.rivalStyle = W.style; }
// the votes a bill really needs to pass: a supermajority, cloture, or a simple majority (50 when the owner's Vice President breaks the tie)
function cauPassNeed(B) { return B.super || B.cloture || (S.president.party === B.owner ? 50 : 51); }
// the count without your caucus, against that threshold. kind: 'close' (your votes decide it), 'carried' (it passes without you),
// 'dead' (it fails even with you); decisive is true only when your caucus can swing the result either way
function cauPivotCount(B) {
  const need = cauPassNeed(B);
  const ms = S.members.filter(m => m.party === 'D' || m.party === 'R');
  const yes = ms.filter(m => support(m) > 0).length, ci = seats('I');
  const vpI = S.president.party === 'I' && !B.super && !B.cloture;   // an independent Vice President breaks a 50-50 tie your caucus's way when it votes to pass
  const decisive = yes < need && yes + ci + (vpI ? 1 : 0) >= need;
  return { yes, no: ms.length - yes, need, vpI, decisive, kind: decisive ? 'close' : yes >= need ? 'carried' : 'dead' };
}
// shift every senator's mood so that exactly `yes` of the parties' senators start on the yea side (calibrate() for the count without you)
function cauSetCount(yes) {
  for (const m of S.members) m.b.start = null;
  const ss = S.members.filter(m => m.party === 'D' || m.party === 'R').map(support).sort((a, b) => b - a);
  const t = clamp(yes, 1, ss.length - 1), off = -((ss[t - 1] + ss[t]) / 2);
  for (const m of S.members) m.b.mood += off;
  for (const m of S.members) if (T(m, 'leader')) m.b.start = leaderStance(m);
}
// The Bidding's opening count (startBill, I mode). The kingmaker fantasy: most bills the parties fight over land inside your caucus's
// swing range of the threshold they really need, so your votes decide them; the rest are clearly carried or clearly dead either way.
// Budgets (their own bid) and your own bills keep the ordinary calibration.
const CAU_CLOSE = 0.65;
function cauFrame(B) {
  if (B.budget || B.owner === 'I' || !S.cau) { B.pivot = cauPivotCount(B); calibrate(B.short); return; }
  const need = cauPassNeed(B), ci = seats('I'), u = Math.random();
  const yes = ci > 0 && u < CAU_CLOSE ? need - ri(1, ci) : u < (1 + CAU_CLOSE) / 2 ? need + ri(2, 5) : need - ci - ri(2, 5);
  cauSetCount(yes);
  B.pivot = cauPivotCount(B);
}
// how far short you start once you declare. On a close bill the side you spurned fights for every vote (the ordinary fight),
// one vote less when you vote your banner and one more when you vote against it. On a clear bill, going with the count is a
// short whip; going against it is a long one.
function cauShortFor(B) {
  let s = B.short0 != null ? B.short0 : B.short;
  if (killing()) { if (!B.super && !B.cloture) s -= 2; } else s += 1;
  if (B.nomination && S.nominee) s = killing() ? s + Math.min(2, S.nominee.tries || 0) : Math.max(1, s - (S.nominee.tries || 0));
  if (!killing() && B.patron && B.patron === floorParty()) s -= 1;
  if (B.patron && B.patron !== floorParty() && B.patron !== S.president.party) s += 1;
  if (B.labelAim) s += B.aim === B.labelAim ? -1 : 1;   // your caucus fights harder for its banner than for a deal against it
  const kind = B.pivot && B.pivot.kind;
  if (kind === 'carried' || kind === 'dead') s = (kind === 'carried') === !killing() ? clamp(s - 2, 1, 2) : s + 1;
  return Math.max(1, s);
}
// the same, for an aim and patron you haven't picked yet (the Bidding's preview)
function cauShortPreview(B, aim, patron) {
  const a0 = B.aim, p0 = B.patron; B.aim = aim; B.patron = patron;
  try { return cauShortFor(B); } finally { B.aim = a0; B.patron = p0; }
}
function cauOfferBudget(p, B) {
  const C = S.cau, toward = p === 'D' ? -C.lean : C.lean;
  if (toward <= -8) return 0;
  const pv = B.pivot, pivotal = !pv ? 0 : pv.decisive ? 1 : pv.kind === 'carried' || pv.kind === 'dead' ? -1 : 0;   // they pay for votes that decide it
  const pts = 2 + (B.landmark ? 1.5 : 0) + pivotal + 0.3 * C.trust[p] + (C.partner ? 0 : 1) - (C.partner === p ? 0.5 : 0) - (toward >= 6 ? 2 : 0);
  return clamp(Math.round(pts), 0, 5);
}
// the caucus member a deferred concession names (picked once per bill and party)
function cauOfferTarget(p, B, k) { const x = B.cauX && B.cauX[p], id = x && x[k]; return id != null && S.members[id] && S.members[id].party === 'I' ? S.members[id] : null; }
function cauOfferEligible(p, B, k, have) {
  const x = B.cauX[p];
  if (have.includes(k)) return false;
  if ((k === 'cap1' && have.includes('cap2')) || (k === 'cap2' && have.includes('cap1'))) return false;
  if (k === 'rider') return p === B.owner && !B.nomination && !B.budget;
  if (k === 'gavel') return x.gavel != null;
  if (k === 'standdown') return x.sd != null;
  return true;
}
function cauMakeOffer(p, B) {
  B.cauX = B.cauX || {};
  if (!B.cauX[p]) {
    const ms = cauMembers(), y = electionYear(nextElectionK());
    const up = ms.filter(m => isUp(m) && !S.cau.promised.some(o => o.p === p && o.id === m.id && o.y === y));
    B.cauX[p] = { gavel: ms.length ? pick(ms).id : null, sd: up.length ? pick(up).id : null, y };
  }
  let pts = cauOfferBudget(p, B);
  const out = [];
  for (const k of shuffle(Object.keys(CAU_OFFERS))) if (CAU_OFFERS[k][0] <= pts && cauOfferEligible(p, B, k, out)) { out.push(k); pts -= CAU_OFFERS[k][0]; }
  if (pts > 0 && !out.includes('cap1') && !out.includes('cap2')) out.push('cap1');
  return out;
}
const cauOfferPts = keys => (keys || []).reduce((a, k) => a + CAU_OFFERS[k][0], 0);
function cauDealText(p, keys, B) { return (keys || []).map(k => CAU_OFFERS[k][4](p, B)).join(', '); }
// the "now" concessions land the moment you shake hands
function cauPayNow(p, keys, B) {
  if (B.cauNowPaid) return; B.cauNowPaid = true;
  const c = S.career;
  for (const k of keys) {
    if (k === 'cap1') c.capital += 1;
    else if (k === 'cap2') c.capital += 2;
    else if (k === 'pork') B.pork += 40;
    else if (k === 'table') { B.apMax += 1; B.ap += 1; }
    else if (k === 'rider') { const t = cauTopIssue(); B.fx[t] = (B.fx[t] || 0) + 1; B.applied.push(`${TAG[t][1]} +1 (the ${S.cau.label} rider)`); B.cauRider = t; }
  }
}
function cauNeedPass(B) { const k = B.super || B.cloture; return k ? `${k} votes${B.cloture ? ' for cloture' : ''}` : S.president.party === 'I' ? '51 votes, or 50 and the Vice President if your caucus votes for it' : cauPassNeed(B) === 50 ? '50 votes and the Vice President' : '51 votes'; }
function cauOfferCard(p, B) {
  const C = S.cau, W = C.whips[p], keys = B.offers[p], toward = p === 'D' ? -C.lean : C.lean, pass = p === B.owner, gone = B.cauWithdrawn && B.cauWithdrawn[p];
  const notes = [`trust ${cauSigned(C.trust[p])}`];
  if (toward >= 6) notes.push('they take you for granted');
  if (toward <= -8) notes.push('they\'ve written you off');
  if (C.partner === p) notes.push('your organizing partner');
  return `<div class="cau-offer ${p.toLowerCase()}${gone ? ' gone' : ''}"><div class="cau-oh"><b style="color:${PARTY[p].color}">Sen. ${W.name}</b> <small>${PARTY[p].name} whip · the ${RIVAL_STYLES[W.style][0]}</small></div>
    <div class="cau-role">${pass ? `pays you to <b class="cau-pass">PASS</b> it` : `pays you to <b class="cau-kill">KILL</b> it`}</div>
    ${gone ? '<p class="cau-dim"><b>Withdrawn.</b> You asked for more and they walked away from the table.</p>' : keys.length ? `<ul>${keys.map(k => `<li>${CAU_OFFERS[k][1](p, B)}${CAU_OFFERS[k][3] === 'settle' ? ' <small>(paid if you win)</small>' : ''}</li>`).join('')}</ul>` : '<p class="cau-dim">Nothing on the table. They expect your votes for free.</p>'}
    <small class="cau-dim">${notes.join(' · ')} · ${cauOfferPts(keys)} point${cauOfferPts(keys) === 1 ? '' : 's'}</small>
    <small class="cau-dim cau-fight">Take it and you start about ${cauShortPreview(B, pass ? 'pass' : 'kill', p)} vote${cauShortPreview(B, pass ? 'pass' : 'kill', p) === 1 ? '' : 's'} short</small></div>`;
}
function cauAsk(next) {
  const B = S.bill, C = S.cau, c = S.career;
  if (C.orgK < 0) return cauStartModal(() => { hideModal(); startBill(); save(); });   // saved before the Banner and the Organizing Resolution were done: do them now
  render();
  B.labelAim = cauAim(B.fx, B.owner);
  if (!B.offers) B.offers = { D: cauMakeOffer('D', B), R: cauMakeOffer('R', B) };
  B.cauWithdrawn = B.cauWithdrawn || {};
  const o = B.owner, pv = B.pivot || cauPivotCount(B), ci = seats('I'), la = B.labelAim;
  const verdict = pv.decisive ? '<b class="cau-key">🗝 YOUR VOTES DECIDE IT</b>' : pv.yes >= pv.need ? 'They have the votes without you, for now' : 'It\'s short even with you, for now';
  const tide = pv.yes >= pv.need ? 'PASS' : 'KILL', dShort = pv.need - pv.yes - ci - (pv.vpI ? 1 : 0);
  const price = pv.decisive
    ? `<p class="cau-price"><b>Your price is high.</b> Without you the parties are ${pv.need - pv.yes} short of ${pv.need}, and your caucus has ${ci}${pv.vpI ? ' plus the Vice President\'s tie-break if you vote to pass' : ''}: the way you vote decides it, so both whips are bidding. Whichever side you spurn will fight for every vote.</p>`
    : `<p class="cau-price cau-dim"><b>Your price is low.</b> ${pv.yes > pv.need ? `They have ${pv.yes - pv.need} vote${pv.yes - pv.need === 1 ? '' : 's'} to spare without you` : pv.yes === pv.need ? 'They have exactly the votes they need without you' : ci === 0 ? `They are ${pv.need - pv.yes} vote${pv.need - pv.yes === 1 ? '' : 's'} short, and you have no votes to add` : `They are ${dShort} vote${dShort === 1 ? '' : 's'} short even with your ${ci}${pv.vpI ? ' and the Vice President' : ''}`}, so the parties won't pay ${ci === 0 ? 'you much' : 'much for them'}. Once you declare, the other side's whip goes to work on the parties' own senators: going with the count (${tide}) still leaves a vote or two to hold; going against it means turning several. Either way, nobody blames the caucus if it goes wrong.</p>`;
  const body = `<p class="blurb">${B.blurb}</p><div class="fx">${fxChips(B.fx)}</div>
    <p>A <b style="color:${PARTY[o].color}">${PARTY[o].name}</b> ${B.nomination ? 'nomination' : B.aumf ? 'war resolution' : 'bill'}${B.by === 'them' ? `, scheduled by the ${PARTY[floorParty()].short}` : ''} · to pass it needs ${cauNeedPass(B)}.</p>
    <div class="cau-pivot"><span>The count before anyone whips: <b>${pv.yes}</b> for · <b>${pv.no}</b> against · <b>${pv.need}</b> needed. Your caucus: <b>${ci}</b> vote${ci === 1 ? '' : 's'}.</span><span>${verdict}</span></div>
    ${price}
    <p>Your ${indPill(C.label)} banner says <b class="${la === 'kill' ? 'cau-kill' : 'cau-pass'}">${la === 'kill' ? 'KILL' : 'PASS'}</b>${C.partner ? ` · your organizing partner: the ${PARTY[C.partner].short}` : ' · you caucus with no one: both sides bid +1'}.</p>
    <div class="cau-bid">${cauOfferCard('D', B)}${cauOfferCard('R', B)}</div>`;
  const askOK = p => !B.cauAsked && !B.cauWithdrawn[p];
  const fs = cauShortPreview(B, la, null);
  const take = p => B.offers[p].length ? `Take the ${PARTY[p].name} deal` : `Side with the ${PARTY[p].short} for nothing`;
  const choices = ['D', 'R'].map(p => `<button class="btn ${p === 'D' ? 'dem' : 'rep'}" data-choice="bid:${p}">${take(p)}<small>${p === o ? 'PASS' : 'KILL'} it · the ${PARTY[other(p)].short} whip works against you</small></button>`).join('')
    + ['D', 'R'].map(p => `<button class="btn" data-choice="bid:ask:${p}" ${askOK(p) ? '' : 'disabled'}>Name your price to the ${PARTY[p].short}<small>Once a bill · ${Math.round(cauAskOdds(p, B) * 100)}% they sweeten it; otherwise they walk away</small></button>`).join('')
    + `<button class="btn" data-choice="bid:free">Free vote: ${la === 'kill' ? 'KILL' : 'PASS'} on the merits<small>No deal, no ally whip · your caucus likes it (+0.5 each) · Lean eases · independent mood +0.2 · you start about ${fs} vote${fs === 1 ? '' : 's'} short</small></button>`;
  cauScreen(`The Bidding · ${season(B.n)} ${billYear(B.n)}`, `${B.name}${B.landmark ? '<span class="cau-lm">LANDMARK</span>' : ''}`, body, choices,
    `<button class="btn primary big adv" id="cau-free">Free vote: ${la === 'kill' ? 'KILL' : 'PASS'} on the merits</button>`);
  const card = $('#modal-card');
  const finish = () => {
    B.short = cauShortFor(B); calibrate(B.short); cauSetRival();
    const P = B.patron, aimT = killing() ? 'KILL' : 'PASS';
    if (B.free) log(`A free vote: your caucus will ${aimT} the ${B.name} on the merits of the ${C.label} banner. You need ${needText()}.`, 'sys');
    else log(`You took the ${PARTY[P].short} deal${B.deal.length ? ` (${cauDealText(P, B.deal, B)})` : ', for nothing'}. Your caucus will ${aimT} it. You need ${needText()}.`, 'sys');
    if (B.cloture) log(killing() ? `It's ${PARTY[o].name} partisan legislation, so it needs 60 votes for cloture: hold ${101 - B.cloture} nays and the filibuster kills it.` : `It's partisan legislation: the ${PARTY[other(o)].short} will filibuster, so it needs 60 for cloture.`, 'sys');
    { const now = S.members.filter(m => (m.party === 'D' || m.party === 'R') && support(m) > 0).length, d = now - pv.yes;
      const vs = `You start ${B.short} vote${B.short === 1 ? '' : 's'} short.`;
      if (d * aimSign() < 0) log(`The moment you declare, Sen. ${S.rival} goes to work: the parties' count moves from ${pv.yes} to ${now} for it. ${vs}`, 'sys');
      else if (d) log(`The parties' count settles at ${now} for it. ${vs}`, 'sys'); }
    if (P) log(`🤝 Sen. ${C.whips[P].name}, the ${PARTY[P].name} whip, will work ${PARTY[P].short} senators your way every night. Sen. ${S.rival} works against you.`, 'good');
    else log(`Sen. ${S.rival}, the ${PARTY[rivalOf()].name} whip, works against you. Nobody works for you.`, 'sys');
    hideModal(); next();
  };
  card.querySelectorAll('[data-choice^="bid:"]').forEach(b => b.onclick = () => {
    const k = b.dataset.choice.split(':');
    if (k[1] === 'ask') {
      const p = k[2]; if (!askOK(p)) return;
      B.cauAsked = true;
      const f = cauForce('offerOK'), ok = f != null ? !!f : Math.random() < cauAskOdds(p, B);
      if (ok) {
        const add = shuffle(Object.keys(CAU_OFFERS).filter(x => CAU_OFFERS[x][0] <= 2 && cauOfferEligible(p, B, x, B.offers[p])))[0];
        if (add) B.offers[p].push(add); else c.capital += 1;
        C.stats.prices++; if (B.landmark) unlock('cau_price');
        sfx.up(); toast(`The ${PARTY[p].short} sweeten the deal${add ? `: ${CAU_OFFERS[add][4](p, B)}` : ': +1 capital on the spot'}.`);
      } else { B.offers[p] = []; B.cauWithdrawn[p] = true; cauTrust(p, -0.5); sfx.down(); toast(`The ${PARTY[p].short} walk away from the table.`); }
      return cauAsk(next);
    }
    if (k[1] === 'free') { cauFreeVote(B); sfx.click(); return finish(); }
    const p = k[1]; if (p !== 'D' && p !== 'R') return;
    B.aim = p === B.owner ? 'pass' : 'kill'; B.patron = p; B.foe = other(p); B.deal = B.offers[p].slice(); B.free = false;
    cauPayNow(p, B.deal, B);
    sfx.gavel(); finish();
  });
  $('#cau-free').onclick = () => { cauFreeVote(B); sfx.click(); finish(); };
}
function cauAskOdds(p, B) { return clamp(0.45 + 0.06 * S.cau.trust[p] + (B.pivot && B.pivot.decisive ? 0.15 : 0), 0.15, 0.85); }
function cauFreeVote(B) {
  B.aim = B.labelAim || 'pass'; B.patron = null; B.free = true; B.deal = []; B.foe = rivalOf();
  for (const m of cauMembers()) cauRel(m, 0.5);
  S.cau.lean = +(S.cau.lean * 0.7).toFixed(1);
  S.mood += 0.2;
}
function cauBudgetDone(deal) {
  const B = S.bill; if (!B || !S.cau) return;
  B.patron = deal ? floorParty() : other(floorParty()); B.foe = other(B.patron); B.labelAim = B.aim; B.deal = [];
  cauSetRival();
}
// the patron's whip works their own senators for you every night
function cauAllyNight() {
  const B = S.bill; if (!B || !B.patron || !S.cau) return;
  const p = B.patron, W = S.cau.whips[p], a = aimSign();
  const n = 1 + (B.landmark ? 1 : 0) + (S.cau.trust[p] >= 3 ? 1 : 0);
  const pool = S.members.filter(m => m.party === p && !isLockedYes(m) && !m.b.absent).map(m => ({ m, s: support(m) * a })).filter(o => o.s > -15 && o.s < 20).sort((x, y) => Math.abs(x.s - 2) - Math.abs(y.s - 2)).slice(0, n);
  for (const { m } of pool) { const d = rnd(4, 8) * a; m.b.bonus += d; m.b.last = d; log(`🤝 ${W.name} (${p} whip) worked ${sen(m)} your way (${fmt(d)}).`, 'good'); }
}
function cauPillOdds() { const B = S.bill, C = S.cau; return clamp(0.45 + (B.patron && B.patron === floorParty() ? 0.3 : 0) + 0.03 * (B.patron ? C.trust[B.patron] : 0) + (has('parl') ? 0.15 : 0), 0.3, 0.9); }
function cauPresCallOK() { const P = S.president; return P.party === 'I' || (!!S.bill && S.bill.patron === P.party && ((S.cau && S.cau.trust[P.party]) || 0) >= 1); }
function cauBillLine() {
  if (!IND() || !S.cau || !S.bill) return '';
  const B = S.bill;
  if (B.owner === 'I') return ' · your own bill';
  if (B.patron) return ` · <span class="cau-ally">Ally: Sen. ${S.cau.whips[B.patron].name} (${B.patron} whip)</span>${B.deal && B.deal.length ? ` · your deal: ${cauDealText(B.patron, B.deal, B)}` : B.budget ? '' : ' · no deal'}`;
  return B.free ? ' · a free vote' : '';
}
function cauRowChip(r) {
  if (!IND() || !S.cau || !r || !r.tpl) return '';
  const fit = cauFit(S.cau.label, r.tpl[2] || {});
  return fit >= 2 ? '<b class="cau-chip good">★ your banner</b>' : fit <= -2 ? '<b class="cau-chip bad">✗ your base hates it</b>' : '';
}
function cauSettle(won, enacted, headline) {
  if (!IND() || !S.cau || !S.bill) return [];
  const B = S.bill, C = S.cau, c = S.career, lines = [], p = B.patron;
  if (p) {
    cauTrust(p, won ? 1 : -0.5);
    for (const k of B.deal || []) {
      if (CAU_OFFERS[k][3] !== 'settle') continue;
      if (!(won && C.trust[p] >= -1)) { lines.push(`The ${PARTY[p].short} quietly forgot ${won ? 'their' : 'the'} promise (${CAU_OFFERS[k][4](p, B)})`); continue; }
      if (k === 'floor') { C.floorOwed++; lines.push(`🎫 The ${PARTY[p].short} owe your caucus a floor vote`); }
      else if (k === 'gavel') { const m = cauOfferTarget(p, B, 'gavel'); if (m) { cauRel(m, 2); m.rec = (m.rec || 0) + 1; hist(m, `Took a subcommittee gavel in a deal with the ${PARTY[p].name} leadership`); lines.push(`🔨 Sen. ${m.name} gets a subcommittee gavel (relationship +2)`); } }
      else if (k === 'standdown') { const m = cauOfferTarget(p, B, 'sd'), x = B.cauX[p]; if (m) { C.promised.push({ p, id: m.id, y: x.y }); lines.push(`🌾 The ${PARTY[p].short} promise not to run anyone against Sen. ${lastName(m)} in ${x.y}`); } }
    }
    cauLean(cauToward(p) * (B.landmark ? 2 : 1));
    const sg = cauToward(p);
    for (const m of cauMembers()) { const L = cauLabelLean(indLabel(m)); if (L * sg > 0.3) cauRel(m, 0.3); else if (L * sg < -0.3) cauRel(m, -0.3); }
    if (won && B.landmark && B.foe) cauTrust(B.foe, -0.5);
  }
  C.lean = clamp(+(C.lean * 0.9).toFixed(1), -10, 10);
  for (const q of ['D', 'R']) cauTrust(q, 0);
  if (B.labelAim && B.aim !== B.labelAim) {
    S.mood -= 0.3; C.stats.offRun = (C.stats.offRun || 0) + 1;
    if (C.stats.offRun >= 3) { C.stats.offRun = 0; c.confidence--; lines.push(`Three votes in a row against the ${C.label} banner: your caucus wonders what it stands for (−1 confidence)`); }
    else lines.push(`Your base grumbles: that vote cut against the ${C.label} banner`);
  } else if (B.labelAim && !B.budget) C.stats.offRun = 0;   // budgets are their own bid: they neither count nor break the run
  if (B.pivot && B.pivot.decisive && won) {
    c.capital += 1; addLegacy(4); C.pivots++;
    const onBanner = !B.budget && (!B.labelAim || B.aim === B.labelAim);   // the swing vote, cast for your banner's cause
    if (onBanner) C.stats.banner = (C.stats.banner || 0) + 1;
    if (onBanner && C.stats.banner % 2 === 0 && c.confidence < 5) { c.confidence++; lines.push(`🗝 Your ${seats('I')} votes decided it for the ${C.label} banner: +1 capital, +1 confidence (${C.stats.banner} bills decided your banner's way)`); }
    else lines.push(`🗝 Your ${seats('I')} votes decided it${onBanner ? ` for the ${C.label} banner` : ''}: +1 capital`);
    if (C.pivots % 2 === 0 && C.recruits < 3) { C.recruits++; lines.push('📇 Deciding bills is the best recruiting pitch there is: a would-be independent calls your office (+1 banked recruit for the next slate)'); }
    if (C.pivots >= 10) unlock('cau_kingmaker');
  }
  if (!won && (p || B.free) && B.cauVotes && B.cauVotes.length >= 2) {   // cohesion: only a split that broke a deal (or a free vote) and cost you the vote is held against you
    const against = B.cauVotes.filter(v => v === (B.aim === 'pass' ? 'no' : 'yes')).length;
    if (against * 2 > B.cauVotes.length) {   // the split takes away the minority's no-blame pass; it never stacks on a loss that already cost confidence
      if (B.cauConf0 != null && c.confidence < B.cauConf0) lines.push(`Most of your caucus broke ranks (${against} of ${B.cauVotes.length}), and everyone noticed`);
      else { c.confidence--; lines.push(`Most of your caucus broke ranks (${against} of ${B.cauVotes.length}) and it cost you the vote: −1 confidence`); }
    }
  }
  if ((B.deal || []).includes('rider') && enacted && B.cauRider) {
    C.causes.push({ name: B.name, tag: B.cauRider, y: billYear(B.n) }); if (C.causes.length > 12) C.causes.shift();
    addLegacy(6); c.confidence = Math.min(5, c.confidence + 1);
    lines.push(`🖋 Your ${TAG[B.cauRider][1]} rider becomes law: +1 confidence`);
  }
  if (Math.abs(C.lean) >= 6) lines.push(`The ${PARTY[C.lean < 0 ? 'D' : 'R'].short} think they own you: their offers shrink`);
  C.log.push({ n: B.n, name: B.name, patron: p || null, aim: B.aim, won: !!won, offers: { D: cauOfferPts(B.offers && B.offers.D), R: cauOfferPts(B.offers && B.offers.R) } });
  if (C.log.length > 12) C.log.shift();
  return lines;
}
// a lost bill your caucus could never have decided (clearly carried or clearly dead before the Bidding) costs no confidence
function cauNoBlame() {
  const B = S.bill; if (!IND() || !B || !B.pivot || B.budget || B.owner === 'I') return '';
  const k = B.pivot.kind; if (k !== 'carried' && k !== 'dead') return '';
  return `Your ${seats('I')} votes were never the margin on this one: nobody blames the caucus · +1 capital`;
}
function cauHeadline(won, headline, y, n) {
  const B = S.bill, name = B.name.toUpperCase(), k = killing(), enacted = k ? !won : won, P = B.patron;
  const floorDeath = !enacted && !['DEAD IN THE HOUSE', 'VETOED', 'VETO SUSTAINED'].includes(headline);
  if (P && !B.budget && !B.nomination) {
    const paid = B.deal && B.deal.length ? `, and the ${PARTY[P].short} paid for it with ${cauDealText(P, B.deal, B)}` : '';
    if (enacted && !k) return { h: `INDEPENDENTS DELIVER ${name} FOR THE ${PARTY[P].short.toUpperCase()}`, d: `The ${seats('I')}-member caucus kept its side of the deal: ${y}–${n} in the Senate${paid}.`, mood: 'dawn' };
    if (enacted) return { h: `${name} PASSES OVER THE KINGMAKERS`, d: `The ${PARTY[P].short} paid the independents to kill it, ${y}–${n} says they couldn't.`, mood: 'storm' };
    if (!k) return { h: `${name} FAILS DESPITE THE INDEPENDENT DEAL`, d: `The caucus took the ${PARTY[P].short} deal and couldn't deliver${floorDeath ? `, ${y}–${n}` : headline === 'DEAD IN THE HOUSE' ? ': it died in the House' : ': the President vetoed it'}.`, mood: 'storm' };
    if (headline === 'FILIBUSTERED') return { h: `KINGMAKERS FILIBUSTER ${name}`, d: `${y} votes, ${(B.cloture || B.super) - y} short of cloture. The independents held for the ${PARTY[P].short}${paid}.`, mood: 'dawn' };
    return floorDeath ? { h: `KINGMAKERS SINK ${name}, ${n}–${y}`, d: `The independents sided with the ${PARTY[P].short}${paid}. The bill dies on the floor.`, mood: 'dawn' }
      : { h: `KINGMAKERS SINK ${name}`, d: `It cleared the Senate ${y}–${n}, then died ${headline === 'DEAD IN THE HOUSE' ? 'in the House' : 'by veto'}. The ${PARTY[P].short} got what they paid for.`, mood: 'dawn' };
  }
  if (B.free) return { h: `FREE VOTE: CAUCUS ${won ? 'WINS' : 'LOSES'} AS ${name} ${enacted ? 'PASSES' : 'FAILS'}`, d: `No deal, no ally: the independents voted the ${S.cau.label} banner, ${y}–${n} in the Senate.`, mood: won ? 'dawn' : 'storm' };
  return k ? floorHeadline(won, headline, y, n) : billHeadline(won, headline, y, n);
}

/* ---------------- 7.5 between bills: the Caucus Room ---------------- */
function cauDefectOdds(m) { return clamp(0.35 + 0.08 * (m.rel || 0) + 0.05 * (m.defy || 0) + (Math.abs(ST[m.state].lean) <= 6 ? 0.1 : 0), 0.1, 0.6); }
function cauDefectTarget() {
  const pool = S.members.filter(m => (m.party === 'D' || m.party === 'R') && !T(m, 'leader') && !(typeof evtOnTicket === 'function' && evtOnTicket(m))
    && (m.faction === MODERATE[m.party] || m.faction === CROSS[m.party]) && ((m.rel || 0) >= 1 || (m.defy || 0) >= 1));
  return pool.map(m => ({ m, odds: cauDefectOdds(m) })).sort((a, b) => b.odds - a.odds)[0] || null;
}
// a party senator joins the caucus (Court a defector, Going independent)
function cauWelcome(m) {
  const C = S.cau, from = m.party;
  cauFlip(m, 'I'); cauRel(m, 1); cauTrust(from, -1); C.stats.defectors++;
  hist(m, 'Joined the Independent caucus');
  unlock('cau_defect'); if (C.stats.defectors === 3) addLegacy(10);
  if (seats('I') >= 5) unlock('cau_caucus5'); if (seats('I') >= 10) unlock('cau_ten');
  return from;
}
function cauWelcomePaper(m, from, next) {
  showModal(`${frontPage({ headline: `${lastName(m).toUpperCase()} QUITS THE ${PARTY[from].short.toUpperCase()}`, sub: `${sen(m)} will caucus with the independents. The Senate is now ${seats('D')}–${seats('R')}–${seats('I')}.`, mood: 'storm', date: `${season(S.career.bills + 1)} ${billYear(S.career.bills + 1)} · Extra`,
    body: [`WASHINGTON — "I didn't leave the ${PARTY[from].name} Party. It left the people I represent," ${lastName(m)} told reporters on the Capitol steps, flanked by the independent caucus. ${PARTY[from].short} leaders, who learned the news from a push alert, were said to be "blindsided."`,
      `The switch hands the independent caucus its ${seats('I')}th vote${floorParty() !== from ? '' : `, and leaves the ${PARTY[from].short} one seat thinner on every count`}.`] })}
    <div class="choices"><button class="btn primary big adv" id="cau-ok">Welcome aboard</button></div>`);
  $('#cau-ok').onclick = () => next();
}
function cauMeter(v, lo, hi, cls, title) { const pc = clamp((v - lo) / (hi - lo), 0, 1) * 100; return `<div class="cau-meter ${cls}" title="${title}"><i style="left:${pc.toFixed(1)}%"></i></div>`; }
let cauTourAt = -1;   // the Reach-out tour: once per visit to the Caucus Room (not saved)
function cauRoomHTML() {
  const C = S.cau, c = S.career, fp = floorParty(), dec = caucusDecides(), km = kingmakerNow(), tgt = cauDefectTarget(), k = cauK();
  const groups = {};
  for (const m of cauMembers()) { const l = indLabel(m) || 'Independent'; (groups[l] = groups[l] || []).push(m); }
  const roster = Object.entries(groups).map(([l, ms]) => `<div class="cau-roster-g">${indPill(l)}${ms.map(m => `<span class="cau-roster-m">Sen. ${m.name} (${m.state})${m.exParty ? ` <small>ex-${m.exParty}</small>` : ''} · <small>rel ${cauSigned(m.rel || 0)}${isUp(m) ? ` · <b>up in ${electionYear(nextElectionK())}</b>` : ''}</small></span>`).join('')}</div>`).join('');
  const defectOK = c.capital >= 3 && c.bills - C.defectAt >= 3 && !!tgt;
  return `<hr><b>🗽 The Caucus Room</b> <small class="cau-dim">· ${indPill(C.label)} · ${seats('I')} senator${seats('I') === 1 ? '' : 's'} · partner: ${C.partner ? PARTY[C.partner].short : 'no one'} · the ${PARTY[fp].short} run the floor${dec ? ' · <b>your vote decides who organizes</b>' : ''}${km ? ' · <b class="cau-key">you hold the balance</b>' : ''}</small>
    <div class="cau-room">
      <div class="cau-mrow"><span>${PARTY.D.short} trust <b>${cauSigned(C.trust.D)}</b></span>${cauMeter(C.trust.D, -5, 5, 'trust', 'Democratic trust, −5 to +5')}</div>
      <div class="cau-mrow"><span>${PARTY.R.short} trust <b>${cauSigned(C.trust.R)}</b></span>${cauMeter(C.trust.R, -5, 5, 'trust', 'Republican trust, −5 to +5')}</div>
      <div class="cau-mrow"><span>Lean <b>${C.lean === 0 ? 'even' : `${Math.abs(C.lean).toFixed(1)} ${C.lean < 0 ? 'D' : 'R'}`}</b></span>${cauMeter(C.lean, -10, 10, 'lean', 'Votes with the Democrats (left) or the Republicans (right). The dark ends are pockets: a party that owns you stops paying.')}</div>
      <p class="cau-stats">Gavels <b>${C.gavels}</b>${C.gavels && C.partner === fp ? ` (+${C.gavels} action${C.gavels > 1 ? 's' : ''} a bill)` : C.gavels ? ' (idle: your partner doesn\'t run the floor)' : ''} · floor votes owed <b>${C.floorOwed}</b> · bills you decided <b>${C.pivots}</b> · causes written into law <b>${C.causes.length}</b> · banked recruits <b>${C.recruits}</b>/3${C.promised.length ? ` · stand-asides promised <b>${C.promised.length}</b>` : ''}</p>
    </div>
    <div class="cau-roster">${roster || '<p class="cau-dim">Your caucus is empty.</p>'}</div>
    <div class="shop sinks">
      <button class="btn" data-cau="defect" ${defectOK ? '' : 'disabled'}><span>Court a defector${tgt ? `: Sen. ${tgt.m.name} (${tagOf(tgt.m)})` : ''}<small>${tgt ? `${Math.round(tgt.odds * 100)}% odds. Their party's trust −1 if it works; if not, they resent it (−1).` : 'No moderate is restless enough right now.'}${c.bills - C.defectAt < 3 ? ' Once every 3 bills.' : ''}</small></span><span class="cost">3 cap</span></button>
      <button class="btn" data-cau="bank" ${c.capital >= 2 && C.recruits < 3 ? '' : 'disabled'}><span>Bank a recruit<small>A candidate for the next Independent Slate: free to field and 4 points stronger. Up to 3.</small></span><span class="cost">2 cap</span></button>
      <button class="btn" data-cau="tour" ${c.capital >= 1 && cauTourAt !== c.bills ? '' : 'disabled'}><span>Reach-out tour${cauTourAt === c.bills ? ' ✓' : ''}<small>Town halls in both parties' states: independent mood +1, Lean eases 20%.</small></span><span class="cost">1 cap</span></button>
      <button class="btn" data-cau="jeffords" id="cau-jeff" data-office-extra ${C.jeffK !== k && c.capital >= 3 ? '' : 'disabled'}><span>The Jeffords<small>${C.jeffK === k ? 'Already used this Congress.' : 'Switch partners mid-Congress and maybe hand over the Senate.'}</small></span><span class="cost">3 cap</span></button>
      <button class="btn" data-cau="banner" id="cau-banner" data-office-extra ${c.capital >= 3 ? '' : 'disabled'}><span>Change banner<small>Fly a different label: new bills to back, new voters to reach.</small></span><span class="cost">3 cap</span></button>
    </div>`;
}
HOOKS.office.push({
  html: () => IND() && S.cau ? cauRoomHTML() : '',
  button: () => '',
  bind: draw => {
    if (!IND() || !S.cau) return;
    const card = $('#modal-card'), c = S.career, C = S.cau;
    card.querySelectorAll('[data-cau]').forEach(b => b.onclick = () => {
      const k = b.dataset.cau;
      if (k === 'defect') {
        const tgt = cauDefectTarget(); if (!tgt || c.capital < 3 || c.bills - C.defectAt < 3) return;
        c.capital -= 3; C.defectAt = c.bills;
        if (Math.random() < tgt.odds) { const from = cauWelcome(tgt.m); sfx.fanfare(); return cauWelcomePaper(tgt.m, from, draw); }
        cauRel(tgt.m, -1); sfx.down(); toast(`${sen(tgt.m)} says no, and resents being asked.`); return draw();
      }
      if (k === 'bank') { if (c.capital < 2 || C.recruits >= 3) return; c.capital -= 2; C.recruits++; sfx.up(); toast('A recruit is ready for the next Independent Slate.'); return draw(); }
      if (k === 'tour') { if (c.capital < 1 || cauTourAt === c.bills) return; c.capital -= 1; cauTourAt = c.bills; S.mood += 1; C.lean = +(C.lean * 0.8).toFixed(1); sfx.up(); toast('The reach-out tour plays well in both parties\' states.'); return draw(); }
      if (k === 'jeffords') { if (C.jeffK === cauK() || c.capital < 3) return; return cauOrganize(draw, { switching: true }); }
      if (k === 'banner') { if (c.capital < 3) return; return cauLabelPick(draw, true); }
    });
  },
});

/* ---------------- between bills: the Organizing Resolution, the running mate, one moment ---------------- */
function cauComeHomeCands() {
  const C = S.cau;
  return cauMembers().filter(m => !(typeof evtOnTicket === 'function' && evtOnTicket(m)) && ((m.rel || 0) <= 0 || (C.partner && cauLabelLean(indLabel(m)) * cauToward(C.partner) <= -0.6)));
}
HOOKS.interlude.push(() => {
  if (!IND() || !S.cau) return [];
  const C = S.cau, c = S.career, steps = [], N = S.nominees;
  if (C.orgK !== cauK()) steps.push(next => cauOrganize(next));
  if (N && N.conventionsDone && N.I && N.I.yours && !N.I.vp && !N.I.incumbent) steps.push(next => cauRunningMate(next));
  if (c.bills - C.momentAt >= 3) {
    const f = cauForce('poach'), home = cauComeHomeCands(), tgt = cauDefectTarget();
    const homeOK = home.length && c.bills - C.poachAt >= 6, r = f != null ? null : Math.random();
    if (homeOK && (f === true || f === 'home' || (r != null && r < 0.2))) { C.momentAt = c.bills; steps.push(next => cauComeHome(next)); }
    else if (tgt && (f === 'in' || (r != null && r >= 0.2 && r < 0.32))) { C.momentAt = c.bills; steps.push(next => cauGoingIndependent(next)); }
  }
  return steps;
});
function cauComeHome(next) {
  const C = S.cau, c = S.career, home = cauComeHomeCands();
  const X = home.sort((a, b) => (a.rel || 0) - (b.rel || 0))[0]; if (!X) return next();
  const P = ST[X.state].lean > 0 ? 'R' : 'D', L = S.members.find(m => m.party === P && T(m, 'leader')) || null, yr = billYear(c.bills + 1);
  C.poachAt = c.bills;
  const K = 'Between bills · Come home';
  const body = `<div class="evt-person">${portrait(X)}<div><b>${sen(X)}</b> ${indPill(indLabel(X))}<br><small>relationship ${cauSigned(X.rel || 0)} · ${ST[X.state].name} leans ${PARTY[P].short}</small></div></div>
    <p>${L ? `Sen. ${L.name}, who runs the ${L.faction},` : `The ${PARTY[P].name} leadership`} has been taking ${lastName(X)} to dinner. The offer, leaked to Politico by lunchtime: <b>come home to the ${PARTY[P].short}, and a full committee gavel is yours</b>. ${lastName(X)} hasn't said no.</p>`;
  const choices = `<button class="btn" data-choice="poach:match" ${c.capital >= 2 ? '' : 'disabled'}>Match the offer<small>2 capital · ${lastName(X)}'s relationship +2</small></button>
    <button class="btn" data-choice="poach:let">Let them go<small>${lastName(X)} joins the ${PARTY[P].short} · −1 confidence</small></button>
    <button class="btn" data-choice="poach:expose">Go public: "they're buying senators"<small>Independent mood +1 · ${PARTY[P].short} trust −2 · ${lastName(X)} stays, a little embarrassed (−0.5)</small></button>`;
  cauScreen(K, `The ${PARTY[P].short} want ${lastName(X)} back`, body, choices);
  $('#modal-card').querySelectorAll('[data-choice^="poach:"]').forEach(b => b.onclick = () => {
    const k = b.dataset.choice.slice(6), lines = [];
    if (k === 'match') { if (c.capital < 2) return; c.capital -= 2; cauRel(X, 2); lines.push(`${lastName(X)} stays, with a new title on the door (relationship +2). The ${PARTY[P].short} grumble about "bidding wars."`); }
    else if (k === 'let') { cauFlip(X, P); hist(X, `Rejoined the ${PARTY[P].name} Party for a committee gavel`, yr); c.confidence = Math.max(1, c.confidence - 1); lines.push(`${sen(X)} goes home to the ${PARTY[P].short}. The Senate is now ${seats('D')}–${seats('R')}–${seats('I')}. Your caucus wonders who's next (−1 confidence).`); }
    else { S.mood += 1; cauTrust(P, -2); cauRel(X, -0.5); lines.push(`Your press conference leads the evening news: "The ${PARTY[P].short} are shopping for senators." Voters love it (independent mood +1); the ${PARTY[P].short} do not (trust −2).`); }
    sfx.click();
    cauScreen(`${K} · Aftermath`, k === 'let' ? `${lastName(X)} goes home` : `${lastName(X)} stays`, lines.map(t => `<p>${t}</p>`).join(''), null, '<button class="btn primary big adv" id="cau-mok">Back to work</button>');
    $('#cau-mok').onclick = () => next();
  });
}
function cauGoingIndependent(next) {
  const c = S.career, tgt = cauDefectTarget(); if (!tgt) return next();
  const m = tgt.m, K = 'Between bills · Going independent';
  const body = `<div class="evt-person">${portrait(m)}<div><b>${sen(m)}</b><br><small>${m.faction} · relationship ${cauSigned(m.rel || 0)}${m.defy ? ` · broke with the party ${m.defy}×` : ''}</small></div></div>
    <p>${lastName(m)}'s chief of staff calls your office after midnight. The senator is "exploring options": the ${PARTY[m.party].short} leadership has been cold since the last party-line vote, and ${ST[m.state].name} voters don't love either party. One good pitch might do it (<b>${Math.round(tgt.odds * 100)}%</b>).</p>`;
  const choices = `<button class="btn" data-choice="in:pitch" ${c.capital >= 3 ? '' : 'disabled'}>Make the pitch<small>3 capital · ${Math.round(tgt.odds * 100)}% they join your caucus · if not, they resent it (−1)</small></button>
    <button class="btn" data-choice="in:wait">Wait for them to come to you<small>Nothing happens. Maybe next time.</small></button>`;
  cauScreen(K, `${lastName(m)} wants out`, body, choices);
  $('#modal-card').querySelectorAll('[data-choice^="in:"]').forEach(b => b.onclick = () => {
    const k = b.dataset.choice.slice(3);
    if (k === 'pitch') {
      if (c.capital < 3) return; c.capital -= 3; S.cau.defectAt = c.bills;
      if (Math.random() < tgt.odds) { const from = cauWelcome(m); sfx.fanfare(); return cauWelcomePaper(m, from, next); }
      cauRel(m, -1); sfx.down();
      cauScreen(`${K} · Aftermath`, `${lastName(m)} stays put`, `<p>${lastName(m)} listened, thanked you, and voted with the ${PARTY[m.party].short} leadership the next morning. Word gets around (relationship −1).</p>`, null, '<button class="btn primary big adv" id="cau-mok">Back to work</button>');
    } else cauScreen(`${K} · Aftermath`, 'You wait', `<p>${lastName(m)} doesn't call back. The door is still open, a crack.</p>`, null, '<button class="btn primary big adv" id="cau-mok">Back to work</button>');
    $('#cau-mok').onclick = () => next();
  });
}
HOOKS.worldNews.push(() => {
  if (!IND() || !S.cau) return [];
  const C = S.cau, out = [];
  for (const p of ['D', 'R']) { const t = C.trust[p] * 0.9; C.trust[p] = clamp(Math.sign(t) * Math.floor(Math.abs(t) * 2) / 2, -5, 5); }
  C.lean = +(C.lean * 0.95).toFixed(1);
  if (Math.abs(C.lean) >= 8) { const P = C.lean < 0 ? 'D' : 'R'; out.push(`🗞 "A ${PARTY[P].short.replace(/s$/, '')} in all but name": the ${PARTY[other(P)].short} stop returning your calls.`); }
  return out;
});

/* ---------------- floor events (I mode only: cond starts with IND()) ---------------- */
EVENTS.push(
  { id: 'cau_bidwar', w: 0.8, cond: () => IND() && !!S.cau && !!S.bill.patron && !S.bill.nomination, make: () => {
    const B = S.bill, foe = B.foe || other(B.patron), W = S.cau.whips[foe];
    return { title: 'A Folder Across the Table', paper: 'night', text: `Sen. ${W.name}, the ${PARTY[foe].name} whip, slides a folder across the table in the Senate dining room: <b>a better deal than the ${PARTY[B.patron].short} gave you</b>, if your caucus "reconsiders" the ${B.name}.`, choices: [
      { t: 'Hear them out', s: `+1 capital · ${PARTY[B.patron].short} trust −1 (they'll hear about it)`, f: () => { S.career.capital += 1; cauTrust(B.patron, -1); log(`You let ${W.name} make the pitch. The ${PARTY[B.patron].short} found out by dinner.`, 'bad'); } },
      { t: 'Tell your partner', s: `${PARTY[B.patron].short} trust +1 · ${opS(-3)}`, f: () => { cauTrust(B.patron, 1); goodOp(B, -3); log(`You told the ${PARTY[B.patron].short} about the folder. They're grateful; the leak hurts the bill a little.`, 'good'); } },
      { t: 'Tear it up', s: 'Nothing happens', f: () => log('You tore up the folder. A deal is a deal.') },
    ] };
  } },
  { id: 'cau_strip', w: 0.8, cond: () => IND() && !!S.cau && !!S.cau.partner && S.bill.owner === S.cau.partner && killing() && S.cau.gavels > 0, make: () => {
    const C = S.cau, P = C.partner;
    return { title: 'Vote With Us or Lose Your Gavels', paper: 'storm', text: `The ${PARTY[P].name} leader calls you in: you're killing the ${PARTY[P].short}' own bill with the gavels they gave you. <b>"Vote with us or lose your gavels."</b>`, choices: [
      { t: 'Hold firm', s: 'A coin flip: they strip a gavel · independent mood +0.5', f: () => { if (Math.random() < 0.5) { C.gavels = Math.max(0, C.gavels - 1); log(`The ${PARTY[P].short} stripped one of your gavels.`, 'bad'); } else log(`The ${PARTY[P].short} blinked. Your gavels stay.`, 'good'); S.mood += 0.5; } },
      { t: 'Go soft', s: `Your caucus drifts their way (8 each) · ${PARTY[P].short} trust +0.5`, f: () => { for (const m of cauMembers()) if (!m.b.absent && !isLockedYes(m)) { const d = -8 * aimSign(); m.b.bonus += d; m.b.last = d; } cauTrust(P, 0.5); log('You told your caucus to "vote their states." Several will.', 'bad'); } },
    ] };
  } },
);

/* ---------------- 7.6 elections ---------------- */
function cauLane(rc) {
  if (Math.abs(ST[rc.m.state].lean) > 12) return 0;
  let b = 0;
  for (const p of ['D', 'R']) {
    const nom = (rc.people && rc.people[p]) || (rc.m.party === p && !rc.retiring && !rc.primaried ? rc.m : rc.m.party === p && rc.primaried ? rc.nominee : null);
    if (nom && FLANKS.includes(nom.faction)) b += 2;
  }
  return Math.min(4, b);
}
function cauMsgBonus(rc) { const E = S.election; if (!E || !E.cauMsg) return 0; if (E.cauMsg === 'outsider') return 1; return ST[rc.m.state].voter[E.cauMsg] > 0.5 ? 1.5 : 0.5; }
// the expected independent share in a race (O(1); works with S.election null)
function cauStr(rc) {
  if (!rc || !rc.ind || !S.cau) return 0;
  const E = S.election, code = rc.m.state, label = rc.ind.label || S.cau.label;
  return rc.ind.str + (rc.ind.adj || 0) + S.mood * 0.35 + (E ? E.indSignal || 0 : 0) + cashEff(rc.cash || 0, 2.5)
    + cauStateFit(label, code) * 1.2
    + (E ? promiseBoost(code) * 0.5 : 0) + cauLane(rc) + cauMsgBonus(rc)
    + (rc.ind.incumbent ? (rc.m.rec || 0) * 0.4 + (has('field') ? 2 : 0) : 0) + (rc.ind.recruited && has('recruiter') ? 2 : 0)
    + (typeof wingRaceAdj === 'function' ? wingRaceAdj(rc) : 0);
}
function cauCompat(rc, p) { const l = cauLabelLean((rc.ind && rc.ind.label) || S.cau.label); return p === 'D' ? l <= 0.3 : l >= -0.3; }
// stand-asides and ranked-choice transfers: mutates the candidates' pct (they still sum to 98.5)
function cauBallot(rc, cands, dry) {
  if (!rc || !rc.ind) return;
  const I = cands.find(c => c.party === 'I'); if (!I) return;
  if (rc.standDown) {
    const X = cands.find(c => c.party === rc.standDown), O = cands.find(c => c !== X && c.party !== 'I');
    if (X && O) { const k = cauCompat(rc, X.party) ? 0.75 : 0.5; I.pct += X.pct * k; O.pct += X.pct * (1 - k); cands.splice(cands.indexOf(X), 1); }
  }
  if (['ME', 'AK'].includes(rc.m.state) && cands.length === 3 && Math.max(...cands.map(c => c.pct)) < 50) {
    const low = cands.slice().sort((a, b) => a.pct - b.pct)[0];
    if (low.party === 'I') {
      const fD = clamp(0.5 - 0.3 * cauLabelLean(rc.ind.label || S.cau.label), 0.1, 0.9), D = cands.find(c => c.party === 'D'), R = cands.find(c => c.party === 'R');
      if (D && R) { D.pct += low.pct * fD; R.pct += low.pct * (1 - fD); }
    } else {
      const O = cands.find(c => c !== low && c.party !== 'I'), k = cauCompat(rc, low.party) ? 0.6 : 0.4;
      I.pct += low.pct * k; if (O) O.pct += low.pct * (1 - k);
    }
    cands.splice(cands.indexOf(low), 1);
    if (!dry) rc.rcv = true;
  }
}
function cauExp(rc) {
  const i = clamp(cauStr(rc), 3, 60), mg = projMargin(rc), rest = 98.5 - i, A = majorParty(rc);
  const a = clamp(rest / 2 + (mg / 2) * (rest / 98.5), 1, rest - 1);
  const I = { party: 'I', pct: i }, cands = [{ party: A, pct: a }, { party: other(A), pct: rest - a }, I];
  cauBallot(rc, cands, true);   // a ranked-choice count can eliminate the independent: I then drops out of cands
  const best = Math.max(...cands.filter(c => c !== I).map(c => c.pct));
  return { i: I.pct, margin: I.pct - best };
}
function cauRaceChance(rc) { return rc && rc.ind && S.cau ? clamp(normCdf(cauExp(rc).margin / 5.5), 0.01, 0.99) : 0; }
function cauNotUp(cls) { const o = { D: 0, R: 0, I: 0 }; for (const m of S.members) if (m.cls !== cls && o[m.party] != null) o[m.party]++; return o; }
// the seat distribution after an election, as a normal approximation
function cauSeatOdds(races, notUp) {
  let mI = notUp.I, mD = notUp.D, mR = notUp.R, vD = 0, vR = 0;
  for (const rc of races) {
    const pI = cauRaceChance(rc), A = majorParty(rc);
    const pA2 = rc.standDown === A ? 0 : rc.standDown === other(A) ? 1 : normCdf(projMargin(rc) / RACE_SD);
    const pD = (1 - pI) * (A === 'D' ? pA2 : 1 - pA2), pR = (1 - pI) * (A === 'R' ? pA2 : 1 - pA2);
    mI += pI; mD += pD; mR += pR; vD += pD * (1 - pD); vR += pR * (1 - pR);
  }
  const odds = normCdf((50.5 - mD) / Math.max(Math.sqrt(vD), 0.3)) * normCdf((50.5 - mR) / Math.max(Math.sqrt(vR), 0.3));
  return { expI: mI, expD: mD, expR: mR, odds };
}
// the outlook between elections: the seats up next, with neutral campaigns
function cauOutlook() {
  const cls = classUp(nextElectionK());
  const races = S.members.filter(m => m.cls === cls).map(m => ({ m, retiring: false, cash: 0, noise: 0, primaried: false, bruised: false, ind: m.party === 'I' ? { name: m.name, incumbent: true, str: 36, label: indLabel(m) } : null, nominee: null, electability: 0 }));
  const E = S.election; S.election = null;
  try { return cauSeatOdds(races, cauNotUp(cls)); } finally { S.election = E; }
}
function cauHolder(rc) { return rc.m.party !== 'I' && !rc.retiring && !rc.primaried ? rc.m.party : null; }
function cauTwoWay(rc, P) { const A = majorParty(rc), pA = normCdf(projMargin(rc) / RACE_SD); return P === A ? pA : 1 - pA; }
function cauSdOdds(rc, P) { const C = S.cau; return clamp(0.25 + (C.partner === P ? 0.2 : 0) + 0.04 * C.trust[P] + (Math.abs(ST[rc.m.state].lean) >= 10 ? 0.15 : 0) - (cauCompat(rc, P) ? 0 : 0.2), 0.05, 0.8); }
function cauLaneScore(rc) { const code = rc.m.state; return -Math.abs(ST[code].lean) + (rc.primaried ? 6 : 0) + cauStateFit(S.cau.label, code) * 2 + (rc.retiring ? 3 : 0); }
function cauRecruitLabel(code) { const own = S.cau.label; return typeof indFit === 'function' && indFit({ label: own }, code) >= 0 ? own : indPickLabel(null, code, null, cauLabelLean(own)); }
function cauSlate(E, next) {
  const C = S.cau, c = S.career;
  E.cauRecruits = E.cauRecruits || 0; E.cauSlateNews = E.cauSlateNews || [];
  if (!E.cauSlateOpened) {
    E.cauSlateOpened = true;
    for (const o of C.promised.filter(o => o.y === E.year)) {
      const m = S.members[o.id], rc = E.races.find(r => r.m.id === o.id);
      if (C.trust[o.p] >= -1 && rc && rc.ind && m && m.party === 'I' && !rc.standDown) { rc.standDown = o.p; E.cauSlateNews.push(`🌾 The ${PARTY[o.p].short} honor their word: no ${PARTY[o.p].name} nominee against Sen. ${m.name} in ${ST[m.state].name}.`); }
      else E.cauSlateNews.push(`The ${PARTY[o.p].short} reneged: they're running a nominee against ${m ? `Sen. ${lastName(m)}` : 'your senator'} after all.`);
    }
    C.promised = C.promised.filter(o => o.y > E.year);
  }
  const notUp = cauNotUp(E.cls), so = cauSeatOdds(E.races, notUp);
  const idx = rc => E.races.indexOf(rc), pc = p => `${Math.round(p * 100)}%`;
  const row = (rc, extra) => `<div class="cau-lane"><span><b>${ST[rc.m.state].name}</b> · ${rc.ind.name} ${indPill(rc.ind.label)}${rc.ind.recruited ? ' <small>your recruit</small>' : ''}${rc.standDown ? ` <small class="cau-good">no ${rc.standDown} nominee</small>` : ''}</span><span class="cau-ch">${pc(cauRaceChance(rc))}</span>${extra || ''}</div>`;
  const mine = E.races.filter(rc => rc.m.party === 'I' && rc.ind), others = E.races.filter(rc => rc.ind && rc.m.party !== 'I');
  const banked = C.recruits > 0, recOK = E.cauRecruits < 3 && (banked || c.capital >= 2);
  const lanes = E.races.filter(rc => !rc.ind).sort((a, b) => cauLaneScore(b) - cauLaneScore(a)).slice(0, 8);
  const sds = [];
  for (const rc of E.races) {
    if (!rc.ind || rc.standDown || rc.sdAsked) continue;
    for (const P of ['D', 'R']) if (P !== cauHolder(rc) && cauTwoWay(rc, P) < 0.35) sds.push({ rc, P });
  }
  const tags = cauTopIssues(C.label, 3).filter(([, v]) => v > 0).map(([t]) => t);
  const body = `${balanceBar()}
    ${E.cauSlateNews.length ? `<div class="primnews">${E.cauSlateNews.map(t => `<p>${t}</p>`).join('')}</div>` : ''}
    <p class="cau-proj">Projected caucus <b>~${so.expI.toFixed(1)}</b> · Kingmaker odds <b>${pc(so.odds)}</b> <small class="cau-dim">(neither party reaches 51)</small> · capital <b style="color:var(--gold2)">${c.capital}</b>${C.recruits ? ` · banked recruits <b>${C.recruits}</b>` : ''}</p>
    <h3 class="cau-h3">Your incumbents</h3>${mine.map(rc => row(rc)).join('') || '<p class="cau-dim">None of your senators is up this year.</p>'}
    ${others.length ? `<h3 class="cau-h3">Other independents on the ballot</h3>${others.map(rc => row(rc)).join('')}` : ''}
    <h3 class="cau-h3">Open lanes <small class="cau-dim">· recruited ${E.cauRecruits}/3 · ${banked ? 'a banked recruit is free and 4 points stronger' : '2 capital each'}</small></h3>
    ${lanes.map(rc => `<div class="cau-lane"><span><b>${ST[rc.m.state].name}</b> · ${rc.retiring ? `open seat (${rc.m.party} retiring)` : rc.primaried ? `${rc.nominee.name} (${rc.nominee.faction}) beat Sen. ${lastName(rc.m)}` : sen(rc.m)} <small class="cau-dim">${leanLabel(ST[rc.m.state].lean)}</small></span><button class="btn" data-choice="slate:rec:${idx(rc)}" ${recOK ? '' : 'disabled'}>Recruit<small>${banked ? 'banked' : '2 cap'}</small></button></div>`).join('') || '<p class="cau-dim">Every race already has an independent.</p>'}
    ${sds.length ? `<h3 class="cau-h3">Ask a party to stand aside <small class="cau-dim">· 2 capital · one ask per race</small></h3>${sds.map(({ rc, P }) => `<div class="cau-lane"><span><b>${ST[rc.m.state].name}</b> · the ${PARTY[P].short} have ${pc(cauTwoWay(rc, P))} two-way · ${pc(cauSdOdds(rc, P))} they agree</span><button class="btn ${P === 'D' ? 'dem' : 'rep'}" data-choice="slate:sd:${idx(rc)}:${P}" ${c.capital >= 2 ? '' : 'disabled'}>Ask the ${P}<small>2 cap</small></button></div>`).join('')}` : ''}
    <h3 class="cau-h3">The slate's message${E.cauMsg ? ` <small class="cau-dim">· ${E.cauMsg === 'outsider' ? 'Neither party' : TAG[E.cauMsg][1]}</small>` : ''}</h3>
    <div class="cau-msgs">${tags.map(t => `<button class="btn ${E.cauMsg === t ? 'on' : ''}" data-choice="slate:msg:${t}" ${E.cauMsg ? 'disabled' : ''}>${TAG[t][0]} ${TAG[t][1]}<small>+1.5 where voters care, +0.5 elsewhere</small></button>`).join('')}
      <button class="btn ${E.cauMsg === 'outsider' ? 'on' : ''}" data-choice="slate:msg:outsider" ${E.cauMsg ? 'disabled' : ''}>🗽 Neither party<small>+1 everywhere · both parties' trust −0.5</small></button></div>`;
  const sc = $('#modal-card') && !$('#modal').classList.contains('hidden') && /Independent Slate/.test(($('#modal-card .kicker') || {}).textContent || '') ? $('#modal-card').scrollTop : 0;
  cauScreen(`The Independent Slate · ${E.year}`, 'Build the slate', body, null, '<button class="btn primary big adv" id="cau-slate-go">File the slate</button>');
  $('#modal-card').scrollTop = sc;
  $('#modal-card').querySelectorAll('[data-choice^="slate:"]').forEach(b => b.onclick = () => {
    const k = b.dataset.choice.split(':');
    if (k[1] === 'rec') {
      const rc = E.races[+k[2]]; if (!rc || rc.ind || E.cauRecruits >= 3) return;
      const bank = C.recruits > 0; if (!bank && c.capital < 2) return;
      if (bank) C.recruits--; else c.capital -= 2;
      E.cauRecruits++;
      const code = rc.m.state, lean = ST[code].lean;
      rc.ind = { name: fullName(), label: cauRecruitLabel(code), cause: pick(IND_CAUSES), str: rnd(20, 27) + (rc.primaried ? 6 : 0) + (Math.abs(lean) <= 8 ? 3 : 0) + (bank ? 4 : 0), recruited: true };
      E.cauSlateNews.push(`✍ ${rc.ind.name} files to run in ${ST[code].name} under the ${rc.ind.label} banner.`);
      sfx.up();
    } else if (k[1] === 'sd') {
      const rc = E.races[+k[2]], P = k[3]; if (!rc || !rc.ind || rc.sdAsked || rc.standDown || c.capital < 2 || (P !== 'D' && P !== 'R')) return;
      c.capital -= 2; rc.sdAsked = true;
      const f = cauForce('sd'), ok = f != null ? !!f : Math.random() < cauSdOdds(rc, P);
      if (ok) { rc.standDown = P; cauLean(cauToward(P)); E.cauSlateNews.push(`🌾 The ${PARTY[P].short} stand aside in ${ST[rc.m.state].name}: ${rc.ind.name} gets a one-on-one race.`); sfx.fanfare(); }
      else { cauTrust(P, -0.5); E.cauSlateNews.push(`The ${PARTY[P].short} refuse to stand aside in ${ST[rc.m.state].name}, and resent being asked (trust −0.5).`); sfx.down(); }
    } else if (k[1] === 'msg') {
      if (E.cauMsg) return;
      const t = k[2]; if (t !== 'outsider' && !TAG[t]) return;
      E.cauMsg = t; if (t === 'outsider') { cauTrust('D', -0.5); cauTrust('R', -0.5); }
      sfx.click();
    }
    cauSlate(E, next);
  });
  $('#cau-slate-go').onclick = () => { sfx.click(); next(); };
}
function cauTrailHTML() {
  if (!IND() || !S.cau || !S.election) return '';
  const E = S.election, so = cauSeatOdds(E.races, cauNotUp(E.cls)), sd = E.races.filter(rc => rc.standDown).length;
  return `<div class="cau-trail"><span>🗽 <b>The Independent Slate</b> · projected caucus <b>~${so.expI.toFixed(1)}</b> · Kingmaker odds <b>${Math.round(so.odds * 100)}%</b> · recruits ${E.cauRecruits || 0}/3 · stand-asides ${sd}${E.cauMsg ? ` · message: ${E.cauMsg === 'outsider' ? 'neither party' : TAG[E.cauMsg][1]}` : ''}</span><button class="btn" data-office-extra id="cau-reslate">Back to the slate</button></div>`;
}
function cauBindTrail(card, draw) { const b = card && card.querySelector('#cau-reslate'); if (b) b.onclick = () => cauSlate(S.election, draw); }
function cauForecastHTML() {
  const E = S.election || {}, w = E.waveSignal || 0, s = E.indSignal || 0, P = w > 0 ? 'D' : 'R';
  const env = Math.abs(w) >= 6 ? `<b style="color:${PARTY[P].color}">a ${PARTY[P].name} wave is building</b> (about ${Math.abs(w).toFixed(0)} points)` : Math.abs(w) >= 3 ? `the environment leans ${P} by about ${Math.abs(w).toFixed(0)} points` : 'a close, neutral year between the parties';
  const ind = s >= 2.5 ? '<b style="color:var(--ind)">an outsider year</b>: voters are fed up with both parties' : s <= -2.5 ? 'voters are coming home to the parties: a hard year for independents' : 'no special mood for or against independents';
  return `<p class="forecast">📡 <b>The forecast:</b> ${env}; ${ind}. Forecasts can be off by several points either way.</p>`;
}
function cauElectionVerdict(before, after, races, pres) {
  const C = S.cau, c = S.career, net = after.I - before.I, out = [];
  if (net >= 1) { c.confidence = Math.min(5, c.confidence + 1); const cap = Math.min(6, 2 * net); c.capital += cap; addLegacy(5 * net); out.push(`Your caucus gained ${net} seat${net > 1 ? 's' : ''}: +1 confidence, +${cap} capital.`); }
  else if (net <= -1) { const d = net <= -3 ? 2 : 1; c.confidence = Math.max(0, c.confidence - d); out.push(`Your caucus lost ${-net} seat${net < -1 ? 's' : ''}: −${d} confidence.`); }
  else out.push('Your caucus holds its ground.');
  const E = S.election;
  for (const r of races || []) {
    if (r.wParty !== 'I') continue;
    const rc = E && E.races.find(x => x.m.state === r.code && x.m.cls === r.cls);
    if (rc && rc.standDown) unlock('cau_standaside');
    if (rc && rc.rcv) unlock('cau_rcv');
    if (r.incumbent && r.incumbent === r.wName) continue;   // a returning member keeps label and relationship
    const m = S.members.find(x => x.party === 'I' && x.name === r.wName && x.state === r.code);
    if (m) { cauRel(m, Math.max(0, 2 - (m.rel || 0))); if (rc && rc.ind && rc.ind.label && IND_LABELS[rc.ind.label]) m.label = rc.ind.label; else indLabel(m); hist(m, 'Joined the Independent caucus'); }
  }
  if (kingmakerNow()) { c.confidence = Math.min(5, c.confidence + 1); c.capital += 2; addLegacy(5); unlock('cau_balance'); out.push('<b style="color:var(--ind)">Neither party can organize without you</b>: +1 confidence, +2 capital.'); }
  if (seats('I') >= 5) unlock('cau_caucus5');
  if (seats('I') >= 10) { unlock('cau_ten'); if (!C.thirdParty) { C.thirdParty = true; out.push('<b>A THIRD PARTY IS BORN:</b> ten independents in the Senate.'); } }
  if (pres && pres.electors) { cauTrust(pres.electors, 3); c.capital += 6; addLegacy(30); unlock('cau_electors'); out.push(`Your electors chose the President: +6 capital, ${PARTY[pres.electors].short} trust +3.`); }
  if (pres && pres.winner === 'I' && C.ticketY === pres.year) { addLegacy(100); unlock('cau_wh'); out.push('<b>Your ticket wins the White House.</b>'); }
  const tot = pres ? (pres.popD || 0) + (pres.popR || 0) + (pres.popI || 0) : 0, pct = tot ? (pres.popI || 0) / tot : 0;
  if (pres && C.ticketY === pres.year) {
    if (S.lastCauCampaign && S.lastCauCampaign.year === pres.year) S.lastCauCampaign.pct = +(pct * 100).toFixed(1);
    if (pct >= 0.05) { c.capital += 3; addLegacy(10); unlock('cau_line'); out.push(`Your ticket won ${(pct * 100).toFixed(1)}% of the national vote: +3 capital.`); }
  }
  if (seats('I') === 0 && S.president.party !== 'I') { C.wiped = true; c.confidence = 0; out.push('<b style="color:var(--no)">The last independent senator has fallen.</b>'); }
  C.nightGood = net >= 0 && kingmakerNow();
  return out.join(' ');
}
function cauElectionHeadline(before, after, pres) {
  const C = S.cau, net = after.I - before.I;
  let h = C.wiped ? 'THE LAST INDEPENDENT FALLS' : net >= 2 ? `THIRD FORCE SURGES: ${after.I} INDEPENDENTS` : kingmakerNow() ? 'INDEPENDENTS HOLD THE BALANCE' : `${PARTY[seats('D') > seats('R') ? 'D' : 'R'].short.toUpperCase()} WIN THE SENATE OUTRIGHT`;
  if (pres && pres.electors) h = `KINGMAKER ELECTORS: ${h}`;
  return h;
}

/* ---------------- 7.7 the White House ---------------- */
function cauAfterPrimaries(n, endorsed, year) {
  if (!IND() || !S.cau) return [];
  const out = [];
  if (n && n.I) {
    n.I.yours = true; S.cau.ticketY = year;
    if (endorsed && n.I.name === endorsed) { S.career.capital += 4; addLegacy(8); out.push(`🗽 Your pick, ${n.I.name}, carries the Alliance line (+4 capital).`); }
    if (n.I.incumbent) out.push(`🗽 ${n.I.name} runs for a second term outside both parties; the Alliance stands aside.`);
    else if (n.I.major) out.push(`🗽 A heavyweight takes your line: ${n.I.name} runs as the caucus's ticket.`);
    else if (!(endorsed && n.I.name === endorsed)) out.push(`🗽 ${n.I.name} runs as the caucus's ticket.`);
  } else out.push('🗽 The Alliance fields no one.');
  return out;
}
function cauRunningMate(next) {
  const N = S.nominees, I = N && N.I; if (!I) return next();
  const yr = currentYear(), lean = I.lean != null ? +I.lean : cauLabelLean(S.cau.label);
  const sen0 = cauMembers().filter(m => m.name !== I.name && !(typeof evtOnTicket === 'function' && evtOnTicket(m))).sort((a, b) => (b.rel || 0) - (a.rel || 0))[0] || null;
  const ex = lean < -0.1 ? 'D' : lean > 0.1 ? 'R' : pick(['D', 'R']);
  const exSt = pick(STATES.filter(([, , ln]) => ex === 'D' ? ln < -3 : ln > 3))[0];
  const cross = newPerson('I', exSt); cross.exParty = ex; hist(cross, `Served as a ${PARTY[ex].name} governor of ${ST[exSt].name}`, yr - ri(6, 14)); hist(cross, `Left the ${PARTY[ex].name} Party`, yr - ri(1, 4));
  const [kind, fame] = pick([['Retired Army general', 'Commanded a division overseas'], ['Retired admiral', 'Commanded a carrier strike group'], ['Talk-show host', 'Hosted a top-rated daytime talk show'], ['Former NBA All-Star', 'Played in four NBA All-Star Games'], ['Bestselling author', 'Wrote a bestselling memoir']]);
  const star = newPerson('I', pick(STATES)[0]); hist(star, fame, yr - ri(6, 20));
  const cards = [
    sen0 ? { who: sen0, title: `Sen. ${sen0.name} (${sen0.state})`, sub: `A caucus senator ${indPill(indLabel(sen0))}. Steady, known, no surprises: +0 strength, the home-state bump in ${ST[sen0.state].name}. If the ticket wins, the seat goes to the governor's pick.`, d: 0 } : null,
    { who: cross, title: `${cross.name}, ex-${ex}`, sub: `Former ${PARTY[ex].name} governor of ${ST[exSt].name}: crossover appeal, +0.6 strength. The ${PARTY[ex].short} will resent it (trust −0.5).`, d: 0.6, ex },
    { who: star, title: `${star.name}`, sub: `${kind}. A jolt of attention: anywhere from −0.5 to +2 strength.`, d: null },
  ];
  const first = cards[0] ? 0 : 1;
  cauScreen(`Your running mate · ${yr}`, `A running mate for ${I.name}`, `<p>${I.name} ${indPill(I.label)} polls about <b>${(+I.strength || 0).toFixed(1)}%</b> nationally. The running mate's home state gets the usual bump, and a good pick can lift the whole ticket.</p>`,
    cards.map((x, i) => x ? `<button class="btn cau-vp" data-choice="vp:${i}"><span class="cp">${portrait(x.who)}</span><span><b>${x.title}</b><small>${x.sub}</small></span></button>` : '').join(''),
    `<button class="btn primary big adv" id="cau-vp-go">Pick ${cards[first].title}</button>`);
  const choose = i => {
    const x = cards[i]; if (!x) return;
    const d = x.d == null ? +rnd(-0.5, 2).toFixed(1) : x.d;
    I.vp = { name: x.who.name, state: x.who.state, faction: 'Independents' };
    I.strength = +((+I.strength || 0) + d).toFixed(1);
    if (x.ex) cauTrust(x.ex, -0.5);
    hist(x.who, `Named the independent running mate for ${yr}`, yr);
    sfx.fanfare(); toast(`${x.who.name} joins the ticket (${cauSigned(d)} strength).`);
    next();
  };
  $('#modal-card').querySelectorAll('[data-choice^="vp:"]').forEach(b => b.onclick = () => choose(+b.dataset.choice.slice(3)));
  $('#cau-vp-go').onclick = () => choose(first);
}
function cauPresBoxHTML() {
  if (!IND() || !S.cau) return '';
  const E = S.election || {}, I = S.nominees && S.nominees.I;
  if (!I || !I.yours) return `<div class="presbox cau-presbox"><b>🗽 No caucus ticket this year.</b> <small class="cau-dim">${S.cau.presEnvD && S.cau.presEnvD.y === E.year ? `Your endorsement is worth about ${Math.abs(S.cau.presEnvD.v)} points to the ${PARTY[S.cau.presEnvD.v > 0 ? 'D' : 'R'].short}.` : 'Your caucus sits out the presidential race.'}</small></div>`;
  const nat = (+I.strength || 0) + cauThirdNat(I);
  return `<div class="presbox cau-presbox"><div class="cau-tk">${I.p ? `<span class="cp">${portrait(I.p)}</span>` : ''}<span><b>${I.name}</b> ${indPill(I.label)}${I.vp ? ` <small>with ${I.vp.name}</small>` : ''}<br>
    <small>Your caucus's ticket · polling ~<b>${nat.toFixed(1)}%</b> nationally · ${nat >= 15 ? '<b class="cau-good">over the 15% debate line</b>' : `${(15 - nat).toFixed(1)} points under the 15% line`}</small></span></div>
    <div class="race"><span>📣 <b>Ticket money</b><br><small class="cau-dim">Bulk spending for the ticket: the first unit ≈ +0.7 points nationally, less after.</small></span><span class="cashctl"><button class="btn" data-pc="-1" ${E.presCash ? '' : 'disabled'}>−</button><span>${money(E.presCash || 0)}</span><button class="btn" data-pc="1" ${(E.cash || 0) < 1 ? 'disabled' : ''}>+</button></span></div></div>`;
}
function cauFallCampaign(done) {
  const E = S.election, N = S.nominees; if (!E || !N || !N.I || !S.cau) return done();
  const C = S.cau, year = E.year, I = N.I;
  E.cauCamp = E.cauCamp || { nat: 0, stateAdj: {}, fade: 0, strategy: null };
  const cp = E.cauCamp, rec = { year, strategy: null, debate: null, october: null, pledge: null, pct: null, lines: [] };
  let fadeMul = 1;
  const K = s => `Third Force · ${s} · ${year}`;
  const screen = (k, h2, body, choices, onPick) => {
    cauScreen(K(k), h2, body, choices.map(([key, t, s]) => `<button class="btn" data-choice="${key}">${t}<small>${s}</small></button>`).join(''), `<button class="btn primary big adv" id="cau-fc-go">${choices[0][1]}</button>`);
    $('#modal-card').querySelectorAll('[data-choice]').forEach(b => b.onclick = () => { sfx.click(); onPick(b.dataset.choice); });
    $('#cau-fc-go').onclick = () => { sfx.click(); onPick(choices[0][0]); };
  };
  const poll = () => { const p = indThreeWay(N.I); return `<div class="cau-poll"><span style="color:${PARTY.D.color}">${N.D ? N.D.name : 'Democrat'} (D) <b>${p.D}%</b></span><span style="color:${PARTY.R.color}">${N.R ? N.R.name : 'Republican'} (R) <b>${p.R}%</b></span><span style="color:${PARTY.I.color}">${I.name} (I) <b>${(+p.I).toFixed(1)}%</b></span><span class="cau-dim">undecided ${p.und}%</span></div>`; };
  const finish = () => {
    cp.fade = +(S.nominees && S.nominees.I ? S.nominees.I.strength * rnd(0.15, 0.3) * fadeMul : 0).toFixed(1);
    if (cp.fade) rec.lines.push(`The squeeze: as November nears, ${cp.fade} points drift home to the two parties.`);
    S.lastCauCampaign = rec;
    done();
  };
  // 1. Labor Day
  screen('Labor Day', `${I.name}'s fall campaign`, `<p>Labor Day: the three-way race begins. Third candidates fade in the fall as voters "come home"; your job is to slow the fade and put the ticket where it can matter.</p>${poll()}`, [
    ['camp:national', 'Run a national campaign', 'Every state, every network: +1.5 nationally'],
    ['camp:region:0', 'Win the West', '+4 in the western states, −0.5 elsewhere'],
    ['camp:region:1', 'Win the heartland', '+4 in the middle of the country, −0.5 elsewhere'],
    ['camp:region:2', 'Win the East', '+4 in the eastern states, −0.5 elsewhere'],
    ['camp:deny', 'Deny them the swing states', '+3 in the 8 closest states: maybe nobody reaches 270'],
    ['camp:five', 'Five percent or bust', '+1 nationally, and the fall fade is halved'],
  ], k => {
    const st = Object.keys(EV);
    if (k === 'camp:national') { cp.nat += 1.5; cp.strategy = 'national'; }
    else if (k.startsWith('camp:region:')) { const r = +k.slice(12); for (const c of st) cp.stateAdj[c] = (cp.stateAdj[c] || 0) + (Math.min(2, Math.floor(colOf(c) / 4)) === r ? 4 : -0.5); cp.strategy = 'region' + r; }
    else if (k === 'camp:deny') { const pm = presProjection().margins; st.slice().sort((a, b) => Math.abs(pm[a]) - Math.abs(pm[b])).slice(0, 8).forEach(c => cp.stateAdj[c] = (cp.stateAdj[c] || 0) + 3); cp.strategy = 'deny'; }
    else { cp.nat += 1; fadeMul *= 0.5; cp.strategy = 'five'; }
    rec.strategy = CAU_STRAT[cp.strategy] || cp.strategy; rec.lines.push(`Labor Day: ${rec.strategy}.`);
    debates();
  });
  // 2. the debates
  const debates = () => {
    const strong = (+I.strength || 0) + cp.nat >= 15;
    if (strong) screen('The debates', 'On the stage', `<p>${I.name} polls ${((+I.strength || 0) + cp.nat).toFixed(1)}%: over the commission's <b>15% line</b>. Three podiums, ninety minutes, sixty million viewers.</p>`, [
      ['deb:attack', 'Go after both of them', 'Swing big: anywhere from −2 to +4'],
      ['deb:wonk', 'Know every number', 'The policy night: anywhere from −2 to +4'],
      ['deb:pox', '"A pox on both their houses"', 'The outsider pitch: anywhere from −2 to +4'],
    ], k => { const d = +clamp(1 + gauss() * 2, -2, 4).toFixed(1); cp.nat += d; rec.debate = `${k.slice(4)} (${cauSigned(d)})`; rec.lines.push(`The debates: ${d >= 2 ? 'a breakout night' : d >= 0 ? 'a solid night' : 'a rough night'} (${cauSigned(d)} nationally).`); october(); });
    else screen('The debates', 'Locked out', `<p>${I.name} polls ${((+I.strength || 0) + cp.nat).toFixed(1)}%: under the commission's <b>15% line</b>. No podium.</p>`, [
      ['deb:town', 'Hold a counter-town-hall', 'A sure thing: +0.5'],
      ['deb:crash', 'Crash the debate hall', '40%: the stunt of the year (+2); otherwise it backfires (−1)'],
    ], k => { const d = k === 'deb:town' ? 0.5 : Math.random() < 0.4 ? 2 : -1; cp.nat += d; rec.debate = `${k.slice(4)} (${cauSigned(d)})`; rec.lines.push(`Locked out of the debates: ${k === 'deb:town' ? 'a town hall' : d > 0 ? 'the crash works' : 'the crash backfires'} (${cauSigned(d)}).`); october(); });
  };
  // 3. October
  const october = () => {   // the cabinet offer (never to a sitting President) or the squeeze
    const l = I.lean != null ? +I.lean : cauLabelLean(C.label), p = l < 0 ? 'D' : l > 0 ? 'R' : (C.trust.D >= C.trust.R ? 'D' : 'R'), nom = N[p];
    if (!I.incumbent && Math.random() < 0.5 && nom) screen('October', 'The cabinet offer', `<p>${nom.name}'s campaign chair calls: <b>withdraw, endorse ${lastName(nom.p || nom)}, and ${I.name} gets a cabinet seat</b>. The ${PARTY[p].short} would owe your caucus, and your voters would mostly follow you.</p>`, [
      ['oct:refuse', 'Refuse: we\'re in it to the end', 'Independent mood +1'],
      ['oct:accept', `Withdraw and endorse ${nom.name}`, `About +1.5 points for the ${PARTY[p].short} · ${PARTY[p].short} trust +3 · Lean moves their way · −1 confidence`],
    ], k => {
      if (k === 'oct:accept') {
        S.cau.presEnvD = { y: year, v: p === 'D' ? 1.5 : -1.5 }; cauTrust(p, 3); cauLean(4 * cauToward(p)); S.career.confidence = Math.max(1, S.career.confidence - 1);
        if (I.p) hist(I.p, `Withdrew from the ${year} presidential race and endorsed ${nom.name}`, year);
        rec.october = `withdrew for ${nom.name}`; rec.lines.push(`October: ${I.name} withdraws and endorses ${nom.name} (${PARTY[p].short} +1.5).`);
        S.nominees.I = null; fadeMul = 0;
        return finish();
      }
      S.mood += 1; rec.october = 'refused the cabinet offer'; rec.lines.push(`October: ${I.name} refuses a cabinet seat to stay in the race.`); pledge();
    });
    else screen('October', 'The squeeze', `<p>The ads start: <b>"A vote for ${lastName(I.p || I)} is a vote for the other guy."</b> Both parties are telling your voters to come home.</p>`, [
      ['oct:five', 'Hold the five percent', 'The fall fade is halved'],
      ['oct:broke', 'Go for broke', '+1 nationally, but the fade runs 20% harder'],
    ], k => { if (k === 'oct:five') fadeMul *= 0.5; else { cp.nat += 1; fadeMul *= 1.2; } rec.october = k === 'oct:five' ? 'held the base' : 'went for broke'; rec.lines.push(`October: the squeeze. The campaign ${rec.october}.`); pledge(); });
  };
  // 4. the Elector Gambit
  const pledge = () => screen('The Elector Gambit', 'Pledge your electors', `<p>If nobody reaches 270 and your electors can put one side over, <b>they decide it</b>. Otherwise the House picks the President, one vote per state delegation, and your caucus gets nothing. Trust: ${PARTY.D.short} ${cauSigned(C.trust.D)}, ${PARTY.R.short} ${cauSigned(C.trust.R)}.</p>`, [
    ['pledge:best', 'To whoever pays more', 'The party that trusts you more (ties: the bigger elector count)'],
    ['pledge:D', `To the ${PARTY.D.short}`, `${N.D ? N.D.name : 'their nominee'} gets your electors if they can make the difference`],
    ['pledge:R', `To the ${PARTY.R.short}`, `${N.R ? N.R.name : 'their nominee'} gets your electors if they can make the difference`],
    ['pledge:none', 'To no one', 'Your electors vote for your ticket; the House decides'],
  ], k => { const p = k.slice(7); C.pledge = { y: year, p }; rec.pledge = p; rec.lines.push(`The Elector Gambit: pledged ${p === 'best' ? 'to the highest bidder' : p === 'none' ? 'to no one' : `to the ${PARTY[p].short}`}.`); finish(); });
}
// night.js hooks
function cauThirdNat(T) {
  if (!IND() || !S.nominees || !S.nominees.I || !T || T.name !== S.nominees.I.name) return 0;
  const E = S.election || {};
  return cashEff(E.presCash || 0, 0.7) + (E.cauCamp ? E.cauCamp.nat - E.cauCamp.fade : 0);
}
function cauThirdAdj(c, T) {
  if (!IND() || !S.nominees || !S.nominees.I || !T || T.name !== S.nominees.I.name) return 0;
  const E = S.election || {};
  return (E.cauCamp && E.cauCamp.stateAdj[c]) || 0;
}
function cauPresEnvD() { const C = S.cau; return IND() && C && C.presEnvD && C.presEnvD.y === (S.election && S.election.year) ? C.presEnvD.v : 0; }
function cauElectors(evD, evR, evI) {
  if (!IND() || !S.cau || !evI) return null;
  const pl = S.cau.pledge, f = cauForce('pledge'), yr = S.election && S.election.year;
  let p = f != null ? f : pl && pl.y === yr ? pl.p : null;
  if (!p || p === 'none') return null;
  if (p === 'best') p = S.cau.trust.D !== S.cau.trust.R ? (S.cau.trust.D > S.cau.trust.R ? 'D' : 'R') : evD >= evR ? 'D' : 'R';
  if (p !== 'D' && p !== 'R') return null;
  return evI + (p === 'D' ? evD : evR) >= 270 ? p : null;
}

/* ---------------- the Pulse and status lines ---------------- */
function cauPulseHTML() {
  if (!IND() || !S.cau) return '';
  const C = S.cau, o = cauOutlook(), fp = floorParty(), N = S.nominees, presYr = isPresYear(nextElectionK());
  const tk = !presYr ? '' : N && N.I && N.I.yours ? `<p>🗳 Your ticket: <b>${N.I.name}</b> ${indPill(N.I.label)} at ~${(+N.I.strength || 0).toFixed(1)}% nationally${N.I.vp ? `, with ${N.I.vp.name}` : ''}.</p>` : '<p class="cau-dim">🗳 No caucus ticket yet: the Ballot Alliance primaries decide it.</p>';
  return `<div class="presbox cau-pulse"><b>🗽 The Independent caucus</b>
    <p>${seats('I')} senator${seats('I') === 1 ? '' : 's'} under the ${indPill(C.label)} banner · partner: ${C.partner ? PARTY[C.partner].short : 'no one'} · the ${PARTY[fp].short} run the floor${kingmakerNow() ? ' · <b class="cau-key">you hold the balance</b>' : ''}</p>
    <p>Trust: ${PARTY.D.short} <b>${cauSigned(C.trust.D)}</b> · ${PARTY.R.short} <b>${cauSigned(C.trust.R)}</b> · Lean <b>${C.lean === 0 ? 'even' : `${Math.abs(C.lean).toFixed(1)} ${C.lean < 0 ? 'D' : 'R'}`}</b> · independent mood <b style="color:${S.mood >= 0 ? 'var(--yes)' : 'var(--no)'}">${fmt(S.mood)}</b></p>
    <p>Next election (${electionYear(nextElectionK())}), on today's numbers: caucus <b>~${o.expI.toFixed(1)}</b> seats · D ~${o.expD.toFixed(0)} · R ~${o.expR.toFixed(0)} · Kingmaker odds <b>${Math.round(o.odds * 100)}%</b></p>${tk}</div>`;
}
function cauPulseChyron() { const o = cauOutlook(); return `KINGMAKER ODDS ${Math.round(o.odds * 100)}% — INDEPENDENTS PROJECTED AT ${Math.round(o.expI)}`; }
function cauSenateStatus() {
  if (!S.cau) return `Senate D ${seats('D')} · R ${seats('R')} · I ${seats('I')}`;
  const fp = floorParty(), withYou = S.cau.partner === fp && !cauAlone(fp);
  return `Senate D ${seats('D')} · R ${seats('R')} · I ${seats('I')}. The ${fp} organize ${withYou ? 'with your votes' : 'on their own'}.${kingmakerNow() ? ' You are the kingmakers.' : ''}`;
}
function cauStatusShort() { if (!S.cau) return `Caucus of ${seats('I')}`; const fp = floorParty(); return kingmakerNow() ? `Kingmakers · ${fp} floor` : `Caucus of ${seats('I')} · ${fp} floor`; }
function cauFactionsHTML() {
  if (!IND() || !S.cau) return '';
  const groups = {};
  for (const m of cauMembers()) { const l = indLabel(m) || 'Independent'; (groups[l] = groups[l] || []).push(m); }
  const sc = m => m.b ? seatColor(m) : '#3a4250';
  return `<div class="fgrid cau-fgrid">${Object.entries(groups).map(([l, ms]) => `<div class="fcard" style="border-left-color:${indLabelInfo(l).color}"><div class="fh"><b>Your caucus · ${l}</b><small>${ms.length} senator${ms.length === 1 ? '' : 's'}${l === S.cau.label ? ' · your banner' : ''}</small></div>
    <div class="fm">${ms.map(m => `<i title="Sen. ${m.name} (${m.state})" data-goto="${m.id}" style="background:${sc(m)}"></i>`).join('')}</div>
    <small class="cau-dim">${ms.map(m => lastName(m)).join(', ')}</small></div>`).join('') || '<p class="cau-dim">Your caucus is empty.</p>'}</div>`;
}
