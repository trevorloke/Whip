'use strict';
/* =====================================================================
   CAMPAIGN — the presidential general election: the battleground on the
   campaign trail and (to come) the fall campaign. Loaded after
   convention.js and before night.js.
   ===================================================================== */

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
