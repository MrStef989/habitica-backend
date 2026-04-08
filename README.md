# Habitica Clone — Backend API

NestJS + PostgreSQL + JWT. Production-ready gamified task manager.

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET

# 3. Run (auto-creates tables in dev via synchronize: true)
npm run start:dev

# API is at: http://localhost:3000/api/v1
```

## Project Structure

```
src/
├── main.ts                          # Bootstrap: helmet, CORS, ValidationPipe
├── app.module.ts                    # Root: TypeORM, Schedule, all modules
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.service.ts              # register / login / refresh
│   ├── auth.controller.ts           # POST /auth/register|login|refresh
│   ├── strategies/jwt.strategy.ts   # Passport JWT — attaches user to request
│   ├── guards/jwt-auth.guard.ts
│   ├── decorators/current-user.ts
│   └── dto/                         # register.dto / login.dto / refresh.dto
│
├── users/
│   ├── user.entity.ts               # hp, xp, gold, level, streak, maxHp
│   ├── users.service.ts
│   └── users.controller.ts          # GET /user, PATCH /user
│
├── tasks/
│   ├── task.entity.ts               # type enum, difficulty, streak, habitScore
│   ├── tasks.service.ts             # CRUD + ownership checks
│   ├── tasks.controller.ts          # CRUD + PATCH /:id/complete
│   └── dto/                         # create-task.dto / update-task.dto
│
├── game-engine/
│   ├── game-engine.service.ts       # All formulas: XP, gold, damage, level-up
│   ├── game-engine.module.ts
│   └── daily-scheduler.service.ts  # @Cron 00:05 UTC — miss damage + streak reset
│
├── shop/
│   ├── item.entity.ts               # name, type, price, strBonus, conBonus
│   ├── inventory-item.entity.ts     # user↔item join with equipped flag
│   ├── shop.service.ts              # buyItem (transactional), toggleEquip
│   ├── shop.controller.ts           # GET /shop, POST /shop/:id/buy, PATCH equip
│   └── shop.module.ts
│
├── achievements/
│   ├── achievement.entity.ts
│   ├── achievements.service.ts      # checkAndUnlock — definition array pattern
│   ├── achievements.controller.ts   # GET /achievements
│   └── achievements.module.ts
│
└── database/
    └── seed-items.ts                # Initial shop items (run once)
```

## API Reference

All endpoints require `Authorization: Bearer <accessToken>` except auth routes.

### Auth
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | /auth/register | `{email, username, password}` | Create account |
| POST | /auth/login | `{email, password}` | Get tokens |
| POST | /auth/refresh | `{refreshToken}` | Rotate tokens |

### User
| Method | Path | Description |
|--------|------|-------------|
| GET | /user | Full profile (hp, xp, gold, level, streak…) |
| PATCH | /user | Update username |

### Tasks
| Method | Path | Body/Query | Description |
|--------|------|------|-------------|
| GET | /tasks | `?type=daily\|habit\|todo` | List tasks |
| POST | /tasks | `{title, type, difficulty, dueDate?}` | Create |
| PATCH | /tasks/:id | Partial task fields | Update |
| PATCH | /tasks/:id/complete | `{direction?: "positive"\|"negative"}` | **Complete — awards XP/gold** |
| DELETE | /tasks/:id | — | Delete |

### Shop
| Method | Path | Description |
|--------|------|-------------|
| GET | /shop | All items for sale |
| POST | /shop/:itemId/buy | Buy item (deducts gold) |
| GET | /shop/inventory | Your items |
| PATCH | /shop/inventory/:invId/equip | Toggle equipped |

### Achievements
| Method | Path | Description |
|--------|------|-------------|
| GET | /achievements | Your unlocked achievements |

## Game Formulas

### XP per task
```
xp = 10 × difficulty_mult × streak_bonus × type_mult

difficulty:   trivial=0.1  easy=1.0  medium=1.5  hard=2.0
streak_bonus: 1 + min(streak_days, 20) × 0.02   (max +40%)
type_mult:    habit=0.75  daily=1.0  todo=1.0
```

### Level thresholds
```
xp_to_next_level(n) = 150 × n^1.4

Level 1→2:    150 XP
Level 5→6:    453 XP
Level 10→11: 1065 XP
```

### Daily miss damage
```
damage = 5 × difficulty_mult × (1 − constitution_reduction)
constitution_reduction = Σ(equipped.conBonus) / 100   (capped at 0.30)
```

### Death & respawn
```
hp ≤ 0  →  level−=1, hp = maxHp×0.5, streakDays = 0
```

### HP scaling
```
maxHp = 50 + (level − 1) × 5
```

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| Transactions on all stat changes | Partial XP/gold updates on crash are worse than a failure |
| Achievements fire-and-forget | Achievement bug must never block task completion |
| `whitelist: true` in ValidationPipe | Strips unknown fields — prevents mass-assignment |
| `select: false` on passwordHash | Hash never leaks in accidental `.find()` calls |
| Unique equip slot enforcement in transaction | Race condition if two requests equip simultaneously |
| Cron at 00:05 not 00:00 | Buffer for DB load at midnight |

## Seeding Shop Items

```bash
# After first start (tables exist), run once:
npx ts-node -r tsconfig-paths/register src/database/seed-items.ts
```

## Production Checklist

- [ ] `synchronize: false` + run TypeORM migrations
- [ ] `JWT_SECRET` is 64+ random bytes
- [ ] `NODE_ENV=production`
- [ ] HTTPS only (handle at reverse proxy / Railway)
- [ ] Set `CORS_ORIGINS` to your actual frontend domain
- [ ] Enable DB connection pooling (`extra: { max: 10 }` in TypeORM config)
