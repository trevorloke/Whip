'use strict';
/* =====================================================================
   FLOOR FIGHT — a US Senate whip game.
   You are your party's whip in the 100-seat United States Senate.
   Senators are fictional; states, seat counts and the election
   calendar are real.
   ===================================================================== */

const $ = s => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sgn = v => v > 0 ? 1 : v < 0 ? -1 : 0;
const fmt = v => (v > 0 ? '+' : '') + Math.round(v);

/* ---------------- issues ---------------- */
const TAGS = ['economy', 'environment', 'security', 'welfare', 'rural', 'urban', 'taxes', 'tech'];
const TAG = {
  economy: ['🏭', 'Jobs & Industry'], environment: ['🌲', 'Climate'], security: ['🛡', 'Defense & Border'],
  welfare: ['🏥', 'Healthcare & Safety Net'], rural: ['🌾', 'Farm Country'], urban: ['🏙', 'Cities & Housing'],
  taxes: ['💵', 'Tax Cuts'], tech: ['💡', 'Tech & Science'],
};

/* ---------------- parties ---------------- */
const PARTY = {
  D: { name: 'Democratic', short: 'Democrats', color: '#3b82f6', prior: { environment: 1.1, welfare: 1.2, urban: 0.8, tech: 0.5, taxes: -0.8, security: -0.2 } },
  R: { name: 'Republican', short: 'Republicans', color: '#ef4444', prior: { taxes: 1.3, security: 1.1, rural: 1, economy: 0.7, environment: -1, welfare: -0.7, urban: -0.4 } },
  I: { name: 'Independent', short: 'Independents', color: '#a78bfa', prior: {} },
};
const FACTIONS = {
  D: [['Progressives', { welfare: 1, environment: 1, urban: 0.5, taxes: -0.6, security: -0.5 }], ['New Democrats', { tech: 1, economy: 0.6, taxes: 0.3 }], ['Labor Democrats', { economy: 1, welfare: 0.8, environment: -0.4 }], ['Blue Dogs', { security: 0.8, taxes: 0.6, rural: 0.6, environment: -0.5 }]],
  R: [['Freedom Caucus', { taxes: 1.4, welfare: -1, security: 0.5 }], ['Establishment', { economy: 1, security: 0.8, tech: 0.4 }], ['Populists', { rural: 1, welfare: 0.5, economy: 0.5, tech: -0.6 }], ['GOP Moderates', { environment: 0.6, welfare: 0.5, taxes: -0.3 }]],
  I: [['Independents', {}]],
};
const MODERATE = { D: 'Blue Dogs', R: 'GOP Moderates' };

/* ---------------- states ---------------- */
// code, name, partisan lean (positive = Republican, approx.), local issues
// issue letters: f farm, e energy, t tech, u urban, b border/defense, g green, m manufacturing, h healthcare, x low-tax
const STATES = [
  ['AL', 'Alabama', 15, 'bf'], ['AK', 'Alaska', 8, 'e'], ['AZ', 'Arizona', 2, 'bt'], ['AR', 'Arkansas', 16, 'f'],
  ['CA', 'California', -13, 'tgu'], ['CO', 'Colorado', -4, 'gt'], ['CT', 'Connecticut', -7, 'uh'], ['DE', 'Delaware', -7, 'u'],
  ['FL', 'Florida', 5, 'xh'], ['GA', 'Georgia', 3, 'bu'], ['HI', 'Hawaii', -15, 'g'], ['ID', 'Idaho', 19, 'fx'],
  ['IL', 'Illinois', -7, 'um'], ['IN', 'Indiana', 11, 'm'], ['IA', 'Iowa', 6, 'f'], ['KS', 'Kansas', 10, 'f'],
  ['KY', 'Kentucky', 16, 'eh'], ['LA', 'Louisiana', 12, 'e'], ['ME', 'Maine', -2, 'gh'], ['MD', 'Maryland', -14, 'ub'],
  ['MA', 'Massachusetts', -15, 'tu'], ['MI', 'Michigan', 0, 'm'], ['MN', 'Minnesota', -3, 'fm'], ['MS', 'Mississippi', 11, 'fh'],
  ['MO', 'Missouri', 10, 'fm'], ['MT', 'Montana', 11, 'fe'], ['NE', 'Nebraska', 10, 'f'], ['NV', 'Nevada', 1, 'ub'],
  ['NH', 'New Hampshire', -1, 'x'], ['NJ', 'New Jersey', -5, 'u'], ['NM', 'New Mexico', -3, 'be'], ['NY', 'New York', -8, 'ut'],
  ['NC', 'North Carolina', 3, 'tb'], ['ND', 'North Dakota', 20, 'fe'], ['OH', 'Ohio', 6, 'm'], ['OK', 'Oklahoma', 17, 'ef'],
  ['OR', 'Oregon', -6, 'g'], ['PA', 'Pennsylvania', 2, 'me'], ['RI', 'Rhode Island', -8, 'u'], ['SC', 'South Carolina', 8, 'bx'],
  ['SD', 'South Dakota', 16, 'f'], ['TN', 'Tennessee', 14, 'x'], ['TX', 'Texas', 6, 'ebx'], ['UT', 'Utah', 11, 'tx'],
  ['VT', 'Vermont', -15, 'gh'], ['VA', 'Virginia', -2, 'bt'], ['WA', 'Washington', -8, 'tg'], ['WV', 'West Virginia', 22, 'eh'],
  ['WI', 'Wisconsin', 2, 'fm'], ['WY', 'Wyoming', 23, 'ex'],
];
const ISSUE = { f: { rural: 1.2 }, e: { environment: -1, economy: 0.5 }, t: { tech: 1 }, u: { urban: 1 }, b: { security: 1 }, g: { environment: 1 }, m: { economy: 1, welfare: 0.3 }, h: { welfare: 1 }, x: { taxes: 1 } };
const ST = {};
for (const [code, name, lean, iss] of STATES) {
  const voter = {};
  const lp = lean > 0 ? PARTY.R.prior : PARTY.D.prior;
  for (const t of TAGS) voter[t] = (Math.abs(lean) / 15) * (lp[t] || 0);
  for (const ch of iss) for (const [t, v] of Object.entries(ISSUE[ch])) voter[t] += v;
  for (const t of TAGS) voter[t] = clamp(voter[t], -2, 2);
  ST[code] = { code, name, lean, voter };
}
const leanLabel = l => l === 0 ? 'EVEN' : (l > 0 ? 'R+' : 'D+') + Math.abs(l);
// tile-grid map of the US: [code, col, row]
const TILES = [['AK', 0, 0], ['ME', 10, 0], ['VT', 9, 1], ['NH', 10, 1],
  ['WA', 0, 2], ['ID', 1, 2], ['MT', 2, 2], ['ND', 3, 2], ['MN', 4, 2], ['IL', 5, 2], ['WI', 6, 2], ['MI', 7, 2], ['NY', 8, 2], ['RI', 9, 2], ['MA', 10, 2],
  ['OR', 0, 3], ['NV', 1, 3], ['WY', 2, 3], ['SD', 3, 3], ['IA', 4, 3], ['IN', 5, 3], ['OH', 6, 3], ['PA', 7, 3], ['NJ', 8, 3], ['CT', 9, 3],
  ['CA', 0, 4], ['UT', 1, 4], ['CO', 2, 4], ['NE', 3, 4], ['MO', 4, 4], ['KY', 5, 4], ['WV', 6, 4], ['VA', 7, 4], ['MD', 8, 4], ['DE', 9, 4],
  ['AZ', 1, 5], ['NM', 2, 5], ['KS', 3, 5], ['AR', 4, 5], ['TN', 5, 5], ['NC', 6, 5], ['SC', 7, 5],
  ['OK', 3, 6], ['LA', 4, 6], ['MS', 5, 6], ['AL', 6, 6], ['GA', 7, 6],
  ['HI', 0, 7], ['TX', 3, 7], ['FL', 8, 7]];

/* ---------------- traits ---------------- */
const TRAITS = {
  greedy: ['Pork-Hungry', 'Earmarks work twice as well.'],
  principled: ['Principled', 'Pitches hit 50% harder. Earmarks offend them.'],
  vain: ['Camera-Hungry', 'Photo ops work wonders.'],
  thin: ['Thin-Skinned', 'Arm-twisting backfires.'],
  swing: ['Swing State', 'Follows public opinion closely.'],
  loyal: ['Party Loyalist', 'Votes the party line; the rival can barely move them.'],
  ambitious: ['Eyeing the White House', 'Promised favors work 50% better.'],
  fickle: ['Fickle', 'Support drifts randomly every day.'],
  shady: ['Skeletons', 'There is dirt on them, if you dig.'],
  leader: ['Faction Leader', 'Their stance pulls every senator in their faction, and fence-sitters follow their vote.'],
};
const TRAIT_POOL = ['greedy', 'principled', 'vain', 'thin', 'loyal', 'ambitious', 'fickle', 'shady'];

const FIRST = ['Ada', 'Brett', 'Celia', 'Dalton', 'Edie', 'Felix', 'Greta', 'Hollis', 'Ines', 'Jasper', 'Kit', 'Lorna', 'Milo', 'Nell', 'Otis', 'Pia', 'Quinn', 'Rosa', 'Silas', 'Tamsin', 'Wade', 'Vida', 'Wren', 'Xavier', 'Yara', 'Zeke', 'Beatrix', 'Cormac', 'Delphine', 'Emmett', 'Faye', 'Gideon', 'Hattie', 'Ivan', 'Juno', 'Lucas', 'Marisol', 'Noor', 'Opal', 'Percy', 'Ruth', 'Theo', 'Dolores', 'Buck', 'Corinne', 'Marcus', 'Lila', 'Raymond', 'Shea', 'Tobias', 'Abel', 'Imani', 'Hank', 'Priya'];
const LAST = ['Ashgrove', 'Bellweather', 'Crane', 'Dunmore', 'Ellery', 'Fairbank', 'Gallow', 'Harrow', 'Ingle', 'Jessop', 'Kettle', 'Larkspur', 'Mallory', 'Nettles', 'Oakhurst', 'Pell', 'Quill', 'Rookwood', 'Sallow', 'Thistle', 'Underhill', 'Vance-Hollow', 'Whitlock', 'Yarrow', 'Brindle', 'Copperfield', 'Drummond', 'Fenwick', 'Greaves', 'Hobb', 'Lockhart', 'Marsh', 'Pennywhistle', 'Redfern', 'Stroud', 'Tolliver', 'Wick', 'Blackwood', 'Cassidy', 'Delacroix', 'Eberly', 'Gutierrez-Lane', 'Haverford', 'Kincaid', 'Lomax', 'McAllister', 'Okafor', 'Pruitt', 'Quintero', 'Sandoval', 'Tremblay', 'Vasquez-Moore', 'Whitaker', 'Yoder'];

/* ---------------- bills ---------------- */
const AGENDA = {
  D: [
    ['Clean Energy Jobs Act', 'Tax credits for wind, solar and the factories that build them.', { environment: 3, economy: 1, taxes: -1, rural: -1 }],
    ['Child Tax Credit Expansion', 'Monthly checks for working families.', { welfare: 3, taxes: -1, economy: 1 }],
    ['Prescription Drug Price Act', 'Let Medicare negotiate the price of every drug.', { welfare: 3, tech: -1, economy: -1 }],
    ['Affordable Housing Act', 'A million new homes in ten years.', { urban: 3, welfare: 1, taxes: -1 }],
    ['Paid Family Leave Act', '12 weeks of paid leave for every new parent.', { welfare: 2, economy: -1, urban: 1 }],
    ['Universal Pre-K Act', 'Free preschool for every four-year-old.', { welfare: 2, taxes: -2, urban: 1, economy: 1 }],
    ['Minimum Wage Raise Act', 'A higher federal floor, phased in.', { welfare: 2, economy: -2, urban: 1 }],
    ['Rail & Transit Modernization Act', 'High-speed rail and better buses.', { urban: 2, environment: 2, taxes: -1 }],
  ],
  R: [
    ['Tax Relief Extension Act', 'Make the tax cuts permanent.', { taxes: 3, welfare: -1, economy: 1 }],
    ['Secure the Border Act', 'More agents, more barriers, faster removals.', { security: 3, taxes: -1, welfare: -1 }],
    ['American Energy Independence Act', 'Drill, mine and pipe it at home.', { economy: 2, environment: -3, rural: 1 }],
    ['Regulatory Rollback Act', 'Every new rule must kill two old ones.', { economy: 2, environment: -2, tech: 1 }],
    ['Defense Readiness Act', 'Ships, jets and a bigger cyber command.', { security: 3, taxes: -1, tech: 1 }],
    ['Small Business Freedom Act', 'Lower rates and less paperwork for Main Street.', { economy: 2, taxes: 2, welfare: -1 }],
    ['Heartland Prosperity Act', 'Tax breaks and new markets for farm country.', { rural: 3, taxes: 1, environment: -1 }],
    ['Parents\' Choice in Education Act', 'Let school funding follow the student.', { taxes: 1, welfare: -1, rural: 1, urban: -1 }],
  ],
  both: [
    ['Infrastructure Renewal Act', 'Roads, bridges, pipes and ports.', { economy: 2, rural: 1, urban: 1, taxes: -2 }],
    ['Chips & Science Act II', 'Bring semiconductor plants home.', { tech: 3, economy: 2, taxes: -1 }],
    ['Farm Bill Reauthorization', 'Crop insurance, conservation and food aid.', { rural: 3, welfare: 1, taxes: -1 }],
    ['Rural Broadband Act', 'High-speed internet for every county.', { rural: 2, tech: 2, taxes: -1 }],
    ['Opioid Crisis Response Act', 'Treatment beds and fentanyl interdiction.', { welfare: 2, security: 1, rural: 1, taxes: -1 }],
    ['Veterans Care Act', 'Faster care, closer to home.', { welfare: 2, security: 2, taxes: -1 }],
  ],
};
const LANDMARKS = {
  D: [['Medicare Expansion Act', 'Lower the Medicare age to 55. Needs 60 votes to beat the filibuster.', 60, { welfare: 4, taxes: -2, economy: -1 }],
    ['Climate Future Act', 'A national clean-power standard. Needs 60 for cloture.', 60, { environment: 4, economy: 1, rural: -1, taxes: -1 }]],
  R: [['Balanced Budget Act', 'Cap spending until the books balance. Needs 60 for cloture.', 60, { taxes: 2, welfare: -3, security: 1 }],
    ['Border & Asylum Reform Act', 'The biggest immigration overhaul in decades. Needs 60.', 60, { security: 4, taxes: -1, urban: -1 }]],
  both: [['Government Funding Deadline', 'Pass a funding bill or the government shuts down. Needs 60 for cloture.', 60, { economy: 2, security: 1, welfare: 1, taxes: -1 }],
    ['Pacific Trade Treaty Ratification', 'Treaties need two-thirds of the Senate: 67 votes.', 67, { economy: 3, tech: 1, rural: 1, welfare: -1 }]],
};
const AMENDMENTS = [
  ['Farm-State Exemption', { rural: 2, environment: -1 }],
  ['Sunset Provision', { taxes: 1, welfare: -1 }],
  ['Buy American Rider', { economy: 2, taxes: -1 }],
  ['Emissions Guardrails', { environment: 2, economy: -1 }],
  ['Border Security Rider', { security: 2, welfare: -1 }],
  ['Pay-For Offsets', { taxes: 2, welfare: -1 }],
  ['Research Grants', { tech: 2, taxes: -1 }],
  ['Urban Set-Aside', { urban: 2, rural: -1 }],
  ['Rural Set-Aside', { rural: 2, urban: -1 }],
  ['Medicaid Top-Up', { welfare: 2, taxes: -1 }],
  ['Inspector General Oversight', { taxes: 1, tech: -1, security: 1 }],
  ['Prevailing Wage Rule', { economy: 1, welfare: 1, taxes: -1 }],
];

const PERKS = {
  chief: ['Chief of Staff', '+1 action every day.', 6],
  intern: ['Intern Army', 'Your first Sound Out each day is free.', 3],
  pollster: ['Pollster', 'See every senator\'s rough leaning at the start of each bill.', 5],
  bagman: ['Appropriations Ally', 'Earmarks cost $14M instead of $20M and draw half the scrutiny.', 4],
  spin: ['Comms Director', 'Public opinion starts +8. Media blitzes are stronger.', 4],
  oppo: ['Oppo Researcher', 'Sound Out always uncovers skeletons.', 4],
  floor: ['Cloakroom Manager', 'Senators on the fence break your way more often.', 5],
  speech: ['Speechwriter', 'Pitches are 40% stronger.', 5],
  treasurer: ['Leadership PAC', '+$30M earmark budget per bill, and +2 campaign cash every election.', 4],
  mole: ['Mole Across the Aisle', 'The opposing whip makes one fewer move each night.', 6],
  fixer: ['Fixer', 'Twisting arms no longer costs capital.', 5],
  pollmap: ['Data Shop', 'Election previews show exact margins, and campaign cash goes 50% further.', 5],
};
const RANKS = [[0, 'Deputy Whip'], [3, 'Chief Deputy Whip'], [7, 'Whip'], [12, 'Assistant Leader'], [20, 'Floor Leader'], [30, 'Master of the Senate'], [45, 'Legend of the Chamber']];
const RIVAL_FIRST = ['Vera', 'Magnus', 'Odile', 'Rex', 'Harlan', 'Constance'];

const LINES = {
  up: ['You make a fair point.', 'Now we\'re talking.', 'My state will like that.', 'Fine. I\'m listening.', 'I may have misjudged this bill.', 'Keep going…', 'That actually helps.'],
  bigup: ['Count me in. Probably.', 'Why didn\'t you lead with that?', 'Consider me persuaded.', 'Now THAT is a bill.'],
  down: ['That\'s the worst pitch I\'ve heard all session.', 'They\'d run me out of my state.', 'Hard pass.', 'Are you even listening to me?', 'You\'re losing me.'],
  angry: ['Are you threatening a United States Senator?', 'Get out of my office.', 'You\'ll regret that.', 'I have a long memory.'],
  meh: ['Hm.', 'Noted.', 'I\'ll sleep on it.', 'Is that everything?'],
  pork: ['A new bridge? With my name on it? Go on…', 'My state does need a new VA hospital.', 'You speak my language.'],
  porkno: ['Are you trying to BUY me?', 'Keep your earmarks.', 'I don\'t do deals like that.'],
  vain: ['Get my good side.', 'Is that the Sunday show booker?', 'Oh, they\'ll love this back home.'],
};

/* ---------------- state ---------------- */
let S = null;
// extension registries: later files push into these (see SPEC in the repo history / each module's header)
//  office:    { html: () => string, button: () => string, bind: draw => void }   sections and footer buttons in the Whip's Office
//  interlude: () => Array<next => void>                                           extra steps between bills (each must call next())
//  worldNews: () => string[]                                                      extra news lines between bills (may set S flags)
//  results:   { html: nightData => string, bind: (nightData, back) => void }     buttons on the morning-after election summary
const HOOKS = { office: [], interlude: [], worldNews: [], results: [] };
let ui = { sel: null, pitchOpen: false, lastQuote: '', lastDelta: null, view: 'chamber' };

const other = p => p === 'D' ? 'R' : 'D';
function side(m) { return m.party === S.side ? 'you' : m.party === 'I' ? 'ind' : 'opp'; }
function tagOf(m) { return `${m.party}-${m.state}`; }
function sen(m) { return `Sen. ${m.name} (${tagOf(m)})`; }
function lastName(m) { return m.name.split(' ').slice(1).join(' '); }
function seats(p) { return S.members.filter(m => m.party === p).length; }
function isMajority() { return seats(S.side) > seats(other(S.side)); }
function vpYours() { return S.president.party === S.side; }

/* ---------------- calendar & elections ---------------- */
function billYear(n) { return 2027 + Math.floor((n - 1) / 3); }
function season(n) { return ['Spring', 'Summer', 'Fall'][(n - 1) % 3]; }
function nextElectionK() { return Math.floor(S.career.bills / 6) + 1; }
function electionYear(k) { return 2026 + 2 * k; }
function classUp(k) { return [3, 1, 2][(k - 1) % 3]; }
function isPresYear(k) { return electionYear(k) % 4 === 0; }
function isUp(m) { return m.cls === classUp(nextElectionK()); }
function stateFit(code, fx) { let s = 0; for (const t of TAGS) s += ST[code].voter[t] * (fx[t] || 0); return s; }

