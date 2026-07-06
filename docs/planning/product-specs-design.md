# LINGO — Product Specs & Design Plan

**Track:** Planning 1 of 2 (Product / Design)
**Owner:** Intissar Soulaiman
**Status:** In Progress
**Related card:** Planning: Product Specs & Design Plan (LINGO)
**Pairs with:** Planning: Technical Architecture & Tech Stack (LINGO)

---

## 1. Product Overview, Goals & User Roles

### 1.1 What is LINGO?

LINGO is a daily competitive word puzzle built on Hive, inspired by Wordle but built around a few extra layers:

- one shared global puzzle every day
- skill-based scoring (fewer guesses = higher score, not luck-based)
- a streak system that rewards daily consistency
- weekly themed challenges (DeFi week, NFT week, general vocab week, etc.)
- real blockchain rewards — HBD pool + LINGO token
- social sharing and leaderboard competition

Everyone plays the same word each day and tries to solve it in the fewest guesses possible. Performance is tracked through streaks and weekly rankings, and every guess is recorded on-chain, with the daily answer locked ahead of time using a commit-reveal scheme so it can't be leaked or tampered with.

### 1.2 Core Product Vision

The goal is to make LINGO a daily habit for Web3 users by combining:

- simple puzzle mechanics anyone can pick up (mass accessibility)
- competitive ranking to keep people coming back (retention loop)
- real crypto rewards that give the Hive ecosystem more utility
- community vocabulary themes that reflect Web3 culture

### 1.3 Goals

**Player goals**
- Solve the daily puzzle in as few guesses as possible
- Keep a daily streak going for reward multipliers
- Climb the weekly leaderboard
- Share results on Hive for social recognition
- Pick up Web3 vocabulary without it feeling like studying

**Product goals**
- High daily retention (build a real DAU habit loop)
- Organic/viral growth through shareable puzzle results
- Keep replay value high despite the 1-puzzle-a-day limit
- Reward skill and consistency, not luck
- Drive genuine utility for HBD and the LINGO token

### 1.4 User Roles

**Player (main user)**
Plays the one shared daily puzzle, submits guesses and gets Wordle-style feedback, tracks their streak/score/leaderboard rank, earns LINGO tokens and qualifies for the weekly HBD pool, and can share results as a Hive post.

**Admin**
Handles the operational side — controls daily puzzle selection, manages the word database (general + Web3 vocab), adjusts the difficulty progression schedule, oversees how rewards get distributed, and watches for cheating or abuse patterns.

**Puzzle Curator**
Focused specifically on content — creates or selects the daily word, builds out weekly themes (DeFi week, NFT week, etc.), keeps vocabulary balanced across difficulty and relevance, tags words by category and difficulty tier, and preps special formats like anagrams or fill-in-the-blank.

*Note: Admin and Puzzle Curator might be the same person for the MVP — worth confirming once the MVP feature scope is locked, since a dedicated admin panel probably isn't needed yet.*

---

## 2. Core Game Mechanics

### 2.1 Daily Core Loop

1. Player opens the daily puzzle
2. One shared word is live for every player globally
3. Player has a limited number of guesses (default 6)
4. After each guess, the system gives feedback: correct letter + position (green), correct letter + wrong position (yellow), letter not in word (gray)
5. Player solves it in as few attempts as possible
6. Result gets recorded and their streak updates
7. Player can (and is encouraged to) share their result to Hive

### 2.2 Guess Limit

- Default: 6 guesses, matching standard Wordle so it feels familiar right away
- Only one attempt per Hive account per day — stops spamming/farming, and ties into the anti-cheat rules on the technical side
- Can flex slightly by difficulty tier:
  - Easy week → 7 guesses
  - Normal week → 6 guesses
  - Hard/theme week → 5 guesses
- Since LINGO is one shared global puzzle, every player gets the same guess limit as everyone else on any given day — the variation (5–7) happens day-to-day based on difficulty tier, never player-to-player

### 2.3 Feedback System (Wordle-style)

-  Green — right letter, right position
-  Yellow — right letter, wrong spot
-  Gray — letter isn't in the word

This keeps the game skill-based rather than random — each guess narrows things down logically instead of relying on chance.

### 2.4 Word / Answer Format

- Single word, default 5–7 letters depending on difficulty
- Must be either a valid English word or a recognized Web3/Hive term
- No proper nouns, unless a specific theme week explicitly calls for it
- Vocabulary blends Hive/Web3 terms with everyday words — Hive-heavy words show up more as the week gets harder, everyday words dominate earlier in the week to stay accessible

### 2.5 Scoring System

Score is based on a combination of:
- number of guesses used (fewer = higher score)
- streak multiplier
- difficulty tier for that day/week

Rough logic: solving in 1 guess gives the highest score, solving in 6 gives the lowest "pass" score, and failing to solve means no reward and the streak resets.

### 2.6 Streak System

- Daily participation adds +1 to the streak
- Missing a day resets it back to zero
- Streaks feed into rewards:
  - 4+ consecutive weeks → multiplier boost
  - Consistent players carry more weight on the leaderboard

