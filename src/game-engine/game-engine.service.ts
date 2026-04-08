import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Task, TaskDifficulty, TaskType } from '../tasks/task.entity';
import { AchievementsService } from '../achievements/achievements.service';

// -----------------------------------------------------------------------
// Constants — tweak these for balance without touching logic
// -----------------------------------------------------------------------
const DIFFICULTY_MULTIPLIERS: Record<TaskDifficulty, number> = {
  [TaskDifficulty.TRIVIAL]: 0.1,
  [TaskDifficulty.EASY]: 1,
  [TaskDifficulty.MEDIUM]: 1.5,
  [TaskDifficulty.HARD]: 2,
};

const BASE_XP = 10;
const BASE_GOLD = 1;
const BASE_DAILY_DAMAGE = 5;
const MAX_STREAK_BONUS_DAYS = 20; // stops scaling at 20 days (+40%)
const MAX_HP = 50; // HP gained per level above 1
const HP_PER_LEVEL = 5;

// -----------------------------------------------------------------------

export interface RewardResult {
  xpGained: number;
  goldGained: number;
  levelUp: boolean;
  newLevel: number;
  newXp: number;
  newGold: number;
  newHp: number;
}

export interface DamageResult {
  damageTaken: number;
  newHp: number;
  isDead: boolean;
}

@Injectable()
export class GameEngineService {
  private readonly logger = new Logger(GameEngineService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly achievementsService: AchievementsService,
  ) {}

  // -----------------------------------------------------------------------
  // Core formula: XP reward
  //   xp = base * difficulty * streak_bonus * habit_value_bonus
  // -----------------------------------------------------------------------
  calculateXp(task: Task, user: User): number {
    const diff = DIFFICULTY_MULTIPLIERS[task.difficulty];
    const streakBonus = 1 + Math.min(user.streakDays, MAX_STREAK_BONUS_DAYS) * 0.02;

    // Habits get reduced XP per click (value degrades and recovers)
    // simplified: just flat multiplier here
    const typeMultiplier = task.type === TaskType.HABIT ? 0.75 : 1;

    return Math.round(BASE_XP * diff * streakBonus * typeMultiplier);
  }

  // -----------------------------------------------------------------------
  // Core formula: Gold reward
  //   gold = xp / 10 * jitter(0.9 – 1.1)
  // -----------------------------------------------------------------------
  calculateGold(xp: number): number {
    const jitter = 0.9 + Math.random() * 0.2;
    return Math.round((xp / 10) * BASE_GOLD * jitter * 100) / 100;
  }

  // -----------------------------------------------------------------------
  // Core formula: Daily miss damage
  //   damage = base * difficulty * (1 - constitution_reduction)
  //   constitution comes from equipped items
  // -----------------------------------------------------------------------
  async calculateDailyDamage(task: Task, user: User): Promise<number> {
    const diff = DIFFICULTY_MULTIPLIERS[task.difficulty];
    const conReduction = await this.getConstitutionBonus(user);
    return Math.round(BASE_DAILY_DAMAGE * diff * (1 - conReduction) * 10) / 10;
  }

  // -----------------------------------------------------------------------
  // XP threshold for a given level (non-linear: harder each level)
  //   xpRequired(n) = 150 * n^1.4
  // -----------------------------------------------------------------------
  static xpRequiredForLevel(level: number): number {
    return Math.round(150 * Math.pow(level, 1.4));
  }

  // -----------------------------------------------------------------------
  // Apply reward to user (transactional — never partially update)
  // -----------------------------------------------------------------------
  async applyTaskReward(user: User, task: Task): Promise<RewardResult> {
    return this.dataSource.transaction(async (manager) => {
      const xpGained = this.calculateXp(task, user);
      const goldGained = this.calculateGold(xpGained);

      user.xp += xpGained;
      user.gold += goldGained;

      // Update streak
      const now = new Date();
      const lastActivity = user.lastActivityAt;
      if (lastActivity) {
        const diffHours = (now.getTime() - lastActivity.getTime()) / 3_600_000;
        if (diffHours < 48) {
          // Same day or next day → maintain/increment streak
          const sameDay = diffHours < 24 &&
            lastActivity.getDate() === now.getDate();
          if (!sameDay) user.streakDays += 1;
        } else {
          user.streakDays = 1; // broken
        }
      } else {
        user.streakDays = 1;
      }
      user.lastActivityAt = now;

      // Level-up loop (can gain multiple levels at once)
      let levelUp = false;
      while (user.xp >= GameEngineService.xpRequiredForLevel(user.level)) {
        user.xp -= GameEngineService.xpRequiredForLevel(user.level);
        user.level += 1;
        // Each level increases max HP
        user.maxHp = MAX_HP + (user.level - 1) * HP_PER_LEVEL;
        // Heal 10 HP on level-up (reward feeling)
        user.hp = Math.min(user.hp + 10, user.maxHp);
        levelUp = true;
        this.logger.log(`User ${user.id} leveled up to ${user.level}`);
      }

      user.xpToNextLevel = GameEngineService.xpRequiredForLevel(user.level);
      await manager.save(User, user);

      // Check achievements (fire-and-forget — don't fail the transaction)
      this.achievementsService
        .checkAndUnlock(user)
        .catch((e) => this.logger.error('Achievement check failed', e));

      return {
        xpGained,
        goldGained,
        levelUp,
        newLevel: user.level,
        newXp: user.xp,
        newGold: user.gold,
        newHp: user.hp,
      };
    });
  }

  // -----------------------------------------------------------------------
  // Apply damage to user (from missing a daily)
  // -----------------------------------------------------------------------
  async applyDailyDamage(user: User, task: Task): Promise<DamageResult> {
    return this.dataSource.transaction(async (manager) => {
      const damageTaken = await this.calculateDailyDamage(task, user);
      user.hp = Math.max(0, Math.round((user.hp - damageTaken) * 10) / 10);

      const isDead = user.hp <= 0;
      if (isDead) {
        // Death penalty: lose a level and reset HP
        if (user.level > 1) user.level -= 1;
        user.hp = user.maxHp * 0.5; // respawn at half HP
        user.streakDays = 0;
        this.logger.warn(`User ${user.id} died! Respawning at level ${user.level}`);
      }

      await manager.save(User, user);
      return { damageTaken, newHp: user.hp, isDead };
    });
  }

  // -----------------------------------------------------------------------
  // Negative habit click — direct HP damage
  // -----------------------------------------------------------------------
  async applyHabitPenalty(user: User, task: Task): Promise<DamageResult> {
    // Negative habits deal less damage than missed dailies
    const damage = Math.round(BASE_DAILY_DAMAGE * 0.5 *
      DIFFICULTY_MULTIPLIERS[task.difficulty] * 10) / 10;
    user.hp = Math.max(0, user.hp - damage);
    const isDead = user.hp <= 0;
    await this.userRepo.save(user);
    return { damageTaken: damage, newHp: user.hp, isDead };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------
  private async getConstitutionBonus(user: User): Promise<number> {
    // Sum STR/CON bonuses from equipped items
    // Loaded lazily to avoid N+1 in batch scheduler
    try {
      const inventory = await user.inventory;
      const equipped = inventory.filter((i) => i.equipped);
      const totalCon = equipped.reduce((sum, i) => sum + (i.item?.conBonus ?? 0), 0);
      return Math.min(totalCon / 100, 0.3); // cap at 30%
    } catch {
      return 0;
    }
  }
}
