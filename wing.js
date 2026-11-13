'use strict';
/* =====================================================================
   WING — the faction you back inside your party, and your feud (or truce)
   with the White House. Loaded after events.js.
   Hooks used by game.js: wingPickModal, wingVetoAdj, wingOwnVeto,
   wingRaceAdj, wingPrimaryThreat, wingRecruitFaction; primaries.js reads
   wingPrimaryBoost; the office gets a section via HOOKS.office and the
   White House retaliates via HOOKS.worldNews.
   ===================================================================== */

ACH.push(['wing', '🦅', 'Wing Builder', 'Grow your wing to 12 senators.'], ['warpath', '⚔️', 'On the Warpath', 'Drive an opposing President below 35% approval.']);
const WING_BLURB = {
  'Progressives': 'The activist left: Medicare for All, a climate emergency, taxing the rich.',
  'New Democrats': 'Pro-growth, pro-tech, business-friendly Democrats from the suburbs.',
  'Labor Democrats': 'Union halls and factory towns: wages, pensions, trade.',
  'Blue Dogs': 'Fiscal hawks and moderates who keep the party competitive in swing states.',
  'Conservative Democrats': 'Democrats from deep-red states: guns, farms, the military, and a long memory for Washington.',
  'Freedom Caucus': 'The hard right: cut spending, cut taxes, no deals.',
  'Establishment': 'The party\'s governing class: business, defense and the Chamber of Commerce.',
  'Populists': 'Small towns and working families: tariffs, farms and suspicion of big tech.',
  'GOP Moderates': 'Suburban Republicans who can win where the party usually loses.',
  'Progressive Republicans': 'Republicans from deep-blue states: conservation, civil rights and good government.',
};
const wingOf = () => S.myFaction && FACTIONS[S.side].some(f => f[0] === S.myFaction) ? S.myFaction : null;
function wingMembers(f = wingOf()) { return f ? S.members.filter(m => m.party === S.side && m.faction === f) : []; }
function wingGovs(f = wingOf()) { return f ? Object.keys(S.governors || {}).filter(c => S.governors[c].party === S.side && S.governors[c].faction === f) : []; }
function wingHouse(f = wingOf()) { const i = FACTIONS[S.side].findIndex(x => x[0] === f), c = HOUSE_FAC[S.side][i]; return c ? { name: c[0], seats: Math.round((S.house[S.side] || 0) * c[1]) } : null; }
function wingLeader(f = wingOf()) { return wingMembers(f).find(m => T(m, 'leader')); }

/* ---------------- choosing a wing ---------------- */
function wingPickModal(done, switching) {
  const p = S.side, cards = FACTIONS[p].map(([f, w]) => {
    const ms = S.members.filter(m => m.party === p && m.faction === f), L = ms.find(m => T(m, 'leader')), hs = wingHouse(f);
    const issues = Object.entries(w).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 4).map(([t, v]) => `<span class="wing-chip ${v > 0 ? 'pro' : 'con'}">${TAG[t][0]} ${v > 0 ? 'more' : 'less'} ${TAG[t][1]}</span>`).join('');
    return `<button class="wing-card ${f === S.myFaction ? 'on' : ''}" data-choice="wing:${f}" ${f === S.myFaction ? 'disabled' : ''}><b>${f}</b><small>${WING_BLURB[f] || ''}</small><span class="wing-issues">${issues}</span>
      <span class="wing-stats">${ms.length} senator${ms.length === 1 ? '' : 's'} · ${wingGovs(f).length} governor${wingGovs(f).length === 1 ? '' : 's'}${hs ? ` · ~${hs.seats} in the ${hs.name}` : ''}${L ? ` · led by Sen. ${L.name} (${L.state})` : ''}</span></button>`;
  }).join('');
  showModal(`<div class="kicker">${switching ? 'Switching wings' : 'Your career begins'} · ${PARTY[p].name} whip</div><h2>Which wing of the party is yours?</h2>
    <p>You whip the whole caucus, but everyone knows where your heart is. Pick a wing to champion and build up. Its senators start out warmer to you (+2 relationship). You can recruit its candidates for open seats, convert colleagues, fund its PAC, and its presidential candidates get your network in the primaries. Its members back one another there too, mostly.${switching ? ' <b>Switching costs 3 capital and your old wing will feel betrayed (−1 relationship).</b>' : ''}</p>
    <p style="color:var(--dim);font-size:13px">The ${PARTY[p].short} start in the <b>minority</b>, ${seats(p)} seats to ${seats(other(p))}, and ${presTitle()} (${PARTY[S.president.party].name}) holds the White House at ${S.president.approval}% approval.</p>
    <div class="wing-grid">${cards}</div>
    ${switching ? '<div class="choices"><button class="btn ghost adv" id="wingcancel">Keep my wing</button></div>' : ''}`);
  $('#modal-card').querySelectorAll('[data-choice^="wing:"]').forEach(b => b.onclick = () => {
    const f = b.dataset.choice.slice(5);
    if (switching) { if (S.career.capital < 3) return toast('Not enough capital.'); S.career.capital -= 3; for (const m of wingMembers()) m.rel -= 1; }
    S.myFaction = f; S.wingClout = switching ? Math.max(0, (S.wingClout || 0) - 1) : 0;
    for (const m of wingMembers(f)) m.rel += 2;
    const L = wingLeader(f); if (L) hist(L, `Became the whip's closest ally as leader of the ${f}`);
    sfx.up(); toast(`You champion the ${f}.`); done();
  });
  if ($('#wingcancel')) $('#wingcancel').onclick = done;
}

