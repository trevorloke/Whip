# Floor Fight

A browser game about whipping votes in the United States Senate. You are your
party's whip: count the votes, twist the arms, survive the roll call, then
survive the next election. Or lead the small Independent caucus that holds the
balance between the two parties (see [Lead the Independents](#lead-the-independents)).

The 50 states, seat counts, electoral votes, House apportionment and election
calendar are real. Every senator, justice, president and candidate is fictional.

## Run it

It's plain HTML, CSS and JavaScript with no build step and no dependencies.
Serve the folder and open it in a browser:

```bash
python3 -m http.server 8077
```

Then go to <http://localhost:8077>. Opening `index.html` directly also works.

## How it plays

- **The Senate.** 100 fictional senators, two per state, each shaped by their
  party, faction (Progressives, Blue Dogs, Conservative Democrats, Freedom
  Caucus, Progressive Republicans, Establishment…) and home state's lean and
  interests. You start in the **minority**, 47 seats to 51, with a President
  from the other party. Regular bills need 51 votes, or 50 plus the Vice
  President; landmark bills need 60 to beat a filibuster; treaties need 67.
- **Pass it or kill it.** Every bill has a caucus position. When the other
  party controls the floor, the majority leader schedules their agenda and
  your job is to **kill** it: your arguments, favors and arm-twisting push
  senators toward nay, a commitment locks in a nay, amendments become poison
  pills, and the minority's great weapon is the **filibuster**: their partisan
  bills need 60 votes for cloture, so 41 nays kill them. Budgets, nominations
  and war votes still pass with a simple majority. A bill that survives the
  Senate can still die in the House or under a veto. Killing their bills is a
  win; their bill becoming law is a loss.
- **The floor schedule.** The Whip's Office shows the next three bills. In
  the majority you set the schedule (and can fast-track, hold a tough vote, or
  go nuclear on the filibuster). In the minority the majority sets it, and you
  fight it with discharge petitions, unanimous-consent ambushes, filibuster
  threats, amendments that ride on their bills, and message votes that put
  their vulnerable senators on record. You can also flip your caucus's
  position on their bipartisan bills, or sell your votes on their budget.
- **Your wing.** At the start you pick the wing of your party you champion
  (five per party, including Conservative Democrats from deep-red states and
  Progressive Republicans from deep-blue ones). Its senators start out warmer
  to you. Build it up: recruit its candidates for open seats, win converts,
  fund its PAC, and its presidential candidates get your network in the
  primaries. Factions take care of their own in the primaries: senators and
  governors campaign for candidates of their wing, a crowded lane consolidates
  behind its strongest candidate, and a candidate who quits usually sends their
  delegates to a fellow member (the ambitious are the exception).
- **The feud with the White House.** Fight an opposing President with
  subpoenas (or, in the minority, an inspector general), prime-time rebuttals,
  holds on nominees, an impeachment inquiry, or cut a deal. Undermine your own
  party's President with leaks, slow-walking, a recruited challenger or a public
  break. Every hostile move deepens the feud, and the President hits back:
  higher veto odds (your own President can veto you too), no more calls for
  your bills, cancelled projects in your senators' states, executive orders
  aimed at your agenda, oppo leaked on you, challengers recruited against your
  wing, and a President who campaigns against your senators (which backfires
  when they're unpopular). Feuds cool slowly; peace costs capital.
- **Whipping.** Sound senators out, pitch arguments that match what they care
  about, hand out earmarks and photo ops, promise favors you'll have to repay,
  twist arms, or use dirt. Lock in commitments before the opposing whip peels
  votes away overnight. Win a caucus boss and their faction moves with them.
  Amendments reshape who likes the bill.
- **Bills.** 210 of them, plus the yearly budget: each party's agenda, bipartisan deals (more of
  them in divided government), and landmarks that need 60 or 67 votes.
- **The yearly budget.** Every Fall you write the budget: pick two priorities
  to fund and one to cut while a whip count updates live. If it fails anywhere,
  the government shuts down.
- **Breaking news.** Fifty events can hit a bill mid-fight: K Street comes
  calling, the CBO score lands, a faction leader issues an ultimatum, a
  filibuster threat, a whistleblower, a town-hall revolt in the state that hates
  the bill most, a parliamentarian ruling on the budget, a rival House bill, the
  President's 2 a.m. posts, a Supreme Court ruling, a snowstorm, a hot mic, a
  senator's resignation or death (the governor appoints a successor), even a
  party switch. Between bills the world keeps turning too: an economy that booms
  and busts, indictments, leaks, impeachment inquiries, and moments that need
  your call (a scandal in your caucus, a would-be defector, a book deal, the
  majority leader's offer).
- **Factions everywhere.** Every Senate faction has a public leader 👑. Members
  follow wherever their leader moves (30% of the way), leaders vote first in
  the roll call, and fence-sitters follow their vote. Leaders are seasoned, so
  they're harder to move, and the opposing whip goes after them too. The
  Factions tab shows every bloc at a glance. The House votes caucus by caucus (Progressive Caucus, Freedom
  Caucus, Blue Dogs…), and you can work each one through its chair. The
  President comes from a faction too, which shapes their vetoes and which
  senators follow them hardest.
- **Independents.** They answer to no whip: the other side can't pressure them
  and you can't twist their arms. Each has a cause, and will cut a deal: their
  vote for writing that cause into the bill. They also run against both parties
  in three-way races, and sometimes for President.
- **People with pasts.** Hundreds of diverse names. Every senator, governor,
  cabinet member, Vice President and candidate has an age, hometown, a life
  before politics and a political history that keeps growing as they vote,
  break ranks, win, lose, get appointed or run for president.
- **The Docket.** Between bills you choose what comes next: one of the
  leadership's picks, or your own bill on any issue, which is how you keep
  campaign promises. In the minority it takes a discharge petition.
- **The executive branch.** A Vice President and a 12-member cabinet. New
  presidents send their whole cabinet for confirmation, and you whip for or
  against each nominee. If a sitting senator joins the cabinet, their
  governor appoints a replacement, sometimes from the other party. Presidents
  sign executive orders (ask yours for one, or sue to block theirs), face
  foreign crises, and may ask Congress to authorize war; an unpopular war can
  be ended with a War Powers Resolution. Long, unpopular wars drain the
  President's approval; after two years Congress may force a War Powers vote
  onto the docket, and after five the President pulls out.
- **Off-year elections, mayors and statehouses.** Virginia and New Jersey
  elect governors the year after a presidential election; Kentucky,
  Louisiana and Mississippi the year before. They get their own Off-Year
  Election Night every November of an odd year, with mayors and state
  legislatures, read as a verdict on the President. Thirty-nine big-city
  mayors are characters with careers who run for governor, senator and
  president. All 50 state legislatures are tracked (real chamber sizes and
  calendars); the Statehouses view shows trifectas, chambers, governors and
  mayors.
- **Third parties.** Independents carry labels (Green, Democratic Socialist,
  Working Families, Forward, Common Ground, Libertarian, Heartland,
  Constitution). Every presidential year has an independent primary of its
  own, the Ballot Alliance, with state results and a convention; some years
  nobody qualifies, some years the field runs left to right. About once in
  15 cycles a heavyweight bolts and runs as a real independent: they can win
  states, throw the election to the House, or win the White House.
- **Governors.** All 50, elected on the real calendar (36 in midterms, 11 in
  presidential years, New Hampshire and Vermont every two years). They help
  their party's Senate candidates, appoint senators when seats open, and run
  for president.
- **The Pulse.** Presidential approval and the generic ballot over time,
  right track/wrong track, the issues voters care about, cable news chyrons
  and voices from the states. In presidential years it follows the horse race
  (both tickets, the national poll and its trend, the Electoral College map and
  the battlegrounds); every cycle it shows the Senate outlook: projected seats,
  your odds of control and the closest races.
- **The path to law.** After the Senate, a bill needs the House (435 seats,
  which you can whip for better odds), then the President's signature. An
  opposing President may veto it, and you can fight an override that needs 67
  senators. Once it's law, the Supreme Court may strike it down.
- **The Court.** Nine justices who age and retire. A friendly President's
  nominee means a confirmation fight; with an opposing President, a Senate
  majority can block their pick.
- **Campaign promises.** Before each election, run on a platform of up to
  three promises (protect healthcare, cut taxes, no shutdowns, think big…).
  They lift your candidates where voters care. If your party holds the Senate,
  you have six bills to deliver: kept promises pay off, broken ones cost you.
- **The opposing whip** has a personality: a Bulldog who works more senators,
  a Schemer who springs poison-pill amendments, or a Charmer whose visits land
  harder.
- **Senate primaries for every seat.** Every seat up holds a Democratic and
  a Republican primary, with real fields (mayors, House members, attorneys
  general, former senators coming back, self-funders) and runoffs in the
  South. Endorse up to three candidates in your party and plan their
  campaigns, or put quiet money on one in the other party's. Primary nights
  run from March to September with raw vote totals for every candidate,
  upsets, photo finishes and incumbents falling.
- **Race rooms.** Every Senate race on the campaign trail has a room: both
  nominees, a poll trend, the state's issues, both primaries' results, and
  your moves: debate prep, oppo research, a surrogate, a negative ad blitz, a
  tour with the candidate.
- **Primaries.** Before each election, senators who broke with the party line
  draw challengers from their flank. Protect them, back the challenger, or
  meddle in the other party's primaries.
- **Presidential primaries.** In the spring of each presidential year both
  parties hold primaries state by state, from Iowa through June, with fields
  of two to nine candidates: senators, governors, House members, cabinet
  secretaries, the Vice President, former officials and outsiders. **Endorse a
  candidate and you run their campaign**: before each contest you spend their
  days on the ground and their war chest on ads, pick the message, go negative
  on a rival, dial for dollars, call in favors from the party's governors and
  senators, and set the debate strategy. Every contest night reports full
  results for every state: raw vote totals for every candidate, shares,
  delegates and how each did against the final poll, with upsets, photo
  finishes, momentum, money and dropouts. A sitting President draws a
  challenger when their approval sags (rarely near 50%, almost always near
  30%, when the challenger can take them out, and a President may even bow
  out), and you can run the challenger. You can also undermine your own
  President and recruit one. Watch the other party's race too. Dropouts release
  their delegates, so a clinch is the norm and a contested convention the
  exception.
- **The conventions.** Each party holds a national convention in the summer,
  the out-party first. At yours you call the hall to order, pick the **running
  mate** from four candidates (a primary rival for unity, a swing-state senator,
  a governor, a wildcard; vet them for hidden risks, or dump a sitting Vice
  President), fight out the **platform** plank by plank between the flank and
  the center, choose the keynote speaker and the acceptance speech's tone, and
  ride out protests, hot mics, walkouts, leaked vetting files and hurricanes.
  The party leaves with a **bounce** and a unity score that carry into the
  fall. If nobody clinched, it's a **brokered convention**: ballot by ballot,
  you can back the frontrunner, engineer an upset or broker the runner-up onto
  the ticket. The other party's convention plays out on the news, with its own
  ticket, platform and bounce.
- **The fall campaign.** After the Senate primaries, the presidential race runs
  in five rounds: Labor Day (pick the message and the map: the Rust Belt, the
  Sun Belt, expand the map or turn out the base), the first debate (prep your
  nominee, choose a game plan against the opponent's), October (the running
  mates' debate and the second debate), the October Surprise (nineteen possible
  front pages, each with hard choices: leaked tapes, a hurricane, a Supreme
  Court bombshell, a running mate's gaffe, a third-party surge that makes the
  ballot…), and the final weekend (a last ad buy, senators as surrogates in the
  battlegrounds, turnout). A poll tracker and a live Electoral College
  projection move with every call. Campaign money is shared with the Senate
  races, so every unit spent on the ticket is one you can't spend on a seat.
  Or let the campaign run itself.
- **The midterm campaign.** In the years without a presidential race, the
  Senate gets its own three-round campaign: Labor Day (the message, and whether
  to defend, go on offense, nationalize the race around the President or keep
  every race local to blunt a bad wave), October (debates in the three closest
  races, a debate coach, and a midterm surprise with hard choices), and a
  closing weekend (ads, turnout, and surrogates: the President can help or
  hurt). A seat tracker shows where the Senate is heading; the other party
  plays the same game.
- **Elections.** Every two years (six bills): a third of the Senate, all 435
  House seats, and the White House every four years, decided by the Electoral
  College. Senators who voted against their state's interests are vulnerable.
  The campaign trail shows your chance in every race. Deploy money in one
  click (smart deploy, defend, or go on offense), fine-tune with +/− or by
  clicking states on the map, and fund the House and governors' races too.
  There's no cap on any race; each extra unit in the same place does a little
  less, so spreading money usually pays. Races are uncertain enough that
  roughly a third of them are in play every cycle. Each cycle also has a national environment
  with fat tails: most years are close, but roughly one in eight is a wave
  that sweeps the Senate, House, governorships and the White House together.
  Forecasters see most of a wave coming, but not all of it, so landslides are
  rare but never come from nowhere.
- **Election Night.** Results come in from east to west, with close races
  called last. The House is decided seat by seat across all 435 districts,
  each with its own representative. A projection banner lands the moment a ticket reaches 270 (or
  a deadlock sends it to the House), a decision-desk ticker logs every call,
  and each tab (President, Senate, House, Governors) has a map, a sortable
  table with swings since the last election, before-and-after seat counts, a
  balance-of-power chart, the popular vote and a closest-races chart. Browse
  races with Prev/Next or the arrow keys.
- **Full results and the Almanac.** After the count, **Full results** opens a
  detailed explorer: the tipping-point state, the ten states that decided it,
  bellwethers, biggest swings, regional popular vote, turnout and third-party
  share; Senate, House and governors' tables; and, in presidential years, the
  whole campaign: the poll tracker, both conventions, the debates, the October
  surprise, and the wave against the forecast. **The Almanac** in the whip's
  office keeps every past election, the presidents and the current standings.
- **A career.** Earn political capital and spend it: hire from 28 staff,
  earn 10 personal whip traits, and buy polls, war rooms, galas, oppo
  dossiers, committee seats, retirements and more. Keep your caucus's
  confidence. Lose it and you're done. Records are saved in your browser.

## Lead the Independents

The third career on the menu. You chair the **Independent caucus**: three
senators in a Senate split 48–49–3 (which party has 49 is a coin flip), so
neither party can organize without you.

- **Career start.** Pick your **banner** (Green, Forward, Common Ground,
  Libertarian, Heartland…): it decides what your caucus stands for. Then hold
  the **Organizing Resolution**: caucus with the Democrats, with the
  Republicans, or with no one. Your vote decides who runs the floor, and the
  winner pays for it in capital, gavels and floor votes.
- **The Bidding.** On almost every bill both parties' whips put a concession
  package on the table: the bill's owner pays you to pass it, the other party
  pays you to kill it. Take a deal, **name your price** (a gamble), or cast a
  **free vote** on your banner's merits. Your pick sets the aim, your
  **patron** (whose whip works their own senators for you every night) and
  your **foe** (whose whip is tonight's rival). Then you whip the whole Senate
  with the usual tools; your own caucus is twistable, and the rival can't touch
  it. At the end, concessions are paid or quietly forgotten, **trust** with
  each party and your **Lean** move, and a bill your votes decided earns a
  bonus. If most of your caucus breaks ranks on a deal or a free vote and that
  costs you the vote, the blame is yours.
- **The count and your price.** The Bidding opens with the count without your
  caucus, against the votes the bill really needs (60 for cloture, 67 for an
  amendment, a simple majority otherwise). On about two bills in three the
  parties land within your caucus's votes of that line: 🗝 **your votes decide
  it**, both offers go up, and whichever side you spurn fights for every vote.
  The rest are clearly carried or clearly dead, and the offers are thin: going
  with the count is a short whip, going against it a long one. Each card shows
  how many votes short you would start. Voting your banner is worth a vote at
  the start; a deal against it costs one.
- **Confidence as a kingmaker.** Losing a bill your votes could never have
  decided costs no confidence; losing one they did decide can. Every second
  bill you decide your banner's way restores a point of confidence, and three
  votes in a row against your banner cost one. Every second bill you decide
  brings a would-be candidate to your door (a free, stronger recruit for the
  next slate). Campaign promises are judged gently: a caucus can't pass laws
  alone, so a broken one costs independent mood, and only a term with none
  kept costs confidence.
- **Budgets and your own bills.** The floor party writes the budget; selling
  your votes or killing it is the bid. Your own reform agenda (stock-trading
  ban, open primaries, the Fix It Yourself Act…) reaches the floor through the
  minority tools and the floor votes your partner owes you.
- **The Caucus Room.** Between bills: the roster, trust and Lean, courting a
  defector, banking recruits, a reach-out tour, changing banner, or **the
  Jeffords** (switching partner mid-Congress). Parties will try to poach your
  members, and party senators sometimes want in.
- **Elections.** The party primaries are theirs (you can only meddle). Then
  comes the **Independent Slate**: recruit independents into open lanes, ask a
  party to **stand aside**, pick the slate's message. Maine and Alaska count
  ranked ballots. In presidential years you run the Ballot Alliance primary,
  pick a running mate and fight a **Third Force** fall campaign for the 15%
  debate line, with a possible cabinet offer to withdraw and an **Elector
  Gambit** if nobody reaches 270. With your caucus in the room, voters turn
  harder on whichever party gets within reach of running the Senate alone. The
  verdict is about caucus size and the balance of power. Lose every seat (unless the President is yours) and the
  career is over.

## Look and feel

A real map of the United States (state outlines from US Census boundary data,
via the us-atlas package) drives the whip view, the campaign trail, the
conventions, the fall campaign and Election Night, with callouts for the small
Northeast states. Every vote ends in a front page of *The Capitol Ledger*, and
breaking events, convention nights and October surprises arrive as newspaper
bulletins. Senators get illustrated portraits, the chamber has its desks and
rostrum, and a Hall of Legacy tracks your achievements and best legacy score.

## Files

| File | What it holds |
|---|---|
| `index.html` | The page shell |
| `style.css` | Base styling; `convention.css`, `campaign.css`, `midterm.css`, `results.css`, `events.css` style their modules |
| `game.js` | The Senate, whipping, the budget, the House, President and Court, Senate primaries, elections, the office, saving |
| `content.js` | Most of the bills, staff, whip traits, House caucuses and independent causes |
| `usmap.js` | State outlines (Albers USA projection), generated from us-atlas 3.0.1 |
| `art.js` | The map renderer, the Capitol illustration, portraits, the newspaper, the chamber backdrop |
| `depth.js` | Achievements and legacy, the opposing whip's personality and poison pills, campaign promises, headlines |
| `names.js` | Name pools, backgrounds, hometowns and generated political histories |
| `world.js` | Governors (including the off-year calendar), the VP and cabinet, executive orders, war, the Pulse (horse race, Senate outlook) |
| `floor.js` | The floor schedule: who sets it, minority and majority tools, pass/kill positions |
| `local.js` | Mayors, state legislatures and the Off-Year Election Night |
| `races.js` | Senate primaries for every seat, and the race rooms |
| `house.js` | All 435 House districts and their representatives |
| `indie.js` | Third-party labels, the independent presidential primary, the rare major independent |
| `primaries.js` | Presidential primaries, state by state, with ranked endorsements |
| `convention.js` | The two national conventions: running mates, platforms, speeches, brokered conventions, the bounce |
| `campaign.js` | The fall campaign: five rounds, debates, October surprises, strategy, surrogates, the battleground |
| `midterm.js` | The midterm campaign: the message and the map, Senate debates, surprises, the closing weekend |
| `events.js` | Breaking news on the floor, world news and moments between bills |
| `wing.js` | Your wing of the party and the feud with the White House |
| `night.js` | Election Night: the Electoral College, House results by state, the projection banner, ticker and tables |
| `results.js` | The election archive, the full-results explorer and the Almanac |
| `caucus.js` | The independent career: the banner, the Organizing Resolution, the Bidding, the Caucus Room, the slate, the Third Force campaign; `caucus.css` styles it |

## Testing a shortcut

To jump straight to an election, open the browser console and run:

```js
S.career.bills = 6; electionPrep();
```

For a whole presidential cycle, run the primaries first (`S.career.bills = 3;
primariesModal(() => {})`), then the conventions (`S.career.bills = 4;
conventionsModal(() => {})`), then the line above.

For the independent career: start it from the menu (**Lead the
Independents**), or with a headless harness pass `--party I` (it clicks
`#btn-new-i`, the first banner and an organizing choice). The same
`S.career.bills = 6; electionPrep();` reaches the Independent Slate, and
`cauAsk(() => {})` replays the current bill's Bidding.
