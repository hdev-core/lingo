# LINGO — Product Specs & Design Plan

**Track:** Planning 1 of 2 (Product / Design)
**Owner:** Intissar Soulaiman
**Status:** Complete
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

Everyone plays the same word each day and tries to solve it in the fewest guesses possible. Performance is tracked through streaks and weekly rankings, player activity and puzzle results are securely recorded to support transparency, leaderboard accuracy, and reward distribution, with the daily answer locked ahead of time using a commit-reveal scheme so it can't be leaked or tampered with.

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
  - For the full product vision, guess limits may vary by difficulty tier as described above. However, the MVP launches with a fixed 6-guess system across all days, to simplify balancing and validate the core gameplay loop before introducing that added complexity.
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
- applicable reward multipliers
- difficulty tier for that day/week

Rough logic: solving in 1 guess gives the highest score, solving in 6 gives the lowest "pass" score, and failing to solve means no reward and the streak resets.

### 2.6 Streak System

- Daily participation adds +1 to the streak
- Missing a day resets it back to zero
- Streaks feed into rewards:
  - 4+ consecutive weeks → multiplier boost
  - Consistent players carry more weight on the leaderboard

### 2.7 What This Means for the Technical Side

A few decisions here directly shape what Laura needs to build, so it requires early alignment:

- Guess limits (5–7 depending on tier) and daily reset timing → affects commit-reveal timing and the `daily_puzzles` / `guesses` schema
- One-attempt-per-account rule → ties into anti-cheat / one-account-per-solve logic
- Scoring + streak + multiplier logic → feeds directly into the reward/payout engine (HBD pool computation, LINGO token issuance)
- Variable word lengths for harder tiers → affects schema design and guess validation
- The product rules defined throughout this document (scoring, streak, multipliers, qualification) act as the source of truth for Laura's payout engine implementation

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

These stack **additively** on top of a qualifying player's base weekly pool share — confirmed with Laura, since this determines exactly how the payout engine calculates final rewards.

| Multiplier | Condition | Bonus |
|---|---|---|
| **Fast Solver** | Top 10 fastest solvers on a given day (see 4.3) | +100% (2×) |
| **Perfect Week** | Solved all 7 puzzles that week | +50% (1.5×) |
| **Loyalty** | Qualifying streak of 4+ consecutive weeks | +25% (1.25×) |

**Formula:** `Final reward weight = base_share × (1 + bonus_1 + bonus_2 + bonus_3)`

**Example:** a player hitting all three earns `base_share × (1 + 1 + 0.5 + 0.25)` = `base_share × 2.75` — a maximum of 2.75× their base share.

Additive stacking was chosen because it keeps payouts linear and easy for any player to verify by hand against the published rules, rather than compounding unpredictably.

### 4.3 Defining "Fastest Solver"

Since this drives a real reward (the 2× multiplier), it needs to be unambiguous for whoever's building it:

- Timer **starts** the moment the player submits their first guess for the day (not when they open the app — this avoids penalizing players who take time to think before their first guess)
- Timer **stops** the moment they submit the guess that solves it
- No pausing — once it starts, it just runs
- This has to be tracked server-side, not client-side, since it directly affects real money (HBD) and needs to be tamper-proof

### 4.4 Daily LINGO Token — Economics & Utility

*Note: the economics below are a working proposal pending confirmation with Laura, since they directly drive her Hive-Engine issuance implementation.*

**Issuance schedule & supply**
- A fixed daily issuance of **~500 LINGO tokens** is minted and distributed among that day's successful solvers.
- At 500/day, annual issuance is approximately **182,500 LINGO/year** — LINGO is **not supply-capped** at MVP; it's an ongoing inflationary faucet, sized against the spend sinks below to avoid runaway inflation or player token hoarding with nothing to spend it on.
- The exact per-solve split of the daily 500 (e.g., flat share vs. weighted by speed/streak) is still being finalized with Laura.

**Faucet vs. sink balance**
For the token to stay healthy, roughly as much LINGO should be spent (sunk) as is issued (the faucet), rather than endlessly accumulating in player wallets:

| Sink | Proposed cost | Notes |
|---|---|---|
| Hint (reveal a letter) | ~20 LINGO | Limited to 1/day/puzzle (see §5.2), capping max daily sink per player |
| Streak shield | ~50 LINGO | Used to protect a streak after a missed day |
| Theme voting | ~10 LINGO | Spent per vote; cheap to encourage participation |

