import {
  IsString, IsEnum, IsOptional, IsBoolean,
  IsDateString, MaxLength, MinLength,
} from 'class-validator';
import { TaskType, TaskDifficulty } from '../task.entity';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsEnum(TaskType)
  type: TaskType;

  @IsOptional()
  @IsEnum(TaskDifficulty)
  difficulty?: TaskDifficulty;

  // Daily / Todo
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // Habit
  @IsOptional()
  @IsBoolean()
  habitPositive?: boolean;

  @IsOptional()
  @IsBoolean()
  habitNegative?: boolean;
}
