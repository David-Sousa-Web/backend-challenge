import { Test } from '@nestjs/testing';
import { PrismaAuthRepository } from '../../../src/modules/auth/repositories/prisma-auth.repository';
import { PrismaService } from '../../../src/prisma/prisma.service';

describe('PrismaAuthRepository', () => {
  let repository: PrismaAuthRepository;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        PrismaAuthRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    repository = module.get(PrismaAuthRepository);
  });

  describe('findByEmail', () => {
    it('should call prisma.user.findUnique with email', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com' };
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findByEmail('test@test.com');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await repository.findByEmail('none@test.com');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should call prisma.user.create with data', async () => {
      const data = {
        name: 'John',
        email: 'john@test.com',
        passwordHash: 'hash',
      };
      const mockUser = { id: 'user-1', ...data };
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await repository.create(data);

      expect(prisma.user.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(mockUser);
    });
  });
});
