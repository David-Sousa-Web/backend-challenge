import { Test } from '@nestjs/testing';
import { PaymentController } from '../../../src/modules/payment/controllers/payment.controller';
import { PaymentService } from '../../../src/modules/payment/services/payment.service';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: jest.Mocked<PaymentService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: {
            confirmPayment: jest.fn(),
            findPurchaseHistory: jest.fn(),
            findSaleById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(PaymentController);
    service = module.get(PaymentService);
  });

  describe('confirmPayment', () => {
    it('should delegate to service with userId', async () => {
      const dto = { reservationId: 'res-1' };
      const user = { userId: 'user-1' };
      service.confirmPayment.mockResolvedValue({ id: 'sale-1' } as any);

      const result = await controller.confirmPayment(dto, user);

      expect(service.confirmPayment).toHaveBeenCalledWith('user-1', dto);
      expect(result).toEqual({ id: 'sale-1' });
    });
  });

  describe('findPurchaseHistory', () => {
    it('should return purchase history', async () => {
      const user = { userId: 'user-1' };
      service.findPurchaseHistory.mockResolvedValue([]);

      const result = await controller.findPurchaseHistory(user);

      expect(service.findPurchaseHistory).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('findSaleById', () => {
    it('should return sale by id', async () => {
      service.findSaleById.mockResolvedValue({ id: 'sale-1' } as any);

      const result = await controller.findSaleById('sale-1');

      expect(service.findSaleById).toHaveBeenCalledWith('sale-1');
      expect(result).toEqual({ id: 'sale-1' });
    });
  });
});
