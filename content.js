'use strict';
/* =====================================================================
   CONTENT — the bulk of the bills, staff, whip traits, House caucuses
   and independent causes. Loaded after game.js; extends its tables.
   ===================================================================== */

AGENDA.D.push(
  ['Student Debt Relief Act', 'Cancel up to $20,000 per borrower.', { welfare: 2, urban: 1, taxes: -2, economy: 1 }],
  ['Safer Communities Act', 'Universal background checks and red-flag laws.', { urban: 2, rural: -2, security: 1 }],
  ['Voting Access Act', 'Automatic registration and two weeks of early voting.', { urban: 2, welfare: 1, rural: -1, security: -1 }],
  ['Worker Organizing Act', 'Make it easier to form a union.', { economy: 1, welfare: 2, taxes: -1, tech: -1 }],
  ['Billionaire Minimum Tax', 'A 25% floor on the very richest.', { taxes: -3, welfare: 2, urban: 1 }],
  ['Clean Water for All Act', 'Replace every lead pipe in America.', { environment: 2, welfare: 1, rural: 1, taxes: -1 }],
  ['Public Option Act', 'A government health plan anyone can buy.', { welfare: 3, taxes: -2, economy: -1 }],
  ['Electric Vehicle Rebate Act', '$7,500 back on every EV.', { environment: 2, tech: 2, taxes: -1, economy: 1, rural: -1 }],
  ['Immigration Pathway Act', 'Citizenship for Dreamers and farmworkers.', { economy: 2, urban: 1, security: -2 }],
  ['Paid Sick Days Act', 'Seven paid sick days for every worker.', { welfare: 2, economy: -1 }],
  ['Corporate Accountability Act', 'Jail time for executives who cook the books.', { economy: -1, welfare: 1, taxes: -1, tech: -1 }],
  ['Big Tech Competition Act', 'Break up the platforms that buy their rivals.', { tech: -2, economy: 1, urban: -1 }],
  ['Wildlands Protection Act', 'Protect 30% of federal land by 2035.', { environment: 3, rural: -2, economy: -1 }],
  ['Housing First Act', 'End chronic homelessness with permanent housing.', { urban: 2, welfare: 2, taxes: -1 }],
  ['Medicaid Expansion Incentive Act', 'Pay holdout states to expand Medicaid.', { welfare: 3, rural: 1, taxes: -2 }],
  ['Free Community College Act', 'Two years tuition-free.', { welfare: 2, economy: 1, taxes: -2, tech: 1 }],
  ['Climate Resilience Corps', 'Hire 300,000 young people to harden towns against disaster.', { environment: 2, economy: 1, rural: 1, taxes: -2 }],
  ['Insulin Price Cap Act', '$35 a month, for everyone.', { welfare: 2, tech: -1 }],
  ['Child Care for Working Families', 'No family pays more than 7% of income on child care.', { welfare: 3, taxes: -2, urban: 1 }],
  ['Equal Pay Enforcement Act', 'Close the loopholes in pay discrimination law.', { welfare: 2, economy: -1, urban: 1 }],
);
AGENDA.R.push(
  ['Flat Tax Act', 'One rate for everyone. File on a postcard.', { taxes: 3, welfare: -2, urban: -1 }],
  ['Concealed Carry Reciprocity Act', 'A carry permit from one state counts in all fifty.', { rural: 2, security: 1, urban: -2 }],
  ['Election Integrity Act', 'Photo ID and cleaner voter rolls.', { security: 2, rural: 1, urban: -2 }],
  ['National Right to Work Act', 'No one can be forced to pay union dues.', { economy: 2, taxes: 1, welfare: -2 }],
  ['Death Tax Repeal', 'End the estate tax, save the family farm.', { taxes: 3, rural: 1, welfare: -1 }],
  ['Permitting Reform Act', 'Build pipelines and power lines in two years, not ten.', { economy: 2, environment: -2, tech: 1 }],
  ['Coal Country Revival Act', 'Keep the plants open and the miners working.', { economy: 2, rural: 2, environment: -3 }],
  ['Welfare Work Requirements Act', 'Able-bodied adults work, train or volunteer.', { welfare: -2, taxes: 2, economy: 1 }],
  ['Space Force Expansion Act', 'A bigger budget for the newest service.', { security: 2, tech: 2, taxes: -1 }],
  ['Sanctuary City Accountability Act', 'Cut grants to cities that shield illegal immigrants.', { security: 2, urban: -2, rural: 1 }],
  ['Federal Workforce Reduction Act', 'Shrink the bureaucracy by 10%.', { taxes: 2, economy: 1, welfare: -1, urban: -1 }],
  ['Offshore Drilling Expansion Act', 'Open new leases in the Gulf and off Alaska.', { economy: 2, environment: -2, taxes: 1 }],
  ['Health Savings Account Expansion', 'Bigger tax-free health accounts for everyone.', { taxes: 2, welfare: -1, economy: 1 }],
  ['American Tariff Protection Act', 'A 10% tariff on all imports.', { economy: 2, rural: -1, tech: -1, taxes: -1 }],
  ['Back the Blue Act', 'Guaranteed funding for local police.', { security: 3, taxes: -1, urban: 1 }],
  ['Farm Freedom Act', 'Roll back federal rules on ranches and farms.', { rural: 3, environment: -2 }],
  ['Digital Asset Freedom Act', 'Light-touch rules for crypto.', { tech: 3, taxes: 1, security: -1 }],
  ['REINS Act', 'Every major regulation needs a vote of Congress.', { economy: 2, taxes: 1, environment: -1, welfare: -1 }],
  ['School Safety Act', 'An armed officer in every school.', { security: 2, rural: 1, taxes: -1 }],
  ['Lower Gas Prices Act', 'Suspend the federal gas tax for a year.', { taxes: 2, rural: 1, environment: -2 }],
);
AGENDA.both.push(
  ['Water Infrastructure Act', 'Dams, levees and treatment plants.', { environment: 1, rural: 1, urban: 1, taxes: -1 }],
  ['Kids Online Safety Act', 'Make platforms protect children.', { tech: -2, welfare: 1, security: 1 }],
  ['Postal Service Reform Act', 'Save rural mail delivery.', { rural: 2, welfare: 1, taxes: -1 }],
  ['Childhood Cancer Research Act', 'Double the research budget for pediatric cancer.', { welfare: 1, tech: 2, taxes: -1 }],
  ['Mental Health Parity Act', 'Insurers must cover mental health like physical health.', { welfare: 2, economy: 1, taxes: -1 }],
  ['Shipbuilding Revival Act', 'Bring back American shipyards.', { security: 2, economy: 2, taxes: -2 }],
  ['Railroad Safety Act', 'New rules after another derailment.', { security: 1, rural: 1, economy: -1 }],
  ['Drought Response Act', 'Water for the West.', { rural: 2, environment: 1, taxes: -1 }],
  ['AI Safety and Innovation Act', 'Testing standards for frontier AI.', { tech: 2, security: 1, economy: -1 }],
  ['Congressional Stock Trading Ban', 'Members of Congress can\'t trade individual stocks.', { economy: -1, welfare: 1, taxes: 1 }],
  ['Sunshine Protection Act', 'Make daylight saving time permanent.', { economy: 1, rural: -1 }],
  ['Hospital Price Transparency Act', 'Hospitals must post their prices.', { welfare: 2, taxes: 1, tech: -1 }],
  ['National Parks Restoration Act', 'Fix the trails, roads and lodges.', { environment: 2, rural: 1, taxes: -1 }],
  ['Cybersecurity Modernization Act', 'Harden the grid and the hospitals.', { security: 2, tech: 2, taxes: -1 }],
  ['Highway Trust Fund Fix', 'Keep the road money flowing.', { economy: 1, rural: 1, urban: 1, taxes: -2 }],
  ['Organ Donor Act', 'Shorten the transplant waiting list.', { welfare: 2, taxes: -1 }],
  ['Air Traffic Control Upgrade', 'Replace the floppy disks.', { tech: 2, economy: 1, taxes: -1 }],
  ['Wildfire Insurance Act', 'Keep homes insurable in fire country.', { rural: 2, environment: 1, taxes: -1 }],
  ['Fentanyl Interdiction Act', 'Scanners at every port of entry.', { security: 3, welfare: 1, taxes: -1 }],
  ['Small Farm Credit Act', 'Cheap loans for young farmers.', { rural: 2, economy: 1, taxes: -1 }],
  ['Semiconductor Workforce Act', 'Train the technicians the new fabs need.', { tech: 2, economy: 2, taxes: -1 }],
  ['Military Families Act', 'Child care and jobs for military spouses.', { security: 2, welfare: 1, taxes: -1 }],
  ['Robocall Crackdown Act', 'Make spam calls cost the spammers.', { tech: 1, welfare: 1, economy: -1 }],
  ['Great Lakes Restoration Act', 'Clean up the lakes and stop the carp.', { environment: 2, economy: 1, taxes: -1 }],
);
LANDMARKS.D.push(
  ['Universal Child Care Guarantee', 'A seat for every child. Needs 60 for cloture.', 60, { welfare: 4, taxes: -2, urban: 1 }],
  ['Democracy Restoration Act', 'Voting rights, ethics and campaign finance in one package. Needs 60.', 60, { urban: 2, welfare: 1, security: -1, rural: -2 }],
);
LANDMARKS.R.push(
  ['Fair Tax Overhaul', 'Replace the income tax with a national sales tax. Needs 60.', 60, { taxes: 4, welfare: -2, economy: 1 }],
  ['Energy Dominance Act', 'Every barrel, every ton, every cubic foot. Needs 60.', 60, { economy: 3, environment: -4, rural: 1 }],
);
LANDMARKS.both.push(
  ['Debt Ceiling Showdown', 'Raise the limit or the Treasury defaults. Needs 60.', 60, { economy: 2, taxes: -1, welfare: 1 }],
  ['Comprehensive Immigration Reform', 'Border security and legal status in one grand bargain. Needs 60.', 60, { security: 2, economy: 2, urban: 1, rural: -1 }],
  ['Social Security Solvency Act', 'Keep the checks coming for 75 more years. Needs 60.', 60, { welfare: 3, taxes: -2 }],
  ['Constitutional Amendment: Congressional Term Limits', 'Amending the Constitution takes two-thirds: 67 votes.', 67, { taxes: 1, welfare: 1, security: 1, tech: -1 }],
);
AMENDMENTS.push(
  ['Small Business Carve-Out', { economy: 1, taxes: 1, welfare: -1 }],
  ['Tribal Nations Set-Aside', { rural: 1, welfare: 1, taxes: -1 }],
  ['Cybersecurity Requirements', { security: 1, tech: 1, economy: -1 }],
  ['Veterans Preference', { security: 1, welfare: 1 }],
);

