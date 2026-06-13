# The Steward's Desk — Build Plan

> *"It is required in stewards, that a man be found faithful."* — 1 Corinthians 4:2
>
> **Horizon:** Glorify Jesus Christ by multiplying disciples. *(2 Tim 2:2)*

This is the spec for the next evolution of the Living Hub. The current hub is kept
(it becomes the **Filing Cabinet** drawer — dormant but reachable; nothing built is
wasted). No app code gets written until v1 is given the word.

---

## 1. The governing principles

- **Grace, not guilt.** The desk never grades the soul. No scores, no streaks, no
  "percentage of faithfulness."
- **A river, not a pond.** Faithfulness is *presence over time*, not a finished total.
- **Recency is an invitation.** "You haven't been here lately" means *go here next* —
  never *you failed here*.
- **One desk for the whole man** — ministry, home, and personal, under one glass.

---

## 2. The oscilloscope — kept as the centerpiece

The **FIELD-O-SCOPE · WHEEL OF LIFE** stays exactly where it is: top-left, 1940s
green-phosphor radar, the sweep over the wheel of your areas. It is *not* replaced.
The only thing that changes is **what the needle reads**:

| | Before | The Steward's Desk |
|---|---|---|
| Needle = | a 1–10 you set by hand (a self-score) | **recency** — read automatically |
| "Low" means | "you're not producing" (a grade) | "this is running low — go here next" (an invitation) |
| Refills when | you check a box | you **abide / file a dispatch / pray / advance a battle** |

Each spoke **drains** slowly as days pass since you last showed up there, and
**refills** when you act. "Running low" glows *softer* — it never turns red or
guilt-colored. It's a supply gauge, not a scoreboard.

**The spokes = your areas**, color-grouped by section (Ministry / Home / Personal),
so one glance tells you *which part of life* is going dim.

### The Big 4 — the headline needles

The four purposes of the church — **Worship · Discipleship · Charity · Evangelism** —
are pinned bright at the center of the glass as the four headline needles. Every other
area is still on the wheel as a smaller spoke around them. The Big 4 aren't new areas;
they're *the four that matter most*, promoted on the glass. (A future "pin to scope"
control lets you choose which areas show large if the wheel ever feels busy.)

---

## 3. The desk — sections and areas

**Sections** organize the desk. **Areas** are the working pages inside them (each with
its docket / logs / open items, as today). Every original area is preserved.

| MINISTRY | HOME | PERSONAL |
|---|---|---|
| **Abide** *(Walk with God — the source)* | Jess | Health & Fitness |
| Preaching & Study | Family | Finances |
| **Shepherding** *(was "The Work")* | Maintenance *(quarters & motor pool)* | Reading & Mind |
| **Battles & Strategy** | | Hobbies & Craft |
| **Disciples** *(the docket)* | | Friendships |
| **Prayer rotation** *(Breeze)* | | |

*(The **Inbox** capture strip stays above the sections — drop things, sort later.)*

### The altitude fix — Shepherding vs. Battles vs. Strategy

"The Work" was never distinct from shepherding; it was a vague label for it, which is
why it felt to swallow the battles and the strategy. Renamed and separated by altitude:

| | What it is | Test | Time |
|---|---|---|---|
| **Shepherding** | The daily *care* of the flock — visits, staff, counsel, preaching the people | "Ongoing care that's never *done*?" | The river — continuous |
| **Battles** | The few *named, must-win* fights with a finish line — the building, the hire, the conflict | "A specific fight you can *win*?" | Finite — they end |
| **Strategy** | The *map* above both — the thinking that picks *which* battles to fight | "The plan behind the fights?" | Directional — rare changes |

**Battles & Strategy** ride together as one area under Ministry (the campaigns + the map
that chooses them — same altitude), with its own needle on the glass so a must-win battle
going quiet shows up as "running low." Shepherding stands apart as the daily care.

---

## 4. The Disciples docket — a pipeline pointed at multiplication

The docket is a people list, not a task list. Each person carries:

- **Cadence** — how often you mean to show up (weekly disciple = 7 days; slow-burn = 30).
  Overdue → the file is **"due a letter"** (an invitation, surfaced gently).
- **Present step** — the one next move with this person.
- **RCP stage** — *where this man is.*
- **The Four C's** — *how the discipler is doing at moving him.*

### RCP — the soul's journey *(your framework, Teen Lift 3/25)*

