'use strict';
/* =====================================================================
   ART — the realistic US map renderer, the Capitol illustration,
   portraits, the newspaper front page and the chamber backdrop.
   ===================================================================== */

/* ---------------- the realistic map ---------------- */
// small states get labeled callout boxes out in the Atlantic
const CALLOUTS = ['VT', 'NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD', 'DC'];
const LABEL_AT = { FL: [818, 520], LA: [574, 466], MI: [688, 262], HI: [292, 578], ID: [210, 175], CA: [72, 292], NY: [826, 172], KY: [690, 318], WV: [760, 285], VA: [800, 302], NC: [790, 344], TN: [672, 350], ME: [915, 95], AK: [110, 520], OK: [470, 372], TX: [438, 468], MN: [520, 120], MS: [610, 430] };
function labelAt(code) { return LABEL_AT[code] || US_MAP[code].c; }
let mapSeq = 0;

// opts: fill(code) -> {c, c2?, op?} | null, sub(code) -> text, ring(code) -> stroke color, attr(code) -> extra attributes,
//       dim(code) -> bool, cls -> extra class, title(code) -> tooltip
function usMap(opts = {}) {
  const id = 'm' + (++mapSeq);
  const fillOf = c => (opts.fill && opts.fill(c)) || null;
  let defs = `<filter id="${id}sh" x="-5%" y="-5%" width="110%" height="115%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity=".55"/></filter>
    <linearGradient id="${id}sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#132036"/><stop offset="1" stop-color="#0c1424"/></linearGradient>
    <pattern id="${id}hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#2a3242"/><rect width="2" height="6" fill="#3a4458"/></pattern>`;
  let body = '', labels = '', callouts = '';
  for (const code of Object.keys(US_MAP)) {
    const s = US_MAP[code], f = fillOf(code);
    let fill = `url(#${id}hatch)`, op = 1;
    if (f) {
      op = f.op == null ? 1 : f.op;
      if (f.c2 && f.c2 !== f.c) {
        defs += `<linearGradient id="${id}g${code}" x1="0" y1="0" x2="1" y2="1"><stop offset=".5" stop-color="${f.c}"/><stop offset=".5" stop-color="${f.c2}"/></linearGradient>`;
        fill = `url(#${id}g${code})`;
      } else fill = f.c;
    }
    const dim = opts.dim && opts.dim(code), ring = opts.ring && opts.ring(code);
    const attr = opts.attr ? opts.attr(code) : '';
    body += `<path class="st ${attr ? 'hit' : ''}" d="${s.d}" fill="${fill}" fill-opacity="${dim ? op * 0.3 : op}" ${ring ? `style="stroke:${ring};stroke-width:2.5"` : ''} ${attr}><title>${opts.title ? opts.title(code) : stName(code)}</title></path>`;
    const sub = opts.sub ? opts.sub(code) : '';
    if (CALLOUTS.includes(code)) {
      const i = CALLOUTS.indexOf(code), bx = 918, by = 168 + i * 27;
      callouts += `<g class="callout" ${attr}><line x1="${s.c[0]}" y1="${s.c[1]}" x2="${bx}" y2="${by + 10}" stroke="#7d8aa3" stroke-width=".7" opacity=".7"/>
        <rect x="${bx}" y="${by}" width="${sub ? 74 : 40}" height="21" rx="4" fill="${fill}" fill-opacity="${dim ? op * 0.3 : op}" stroke="${ring || '#0b0f18'}" stroke-width="${ring ? 2.5 : 1}"/>
        <text x="${bx + 7}" y="${by + 15}" font-size="12" font-weight="800" fill="#fff" class="lbl">${code}</text>${sub ? `<text x="${bx + 30}" y="${by + 15}" font-size="10" font-weight="700" fill="#fff" class="lbl">${sub}</text>` : ''}</g>`;
    } else if (s.w >= 26 || code === 'HI') {
      const [x, y] = labelAt(code);
      labels += `<text x="${x}" y="${y + (sub ? -2 : 4)}" text-anchor="middle" font-size="${s.w > 60 ? 13 : 11}" font-weight="800" fill="#fff" class="lbl">${code}</text>${sub ? `<text x="${x}" y="${y + 12}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff" class="lbl">${sub}</text>` : ''}`;
    }
  }
  return `<svg viewBox="0 0 1000 610" class="usmap ${opts.cls || ''}"><defs>${defs}</defs>
    <rect width="1000" height="610" fill="url(#${id}sea)" rx="10"/>
    <g opacity=".08" stroke="#8fb3ff" stroke-width=".6">${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${60 + i * 65} Q500 ${30 + i * 65} 1000 ${60 + i * 65}" fill="none"/>`).join('')}</g>
    <path d="${US_OUTLINE}" fill="#0b0f18" stroke="#5b7299" stroke-width="3" opacity=".9" filter="url(#${id}sh)"/>
    ${body}
    <path d="${US_BORDERS}" fill="none" stroke="#0b0f18" stroke-width=".9" stroke-linejoin="round" pointer-events="none"/>
    <path d="${US_OUTLINE}" fill="none" stroke="#c9d6f0" stroke-width=".8" opacity=".35" pointer-events="none"/>
    <g pointer-events="none">${labels}</g>${callouts}
    <g opacity=".5" transform="translate(40,40)"><circle r="16" fill="none" stroke="#c9d6f0" stroke-width="1"/><path d="M0-14 L4 0 L0 14 L-4 0Z" fill="#c9d6f0"/><text y="-20" text-anchor="middle" font-size="9" fill="#c9d6f0" font-weight="700">N</text></g>
  </svg>`;
}

/* ---------------- the Capitol ---------------- */
function capitolSVG(mood = 'night') {
  const sky = { night: ['#060b1d', '#15254d', '#2b3f75'], dawn: ['#1b1f4a', '#7a4a7a', '#f2a65a'], storm: ['#0b0d12', '#1d2230', '#3a3f4f'] }[mood] || ['#060b1d', '#15254d', '#2b3f75'];
  const id = 'c' + (++mapSeq);
  const stars = mood === 'night' ? Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 600}" cy="${(i * 53) % 150}" r="${i % 3 ? 0.8 : 1.4}" fill="#fff" opacity="${0.3 + (i % 5) / 8}"/>`).join('') : '';
  const cols = (x0, n, gap, y, h, w = 5) => Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * gap}" y="${y}" width="${w}" height="${h}" fill="url(#${id}col)"/>`).join('');
  const wins = (x0, n, gap, y) => Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * gap}" y="${y}" width="6" height="9" rx="1" fill="#ffd27a" opacity="${0.55 + ((i * 7) % 5) / 10}"/>`).join('');
  return `<svg viewBox="0 0 600 300" class="capitol" preserveAspectRatio="xMidYMax slice"><defs>
    <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset=".6" stop-color="${sky[1]}"/><stop offset="1" stop-color="${sky[2]}"/></linearGradient>
    <linearGradient id="${id}stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4efe4"/><stop offset="1" stop-color="#b9b3a6"/></linearGradient>
    <linearGradient id="${id}col" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9d3c6"/><stop offset=".5" stop-color="#fffaf0"/><stop offset="1" stop-color="#c2bcae"/></linearGradient>
    <radialGradient id="${id}glow" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff6d8" stop-opacity=".35"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/></linearGradient></defs>
    <rect width="600" height="300" fill="url(#${id}sky)"/>${stars}
    ${mood === 'night' ? `<circle cx="520" cy="55" r="16" fill="#fdf6dc" opacity=".9"/><circle cx="527" cy="50" r="15" fill="${sky[0]}" opacity=".9"/>` : mood === 'dawn' ? '<circle cx="470" cy="250" r="40" fill="#ffd27a" opacity=".6"/>' : '<path d="M60 40 h140 a30 30 0 0 0 -30 -30 a40 40 0 0 0 -70 10 a25 25 0 0 0 -40 20z M330 70 h160 a30 30 0 0 0 -35 -32 a45 45 0 0 0 -80 8 a28 28 0 0 0 -45 24z" fill="#2c3242" opacity=".9"/>'}
    <path d="M180 300 L250 70 L262 70 L232 300Z M420 300 L350 70 L338 70 L368 300Z" fill="url(#${id}beam)"/>
    <ellipse cx="300" cy="190" rx="260" ry="90" fill="url(#${id}glow)"/>
    <!-- wings -->
    <rect x="40" y="205" width="200" height="60" fill="url(#${id}stone)"/><rect x="360" y="205" width="200" height="60" fill="url(#${id}stone)"/>
    <rect x="36" y="200" width="208" height="7" fill="#e9e3d6"/><rect x="356" y="200" width="208" height="7" fill="#e9e3d6"/>
    ${cols(52, 16, 12, 212, 46, 4)}${cols(372, 16, 12, 212, 46, 4)}
    <path d="M95 200 L140 182 L185 200Z M415 200 L460 182 L505 200Z" fill="#efe9dc" stroke="#cfc8b9"/>
    ${wins(50, 16, 12, 248)}${wins(370, 16, 12, 248)}
    <!-- center block -->
    <rect x="215" y="175" width="170" height="90" fill="url(#${id}stone)"/><rect x="210" y="170" width="180" height="8" fill="#e9e3d6"/>
    <path d="M240 170 L300 140 L360 170Z" fill="#f2ecdf" stroke="#cfc8b9"/>
    ${cols(232, 11, 13.5, 180, 70, 6)}
    <rect x="200" y="258" width="200" height="8" fill="#d8d2c4"/><rect x="190" y="266" width="220" height="8" fill="#cbc4b5"/><rect x="180" y="274" width="240" height="26" fill="#bdb6a6"/>
    <!-- dome -->
    <rect x="245" y="122" width="110" height="20" fill="url(#${id}stone)"/><rect x="240" y="118" width="120" height="6" fill="#efe9dc"/>
    <rect x="255" y="88" width="90" height="32" fill="url(#${id}stone)"/>${cols(259, 12, 7.3, 92, 26, 3.5)}
    <rect x="250" y="84" width="100" height="6" fill="#efe9dc"/>
    <path d="M258 84 C258 40 342 40 342 84Z" fill="url(#${id}stone)" stroke="#cfc8b9"/>
    <path d="M272 84 C274 54 290 47 300 46 M328 84 C326 54 310 47 300 46 M300 46 L300 84" stroke="#cfc8b9" fill="none" stroke-width="1.2"/>
    ${wins(268, 6, 11, 70)}
    <rect x="292" y="34" width="16" height="14" fill="#efe9dc"/><path d="M290 34 C290 26 310 26 310 34Z" fill="#efe9dc"/>
    <rect x="298.5" y="12" width="3" height="16" fill="#e8e2d4"/><circle cx="300" cy="12" r="3.5" fill="#e8e2d4"/>
    <!-- flag -->
    <line x1="300" y1="140" x2="300" y2="112" stroke="#ddd" stroke-width="1.2"/>
    <g transform="translate(301,112)"><rect width="18" height="11" fill="#b22234"/>${[1, 3, 5, 7, 9].map(y => `<rect y="${y * 1.1}" width="18" height="1.1" fill="#fff"/>`).join('')}<rect width="7.5" height="6" fill="#3c3b6e"/></g>
    <!-- trees -->
    ${[20, 70, 120, 480, 530, 580].map((x, i) => `<ellipse cx="${x}" cy="${280 - (i % 2) * 6}" rx="${26 + (i % 3) * 4}" ry="${22 + (i % 2) * 5}" fill="#0d1a14" opacity=".95"/>`).join('')}
    <rect y="292" width="600" height="8" fill="#0a1410"/>
  </svg>`;
}

