import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { LoggingInterceptor } from '../../../src/common/interceptors/logging.interceptor';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('should call next.handle() and return the observable', (done) => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/test' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of({ data: 'test' }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: (value) => {
        expect(value).toEqual({ data: 'test' });
      },
      complete: () => done(),
    });
  });
});
