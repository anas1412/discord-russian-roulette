# Discord Russian Roulette

One run a day at a revolver, and a dice game to spend what you survive with.

**[Play the revolver →](https://anas1412.github.io/discord-russian-roulette/)** — the landing page runs the real game logic in your browser.

## The rules

### Roulette — one run per day

You start with a base pot of **100** and decide whether to fire.

| | |
|---|---|
| **Fire and survive** | Pot doubles, and another bullet goes into the revolver. |
| **Fire and die** | The whole pot is gone. You're done until tomorrow. |
| **Cash out** | You lock the pot in. It becomes spendable at the next daily reset. |

The revolver starts with **1 bullet in 6 chambers**, and every survival loads
another one, so the odds climb against you:

| Pull | Loaded | Death | Pot if you live |
|---|---|---|---|
| 1 | 1/6 | 17% | 200 (×2) |
| 2 | 2/6 | 33% | 400 (×4) |
| 3 | 3/6 | 50% | 800 (×8) |
| 4 | 4/6 | 67% | 1,600 (×16) |
| 5 | 5/6 | 83% | 3,200 (×32) |
| 6 | 6/6 | **100%** | — |

Five survivals for **×32** is the ceiling. The sixth pull is certain death — the
bot will still let you take it, clearly labelled, but there is nothing to win.

### Dice — High Roll

Permanent money isn't just a score; you can stake it. **5 rolls per day.**

You and the bot each roll a die. Higher roll wins.

- **Beat the bot** → ×2 back.
- **Roll a 6 and win** → jackpot, ×3 back.
- **Tie** → your stake comes back.
- **Lose** → the bot takes it.

### Money: pending vs permanent

Cashing out puts money in **pending**. It only becomes **permanent** — and
therefore stakeable on dice — at the next daily reset. You cannot gamble today's
roulette winnings on today's dice.

The day rolls over at **midnight UTC+1 (Tunisia)**, which is 23:00 UTC. Tunisia
does not observe DST, so that boundary is fixed all year. Rollover is lazy: it is
applied the next time a player is touched, so there is no scheduled job.

## Commands

| Command | What it does |
|---|---|
| `/roulette` | Start or resume today's run. Fire / Cash out buttons. |
| `/dice bet:<amount>` | Play High Roll with permanent money. |
| `/balance` | Your money, today's run, rolls left, lifetime stats. (Private) |
| `/leaderboard` | Top 10 by permanent + pending. |

## Setup

Requires [Bun](https://bun.sh). Uses `bun:sqlite`, so there is no native module
to compile.

```bash
bun install
cp .env.example .env    # then fill in DISCORD_TOKEN and DISCORD_CLIENT_ID
bun run deploy          # register the slash commands
bun start
```

Get both values from the [Discord Developer Portal](https://discord.com/developers/applications):
the token under **Bot → Reset Token**, the client ID under **General Information**.
Set `DISCORD_GUILD_ID` while developing so command changes appear instantly;
leave it empty to register globally, which can take up to an hour to propagate.

Invite the bot with the `bot` and `applications.commands` scopes. No privileged
intents are needed — it only uses `Guilds`.

## Notes

- **Wallets are global per user**, not per server. Someone in two servers with
  the bot has one balance and one daily run across both.
- Dice and chambers use rejection-sampled `crypto.getRandomValues`, not
  `Math.random() % 6`, so every face is exactly equally likely.
- Data lives in one SQLite file (`DATABASE_PATH`, default `./roulette.db`).

```bash
bun test
```
