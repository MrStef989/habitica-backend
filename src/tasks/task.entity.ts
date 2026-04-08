import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum TaskType {
  HABIT = 'habit',
  DAILY = 'daily',
  TODO = 'todo',
}

export enum TaskDifficulty {
  TRIVIAL = 'trivial',
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'enum', enum: TaskType })
  type: TaskType;

  @Column({ type: 'enum', enum: TaskDifficulty, default: TaskDifficulty.EASY })
  difficulty: TaskDifficulty;

  // === Completion state ===
  @Column({ default: false })
  completed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  // === Daily-specific ===
  @Column({ type: 'timestamp', nullable: true })
  dueDate: Date | null;

  @Column({ default: true })
  isActive: boolean; // for dailies: still relevant today?

  @Column({ type: 'timestamp', nullable: true })
  lastCompletedAt: Date | null;

  // === Habit-specific (can be + or -) ===
  @Column({ default: true })
  habitPositive: boolean; // "+" direction

  @Column({ default: false })
  habitNegative: boolean; // "-" direction

  @Column({ default: 0 })
  habitScore: number; // running counter

  // === Streak for this specific task ===
  @Column({ default: 0 })
  streak: number;

  @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
