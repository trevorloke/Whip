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
- **The path to law.** After the Senate, a bill needs the House (435 seats,
  which you can whip for better odds), then the President's signature. An
  opposing President may veto it, and you can fight an override that needs 67
  senators. Once it's law, the Supreme Court may strike it down.
- **The Court.** Nine justices who age and retire. A friendly President's
  nominee means a confirmation fight; with an opposing President, a Senate
  majority can block their pick.
- **Elections.** Every two years (six bills): a third of the Senate, all 435
  House seats, and the White House every four years, decided by the Electoral
  College. Senators who voted against their state's interests are vulnerable.
  Spend campaign cash in close races.
- **Election Night.** Results come in from east to west, with close races
  called last. You get a clickable map, President, Senate and House tabs, vote
  totals and percentages, live seat and electoral-vote tallies, a closest-races
  chart and the popular vote. Browse races with Prev/Next or the arrow keys.
- **A career.** Earn political capital, hire staff, keep your caucus's
  confidence. Lose it and you're done. Records are saved in your browser.

## Files

| File | What it holds |
|---|---|
| `index.html` | The page shell |
| `style.css` | All styling |
| `game.js` | The Senate, bills, whipping, events, the House, President and Court, elections, saving |
| `night.js` | Election Night: the Electoral College, House results by state, and the results screen |

## Testing a shortcut

To jump straight to an election, open the browser console and run:

```js
S.career.bills = 6; electionPrep();
```
