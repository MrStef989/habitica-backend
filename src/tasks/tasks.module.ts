import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { GameEngineModule } from '../game-engine/game-engine.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), GameEngineModule],
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule {}