/* ---------------- staff (hired) and whip traits (earned) ---------------- */
// [name, description, cost, kind]; kind 'trait' = a personal whip trait, otherwise staff
Object.assign(PERKS, {
  scheduler: ['Scheduler', 'Every bill gets a sixth day on the floor.', 6],
  housewhip: ['House Liaison', 'House odds +10% on every bill.', 4],
  whliaison: ['White House Liaison', 'The President can call two senators per bill, and veto risk drops 15%.', 5],
  legal: ['Legal Team', 'Your laws are half as likely to be struck down by the Court.', 4],
  bundler: ['Bundler', '+2 capital after every win.', 6],
  ethics: ['Ethics Counsel', 'Scrutiny fades three times as fast, and scandals don\'t freeze your earmarks.', 3],
  chef: ['Caucus Chef', 'Caucus Lunch costs 1 action instead of 2.', 4],
  parl: ['Parliamentarian Whisperer', 'Amendments cost 1 action, and you see six to choose from.', 5],
  tracker: ['Vote Tracker', 'See which senators the opposing whip will target tonight (🎯).', 4],
  field: ['Field Director', 'Your party\'s incumbents get +3 in every general election.', 5],
  recruiter: ['Candidate Recruiter', 'Your challengers get +3 against opposing incumbents, and +15% in primaries you back.', 5],
  social: ['Social Media Team', 'Online clap-backs always land, and opinion never drifts down overnight.', 3],
  wonk: ['Policy Wonk', 'A mismatched pitch never backfires (at worst +2).', 3],
  constit: ['Constituent Services', 'Senators facing re-election get +6 toward your bills.', 4],
  lobbyist: ['Former Lobbyist', '+$20M earmarks per bill, and earmarks land 5 points harder.', 4],
  pollmap2: ['Ground Game', '+2 campaign cash every election.', 4],
  silver: ['Silver Tongue', 'Your pitches land 25% harder.', 6, 'trait'],
  ironfist: ['Iron Fist', 'Arm-twisting is 20% stronger and never costs you a relationship.', 6, 'trait'],
  dealmaker: ['Dealmaker', 'Promises land 20% harder, and repaying a favor costs 1 capital.', 6, 'trait'],
  workhorse: ['Workhorse', '+1 action every day.', 8, 'trait'],
  kingmaker: ['Kingmaker', 'Faction leaders pull their members 50% of the way (normally 30%).', 7, 'trait'],
  bridge: ['Bridge-Builder', 'Everything you do to opposing and independent senators is 30% stronger.', 7, 'trait'],
  teflon: ['Teflon', 'Earmarks and dirt draw half the scrutiny.', 5, 'trait'],
  beloved: ['Beloved', 'Every senator starts each bill 4 points warmer to you.', 8, 'trait'],
  closer: ['The Closer', 'Senators on the fence break your way more often.', 6, 'trait'],
  hardball: ['Hardball', 'The opposing whip\'s overnight pressure is 30% weaker.', 6, 'trait'],
});
const isTrait = p => PERKS[p][3] === 'trait';

