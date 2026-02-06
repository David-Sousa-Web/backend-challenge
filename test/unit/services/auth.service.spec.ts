import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { AuthRepository } from '../../../src/modules/auth/repositories/auth.repository';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    authRepository = module.get(AuthRepository);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    const dto = { name: 'John', email: 'john@test.com', password: 'pass123' };

    it('should register a new user and return accessToken', async () => {
      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.create.mockResolvedValue({
        id: 'user-1',
        name: dto.name,
        email: dto.email,
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.register(dto);

      expect(authRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(authRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: dto.name, email: dto.email }),
      );
      expect(result).toEqual({ accessToken: 'mock-token', userId: 'user-1' });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user-1' });
    });

    it('should throw ConflictException if email already exists', async () => {
      authRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        name: 'Existing',
        email: dto.email,
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(authRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { email: 'john@test.com', password: 'pass123' };

    it('should return accessToken for valid credentials', async () => {
      // First register to get a real hash
      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.create.mockImplementation(async (data) => ({
        id: 'user-1',
        name: 'John',
        email: data.email,
        passwordHash: data.passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const registered = await service.register({
        name: 'John',
        ...dto,
      });

      // Now use the real hash for login
      const createCall = authRepository.create.mock.calls[0][0];
      authRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        name: 'John',
        email: dto.email,
        passwordHash: createCall.passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.login(dto);

      expect(result).toEqual({ accessToken: 'mock-token', userId: 'user-1' });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      authRepository.findByEmail.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      authRepository.findByEmail.mockResolvedValue({
        id: 'user-1',
        name: 'John',
        email: dto.email,
        passwordHash: 'invalidsalt:invalidhash',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.login(dto)).rejects.toThrow();
    });
  });
});
