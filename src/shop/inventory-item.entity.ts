import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Item } from './item.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.inventory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  userId: string;

  @ManyToOne(() => Item, (item) => item.inventoryEntries, { eager: true })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column()
  itemId: string;

  @Column({ default: false })
  equipped: boolean;

  @CreateDateColumn()
  acquiredAt: Date;
}
