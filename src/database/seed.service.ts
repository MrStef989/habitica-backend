import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../shop/item.entity';
import { INITIAL_ITEMS } from './seed-items';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
  ) {}

  async onApplicationBootstrap() {
    try {
      for (const itemData of INITIAL_ITEMS) {
        const exists = await this.itemRepo.findOne({ where: { name: itemData.name } });
        if (!exists) await this.itemRepo.save(this.itemRepo.create(itemData));
      }
      this.logger.log('Shop items seeded successfully');
    } catch (err) {
      // Таблицы ещё не готовы — не страшно, предметы засеятся при следующем деплое
      this.logger.warn('Seed skipped (tables not ready yet): ' + err.message);
    }
  }
}
