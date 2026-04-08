import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Task } from '../tasks/task.entity';
import { GameEngineService } from './game-engine.service';
import { DailySchedulerService } from './daily-scheduler.service';
import { AchievementsModule } from '../achievements/achievements.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Task]), AchievementsModule],
  providers: [GameEngineService, DailySchedulerService],
  exports: [GameEngineService],
})
export class GameEngineModule {}
