import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ReservationRepository,
  ReservationEntity,
  ReservationWithSeats,
  CreateReservationData,
  ExpiredReservationData,
} from './reservation.repository';

@Injectable()
export class PrismaReservationRepository implements ReservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithLock(
    data: CreateReservationData,
  ): Promise<ReservationWithSeats> {
    const sortedSeatIds = [...data.seatIds].sort();

    return this.prisma.$transaction(async (tx) => {
      const params: string[] = [...sortedSeatIds, data.sessionId];
      const placeholders = sortedSeatIds.map((_, i) => `$${i + 1}`).join(', ');
      const sessionIdx = sortedSeatIds.length + 1;

      const seats = await tx.$queryRawUnsafe<{ id: string; status: string }[]>(
        `SELECT id, status FROM seats WHERE id IN (${placeholders}) AND session_id = $${sessionIdx} ORDER BY id FOR UPDATE`,
        ...params,
      );

      if (seats.length !== sortedSeatIds.length) {
        throw new BadRequestException(
          'Um ou mais assentos não encontrados nesta sessão',
        );
      }

      const unavailable = seats.filter((s) => s.status !== 'AVAILABLE');

      if (unavailable.length > 0) {
        throw new ConflictException(
          'Um ou mais assentos já estão reservados ou vendidos',
        );
      }

      await tx.seat.updateMany({
        where: { id: { in: sortedSeatIds } },
        data: { status: 'RESERVED' },
      });

      const reservation = await tx.reservation.create({
        data: {
          userId: data.userId,
          sessionId: data.sessionId,
          expiresAt: data.expiresAt,
          idempotencyKey: data.idempotencyKey ?? null,
          reservationSeats: {
            createMany: {
              data: sortedSeatIds.map((seatId) => ({ seatId })),
            },
          },
        },
        include: {
          reservationSeats: { include: { seat: true } },
        },
      });

      return reservation;
    });
  }

  async findById(id: string): Promise<ReservationWithSeats | null> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { id },
      include: {
        reservationSeats: { include: { seat: true } },
      },
    });

    return reservation;
  }

  async findByIdempotencyKey(
    key: string,
  ): Promise<ReservationWithSeats | null> {
    const reservation = await this.prisma.reservation.findUnique({
      where: { idempotencyKey: key },
      include: {
        reservationSeats: { include: { seat: true } },
      },
    });

    return reservation;
  }

  async findByUserId(userId: string): Promise<ReservationEntity[]> {
    const reservations = await this.prisma.reservation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return reservations;
  }

  async cancel(id: string): Promise<ReservationWithSeats> {
    return this.prisma.$transaction(async (tx) => {
      const reservationSeats = await tx.reservationSeat.findMany({
        where: { reservationId: id },
        select: { seatId: true },
      });

      await tx.seat.updateMany({
        where: { id: { in: reservationSeats.map((s) => s.seatId) } },
        data: { status: 'AVAILABLE' },
      });

      const reservation = await tx.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          reservationSeats: { include: { seat: true } },
        },
      });

      return reservation;
    });
  }

  async expirePendingReservations(): Promise<ExpiredReservationData[]> {
    return this.prisma.$transaction(async (tx) => {
      const expired = await tx.reservation.findMany({
        where: { status: 'PENDING', expiresAt: { lt: new Date() } },
        select: {
          id: true,
          sessionId: true,
          reservationSeats: { select: { seatId: true } },
        },
      });

      if (expired.length === 0) return [];

      const ids = expired.map((r) => r.id);

      await tx.reservation.updateMany({
        where: { id: { in: ids } },
        data: { status: 'EXPIRED' },
      });

      const allSeatIds = expired.flatMap((r) =>
        r.reservationSeats.map((rs) => rs.seatId),
      );

      if (allSeatIds.length > 0) {
        await tx.seat.updateMany({
          where: { id: { in: allSeatIds } },
          data: { status: 'AVAILABLE' },
        });
      }

      return expired.map((r) => ({
        reservationId: r.id,
        sessionId: r.sessionId,
        seatIds: r.reservationSeats.map((rs) => rs.seatId),
      }));
    });
  }
}
