import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionService } from '../services/session.service';
import { CreateSessionDto } from '../dtos/create-session.dto';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @ApiOperation({ summary: 'Criar sessão de cinema com assentos' })
  async create(@Body() dto: CreateSessionDto) {
    return this.sessionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as sessões' })
  async findAll() {
    return this.sessionService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes de uma sessão' })
  async findById(@Param('id') id: string) {
    return this.sessionService.findById(id);
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'Todos os assentos de uma sessão' })
  async findSeats(@Param('id') id: string) {
    return this.sessionService.findSeats(id);
  }

  @Get(':id/seats/available')
  @ApiOperation({ summary: 'Assentos disponíveis de uma sessão' })
  async findAvailableSeats(@Param('id') id: string) {
    return this.sessionService.findAvailableSeats(id);
  }
}
