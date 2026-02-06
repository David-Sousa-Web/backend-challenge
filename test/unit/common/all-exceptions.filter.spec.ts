import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '../../../src/common/filters/all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ url: '/test', method: 'GET' }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('should handle HttpException with correct status and message', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Not Found',
        timestamp: expect.any(String),
        path: '/test',
      }),
    );
  });

  it('should handle HttpException with object response', () => {
    const exception = new HttpException(
      { statusCode: 400, message: ['field is required'] },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['field is required'],
        path: '/test',
      }),
    );
  });

  it('should handle unknown exceptions as 500', () => {
    const exception = new Error('Something broke');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Erro interno do servidor',
        path: '/test',
      }),
    );
  });
});
