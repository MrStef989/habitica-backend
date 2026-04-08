import {
  IsString, IsEnum, IsOptional, IsBoolean,
  IsDateString, MaxLength, MinLength,
} from 'class-validator';
import { TaskDifficulty } from '../task.entity';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsEnum(TaskDifficulty)
  difficulty?: TaskDifficulty;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  habitPositive?: boolean;

  @IsOptional()
  @IsBoolean()
  habitNegative?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