function nameUsed(n) { return S.members.some(m => m && m.name === n); }
function newSenator(party, state, cls, id, forceFaction) {
  const pp = newPerson(party, state); const name = pp.name;
  const st = ST[state];
  const adv = party === 'R' ? st.lean : party === 'D' ? -st.lean : 0;
  let faction;
  if (forceFaction) faction = forceFaction;
  else if (party === 'I') faction = 'Independents';
  else if (adv < 0 || (adv < 4 && Math.random() < 0.5)) faction = MODERATE[party];
  else faction = pick(FACTIONS[party].filter(f => f[0] !== MODERATE[party]))[0];
  const fx = FACTIONS[party].find(f => f[0] === faction)[1];
  const w = {};
  for (const t of TAGS) w[t] = clamp(0.8 * (PARTY[party].prior[t] || 0) + (fx[t] || 0) + 0.5 * st.voter[t] + rnd(-0.6, 0.6) + (party === 'I' ? rnd(-0.8, 0.8) : 0), -2, 2);
  const traits = [];
  const n = Math.random() < 0.55 ? 2 : 1;
  while (traits.length < n) { const t = pick(TRAIT_POOL); if (party === 'I' && t === 'loyal') continue; if (!traits.includes(t) && !(t === 'principled' && traits.includes('greedy')) && !(t === 'greedy' && traits.includes('principled'))) traits.push(t); }
  if (Math.abs(st.lean) <= 5 || party === 'I') traits.push('swing');
  return { id, name, gender: pp.gender, born: pp.born, background: pp.background, hometown: pp.hometown, history: [], party, faction, state, cls, w, traits, knownTraits: false, rel: 0, grudge: false, iou: false, dirt: false, rec: 0, defy: 0, cause: party === 'I' ? pick(IND_CAUSES) : null, seed: Math.random() * 1e9 | 0, b: null };
}

function assignBosses() {
  for (const p of ['D', 'R']) for (const [f] of FACTIONS[p]) {
    const ms = S.members.filter(m => m.party === p && m.faction === f);
    if (ms.length && !ms.some(m => m.traits.includes('leader'))) pick(ms).traits.push('leader');
  }
}

function buildSenate() {
  S.members = [];
  const pairs = [[1, 2], [1, 3], [2, 3]];
  const parties = [];
  STATES.forEach(([code, , lean], i) => {
    for (const cls of pairs[i % 3]) {
      const pR = 1 / (1 + Math.exp(-lean / 3.5));
      parties.push({ code, cls, lean, p: Math.random() < pR ? 'R' : 'D' });
    }
  });
  // you start with a narrow 51-seat majority
  const mine = S.side;
  const adv = o => (mine === 'R' ? o.lean : -o.lean);
  let count = parties.filter(o => o.p === mine).length;
  const byFriendly = parties.slice().sort((a, b) => adv(b) - adv(a));
  while (count < 51) { const o = byFriendly.find(o => o.p !== mine); o.p = mine; count++; }
  while (count > 51) { const o = byFriendly.slice().reverse().find(o => o.p === mine); o.p = other(mine); count--; }
  // two independents, from the other side, in competitive states
  shuffle(parties.filter(o => o.p !== mine && Math.abs(o.lean) <= 8)).slice(0, 2).forEach(o => o.p = 'I');
  parties.forEach((o, i) => {
    const m = newSenator(o.p, o.code, o.cls, i);
    // senators were last elected in their class's cycle: 2024 (class 1), 2026 (class 2), 2022 (class 3)
    const last = { 1: 2024, 2: 2026, 3: 2022 }[o.cls], terms = ri(0, 2);
    senatorBackstory(m, last - terms * 6);
    for (let t = 1; t <= terms; t++) hist(m, `Re-elected to the U.S. Senate`, last - (terms - t) * 6);
    hist(m, `Joined the ${m.faction}`, last - terms * 6);
    S.members.push(m);
  });
  assignBosses();
  layoutSeats();
}

function newCareer(sidePick) {
  S = {
    side: sidePick, mood: 0, president: null, house: null, court: [], laws: [], nominee: null, vacancyBlocked: false,
    career: { bills: 0, wins: 0, losses: 0, streak: 0, best: 0, capital: 5, confidence: 5, perks: [] },
    rival: pick(RIVAL_FIRST) + ' ' + pick(LAST), members: [], log: [], history: [],
  };
  S.president = newPresident(sidePick);
  S.prep = {}; S.warchest = 0; S.approps = 0; S.shutdown = 0;
  S.houseLeaders = makeHouseLeaders();
  S.house = { [sidePick]: ri(220, 226) }; S.house[other(sidePick)] = 435 - S.house[sidePick];
  S.court = buildCourt();
  buildSenate();
  buildWorld();
  startBill();
}

/* ---------------- support model ---------------- */
function has(p) { return S.career.perks.includes(p); }
function T(m, t) { return m.traits.includes(t); }

function baseSupport(m) {
  const B = S.bill;
  let s = 0;
  for (const t of TAGS) s += m.w[t] * (B.fx[t] || 0) * 6;
  const loyal = T(m, 'loyal') ? 1.7 : 1;
  const sd = side(m);
  if (sd === 'you') s += 16 * loyal;
  if (sd === 'opp') s -= 16 * loyal;
  s += m.rel * 6;
  if (m.grudge) s -= 15;
  s += (B.opinion - 50) * (T(m, 'swing') ? 0.6 : 0.15);
  if (isUp(m)) s += clamp(stateFit(m.state, B.fx) * 2.5, -18, 18);
  // a popular President keeps their own party in line
  if (m.party === S.president.party) { const ap = (S.president.approval - 50) * 0.2 * (m.faction === S.president.faction ? 2 : 1); s += S.president.party === S.side ? ap : -ap; }
  if (has('beloved')) s += 4;
  if (has('constit') && isUp(m)) s += 6;
  return s + m.b.mood;
}
function rawSupport(m) { return baseSupport(m) + m.b.bonus; }
// every faction has a leader; members are pulled toward wherever their leader stands
function leaderOf(m) { return m.party === 'I' ? null : S.members.find(x => x !== m && x.party === m.party && x.faction === m.faction && T(x, 'leader')) || null; }
function pullK() { return has('kingmaker') ? 0.5 : 0.3; }
function leaderStance(L) { return clamp(rawSupport(L), -40, 40); }
// members follow how far their leader has moved since the bill came up (where the leader started is already priced in)
function leaderPull(m) {
  const L = leaderOf(m);
  if (!L || L.b.absent || L.b.start == null) return 0;
  return pullK() * (leaderStance(L) - L.b.start) + (isLockedYes(L) ? 2 : 0);
}
function support(m) { return clamp(rawSupport(m) + leaderPull(m), -100, 100); }
function factionOf(L) { return S.members.filter(x => x !== L && x.party === L.party && x.faction === L.faction); }
function isLockedYes(m) { return m.b.pledged || m.b.blackmailed; }
function needText() {
  const B = S.bill;
  if (B.super) return `${B.super} votes`;
  return vpYours() ? '50 + VP' : '51 votes';
}
function needNum() { const B = S.bill; return B.super || (vpYours() ? 50 : 51); }

function startBill() {
  const c = S.career;
  S.election = null; // the election is over once the next bill starts; presSetup() must not read last cycle's wave at the next conventions
  const n = c.bills + 1;
  let landmark = n % 5 === 0;
  let tpl, sup = 0, nomination = false, budget = false, aumf = null, wpr = false;
  if (n % 3 === 0) {
    budget = true; landmark = false;
    tpl = [`FY${billYear(n) + 1} Budget`, 'The yearly budget, passed through reconciliation: no filibuster, a simple majority. You set its priorities. If it fails anywhere, the government shuts down.', { economy: 1, security: 1, welfare: 1, taxes: -1 }];
  } else if (S.pendingAUMF || S.docket) {
    const d = docketTemplate(n); tpl = d.tpl; landmark = false;
    if (d.aumf) { aumf = d.aumf; }
    if (d.wpr) wpr = true;
  } else if (S.nominee && S.president.party === S.side && S.court.length < 9) {
    nomination = true; landmark = false;
    const pr = PARTY[S.side].prior, fx = {};
    const mod = 1 / (1 + (S.nominee.tries || 0));
    TAGS.slice().sort((a, b) => Math.abs(pr[b] || 0) - Math.abs(pr[a] || 0)).slice(0, 3).forEach(t => fx[t] = Math.round((pr[t] || 0) * 2 * mod) || Math.sign(pr[t] || 0));
    tpl = [`Confirmation of Judge ${S.nominee.name}`, `${presTitle()}'s nominee for the Supreme Court. No filibuster: a simple majority confirms. The other side calls the nominee an extremist.`, fx];
  } else if (landmark && !S.docket) { const l = pick(LANDMARKS[S.side].concat(LANDMARKS.both)); tpl = [l[0], l[1], l[3]]; sup = l[2]; }
  else {
    // divided government pushes the agenda toward deals
    const divided = S.president.party !== S.side || houseMaj() !== S.side;
    const src = divided && Math.random() < 0.55 ? AGENDA.both : AGENDA[S.side].concat(AGENDA.both);
    tpl = pick(src.filter(b => !(S.bill && b[0] === S.bill.name)));
  }
  const amends = shuffle(AMENDMENTS.slice()).slice(0, has('parl') ? 6 : 4).map(a => ({ name: a[0], fx: a[1], used: false }));
  S.bill = {
    n, name: tpl[0], blurb: tpl[1], fx: { ...tpl[2] }, landmark, super: sup, amends: nomination ? [] : amends, applied: [], nomination, budget, aumf, wpr, houseWork: 0, hw: {}, softened: false, presCalls: 0, override: false, handsDay: 0, plan: null,
    day: 1, days: 5 + (has('scheduler') ? 1 : 0) + (S.prep.days || 0), delayed: false, ap: 0, apMax: 6 + (has('chief') ? 1 : 0) + (has('workhorse') ? 1 : 0),
    pork: (S.shutdown > 0 ? 0 : 60) + (has('treasurer') ? 30 : 0) + (has('lobbyist') ? 20 : 0) + (S.approps > 0 ? 20 : 0) + (S.prep.pork || 0), scrutiny: 0, opinion: clamp(ri(38, 62) + (has('spin') ? 8 : 0) + (S.president.party === S.side ? Math.round((S.president.approval - 50) / 4) : 0), 0, 100),
    freeSound: false, goal: null, events: [],
  };
  for (const m of S.members) m.b = { bonus: 0, mood: rnd(-12, 12), intel: false, pledged: false, blackmailed: false, absent: false, touches: 0, fuzzy: null, last: 0 };
  for (const m of S.members) if (T(m, 'leader')) { m.b.intel = true; m.knownTraits = true; }
  // self-calibrate: every bill starts a few votes short
  const need = needNum();
  let short = sup === 67 ? ri(6, 8) : landmark ? ri(4, 6) : clamp(3 + Math.floor(n / 6), 3, 6) + ri(0, 1);
  if (!isMajority()) short += 1;
  if (nomination) short = Math.max(1, short - (S.nominee.tries || 0));
  const target = need - short;
  const ss = S.members.map(support).sort((a, b) => b - a);
  const off = -((ss[target - 1] + ss[target]) / 2);
  for (const m of S.members) m.b.mood += off;
  for (const m of S.members) if (T(m, 'leader')) m.b.start = leaderStance(m);
  if (has('pollster')) for (const m of S.members) m.b.fuzzy = rnd(-14, 14);
  if (S.prep.intel) shuffle(S.members.slice()).slice(0, S.prep.intel).forEach(m => { m.b.intel = true; m.knownTraits = true; });
  const shut = S.shutdown > 0, approps = S.approps > 0;
  if (S.shutdown > 0) S.shutdown--; if (S.approps > 0) S.approps--;
  S.prep = {};
  S.log = [];
  ui.sel = null; ui.pitchOpen = false; ui.lastQuote = '';
  log(`${season(n)} ${billYear(n)}: the ${S.bill.name} comes to the floor. You need ${needText()}.`, 'sys');
  if (landmark) log(`A LANDMARK bill. ${sup} votes required. Double rewards.`, 'sys');
  if (shut) log('🚨 The government is shut down. No money for earmarks.', 'bad');
  if (approps) log('The budget passed, so appropriations are flowing: +$20M earmarks.', 'good');
  log(`${S.members.filter(isUp).length} senators are up for re-election in ${electionYear(nextElectionK())} and are watching how this plays back home.`, 'sys');
  if (budget) return openBudget();
  startDay(true);
}

// the yearly budget: pick what to fund and what to cut, with a live whip count
function openBudget() {
  const B = S.bill, base = { ...B.fx };
  let fund = [], cut = null;
  const apply = () => { B.fx = { ...base }; for (const t of fund) B.fx[t] = (B.fx[t] || 0) + 2; if (cut) B.fx[cut] = (B.fx[cut] || 0) - 2; };
  const draw = () => {
    apply();
    const yes = S.members.filter(m => support(m) >= 8).length, mid = S.members.filter(m => Math.abs(support(m)) < 8).length;
    showModal(`<div class="kicker">${season(B.n)} ${billYear(B.n)} · The yearly budget</div><h2>Write the ${B.name}</h2>
      <p>Pick <b>two priorities to fund</b> and <b>one thing to cut</b>. Every choice changes who will vote for it. The Budget Committee's rough count updates as you go.</p>
      <div class="budget">${TAGS.map(t => `<div class="brow"><span>${TAG[t][0]} ${TAG[t][1]}</span><span><button class="btn ${fund.includes(t) ? 'on' : ''}" data-fund="${t}">Fund</button> <button class="btn ${cut === t ? 'on' : ''}" data-cut="${t}">Cut</button></span></div>`).join('')}</div>
      <div class="fx" style="margin:10px 0">${fxChips(B.fx)}</div>
      <p>Committee count: <b style="color:var(--yes)">${yes} likely yeas</b> · <b style="color:var(--mid)">${mid} on the fence</b> · you need <b>${needText()}</b><br>
      House odds <b>${Math.round(houseOdds() * 100)}%</b> · ${vetoOdds() ? `veto risk <b>${Math.round(vetoOdds() * 100)}%</b>` : `${presTitle()} will sign`}</p>
      <div class="choices"><button class="btn primary big" id="bgo" ${fund.length === 2 && cut ? '' : 'disabled'}>Send the budget to the floor</button></div>`);
    $('#modal-card').querySelectorAll('[data-fund]').forEach(b => b.onclick = () => { const t = b.dataset.fund; if (fund.includes(t)) fund = fund.filter(x => x !== t); else { if (cut === t) cut = null; fund = fund.concat(t).slice(-2); } sfx.click(); draw(); });
    $('#modal-card').querySelectorAll('[data-cut]').forEach(b => b.onclick = () => { const t = b.dataset.cut; cut = cut === t ? null : t; fund = fund.filter(x => x !== t); sfx.click(); draw(); });
    $('#bgo').onclick = () => {
      apply(); B.applied.push(`Funds ${fund.map(t => TAG[t][1]).join(' and ')}; cuts ${TAG[cut][1]}`);
      log(`You wrote the budget: more for ${fund.map(t => TAG[t][1]).join(' and ')}, less for ${TAG[cut][1]}.`, 'sys');
      hideModal(); startDay(true);
    };
  };
  draw();
}

/* ---------------- log, toasts, sound ---------------- */
function log(t, cls = '') { S.log.unshift({ t, cls }); if (S.log.length > 150) S.log.pop(); }
function toast(t) { const el = document.createElement('div'); el.className = 'toast'; el.textContent = t; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 2600); }
let AC = null;
function tone(f, d = 0.08, type = 'sine', v = 0.06) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = v;
    o.connect(g); g.connect(AC.destination);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + d);
    o.start(); o.stop(AC.currentTime + d);
  } catch (e) { }
}
const sfx = {
  up: () => { tone(520, .08); setTimeout(() => tone(780, .1), 70); },
  down: () => { tone(300, .12, 'triangle'); setTimeout(() => tone(200, .15, 'triangle'), 80); },
  click: () => tone(660, .04, 'square', .02),
  yes: () => tone(880, .05, 'sine', .04),
  no: () => tone(180, .06, 'sawtooth', .025),
  gavel: () => { tone(90, .25, 'square', .12); setTimeout(() => tone(70, .3, 'square', .1), 120); },
  fanfare: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, .25, 'triangle', .07), i * 130)),
};

/* ---------------- days & events ---------------- */
function startDay(first) {
  const B = S.bill;
  B.ap = B.apMax; B.freeSound = has('intern'); B.plan = null;
  if (!first) { if (Math.random() < 0.75) return runEvent(); }
  else if (B.landmark || Math.random() < 0.35) return runEvent();
  render();
}

// who the opposing whip will work tonight. Independents answer to no whip, so they're never targets.
function planRival() {
  const B = S.bill;
  const moves = clamp(rivalMoves(1 + Math.floor(B.n / 5) + (B.landmark ? 1 : 0) + (S.president.party !== S.side ? 1 : 0) - (has('mole') ? 1 : 0)), 1, 7);
  const pool = S.members.filter(m => !isLockedYes(m) && !m.b.absent && m.party !== 'I');
  const picks = [];
  for (let i = 0; i < moves; i++) {
    const cands = pool.filter(m => !picks.includes(m)).map(m => ({ m, s: support(m) })).filter(o => o.s > -12 && o.s < 40);
    if (!cands.length) break;
    let tot = 0; for (const o of cands) { o.wt = (T(o.m, 'leader') ? 1.3 : 1) / (1 + Math.abs(o.s - 6) / 6); tot += o.wt; }
    let r = Math.random() * tot, ch = cands[0];
    for (const o of cands) { r -= o.wt; if (r <= 0) { ch = o; break; } }
    picks.push(ch.m);
  }
  B.plan = picks.map(m => m.id);
}
function endDay() {
  const B = S.bill;
  sfx.click();
  if (!B.plan) planRival();
  for (const id of B.plan) {
    const m = S.members[id];
    if (isLockedYes(m) || m.b.absent) { log(`${S.rival} came for ${sen(m)} but found them already committed.`, 'good'); continue; }
    const push = rnd(6, 12) * (T(m, 'loyal') && side(m) === 'you' ? 0.5 : 1) * (has('hardball') ? 0.7 : 1) * rivalPush();
    m.b.bonus -= push; m.b.last = -push;
    log(m.b.intel ? `${S.rival} leaned on ${sen(m)} overnight (${fmt(-push)}).` : `${S.rival} was seen leaving ${sen(m)}'s office.`, 'rival');
  }
  for (const m of S.members) if (T(m, 'fickle') && !isLockedYes(m)) m.b.bonus += rnd(-9, 9);
  B.scrutiny = Math.max(0, B.scrutiny - (has('ethics') ? 18 : 6));
  B.opinion = clamp(B.opinion + (has('social') ? rnd(0, 2) : rnd(-3, 2)), 0, 100);
  B.day++;
  if (B.day > B.days) return callVote();
  log(`— Day ${B.day} —`, 'sys');
  startDay(false);
}

