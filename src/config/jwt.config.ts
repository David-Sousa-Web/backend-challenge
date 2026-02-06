import { registerAs } from '@nestjs/config';
import { env } from './env.validation';

export const jwtConfig = registerAs('jwt', () => ({
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
}));
