import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PaymentRepository,
  SaleEntity,
  SaleWithReservation,
  CreateSaleData,
} from './payment.repository';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async confirmPayment(data: CreateSaleData): Promise<SaleWithReservation> {
    return this.prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUniqueOrThrow({
        where: { id: data.reservationId },
        select: {
          status: true,
          expiresAt: true,
          reservationSeats: { select: { seatId: true } },
        },
      });

      if (reservation.status !== 'PENDING') {
        throw new ConflictException('Reserva não está pendente de pagamento');
      }

      if (reservation.expiresAt < new Date()) {
        throw new ConflictException('Reserva expirada');
      }

      await tx.reservation.update({
        where: { id: data.reservationId },
        data: { status: 'CONFIRMED' },
      });

      await tx.seat.updateMany({
        where: {
          id: { in: reservation.reservationSeats.map((s) => s.seatId) },
        },
        data: { status: 'SOLD' },
      });

      const sale = await tx.sale.create({
        data: {
          reservationId: data.reservationId,
          userId: data.userId,
          totalInCents: data.totalInCents,
        },
        include: {
          reservation: {
            select: {
              id: true,
              sessionId: true,
              reservationSeats: {
                select: { seat: { select: { id: true, label: true } } },
              },
            },
          },
        },
      });

      return sale;
    });
  }

  async findSalesByUserId(userId: string): Promise<SaleEntity[]> {
    const sales = await this.prisma.sale.findMany({
      where: { userId },
      orderBy: { confirmedAt: 'desc' },
    });

    return sales;
  }

  async findSaleById(id: string): Promise<SaleWithReservation | null> {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        reservation: {
          select: {
            id: true,
            sessionId: true,
            reservationSeats: {
              select: { seat: { select: { id: true, label: true } } },
            },
          },
        },
      },
    });

    return sale;
  }
}