/* ---------------- building the wing ---------------- */
// the best colleague to win over: same party, not in the wing, likes you, and their state likes the wing's issues
function wingConvertTarget() {
  const f = wingOf(); if (!f) return null;
  const fx = FACTIONS[S.side].find(x => x[0] === f)[1];
  const c = S.members.filter(m => m.party === S.side && m.faction !== f && !T(m, 'leader') && !m.grudge && m.rel >= 0).map(m => { let fit = 0; for (const t of TAGS) fit += (fx[t] || 0) * ST[m.state].voter[t]; return { m, odds: clamp(0.3 + m.rel * 0.08 + fit * 0.05 + (T(m, 'loyal') ? -0.1 : 0) + (T(m, 'ambitious') ? 0.05 : 0), 0.1, 0.85) }; }).sort((a, b) => b.odds - a.odds);
  return c[0] || null;
}
function wingRecruitFaction(np) {
  if (np !== S.side || !wingOf() || !(S.wingRecruits > 0)) return null;
  S.wingRecruits--; S.wingWins = (S.wingWins || 0) + 1;
  return wingOf();
}
// presidential primaries: your network lifts the wing's candidates
function wingPrimaryBoost(f) { return f.party === S.side && f.faction === wingOf() ? 0.04 + 0.03 * Math.min(5, S.wingClout || 0) : 0; }

