import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  UseGuards, HttpCode, HttpStatus, BadRequestException, Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { TasksService } from './tasks.service';
import { GameEngineService } from '../game-engine/game-engine.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task, TaskType } from './task.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly gameEngine: GameEngineService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: User, @Query('type') type?: TaskType) {
    return this.tasksService.findAllForUser(user.id, type);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.tasksService.findOneOrFail(id, user.id);
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: User) {
    return this.tasksService.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, user.id, dto);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('direction') direction?: 'positive' | 'negative',
  ) {
    const task = await this.tasksService.findOneOrFail(id, user.id);
    if (task.type === TaskType.TODO && task.completed)
      throw new BadRequestException('Todo is already completed');
    if (task.type === TaskType.DAILY && this.completedToday(task))
      throw new BadRequestException('Daily already completed today');

    const updatedTask = await this.tasksService.markComplete(task, direction);
    const isPositive = task.type !== TaskType.HABIT || direction !== 'negative';

    if (isPositive) {
      const reward = await this.gameEngine.applyTaskReward(user, task);
      return {
        task: updatedTask, reward,
        message: reward.levelUp
          ? `Level up! You are now level ${reward.newLevel}!`
          : `+${reward.xpGained} XP  +${reward.goldGained.toFixed(2)} gold`,
      };
    }
    const damage = await this.gameEngine.applyHabitPenalty(user, task);
    return { task: updatedTask, reward: null, message: `-${damage.damageTaken} HP` };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentUser() user: User) {
    await this.tasksService.remove(id, user.id);
  }

  private completedToday(task: Task): boolean {
    if (!task.lastCompletedAt) return false;
    const t = new Date(), l = task.lastCompletedAt;
    return t.getFullYear() === l.getFullYear()
      && t.getMonth() === l.getMonth()
      && t.getDate() === l.getDate();
  }
}