At ~500/day issued across successful solvers, and an estimated MVP player base in the low hundreds (per Technical Architecture's ~500-player theoretical target), the hint/shield/vote sinks are sized to plausibly absorb a meaningful share of daily issuance once those features ship post-MVP — but this is a rough estimate, not a modeled economy, and should be revisited once real usage data exists.

**Closed-loop utility, not external value**
LINGO is being treated as a **closed-loop utility credit** for MVP and the near term — it has no promised exchange value, isn't marketed as an investment, and its only function is spending on the sinks above. Whether it ever gains external/market value (e.g., becomes tradeable on Hive-Engine markets) is an open question explicitly deferred — not a claim being made now. This keeps LINGO's utility framing honest and avoids implying speculative value it doesn't have.

**What LINGO is spent on:**
- **Hints** — reveal a letter or narrow down possible answers
- **Streak shield** — protect an existing streak if a day is missed
- **Theme voting** — participate in choosing upcoming weekly themes

### 4.5 HBD Pool Funding Model

*Note: this funding model is a proposal pending final confirmation with Dr. Farhat — the numbers below are a starting point for that conversation, not a locked commitment.*

The weekly HBD pool needs a concrete, externally-funded source — this is what makes LINGO's reward system structurally different from player-funded wagering (see competitive-analysis.md §1). The funding model has a primary source and two fallbacks, in order of reliance:

**Primary source: Platform treasury seed**
The pool starts funded by a small, fixed weekly seed from the project's own operating budget — proposed at **5–10 HBD/week** to start. This is deliberately modest, sized to what a 2-person student project can sustain without external funding, and matches the low-cost infrastructure approach already established in the Technical Architecture (~$1–6/month hosting).

**Fallback 1: Sponsor pipeline**
Once LINGO has real usage data (post-MVP), sponsor-funded weeks (see competitive-analysis.md §2) can supplement or replace the treasury seed for specific weeks. This is not available at launch — it depends on having an active player base worth sponsoring.

**Fallback 2: DHF backstop**
A DHF grant is treated as a long-shot backstop, not a funding plan (per earlier CEO feedback — DHF applications are competitive and slow). If ever secured, it would supplement the treasury seed rather than replace the need for one.

**Why this holds up the "not gambling" claim:** even at the minimum proposed seed (5 HBD/week), the pool's money originates from the platform's own treasury, not from other players' losses — preserving the structural distinction from HiveWord's player-funded wagering model, regardless of how modest the amount is at launch.

**Other funding notes:**
- **NFTs** aren't detailed here yet, since it needs a concrete answer to what's being sold — not treated as a funding source until scoped.
- **LINGO token issuance and liquidity** is addressed separately in §4.4.

---

## 5. Streak, Hint, and One-Click Share-to-Hive UX

### 5.1 Streak UX

The streak is meant to be the thing that makes players come back daily, so it needs to feel visible and rewarding without being annoying.

- **Where it shows up:** Streak count is visible right on the main puzzle screen (not buried in a profile page) so players see it every time they open the app
- **Visual treatment:** A simple counter with a small flame or similar icon next to it — something that feels good to watch grow, similar to how Duolingo or Snapchat handle streaks
- **When it updates:** Right after a player solves (or fails) that day's puzzle
- **Missed a day:** If a player doesn't play, their streak resets to 0 the next day — unless they used a streak shield (see hints below) to protect it
- **Milestone moments:** Small callouts at meaningful streak lengths (e.g., 7 days, 30 days) — nothing complicated for v1, just a short congratulatory message/animation to make the milestone feel earned

### 5.2 Hint UX

Hints are spent using LINGO tokens (covered in Section 4.4), so the flow needs to make that cost clear before a player commits to using one.

- **Where hints live:** A hint button next to the guess input, visible but not distracting from the main puzzle grid
- **Before using a hint:** Player sees how many LINGO tokens the hint will cost and their current balance, so there's no surprise deduction
- **What a hint does:** Reveals one correct letter in its correct position (exact hint mechanics — e.g., which letter gets revealed — can be refined later, but this is the baseline behavior for v1)
- **Limit:** One hint per day per puzzle, to keep the core "fewest guesses" scoring meaningful and stop hints from trivializing the game
- **Streak shield as a hint-adjacent feature:** Also purchasable with LINGO, used proactively (before a missed day) or possibly retroactively within a short grace window (exact grace-period rule to be confirmed) to protect an existing streak from resetting

### 5.3 Share-to-Hive UX

This is the main organic growth lever for LINGO, so it needs to be as close to one-click as possible.

- **When it appears:** Immediately after a player finishes their puzzle attempt (solved or not), on the results screen
- **What gets shared:** A simple, spoiler-free grid (like Wordle's colored-square share format) showing the player's guess pattern without revealing the actual word, plus their score/streak
- **The action:** A single "Share to Hive" button that posts the result directly as a Hive post — no copy-pasting, no leaving the app
- **Why it matters technically:** Since this creates an actual Hive post, it should reuse the same Keychain-based flow already used for guesses/login, so the player isn't asked to re-authenticate separately just to share

---

## 6. Core Features List + MVP Cut

### 6.1 Core Features (Full Vision)

- One shared daily puzzle with Wordle-style feedback
- Guess limit that varies by difficulty tier (5–7)
- Weekly difficulty ramp + themed weeks (DeFi, NFT, General, Advanced)
- Harder puzzle formats (anagrams, fill-in-the-blank)
- Streak system with visual tracking and milestones
- Hint system (spend LINGO)
- Streak shield (spend LINGO)
- Theme voting (spend LINGO)
- Weekly HBD prize pool with qualification + stacking multipliers
- Daily LINGO token issuance
- One-click share-to-Hive
- Leaderboard (daily fastest solvers + weekly rankings)
- Commit-reveal system for daily answer integrity
- Cosmetic NFTs (visual customization, no gameplay effect)
- Sponsored theme weeks (Hive projects sponsor a themed week)
- DHF grant funding for the prize pool
- Premium HBD-purchasable features

### 6.2 MVP Cut — What Ships in v1

To keep the first version realistic and buildable, the MVP focuses only on what's needed to prove the core loop works:

**In v1:**
- One shared daily puzzle + Wordle-style feedback
- Fixed guess limit (start with a flat 6, hold off on the 5–7 difficulty-based variation until the core loop is validated)
- Basic weekly theme rotation (can start with 1–2 themes, doesn't need the full theme catalog on day one)
- Streak tracking (basic version, no shield yet)
- Weekly HBD pool with the ≥5/7 qualification rule and the fast-solver/perfect-week/loyalty multipliers, applied additively (see Section 4.2) — confirmed as part of v1, not deferred
- Daily LINGO token issuance
- One-click share-to-Hive
- Basic leaderboard (daily + weekly)
- Commit-reveal system (this is core to trust, not optional even for MVP)

**Deferred to later phases (explicitly out of v1):**
- Hint system (spend LINGO) — nice-to-have, not core to proving the loop
- Streak shield
- Theme voting
- Harder puzzle formats (anagrams, fill-in-the-blank)
- Cosmetic NFTs
- Sponsored theme weeks
- DHF grant funding
- Premium HBD-purchasable features

The reasoning here: v1 should prove that people will play daily and that the reward loop (HBD pool + LINGO token) actually works end-to-end. Everything deferred adds depth and monetization but isn't needed to validate that core hypothesis — and several of them (NFTs, DHF, sponsorships) were already flagged as not concrete enough to commit to yet.

---

## 7. Primary User Flows & Wireframe Planning

### 7.1 Primary User Flow

The main goal here is to keep friction low so playing daily actually becomes a habit. The player should move from logging in to playing, sharing, and checking their rewards without the flow feeling clunky.

**Main flow:**
Hive Keychain login → Daily puzzle → Submit guesses → View result → Share to Hive → Track streak & leaderboard → Receive weekly rewards

**Broken down in more detail:**

**1. Authentication**
Player opens LINGO and connects using Hive Keychain. Their identity gets verified through their Hive account, and once logged in, they're taken straight to the daily puzzle — no extra steps in between.

**2. Daily Puzzle Gameplay**
Player sees the one puzzle shared by everyone that day. The screen shows their current streak, attempts remaining, the guess grid, and an interactive keyboard (plus a hint button once that feature exists post-MVP). After each guess, they get Wordle-style feedback — green for correct letter and position, yellow for correct letter wrong position, gray for not in the word at all.

**3. Results & Sharing**
Once they finish (solved or not), they see their completion status, score, guess count, updated streak, and LINGO tokens ea rned. From here they can share a spoiler-free result directly to Hive.

**4. Progress Tracking**
Player can check the daily ranking, weekly leaderboard, their current streak, and how close they are to qualifying for that week's reward.

**5. Weekly Reward Flow**
At the end of each week, qualifying players get their share of the HBD pool, and that history shows up in their wallet/rewards section.

### 7.2 Key Screens (Wireframe Planning)

These are the core screens needed for the MVP experience. Actual visual wireframes (Figma or similar) can be attached separately once drafted — for now, here's what each screen needs to contain.

**Screen 1 — Daily Puzzle Screen**
*Purpose: main gameplay interface*
- Header: LINGO logo, current streak counter, user profile icon
- Puzzle area: word grid, attempt counter
- Keyboard: interactive letter buttons with color feedback after each guess
- Actions: submit guess, hint button (future feature, not MVP)

**Screen 2 — Results & Share Screen**
*Purpose: show performance, encourage sharing*
- Puzzle completion message
- Guess pattern visualization (spoiler-free)
- Score summary + streak update
- LINGO reward earned
- "Share to Hive" button

**Screen 3 — Leaderboard Screen**
*Purpose: drive competition*
- Daily ranking: fastest solvers, daily scores
- Weekly ranking: total performance, reward qualification status
- Player's own position highlighted

**Screen 4 — Profile & Streak Screen**
*Purpose: track player progress over time*
- Current streak, longest streak
- Solve history
- Achievement milestones
- LINGO token balance

**Screen 5 — Wallet & Rewards Screen**
*Purpose: show reward status clearly*
- Weekly HBD qualification status (e.g., "3/5 solved — 2 more to qualify")
- Previous rewards history
- LINGO token balance + utility options (once spend features exist)

**Screen 6 — Weekly Theme Screen**
*Purpose: introduce the week's challenge*
- Current theme + short explanation
- Vocabulary category focus
- Space reserved for future theme-voting functionality (post-MVP)

### 7.3 Notes for Technical Handoff

- The login → play → share flow depends on Keychain integration working smoothly end-to-end — worth testing this specific path early with Laura since it touches nearly every screen
- The Wallet & Rewards screen needs live data from the payout engine, so its final layout may depend on what fields Laura's backend can cleanly expose — to be confirmed together

---

## 8. V1 Out-of-Scope List & Prioritized Product Backlog

### 8.1 V1 Out-of-Scope

To keep the MVP focused on validating the core daily puzzle and reward loop, the following are intentionally left out of the first release:

- **NFTs** — cosmetic NFT rewards, NFT-based customization
- **Sponsorship system** — sponsored weekly themes, external partner integrations
- **DHF funding** — no dependency on Hive DHF grants for the initial reward pool
- **Premium features** — paid HBD upgrades, premium player advantages
- **Advanced gameplay formats** — anagram mode, fill-in-the-blank mode
- **Difficulty-based guess variation (5–7)** — MVP launches with a flat 6-guess limit across all days (see Section 2.2)
- **Advanced token utilities** — theme voting, streak shield, and any additional token sinks beyond core mechanics

These all stay part of the long-term vision but aren't required to prove the core loop — daily puzzle + reward system — is actually engaging on its own.

*Note: the weekly HBD stacking multipliers (fast solver, perfect week, loyalty) themselves ARE included in v1 — they're core to how the reward pool is calculated (see Section 4.2) — only the features listed above are deferred.*

### 8.2 Prioritized Feature Backlog

Prioritized by how essential each feature is to launching and validating LINGO's core loop.

**Priority 0 — MVP (Required)**

| Feature | Reason |
|---|---|
| Hive Keychain login | Required for identity and Hive integration |
| Daily shared puzzle | Core product experience |
| Wordle-style feedback | Main gameplay mechanic |
| Guess limitation | Defines challenge and fairness |
| Score calculation | Enables ranking and rewards |
| Streak tracking | Drives daily retention |
| Daily and weekly leaderboard | Creates competition |
| Weekly HBD reward pool + multipliers | Main incentive mechanism |
| Daily LINGO token rewards | Introduces token utility |
| Share-to-Hive | Supports organic growth |
| Commit-reveal system | Ensures fairness and trust |

**Priority 1 — Post-MVP**

| Feature | Reason |
|---|---|
| Hint system | Adds real LINGO utility |
| Streak shield | Improves player retention |
| Theme voting | Increases community participation |
| Difficulty-based guess variation | Adds progression depth |
| Advanced puzzle formats | Adds gameplay variety |
| Detailed profile statistics | Improves engagement |
| "Continue with Google" login (auto-provisions a Hive account) | Lowers signup friction for non-crypto-native users; kept as Phase-2 given the lean MVP stack |


**Priority 2 — Future Expansion**

| Feature | Reason |
|---|---|
| Cosmetic NFTs | Additional engagement layer |
| Sponsored themes | Partnership opportunities |
| Premium features | Future monetization |
| DHF integration | Possible ecosystem funding |
| Advanced token economy | Long-term sustainability |

### 8.3 Product Spec Summary

Pulling this together: LINGO's v1 is a daily, one-puzzle-per-day word game on Hive, where players log in via Keychain, solve a shared puzzle with Wordle-style feedback (flat 6-guess limit), build a streak, and qualify for a weekly HBD pool by solving at least 5 of 7 puzzles that week — with fast-solver, perfect-week, and loyalty multipliers applied additively on top. Every solve also earns LINGO tokens (spending features deferred post-MVP). Players can share results directly to Hive, and track their standing on a simple daily/weekly leaderboard. The daily answer is protected with a commit-reveal scheme so its integrity is publicly verifiable. The whole system is intentionally lean for v1 — the goal is proving people will play daily and that the core reward loop performs as designed, before layering in deeper monetization and engagement features.

---

