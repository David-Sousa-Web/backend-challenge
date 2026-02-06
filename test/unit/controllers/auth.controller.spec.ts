import { Test } from '@nestjs/testing';
import { AuthController } from '../../../src/modules/auth/controllers/auth.controller';
import { AuthService } from '../../../src/modules/auth/services/auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  describe('register', () => {
    it('should call authService.register with dto', async () => {
      const dto = { name: 'John', email: 'john@test.com', password: 'pass123' };
      const expected = { accessToken: 'token', userId: 'user-1' };
      service.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(service.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should call authService.login with dto', async () => {
      const dto = { email: 'john@test.com', password: 'pass123' };
      const expected = { accessToken: 'token', userId: 'user-1' };
      service.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(service.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });
});
