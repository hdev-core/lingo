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

### 2.3 Feedback System (Wordle-style)

-  Green — right letter, right position
-  Yellow — right letter, wrong position
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

## Status

- [x] Write product overview & goals + define user roles (player, admin/puzzle-curator)
- [x] Spec the core game mechanics — one shared daily puzzle, guess limit, Wordle-style feedback, and word/answer format