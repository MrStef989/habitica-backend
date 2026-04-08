import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Task } from '../tasks/task.entity';
import { InventoryItem } from '../shop/inventory-item.entity';
import { Achievement } from '../achievements/achievement.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  username: string;

  @Column({ select: false }) // never leak hash
  passwordHash: string;

  // === RPG Stats ===
  @Column({ type: 'float', default: 50 })
  hp: number;

  @Column({ type: 'float', default: 50 })
  maxHp: number;

  @Column({ type: 'float', default: 0 })
  xp: number;

  @Column({ type: 'float', default: 0 })
  xpToNextLevel: number; // denormalized for quick reads

  @Column({ default: 1 })
  level: number;

  @Column({ type: 'float', default: 0 })
  gold: number;

  // === Streak ===
  @Column({ default: 0 })
  streakDays: number;

  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt: Date | null;

  // === Relations ===
  @OneToMany(() => Task, (task) => task.user, { lazy: true })
  tasks: Promise<Task[]>;

  @OneToMany(() => InventoryItem, (inv) => inv.user, { lazy: true })
  inventory: Promise<InventoryItem[]>;

  @OneToMany(() => Achievement, (ach) => ach.user, { lazy: true })
  achievements: Promise<Achievement[]>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