/* ---------------- portraits ---------------- */
function portrait(m) {
  let s = m.seed || 1;
  const R = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const P = a => a[Math.floor(R() * a.length)];
  const id = 'p' + m.seed;
  const skin = P(['#f6dcc8', '#f1d0b5', '#e0b48f', '#c68e63', '#9c6a43', '#6e4a2e', '#4d3322']);
  const older = R() < 0.45;
  const hair = older && R() < 0.6 ? P(['#bdbdbd', '#d8d8d8', '#9a9a9a', '#e8e8e8']) : P(['#2b1d14', '#5a3a22', '#a26a32', '#d9b46a', '#1a1a1a', '#7b2e1e', '#3d2b1f']);
  const suit = P(['#1f2937', '#273449', '#3b2f2f', '#2d3a2e', '#4a4a52', '#1c2541', '#5b2333', '#2e2e3a']);
  const pc = PARTY[m.party].color;
  const style = Math.floor(R() * 9), neck = P(['tie', 'tie', 'tie', 'blouse', 'pearls', 'open', 'bow']);
  const glasses = R() < 0.32, beard = R() < 0.16, stache = !beard && R() < 0.14, earrings = R() < 0.25, smile = R();
  const browY = 43 + R() * 2, eyeGap = 9 + R() * 2;
  const hairBack = {
    3: `<path d="M22 46 Q20 16 50 15 Q80 16 78 46 L80 70 Q72 60 70 44 Q50 34 30 44 Q28 60 20 70Z" fill="${hair}"/>`,
    4: `<path d="M20 48 Q16 14 50 13 Q84 14 80 48 L84 88 Q74 80 72 50 Q50 38 28 50 Q26 80 16 88Z" fill="${hair}"/>`,
    5: `<circle cx="50" cy="16" r="10" fill="${hair}"/>`,
  }[style] || '';
  const hairFront = [
    `<path d="M24 42 Q24 18 50 17 Q76 18 76 42 Q66 28 50 28 Q34 28 24 42Z" fill="${hair}"/>`,
    `<path d="M23 44 Q22 16 52 16 Q78 18 77 42 Q64 26 44 30 Q30 32 23 44Z" fill="${hair}"/><path d="M44 30 Q40 22 52 18" stroke="#0003" fill="none"/>`,
    `<path d="M24 40 Q30 12 58 17 Q80 22 76 42 Q60 24 40 32 Q30 35 24 40Z" fill="${hair}"/>`,
    `<path d="M24 42 Q24 18 50 17 Q76 18 76 42 Q62 30 50 32 Q38 30 24 42Z" fill="${hair}"/>`,
    `<path d="M24 42 Q24 16 50 15 Q76 16 76 42 Q64 26 50 30 Q36 26 24 42Z" fill="${hair}"/>`,
    `<path d="M25 40 Q26 20 50 19 Q74 20 75 40 Q62 28 50 29 Q38 28 25 40Z" fill="${hair}"/>`,
    Array.from({ length: 11 }, (_, i) => `<circle cx="${27 + i * 4.6}" cy="${26 + Math.abs(5 - i) * 1.6}" r="6" fill="${hair}"/>`).join(''),
    `<path d="M24 46 Q22 30 30 28 L32 40Z M76 46 Q78 30 70 28 L68 40Z" fill="${hair}"/>`,
    `<path d="M25 44 Q24 22 40 22 Q50 26 60 22 Q76 22 75 44 Q70 32 62 32 Q50 34 38 32 Q30 32 25 44Z" fill="${hair}"/>`,
  ][style];
  const neckwear = {
    tie: `<path d="M50 74 L45 79 L50 100 L55 79Z" fill="${pc}"/><path d="M47 74 L53 74 L52 79 L48 79Z" fill="${pc}" filter="brightness(.8)"/>`,
    bow: `<path d="M42 76 L50 80 L42 84Z M58 76 L50 80 L58 84Z" fill="${pc}"/><circle cx="50" cy="80" r="2" fill="${pc}"/>`,
    blouse: `<path d="M40 72 Q50 86 60 72 L58 100 L42 100Z" fill="#f3f0ea"/>`,
    pearls: `<path d="M40 72 Q50 86 60 72 L58 100 L42 100Z" fill="${P(['#e9e4f0', '#f3e4e4', '#e4eef3'])}"/>${Array.from({ length: 9 }, (_, i) => `<circle cx="${41 + i * 2.25}" cy="${76 + Math.sin(i / 8 * Math.PI) * 5}" r="1.3" fill="#fff"/>`).join('')}`,
    open: `<path d="M43 73 L50 84 L57 73Z" fill="#f3f0ea"/>`,
  }[neck];
  return `<svg viewBox="0 0 100 100" class="portrait"><defs><radialGradient id="${id}bg" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="${pc}" stop-opacity=".55"/><stop offset="1" stop-color="#141925"/></radialGradient>
    <linearGradient id="${id}sk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${skin}"/><stop offset="1" stop-color="${skin}" stop-opacity=".82"/></linearGradient></defs>
    <rect width="100" height="100" fill="url(#${id}bg)"/>
    <g opacity=".18">${[0, 1, 2, 3, 4].map(i => `<rect x="${70 + i * 3}" y="0" width="1.5" height="100" fill="#fff"/>`).join('')}</g>
    ${hairBack}
    <path d="M10 100 Q12 76 40 72 L60 72 Q88 76 90 100Z" fill="${suit}"/>
    <path d="M40 72 L50 100 L33 100 Q30 84 36 74Z M60 72 L50 100 L67 100 Q70 84 64 74Z" fill="#0002"/>
    <rect x="43" y="62" width="14" height="13" fill="${skin}"/>
    ${neck === 'tie' || neck === 'bow' ? `<path d="M41 72 L50 82 L59 72 L57 100 L43 100Z" fill="#f6f4ef"/>` : ''}${neckwear}
    <rect x="28" y="84" width="6" height="4" fill="#b22234"/><rect x="28" y="84" width="2.5" height="2" fill="#3c3b6e"/><rect x="28" y="85.3" width="6" height=".7" fill="#fff"/>
    <ellipse cx="26" cy="49" rx="4" ry="6" fill="${skin}"/><ellipse cx="74" cy="49" rx="4" ry="6" fill="${skin}"/>
    ${earrings ? `<circle cx="26" cy="56" r="1.8" fill="#e3b54a"/><circle cx="74" cy="56" r="1.8" fill="#e3b54a"/>` : ''}
    <ellipse cx="50" cy="47" rx="24" ry="27" fill="url(#${id}sk)"/>
    ${older ? `<path d="M36 64 Q40 66 42 63 M64 64 Q60 66 58 63 M40 36 h20" stroke="#0002" fill="none"/>` : ''}
    <path d="M${50 - eyeGap - 5} ${browY} q5 -3 10 0 M${50 + eyeGap - 5} ${browY} q5 -3 10 0" stroke="${hair === '#e8e8e8' ? '#999' : hair}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="${50 - eyeGap}" cy="49" rx="3.6" ry="2.6" fill="#fff"/><ellipse cx="${50 + eyeGap}" cy="49" rx="3.6" ry="2.6" fill="#fff"/>
    <circle cx="${50 - eyeGap}" cy="49.3" r="1.9" fill="${P(['#3b2a1a', '#2a4a6a', '#3a5a3a', '#222'])}"/><circle cx="${50 + eyeGap}" cy="49.3" r="1.9" fill="#2b2b2b"/>
    <path d="M50 51 Q48 58 51 59" stroke="#0003" stroke-width="1.4" fill="none"/>
    ${beard ? `<path d="M28 52 Q30 78 50 79 Q70 78 72 52 Q66 66 50 66 Q34 66 28 52Z" fill="${hair}"/>` : ''}
    ${stache ? `<path d="M41 63 Q50 58 59 63 Q50 61 41 63Z" fill="${hair}" stroke="${hair}" stroke-width="2"/>` : ''}
    <path d="M43 66 Q50 ${66 + smile * 4} 57 66" stroke="#7a3b2b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${glasses ? `<g fill="none" stroke="#1a1a1a" stroke-width="1.6"><rect x="${50 - eyeGap - 6}" y="44.5" width="12" height="9" rx="3"/><rect x="${50 + eyeGap - 6}" y="44.5" width="12" height="9" rx="3"/><path d="M${50 - eyeGap + 6} 48 h${2 * eyeGap - 12}"/></g>` : ''}
    ${hairFront}
  </svg>`;
}

