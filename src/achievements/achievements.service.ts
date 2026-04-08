import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from './achievement.entity';
import { User } from '../users/user.entity';

// Predefined achievements — add more without changing logic
export const ACHIEVEMENT_DEFINITIONS = [
  {
    key: 'first_task',
    title: 'First step',
    description: 'Complete your first task',
    check: (u: User) => u.xp > 0,
  },
  {
    key: 'streak_7',
    title: 'Week warrior',
    description: '7-day streak',
    check: (u: User) => u.streakDays >= 7,
  },
  {
    key: 'streak_30',
    title: 'Habit master',
    description: '30-day streak',
    check: (u: User) => u.streakDays >= 30,
  },
  {
    key: 'level_5',
    title: 'Adventurer',
    description: 'Reach level 5',
    check: (u: User) => u.level >= 5,
  },
  {
    key: 'level_10',
    title: 'Hero',
    description: 'Reach level 10',
    check: (u: User) => u.level >= 10,
  },
  {
    key: 'gold_100',
    title: 'Merchant',
    description: 'Accumulate 100 gold',
    check: (u: User) => u.gold >= 100,
  },
] as const;

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
  ) {}

  async checkAndUnlock(user: User): Promise<Achievement[]> {
    const existing = await this.achievementRepo.find({
      where: { userId: user.id },
    });
    const existingKeys = new Set(existing.map((a) => a.key));

    const newAchievements: Achievement[] = [];
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (existingKeys.has(def.key)) continue;
      if (def.check(user)) {
        const ach = this.achievementRepo.create({
          userId: user.id,
          key: def.key,
          title: def.title,
          description: def.description,
        });
        newAchievements.push(await this.achievementRepo.save(ach));
      }
    }

    return newAchievements;
  }

  async findAllForUser(userId: string): Promise<Achievement[]> {
    return this.achievementRepo.find({ where: { userId } });
  }
}
