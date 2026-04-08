import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskType } from '../tasks/task.entity';
import { User } from '../users/user.entity';
import { GameEngineService } from '../game-engine/game-engine.service';

@Injectable()
export class DailySchedulerService {
  private readonly logger = new Logger(DailySchedulerService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly gameEngine: GameEngineService,
  ) {}

  // Runs every day at 00:05 UTC — apply damage for missed dailies
  @Cron('5 0 * * *', { name: 'daily-damage' })
  async applyDailyDamage(): Promise<void> {
    this.logger.log('Running daily damage cron...');

    // Fetch all active, non-completed daily tasks
    const missedDailies = await this.taskRepo
      .createQueryBuilder('task')
      .innerJoinAndSelect('task.user', 'user')
      .where('task.type = :type', { type: TaskType.DAILY })
      .andWhere('task.isActive = true')
      .andWhere(
        // Not completed today
        `(task.lastCompletedAt IS NULL OR DATE(task.lastCompletedAt) < CURRENT_DATE)`,
      )
      .getMany();

    this.logger.log(`Found ${missedDailies.length} missed dailies`);

    // Group by user to batch saves
    const byUser = new Map<string, { user: User; tasks: Task[] }>();
    for (const task of missedDailies) {
      const uid = task.userId;
      if (!byUser.has(uid)) byUser.set(uid, { user: task.user, tasks: [] });
      byUser.get(uid)!.tasks.push(task);
    }

    for (const { user, tasks } of byUser.values()) {
      for (const task of tasks) {
        try {
          const result = await this.gameEngine.applyDailyDamage(user, task);
          this.logger.debug(
            `User ${user.id}: -${result.damageTaken} HP from "${task.title}"` +
            (result.isDead ? ' [DIED]' : ''),
          );
        } catch (err) {
          this.logger.error(
            `Failed to apply damage for task ${task.id}: ${err}`,
          );
        }
      }

      // Reset streak if user had no activity yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (
        user.lastActivityAt &&
        user.lastActivityAt < yesterday
      ) {
        user.streakDays = 0;
        await this.userRepo.save(user);
      }
    }

    this.logger.log('Daily damage cron complete');
  }
}
