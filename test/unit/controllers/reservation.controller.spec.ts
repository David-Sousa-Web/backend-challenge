import { Test } from '@nestjs/testing';
import { ReservationController } from '../../../src/modules/reservation/controllers/reservation.controller';
import { ReservationService } from '../../../src/modules/reservation/services/reservation.service';

describe('ReservationController', () => {
  let controller: ReservationController;
  let service: jest.Mocked<ReservationService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReservationController],
      providers: [
        {
          provide: ReservationService,
          useValue: {
            create: jest.fn(),
            cancel: jest.fn(),
            findById: jest.fn(),
            findByUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ReservationController);
    service = module.get(ReservationService);
  });

  describe('create', () => {
    it('should delegate to service with userId and idempotencyKey', async () => {
      const dto = { sessionId: 'session-1', seatIds: ['seat-1'] };
      const user = { userId: 'user-1' };
      service.create.mockResolvedValue({ id: 'res-1' } as any);

      const result = await controller.create(dto, user, 'idem-key');

      expect(service.create).toHaveBeenCalledWith('user-1', dto, 'idem-key');
      expect(result).toEqual({ id: 'res-1' });
    });
  });

  describe('cancel', () => {
    it('should delegate cancel to service', async () => {
      const user = { userId: 'user-1' };
      service.cancel.mockResolvedValue({
        id: 'res-1',
        status: 'CANCELLED',
      } as any);

      const result = await controller.cancel('res-1', user);

      expect(service.cancel).toHaveBeenCalledWith('res-1', 'user-1');
      expect(result).toEqual({ id: 'res-1', status: 'CANCELLED' });
    });
  });

  describe('findByUser', () => {
    it('should return user reservations', async () => {
      const user = { userId: 'user-1' };
      service.findByUser.mockResolvedValue([]);

      const result = await controller.findByUser(user);

      expect(service.findByUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return reservation by id', async () => {
      service.findById.mockResolvedValue({ id: 'res-1' } as any);

      const result = await controller.findById('res-1');

      expect(service.findById).toHaveBeenCalledWith('res-1');
      expect(result).toEqual({ id: 'res-1' });
    });
  });
});