function randOf(f) { const a = S.members.filter(f); return a.length ? pick(a) : null; }
const EVENTS = [
  { id: 'lobby', w: 1, make: () => ({ title: 'K Street Comes Calling', text: 'A lobbyist with a very nice watch offers to "help your members with their state projects."', choices: [
    { t: 'Take the money', s: '+$40M earmark budget, +25 scrutiny', f: B => { B.pork += 40; B.scrutiny += 25; log('You took the lobby\'s help.', 'bad'); } },
    { t: 'Show them the door', s: 'Public opinion +4', f: B => { B.opinion += 4; log('You turned the lobbyist away. A reporter noticed.', 'good'); } },
  ] }) },
  { id: 'cbo', w: 1, make: () => ({ title: 'The CBO Score Lands', text: 'The Congressional Budget Office says your bill costs twice what you claimed.', choices: [
    { t: 'Spin it hard', s: 'Costs 1 action today, opinion −3', f: B => { B.ap--; B.opinion -= 3; log('You spun the CBO score. Damage contained.'); } },
    { t: 'Ignore it', s: 'Opinion −12', f: B => { B.opinion -= 12; log('The CBO score led every newscast.', 'bad'); } },
  ] }) },
  { id: 'sick', w: 1, make: () => {
    const m = randOf(x => side(x) === 'you' && !x.b.absent);
    return m && { title: 'Hospitalized!', text: `${sen(m)} has been rushed to hospital in ${ST[m.state].name} and may miss the vote.`, choices: [
      { t: 'Fly them back to Washington', s: 'Costs 2 capital; they vote', f: () => { S.career.capital -= 2; log(`You flew ${sen(m)} back on a stretcher. Heroic. Expensive.`, 'good'); }, can: () => S.career.capital >= 2 },
      { t: 'Wish them well', s: 'They miss the vote', f: () => { m.b.absent = true; log(`${sen(m)} will miss the vote.`, 'bad'); } },
    ] };
  } },
  { id: 'oppaway', w: 0.7, make: () => {
    const m = randOf(x => side(x) === 'opp' && !x.b.absent);
    return m && { title: 'Grounded', text: `${sen(m)} is stuck at an airport in ${ST[m.state].name} after a storm grounded every flight.`, choices: [
      { t: 'What a shame', s: 'They miss the vote', f: () => { m.b.absent = true; log(`${sen(m)} won't make the vote.`, 'good'); } },
      { t: 'Offer to pair with them', s: 'They vote; relationship +2', f: () => { m.rel += 2; log(`${sen(m)} owes you one.`, 'good'); } },
    ] };
  } },
  { id: 'viral', w: 1, make: () => {
    const m = randOf(x => side(x) === 'opp');
    return m && { title: 'Gone Viral', text: `A clip of ${sen(m)} calling your bill "a dumpster fire with a bow on it" has 9 million views.`, choices: [
      { t: 'Clap back online', s: () => has('social') ? 'Your team never misses: opinion +10' : 'Gamble: opinion ±10', f: B => { const d = has('social') || Math.random() < .55 ? 10 : -10; B.opinion += d; log(d > 0 ? 'Your reply won the internet.' : 'Your reply got ratioed. Badly.', d > 0 ? 'good' : 'bad'); } },
      { t: 'Rise above it', s: 'Opinion −5', f: B => { B.opinion -= 5; m.b.bonus -= 8; log('You stayed silent. The clip kept spreading.', 'bad'); } },
    ] };
  } },
  { id: 'celeb', w: 0.8, make: () => ({ title: 'Celebrity Endorsement', text: 'A beloved country-pop superstar posts that your bill is "honestly kind of iconic."', choices: [
    { t: 'Amazing', s: 'Opinion +10', f: B => { B.opinion += 10; log('A superstar backed the bill!', 'good'); } },
  ] }) },
  { id: 'storm', w: 0.8, make: () => {
    const st = pick(['FL', 'LA', 'TX', 'NC', 'SC', 'MS', 'AL', 'GA']);
    return { title: `Hurricane Hits ${ST[st].name}`, text: `Both ${ST[st].name} senators, and every farm-state colleague, want disaster aid attached. Now.`, choices: [
      { t: 'Fund disaster relief', s: '−$30M earmarks; they and rural senators warm up', f: B => { B.pork -= 30; for (const m of S.members) if (m.state === st) m.b.bonus += 20; else if (m.w.rural > 0.6) m.b.bonus += 6; log(`Disaster aid for ${ST[st].name} announced.`, 'good'); }, can: () => S.bill.pork >= 30 },
      { t: 'Not in this bill', s: `${st} senators cool sharply`, f: () => { for (const m of S.members) if (m.state === st) m.b.bonus -= 15; log(`The ${st} delegation is furious.`, 'bad'); } },
    ] };
  } },
  { id: 'leader', w: 1, make: () => ({ title: vpYours() ? 'The President Calls' : 'Your Leader Calls', text: '"I don\'t just want this passed. I want a margin. Make us look strong."', choices: [
    { t: 'You\'ll get 3 to spare', s: 'Win by 3+: +4 capital. Miss: −1 confidence', f: B => { B.goal = { margin: 3, reward: 4 }; log('You promised a 3-vote margin.', 'sys'); } },
    { t: 'Manage expectations', s: 'No side goal', f: () => log('You kept expectations low.') },
  ] }) },
  { id: 'veto', w: 0.9, cond: () => !vpYours() && !S.bill.nomination, make: () => ({ title: 'Veto Threat', text: 'The President goes on TV and calls your bill "dead on arrival."', choices: [
    { t: 'Water it down for the White House', s: 'Tilt the bill toward their side; your caucus grumbles (−3)', f: B => { const pr = PARTY[other(S.side)].prior; const t = Object.keys(pr).sort((a, b) => pr[b] - pr[a])[0]; B.fx[t] = (B.fx[t] || 0) + 1; B.applied.push(`White House changes (${TAG[t][1]})`); B.softened = true; for (const m of S.members) if (side(m) === 'you') m.b.bonus -= 3; log('You softened the bill to dodge the veto.', 'sys'); } },
    { t: 'Dare them', s: 'Opinion −6; your caucus rallies (+4)', f: B => { B.opinion -= 6; for (const m of S.members) if (side(m) === 'you') m.b.bonus += 4; log('You dared the President to veto it.', 'sys'); } },
  ] }) },
  { id: 'hold', w: 0.7, make: () => ({ title: 'A Hold on the Bill', text: `Sen. ${S.rival} has placed a hold and threatens to read the phone book on the floor.`, choices: [
    { t: 'Grind through it', s: 'Lose 2 actions today', f: B => { B.ap -= 2; log('Floor time ate half your day.', 'bad'); } },
    { t: 'Cut a procedural deal', s: 'Costs 2 capital', f: () => { S.career.capital -= 2; log('A quiet deal lifted the hold.'); }, can: () => S.career.capital >= 2 },
  ] }) },
  { id: 'rumor', w: 1, make: () => {
    const m = randOf(x => !x.b.intel);
    return m && { title: 'Cloakroom Gossip', text: `Your aide overheard ${sen(m)} talking about the bill on the Senate subway.`, choices: [
      { t: 'Tell me everything', s: 'Free intel on them', f: () => { m.b.intel = true; m.knownTraits = true; log(`Gossip revealed where ${sen(m)} stands.`, 'good'); ui.sel = m.id; } },
    ] };
  } },
  { id: 'primary', w: 0.8, make: () => {
    const m = randOf(x => side(x) === 'you' && isUp(x) && !x.b.absent);
    return m && { title: 'Primary Challenger', text: `${sen(m)} just drew a well-funded primary challenger back in ${ST[m.state].name} and is suddenly very nervous.`, choices: [
      { t: 'Have the party endorse them', s: '1 capital; they warm up (+15)', f: () => { S.career.capital -= 1; m.b.bonus += 15; m.rel += 1; log(`The party closed ranks behind ${sen(m)}.`, 'good'); }, can: () => S.career.capital >= 1 },
      { t: 'Let them sweat', s: 'They get skittish (−12)', f: () => { m.b.bonus -= 12; log(`${sen(m)} is sweating.`, 'bad'); } },
    ] };
  } },
  { id: 'scandal', w: 1, cond: () => S.bill.scrutiny >= 45, make: () => ({ title: 'Reporters Are Digging', text: 'A national paper is asking pointed questions about your earmarks.', choices: [
    { t: 'Blame a staffer', s: 'Scrutiny −30; your caucus −1 relationship', f: B => { B.scrutiny -= 30; for (const m of S.members) if (side(m) === 'you') m.rel -= 1; log('You blamed a staffer. Your colleagues winced.', 'bad'); } },
    { t: 'Stonewall', s: 'Opinion −10, scrutiny −10', f: B => { B.opinion -= 10; B.scrutiny -= 10; log('"No comment," you said, seventeen times.', 'bad'); } },
  ] }) },
  { id: 'deal', w: 0.6, make: () => ({ title: 'A Note Slipped Under the Door', text: `"Drop your amendments and I'll release two of mine." — Sen. ${S.rival}`, choices: [
    { t: 'Accept', s: 'No more amendments this bill; 2 opposing senators warm up', f: B => { B.amends.forEach(a => a.used = true); const os = shuffle(S.members.filter(m => side(m) === 'opp')).slice(0, 2); os.forEach(m => m.b.bonus += 18); log(`You took the deal. ${os.map(sen).join(' and ')} softened.`, 'good'); } },
    { t: 'Decline', s: 'Nothing happens… probably', f: () => log('You tore up the note.') },
  ] }) },
];

function runEvent() {
  const avail = EVENTS.filter(e => !S.bill.events.includes(e.id) && (!e.cond || e.cond()));
  if (!avail.length) return render();
  const wt = e => e.weight ? e.weight() : e.w;
  let tot = avail.reduce((a, e) => a + wt(e), 0), r = Math.random() * tot, ev = avail[0];
  for (const e of avail) { r -= wt(e); if (r <= 0) { ev = e; break; } }
  const E = ev.make();
  S.bill.events.push(ev.id);
  if (!E) return render();
  render();
  showModal(`${frontPage({ headline: E.title, sub: `Breaking · Day ${S.bill.day} of the fight over the ${S.bill.name}`, body: [E.text], mood: E.paper || pick(['night', 'dawn', 'storm']) })}<div class="choices">${E.choices.map((c, i) => `<button class="btn" data-ev="${i}" ${c.can && !c.can() ? 'disabled' : ''}>${c.t}<small>${typeof c.s === 'function' ? c.s() : c.s}</small></button>`).join('')}</div>`);
  $('#modal-card').querySelectorAll('[data-ev]').forEach(b => b.onclick = () => {
    sfx.click(); E.choices[+b.dataset.ev].f(S.bill);
    const B = S.bill; B.opinion = clamp(B.opinion, 0, 100); B.ap = Math.max(0, B.ap); B.scrutiny = Math.max(0, B.scrutiny); B.pork = Math.max(0, B.pork);
    hideModal(); render();
  });
}

/* ---------------- senator actions ---------------- */
function spend(n) { S.bill.ap -= n; }
// leaders are seasoned operators: everything you try on them lands 40% weaker
function diminish(m) { return Math.pow(0.85, m.b.touches) * (side(m) !== 'you' && has('bridge') ? 1.3 : 1) * (T(m, 'leader') && m.party !== 'I' ? 0.6 : 1); }
function applyDelta(m, d) {
  m.b.bonus += d; m.b.last = d;
  ui.lastDelta = { id: m.id, d };
  if (T(m, 'leader') && Math.abs(d) >= 4) {
    // the pull is live through support(); just show it
    const mates = factionOf(m).filter(x => !isLockedYes(x)), k = pullK();
    for (const x of mates) x.b.last = d * k;
    if (mates.length) log(`The ${m.faction} watch their leader: ${mates.length} senators ${d > 0 ? 'warm' : 'cool'} (${fmt(d * k)} each).`, d > 0 ? 'good' : 'bad');
  }
  if (d > 0) sfx.up(); else if (d < 0) sfx.down();
}
function say(m, kind) { ui.lastQuote = `“${pick(LINES[kind])}” — Sen. ${m.name}`; }
function reactQuote(m, d) { say(m, d >= 15 ? 'bigup' : d >= 3 ? 'up' : d <= -8 ? 'angry' : d < 0 ? 'down' : 'meh'); }
function porkCost() { return has('bagman') ? 14 : 20; }

const ACTIONS = {
  sound: {
    label: 'Sound Out', desc: 'Learn where they stand, their traits and what they care about.', cost: () => (S.bill.freeSound ? 0 : 1),
    ok: m => !m.b.intel,
    run(m) {
      if (S.bill.freeSound) S.bill.freeSound = false; else spend(1);
      m.b.intel = true; m.knownTraits = true;
      let extra = '';
      if (T(m, 'shady') && !m.dirt && (has('oppo') || Math.random() < 0.5)) { m.dirt = true; extra = ' Your staff found something juicy…'; }
      ui.lastQuote = `“${pick(['Off the record?', 'Between us…', 'You want the honest answer?', 'Close the door.'])}” — Sen. ${m.name}`;
      log(`You sounded out ${sen(m)}: ${stance(support(m))}.${extra}`, extra ? 'good' : '');
      sfx.click();
    },
  },
  pitch: { label: 'Pitch the Bill', desc: 'Choose an argument that speaks to their priorities.', cost: () => 1, ok: () => true, run() { ui.pitchOpen = !ui.pitchOpen; } },
  photo: {
    label: 'Photo Op', desc: 'A joint event back home. Camera-hungry senators adore it.', cost: () => 1, ok: () => true,
    run(m) {
      spend(1);
      let d = (T(m, 'vain') ? 18 : 4) + (T(m, 'swing') ? 5 : 0);
      d *= diminish(m); m.b.touches++;
      applyDelta(m, d); say(m, T(m, 'vain') ? 'vain' : 'meh');
      log(`Photo op with ${sen(m)} (${fmt(d)}).`, 'good');
    },
  },
  pork: {
    label: 'Earmark', desc: () => `A project for their state. $${porkCost()}M of your budget.`, cost: () => 1,
    ok: () => S.bill.pork >= porkCost(),
    run(m) {
      spend(1); S.bill.pork -= porkCost();
      S.bill.scrutiny += (has('bagman') ? 7 : 14) * (has('teflon') ? 0.5 : 1);
      let d;
      if (T(m, 'principled')) { d = -10; m.rel -= 1; say(m, 'porkno'); }
      else { d = ((T(m, 'greedy') ? 30 : 16) + (has('lobbyist') ? 5 : 0)) * diminish(m); say(m, 'pork'); }
      m.b.touches++;
      applyDelta(m, d);
      log(`An earmark for ${ST[m.state].name} to win ${sen(m)} (${fmt(d)}).`, d > 0 ? 'good' : 'bad');
      checkScandal();
    },
  },
  promise: {
    label: 'Promise a Favor', desc: 'Big boost now. Repay 2 capital after the vote, or they turn on you.', cost: () => 1,
    ok: m => !m.iou,
    run(m) {
      spend(1); m.iou = true;
      const d = (T(m, 'ambitious') ? 33 : 22) * (has('dealmaker') ? 1.2 : 1) * diminish(m); m.b.touches++;
      applyDelta(m, d); reactQuote(m, d);
      log(`You promised ${sen(m)} a favor (${fmt(d)}). They will collect.`, 'good');
    },
  },
  twist: {
    label: 'Twist Arm', desc: () => `Lean on them hard.${has('fixer') ? '' : ' Costs 1 capital.'} Risky.`, cost: () => 1,
    ok: m => m.party !== 'I' && (has('fixer') || S.career.capital >= 1),
    run(m) {
      spend(1); if (!has('fixer')) S.career.capital -= 1;
      let d;
      const sd = side(m);
      if (T(m, 'thin')) { d = -18; if (!has('ironfist')) m.rel -= 2; }
      else {
        d = 22 * (sd === 'you' ? (T(m, 'loyal') ? 1.4 : 1) : sd === 'ind' ? 0.7 : 0.5);
        if (T(m, 'principled')) d *= 0.6;
        d *= diminish(m) * (has('ironfist') ? 1.2 : 1);
        if (!has('ironfist') && Math.random() < 0.3) { m.rel -= 1; log(`${sen(m)} will remember this.`, 'bad'); }
      }
      m.b.touches++;
      applyDelta(m, d); say(m, d < 0 ? 'angry' : 'up');
      log(`You twisted ${sen(m)}'s arm (${fmt(d)}).`, d > 0 ? 'good' : 'bad');
    },
  },
  prescall: {
    label: 'Call from the President', desc: () => `${presTitle()} (approval ${S.president.approval}%) personally asks for their vote. ${presCallMax()} per bill. Fellow ${S.president.faction} listen hardest.`, cost: () => 1,
    ok: () => S.president.party === S.side && S.bill.presCalls < presCallMax(),
    run(m) {
      spend(1); S.bill.presCalls++;
      const d = (20 + (S.president.approval - 50) * 0.5) * (T(m, 'vain') || T(m, 'ambitious') ? 1.3 : 1) * (m.faction === S.president.faction ? 1.4 : 1) * (side(m) === 'opp' ? 0.6 : 1) * Math.max(0.4, 1 - (S.undermine || 0) * 0.12) * diminish(m);
      m.b.touches++; applyDelta(m, d);
      ui.lastQuote = `“The President? Calling me? …Yes, ma'am. Yes, sir.” — Sen. ${m.name}`;
      log(`${presTitle()} called ${sen(m)} (${fmt(d)}).`, 'good');
    },
  },
  deal: {
    label: 'Cut a Deal', desc: m => m.cause ? `They answer to no whip, but they'll trade their vote for their cause: ${m.cause[0]}. 2 capital. Writes it into the bill (${TAG[m.cause[1]][1]} +1), which shifts everyone else too.` : '', cost: () => 1,
    ok: m => m.party === 'I' && m.cause && !m.b.dealt && S.career.capital >= 2,
    run(m) {
      spend(1); S.career.capital -= 2; m.b.dealt = true; unlock('deal');
      const B = S.bill, t = m.cause[1];
      const before = new Map(S.members.map(x => [x.id, support(x)]));
      B.fx[t] = (B.fx[t] || 0) + 1; B.applied.push(`${m.cause[0]} (Sen. ${lastName(m)}'s deal)`);
      for (const x of S.members) x.b.last = support(x) - before.get(x.id);
      applyDelta(m, 28 * diminish(m)); m.b.touches++;
      ui.lastQuote = `“${m.cause[0]}. In writing. Then you have my vote.” — Sen. ${m.name}`;
      log(`You cut a deal with ${sen(m)}: ${m.cause[0]} goes into the bill.`, 'good');
    },
  },
  pledge: {
    label: 'Lock In a Commitment', desc: 'A public commitment. The rival can\'t move them; they vote yea.', cost: () => 1,
    ok: m => m.b.intel && support(m) >= 25 && !m.b.pledged,
    run(m) { spend(1); m.b.pledged = true; sfx.yes(); if (T(m, 'leader') && m.party !== 'I') unlock('leader'); ui.lastQuote = `“You have my word.” — Sen. ${m.name}`; log(`${sen(m)} committed publicly to vote YEA. 🔒`, 'good'); },
  },
  dirt: {
    label: 'Use the Dirt', desc: 'Guaranteed yea. Huge scrutiny. They will hate you forever.', cost: () => 0,
    ok: m => m.dirt && !m.b.blackmailed,
    run(m) {
      m.b.blackmailed = true; m.dirt = false; m.rel -= 3; m.grudge = true; S.dirtied = true; unlock('dirt');
      S.bill.scrutiny += 35 * (has('teflon') ? 0.5 : 1); sfx.gavel();
      ui.lastQuote = `“…How did you get those photos?” — Sen. ${m.name}`;
      log(`You showed ${sen(m)} the file. They'll vote yea. They'll never forgive you.`, 'bad');
      checkScandal();
    },
  },
};

function doPitch(m, tag) {
  const B = S.bill; spend(1);
  const fx = B.fx[tag] || 0;
  let d = 4 + 5.5 * m.w[tag] * sgn(fx) * Math.sqrt(Math.abs(fx));
  if (d > 0) { if (T(m, 'principled')) d *= 1.5; if (has('speech')) d *= 1.4; if (has('silver')) d *= 1.25; }
  else if (has('wonk')) d = 2;
  d *= diminish(m); m.b.touches++;
  applyDelta(m, d); reactQuote(m, d);
  log(`You pitched ${sen(m)} on ${TAG[tag][1]} (${fmt(d)}).`, d > 0 ? 'good' : 'bad');
  ui.pitchOpen = false;
}

function checkScandal() {
  const B = S.bill;
  if (B.scrutiny >= 100) {
    S.dirtied = true;
    B.scrutiny = 40; if (!has('ethics')) B.pork = 0; B.opinion = clamp(B.opinion - 15, 0, 100);
    for (const m of S.members) if (side(m) === 'you') m.b.bonus -= 8;
    S.mood -= 1.5;
    sfx.gavel();
    showModal(`<div class="kicker">Scandal</div><h2>EARMARKGATE</h2><p>Every front page: <i>"WHIP'S SLUSH FUND EXPOSED."</i> Your earmark budget is frozen, public opinion tanks, your caucus is nervous, and your party's election prospects take a hit.</p><div class="choices"><button class="btn primary" id="ok">Damage control…</button></div>`);
    $('#ok').onclick = () => { hideModal(); render(); };
    log('SCANDAL! Earmark budget frozen, opinion −15.', 'bad');
  }
}

/* ---------------- floor actions ---------------- */
const FLOOR = {
  amend: { label: 'Amend the Bill', sub: () => `${amendCost()} action${amendCost() > 1 ? 's' : ''} · reshapes who likes it`, cost: () => amendCost(), ok: () => S.bill.amends.some(a => !a.used), run: () => openAmend() },
  rally: { label: 'Caucus Lunch', sub: () => `${has('chef') ? 1 : 2} action${has('chef') ? '' : 's'} · your caucus +7 (loyalists +12)`, cost: () => has('chef') ? 1 : 2, ok: () => true, run() {
    spend(has('chef') ? 1 : 2); for (const m of S.members) if (side(m) === 'you' && !m.b.absent) { const d = T(m, 'loyal') ? 12 : 7; m.b.bonus += d; m.b.last = d; }
    sfx.fanfare(); log(`You rallied the ${PARTY[S.side].name} caucus over lunch.`, 'good');
  } },
  blitz: { label: 'Media Blitz', sub: () => `1 action + 2 capital · opinion +${has('spin') ? 18 : 11}`, cost: 1, ok: () => S.career.capital >= 2, run() {
    spend(1); S.career.capital -= 2; const d = has('spin') ? 18 : 11; S.bill.opinion = clamp(S.bill.opinion + d, 0, 100);
    sfx.up(); log(`Media blitz: public opinion ${fmt(d)}.`, 'good');
  } },
  house: { label: 'Whip the House', sub: () => S.bill.nomination ? 'Confirmations skip the House' : `See the caucuses and work them · odds ${Math.round(houseOdds() * 100)}%`, cost: 0, ok: () => !S.bill.nomination, run: () => openHouse() },
  pulse: { label: '📈 The Pulse', sub: () => `Approval ${S.president.approval}% · generic ballot ${Math.round(genericBallot())}% · mood ${fmt(S.mood)}`, cost: 0, ok: () => true, run: () => openPulse(() => { hideModal(); render(); }) },
  hands: { label: 'Extra Hands', sub: '2 capital · +2 actions today (once a day)', cost: 0, ok: () => S.career.capital >= 2 && S.bill.handsDay !== S.bill.day, run() {
    S.career.capital -= 2; S.bill.ap += 2; S.bill.handsDay = S.bill.day; sfx.click(); log('You borrowed staff from the leadership office: +2 actions today.', 'good');
  } },
  delay: { label: 'Delay the Vote', sub: () => isMajority() ? '3 capital · +1 day (once)' : 'Only the majority controls the calendar', cost: 0, ok: () => isMajority() && !S.bill.delayed && S.career.capital >= 3, run() {
    S.career.capital -= 3; S.bill.delayed = true; S.bill.days++; log('You bought another day on the floor.', 'sys'); sfx.click();
  } },
};