### 2.7 What This Means for the Technical Side

A few decisions here directly shape what Laura needs to build, so worth syncing on early:

- Guess limits (5–7 depending on tier) and daily reset timing → affects commit-reveal timing and the `daily_puzzles` / `guesses` schema
- One-attempt-per-account rule → ties into anti-cheat / one-account-per-solve logic
- Scoring + streak + multiplier logic → feeds directly into the reward/payout engine (HBD pool computation, LINGO token issuance)
- Variable word lengths for harder tiers → affects schema design and guess validation

---

## 3. Weekly Progression & Themes

### 3.1 Difficulty Ramp (Monday → Weekend)

The idea is for the week to gradually get harder as it goes:

- **Monday–Tuesday**: easiest words, everyday vocabulary, standard 5-letter format — a good on-ramp for the week
- **Wednesday–Thursday**: medium difficulty, more Hive/Web3 terms start showing up
- **Friday–Sunday**: hardest puzzles of the week, more Hive-heavy vocabulary, and this is also where we'd introduce the special formats like anagrams or fill-in-the-blank

One thing worth being explicit about here (Dr. Farhat flagged this): even though the guess limit shifts by day (5–7 depending on difficulty), it's still **one shared global puzzle** — so every player gets the exact same number of guesses as everyone else *on that day*. The difference is day-to-day, not player-to-player. Nobody's getting an easier or harder version than anyone else.

### 3.2 Weekly Themes

Each week can run with a theme that shapes which words show up:

- **DeFi Week** — liquidity, staking, yield, protocol, delegate, witness
- **NFT Week** — mint, rarity, collection, royalty, metadata
- **General Week** — mixed, everyday words, less Hive-specific
- **Advanced Week** — deeper, more technical crypto terms for players who are already familiar with the space

### 3.3 Vocabulary Sets

We're basically working with two pools: Hive/Web3 terms and normal English words. Early in the week (and during "General" weeks) it leans more toward normal words so it's not intimidating. As the week goes on, or during a themed week like DeFi/NFT, it shifts more toward the Hive-specific vocabulary.

The Puzzle Curator would be responsible for tagging each word — category (Hive/Web3 vs. general) and difficulty — so we can actually pull the right word for the right day/theme instead of doing it manually every time.

### 3.4 Harder Formats (Later in the Week / Theme Weeks)

- **Anagram mode** — scrambled letters, player has to unscramble
- **Fill-in-the-blank** — part of the word is shown, player fills in the rest

These probably won't stick to a fixed 5-letter format, so they'll need their own input/validation handling separate from the standard grid — something we'll flesh out more once we get to wireframes.

---

## 4. Reward System (Product Side)

### 4.1 Weekly HBD Pool — Qualification

To qualify for the weekly HBD prize pool, a player needs to solve **at least 5 out of that week's 7 daily puzzles**.

If someone solves fewer than 5, they just don't qualify for the HBD pool that week — their streak and any LINGO tokens they earned aren't affected, this rule only gates the HBD pool specifically.

### 4.2 Stacking Multipliers

These stack on top of a qualifying player's share of the pool:

| Multiplier | Condition |
|---|---|
| **2×** | Top 10 fastest solvers on a given day (see 4.3 for exactly how we're measuring "fastest") |
| **1.5×** | Solved all 7 puzzles that week (perfect week) |
| **1.25×** | Kept a qualifying streak for 4+ consecutive weeks |

So in theory, someone could stack all three — perfect week, 4+ week streak, and top 10 fastest on a given day — and get all multipliers applied to their share. We still need to lock down with Laura whether these stack additively or multiplicatively, since that changes the actual payout math.

### 4.3 Defining "Fastest Solver"

Since this drives a real reward (the 2× multiplier), it needs to be unambiguous for whoever's building it:

- Timer **starts** the moment the player submits their first guess for the day (not when they open the app — didn't want to punish someone who opens the app, thinks for a bit, then guesses)
- Timer **stops** the moment they submit the guess that solves it
- No pausing — once it starts, it just runs
- This has to be tracked server-side, not client-side, since it directly affects real money (HBD) and needs to be tamper-proof

### 4.4 Daily LINGO Token — What It's Actually For

Players earn LINGO daily just by solving the puzzle. Important distinction: we're not treating this token as having a guaranteed cash value — it's meant for in-game utility:

- **Hints** — spend LINGO to reveal a letter or narrow things down
- **Streak shield** — spend LINGO to protect your streak if you miss a day
- **Theme voting** — spend LINGO to have a say in upcoming weekly themes

### 4.5 A Note on Funding

A few things worth being upfront about here:

- **DHF grants** are not something we're relying on to fund the HBD pool. Grants are competitive and slow to secure, so we're treating this as a "maybe later" option, not part of the actual funding plan.
- **NFTs** aren't detailed in this doc yet. Before we commit to "cosmetic NFT sales" as a revenue source, we need a clear answer to what exactly we'd be selling — a placeholder idea isn't enough to build against.
- **LINGO token issuance and liquidity** still needs to be worked out with Laura before we finalize it. We're flagging this as an open item that needs alignment, not something already decided.

---