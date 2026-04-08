import {
  Controller, Get, Post, Patch, Param,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ShopService } from './shop.service';

@Controller('shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  // GET /shop — all items for sale
  @Get()
  findAll() {
    return this.shopService.findAllItems();
  }

  // GET /shop/inventory — current user's items
  @Get('inventory')
  getInventory(@CurrentUser() user: User) {
    return this.shopService.findInventory(user.id);
  }

  // POST /shop/:itemId/buy
  @Post(':itemId/buy')
  @HttpCode(HttpStatus.CREATED)
  buy(@Param('itemId') itemId: string, @CurrentUser() user: User) {
    return this.shopService.buyItem(itemId, user);
  }

  // PATCH /shop/inventory/:invId/equip
  @Patch('inventory/:invId/equip')
  @HttpCode(HttpStatus.OK)
  equip(@Param('invId') invId: string, @CurrentUser() user: User) {
    return this.shopService.toggleEquip(invId, user.id);
  }
}
