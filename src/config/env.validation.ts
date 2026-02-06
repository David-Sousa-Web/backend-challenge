import { plainToInstance, Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @IsPositive()
  @Transform(({ value }) => parseInt(String(value), 10))
  PORT: number = 3000;

  @IsString()
  @MinLength(1, { message: 'DATABASE_URL é obrigatório' })
  DATABASE_URL: string;

  @IsString()
  @MinLength(1, { message: 'REDIS_HOST é obrigatório' })
  REDIS_HOST: string;

  @IsInt()
  @IsPositive()
  @Transform(({ value }) => parseInt(String(value), 10))
  REDIS_PORT: number = 6379;

  @IsString()
  @MinLength(1, { message: 'RABBITMQ_URL é obrigatório' })
  RABBITMQ_URL: string;

  @IsString()
  @MinLength(1, { message: 'JWT_SECRET é obrigatório' })
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '1d';

  @IsInt()
  @IsPositive()
  @Transform(({ value }) => parseInt(String(value), 10))
  RESERVATION_TTL_SECONDS: number = 30;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: false,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'validação falhou';
        return `  ${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(`Falha ao validar variáveis de ambiente:\n${messages}`);
  }

  return validatedConfig;
}

export const env = validate(process.env as Record<string, unknown>);
