import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';

@Controller()
export class DlqConsumer {
  private readonly logger = new Logger(DlqConsumer.name);

  @EventPattern('cinema_events.dlq')
  handleDeadLetter(@Payload() data: unknown, @Ctx() context: RmqContext) {
    const message = context.getMessage();
    const originalRoutingKey =
      message.properties?.headers?.['x-first-death-queue'] ?? 'unknown';
    const deathReason =
      message.properties?.headers?.['x-first-death-reason'] ?? 'unknown';

    this.logger.warn(
      `[DLQ] Mensagem não processada | Fila origem: ${originalRoutingKey} | Motivo: ${deathReason} | Payload: ${JSON.stringify(data)}`,
    );

    const channel = context.getChannelRef();
    channel.ack(message);
  }
}
