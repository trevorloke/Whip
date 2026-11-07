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
- **Bills.** 100 of them, plus the yearly budget: each party's agenda, bipartisan deals (more of
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
- **The path to law.** After the Senate, a bill needs the House (435 seats,
  which you can whip for better odds), then the President's signature. An
  opposing President may veto it, and you can fight an override that needs 67
  senators. Once it's law, the Supreme Court may strike it down.
- **The Court.** Nine justices who age and retire. A friendly President's
  nominee means a confirmation fight; with an opposing President, a Senate
  majority can block their pick.
- **Primaries.** Before each election, senators who broke with the party line
  draw challengers from their flank. Protect them, back the challenger, or
  meddle in the other party's primaries.
- **Elections.** Every two years (six bills): a third of the Senate, all 435
  House seats, and the White House every four years, decided by the Electoral
  College. Senators who voted against their state's interests are vulnerable.
  The campaign trail shows your chance in every race. Deploy money in one
  click (smart deploy, defend, or go on offense), fine-tune with +/− or by
  clicking states on the map, and fund the House and presidential races too.
- **Election Night.** Results come in from east to west, with close races
  called last. You get a clickable map, President, Senate and House tabs, vote
  totals and percentages, live seat and electoral-vote tallies, a closest-races
  chart and the popular vote. Browse races with Prev/Next or the arrow keys.
- **A career.** Earn political capital and spend it: hire from 28 staff,
  earn 10 personal whip traits, and buy polls, war rooms, galas, oppo
  dossiers, committee seats, retirements and more. Keep your caucus's
  confidence. Lose it and you're done. Records are saved in your browser.

## Files

| File | What it holds |
|---|---|
| `index.html` | The page shell |
| `style.css` | All styling |
| `game.js` | The Senate, whipping, events, the budget, the House, President and Court, primaries, elections, saving |
| `content.js` | Most of the bills, staff, whip traits, House caucuses and independent causes |
| `night.js` | Election Night: the Electoral College, House results by state, and the results screen |

## Testing a shortcut

To jump straight to an election, open the browser console and run:

```js
S.career.bills = 6; electionPrep();
```