/* ---------------- the feud with the White House ---------------- */
// S.whRel: −10 (open war) … +10 (close partners). Hostility has teeth both ways.
const whRel = () => S.whRel || 0;
function wingFeudLabel(r = whRel()) { return r <= -7 ? 'open war' : r <= -4 ? 'hostile' : r <= -1.5 ? 'cold' : r < 1.5 ? 'correct' : r < 4 ? 'cordial' : 'close partners'; }
function wingVetoAdj() { const r = whRel(); return r < 0 ? Math.min(0.3, -r * 0.035) : -Math.min(0.15, r * 0.03); }
function wingOwnVeto() { const r = whRel(); return r <= -5 ? Math.min(0.35, (-r - 4) * 0.07) : 0; }
function wingPrimaryThreat(m) { return S.president.party === S.side && whRel() <= -4 && m.party === S.side && m.faction === wingOf() ? 0.2 : 0; }
// your-side-positive points in one Senate race: a feuding President campaigns against your candidates (or keeps away)
function wingRaceAdj(rc) {
  const r = whRel(), P = S.president; if (r > -5 || !S.election) return 0;
  const yrs = (S.whTargets || []).filter(t => t.year === S.election.year).map(t => t.id);
  const target = rc.m && rc.m.party === S.side && yrs.includes(rc.m.id);
  if (P.party !== S.side) return P.approval >= 45 ? -1 - (target ? 2 : 0) : P.approval < 42 ? 0.5 : 0;
  return P.approval >= 45 ? -0.8 - (target ? 1.5 : 0) : P.approval < 42 ? 0.4 : 0;
}
function wingHit(d) { S.whRel = clamp(whRel() + d, -10, 10); }
function wingConsequences() {
  const r = whRel(), P = S.president, yours = P.party === S.side, out = [];
  if (yours) {
    if (r <= -3) out.push(`${presTitle()} won't make calls for your bills.`);
    if (r <= -4) out.push('The White House is quietly backing primary challengers against your wing (+20% challenge odds).');
    if (r <= -5) out.push(`Your own President may veto your bills (${Math.round(wingOwnVeto() * 100)}% risk), and will keep off the trail for your candidates${P.approval < 42 ? ' (with this approval, that helps)' : ' (−0.8 in every race)'}.`);
    if (r >= 3) out.push('The President has your back: calls land, vetoes are off the table.');
  } else {
    if (r < 0) out.push(`Veto risk on your bills +${Math.round(wingVetoAdj() * 100)} points.`);
    if (r <= -3) out.push('Expect retaliation between bills: cancelled projects in your senators\' states, executive orders aimed at your priorities, oppo on you.');
    if (r <= -5) out.push(`The President will campaign against your senators${P.approval >= 45 ? ' (−1 in every race, −3 where targeted)' : ' (at this approval, it backfires: +0.5)'}.`);
    if (r >= 2) out.push(`Veto risk ${Math.round(-wingVetoAdj() * 100)} points lower, but your base calls it collaboration (mood −0.2 between bills).`);
  }
  return out;
}
function wingBattleMoves() {
  const P = S.president, yours = P.party === S.side, maj = isMajority(), hm = houseMaj() === S.side, cap = S.career.capital;
  if (yours) return [
    ['break', 'Break with the President publicly', `A floor speech that ends the pretense. Approval −6, the feud deepens (−4), the President's faction turns on you (−2), your wing rallies (+1), party mood −1.${P.approval < 40 ? ' At this approval, the caucus cheers (+1 confidence).' : ''}`, 2, true],
    ['peace', 'Make peace with the President', 'A long dinner in the residence. Feud +4, the President\'s faction warms (+1).', 2, whRel() < 0],
  ];
  return [
    ['probe', maj ? 'Subpoena the White House' : 'Demand an inspector general', maj ? 'Your committee chairs open a full investigation. Approval −3 to −7; one in five times it looks like a witch hunt (your mood −1.5).' : 'In the minority you can only demand one. Approval −1 to −3, small backfire risk.', maj ? 2 : 1, true],
    ['rebut', 'Prime-time rebuttal', `Your party answers the President on every network. Approval −1 to −2, your party's mood +0.8.`, 1, true],
    ['holds', 'Hold the President\'s nominees', 'Holds on every nominee in the queue. Approval −2, the President fumes (feud −2).', 1, true],
    ['impeach', 'Open an impeachment inquiry', `The nuclear option. Needs your party's House majority, approval under 45 and a hostile feud. 55%: approval −8 and your base energized; 45%: it backfires (approval +4, mood −2.5, −1 confidence).`, 3, hm && P.approval < 45 && whRel() <= -4],
    ['deal', 'Cut a deal with the White House', IND() ? 'Trade a priority for a priority. Feud +3, veto risk down. Your trust with the President\'s party +0.5; your Lean moves their way.' : `Trade a priority for a priority. Feud +3, veto risk down. Your base grumbles (mood −0.5); ${[MODERATE[S.side], CROSS[S.side], 'New Democrats', 'Establishment'].includes(wingOf()) ? 'your wing likes deals (+0.5).' : 'your wing hates it (−0.5).'}`, 1, true],
  ].map(x => x.concat([cap]));
}
function wingBattle(k) {
  const P = S.president, d = n => { P.approval = clamp(P.approval - n, 18, 82); };
  const cost = (wingBattleMoves().find(x => x[0] === k) || [])[3]; if (cost == null || S.career.capital < cost || S.wingBattleUsed === S.career.bills) return;
  S.career.capital -= cost; S.wingBattleUsed = S.career.bills;
  let msg;
  if (k === 'break') { d(6); wingHit(-4); for (const m of S.members) { if (m.party === S.side && m.faction === P.faction) m.rel -= 2; if (m.party === S.side && m.faction === wingOf()) m.rel += 1; } S.mood -= 1; if (P.approval < 40) S.career.confidence = Math.min(5, S.career.confidence + 1); hist(P, 'Publicly repudiated by their own party\'s Senate whip'); msg = 'You broke with the President on the Senate floor.'; }
  if (k === 'peace') { wingHit(4); for (const m of S.members) if (m.party === S.side && m.faction === P.faction) m.rel += 1; msg = 'Peace, for now, with the White House.'; }
  if (k === 'probe') { if (Math.random() < (isMajority() ? 0.2 : 0.1)) { S.mood -= 1.5; wingHit(-1); msg = 'The investigation looks like a witch hunt. It backfires.'; } else { const n = isMajority() ? ri(3, 7) : ri(1, 3); d(n); wingHit(-2); hist(P, isMajority() ? 'Subpoenaed by the Senate' : 'Faced a Senate demand for an inspector general'); msg = `The probe lands: ${presTitle()} −${n}.`; } }
  if (k === 'rebut') { const n = ri(1, 2); d(n); S.mood += 0.8; wingHit(-1); msg = `Your rebuttal wins the night: ${presTitle()} −${n}.`; }
  if (k === 'holds') { d(2); wingHit(-2); S.cabinetHolds = (S.cabinetHolds || 0) + 1; msg = 'Every nominee is on hold. The President is furious.'; }
  if (k === 'holds' && IND() && S.cau && (P.party === 'D' || P.party === 'R')) S.cau.trust[P.party] = clamp(S.cau.trust[P.party] - 0.5, -5, 5);
  if (k === 'impeach') { if (Math.random() < 0.55) { d(8); S.mood += 1.5; wingHit(-3); hist(P, 'Faced an impeachment inquiry'); msg = `The inquiry is devastating: ${presTitle()} −8.`; } else { P.approval = clamp(P.approval + 4, 18, 82); S.mood -= 2.5; S.career.confidence = Math.max(1, S.career.confidence - 1); wingHit(-2); msg = 'The inquiry backfires. The public rallies to the President.'; } }
  if (k === 'deal') { wingHit(3); S.mood -= 0.5; const likes = [MODERATE[S.side], CROSS[S.side], 'New Democrats', 'Establishment'].includes(wingOf()); for (const m of wingMembers()) m.rel += likes ? 0.5 : -0.5; msg = 'A deal with the White House.'; }
  if (k === 'deal' && IND() && S.cau && (P.party === 'D' || P.party === 'R')) { S.cau.trust[P.party] = clamp(S.cau.trust[P.party] + 0.5, -5, 5); S.cau.lean = clamp(S.cau.lean + (P.party === 'D' ? -0.5 : 0.5), -10, 10); }
  if (P.party !== S.side && P.approval < 35) unlock('warpath');
  S.mood = clamp(S.mood, -15, 15);
  sfx.gavel(); toast(msg);
}