function amendCost() { return has('parl') ? 1 : 2; }
function presCallMax() { return has('whliaison') ? 2 : 1; }
// the House, caucus by caucus
function openHouse() {
  const B = S.bill;
  const draw = () => {
    const blocs = houseBlocs();
    const rows = p => blocs.filter(b => b.p === p).map(b => {
      const i = blocs.indexOf(b), dis = B.ap < 1 || S.career.capital < 1 || b.work >= 2;
      return `<div class="race"><span><b>${b.name}</b> <small style="color:var(--dim)">· ${b.seats} seats · chair ${b.leader}</small><br><span class="mbar"><i style="width:${b.frac * 100}%;background:${PARTY[p].color}"></i></span> <small>~${Math.round(b.yes)} yeas (${Math.round(b.frac * 100)}%)</small></span>
        <button class="btn" style="padding:4px 10px" data-bloc="${i}" ${dis ? 'disabled' : ''}>Work them ${'●'.repeat(b.work)}<small>1 action + 1 capital</small></button></div>`;
    }).join('');
    showModal(`<div class="kicker">House of Representatives · ${S.house.D}D–${S.house.R}R · ${PARTY[houseMaj()].name} Speaker</div><h2>Whip the House</h2>
      <p>Expected yeas: <b>${Math.round(houseExpected())}</b> of 218 needed · House odds <b style="color:${houseOdds() > 0.6 ? 'var(--yes)' : houseOdds() > 0.35 ? 'var(--mid)' : 'var(--no)'}">${Math.round(houseOdds() * 100)}%</b>${houseMaj() !== S.side && dotPrior(other(S.side), B.fx) <= 0 && !isBipartisan() ? ' · <span style="color:var(--no)">the Speaker may refuse to bring it up</span>' : ''}</p>
      <p style="color:var(--dim)">Each caucus votes by its own lights. Working a caucus (twice at most) means calls to its chair and a few favors. You have ${B.ap} actions and ${S.career.capital} capital.</p>
      <b style="color:${PARTY[S.side].color}">${PARTY[S.side].name} caucuses</b><div class="races" style="max-height:none">${rows(S.side)}</div>
      <b style="color:${PARTY[other(S.side)].color}">${PARTY[other(S.side)].name} caucuses</b><div class="races" style="max-height:none">${rows(other(S.side))}</div>
      <div class="choices"><button class="btn primary" id="hdone">Back to the Senate</button></div>`);
    $('#modal-card').querySelectorAll('[data-bloc]').forEach(btn => btn.onclick = () => {
      const b = houseBlocs()[+btn.dataset.bloc]; if (B.ap < 1 || S.career.capital < 1 || b.work >= 2) return;
      spend(1); S.career.capital -= 1; B.hw[b.name] = (B.hw[b.name] || 0) + 1; B.houseWork++;
      log(`You worked the ${b.name} through ${b.leader}. House odds now ${Math.round(houseOdds() * 100)}%.`, 'good'); sfx.click();
      const sc = $('#modal-card').scrollTop; draw(); render(); $('#modal-card').scrollTop = sc;
    });
    $('#hdone').onclick = () => { hideModal(); render(); };
  };
  draw();
}
function openAmend() {
  const B = S.bill;
  const rows = B.amends.map((a, i) => {
    if (a.used) return '';
    const pv = previewAmend(a);
    return `<button class="btn" data-am="${i}"><b>${a.name}</b> <span class="fx" style="display:inline-flex;margin-left:6px">${fxChips(a.fx)}</span><small>Senators you've sounded out: <b style="color:var(--yes)">${pv.gain} would flip to yea</b> · <b style="color:var(--no)">${pv.loss} would flip to nay</b></small></button>`;
  }).join('');
  showModal(`<div class="kicker">Amendment</div><h2>Rewrite the bill</h2><p>Each amendment changes what the bill does, so it changes who likes it. You only see the effect on senators you've sounded out.</p><div class="choices">${rows}<button class="btn ghost" id="am-cancel">Never mind</button></div>`);
  $('#am-cancel').onclick = hideModal;
  $('#modal-card').querySelectorAll('[data-am]').forEach(b => b.onclick = () => {
    const a = B.amends[+b.dataset.am]; spend(amendCost()); a.used = true; B.applied.push(a.name);
    const before = new Map(S.members.map(m => [m.id, support(m)]));
    for (const t in a.fx) B.fx[t] = (B.fx[t] || 0) + a.fx[t];
    for (const m of S.members) m.b.last = support(m) - before.get(m.id);
    log(`Amendment adopted: ${a.name}.`, 'sys'); sfx.gavel(); hideModal(); render();
  });
}
function previewAmend(a) {
  const B = S.bill; let gain = 0, loss = 0;
  const known = S.members.filter(m => m.b.intel && !isLockedYes(m));
  const before = known.map(support);
  for (const t in a.fx) B.fx[t] = (B.fx[t] || 0) + a.fx[t];
  known.forEach((m, i) => { const s = support(m); if (before[i] <= 0 && s > 0) gain++; if (before[i] > 0 && s <= 0) loss++; });
  for (const t in a.fx) B.fx[t] -= a.fx[t];
  return { gain, loss };
}

/* ---------------- the vote ---------------- */
function castVotes() {
  const byName = (a, b) => lastName(a).localeCompare(lastName(b));
  const leaders = S.members.filter(m => T(m, 'leader') && m.party !== 'I').sort(byName);
  const order = leaders.concat(S.members.filter(m => !leaders.includes(m)).sort(byName));
  const lead = {};
  return order.map(m => {
    let v;
    const key = m.party + '|' + m.faction;
    if (m.b.absent) v = 'abs';
    else if (isLockedYes(m)) v = 'yes';
    else {
      const s = support(m);
      if (Math.abs(s) < 8) {
        let p = 0.5 + s / 16 + (has('floor') ? 0.15 : 0) + (has('closer') ? 0.12 : 0);
        if (!T(m, 'leader')) p += lead[key] === 'yes' ? 0.15 : lead[key] === 'no' ? -0.15 : 0;
        v = Math.random() < p ? 'yes' : 'no';
      } else v = s > 0 ? 'yes' : 'no';
    }
    if (T(m, 'leader')) lead[key] = v;
    return { m, v };
  });
}
function callVote() {
  const B = S.bill;
  const results = castVotes();
  showModal(`<div class="kicker">${season(B.n)} ${billYear(B.n)} · Roll call vote</div><h2>The ${B.name}</h2><p style="color:var(--dim)">The clerk calls the roll, faction leaders first. Needed: <b style="color:var(--ink)">${needText()}</b>.</p>
    <div class="tally"><div class="y"><span id="ty">0</span><small>YEAS</small></div><div class="n"><span id="tn">0</span><small>NAYS</small></div></div>
    <div class="rollcall">${results.map((r, i) => `<div class="rc" id="rc${i}">${T(r.m, 'leader') && r.m.party !== 'I' ? '👑 ' : ''}${lastName(r.m)} <span style="color:${PARTY[r.m.party].color}">(${tagOf(r.m)})</span><span class="v"></span></div>`).join('')}</div><div id="vres"></div>`);
  sfx.gavel();
  let y = 0, n = 0, i = 0;
  const need = needNum();
  const step = () => {
    if (i >= results.length) return finishVote(results, y, n);
    const r = results[i], el = $('#rc' + i);
    if (!el) return;
    el.classList.add('on', r.v);
    el.querySelector('.v').textContent = r.v === 'yes' ? 'YEA' : r.v === 'no' ? 'NAY' : '—';
    if (r.v === 'yes') { y++; sfx.yes(); } else if (r.v === 'no') { n++; sfx.no(); }
    $('#ty').textContent = y; $('#tn').textContent = n;
    i++;
    const close = Math.abs(y - need) <= 3 || results.length - i < 10;
    setTimeout(step, window.FF_FAST ? 0 : close ? 260 : 70);
  };
  setTimeout(step, window.FF_FAST ? 0 : 600);
}

function finishVote(results, y, n) {
  const B = S.bill;
  let won, vpNote = '';
  if (B.super) won = y >= B.super;
  else if (y > n) won = true;
  else if (y === n && vpYours()) { won = true; vpNote = 'The Vice President breaks the tie! '; B.tiebreak = true; }
  else won = false;
  B.yeas = y; B.nays = n;
  const spare = B.super ? y - B.super : vpYours() ? y - Math.max(n, 50) : y - Math.max(n + 1, 51);
  if (!B.override) B.spare = spare;
  // votes go on the record back home, and party-line defections feed primary challenges
  const partyLine = B.budget || AGENDA[S.side].some(b => b[0] === B.name) || LANDMARKS[S.side].some(l => l[0] === B.name);
  for (const r of results) {
    if (r.v === 'abs') continue;
    if (partyLine && ((r.m.party === S.side && r.v === 'no') || (r.m.party === other(S.side) && r.v === 'yes'))) { r.m.defy = (r.m.defy || 0) + 1; hist(r.m, `Broke with the ${PARTY[r.m.party].name} Party to vote ${r.v === 'yes' ? 'YEA' : 'NAY'} on the ${B.name}`); }
    else if (B.landmark || B.budget || B.nomination || B.aumf || B.wpr || B.override) hist(r.m, `Voted ${r.v === 'yes' ? 'YEA' : 'NAY'} on the ${B.name}`);
    const fit = stateFit(r.m.state, B.fx);
    r.m.rec = clamp(r.m.rec + (r.v === 'yes' ? fit : -fit * 0.5), -15, 15);
    if (r.v === 'yes' && side(r.m) !== 'you') r.m.rel = clamp(r.m.rel + 0.5, -4, 4);
  }
  const tally = `${vpNote}Senate: ${y}–${n}${won && spare > 0 ? `, ${spare} to spare` : ''}.`;
  if (!won) return settle(false, B.override ? `${tally} The override fell ${B.super - y} short. The veto stands.` : `${tally}${B.super ? ` ${B.super - y} short of ${B.super}.` : ''}`, 'THE BILL FAILS');
  if (B.nomination) {
    const j = newJustice(S.president.party); j.name = S.nominee.name; S.court.push(j); S.nominee = null;
    return settle(true, `${tally} Justice ${j.name} takes a seat on the Supreme Court (now ${courtLabel()}).`, 'CONFIRMED');
  }
  if (B.override) {
    const ho = houseOverrideOdds();
    if (Math.random() < ho) return settle(true, `${tally} The House follows, ${ri(290, 320)}–${ri(100, 140)}. <b>The veto is overridden!</b> The bill becomes law.`, 'VETO OVERRIDDEN', true);
    return settle(false, `${tally} But the House falls short of two-thirds. The veto is sustained.`, 'VETO SUSTAINED');
  }
  sfx.fanfare();
  stage(`<div class="verdict win">THE SENATE PASSES IT</div><p style="text-align:center">${tally}<br><span style="color:var(--dim)">Next stop: the House of Representatives (${S.house.D}D–${S.house.R}R, ${PARTY[houseMaj()].short} majority). Odds ${Math.round(houseOdds() * 100)}%.</span></p>`, 'Send it to the House 🏠', houseStage);
}
function stage(html, label, next) {
  $('#vres').innerHTML = html + `<div class="choices"><button class="btn primary big" id="next">${label}</button></div>`;
  $('#next').onclick = next;
  const card = $('#modal-card'); card.scrollTop = card.scrollHeight;
}
function houseStage() {
  const B = S.bill, odds = houseOdds(), pass = Math.random() < odds;
  const e = Math.round(houseExpected());
  const yes = pass ? clamp(e + ri(-3, 6), 218, 400) : clamp(e + ri(-6, 3), 120, 217);
  sfx.gavel();
  if (!pass) {
    const why = houseMaj() !== S.side && dotPrior(other(S.side), B.fx) <= 0 && Math.random() < 0.5 ? `The ${PARTY[other(S.side)].name} Speaker refused to bring it to the floor.` : `The House votes it down, ${yes}–${435 - yes}.`;
    return settle(false, `Passed the Senate, but died in the House. ${why}`, 'DEAD IN THE HOUSE');
  }
  stage(`<div class="verdict win">THE HOUSE PASSES IT</div><p style="text-align:center">House: ${yes}–${435 - yes}.<br><span style="color:var(--dim)">Now it goes to ${presTitle()} (${PARTY[S.president.party].name}). ${vetoOdds() ? `Veto risk ${Math.round(vetoOdds() * 100)}%.` : 'A signature is all but certain.'}</span></p>`, 'Send it to the White House 🖋', presStage);
}
function presStage() {
  const B = S.bill;
  if (Math.random() < vetoOdds()) {
    sfx.gavel();
    $('#vres').innerHTML = `<div class="verdict lose">VETOED</div><p style="text-align:center">${presTitle()} vetoes the ${B.name}: "This bill is wrong for America."<br><span style="color:var(--dim)">An override needs <b>67</b> senators and two-thirds of the House (House odds ~${Math.round(houseOverrideOdds() * 100)}% if the Senate gets there). You'd get one more day to whip it.</span></p>
      <div class="choices"><button class="btn primary big" id="ovr">Fight for an override (1 more day, 67 votes)</button><button class="btn ghost" id="die">Let it die</button></div>`;
    $('#ovr').onclick = () => {
      hideModal();
      B.override = true; B.super = 67; B.day = Math.min(B.day, B.days); B.days = B.day; B.ap = B.apMax; B.goal = null;
      for (const m of S.members) if (side(m) === 'you') m.b.bonus += 5; // your caucus is angry
      log(`${presTitle()} vetoed the bill. Override fight: you need 67.`, 'sys');
      ui.sel = null; render();
    };
    $('#die').onclick = () => settle(false, `${presTitle()} vetoed it, and you chose not to fight.`, 'VETOED');
    return;
  }
  settle(true, `${presTitle()} signs the ${B.name} into law${S.president.party === S.side ? ' at a Rose Garden ceremony' : ', grudgingly'}.`, 'SIGNED INTO LAW', true);
}
function settle(won, detail, headline, isLaw) {
  const B = S.bill, c = S.career;
  c.bills++;
  const lines = [];
  if (won) {
    c.wins++; c.streak++; c.best = Math.max(c.best, c.streak);
    const spare = B.spare || 0;
    let cap = 3 + clamp(spare, 0, 4) + Math.min(c.streak - 1, 3);
    if (S.calledEarly) { cap += S.calledEarly; lines.push(`Called early: +${S.calledEarly} capital`); }
    if (B.landmark || B.override) cap *= 2;
    if (B.goal) { if (spare >= B.goal.margin) { cap += B.goal.reward; lines.push(`Margin delivered: +${B.goal.reward}`); } else { c.confidence--; lines.push('Missed the promised margin: −1 confidence'); } }
    if (has('bundler')) { cap += 2; lines.push('Bundler: +2'); }
    c.capital += cap;
    if (c.streak % 3 === 0 && c.confidence < 5) { c.confidence++; lines.push('Three in a row: +1 confidence'); }
    lines.unshift(`+${cap} political capital`);
    S.mood = clamp(S.mood + 1 + (B.opinion - 50) / 12 * (B.landmark ? 2 : 1), -15, 15);
    sfx.fanfare();
    if (isLaw && !B.nomination) {
      const cr = courtRisk();
      if (Math.random() < cr.challenge) { S.laws.push({ name: B.name, party: S.side, inBills: ri(2, 4), landmark: B.landmark }); lines.push('⚖ Lawsuits have already been filed. The Supreme Court will decide.'); }
    }
  } else {
    c.losses++; c.streak = 0;
    if (['DEAD IN THE HOUSE', 'VETOED', 'VETO SUSTAINED'].includes(headline)) { c.capital += 2; lines.unshift('You delivered the Senate, so the caucus doesn\'t blame you · +2 capital'); }
    else { c.confidence--; c.capital += 1; lines.unshift('−1 party confidence · +1 capital (consolation)'); }
    if (B.nomination) { S.nominee = { name: fullName(), tries: (S.nominee.tries || 0) + 1 }; lines.push(`The nomination is withdrawn. ${presTitle()} will send a more moderate pick, Judge ${S.nominee.name}, next.`); }
    S.mood = clamp(S.mood - 1.5, -15, 15);
    sfx.gavel();
  }
  if (B.budget) {
    if (won) { S.approps = 3; c.capital += 2; lines.push('Budget enacted: +2 capital, +$20M earmarks for the next three bills'); }
    else {
      S.shutdown = 2; S.mood = clamp(S.mood - 2, -12, 12);
      if (S.president.party === S.side) S.president.approval -= 4;
      if (['DEAD IN THE HOUSE', 'VETOED', 'VETO SUSTAINED'].includes(headline)) c.confidence--;
      lines.push('🚨 GOVERNMENT SHUTDOWN: −1 confidence, national mood −2, earmarks frozen for two bills');
    }
  }
  // the President's approval moves with the agenda
  const P = S.president;
  if (P.party === S.side) P.approval += won ? 1 + Math.round((B.opinion - 50) / 20) : -2;
  else P.approval += won ? -1 : 1;
  P.approval = clamp(Math.round(P.approval + (50 - P.approval) * 0.15) + ri(-2, 2), 18, 82);
  S.calledEarly = 0;
  // legacy and achievements
  if (won) {
    addLegacy(10 + (B.landmark ? 20 : 0) + (B.super === 67 ? 15 : 0) + (B.override ? 20 : 0) + (B.nomination ? 15 : 0) + (B.budget ? 5 : 0));
    if (isLaw) unlock('first');
    if (B.budget) unlock('budget');
    if (B.landmark && B.super === 60) unlock('landmark');
    if (B.super === 67 && !B.override) unlock('treaty');
    if (headline === 'VETO OVERRIDDEN') unlock('override');
    if (B.tiebreak) unlock('tiebreak');
    if ((B.yeas || 0) >= 70) unlock('blowout');
    if (B.nomination) unlock('justice');
    if (c.streak >= 5) unlock('streak5');
    if (c.streak >= 10) unlock('streak10');
    if (rank() === 'Master of the Senate' || c.wins >= 30) unlock('master');
  }
  if (B.budget && !won) unlock('shutdown');
  lines.push(...creditPromises(won, isLaw));
  if (B.aumf) {
    S.pendingAUMF = null;
    if (won) { startWar(B.aumf, 64); lines.push(`⚔️ Congress authorizes force. The war in ${B.aumf} begins with ${S.war.support}% public support.`); }
    else { S.president.approval -= 3; lines.push('The Senate refuses to authorize war. The President is humiliated (−3 approval).'); }
  }
  if (B.wpr && won && isLaw && S.war) { lines.push(`☮️ The troops are coming home from ${S.war.place}.`); S.war = null; }
  pulseTick();
  S.history.push({ n: B.n, name: B.name, won });
  saveRecords();
  const elNext = c.bills % 6 === 0;
  const hl = billHeadline(won, headline, B.yeas || 0, B.nays || 0);
  $('#vres').innerHTML = `<div class="verdict ${won ? 'win' : 'lose'}">${headline}</div>
    <p style="text-align:center">${detail}<br><span style="color:var(--dim)">${lines.join(' · ')}</span></p>
    ${frontPage({ headline: hl.h, sub: hl.d, body: paperBody(won), mood: hl.mood, date: `The morning after · ${season(B.n)} ${billYear(B.n)}` })}
    <div class="choices"><button class="btn primary big" id="next">${c.confidence <= 0 ? 'Face the caucus…' : elNext ? `On to Election Day ${electionYear(c.bills / 6)} 🗳` : 'Back to the whip\'s office'}</button></div>`;
  $('#next').onclick = () => { if (c.confidence <= 0) gameOver(); else if (elNext) electionPrep(); else interlude(); };
  const card = $('#modal-card'); card.scrollTop = card.scrollHeight;
}

