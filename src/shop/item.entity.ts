// item.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  HELMET = 'helmet',
  ACCESSORY = 'accessory',
  POTION = 'potion',
}

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ItemType })
  type: ItemType;

  @Column({ type: 'float', default: 0 })
  price: number; // in gold

  // === Stat bonuses ===
  @Column({ type: 'float', default: 0 })
  strBonus: number; // increases XP from tasks

  @Column({ type: 'float', default: 0 })
  conBonus: number; // reduces daily damage taken (0-100 scale)

  @Column({ type: 'float', default: 0 })
  intBonus: number; // reserved for future mechanics

  @Column({ nullable: true })
  iconUrl: string;

  @OneToMany(() => InventoryItem, (inv) => inv.item)
  inventoryEntries: InventoryItem[];
}