/* ---------------- the Whip's Office section ---------------- */
HOOKS.office.push({
  html: () => {
    const f = wingOf(), P = S.president, yours = P.party === S.side, used = S.wingBattleUsed === S.career.bills, cap = S.career.capital;
    let h = '';
    if (!f && !IND()) h += `<hr><b>🦅 Your wing</b><p style="margin:6px 0"><button class="btn" id="wingpick" data-office-extra>Choose the wing of the party you champion</button></p>`;
    else if (f) {
      const ms = wingMembers(), L = wingLeader(), hs = wingHouse(), govs = wingGovs(), tgt = wingConvertTarget();
      if (ms.length >= 12) unlock('wing');
      h += `<hr><b>🦅 Your wing: the ${f}</b> <small style="color:var(--dim)">· ${ms.length} senator${ms.length === 1 ? '' : 's'}${L ? ` led by Sen. ${L.name}` : ''} · ${govs.length} governor${govs.length === 1 ? '' : 's'}${hs ? ` · ~${hs.seats} in the ${hs.name}` : ''} · PAC clout ${S.wingClout || 0}/5${S.wingRecruits ? ` · ${S.wingRecruits} recruit${S.wingRecruits > 1 ? 's' : ''} waiting for open seats` : ''}</small>
        <div class="shop sinks">
          <button class="btn" data-wing="recruit" ${cap < 2 || (S.wingRecruits || 0) >= 3 ? 'disabled' : ''}><span>Recruit candidates<small>The next open or flipped seat your party wins goes to a ${f} candidate. Bank up to three.</small></span><span class="cost">2 cap</span></button>
          <button class="btn" data-wing="convert" ${cap < 2 || !tgt || S.wingConvUsed === S.career.bills ? 'disabled' : ''}><span>Win a convert${tgt ? `: Sen. ${tgt.m.name} (${tgt.m.faction})` : ''}<small>${tgt ? `${Math.round(tgt.odds * 100)}% odds; if it fails they resent the pressure (−1 relationship).` : 'No colleague is open to it right now.'}</small></span><span class="cost">2 cap</span></button>
          <button class="btn" data-wing="pac" ${cap < 1 || (S.wingClout || 0) >= 5 ? 'disabled' : ''}><span>Fund the wing's PAC<small>Lifts ${f} candidates in the presidential primaries and protects your wing's senators.</small></span><span class="cost">1 cap</span></button>
          <button class="btn" id="wingswitch" data-office-extra ${cap < 3 ? 'disabled' : ''}><span>Switch wings<small>Your old wing will feel betrayed.</small></span><span class="cost">3 cap</span></button>
        </div>`;
    }
    const r = whRel(), cons = wingConsequences(), moves = wingBattleMoves();
    h += `<hr><b>${IND() ? '⚖️ The swing bloc and the White House' : yours ? '🗡️ You and the President' : '⚔️ Battle the White House'}</b> <small style="color:var(--dim)">· ${presTitle()} (${P.party}) at ${P.approval}% · relations: <b style="color:${r <= -4 ? 'var(--no)' : r >= 2 ? 'var(--yes)' : 'var(--gold2)'}">${wingFeudLabel(r)}</b> (${r > 0 ? '+' : ''}${r.toFixed(1)})</small>
      <div class="wing-meter"><i style="left:${(r + 10) * 5}%"></i></div>
      ${cons.length ? `<ul class="wing-cons">${cons.map(c => `<li>${c}</li>`).join('')}</ul>` : '<p style="font-size:12px;color:var(--dim);margin:4px 0">No feud to speak of. Every hostile move has a price: the President hits back.</p>'}
      <div class="shop sinks">${moves.map(([k, t, s, c, ok]) => `<button class="btn" data-battle="${k}" ${!ok || used || cap < c ? 'disabled' : ''}><span>${t}<small>${s}</small></span><span class="cost">${c} cap</span></button>`).join('')}</div>
      <p style="font-size:11px;color:var(--dim);margin:2px 0">One move between bills.${yours ? ' Leaks, slow-walking and recruiting a challenger (above) also deepen the feud.' : ''}</p>`;
    return h;
  },
  bind: draw => {
    const card = $('#modal-card'), c = S.career;
    if ($('#wingpick')) $('#wingpick').onclick = () => wingPickModal(draw);
    if ($('#wingswitch')) $('#wingswitch').onclick = () => { if (c.capital >= 3) wingPickModal(draw, true); };
    card.querySelectorAll('[data-wing]').forEach(b => b.onclick = () => {
      const k = b.dataset.wing, f = wingOf(); if (!f) return;
      if (k === 'recruit' && c.capital >= 2 && (S.wingRecruits || 0) < 3) { c.capital -= 2; S.wingRecruits = (S.wingRecruits || 0) + 1; toast(`A ${f} recruit is ready for the next open seat.`); }
      else if (k === 'pac' && c.capital >= 1 && (S.wingClout || 0) < 5) { c.capital -= 1; S.wingClout = (S.wingClout || 0) + 1; toast(`The ${f} PAC is flush.`); }
      else if (k === 'convert' && c.capital >= 2 && S.wingConvUsed !== c.bills) {
        const t = wingConvertTarget(); if (!t) return; c.capital -= 2; S.wingConvUsed = c.bills;
        if (Math.random() < t.odds) { const old = t.m.faction; t.m.faction = f; t.m.rel += 1; hist(t.m, `Left the ${old} for the ${f}`); assignBosses(); toast(`Sen. ${t.m.name} joins the ${f}!`); sfx.fanfare(); }
        else { t.m.rel -= 1; toast(`Sen. ${t.m.name} stays put, and didn't enjoy the pressure.`); sfx.down(); }
      } else return;
      sfx.click(); draw();
    });
    card.querySelectorAll('[data-battle]').forEach(b => b.onclick = () => { wingBattle(b.dataset.battle); draw(); });
  },
});

