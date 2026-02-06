import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { ReservationRepository } from '../../reservation/repositories/reservation.repository';
import { SessionRepository } from '../../session/repositories/session.repository';
import { PaymentProducer } from '../../messaging/producers/payment.producer';
import { ConfirmPaymentDto } from '../dtos/confirm-payment.dto';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly reservationRepository: ReservationRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly paymentProducer: PaymentProducer,
  ) {}

  async confirmPayment(userId: string, dto: ConfirmPaymentDto) {
    const reservation = await this.reservationRepository.findById(
      dto.reservationId,
    );

    if (!reservation) {
      throw new NotFoundException('Reserva não encontrada');
    }

    if (reservation.userId !== userId) {
      throw new ForbiddenException('Reserva não pertence a este usuário');
    }

    const session = await this.sessionRepository.findById(
      reservation.sessionId,
    );

    const totalInCents =
      reservation.reservationSeats.length * session!.ticketPriceInCents;

    const sale = await this.paymentRepository.confirmPayment({
      reservationId: dto.reservationId,
      userId,
      totalInCents,
    });

    await this.paymentProducer.emitPaymentConfirmed({
      saleId: sale.id,
      reservationId: dto.reservationId,
      userId,
      sessionId: reservation.sessionId,
      totalInCents,
      seatLabels: reservation.reservationSeats.map((rs) => rs.seat.label),
    });

    return sale;
  }

  async findPurchaseHistory(userId: string) {
    const sales = await this.paymentRepository.findSalesByUserId(userId);
    return sales;
  }

  async findSaleById(id: string) {
    const sale = await this.paymentRepository.findSaleById(id);

    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }

    return sale;
  }
}
