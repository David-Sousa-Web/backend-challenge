import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ReservationService } from '../services/reservation.service';
import { CreateReservationDto } from '../dtos/create-reservation.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Reservations')
@ApiBearerAuth()
@Controller('reservations')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  @ApiOperation({ summary: 'Reservar assentos (válida por 30 segundos)' })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Chave de idempotência para evitar reservas duplicadas',
  })
  async create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: { userId: string },
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.reservationService.create(user.userId, dto, idempotencyKey);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancelar reserva pendente' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.reservationService.cancel(id, user.userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Minhas reservas' })
  async findByUser(@CurrentUser() user: { userId: string }) {
    return this.reservationService.findByUser(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes de uma reserva' })
  async findById(@Param('id') id: string) {
    return this.reservationService.findById(id);
  }
}