/* ---------------- between bills: the White House hits back ---------------- */
HOOKS.worldNews.push(() => {
  const P = S.president, out = [], yours = P.party === S.side;
  if (S.whPres !== P.name) { S.whPres = P.name; S.whRel = yours ? 1 : 0; S.whTargets = []; return out; }
  const r = whRel();
  S.whRel = Math.round(r * 0.85 * 10) / 10; // feuds cool slowly
  if (r >= 2 && !yours) { S.mood -= 0.2; }
  if (r <= -5 && yours) S.mood -= 0.3; // a party at war with its own President
  if (r > -3 || Math.random() > Math.min(0.6, 0.2 + 0.06 * (-r - 3))) return out;
  const upNext = S.members.filter(m => m.party === S.side && isUp(m)), mine = S.members.filter(m => m.party === S.side);
  const roll = Math.random();
  if (!yours) {
    if (roll < 0.35 && upNext.length) { const m = pick(upNext); m.rec -= 2; out.push(`🏗️ <b>The White House cancels a federal project in ${ST[m.state].name}</b>, two months after Sen. ${m.name} called the President "a disgrace." Sen. ${lastName(m)}'s re-election just got harder.`); }
    else if (roll < 0.65 && upNext.length) { const m = pick(upNext); S.whTargets = (S.whTargets || []).concat([{ id: m.id, year: electionYear(nextElectionK()) }]); out.push(`🎯 <b>${presTitle()} vows to campaign against Sen. ${m.name}</b> (${m.state}) personally. "The Senate's obstructionists will answer to the voters."`); }
    else if (roll < 0.9) { S.mood -= 0.4; const t = pick(TAGS); S.salience[t] = (S.salience[t] || 1) + 1; out.push(`🖋️ ${presTitle()} signs an executive order aimed squarely at your party's agenda on ${TAG[t][1].toLowerCase()}.`); }
    else { if (S.career.capital >= 2) S.career.capital -= 2; else S.career.confidence = Math.max(1, S.career.confidence - 1); out.push('🗞️ <b>The White House leaks oppo on the whip.</b> A week of bad stories costs you with your own caucus.'); }
  } else {
    if (roll < 0.35) { if (S.career.capital > 0) S.career.capital--; out.push(`🧊 <b>The White House freezes out the whip.</b> No calls returned, no seat at the table, no favors (−1 capital).`); }
    else if (roll < 0.65 && wingMembers().length) { const m = pick(wingMembers()); m.rec -= 1; S.whTargets = (S.whTargets || []).concat([{ id: m.id, year: electionYear(nextElectionK()) }]); out.push(`🗡️ <b>${presTitle()}'s allies recruit a primary challenger against Sen. ${m.name}</b>, a leader of your wing.`); }
    else if (roll < 0.9) { S.mood -= 0.6; out.push(`🔥 <b>A ${PARTY[S.side].name} civil war:</b> the President's allies and yours trade insults on every network. Your party's mood suffers.`); }
    else { S.career.confidence = Math.max(1, S.career.confidence - 1); out.push('🗞️ <b>The President\'s team leaks against the whip.</b> Your caucus wonders whose side you\'re on (−1 confidence).'); }
  }
  S.mood = clamp(S.mood, -15, 15);
  return out;
});
