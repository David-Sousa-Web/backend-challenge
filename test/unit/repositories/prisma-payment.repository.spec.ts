import { Test } from '@nestjs/testing';
import { PrismaPaymentRepository } from '../../../src/modules/payment/repositories/prisma-payment.repository';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('PrismaPaymentRepository', () => {
  let repository: PrismaPaymentRepository;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      sale: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      reservation: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      seat: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        PrismaPaymentRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(PrismaPaymentRepository);
  });

  describe('confirmPayment', () => {
    it('should create sale in transaction', async () => {
      const mockSale = { id: 'sale-1', reservation: {} };

      prisma.$transaction.mockImplementation(async (cb: Function) => {
        const tx = {
          reservation: {
            findUniqueOrThrow: jest.fn().mockResolvedValue({
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 60000),
              reservationSeats: [{ seatId: 'seat-1' }],
            }),
            update: jest.fn(),
          },
          seat: { updateMany: jest.fn() },
          sale: { create: jest.fn().mockResolvedValue(mockSale) },
        };
        return cb(tx);
      });

      const result = await repository.confirmPayment({
        reservationId: 'res-1',
        userId: 'user-1',
        totalInCents: 5000,
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockSale);
    });
  });

  describe('findSalesByUserId', () => {
    it('should return sales for user', async () => {
      prisma.sale.findMany.mockResolvedValue([]);

      const result = await repository.findSalesByUserId('user-1');

      expect(prisma.sale.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { confirmedAt: 'desc' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('findSaleById', () => {
    it('should return sale with reservation', async () => {
      const mockSale = { id: 'sale-1', reservation: {} };
      prisma.sale.findUnique.mockResolvedValue(mockSale);

      const result = await repository.findSaleById('sale-1');

      expect(prisma.sale.findUnique).toHaveBeenCalledWith({
        where: { id: 'sale-1' },
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
      expect(result).toEqual(mockSale);
    });
  });
});
