import { Injectable, NotFoundException } from '@nestjs/common';
import { SessionRepository } from '../repositories/session.repository';
import { CreateSessionDto } from '../dtos/create-session.dto';

@Injectable()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

  async create(dto: CreateSessionDto) {
    const session = await this.sessionRepository.create({
      movieTitle: dto.movieTitle,
      room: dto.room,
      startsAt: new Date(dto.startsAt),
      ticketPriceInCents: dto.ticketPriceInCents,
      seatLabels: dto.seats,
    });

    return session;
  }

  async findAll() {
    const sessions = await this.sessionRepository.findAll();
    return sessions;
  }

  async findById(id: string) {
    const session = await this.sessionRepository.findById(id);

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    return session;
  }

  async findSeats(sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    const seats = await this.sessionRepository.findSeatsBySessionId(sessionId);
    return seats;
  }

  async findAvailableSeats(sessionId: string) {
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new NotFoundException('Sessão não encontrada');
    }

    const seats =
      await this.sessionRepository.findAvailableSeatsBySessionId(sessionId);
    return seats;
  }
}