> Reconciling · Conforming · Perfecting — *"it's not either-or, it's both."*

| Stage | What it is | The present step it calls for |
|---|---|---|
| **Reconciling** | Brought *to* God and to others — the gospel takes hold | Evangelism, relationship, first truth |
| **Conforming** | Being conformed to the image of Christ — sanctification | Walking alongside, the daily fight, accountability |
| **Perfecting** | The saint equipped (Eph 4:12) — able to train others | **Hand him someone to train** — multiplication |

It's a **lens, not a ladder** (both-and): a man being perfected is still being reconciled
and conformed. A **Perfecting**-stage man feeds the horizon directly — *multiplying
disciples* — which is the whole point of the desk.

### The Four C's — the discipler's gauge *(Disciplers' meeting 5/31)*

**Consistency · Change · Connection · Comprehension** — the discipler's read on progress
*with* a disciple, as markers on the file. RCP = where he is; the Four C's = how I'm
doing at moving him. (Specified here; wired in when the docket earns it — optional in v1.)

### How the two axes cross

```
Big 4  →  WHAT the church does      →  the headline spokes on the glass
RCP    →  WHERE each disciple is     →  the stage tag on each docket file
4 C's  →  HOW the discipler is doing →  progress markers on the file
```

---

## 5. The Morning Wire

The top band of the desk is **The Morning Wire** — your daily report-in strip. The first
thing on it is **Abide** (the verse, the one thing, the source that feeds everything
below). You open to the Wire; you start at Abide.

---

## 6. Architecture

Reuses what's already built — no rework of the Asana plumbing.

- **The proxy** (Apps Script) is extended, not replaced. We already have
  `asanaList / Add / Complete / StatsAll / Move`, which power **Battles** and **dispatch
  write-back** with no new Asana work.
- **Breeze** is added to the proxy for the Prayer rotation. *Needed when we reach v3:*
  Breeze subdomain + API key + the prayer **tag ID**. (Breeze's auth flavor gets verified
  before any wiring.)
- **Battles** read from the Asana **"Must-Win Battles 2026"** project
  (GID `1211539407674306` — to be reconfirmed).
- **Security hardening:** move the Asana token + Breeze key into `PropertiesService`,
  add a shared-secret gate on every call, keep `doGet` health-only. *(Asana token already
  rotated.)*

---

## 7. Build order — each ships on its own

| | Ships | Proves | New integrations |
|---|---|---|---|
| **v1** | **Docket + oscilloscope** — manual people, cadence, "due a letter," present step, RCP tags, local `[file dispatch]`; the scope drains/refills on recency; Big 4 pinned | the gauge + the docket | **none** |
| **v2** | **Battles & Strategy drawer** — wired to the Must-Win Battles Asana project; one present step + owner per battle; owners link to their docket file | the battles needle | Asana *(reused)* |
| **v3** | **Prayer rotation** — Breeze read by tag + the wheel + `[prayed]` write-back | the rotation | Breeze |
| **v4** | **Dispatch write-back** — "file dispatch" stamps the person's Asana task and/or Breeze; battle dispatch stamps both battle and owner | the loop closes | Asana + Breeze |

---

## 8. Decisions locked

- Oscilloscope kept as centerpiece; needle reads **recency** ("running low" = invitation). ✓
- Spokes = the areas, color-grouped by section. ✓
- **Big 4** (Worship, Discipleship, Charity, Evangelism) = the four headline needles. ✓
- All original areas preserved; placed across Ministry / Home / Personal. ✓
- "The Work" → **Shepherding**; **Battles & Strategy** its own Ministry area (own spoke). ✓
- **Disciples** docket with cadence + "due a letter." ✓
- **RCP** (Reconciling / Conforming / Perfecting) = the docket's stage-lens. ✓
- **Four C's** (Consistency / Change / Connection / Comprehension) = discipler's gauge. ✓
- **The Morning Wire** = top band; **Abide** = its source line. ✓
- Masthead verse: **1 Cor 4:2**. Horizon: **"Glorify Jesus Christ by multiplying disciples."** ✓
- Current hub → **Filing Cabinet** drawer (dormant, reachable). ✓

## 9. Still to provide (when we reach them)

- Starting docket: people + cadence + RCP stage *(seed is fine for v1)*.
- Breeze subdomain + API key + prayer tag ID *(v3)*.
- Reconfirm the Must-Win Battles Asana project GID *(v2)*.
- Default cadences per relationship type.
