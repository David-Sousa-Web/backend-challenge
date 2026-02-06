import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsPositive,
  IsDateString,
  IsArray,
  ArrayMinSize,
  MinLength,
} from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 'Vingadores: Ultimato' })
  @IsString()
  @MinLength(1)
  movieTitle: string;

  @ApiProperty({ example: 'Sala 1' })
  @IsString()
  @MinLength(1)
  room: string;

  @ApiProperty({ example: '2026-02-10T19:00:00.000Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: 2500, description: 'Preço em centavos (R$ 25,00)' })
  @IsInt()
  @IsPositive()
  ticketPriceInCents: number;

  @ApiProperty({
    example: [
      'A1',
      'A2',
      'A3',
      'A4',
      'B1',
      'B2',
      'B3',
      'B4',
      'C1',
      'C2',
      'C3',
      'C4',
      'D1',
      'D2',
      'D3',
      'D4',
    ],
    description: 'Labels dos assentos (mínimo 16)',
  })
  @IsArray()
  @ArrayMinSize(16)
  @IsString({ each: true })
  seats: string[];
}
