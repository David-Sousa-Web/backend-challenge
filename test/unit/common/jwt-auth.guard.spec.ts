import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../../../src/modules/auth/guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as any;

    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    guard = new JwtAuthGuard(jwtService, reflector);
  });

  const createMockContext = (authHeader?: string): ExecutionContext => {
    const request: Record<string, unknown> = {
      headers: { authorization: authHeader },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('should allow access for public routes', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    const result = await guard.canActivate(createMockContext());

    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException if no token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(guard.canActivate(createMockContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException for invalid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

    await expect(
      guard.canActivate(createMockContext('Bearer invalid-token')),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should set user on request for valid token', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });

    const context = createMockContext('Bearer valid-token');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest() as any;
    expect(request.user).toEqual({ userId: 'user-1' });
  });
});
