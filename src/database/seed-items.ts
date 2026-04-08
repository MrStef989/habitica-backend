import { DataSource } from 'typeorm';
import { Item, ItemType } from '../shop/item.entity';

// Run once: npx ts-node src/database/seed-items.ts
// Or call from a NestJS migration / onApplicationBootstrap
export const INITIAL_ITEMS: Partial<Item>[] = [
  // === Weapons (increase STR → bonus XP) ===
  { name: 'Wooden Sword',   type: ItemType.WEAPON,    price: 25,  strBonus: 5,  conBonus: 0,  description: 'A basic training sword' },
  { name: 'Iron Sword',     type: ItemType.WEAPON,    price: 80,  strBonus: 12, conBonus: 0,  description: 'Solid and reliable' },
  { name: 'Crystal Staff',  type: ItemType.WEAPON,    price: 200, strBonus: 25, conBonus: 5,  description: 'Channels arcane energy' },

  // === Armor (increase CON → reduce damage) ===
  { name: 'Leather Vest',   type: ItemType.ARMOR,     price: 30,  strBonus: 0,  conBonus: 8,  description: 'Light protection' },
  { name: 'Chain Mail',     type: ItemType.ARMOR,     price: 100, strBonus: 0,  conBonus: 18, description: 'Heavy but sturdy' },
  { name: 'Dragon Scale',   type: ItemType.ARMOR,     price: 300, strBonus: 5,  conBonus: 30, description: 'Nearly indestructible' },

  // === Helmets ===
  { name: 'Cloth Hood',     type: ItemType.HELMET,    price: 20,  strBonus: 2,  conBonus: 3,  description: 'Better than nothing' },
  { name: 'Iron Helmet',    type: ItemType.HELMET,    price: 70,  strBonus: 3,  conBonus: 10, description: 'Protects your head' },

  // === Accessories ===
  { name: 'Lucky Charm',    type: ItemType.ACCESSORY, price: 50,  strBonus: 8,  conBonus: 2,  description: 'Increases fortune' },
  { name: 'Focus Amulet',   type: ItemType.ACCESSORY, price: 150, strBonus: 15, conBonus: 8,  description: 'Sharpens the mind' },

  // === Potions (consumable, restore HP) ===
  { name: 'Health Potion',  type: ItemType.POTION,    price: 15,  strBonus: 20, conBonus: 0,  description: 'Restores 20 HP' },
  { name: 'Mega Potion',    type: ItemType.POTION,    price: 40,  strBonus: 50, conBonus: 0,  description: 'Restores 50 HP' },
];

export async function seedItems(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Item);
  for (const itemData of INITIAL_ITEMS) {
    const exists = await repo.findOne({ where: { name: itemData.name } });
    if (!exists) {
      await repo.save(repo.create(itemData));
    }
  }
  console.log(`Seeded ${INITIAL_ITEMS.length} items`);
}
