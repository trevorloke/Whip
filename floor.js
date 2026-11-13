'use strict';
/* =====================================================================
   FLOOR — the Docket: what comes to the floor next, who controls it,
   and which bills your caucus wants passed or killed. Loaded after
   world.js.
   ===================================================================== */

/* ---------------- the docket: what comes to the floor next ---------------- */
function forcedNext(n) {
  if (n % 3 === 0) return 'The yearly budget';
  if (S.pendingAUMF) return `War vote: Authorization for Use of Military Force in ${S.pendingAUMF}`;
  if (S.docket && S.docket.forced) return `${S.docket.name}, forced onto the floor by a bipartisan bloc`;
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
