import {
  Injectable,
  Inject,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import Redis from 'ioredis';
import Redlock, { ExecutionError } from 'redlock';
import { REDIS_CLIENT } from '../../../redis/redis.module';
import { env } from '../../../config/env.validation';
import { ReservationRepository } from '../repositories/reservation.repository';
import { ReservationProducer } from '../../messaging/producers/reservation.producer';
import { CreateReservationDto } from '../dtos/create-reservation.dto';

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);
  private readonly redlock: Redlock;

  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly reservationProducer: ReservationProducer,
    @Inject(REDIS_CLIENT) redis: Redis,
  ) {
    this.redlock = new Redlock([redis], {
      retryCount: 3,
      retryDelay: 200,
      retryJitter: 100,
    });
  }

  async create(
    userId: string,
    dto: CreateReservationDto,
    idempotencyKey?: string,
  ) {
    if (idempotencyKey) {
      const existing =
        await this.reservationRepository.findByIdempotencyKey(idempotencyKey);

      if (existing) return existing;
    }

    const lockKey = `lock:session:${dto.sessionId}`;
    const lock = await this.redlock.acquire([lockKey], 5000).catch((error) => {
      if (error instanceof ExecutionError) {
        throw new ConflictException(
          'Sessão ocupada, tente novamente em instantes',
        );
      }
      throw error;
    });

    try {
      const expiresAt = new Date(
        Date.now() + env.RESERVATION_TTL_SECONDS * 1000,
      );

      const reservation = await this.reservationRepository.createWithLock({
        userId,
        sessionId: dto.sessionId,
        seatIds: dto.seatIds,
        expiresAt,
        idempotencyKey,
      });

      this.logger.log(
        `Reserva ${reservation.id} criada para sessão ${dto.sessionId}`,
      );

      await this.reservationProducer.emitReservationCreated({
        reservationId: reservation.id,
        userId,
        sessionId: dto.sessionId,
        seatIds: dto.seatIds,
      });

      return reservation;
    } finally {
      await lock.release();
    }
  }

  async cancel(reservationId: string, userId: string) {
    const reservation =
      await this.reservationRepository.findById(reservationId);

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    if (reservation.userId !== userId) {
      throw new ForbiddenException('Reserva não pertence a este usuário');
    }

    if (reservation.status !== 'PENDING') {
      throw new ConflictException(
        'Apenas reservas pendentes podem ser canceladas',
      );
    }

    const cancelled = await this.reservationRepository.cancel(reservationId);

    this.logger.log(`Reserva ${reservationId} cancelada`);

    await this.reservationProducer.emitReservationCancelled({
      reservationId,
      userId,
      sessionId: cancelled.sessionId,
      seatIds: cancelled.reservationSeats.map((rs) => rs.seatId),
    });

    await this.reservationProducer.emitSeatReleased({
      sessionId: cancelled.sessionId,
      seatIds: cancelled.reservationSeats.map((rs) => rs.seatId),
      reason: 'cancelled',
    });

    return cancelled;
  }

  async findById(id: string) {
    const reservation = await this.reservationRepository.findById(id);

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    return reservation;
  }

  async findByUser(userId: string) {
    const reservations = await this.reservationRepository.findByUserId(userId);

    return reservations;
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleExpiredReservations() {
    const expiredReservations =
      await this.reservationRepository.expirePendingReservations();

    if (expiredReservations.length > 0) {
      this.logger.log(
        `${expiredReservations.length} reserva(s) expirada(s) e assentos liberados`,
      );

      await this.reservationProducer.emitReservationExpired({
        reservationIds: expiredReservations.map((r) => r.reservationId),
      });

      for (const expired of expiredReservations) {
        await this.reservationProducer.emitSeatReleased({
          sessionId: expired.sessionId,
          seatIds: expired.seatIds,
          reason: 'expired',
        });
      }
    }
  }
}
