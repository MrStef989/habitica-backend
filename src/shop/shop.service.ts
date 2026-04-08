import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Item, ItemType } from './item.entity';
import { InventoryItem } from './inventory-item.entity';
import { User } from '../users/user.entity';

// Only one item per slot can be equipped at a time
const EQUIP_SLOTS: Partial<Record<ItemType, true>> = {
  [ItemType.WEAPON]: true,
  [ItemType.ARMOR]: true,
  [ItemType.HELMET]: true,
  [ItemType.ACCESSORY]: true,
};

@Injectable()
export class ShopService {
  constructor(
    @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
    @InjectRepository(InventoryItem) private readonly invRepo: Repository<InventoryItem>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // All items available in the shop
  findAllItems(): Promise<Item[]> {
    return this.itemRepo.find({ order: { price: 'ASC' } });
  }

  // User's inventory
  findInventory(userId: string): Promise<InventoryItem[]> {
    return this.invRepo.find({
      where: { userId },
      relations: ['item'],
      order: { acquiredAt: 'DESC' },
    });
  }

  // POST /shop/:itemId/buy
  async buyItem(itemId: string, user: User): Promise<InventoryItem> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      // Re-fetch user inside transaction for accurate gold value
      const freshUser = await manager.findOneOrFail(User, { where: { id: user.id } });

      if (freshUser.gold < item.price) {
        throw new BadRequestException(
          `Not enough gold. Need ${item.price}, have ${freshUser.gold.toFixed(2)}`,
        );
      }

      // Potions are consumable — can buy many; equipment is unique
      if (item.type !== ItemType.POTION) {
        const already = await manager.findOne(InventoryItem, {
          where: { userId: user.id, itemId },
        });
        if (already) throw new ConflictException('You already own this item');
      }

      freshUser.gold = Math.round((freshUser.gold - item.price) * 100) / 100;
      await manager.save(User, freshUser);

      // Potions: apply immediately, don't persist to inventory
      if (item.type === ItemType.POTION) {
        await this.applyPotion(manager, freshUser, item);
        // Return a synthetic inventory record (not saved) for response shape
        return manager.create(InventoryItem, {
          userId: user.id, itemId, item, equipped: false,
        });
      }

      const inv = manager.create(InventoryItem, { userId: user.id, itemId });
      return manager.save(InventoryItem, inv);
    });
  }

  // PATCH /shop/inventory/:invId/equip  — toggle equip
  async toggleEquip(invId: string, userId: string): Promise<InventoryItem[]> {
    return this.dataSource.transaction(async (manager) => {
      const inv = await manager.findOne(InventoryItem, {
        where: { id: invId, userId },
        relations: ['item'],
      });
      if (!inv) throw new NotFoundException('Inventory entry not found');
      if (!EQUIP_SLOTS[inv.item.type]) {
        throw new BadRequestException('This item type cannot be equipped');
      }

      if (inv.equipped) {
        // Unequip
        inv.equipped = false;
        return [await manager.save(InventoryItem, inv)];
      }

      // Unequip any other item in the same slot first
      const sameSlot = await manager.find(InventoryItem, {
        where: { userId, equipped: true },
        relations: ['item'],
      });
      for (const other of sameSlot) {
        if (other.item.type === inv.item.type && other.id !== invId) {
          other.equipped = false;
          await manager.save(InventoryItem, other);
        }
      }

      inv.equipped = true;
      return [await manager.save(InventoryItem, inv)];
    });
  }

  private async applyPotion(manager: any, user: User, item: Item): Promise<void> {
    // HP potions restore health, capped at maxHp
    user.hp = Math.min(user.maxHp, user.hp + (item.strBonus || 20));
    await manager.save(User, user);
  }
}
