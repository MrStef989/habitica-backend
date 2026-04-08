import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './user.entity';
import { UsersService } from './users.service';
import { IsString, MinLength, MaxLength } from 'class-validator';

class UpdateUsernameDto {
  @IsString() @MinLength(3) @MaxLength(30)
  username: string;
}

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /user — full profile with stats
  @Get()
  getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  // PATCH /user
  @Patch()
  update(@CurrentUser() user: User, @Body() dto: UpdateUsernameDto) {
    return this.usersService.updateUsername(user.id, dto.username);
  }
}