/* ---------------- the President, the House and the Court ---------------- */
function newPresident(party) { return { name: fullName(), party, faction: pick(FACTIONS[party])[0], approval: ri(50, 56), terms: 1 }; }
function presVec() {
  const P = S.president, f = (FACTIONS[P.party].find(x => x[0] === P.faction) || [0, {}])[1], v = {};
  for (const t of TAGS) v[t] = (PARTY[P.party].prior[t] || 0) + (f[t] || 0) * 0.6;
  return v;
}
function makeHouseLeaders() { const o = {}; for (const p of ['D', 'R']) for (const [f] of HOUSE_FAC[p]) o[f] = 'Rep. ' + fullName(); return o; }
function houseBlocs() {
  const B = S.bill, out = [];
  for (const p of ['D', 'R']) {
    let left = S.house[p];
    HOUSE_FAC[p].forEach(([name, share, tilt], i) => {
      const seats = i === HOUSE_FAC[p].length - 1 ? left : Math.round(S.house[p] * share); left -= seats;
      let dot = 0; for (const t of TAGS) dot += (0.8 * (PARTY[p].prior[t] || 0) + (tilt[t] || 0)) * (B.fx[t] || 0);
      const work = B.hw[name] || 0;
      const frac = p === S.side
        ? clamp(0.955 + dot * 0.008 + (B.opinion - 50) / 500 + work * 0.03, 0.55, 0.997)
        : clamp(0.03 + Math.max(0, dot) * 0.06 + (B.opinion - 50) / 300 + (isBipartisan() ? 0.3 : 0) + work * 0.05, 0.01, 0.85);
      out.push({ p, name, seats, frac, yes: seats * frac, work, leader: S.houseLeaders[name] });
    });
  }
  return out;
}
function presTitle() { return `President ${lastName(S.president)}`; }
function newJustice(party) { return { name: fullName(), party, age: ri(48, 58) }; }
function buildCourt() {
  const nR = pick([3, 4, 5, 6]);
  return Array.from({ length: 9 }, (_, i) => ({ ...newJustice(i < nR ? 'R' : 'D'), age: ri(50, 80) }));
}
function courtCount(p) { return S.court.filter(j => j.party === p).length; }
function courtLabel() { return `${courtCount('R')}R–${courtCount('D')}D${S.court.length < 9 ? `, ${9 - S.court.length} vacant` : ''}`; }
function isBipartisan() { return AGENDA.both.some(b => b[0] === S.bill.name); }
function dotPrior(p, fx) { let s = 0; for (const t of TAGS) s += (PARTY[p].prior[t] || 0) * (fx[t] || 0); return s; }
function houseMaj() { return S.house[S.side] >= 218 ? S.side : other(S.side); }
function houseExpected() { return houseBlocs().reduce((a, b) => a + b.yes, 0); }
function houseOdds() {
  const B = S.bill;
  let p = 1 / (1 + Math.exp(-(houseExpected() - 217.5) / 6));
  if (houseMaj() !== S.side && dotPrior(other(S.side), B.fx) <= 0 && !isBipartisan()) p *= 0.55; // their Speaker may bury it
  return clamp(p + (has('housewhip') ? 0.1 : 0), 0.02, 0.98);
}
function houseOverrideOdds() { return clamp(1 / (1 + Math.exp(-(houseExpected() + 20 - 290) / 12)) + S.bill.houseWork * 0.05, 0.03, 0.9); }
function vetoOdds() {
  const B = S.bill;
  if (S.president.party === S.side || B.nomination) return 0;
  let d = 0; const v = presVec(); for (const t of TAGS) d += v[t] * (B.fx[t] || 0);
  return clamp(0.55 - d * 0.1 - (isBipartisan() ? 0.35 : 0) - (B.softened ? 0.3 : 0) - (S.president.approval < 40 ? 0.1 : 0) - (has('whliaison') ? 0.15 : 0), 0.05, 0.95);
}
function courtRisk() {
  const B = S.bill;
  if (B.nomination || B.budget || B.super === 67) return { challenge: 0, strike: 0, total: 0 }; // budgets, treaties and amendments don't go to court
  const challenge = AGENDA.both.some(b => b[0] === B.name) ? 0.1 : B.landmark ? 0.6 : 0.3;
  const strike = clamp((courtCount(other(S.side)) - 4) * 0.2 + 0.08 + (B.landmark ? 0.1 : 0), 0.03, 0.9) * (has('legal') ? 0.5 : 1);
  return { challenge, strike, total: challenge * strike };
}
// rulings, retirements and nominations between bills
function courtNews() {
  const msgs = [];
  if (S.nominee && S.president.party !== S.side) S.nominee = null;
  if (S.career.bills % 3 === 0) S.court.forEach(j => j.age++);
  for (const L of S.laws) L.inBills--;
  const due = S.laws.filter(L => L.inBills <= 0); S.laws = S.laws.filter(L => L.inBills > 0);
  for (const L of due) {
    const n = S.court.length, hostile = S.court.filter(j => j.party !== L.party).length;
    const mine = L.party === S.side;
    const p = clamp((hostile - 4) * 0.2 + 0.08 + (L.landmark ? 0.1 : 0), 0.03, 0.9) * (mine && has('legal') ? 0.5 : 1);
    if (Math.random() < p) {
      const a = Math.max(hostile, Math.ceil((n + 1) / 2));
      msgs.push(`⚖ The Supreme Court <b style="color:var(--no)">struck down</b> the ${L.name}, ${a}–${n - a}.${mine ? ' −2 capital, national mood −1.5.' : ''}`);
      if (mine) { S.career.capital = Math.max(0, S.career.capital - 2); S.mood -= 1.5; }
    } else {
      const a = Math.max(n - hostile, Math.ceil((n + 1) / 2));
      msgs.push(`⚖ The Supreme Court <b style="color:var(--yes)">upheld</b> the ${L.name}, ${a}–${n - a}.${mine ? ' National mood +0.5.' : ''}`);
      if (mine) S.mood += 0.5;
    }
  }
  if (S.court.length === 9 && !S.nominee) {
    for (const j of shuffle(S.court.slice())) {
      const p = j.age >= 80 ? 0.06 : j.age >= 72 ? 0.025 : 0.002;
      if (Math.random() < p) {
        S.court = S.court.filter(x => x !== j);
        msgs.push(`⚖ Justice ${j.name} (${PARTY[j.party].name} appointee, age ${j.age}) ${j.age >= 80 && Math.random() < 0.4 ? 'has died' : 'is retiring'}. A Supreme Court seat is open.`);
        break;
      }
    }
  }
  if (S.court.length < 9 && !S.nominee) {
    if (S.president.party === S.side) {
      S.nominee = { name: fullName() };
      msgs.push(`🖋 ${presTitle()} nominates Judge ${S.nominee.name}. <b>Your next fight is the confirmation.</b>`);
    } else if (!isMajority()) {
      const j = newJustice(S.president.party); S.court.push(j);
      msgs.push(`⚖ The ${PARTY[other(S.side)].name} Senate majority confirms ${presTitle()}'s nominee, ${j.name}. Court now ${courtLabel()}.`);
    } else if (!S.vacancyBlocked) S.courtDecision = true;
  }
  return msgs;
}

