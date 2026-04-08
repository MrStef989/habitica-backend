import {
  Injectable, UnauthorizedException, ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { GameEngineService } from '../game-engine/game-engine.service';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cfg: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.userRepo.create({
      ...dto,
      passwordHash,
      hp: 50,
      maxHp: 50,
      xpToNextLevel: GameEngineService.xpRequiredForLevel(1),
    });
    await this.userRepo.save(user);
    return this.issueTokens(user);
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'email', 'username', 'passwordHash',
               'level', 'hp', 'maxHp', 'xp', 'xpToNextLevel', 'gold', 'streakDays'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        refreshToken,
        { secret: this.cfg.getOrThrow('JWT_SECRET') },
      );
      const user = await this.userRepo.findOneOrFail({ where: { id: payload.sub } });
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private issueTokens(user: User) {
    const payload = { sub: user.id, email: user.email };
    const secret = this.cfg.getOrThrow('JWT_SECRET');
    return {
      accessToken: this.jwtService.sign(payload, { secret, expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { secret, expiresIn: '7d' }),
      user: this.sanitize(user),
    };
  }

  private sanitize(user: User) {
    const { passwordHash, ...safe } = user as any;
    return safe;
  }
}
