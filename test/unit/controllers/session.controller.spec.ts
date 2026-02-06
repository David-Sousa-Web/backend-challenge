import { Test } from '@nestjs/testing';
import { SessionController } from '../../../src/modules/session/controllers/session.controller';
import { SessionService } from '../../../src/modules/session/services/session.service';

describe('SessionController', () => {
  let controller: SessionController;
  let service: jest.Mocked<SessionService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SessionController],
      providers: [
        {
          provide: SessionService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findSeats: jest.fn(),
            findAvailableSeats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(SessionController);
    service = module.get(SessionService);
  });

  describe('create', () => {
    it('should delegate to sessionService.create', async () => {
      const dto = {
        movieTitle: 'Film',
        room: 'Room 1',
        startsAt: '2026-01-01T19:00:00Z',
        ticketPriceInCents: 2500,
        seats: Array.from({ length: 16 }, (_, i) => `A${i + 1}`),
      };
      service.create.mockResolvedValue({ id: 'session-1' } as any);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'session-1' });
    });
  });

  describe('findAll', () => {
    it('should return all sessions', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a session by id', async () => {
      service.findById.mockResolvedValue({ id: 'session-1' } as any);

      const result = await controller.findById('session-1');

      expect(service.findById).toHaveBeenCalledWith('session-1');
      expect(result).toEqual({ id: 'session-1' });
    });
  });

  describe('findSeats', () => {
    it('should return seats for a session', async () => {
      service.findSeats.mockResolvedValue([]);

      const result = await controller.findSeats('session-1');

      expect(service.findSeats).toHaveBeenCalledWith('session-1');
      expect(result).toEqual([]);
    });
  });

  describe('findAvailableSeats', () => {
    it('should return available seats', async () => {
      service.findAvailableSeats.mockResolvedValue([]);

      const result = await controller.findAvailableSeats('session-1');

      expect(service.findAvailableSeats).toHaveBeenCalledWith('session-1');
      expect(result).toEqual([]);
    });
  });
});