/* ---------------- elections ---------------- */
function raceBase(m, retiring, P = m.party) {
  const st = ST[m.state];
  const adv = (P === 'R' ? st.lean : P === 'D' ? -st.lean : 8) * 0.55;
  const pm = (P === S.side ? S.mood : P === 'I' ? 0 : -S.mood) * 0.5;
  const thermostat = P === 'I' ? 0 : -0.9 * (seats(P) - 50); // big majorities attract backlash
  return adv + pm + thermostat + (retiring ? 0 : 4 + m.rec * 0.7);
}
// the two major parties in a race: the holder's party (or, for an independent seat, the state's lean) vs the other
// election uncertainty: a bell curve, so anything within ~15 points can go either way
const RACE_SD = 7.5;
function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function normCdf(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
// no cap on money, but each extra unit in the same place does a little less (unit n is worth 85% of unit n-1)
function cashEff(n, per) { return per * (1 - Math.pow(0.85, n)) / 0.15; }
function money(n) { return n ? (n <= 4 ? '💰'.repeat(n) : `💰×${n}`) : '—'; }
function majorParty(rc) { return rc.m.party === 'I' ? (ST[rc.m.state].lean > 0 ? 'R' : 'D') : rc.m.party; }
function projMargin(rc) {
  // two-party margin from the major holder's perspective, including primaries, staff and your campaign cash
  const per = has('pollmap') ? 6 : 4;
  const A = majorParty(rc);
  let mg = raceBase(rc.m, rc.retiring || rc.m.party === 'I' || rc.primaried, A);
  if (rc.primaried) mg += rc.electability;
  if (rc.bruised) mg -= 1;
  const pb = (S.election ? promiseBoost(rc.m.state) : 0) + (S.governors && S.governors[rc.m.state] ? (S.governors[rc.m.state].party === S.side ? 1.5 : -1.5) : 0);
  if (A === S.side) mg += pb + cashEff(rc.cash, per) + (has('field') && !rc.retiring && !rc.primaried && rc.m.party === A ? 3 : 0);
  else mg -= pb + cashEff(rc.cash, per) + (has('recruiter') ? 3 : 0);
  mg += (A === S.side ? 1 : -1) * (S.election ? S.election.waveSignal : 0);
  if (typeof midtermRaceAdj === 'function') mg += (A === S.side ? 1 : -1) * midtermRaceAdj(rc); // the midterm campaign's message, strategy, surrogates (midterm.js)
  return mg + (has('pollmap') ? rc.noise : 0);
}
const FLANK = { D: f => f === 'Progressives' ? 'New Democrats' : 'Progressives', R: f => f === 'Freedom Caucus' ? 'Populists' : 'Freedom Caucus' };
function holderAdv(m) { return (m.party === 'R' ? 1 : -1) * ST[m.state].lean; }
function electionPrep() {
  const k = S.career.bills / 6;
  const year = electionYear(k), cls = classUp(k), pres = isPresYear(k);
  if (!pres) S.mood += (S.president.party === S.side ? -3 : 3); // midterms punish the White House party
  const races = S.members.filter(m => m.cls === cls).map(m => ({ m, retiring: m.party !== 'I' && (m.retireNudge || Math.random() < 0.1), cash: 0, noise: gauss() * RACE_SD, ind: null }));
  const promiseReport = judgePromises();
  // the national environment: most cycles are close, but about one in eight is a wave
  const wave = Math.random() < 0.13 ? (Math.random() < 0.5 ? -1 : 1) * rnd(7, 14) : gauss() * 3;
  const waveSignal = wave * 0.65 + gauss() * 2; // what the forecasters can see coming
  S.election = { k, year, cls, pres, races, wave, waveSignal, platform: [], promiseReport, cash: 3 + Math.floor(S.career.capital / 3) + (has('treasurer') ? 2 : 0) + (has('pollmap2') ? 2 : 0) + (S.warchest || 0) };
  S.warchest = 0;
  const E = S.election;
  // primary challenges: senators who bucked the party line, and moderates in safe seats, draw challengers from the flank
  for (const rc of races) {
    const m = rc.m;
    if (rc.retiring || m.party === 'I') continue;
    const moderate = m.faction === MODERATE[m.party], adv = holderAdv(m);
    const chance = clamp(0.08 + 0.1 * (m.defy || 0) + (moderate && adv > 6 ? 0.2 : 0) + (T(m, 'shady') ? 0.05 : 0), 0, 0.75);
    if (Math.random() < chance) rc.primary = { name: fullName(), faction: FLANK[m.party](m.faction), odds: clamp(0.22 + 0.08 * (m.defy || 0) + (adv > 6 ? 0.1 : -0.08) + (moderate ? 0.08 : 0), 0.05, 0.8), backed: 0 };
  }
  const primaries = races.filter(rc => rc.primary);
  const runPrimaries = () => {
    const out = [];
    for (const rc of primaries) {
      const P = rc.primary, m = rc.m;
      if (Math.random() < P.odds) {
        rc.primaried = true; rc.nominee = P;
        if (P.backed > 0) unlock('primary');
        rc.electability = holderAdv(m) > 6 ? -1 : -5; // a flank nominee is a harder sell in a swing state
        out.push(`<b style="color:var(--gold2)">${ST[m.state].name}:</b> ${P.name} (${P.faction}) <b>defeats Sen. ${m.name}</b> in the ${PARTY[m.party].name} primary.`);
      } else { rc.bruised = true; out.push(`${ST[m.state].name}: Sen. ${m.name} survives a challenge from ${P.name}.`); }
    }
    // independents jump in: a third candidate in some races, especially after a flank nominee wins
    for (const rc of races) {
      if (rc.m.party === 'I') { rc.ind = { name: rc.m.name, incumbent: true, str: rnd(30, 42) }; continue; }
      const chance = (Math.abs(ST[rc.m.state].lean) <= 12 ? 0.14 : 0.06) + (rc.primaried ? 0.15 : 0);
      if (Math.random() < chance) rc.ind = { name: fullName(), cause: pick(IND_CAUSES), str: rnd(10, 26) + (rc.primaried ? 6 : 0) };
    }
    E.primaryNews = out;
    // in a presidential year the fall campaign runs first, then the Senate trail
    if (pres && typeof fallCampaign === 'function') fallCampaign(draw);
    else if (!pres && typeof midtermCampaign === 'function') midtermCampaign(draw); // midterm.js: the lighter Senate campaign
    else draw();
  };
  const drawPrimaries = () => {
    if (!primaries.length) return runPrimaries();
    const c = S.career;
    showModal(`<div class="kicker">Primary Season ${year}</div><h2>Primaries</h2>
      <p>${primaries.length} senator${primaries.length > 1 ? 's face' : ' faces'} a primary challenge from their own party's flank. Senators who voted against the party line drew the strongest challengers. Back the incumbent, or help the challenger: it costs 1 capital in your own party and 2 to meddle in the other side's (a flank nominee is easier to beat in a swing state). You have <b style="color:var(--gold2)">${c.capital}</b> capital.</p>
      <div class="races" style="max-height:none">${primaries.map((rc, i) => {
        const m = rc.m, P = rc.primary, own = m.party === S.side, cost = own ? 1 : 2;
        return `<div class="race"><span><b style="color:${PARTY[m.party].color}">${ST[m.state].name}</b> · ${sen(m)} <small>(${m.faction}${m.defy ? `, broke ranks ${m.defy}×` : ''})</small><br>vs <b>${P.name}</b> <small>(${P.faction})</small> · challenger odds <b>${Math.round(P.odds * 100)}%</b></span>
          <span style="display:flex;gap:6px">${P.backed ? `<small style="color:var(--gold2)">${P.backed > 0 ? 'You backed the challenger' : 'You protected the incumbent'}</small>` : `<button class="btn" style="padding:4px 8px" data-prot="${i}" ${c.capital < cost ? 'disabled' : ''}>Protect<small>${cost} cap</small></button><button class="btn" style="padding:4px 8px" data-chal="${i}" ${c.capital < cost ? 'disabled' : ''}>Back challenger<small>${cost} cap</small></button>`}</span></div>`;
      }).join('')}</div>
      <div class="choices"><button class="btn primary big" id="runprim">Hold the primaries</button></div>`);
    const act = (i, dir) => {
      const rc = primaries[i], cost = rc.m.party === S.side ? 1 : 2;
      if (S.career.capital < cost || rc.primary.backed) return;
      S.career.capital -= cost; rc.primary.backed = dir;
      rc.primary.odds = clamp(rc.primary.odds + dir * (0.2 + (has('recruiter') ? 0.15 : 0)), 0.03, 0.95); sfx.click(); drawPrimaries();
    };
    $('#modal-card').querySelectorAll('[data-prot]').forEach(b => b.onclick = () => act(+b.dataset.prot, -1));
    $('#modal-card').querySelectorAll('[data-chal]').forEach(b => b.onclick = () => act(+b.dataset.chal, 1));
    $('#runprim').onclick = runPrimaries;
  };
  E.houseCash = 0; E.presCash = 0; E.filter = 'close';
  const draw = () => {
    const per = has('pollmap') ? 6 : 4;
    const notUp = S.members.filter(m => m.cls !== cls && m.party === S.side).length;
    const exp = notUp + E.races.reduce((a, rc) => a + raceChance(rc), 0);
    const filt = { close: rc => { const p = raceChance(rc); return p > 0.12 && p < 0.88; }, mine: rc => rc.m.party === S.side, theirs: rc => rc.m.party !== S.side, all: () => true }[E.filter];
    const shown = E.races.filter(filt).sort((a, b) => Math.abs(raceChance(a) - 0.5) - Math.abs(raceChance(b) - 0.5));
    const sc = $('#modal-card') ? $('#modal-card').scrollTop : 0;
    showModal(`<div class="kicker">Election Day ${year} · Class ${cls} · ${E.races.length} seats up${pres ? ' · Presidential year' : ' · Midterms'}</div><h2>The Campaign Trail</h2>
      ${balanceBar()}
      <p>${presTitle()} (${S.president.party}): approval <b>${S.president.approval}%</b>${pres ? (S.president.terms >= 2 ? ' · term-limited, open race' : ' · running for re-election') : ''}. House: ${S.house.D}D–${S.house.R}R, all 435 seats up.</p>
      <p class="forecast">📡 <b>The forecast:</b> ${Math.abs(E.waveSignal) >= 6 ? `<b style="color:${E.waveSignal > 0 ? 'var(--yes)' : 'var(--no)'}">a ${E.waveSignal > 0 ? PARTY[S.side].name : PARTY[other(S.side)].name} wave is building</b> — the national environment favors them by about ${Math.abs(E.waveSignal).toFixed(0)} points` : Math.abs(E.waveSignal) >= 3 ? `the environment leans ${E.waveSignal > 0 ? 'your way' : 'against you'} by about ${Math.abs(E.waveSignal).toFixed(0)} points` : 'a close, neutral year'}. Forecasts can be off by several points either way.</p>
      <p>Your party's national mood: <b style="color:${S.mood >= 0 ? 'var(--yes)' : 'var(--no)'}">${fmt(S.mood)}</b>, built from the bills you passed and how popular they were${pres ? '' : (S.president.party === S.side ? ', minus the usual midterm penalty for holding the White House' : ', plus a midterm boost against the White House')}. Senators who voted against their state's interests are exposed.</p>
      ${E.promiseReport || ''}
      ${platformHTML()}
      ${E.primaryNews && E.primaryNews.length ? `<div class="primnews"><b>Primary results</b>${E.primaryNews.map(t => `<p>${t}</p>`).join('')}</div>` : ''}
      ${!pres && typeof midTrailHTML === 'function' ? midTrailHTML() : ''}
      <div class="camp-top"><div><span class="cashpill">💰 ${E.cash}</span> campaign units left <small style="color:var(--dim)">· the first unit in a race is worth +${per} points for your side, and each extra unit in the same race a bit less. No limit.</small></div>
        <div>Projected Senate for the ${PARTY[S.side].short}: <b style="color:${exp >= 50 ? 'var(--yes)' : 'var(--no)'}">~${exp.toFixed(1)} seats</b></div></div>
      <div class="deploy"><button class="btn" data-auto="smart">🎯 Smart deploy<small>Each unit where it adds the most</small></button><button class="btn" data-auto="defend">🛡 Defend my seats<small>Only seats your party holds</small></button><button class="btn" data-auto="offense">⚔ Go on offense<small>Only seats you could flip</small></button><button class="btn ghost" data-auto="reset">↺ Take it all back</button></div>
      <div class="national">
        <div class="race"><span>🏠 <b>House campaign committee</b><br><small style="color:var(--dim)">All 435 seats. The first unit ≈ +0.8 points nationally (a few House seats); more units, a bit less each.</small></span><span class="cashctl"><button class="btn" data-hc="-1" ${E.houseCash ? '' : 'disabled'}>−</button><span>${money(E.houseCash)}</span><button class="btn" data-hc="1" ${E.cash < 1 ? 'disabled' : ''}>+</button></span></div>
        ${govRaceCount(E.year) ? `<div class="race"><span>🏛️ <b>Governors' races</b><br><small style="color:var(--dim)">${govRaceCount(E.year)} governorships up. Transfer money to your party's candidates: the first unit ≈ +1.2 points in every race; more units, a bit less each.</small></span><span class="cashctl"><button class="btn" data-gc="-1" ${E.govCash ? '' : 'disabled'}>−</button><span class="dots">${money(E.govCash || 0)}</span><button class="btn" data-gc="1" ${E.cash < 1 ? 'disabled' : ''}>+</button></span></div>` : ''}
        ${pres ? presBattleHTML() : ''}
      </div>
      <div class="campmap">${campaignMap()}<small>Click a state to add a unit · right-click to take one back</small></div>
      <div class="ftabs">${[['close', 'Close races'], ['mine', 'My seats'], ['theirs', 'Their seats'], ['all', 'All ' + E.races.length]].map(([k, l]) => `<button class="btn ${E.filter === k ? 'on' : ''}" data-filt="${k}">${l}</button>`).join('')}</div>
      <div class="races camp">${shown.map(raceRow).join('') || '<p style="color:var(--dim)">No races in this view.</p>'}</div>
      <div class="choices"><button class="btn primary big" id="countballots">Close the polls and count the ballots</button></div>`);
    $('#modal-card').scrollTop = E.drawn ? sc : 0; E.drawn = true;
    const card = $('#modal-card');
    const add = (rc, d) => { if (d > 0 && E.cash < 1) return; if (d < 0 && rc.cash < 1) return; rc.cash += d; E.cash -= d; sfx.click(); draw(); };
    card.querySelectorAll('[data-cash]').forEach(b => b.onclick = () => add(E.races[+b.dataset.cash], +b.dataset.d));
    card.querySelectorAll('[data-race]').forEach(g => {
      const rc = E.races[+g.dataset.race];
      g.onclick = () => add(rc, 1);
      g.oncontextmenu = e => { e.preventDefault(); add(rc, -1); };
    });
    card.querySelectorAll('[data-hc]').forEach(b => b.onclick = () => { const d = +b.dataset.hc; if (d > 0 && E.cash < 1) return; if (d < 0 && !E.houseCash) return; E.houseCash += d; E.cash -= d; sfx.click(); draw(); });
    bindPresBattle(draw);
    card.querySelectorAll('[data-gc]').forEach(b => b.onclick = () => { const d = +b.dataset.gc; if (d > 0 && E.cash < 1) return; if (d < 0 && !E.govCash) return; E.govCash = (E.govCash || 0) + d; E.cash -= d; sfx.click(); draw(); });
    card.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => { const d = +b.dataset.pc; if (d > 0 && E.cash < 1) return; if (d < 0 && !E.presCash) return; E.presCash += d; E.cash -= d; sfx.click(); draw(); });
    card.querySelectorAll('[data-promise]').forEach(b => b.onclick = () => { const id = b.dataset.promise, P = E.platform; if (P.includes(id)) E.platform = P.filter(x => x !== id); else if (P.length < 3) P.push(id); sfx.click(); draw(); });
    card.querySelectorAll('[data-filt]').forEach(b => b.onclick = () => { E.filter = b.dataset.filt; sfx.click(); draw(); });
    card.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => { autoDeploy(b.dataset.auto); sfx.up(); draw(); });
    $("#countballots").onclick = countBallots;
  };
  drawPrimaries();
}
// your party's chance of holding or taking a seat, as the campaign sees it
function raceChance(rc) {
  const mg = projMargin(rc), A = majorParty(rc);
  const pA = has('pollmap') ? (mg > 0 ? 0.97 : 0.03) : clamp(normCdf(mg / RACE_SD), 0.01, 0.99);
  let p = A === S.side ? pA : 1 - pA;
  if (rc.ind) p *= rc.m.party === 'I' ? 0.45 : 0.85; // a strong independent muddies it
  return p;
}
function cashGain(rc) { const b = raceChance(rc); rc.cash++; const g = raceChance(rc) - b; rc.cash--; return g; }
function autoDeploy(mode) {
  const E = S.election;
  if (mode === 'reset') { for (const rc of E.races) { E.cash += rc.cash; rc.cash = 0; } E.cash += E.houseCash + E.presCash + (E.govCash || 0); E.houseCash = 0; E.presCash = 0; E.govCash = 0; return; }
  const pool = E.races.filter(rc => mode === 'defend' ? rc.m.party === S.side : mode === 'offense' ? rc.m.party !== S.side : true);
  while (E.cash > 0) {
    let best = null, gain = 0.003;
    for (const rc of pool) { const g = cashGain(rc); if (g > gain) { gain = g; best = rc; } }
    if (!best) break;
    best.cash++; E.cash--;
  }
}
function chanceColor(p) { return p >= 0.6 ? PARTY[S.side].color : p <= 0.4 ? PARTY[other(S.side)].color : '#b8a24a'; }
function govRaceCount(year) { return Object.keys(S.governors || {}).filter(c => govUp(c, year)).length; }
function campaignMap() {
  const E = S.election;
  const byState = {}; E.races.forEach((rc, i) => byState[rc.m.state] = i);
  const rcOf = code => byState[code] == null ? null : E.races[byState[code]];
  return usMap({
    fill: code => { const rc = rcOf(code); if (!rc) return null; const p = raceChance(rc); return { c: chanceColor(p), op: 0.35 + Math.abs(p - 0.5) * 1.3 }; },
    sub: code => { const rc = rcOf(code); return rc ? `${Math.round(raceChance(rc) * 100)}%${rc.cash ? ' $' + rc.cash : ''}` : ''; },
    ring: code => { const rc = rcOf(code); return rc && rc.cash ? '#f6d27a' : null; },
    attr: code => rcOf(code) ? `data-race="${byState[code]}"` : '',
    title: code => { const rc = rcOf(code); return rc ? `${stName(code)}: your chance ${Math.round(raceChance(rc) * 100)}%` : `${stName(code)}: no Senate race this year`; },
  });
}
function raceRow(rc) {
  const m = rc.m, i = S.election.races.indexOf(rc);
  const p = raceChance(rc), g = cashGain(rc);
  const pc = PARTY[m.party].color;
  const rec = m.rec <= -4 ? ' · <span style="color:var(--no)">bad record at home</span>' : m.rec >= 4 ? ' · <span style="color:var(--yes)">popular record</span>' : '';
  const who = rc.retiring ? `<i>Open seat (${m.party} retiring)</i>` : rc.primaried ? `<i>${rc.nominee.name} (${rc.nominee.faction}), after beating Sen. ${lastName(m)} in the primary</i>` : sen(m);
  const ind = rc.ind && m.party !== 'I' ? `<br><small style="color:${PARTY.I.color}">+ Independent ${rc.ind.name} (${rc.ind.cause[0]}), polling ~${Math.round(rc.ind.str)}%</small>` : rc.ind ? `<br><small style="color:${PARTY.I.color}">Independent incumbent vs a Democrat and a Republican</small>` : '';
  return `<div class="race"><span><b style="color:${pc}">${ST[m.state].name}</b> · ${who}${rec}${ind}</span>
    <span class="cashctl"><span class="chance"><b style="color:${chanceColor(p)}">${Math.round(p * 100)}%</b><span class="mbar"><i style="width:${p * 100}%;background:${chanceColor(p)}"></i></span><small>your chance${rc.ind ? ' · 3-way' : ''}</small></span>
      <button class="btn" data-cash="${i}" data-d="-1" ${rc.cash ? '' : 'disabled'}>−</button><span class="dots">${money(rc.cash)}</span><button class="btn" data-cash="${i}" data-d="1" ${S.election.cash < 1 ? 'disabled' : ''}>+${g > 0.005 ? `<small>+${Math.round(g * 100)}%</small>` : ''}</button></span></div>`;
}
function countBallots() {
  const E = S.election, c = S.career;
  const before = { D: seats('D'), R: seats('R'), I: seats('I') };
  const prevMembers = S.members.map(m => ({ state: m.state, cls: m.cls, party: m.party }));
  const races = [];
  for (const rc of E.races) {
    const m = rc.m, A = majorParty(rc), Bp = other(A);
    const final = projMargin(rc) + (has('pollmap') ? 0 : rc.noise) + (A === S.side ? 1 : -1) * (E.wave - E.waveSignal);
    // candidates: the major holder party, the other major party, and maybe an independent
    const nameA = m.party === A && !rc.retiring ? (rc.primaried ? rc.nominee.name : m.name) : fullName();
    const cands = [{ party: A, name: nameA, inc: m.party === A && !rc.retiring && !rc.primaried }, { party: Bp, name: fullName(), inc: false }];
    let iPct = 0;
    if (rc.ind) { iPct = clamp(rc.ind.str + rnd(-5, 5), 3, 60); cands.push({ party: 'I', name: rc.ind.name, inc: !!rc.ind.incumbent }); }
    const rest = 98.5 - iPct, aPct = clamp(rest / 2 + (final / 2) * (rest / 98.5), 1, rest - 1);
    cands[0].pct = aPct; cands[1].pct = rest - aPct; if (rc.ind) cands[2].pct = iPct;
    const tv = turnout(m.state);
    cands.forEach(c => c.votes = tv * c.pct / 100);
    cands.sort((a, b) => b.pct - a.pct);
    const w = cands[0], np = w.party, flip = np !== m.party;
    let winner = m;
    const l = cands[1];
    if (flip || rc.retiring || rc.primaried) {
      const nominee = !flip && rc.primaried ? rc.nominee : null;
      winner = newSenator(np, m.state, m.cls, m.id, nominee ? nominee.faction : null);
      if (nominee || (np === 'I' && rc.ind)) winner.name = w.name;
      if (np === 'I' && rc.ind && rc.ind.cause) winner.cause = rc.ind.cause;
      senatorBackstory(winner, E.year);
      winner.history[winner.history.length - 1].t = `Elected to the U.S. Senate, ${w.pct.toFixed(0)}–${l.pct.toFixed(0)}${flip && !rc.retiring ? `, unseating Sen. ${m.name}` : ' (open seat)'}`;
      if (rc.primaried) hist(winner, `Won the ${PARTY[np].name} primary over Sen. ${m.name}`, E.year);
      hist(m, rc.retiring ? 'Retired from the Senate' : rc.primaried ? `Lost the primary to ${rc.nominee.name}` : `Lost re-election to ${winner.name}`, E.year);
      S.formers = S.formers || []; S.formers.push({ ...m, b: undefined });
      S.members[m.id] = winner;
    } else hist(m, `Re-elected to the U.S. Senate, ${w.pct.toFixed(0)}–${l.pct.toFixed(0)}${rc.bruised ? ' after a tough primary' : ''}`, E.year);
    w.name = winner.name;
    races.push({ code: m.state, cls: m.cls, cands, wName: w.name, wParty: np, lName: l.name, lParty: l.party, wPct: w.pct, lPct: l.pct, wVotes: w.votes, lVotes: l.votes,
      margin: w.pct - l.pct, flip, open: rc.retiring || rc.primaried, incumbent: rc.retiring || rc.primaried ? null : m.name, threeWay: !!rc.ind, call: callTime(m.state, w.pct - l.pct) });
  }
  for (const m of S.members) m.defy = 0;
  for (const m of S.members) m.rec = 0;
  assignBosses();
  // the House, then the White House
  const P = S.president;
  const apTerm = (P.approval - 50) * 0.2 * (P.party === S.side ? 1 : -1);
  const hMajBefore = houseMaj();
  const house = runHouse(S.mood * 0.4 + apTerm * 0.3 - 0.18 * (S.house[S.side] - 218) + cashEff(E.houseCash || 0, 0.8) + E.wave * 0.55 + (typeof midtermHouseAdj === 'function' ? midtermHouseAdj() : 0) + rnd(-2, 2));
  const govBefore = Object.fromEntries(Object.entries(S.governors).map(([c, g]) => [c, g.party]));
  const gov = runGovernors(E.year);
  const pres = E.pres ? runPres() : null;
  const after = { D: seats('D'), R: seats('R'), I: seats('I') };
  const net = after[S.side] - before[S.side];
  let conf;
  if (net >= 2) { c.confidence = Math.min(5, c.confidence + 1); c.capital += 2; conf = `Your party gained ${net} Senate seats: +1 confidence, +2 capital.`; }
  else if (net <= -3) { c.confidence--; conf = `Your party lost ${-net} Senate seats: −1 confidence.`; }
  else conf = `Net Senate change for your party: ${fmt(net)}.`;
  const wasMaj = before[S.side] > before[other(S.side)], nowMaj = isMajority();
  if (wasMaj && !nowMaj) conf += ' <b style="color:var(--no)">You have lost the Senate majority.</b> You no longer control the calendar, and every bill starts further behind.';
  if (!wasMaj && nowMaj) conf += ' <b style="color:var(--yes)">You have WON the Senate majority!</b>';
  let presLine = pres ? `<p style="font-size:16px"><b style="color:${PARTY[S.president.party].color}">President:</b> ${pres.what} (${pres.evD}–${pres.evR} in the Electoral College.) ${S.president.party === S.side ? 'Your Vice President breaks ties, and the President is on your side.' : 'Their VP now breaks ties, and expect vetoes.'}</p>` : '';
  const hNet = S.house[S.side] - house.before[S.side];
  presLine += `<p><b>House:</b> ${S.house.D}D–${S.house.R}R (${fmt(hNet)} for your party). ${houseMaj() !== hMajBefore ? `<b style="color:${houseMaj() === S.side ? 'var(--yes)' : 'var(--no)'}">The House flips to the ${PARTY[houseMaj()].short}!</b>` : `${PARTY[houseMaj()].short} keep the House.`}</p>`;
  S.mood *= 0.3;
  layoutSeats();
  sfx.fanfare();
  const flips = races.filter(r => r.flip);
  // achievements and the new term's promises
  if (flips.filter(f => f.wParty === S.side).length >= 3) unlock('flip3');
  if (seats(S.side) >= 60) unlock('super60');
  if (isMajority() && houseMaj() === S.side && S.president.party === S.side) unlock('trifecta');
  addLegacy(Math.max(0, net) * 4);
  const promiseLine = adoptPromises(); S.dirtied = false;
  const won = isMajority();
  let hl = won ? `${PARTY[S.side].short.toUpperCase()} ${wasMaj ? 'HOLD' : 'TAKE'} THE SENATE` : `${PARTY[other(S.side)].short.toUpperCase()} ${wasMaj ? 'SEIZE' : 'KEEP'} THE SENATE`;
  const evW = pres ? Math.max(pres.evD, pres.evR) : 0;
  if (evW >= 400) hl = `LANDSLIDE: ${hl}`;
  else if (net >= 5 || hNet >= 25) hl = `${PARTY[S.side].short.toUpperCase()} WAVE: ${hl}`;
  else if (net <= -5 || hNet <= -25) hl = `WIPEOUT: ${hl}`;
  const summary = () => {
    showModal(`${frontPage({ headline: hl, sub: `${pres ? pres.what.replace(/<[^>]+>/g, '') + ' ' : ''}Senate ${seats('D')}–${seats('R')}${seats('I') ? '–' + seats('I') : ''}; House ${S.house.D}–${S.house.R}.`, body: [`Election night ${E.year} is in the books. ${flips.length ? flips.length + ' Senate seats changed hands.' : 'Not a single Senate seat changed hands.'}`, conf.replace(/<[^>]+>/g, '')], mood: won ? 'dawn' : 'storm', date: `November ${E.year} · Special edition` })}
      <h2>The New Congress</h2>${balanceBar()}${promiseLine}
      ${presLine}<div class="elmap">${mapSVG('party', { flips: flips.map(f => S.members.find(m => m.state === f.code && m.cls === f.cls).id), up: E.cls })}</div>
      <p>${flips.length ? `<b>${flips.length} Senate seat${flips.length > 1 ? 's' : ''} flipped:</b> ${flips.map(f => `<b style="color:${PARTY[f.wParty].color}">${stName(f.code)}</b>`).join(', ')}.` : 'No Senate seats changed hands.'}</p>
      <p>${conf}</p>
      <div class="choices"><button class="btn ghost" id="replay">📺 Back to the results</button>${HOOKS.results.map(h => h.html(nightData)).join('')}<button class="btn primary big" id="post">${c.confidence <= 0 ? 'Face the caucus…' : 'Swear in the new Congress'}</button></div>`);
    $('#replay').onclick = () => openNight(nightData, summary, { final: true });
    HOOKS.results.forEach(h => h.bind(nightData, summary));
    $('#post').onclick = () => { if (c.confidence <= 0) gameOver(); else interlude(); };
  };
  const gFlips = gov.filter(r => r.flip);
  presLine += `<p><b>Governors:</b> ${gov.length} races. ${gFlips.length ? `${gFlips.length} flipped: ${gFlips.map(r => `<b style="color:${PARTY[r.wParty].color}">${stName(r.code)}</b>`).join(', ')}.` : 'No governorships changed hands.'} Now ${Object.values(S.governors).filter(g => g.party === 'D').length} D – ${Object.values(S.governors).filter(g => g.party === 'R').length} R.</p>`;
  pulseTick();
  const nightData = { year: E.year, races, house, pres, before, prevMembers, gov, govBefore, wave: E.wave, waveSignal: E.waveSignal };
  if (typeof archiveElection === 'function') archiveElection(nightData);
  openNight(nightData, summary);
}
function balanceBar() {
  const d = seats('D'), r = seats('R'), i = seats('I');
  return `<div class="balance"><div style="width:${d}%;background:${PARTY.D.color}">D ${d}</div><div style="width:${i}%;background:${PARTY.I.color}">${i || ''}</div><div style="width:${r}%;background:${PARTY.R.color}">R ${r}</div></div>`;
}