/* ---------------- the newspaper ---------------- */
function frontPage({ headline, sub, body = [], mood = 'night', date }) {
  const d = date || `${season(S.bill ? S.bill.n : 1)} ${S.bill ? billYear(S.bill.n) : 2027}`;
  return `<div class="paper">
    <div class="mast"><span>Vol. ${S.career ? S.career.bills + 1 : 1}</span><b>The Capitol Ledger</b><span>${d}</span></div>
    <div class="rule"></div>
    <h1 class="hl">${headline}</h1>${sub ? `<div class="dek">${sub}</div>` : ''}
    <div class="pbody"><div class="pimg">${capitolSVG(mood)}</div><div class="pcols">${body.map(t => `<p>${t}</p>`).join('')}</div></div>
  </div>`;
}

/* ---------------- the chamber backdrop ---------------- */
function chamberBackdrop() {
  const rows = [105, 140, 175, 210, 245];
  return `<defs><radialGradient id="carpet" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#26355e"/><stop offset=".7" stop-color="#18233f"/><stop offset="1" stop-color="#0f1628"/></radialGradient>
      <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5232"/><stop offset="1" stop-color="#4a2f1b"/></linearGradient>
      <pattern id="carpetpat" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M9 3 L10.5 7.5 L15 7.5 L11.3 10.2 L12.7 14.7 L9 12 L5.3 14.7 L6.7 10.2 L3 7.5 L7.5 7.5Z" fill="#e3b54a" opacity=".07"/></pattern></defs>
    <path d="M-280 20 A280 280 0 0 1 280 20 Z" fill="url(#carpet)"/><path d="M-280 20 A280 280 0 0 1 280 20 Z" fill="url(#carpetpat)"/>
    ${rows.map(r => `<path d="M${-r - 14} 18 A${r + 14} ${r + 14} 0 0 1 ${r + 14} 18" fill="none" stroke="url(#wood)" stroke-width="20" opacity=".55"/>`).join('')}
    <path d="M-268 20 A268 268 0 0 1 268 20" fill="none" stroke="#e3b54a" stroke-width="1.2" opacity=".35"/>
    <rect x="-92" y="-2" width="184" height="26" rx="5" fill="url(#wood)" stroke="#e3b54a" stroke-opacity=".45"/>
    <circle cx="0" cy="-60" r="24" fill="#1b2747" stroke="#e3b54a" stroke-width="2"/><circle cx="0" cy="-60" r="18" fill="none" stroke="#e3b54a" stroke-opacity=".5" stroke-dasharray="2 3"/>
    <path d="M0 -71 L3.2 -62.5 L12 -62.5 L5 -57.3 L7.7 -49 L0 -54 L-7.7 -49 L-5 -57.3 L-12 -62.5 L-3.2 -62.5Z" fill="#e3b54a"/>`;
}
