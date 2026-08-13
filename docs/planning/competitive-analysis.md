# LINGO — Competitive Analysis: HiveWord

**Purpose:** This is a standalone competitor teardown, separate from the Product Spec. The spec describes what LINGO builds; this document evaluates a competing product and where LINGO differentiates. This doc can evolve independently as more is learned about HiveWord or the competitive landscape.

---

## 1. Competitive Positioning vs. Wagering-Based Word Games (HiveWord)

There's already a Wordle-style game on Hive — HiveWord — worth being explicit about how LINGO differs, since the difference is structural, not cosmetic.

**HiveWord's core loop is player-vs-player wagering:** players stake real HIVE (e.g. 5 HIVE) against another player in a 1v1 duel, and the winner takes the pot. The blockchain's role there is to trustlessly hold and settle that bet between two strangers. This is gambling-adjacent by design — real money moves from a losing player directly to a winning player, based on game skill.

**LINGO deliberately does not do this.** No player ever stakes their own money against another player, and no player can lose money by playing. Instead:

- The weekly HBD pool is funded externally (platform/sponsors — see Product Spec §4.5 for the funding model), not by other players' losses
- Players earn a share of that pool through skill and consistency (solving ≥5/7 puzzles, speed, streaks — Product Spec §4.1–4.2), not by beating a specific opponent for their stake
- The daily LINGO token rewards participation and engagement (hints, streak shields, theme voting), never wagering

In short: **HiveWord moves money player → player (wagering). LINGO moves money platform/sponsor → player (skill-based reward).** This is the line between a prize-based game and a betting app, and it's why LINGO avoids the legal exposure, problem-play risk, and narrower audience that come with real-money wagering, while still offering meaningful, real rewards.

---

## 2. Differentiation Options — Evaluated for Feasibility

**Important scope note:** the ideas below are exploratory differentiation options for future consideration, evaluated here for feasibility. They are **not** part of LINGO's committed roadmap — the Product Spec's P0/P1/P2 backlog remains the actual agreed plan. Nothing here should be treated as scoped or promised work.

HiveWord's engagement hook is real stakes. To stay competitive without adopting wagering, the following ideas were evaluated specifically on whether they're realistically buildable given LINGO's current scope, team size (2 people), and MVP timeline — not just whether they sound good.

| Idea | Feasibility | Why |
|---|---|---|
| **Sponsor-funded tournament weeks** | **Low-feasibility near-term, but the cheapest one to eventually try** | The mechanic itself is simple to build (a bigger version of the existing weekly HBD pool). The real blocker isn't code, it's finding an actual sponsor willing to fund a prize pool, which depends on LINGO having enough players to be worth sponsoring in the first place. Realistic sequencing: only worth pursuing after MVP launch and some real usage data. |
| **Achievement-based NFTs** | **Low priority, non-trivial cost** | Technically buildable (mint on Hive), but adds real scope: art/design work, NFT metadata standards, and a minting flow — none of which exists yet. A "nice later" item, not a near-term differentiator. |
| **Referral/community rewards** | **Feasible, but needs a fraud-prevention design first** | Simple in concept (LINGO tokens for inviting friends), but naive referral systems are easy to abuse (fake accounts referring each other). Needs a basic anti-abuse rule (e.g., referred account must solve N puzzles before either side gets rewarded) before it's safe to build. |
| **Educational layer (word definitions/vocab context after solving)** | **Most feasible of the four, and the strongest genuine differentiator** | Can be built with a free dictionary API (e.g., Free Dictionary API, Wiktionary) called after a puzzle ends — no blockchain work, no new backend infrastructure, no outside dependencies. Realistically shippable in an early post-MVP phase, and something a duel-focused app like HiveWord has no natural reason to ever build, since it doesn't serve their wagering loop. |

**Honest bottom line:** of these four, only the **educational layer** is realistically buildable in a near-term post-MVP phase with the current 2-person team and no outside dependencies. The other three are legitimate long-term directions, but each has a real blocker (sponsor pipeline, art/design capacity, or an anti-fraud design step) that shouldn't be underestimated or promised before it's actually scoped.

If any of these are formally adopted, they should be added to the Product Spec's backlog (§8.2) at that point — not before.