/* ---------------- between bills ---------------- */
function interlude() {
  S.worldNews = worldNews();
  const steps = [];
  if (S.crisis) steps.push(next => crisisModal(next));
  if (S.pendingCabinet) { S.pendingCabinet = false; S.cabinetVacancy = null; steps.push(next => cabinetConfirmations(CABINET_POSTS.map(c => c[0]), next)); }
  else if (S.cabinetVacancy) { const post = S.cabinetVacancy; S.cabinetVacancy = null; steps.push(next => cabinetConfirmations([post], next)); }
  if (presPrimariesDue()) steps.push(next => primariesModal(next));
  if (typeof conventionsDue === 'function' && conventionsDue()) steps.push(next => conventionsModal(next));
  for (const f of HOOKS.interlude) steps.push(...(f() || []));
  const run = () => { const st = steps.shift(); if (st) st(run); else officeView(); };
  run();
}
function officeView() {
  const c = S.career;
  const news = courtNews().concat(S.worldNews || []);
  const avail = k => shuffle(Object.keys(PERKS).filter(p => !c.perks.includes(p) && (k === 'trait') === isTrait(p)));
  S.offers = avail('staff').slice(0, 4).concat(avail('trait').slice(0, 2));
  const used = new Set();
  const COMMITTEES = ['Finance', 'Appropriations', 'Armed Services', 'Judiciary', 'Commerce', 'Agriculture', 'Foreign Relations', 'Health, Education, Labor & Pensions', 'Intelligence', 'Energy'];
  const comOffers = shuffle(S.members.filter(m => side(m) !== 'you' || m.rel < 1)).slice(0, 3).map(m => ({ m, com: pick(COMMITTEES) }));
  const repay = has('dealmaker') ? 1 : 2;
  const SINKS = [
    ['retreat', 'Caucus Retreat', 'Win back one heart of the caucus\'s confidence.', 4, () => c.confidence < 5, () => { c.confidence++; }],
    ['poll', 'Commission a Poll', 'Start the next bill knowing where 8 random senators stand.', 1, () => true, () => { S.prep.intel = 8; }],
    ['warroom', 'War Room', 'The next bill gets an extra day on the floor.', 2, () => true, () => { S.prep.days = 1; }],
    ['gala', 'Fundraising Gala', '+$40M earmarks for the next bill.', 1, () => true, () => { S.prep.pork = 40; }],
    ['dossier', 'Oppo Dossier', 'Dig up dirt on one senator with skeletons.', 2, () => S.members.some(m => T(m, 'shady') && !m.dirt), () => { const m = pick(S.members.filter(m => T(m, 'shady') && !m.dirt)); m.dirt = true; m.knownTraits = true; toast(`Dirt found on ${sen(m)}.`); }],
    ['warchest', 'Campaign War Chest', '+2 campaign cash at the next election.', 2, () => true, () => { S.warchest = (S.warchest || 0) + 2; }],
    ['rebrand', 'Message Rebrand', 'Your party\'s national mood +2.', 3, () => true, () => { S.mood += 2; }],
    ['address', 'Prime-Time Address', `${presTitle()}'s approval +4.`, 2, () => S.president.party === S.side, () => { S.president.approval = clamp(S.president.approval + 4, 22, 72); }],
    ['retire', 'Encourage a Retirement', 'Nudge an opposing senator in a seat up next election to retire, making it an open race.', 3, () => S.members.some(m => side(m) === 'opp' && isUp(m) && !m.retireNudge), () => { const m = pick(S.members.filter(m => side(m) === 'opp' && isUp(m) && !m.retireNudge)); m.retireNudge = true; toast(`${sen(m)} is "spending more time with family" next cycle.`); }],
  ];
  const draw = () => {
    const ious = S.members.filter(m => m.iou), grudges = S.members.filter(m => m.grudge);
    const left = 6 - (c.bills % 6);
    showModal(`<div class="kicker">The Whip's Office · after bill #${c.bills}</div><h2>${rank()} <small style="font-size:14px;color:var(--gold2)">· legacy ${c.legacy || 0}</small></h2>${S.promises && S.promises.length ? promiseStrip().replace('class="promises"', 'class="promises inoffice"') : ''}
      <p>Capital: <b style="color:var(--gold2)">${c.capital}</b> · Confidence: ${'♥'.repeat(Math.max(0, c.confidence))}${'♡'.repeat(Math.max(0, 5 - c.confidence))} · Record ${c.wins}–${c.losses} · Streak ${c.streak}<br>
      ${PARTY[S.side].short} Senate ${isMajority() ? 'majority' : 'minority'} · ${presTitle()} (${S.president.party}, ${S.president.approval}%) · House ${S.house.D}D–${S.house.R}R · Court ${courtLabel()} · Next election: ${electionYear(nextElectionK())} (${left} bill${left > 1 ? 's' : ''} away) · Mood ${fmt(S.mood)}</p>
      ${news.length ? `<hr>${news.map(t => `<p style="margin:6px 0">${t}</p>`).join('')}` : ''}
      ${S.courtDecision ? `<hr><b>Supreme Court vacancy</b><p style="color:var(--dim);margin:4px 0">${presTitle()} (${PARTY[S.president.party].name}) has sent a nominee. Your majority decides whether there's a vote.</p><div class="shop"><button class="btn" id="block"><span>Block the nominee<small>No hearings. The seat stays open until the next President. National mood −1, your caucus loves it (+1 relationship).</small></span></button><button class="btn" id="allow"><span>Hold hearings and confirm<small>The other side gets the seat. National mood +1 for statesmanship.</small></span></button></div>` : ''}
      ${ious.length ? `<hr><b>Debts to repay</b><p style="color:var(--dim);margin:4px 0">Honor a favor for ${repay} capital (+1 relationship). Leave it and they'll hold a grudge, and their faction will cool on you.</p><div class="shop">${ious.map(m => `<button class="btn" data-pay="${m.id}" ${c.capital < repay ? 'disabled' : ''}><span>${sen(m)} <small>${m.faction}</small></span><span class="cost">${repay} capital</span></button>`).join('')}</div>` : ''}
      ${grudges.length ? `<hr><b>Mend fences</b><div class="shop">${grudges.map(m => `<button class="btn" data-mend="${m.id}" ${c.capital < 2 ? 'disabled' : ''}><span>Make peace with ${sen(m)}</span><span class="cost">2 capital</span></button>`).join('')}</div>` : ''}
      <hr><b>Hire staff</b><div class="shop">${S.offers.filter(p => !isTrait(p)).map(perkBtn).join('') || '<p style="color:var(--dim)">No one left to hire.</p>'}</div>
      <hr><b>Build your reputation</b> <small style="color:var(--dim)">· traits are yours for good</small><div class="shop">${S.offers.filter(isTrait).map(perkBtn).join('') || '<p style="color:var(--dim)">You\'ve earned every trait.</p>'}</div>
      <hr><b>Spend capital</b><div class="shop sinks">${SINKS.filter(k => k[4]()).map(k => `<button class="btn" data-sink="${k[0]}" ${c.capital < k[3] || used.has(k[0]) ? 'disabled' : ''}><span>${k[1]}${used.has(k[0]) ? ' ✓' : ''}<small>${k[2]}</small></span><span class="cost">${k[3]} capital</span></button>`).join('')}
        ${comOffers.map((o, i) => `<button class="btn" data-com="${i}" ${c.capital < 2 || used.has('com' + i) ? 'disabled' : ''}><span>Committee seat for ${sen(o.m)}${used.has('com' + i) ? ' ✓' : ''}<small>A seat on ${o.com}. Relationship +2 for good.</small></span><span class="cost">2 capital</span></button>`).join('')}</div>
      ${c.perks.length ? `<p style="color:var(--dim);font-size:12px">Your staff: ${c.perks.filter(p => !isTrait(p)).map(p => PERKS[p][0]).join(', ') || 'none'} · Your traits: ${c.perks.filter(isTrait).map(p => PERKS[p][0]).join(', ') || 'none'}</p>` : ''}
      ${docketHTML()}
      ${execHTML()}
      ${HOOKS.office.map(h => h.html ? h.html() : '').join('')}
      <div class="choices"><button class="btn" id="pulsebtn">📈 The Pulse</button><button class="btn" id="whbtn">🏛️ The Administration</button>${HOOKS.office.map(h => h.button ? h.button() : '').join('')}<button class="btn primary big" id="go">Next bill →</button></div>`);
    bindDocket(draw); bindExec(draw); HOOKS.office.forEach(h => h.bind && h.bind(draw));
    $('#pulsebtn').onclick = () => openPulse(draw);
    $('#whbtn').onclick = () => openAdmin(draw);
    const card = $('#modal-card');
    if ($('#block')) $('#block').onclick = () => { S.courtDecision = false; S.vacancyBlocked = true; S.mood -= 1; for (const m of S.members) if (side(m) === 'you') m.rel += 1; news.push('You blocked the nominee. The seat stays open.'); sfx.gavel(); draw(); };
    if ($('#allow')) $('#allow').onclick = () => { S.courtDecision = false; const j = newJustice(S.president.party); S.court.push(j); S.mood += 1; news.push(`Justice ${j.name} was confirmed. Court now ${courtLabel()}.`); sfx.click(); draw(); };
    card.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => { const m = S.members[+b.dataset.pay]; if (c.capital < repay || !m.iou) return; c.capital -= repay; m.iou = false; m.rel += 1; sfx.up(); toast(`Favor repaid to ${sen(m)}.`); draw(); });
    card.querySelectorAll('[data-mend]').forEach(b => b.onclick = () => { const m = S.members[+b.dataset.mend]; if (c.capital < 2 || !m.grudge) return; c.capital -= 2; m.grudge = false; m.rel = Math.max(m.rel, 0); sfx.up(); toast(`${sen(m)} accepts your olive branch.`); draw(); });
    card.querySelectorAll('[data-perk]').forEach(b => b.onclick = () => { const p = b.dataset.perk; if (c.capital < PERKS[p][2] || c.perks.includes(p)) return; c.capital -= PERKS[p][2]; c.perks.push(p); S.offers = S.offers.filter(x => x !== p); sfx.fanfare(); toast(`${isTrait(p) ? 'New trait' : 'Hired'}: ${PERKS[p][0]}`); draw(); });
    card.querySelectorAll('[data-sink]').forEach(b => b.onclick = () => { const k = SINKS.find(x => x[0] === b.dataset.sink); if (c.capital < k[3] || used.has(k[0]) || !k[4]()) return; c.capital -= k[3]; used.add(k[0]); k[5](); sfx.up(); toast(k[1]); draw(); });
    card.querySelectorAll('[data-com]').forEach(b => b.onclick = () => { const i = +b.dataset.com, o = comOffers[i]; if (c.capital < 2 || used.has('com' + i)) return; c.capital -= 2; used.add('com' + i); o.m.rel += 2; sfx.up(); toast(`${sen(o.m)} joins ${o.com}.`); draw(); });
    if ($('#go') && S.courtDecision) $('#go').disabled = true;
    $('#go').onclick = () => {
      for (const m of S.members.filter(m => m.iou)) {
        m.iou = false; m.grudge = true; m.rel -= 2;
        for (const x of S.members) if (x !== m && x.party === m.party && x.faction === m.faction) x.rel -= 0.5;
      }
      hideModal(); startBill(); save();
    };
  };
  draw();
}

function perkBtn(p) {
  const c = S.career;
  return `<button class="btn" data-perk="${p}" ${c.capital < PERKS[p][2] ? 'disabled' : ''}><span>${PERKS[p][0]}<small>${PERKS[p][1]}</small></span><span class="cost">${PERKS[p][2]} capital</span></button>`;
}
function gameOver() {
  const c = S.career;
  saveRecords();
  localStorage.removeItem('floorfight.v5.save');
  showModal(`<div class="kicker">Caucus Room · Midnight</div><h2>You've lost the caucus.</h2><p>Your colleagues have no confidence left in their whip. You're stripped of leadership and sent to chair the Subcommittee on Federal Paperclip Procurement.</p>
    <p>Legacy score: <b style="color:var(--gold2)">${c.legacy || 0}</b></p><p><b>${c.wins}</b> bills passed of <b>${c.bills}</b> · best streak <b>${c.best}</b> · final rank <b>${rank()}</b> · served until ${billYear(Math.max(1, c.bills))}</p>
    <div class="choices"><button class="btn primary big" id="tomenu">Main menu</button></div>`);
  $('#tomenu').onclick = () => { hideModal(); showMenu(); };
}
function rank() { let r = RANKS[0][1]; for (const [w, n] of RANKS) if (S.career.wins >= w) r = n; return r; }

/* ---------------- persistence ---------------- */
function save() { try { localStorage.setItem('floorfight.v5.save', JSON.stringify({ ...S, bill: null, log: [], election: null, members: S.members.map(m => ({ ...m, b: null })) })); } catch (e) { } }
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('floorfight.v5.save'));
    if (!d || !d.president || !d.governors) return false;
    S = { ...d, log: [] };
    layoutSeats(); startBill(); return true;
  } catch (e) { return false; }
}
function getRecords() { try { return JSON.parse(localStorage.getItem('floorfight.us.records')) || {}; } catch (e) { return {}; } }
function saveRecords() {
  const r = getRecords(), c = S.career;
  r.legacy = Math.max(r.legacy || 0, c.legacy || 0);
  r.wins = Math.max(r.wins || 0, c.wins); r.streak = Math.max(r.streak || 0, c.best); r.bills = Math.max(r.bills || 0, c.bills);
  try { localStorage.setItem('floorfight.us.records', JSON.stringify(r)); } catch (e) { }
}

/* ---------------- rendering ---------------- */
let SEATPOS = [];
function layoutSeats() {
  const rows = [[12, 105], [16, 140], [20, 175], [24, 210], [28, 245]];
  const pts = [];
  for (const [n, r] of rows) for (let i = 0; i < n; i++) { const a = Math.PI - (i + 0.5) * Math.PI / n; pts.push({ x: Math.cos(a) * r, y: -Math.sin(a) * r, a }); }
  pts.sort((p, q) => q.a - p.a || p.y - q.y);
  const order = { D: 0, I: 1, R: 2 };
  const ms = S.members.slice().sort((a, b) => order[a.party] - order[b.party] || a.faction.localeCompare(b.faction) || ST[a.state].lean - ST[b.state].lean);
  SEATPOS = [];
  ms.forEach((m, i) => SEATPOS[m.id] = pts[i]);
}

function stance(s) { return s >= 25 ? 'solid yea' : s >= 12 ? 'leaning yea' : s > -12 ? 'on the fence' : s > -25 ? 'leaning nay' : 'firm nay'; }
function seatColor(m) {
  if (m.b.absent) return '#444';
  if (isLockedYes(m)) return '#2fae64';
  if (m.b.intel) { const s = support(m); return s >= 12 ? '#46c27a' : s > -12 ? '#e3b54a' : '#5a1f2a'; }
  if (m.b.fuzzy != null) { const s = support(m) + m.b.fuzzy; return s >= 12 ? '#2f6b47' : s > -12 ? '#6b5a2a' : '#3a1a20'; }
  return '#3a4250';
}
function counts() {
  let yes = 0, mid = 0, no = 0, unk = 0;
  for (const m of S.members) {
    if (m.b.absent) continue;
    if (isLockedYes(m)) { yes++; continue; }
    if (!m.b.intel) { unk++; continue; }
    const s = support(m); if (s >= 12) yes++; else if (s > -12) mid++; else no++;
  }
  return { yes, mid, no, unk };
}
function fxChips(fx) {
  return Object.entries(fx).filter(([, v]) => v).sort((a, b) => b[1] - a[1]).map(([t, v]) => `<span class="chip ${v > 0 ? 'pos' : 'neg'}">${TAG[t][0]} ${TAG[t][1]} ${v > 0 ? '+'.repeat(Math.min(v, 4)) : '−'.repeat(Math.min(-v, 4))}</span>`).join('');
}

function chamberSVG() {
  let svg = `<text x="0" y="-12" text-anchor="middle" fill="#c9d0de" font-size="9" letter-spacing="2" font-family="Inter,sans-serif" font-weight="700">UNITED STATES SENATE</text>`;
  svg += `<text x="0" y="17" text-anchor="middle" fill="#ffe7a8" font-size="18" font-family="'Playfair Display',Georgia" font-weight="900">${needText()} to pass</text>`;
  for (const m of S.members) {
    const p = SEATPOS[m.id]; if (!p) continue;
    const cls = ['seat']; if (ui.sel === m.id) cls.push('sel');
    if (ui.lastDelta && ui.lastDelta.id === m.id) cls.push(ui.lastDelta.d >= 0 ? 'pulse-up' : 'pulse-down');
    const label = m.b.absent ? '✚' : isLockedYes(m) ? '★' : m.state;
    const dark = m.b.intel && support(m) > -12 || isLockedYes(m);
    svg += `<g class="${cls.join(' ')}" data-id="${m.id}" transform="translate(${p.x.toFixed(1)},${p.y.toFixed(1)})"><title>${sen(m)} · ${m.faction}</title>
      <circle class="body" r="12" fill="${seatColor(m)}" stroke="${PARTY[m.party].color}" stroke-width="2.5"/>
      <text text-anchor="middle" y="3.5" font-size="${label.length > 1 ? 8.5 : 11}" fill="${dark ? '#111' : '#dfe4ec'}" font-weight="700">${label}</text>
      ${m.iou ? '<circle cx="9" cy="-9" r="3.5" fill="#e3b54a"/>' : ''}${m.grudge ? '<circle cx="-9" cy="-9" r="3.5" fill="#ff6b6b"/>' : ''}${isUp(m) ? '<circle cx="9" cy="9" r="3" fill="#fff"/>' : ''}${targeted(m) ? '<text x="-14" y="14" font-size="11">🎯</text>' : ''}
    </g>`;
  }
  return svg;
}

// mode 'stance' (live whip view) or 'party' (election results), on the real map
function mapSVG(mode, opts = {}) {
  const pair = code => S.members.filter(m => m.state === code).sort((a, b) => a.cls - b.cls);
  if (mode === 'party') {
    const flipStates = new Set((opts.flips || []).map(id => S.members[id].state));
    return usMap({
      fill: code => { const ms = pair(code); if (!ms.length) return null; const up = ms.find(m => m.cls === opts.up) || ms[0], rest = ms.find(m => m !== up) || up; return { c: PARTY[up.party].color, c2: PARTY[rest.party].color }; },
      ring: code => flipStates.has(code) ? '#f6d27a' : null,
      sub: code => flipStates.has(code) ? 'FLIP' : '',
      title: code => pair(code).map(sen).join(' · ') || stName(code),
    });
  }
  return usMap({
    fill: code => { const ms = pair(code); if (!ms.length) return null; return { c: seatColor(ms[0]), c2: seatColor(ms[1] || ms[0]) }; },
    sub: code => pair(code).map(m => m.party).join(''),
    ring: code => { const m = S.members[ui.sel]; return m && m.state === code ? '#fff' : pair(code).some(targeted) ? '#ff6b6b' : null; },
    attr: code => pair(code).length ? `data-code="${code}"` : '',
    title: code => pair(code).map(m => `${sen(m)}: ${m.b.intel || isLockedYes(m) ? (isLockedYes(m) ? 'committed' : stance(support(m))) : 'unknown'}`).join(' · ') || stName(code),
  });
}

function render() {
  if (!S || !S.bill) return;
  const B = S.bill, c = S.career;
  if (has('tracker') && !B.plan && B.day <= B.days) planRival();
  const pips = Array.from({ length: B.apMax }, (_, i) => `<i class="${i < B.ap ? '' : 'used'}"></i>`).join('');
  $('#topbar').innerHTML = `
    <div class="stat"><span class="k">${season(B.n)} ${billYear(B.n)}</span><span class="v">Day ${Math.min(B.day, B.days)} / ${B.days}</span></div>
    <div class="stat"><span class="k">Actions${B.freeSound ? ' · free Sound Out' : ''}</span><div class="ap-pips">${pips}</div></div>
    <div class="stat"><span class="k">Capital</span><span class="v" style="color:var(--gold2)">${c.capital}</span></div>
    <div class="stat"><span class="k">Earmarks</span><span class="v">$${B.pork}M</span></div>
    <div class="stat"><span class="k">Public opinion</span><div class="meter"><b style="width:${B.opinion}%;background:${B.opinion > 55 ? 'var(--yes)' : B.opinion < 45 ? 'var(--no)' : 'var(--mid)'}"></b></div></div>
    <div class="stat"><span class="k">Scrutiny</span><div class="meter"><b style="width:${Math.min(100, B.scrutiny)}%;background:${B.scrutiny > 60 ? 'var(--no)' : '#a78bfa'}"></b></div></div>
    <div class="stat"><span class="k">Mood · generic ballot</span><span class="v" style="font-size:13px;color:${S.mood >= 0 ? 'var(--yes)' : 'var(--no)'}">${fmt(S.mood)} · ${Math.round(genericBallot())}%${S.war ? ` <span title="War in ${S.war.place}" style="color:#ff8a8a">⚔ ${S.war.support}%</span>` : ''}</span></div>
    <div class="stat"><span class="k">Confidence</span><span class="v" style="color:var(--no)">${'♥'.repeat(Math.max(0, c.confidence))}</span></div>
    <div class="stat"><span class="k">Senate</span><span class="v" style="font-size:13px"><span style="color:${PARTY.D.color}">D ${seats('D')}</span> · <span style="color:${PARTY.R.color}">R ${seats('R')}</span>${seats('I') ? ` · <span style="color:${PARTY.I.color}">I ${seats('I')}</span>` : ''} </span></div>
    <div class="stat"><span class="k">President · approval</span><span class="v" style="font-size:13px;color:${PARTY[S.president.party].color}">${lastName(S.president)} (${S.president.party} · ${S.president.faction}) ${S.president.approval}%</span></div>
    <div class="stat"><span class="k">House · Court</span><span class="v" style="font-size:13px"><span style="color:${PARTY.D.color}">${S.house.D}</span>–<span style="color:${PARTY.R.color}">${S.house.R}</span> · ${courtLabel()}</span></div>
    <span class="spacer"></span>
    <div class="stat"><span class="k">${PARTY[S.side].short} ${isMajority() ? 'majority' : 'minority'} · ${c.wins}–${c.losses} · streak ${c.streak}</span><span class="v rank">${rank()}</span></div>`;

  $('#bill').innerHTML = `<div style="font-size:11px;letter-spacing:2px;color:var(--gold);text-transform:uppercase">Bill #${B.n} · Opposing whip: Sen. ${S.rival}, the <span title="${RIVAL_STYLES[rivalStyle()][1]}" style="border-bottom:1px dotted">${RIVAL_STYLES[rivalStyle()][0]}</span> · Next election ${electionYear(nextElectionK())}${isPresYear(nextElectionK()) ? ' · a presidential year' : ' · midterms'}</div>
    <h2>${B.name}${B.landmark ? '<span class="landmark">LANDMARK</span>' : ''}</h2><div class="blurb">${B.blurb}</div>
    <div class="fx">${fxChips(B.fx)}</div>
    ${B.applied.length ? `<div class="amend-list">Amended: ${B.applied.join(', ')}</div>` : ''}
    ${B.goal ? `<div class="goal">★ You promised ${B.goal.margin} votes to spare</div>` : ''}
    ${pathToLaw()}${promiseStrip()}`;

  document.querySelectorAll('[data-view]').forEach(b => { b.classList.toggle('on', b.dataset.view === ui.view); b.onclick = () => { ui.view = b.dataset.view; render(); }; });
  const svgEl = $('#chamber');
  svgEl.classList.toggle('hidden', ui.view !== 'chamber'); $('#facview').classList.toggle('hidden', ui.view !== 'factions'); $('#mapview').classList.toggle('hidden', ui.view !== 'map');
  if (ui.view === 'factions') renderFactions();
  else if (ui.view === 'map' && ui.mapMode === 'gov') {
    $('#mapview').innerHTML = `<div class="mapmode"><button class="btn" data-mm="sen">Senators</button><button class="btn on" data-mm="gov">Governors</button></div>` + governorsMap() + `<div class="maplegend">Governors: ${Object.values(S.governors).filter(g => g.party === 'D').length} Democrats, ${Object.values(S.governors).filter(g => g.party === 'R').length} Republicans. Governors appoint senators when a seat opens and help their party's Senate candidates. Click a state for its governor's profile.</div>`;
    $('#mapview').querySelectorAll('[data-gov]').forEach(g => g.onclick = () => { const gv = S.governors[g.dataset.gov]; profileModal(gv, `Governor of ${ST[g.dataset.gov].name}`); });
    $('#mapview').querySelectorAll('[data-mm]').forEach(b => b.onclick = () => { ui.mapMode = b.dataset.mm; render(); });
  }
  else if (ui.view === 'map') {
    $('#mapview').innerHTML = `<div class="mapmode"><button class="btn on" data-mm="sen">Senators</button><button class="btn" data-mm="gov">Governors</button></div>` + mapSVG('stance') + '<div class="maplegend">Each state shows its two senators, split corner to corner: <i style="background:#46c27a"></i>yea <i style="background:#e3b54a"></i>fence <i style="background:#5a1f2a"></i>nay <i style="background:#3a4250"></i>unknown · letters are their parties · click a state to visit one senator, click again for the other</div>';
    $('#mapview').querySelectorAll('[data-code]').forEach(g => g.onclick = () => {
      if (!g.dataset.code) return;
      const ms = S.members.filter(m => m.state === g.dataset.code).sort((a, b) => a.cls - b.cls);
      const cur = ms.findIndex(m => m.id === ui.sel);
      ui.sel = ms[(cur + 1) % ms.length].id; ui.pitchOpen = false; ui.lastQuote = ''; sfx.click(); render();
    });
    $('#mapview').querySelectorAll('[data-mm]').forEach(b => b.onclick = () => { ui.mapMode = b.dataset.mm; render(); });
  }
  else { svgEl.setAttribute('viewBox', '-285 -272 570 300'); svgEl.innerHTML = chamberBackdrop() + chamberSVG(); }
  svgEl.querySelectorAll('[data-id]').forEach(g => g.onclick = () => { ui.sel = +g.dataset.id; ui.pitchOpen = false; ui.lastQuote = ''; sfx.click(); render(); });
  ui.lastDelta = null;

  const k = counts();
  $('#count').innerHTML = `<span class="c" style="color:var(--yes)">Yea / locked<b>${k.yes}</b></span><span class="c" style="color:var(--mid)">On the fence<b>${k.mid}</b></span><span class="c" style="color:var(--no)">Nay<b>${k.no}</b></span><span class="c">Unknown<b>${k.unk}</b></span>`
    + `<div class="legend"><span><i style="background:${PARTY.D.color}"></i>Democrat</span><span><i style="background:${PARTY.I.color}"></i>Independent</span><span><i style="background:${PARTY.R.color}"></i>Republican</span><span>★ locked · ✚ absent · ⚪ up for re-election · 🟡 owed a favor · 🔴 grudge</span></div>`;

  let fa = '';
  for (const [key, a] of Object.entries(FLOOR)) {
    const sub = typeof a.sub === 'function' ? a.sub() : a.sub;
    const cost = typeof a.cost === 'function' ? a.cost() : a.cost;
    fa += `<button class="btn" data-floor="${key}" ${B.ap < cost || !a.ok() ? 'disabled' : ''}><b>${a.label}</b><small>${sub}</small></button>`;
  }
  const daysLeft = B.days - B.day;
  fa += `<button class="btn" id="endday"><b>${B.day >= B.days ? 'Go to the vote ⚖' : 'End Day'}</b><small>${B.day >= B.days ? 'Final day' : 'The opposing whip works overnight'}</small></button>`;
  fa += `<button class="btn primary" id="callvote"><b>Call the Vote Now</b><small>${daysLeft > 0 ? `+${daysLeft} capital if it passes` : 'Roll call'}</small></button>`;
  $('#floor-actions').innerHTML = fa;
  $('#floor-actions').querySelectorAll('[data-floor]').forEach(b => b.onclick = () => { FLOOR[b.dataset.floor].run(); render(); });
  $('#endday').onclick = () => endDay();
  $('#callvote').onclick = () => {
    const dl = B.days - B.day;
    confirmBox(`Call the vote now${dl > 0 ? `, ${dl} day${dl > 1 ? 's' : ''} early` : ''}? Your count says ${k.yes} solid yea, ${k.mid} on the fence, ${k.unk} unknown. You need ${needText()}.`, () => { S.calledEarly = dl; callVote(); });
  };

  renderMember();
  $('#log').innerHTML = '<h4>Whip\'s notebook</h4>' + S.log.slice(0, 60).map(l => `<p class="${l.cls}">${l.t}</p>`).join('');
}

function pathToLaw() {
  const B = S.bill;
  if (B.nomination) return `<div class="path"><span class="step">🏛 Senate confirmation: ${needText()}</span><span class="arr">→</span><span class="step">⚖ A lifetime seat. Court now ${courtLabel()}</span></div>`;
  if (B.override) return `<div class="path"><span class="step" style="border-color:var(--no)">🖋 VETO OVERRIDE: 67 senators, then two-thirds of the House (~${Math.round(houseOverrideOdds() * 100)}%)</span></div>`;
  const ho = houseOdds(), vo = vetoOdds(), cr = courtRisk();
  const col = p => p >= 0.65 ? 'var(--yes)' : p >= 0.4 ? 'var(--mid)' : 'var(--no)';
  return `<div class="path"><span class="step">🏛 Senate: ${needText()}</span><span class="arr">→</span>
    <span class="step">🏠 House ${S.house.D}D–${S.house.R}R: <b style="color:${col(ho)}">${Math.round(ho * 100)}%</b></span><span class="arr">→</span>
    <span class="step">🖋 ${presTitle()}: ${vo === 0 ? '<b style="color:var(--yes)">will sign</b>' : `<b style="color:${col(1 - vo)}">${Math.round(vo * 100)}% veto risk</b>`}</span><span class="arr">→</span>
    <span class="step">⚖ Court ${courtLabel()}: <b style="color:${col(1 - cr.total * 2)}">${Math.round(cr.total * 100)}%</b> struck down</span></div>`;
}
function targeted(m) { const B = S.bill; return has('tracker') && B.plan && B.plan.includes(m.id) && !isLockedYes(m); }
function renderFactions() {
  const groups = [];
  for (const p of [S.side, other(S.side)]) for (const [f] of FACTIONS[p]) {
    const L = S.members.find(m => m.party === p && m.faction === f && T(m, 'leader'));
    if (L) groups.push(L);
  }
  const card = L => {
    const ms = factionOf(L), known = ms.filter(m => m.b.intel || isLockedYes(m));
    const yes = known.filter(m => isLockedYes(m) || support(m) >= 12).length, no = known.filter(m => !isLockedYes(m) && support(m) <= -12).length;
    const st = leaderStance(L), col = isLockedYes(L) || st >= 12 ? 'var(--yes)' : st > -12 ? 'var(--mid)' : 'var(--no)';
    return `<div class="fcard" style="border-left-color:${PARTY[L.party].color}"><div class="fh"><b>${L.faction}</b><small>${ms.length + 1} senators</small></div>
      <button class="btn fl" data-goto="${L.id}">👑 Sen. ${L.name} (${tagOf(L)})<small>Leader · <b style="color:${col}">${isLockedYes(L) ? 'committed yea' : stance(st)}</b> · pulls members ${fmt(L.b.start == null ? 0 : pullK() * (leaderStance(L) - L.b.start) + (isLockedYes(L) ? 2 : 0))}</small></button>
      <div class="fm">${ms.map(m => `<i title="Sen. ${m.name}" data-goto="${m.id}" style="background:${seatColor(m)}"></i>`).join('')}</div>
      <small style="color:var(--dim)">Known: <b style="color:var(--yes)">${yes} yea</b> · <b style="color:var(--no)">${no} nay</b> · ${ms.length - known.length} not sounded out</small></div>`;
  };
  $('#facview').innerHTML = `<p class="fhint">Every faction follows its leader. Move a leader and the whole bloc moves ${Math.round(pullK() * 100)}% as far (and when the other side's whip gets to a leader, the bloc slips too); lock a leader in and members get an extra push. In the roll call, leaders vote first and fence-sitters follow them.</p><div class="fgrid">${groups.map(card).join('')}</div>`;
  $('#facview').querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { ui.sel = +b.dataset.goto; ui.pitchOpen = false; ui.lastQuote = ''; sfx.click(); render(); });
}
function renderMember() {
  const el = $('#member');
  const m = S.members.find(x => x.id === ui.sel);
  if (!m) { el.innerHTML = `<div class="empty">Click a seat in the chamber, or a state on the map, to visit that senator's office.<br><br>Grey seats are senators you haven't sounded out yet.</div>`; return; }
  const B = S.bill, s = support(m), st = ST[m.state];
  const known = m.b.intel;
  const traits = m.knownTraits ? m.traits.map(t => `<span class="trait" title="${TRAITS[t][1]}">${TRAITS[t][0]}</span>`).join('') : '<span class="trait unk">Traits unknown — sound them out</span>';
  const top = TAGS.slice().sort((a, b) => Math.abs(m.w[b]) - Math.abs(m.w[a])).slice(0, 3);
  const concerns = known ? `<div class="concerns">Cares about: ${top.map(t => `<b>${TAG[t][0]} ${TAG[t][1]}</b> (${m.w[t] > 0 ? 'for' : 'against'})`).join(', ')}</div>` : '';
  const L = leaderOf(m), pull = leaderPull(m);
  const leadLine = T(m, 'leader') && m.party !== 'I'
    ? `<div class="concerns lead">👑 <b>Leader of the ${m.faction}</b>: ${factionOf(m).length} senators follow their lead (${Math.round(pullK() * 100)}% of the way), and fence-sitters follow their vote. Seasoned: your moves on them land 40% weaker.</div>`
    : L ? `<div class="concerns lead">Follows <a href="#" data-goto="${L.id}">Sen. ${L.name}</a>, leader of the ${m.faction}, who is <b>${isLockedYes(L) ? 'committed yea' : stance(leaderStance(L))}</b> (pull ${fmt(pull)}).</div>` : '';
  const fit = stateFit(m.state, B.fx);
  const home = `<div class="concerns">Back in ${st.name} (${leanLabel(st.lean)}), this bill is <b style="color:${fit > 1.5 ? 'var(--yes)' : fit < -1.5 ? 'var(--no)' : 'var(--mid)'}">${fit > 4 ? 'very popular' : fit > 1.5 ? 'popular' : fit < -4 ? 'very unpopular' : fit < -1.5 ? 'unpopular' : 'a wash'}</b>.${isUp(m) ? ` They're <b>up for re-election in ${electionYear(nextElectionK())}</b> and feel it.` : ''}</div>`;
  const delta = known && m.b.last && Math.abs(m.b.last) >= 1 ? ` <span class="delta ${m.b.last > 0 ? 'up' : 'down'}">${fmt(m.b.last)}</span>` : '';
  const pos = ((s + 60) / 120 * 100);
  const bar = known || isLockedYes(m)
    ? `<div class="sbar"><div class="mid"></div><div class="dot" style="left:${clamp(pos, 2, 98)}%"></div></div><div class="slabels"><span>Firm nay</span><span class="sval">${isLockedYes(m) ? 'LOCKED YEA' : stance(s) + ' (' + fmt(s) + ')'}${delta}</span><span>Solid yea</span></div>`
    : `<div class="sbar" style="background:#2a303b"><div class="unk">${m.b.fuzzy != null ? 'POLLSTER: ' + stance(s + m.b.fuzzy).toUpperCase() : '? ? ?'}</div></div>`;
  const badges = [targeted(m) && '<span class="badge grudge">🎯 Targeted tonight</span>', m.party === 'I' && `<span class="badge" style="background:#2e2840;color:#d5c6ff">Answers to no whip${m.cause ? ` · Cause: ${m.cause[0]}` : ''}</span>`, m.defy && `<span class="badge" style="background:#3a3220;color:var(--gold2)">Broke ranks ${m.defy}×</span>`, m.b.pledged && '<span class="badge pledged">★ Committed</span>', m.b.blackmailed && '<span class="badge pledged">★ Compromised</span>', m.iou && '<span class="badge iou">You owe them a favor</span>', m.grudge && '<span class="badge grudge">Holds a grudge</span>', m.b.absent && '<span class="badge absent">Absent</span>', m.dirt && '<span class="badge dirt">You have dirt</span>', isUp(m) && `<span class="badge" style="background:#2c2c2c;color:#fff">Up in ${electionYear(nextElectionK())}</span>`, `<span class="badge" style="background:#232a35;color:var(--dim)">Relationship ${fmt(m.rel)}</span>`].filter(Boolean).join('');

  let acts = '';
  if (m.b.absent) acts = '<p class="empty" style="padding:10px">They won\'t be at the vote.</p>';
  else if (isLockedYes(m)) acts = '<p class="empty" style="padding:10px">Locked in. Nothing more to do here.</p>';
  else {
    for (const [key, a] of Object.entries(ACTIONS)) {
      if (key === 'dirt' && !m.dirt) continue;
      if (key === 'prescall' && S.president.party !== S.side) continue;
      if (key === 'deal' && m.party !== 'I') continue;
      if (key === 'twist' && m.party === 'I') continue;
      if (key === 'pledge' && !(m.b.intel && s >= 25)) continue;
      const cost = a.cost(m);
      const desc = typeof a.desc === 'function' ? a.desc(m) : a.desc;
      const dis = B.ap < cost || !a.ok(m);
      acts += `<button class="btn ${key === 'pledge' ? 'primary' : key === 'dirt' ? 'danger' : ''}" data-act="${key}" ${dis ? 'disabled' : ''}><b>${a.label}</b> ${cost ? `<span style="color:var(--gold)">${'●'.repeat(cost)}</span>` : '<span style="color:var(--yes)">free</span>'}<small>${desc}</small></button>`;
    }
  }
  let args = '';
  if (ui.pitchOpen && !isLockedYes(m)) {
    args = `<div class="args"><div class="h">Pick your argument. Match what they care about${known ? '' : ' (you\'re guessing — sound them out first)'}:</div>${Object.entries(B.fx).filter(([, v]) => v).map(([t, v]) => `<button class="btn" data-arg="${t}">${TAG[t][0]} ${v > 0 ? 'It\'s great for' : 'It\'s not so bad for'} ${TAG[t][1]}</button>`).join('')}</div>`;
  }
  el.innerHTML = `<div class="m-head">${portrait(m)}<div><h3>Sen. ${m.name}</h3><div class="m-sub"><span class="m-party" style="color:${PARTY[m.party].color}">${PARTY[m.party].name}</span> · ${m.faction}</div><div class="m-sub">${st.name} · ${leanLabel(st.lean)} · Class ${m.cls}</div></div></div>
    <div class="support">${bar}</div>
    <div class="badges">${badges}</div>
    <div class="traits">${traits}</div>${leadLine}${concerns}${home}
    <details class="cdet"><summary>📜 Bio and political history</summary>${careerHTML(m)}</details>
    <div class="quote">${ui.lastQuote || '<span style="color:var(--dim)">…</span>'}</div>
    <div class="actions">${acts}</div>${args}`;
  el.querySelectorAll('[data-act]').forEach(b => b.onclick = () => { ACTIONS[b.dataset.act].run(m); render(); });
  el.querySelectorAll('[data-goto]').forEach(a => a.onclick = e => { e.preventDefault(); ui.sel = +a.dataset.goto; ui.pitchOpen = false; ui.lastQuote = ''; sfx.click(); render(); });
  el.querySelectorAll('[data-arg]').forEach(b => b.onclick = () => { if (B.ap < 1) return; doPitch(m, b.dataset.arg); render(); });
}

/* ---------------- modal helpers ---------------- */
function showModal(html) { $('#modal-card').innerHTML = html; $('#modal').classList.remove('hidden'); $('#modal-card').scrollTop = 0; }
function hideModal() { $('#modal').classList.add('hidden'); }
function confirmBox(text, yes) {
  showModal(`<h2>Are you sure?</h2><p>${text}</p><div class="choices"><button class="btn primary" id="cy">Call the roll</button><button class="btn ghost" id="cn">Keep whipping</button></div>`);
  $('#cy').onclick = () => yes(); $('#cn').onclick = hideModal;
}

const HOW = `<div class="kicker">Briefing</div><h2>How to whip the Senate</h2><ul class="how">
<li>You're your party's whip in the <b>US Senate</b>: 100 senators, two per state. Regular bills need a majority: <b>50 + the Vice President</b> if your party holds the White House, otherwise 51. <b>Landmark</b> bills need <b>60</b> to beat a filibuster, and treaties need <b>67</b>.</li>
<li>Every bill starts a few votes short. You have <b>5 days</b> and a handful of <b>actions</b> per day.</li>
<li><b>Click a seat</b> (or a state on the <b>Map</b>) to visit a senator. <b>Sound Out</b> to learn where they stand, their traits and what they care about.</li>
<li><b>Pitch</b> with an argument they care about (a bad match backfires). Use <b>earmarks</b> on the pork-hungry and <b>photo ops</b> on the camera-hungry. <b>Promise a favor</b> and you'll owe them later. <b>Twist an arm</b> unless they're thin-skinned. Dig up <b>dirt</b> if you dare.</li>
<li>Get a senator to a solid yea and <b>lock in</b> their commitment so the other side's whip can't steal them back overnight.</li>
<li>Every faction has a <b>leader</b> 👑. Their public stance pulls every member of the faction, they vote first in the roll call, and fence-sitters follow them. Win the leader, win the bloc. See them all under <b>Factions</b>.</li>
<li><b>Amendments</b> change what the bill does, which reshuffles who supports it.</li>
<li><b>Elections</b> come every two years (every 6 bills), with a third of the Senate up each time and the White House every four years. Senators up for re-election vote with their home state in mind, and those who voted against it are vulnerable. Your party's national mood depends on what you passed. Spend campaign cash in the close races. Lose the majority and you lose control of the calendar.</li>
<li>Passing the Senate is only step one. Every bill then needs the <b>House</b> (whip it to raise the odds) and the <b>President's</b> signature. An opposing President may veto, and an override needs 67 senators. A friendly President can call wavering senators for you, and their approval lifts your whole caucus. Once it's law, the <b>Supreme Court</b> may strike it down. When a justice retires, a friendly President nominates a replacement and you whip the confirmation; with an opposing President, your majority can block their pick.</li>
<li><b>Factions</b> run everything: senators belong to caucuses, the House votes caucus by caucus (use <b>Whip the House</b>), and the President's own wing follows them hardest.</li>
<li><b>Independents</b> answer to no whip. The other side can't pressure them and you can't twist their arms, but each has a cause, and they'll <b>cut a deal</b>: their vote for writing that cause into the bill.</li>
<li>Every Fall brings the <b>budget</b>. You choose what it funds and cuts. If it fails anywhere, the government shuts down.</li>
<li>Before each election come the <b>primaries</b>. Senators who broke with the party line draw challengers from their flank. Protect them, or back the challenger (even in the other party). Independents can enter any race against both parties.</li>
<li>Before each election, choose a <b>platform</b> of up to three promises. They lift your candidates, but if your party wins the Senate you have six bills to keep them.</li>
<li><b>Election Night</b> calls the races east to west: a projection banner at 270, a decision-desk ticker, sortable tables, swings since last time and the popular vote. Afterwards, <b>Full results</b> opens the detailed explorer, and <b>The Almanac</b> in the whip's office keeps every past election, the presidents and the standings.</li>
<li>Expect the unexpected: breaking news on the floor (faction ultimatums, filibuster threats, a senator's resignation or a party switch, town-hall revolts, a Supreme Court ruling mid-fight…), world news between bills (the economy, indictments, impeachment inquiries) and moments that need your call (a scandal in your caucus, a defector, a book deal).</li>
<li>Know your opponent: the opposing whip is a <b>Bulldog</b>, a <b>Schemer</b> (watch for poison-pill amendments) or a <b>Charmer</b>.</li>
<li>Between bills, use <b>The Docket</b> to choose what comes next, or bring your own bill on any issue (especially one you promised). In the minority it takes a discharge petition.</li>
<li>The <b>Administration</b>: the President signs executive orders, faces foreign crises and may ask Congress to authorize war. New presidents send a whole cabinet for confirmation. Governors appoint senators when seats open up.</li>
<li>In presidential years, both parties hold <b>primaries</b> state by state (Spring). Senators, House members, governors and cabinet officials run. Rank up to three candidates; your endorsement follows your list. Watch the other party's race too, and undermine your own President if you dare.</li>
<li>Each party then holds its <b>convention</b> (Summer). At yours you pick the <b>running mate</b> (vet them for hidden risks), settle the <b>platform</b> fight between the flank and the center, choose the keynote and the speech, and ride out the surprises; a party that leaves united gets a <b>bounce</b>. If nobody clinched, it's a <b>brokered convention</b> and you can be the kingmaker. The other party's convention plays out on the news.</li>
<li>The <b>fall campaign</b> (after the Senate primaries) runs five rounds: the message and the map on Labor Day, two <b>debates</b> (prep them, pick a game plan), the running mates' debate, an <b>October surprise</b> with hard choices, and a final weekend of ads, <b>surrogates</b> and turnout. The poll tracker and the Electoral College map move with every call you make, and every unit you spend on the ticket is one you can't spend on a Senate seat.</li>
<li>In midterm years the Senate gets its own <b>midterm campaign</b>: pick the message and whether to defend, attack, nationalize or localize, send a debate coach, handle a surprise, and pick your closing surrogates.</li>
<li>Check <b>The Pulse</b> for approval, the generic ballot, the presidential horse race, the Senate outlook and what voters care about. Every politician's profile carries their political history.</li>
<li>Win bills to earn <b>capital</b>, then hire staff and repay your debts. Lose bills (or seats) and the caucus loses <b>confidence</b>. At zero, your career is over.</li></ul>
<div class="choices"><button class="btn primary" id="howok">To the floor</button></div>`;

/* ---------------- menu ---------------- */
function showMenu() {
  $('#game').classList.add('hidden'); $('#menu').classList.remove('hidden');
  const r = getRecords();
  $('#hero').innerHTML = capitolSVG('night');
  $('#records').innerHTML = `<div>— Senate Records —</div><div>Most bills passed: <b>${r.wins || 0}</b> · Longest winning streak: <b>${r.streak || 0}</b> · Longest career: <b>${r.bills || 0}</b> bills${r.legacy ? ` · Best legacy: <b>${r.legacy}</b>` : ''}</div>`;
  $('#legacy').innerHTML = legacyHTML();
  $('#btn-continue').disabled = !localStorage.getItem('floorfight.v5.save');
}
function enterGame() { $('#menu').classList.add('hidden'); $('#game').classList.remove('hidden'); }
function startNew(p) {
  enterGame();
  const go = () => { newCareer(p); save(); };
  if (!localStorage.getItem('floorfight.us.seenHow')) { localStorage.setItem('floorfight.us.seenHow', '1'); showModal(HOW); $('#howok').onclick = () => { hideModal(); go(); }; }
  else go();
}
$('#btn-new-d').onclick = () => startNew('D');
$('#btn-new-r').onclick = () => startNew('R');
$('#btn-continue').onclick = () => { enterGame(); if (!load()) showMenu(); };
$('#btn-how').onclick = () => { showModal(HOW); $('#howok').onclick = hideModal; };
// showMenu() runs from depth.js, once the art and achievements have loaded