/* ---------------- House caucuses ---------------- */
// [name, share of the party's House seats, issue tilt]
const HOUSE_FAC = {
  D: [['Progressive Caucus', 0.42, { welfare: 1, environment: 1, urban: 0.5, taxes: -0.6, security: -0.5 }], ['New Democrat Coalition', 0.33, { tech: 1, economy: 0.6, taxes: 0.3 }], ['Labor Caucus', 0.12, { economy: 1, welfare: 0.8, environment: -0.4 }], ['Blue Dog Coalition', 0.13, { security: 0.8, taxes: 0.6, rural: 0.6, environment: -0.5 }]],
  R: [['Freedom Caucus', 0.18, { taxes: 1.4, welfare: -1, security: 0.5 }], ['Republican Study Committee', 0.42, { economy: 1, security: 0.8, tech: 0.4 }], ['America First Caucus', 0.25, { rural: 1, welfare: 0.5, economy: 0.5, tech: -0.6 }], ['Main Street Caucus', 0.15, { environment: 0.6, welfare: 0.5, taxes: -0.3 }]],
};

/* ---------------- independents ---------------- */
// each independent senator has a cause they will trade their vote for
const IND_CAUSES = [
  ['Term Limits', 'taxes'], ['Lower Drug Prices', 'welfare'], ['Rural Hospitals', 'rural'], ['Clean Energy Jobs', 'environment'],
  ['Balanced Budgets', 'taxes'], ['Veterans First', 'security'], ['Broadband Everywhere', 'tech'], ['Affordable Housing', 'urban'],
  ['Made in America', 'economy'], ['Public Lands', 'environment'],
];
