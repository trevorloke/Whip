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
  be ended with a War Powers Resolution.
- **Governors.** All 50, elected on the real calendar (36 in midterms, 11 in
  presidential years, New Hampshire and Vermont every two years). They help
  their party's Senate candidates, appoint senators when seats open, and run
  for president.
- **The Pulse.** Presidential approval and the generic ballot over time,
  right track/wrong track, the issues voters care about, cable news chyrons
  and voices from the states.
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
- **Presidential primaries.** In each presidential year both parties hold
  primaries state by state, from Iowa through June, with delegates and
  dropouts. Senators, House members, governors, cabinet secretaries and the
  Vice President run. Endorse a candidate to back a winner. Nominees pick
  running mates; in the fall, home states, running mates, candidate appeal,
  debates, wars and your battleground spending all move the Electoral College.
- **Elections.** Every two years (six bills): a third of the Senate, all 435
  House seats, and the White House every four years, decided by the Electoral
  College. Senators who voted against their state's interests are vulnerable.
  The campaign trail shows your chance in every race. Deploy money in one
  click (smart deploy, defend, or go on offense), fine-tune with +/− or by
  clicking states on the map, and fund the House and presidential races too.
  There's no cap on any race; each extra unit in the same place does a little
  less, so spreading money usually pays. Races are uncertain enough that
  roughly a third of them are in play every cycle. Each cycle also has a national environment
  with fat tails: most years are close, but roughly one in eight is a wave
  that sweeps the Senate, House, governorships and the White House together.
  Forecasters see most of a wave coming, but not all of it, so landslides are
  rare but never come from nowhere.
- **Election Night.** Results come in from east to west, with close races
  called last. You get a clickable map, President, Senate and House tabs, vote
  totals and percentages, live seat and electoral-vote tallies, a closest-races
  chart and the popular vote. Browse races with Prev/Next or the arrow keys.
- **A career.** Earn political capital and spend it: hire from 28 staff,
  earn 10 personal whip traits, and buy polls, war rooms, galas, oppo
  dossiers, committee seats, retirements and more. Keep your caucus's
  confidence. Lose it and you're done. Records are saved in your browser.

## Look and feel

A real map of the United States (state outlines from US Census boundary data,
via the us-atlas package) drives the whip view, the campaign trail and Election
Night, with callouts for the small Northeast states. Every vote ends in a front
page of *The Capitol Ledger*, and breaking events arrive as newspaper bulletins.
Senators get illustrated portraits, the chamber has its desks and rostrum, and
a Hall of Legacy tracks 21 achievements and your best legacy score.

## Files

| File | What it holds |
|---|---|
| `index.html` | The page shell |
| `style.css` | All styling |
| `game.js` | The Senate, whipping, events, the budget, the House, President and Court, primaries, elections, saving |
| `content.js` | Most of the bills, staff, whip traits, House caucuses and independent causes |
| `usmap.js` | State outlines (Albers USA projection), generated from us-atlas 3.0.1 |
| `art.js` | The map renderer, the Capitol illustration, portraits, the newspaper, the chamber backdrop |
| `depth.js` | Achievements and legacy, the opposing whip's personality and poison pills, campaign promises, headlines |
| `names.js` | Name pools, backgrounds, hometowns and generated political histories |
| `world.js` | Governors, the VP and cabinet, executive orders, war, the Docket, the Pulse, presidential primaries and the battleground |
| `night.js` | Election Night: the Electoral College, House results by state, and the results screen |

## Testing a shortcut

To jump straight to an election, open the browser console and run:

```js
S.career.bills = 6; electionPrep();
```
