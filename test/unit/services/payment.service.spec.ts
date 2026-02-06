import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaymentService } from '../../../src/modules/payment/services/payment.service';
import { PaymentRepository } from '../../../src/modules/payment/repositories/payment.repository';
import { ReservationRepository } from '../../../src/modules/reservation/repositories/reservation.repository';
import { SessionRepository } from '../../../src/modules/session/repositories/session.repository';
import { PaymentProducer } from '../../../src/modules/messaging/producers/payment.producer';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepo: jest.Mocked<PaymentRepository>;
  let reservationRepo: jest.Mocked<ReservationRepository>;
  let sessionRepo: jest.Mocked<SessionRepository>;
  let producer: jest.Mocked<PaymentProducer>;

  const mockReservation = {
    id: 'res-1',
    userId: 'user-1',
    sessionId: 'session-1',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 30000),
    idempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    reservationSeats: [
      {
        seatId: 'seat-1',
        seat: { id: 'seat-1', label: 'A1', status: 'RESERVED' },
      },
      {
        seatId: 'seat-2',
        seat: { id: 'seat-2', label: 'A2', status: 'RESERVED' },
      },
    ],
  };

  const mockSession = {
    id: 'session-1',
    movieTitle: 'Avengers',
    room: 'Room 1',
    startsAt: new Date(),
    ticketPriceInCents: 2500,
    createdAt: new Date(),
    updatedAt: new Date(),
    seats: [],
  };

  const mockSale = {
    id: 'sale-1',
    reservationId: 'res-1',
    userId: 'user-1',
    totalInCents: 5000,
    confirmedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    reservation: {
      id: 'res-1',
      sessionId: 'session-1',
      reservationSeats: [
        { seat: { id: 'seat-1', label: 'A1' } },
        { seat: { id: 'seat-2', label: 'A2' } },
      ],
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: PaymentRepository,
          useValue: {
            confirmPayment: jest.fn(),
            findSalesByUserId: jest.fn(),
            findSaleById: jest.fn(),
          },
        },
        {
          provide: ReservationRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: SessionRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: PaymentProducer,
          useValue: {
            emitPaymentConfirmed: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentService);
    paymentRepo = module.get(PaymentRepository);
    reservationRepo = module.get(ReservationRepository);
    sessionRepo = module.get(SessionRepository);
    producer = module.get(PaymentProducer);
  });

  describe('confirmPayment', () => {
    const dto = { reservationId: 'res-1' };

    it('should confirm payment and emit event', async () => {
      reservationRepo.findById.mockResolvedValue(mockReservation);
      sessionRepo.findById.mockResolvedValue(mockSession);
      paymentRepo.confirmPayment.mockResolvedValue(mockSale);

      const result = await service.confirmPayment('user-1', dto);

      expect(paymentRepo.confirmPayment).toHaveBeenCalledWith({
        reservationId: 'res-1',
        userId: 'user-1',
        totalInCents: 5000, // 2 seats * 2500
      });
      expect(producer.emitPaymentConfirmed).toHaveBeenCalledWith(
        expect.objectContaining({
          saleId: 'sale-1',
          totalInCents: 5000,
          seatLabels: ['A1', 'A2'],
        }),
      );
      expect(result).toEqual(mockSale);
    });

    it('should throw NotFoundException if reservation not found', async () => {
      reservationRepo.findById.mockResolvedValue(null);

      await expect(service.confirmPayment('user-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own reservation', async () => {
      reservationRepo.findById.mockResolvedValue(mockReservation);

      await expect(service.confirmPayment('other-user', dto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findPurchaseHistory', () => {
    it('should return sales for user', async () => {
      paymentRepo.findSalesByUserId.mockResolvedValue([mockSale]);

      const result = await service.findPurchaseHistory('user-1');

      expect(result).toEqual([mockSale]);
    });
  });

  describe('findSaleById', () => {
    it('should return the sale', async () => {
      paymentRepo.findSaleById.mockResolvedValue(mockSale);

      const result = await service.findSaleById('sale-1');

      expect(result).toEqual(mockSale);
    });

    it('should throw NotFoundException if not found', async () => {
      paymentRepo.findSaleById.mockResolvedValue(null);

      await expect(service.findSaleById('none')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
