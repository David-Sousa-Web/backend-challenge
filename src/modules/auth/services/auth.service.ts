import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { AuthRepository } from '../repositories/auth.repository';
import { RegisterDto } from '../dtos/register.dto';
import { LoginDto } from '../dtos/login.dto';

const scryptAsync = promisify(scrypt);

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.authRepository.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.authRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    const accessToken = this.generateToken(user.id);

    return { accessToken, userId: user.id };
  }

  async login(dto: LoginDto) {
    const user = await this.authRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isValid = await this.verifyPassword(dto.password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const accessToken = this.generateToken(user.id);

    return { accessToken, userId: user.id };
  }

  private generateToken(userId: string): string {
    return this.jwtService.sign({ sub: userId });
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
  }

  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    const [salt, key] = hash.split(':');
    const derived = (await scryptAsync(password, salt, 64)) as Buffer;
    const keyBuffer = Buffer.from(key, 'hex');
    return timingSafeEqual(derived, keyBuffer);
  }
}
