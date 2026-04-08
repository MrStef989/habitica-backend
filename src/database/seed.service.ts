import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../shop/item.entity';
import { INITIAL_ITEMS } from './seed-items';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Item) private readonly itemRepo: Repository<Item>,
  ) {}

  async onApplicationBootstrap() {
    for (const itemData of INITIAL_ITEMS) {
      const exists = await this.itemRepo.findOne({ where: { name: itemData.name } });
      if (!exists) await this.itemRepo.save(this.itemRepo.create(itemData));
    }
  }
}