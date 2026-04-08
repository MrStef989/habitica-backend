import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskType } from './task.entity';
import { User } from '../users/user.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  findAllForUser(userId: string, type?: TaskType): Promise<Task[]> {
    const qb = this.taskRepo
      .createQueryBuilder('task')
      .where('task.userId = :userId', { userId })
      .orderBy('task.createdAt', 'DESC');

    if (type) qb.andWhere('task.type = :type', { type });
    return qb.getMany();
  }

  async findOneOrFail(id: string, userId: string): Promise<Task> {
    const task = await this.taskRepo.findOne({ where: { id } });
    if (!task) throw new NotFoundException(`Task ${id} not found`);
    if (task.userId !== userId) throw new ForbiddenException();
    return task;
  }

  create(dto: CreateTaskDto, user: User): Promise<Task> {
    const task = this.taskRepo.create({
      ...dto,
      userId: user.id,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });
    return this.taskRepo.save(task);
  }

  async update(id: string, userId: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.findOneOrFail(id, userId);
    Object.assign(task, {
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : task.dueDate,
    });
    return this.taskRepo.save(task);
  }

  async markComplete(
    task: Task,
    direction?: 'positive' | 'negative',
  ): Promise<Task> {
    const now = new Date();

    if (task.type === TaskType.TODO) {
      task.completed = true;
      task.completedAt = now;
    }

    if (task.type === TaskType.DAILY) {
      task.lastCompletedAt = now;
      task.streak += 1;
    }

    if (task.type === TaskType.HABIT) {
      task.lastCompletedAt = now;
      // Positive click raises score (affects difficulty scaling in future)
      if (direction !== 'negative') task.habitScore += 1;
      else task.habitScore = Math.max(0, task.habitScore - 1);
    }

    return this.taskRepo.save(task);
  }

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.findOneOrFail(id, userId);
    await this.taskRepo.remove(task);
  }
}
