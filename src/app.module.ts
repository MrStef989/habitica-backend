import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { GameEngineModule } from './game-engine/game-engine.module';
import { ShopModule } from './shop/shop.module';
import { AchievementsModule } from './achievements/achievements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: cfg.get('NODE_ENV') !== 'production', // migrations in prod
        logging: cfg.get('NODE_ENV') === 'development',
      }),
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    TasksModule,
    GameEngineModule,
    ShopModule,
    AchievementsModule,
    SeedModule,
  ],
})
export class AppModule {}
