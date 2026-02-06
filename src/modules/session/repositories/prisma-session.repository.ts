import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  SessionRepository,
  SessionEntity,
  SessionWithSeats,
  SeatEntity,
  CreateSessionData,
} from './session.repository';

@Injectable()
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSessionData): Promise<SessionWithSeats> {
    const session = await this.prisma.session.create({
      data: {
        movieTitle: data.movieTitle,
        room: data.room,
        startsAt: data.startsAt,
        ticketPriceInCents: data.ticketPriceInCents,
        seats: {
          createMany: {
            data: data.seatLabels.map((label) => ({ label })),
          },
        },
      },
      include: { seats: true },
    });

    return session;
  }

  async findById(id: string): Promise<SessionWithSeats | null> {
    const session = await this.prisma.session.findUnique({
      where: { id },
      include: { seats: true },
    });

    return session;
  }

  async findAll(): Promise<SessionEntity[]> {
    const sessions = await this.prisma.session.findMany({
      orderBy: { startsAt: 'asc' },
    });

    return sessions;
  }

  async findSeatsBySessionId(sessionId: string): Promise<SeatEntity[]> {
    const seats = await this.prisma.seat.findMany({
      where: { sessionId },
      orderBy: { label: 'asc' },
    });

    return seats;
  }

  async findAvailableSeatsBySessionId(
    sessionId: string,
  ): Promise<SeatEntity[]> {
    const seats = await this.prisma.seat.findMany({
      where: { sessionId, status: 'AVAILABLE' },
      orderBy: { label: 'asc' },
    });

    return seats;
  }
}
