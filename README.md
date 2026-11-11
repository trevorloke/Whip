# Floor Fight

A browser game about whipping votes in the United States Senate. You are your
party's whip: count the votes, twist the arms, survive the roll call, then
survive the next election.

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
  party, faction (Progressives, Blue Dogs, Freedom Caucus, Establishment…) and
  home state's lean and interests. Regular bills need 51 votes, or 50 plus the
  Vice President; landmark bills need 60 to beat a filibuster; treaties need 67.
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
  called last. A projection banner lands the moment a ticket reaches 270 (or
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
| `world.js` | Governors, the VP and cabinet, executive orders, war, the Docket, the Pulse (horse race, Senate outlook) |
| `primaries.js` | Presidential primaries, state by state, with ranked endorsements |
| `convention.js` | The two national conventions: running mates, platforms, speeches, brokered conventions, the bounce |
| `campaign.js` | The fall campaign: five rounds, debates, October surprises, strategy, surrogates, the battleground |
| `midterm.js` | The midterm campaign: the message and the map, Senate debates, surprises, the closing weekend |
| `events.js` | Breaking news on the floor, world news and moments between bills |
| `night.js` | Election Night: the Electoral College, House results by state, the projection banner, ticker and tables |
| `results.js` | The election archive, the full-results explorer and the Almanac |

## Testing a shortcut

To jump straight to an election, open the browser console and run:

```js
S.career.bills = 6; electionPrep();
```

For a whole presidential cycle, run the primaries first (`S.career.bills = 3;
primariesModal(() => {})`), then the conventions (`S.career.bills = 4;
conventionsModal(() => {})`), then the line above.
