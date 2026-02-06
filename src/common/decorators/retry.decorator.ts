import { Logger } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Retry(maxAttempts = 3, baseDelay = 200): MethodDecorator {
  return (_target, propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    const logger = new Logger('RetryDecorator');

    descriptor.value = async function (...args: unknown[]) {
      const context = args.find((a) => a instanceof RmqContext) as RmqContext;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const result = await originalMethod.apply(this, args);

          if (context) {
            const channel = context.getChannelRef();
            channel.ack(context.getMessage());
          }

          return result;
        } catch (error) {
          const isLastAttempt = attempt === maxAttempts - 1;
          const delay =
            baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 100);

          logger.warn(
            `[${String(propertyKey)}] Tentativa ${attempt + 1}/${maxAttempts} falhou: ${error?.message ?? error}`,
          );

          if (isLastAttempt) {
            logger.error(
              `[${String(propertyKey)}] Todas as ${maxAttempts} tentativas falharam. Enviando para DLQ.`,
            );

            if (context) {
              const channel = context.getChannelRef();
              channel.nack(context.getMessage(), false, false);
            }

            return;
          }

          await sleep(delay);
        }
      }
    };

    return descriptor;
  };
}
