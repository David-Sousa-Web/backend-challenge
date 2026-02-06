import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Erro interno do servidor';

    const body =
      typeof message === 'string' ? { statusCode: status, message } : message;

    if (status >= 500) {
      this.logger.error(
        { err: exception, path: request.url, method: request.method },
        `Erro ${status} em ${request.method} ${request.url}`,
      );
    } else {
      this.logger.warn(
        { path: request.url, method: request.method, status },
        `${status} em ${request.method} ${request.url}`,
      );
    }

    response.status(status).json({
      ...(typeof body === 'object' ? body : { message: body }),
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
