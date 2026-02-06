import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { RABBITMQ_QUEUES } from '../messaging.constants';
import { Retry } from '../../../common/decorators/retry.decorator';

@Controller()
export class SeatConsumer {
  private readonly logger = new Logger(SeatConsumer.name);

  @EventPattern(RABBITMQ_QUEUES.SEAT_RELEASED)
  @Retry(3, 200)
  async handleSeatReleased(
    @Payload()
    data: {
      sessionId: string;
      seatIds: string[];
      reason: 'cancelled' | 'expired';
    },
    @Ctx() context: RmqContext,
  ) {
    void context;

    this.logger.log(
      `Assento(s) liberado(s) | Sessão: ${data.sessionId} | Quantidade: ${data.seatIds.length} | Motivo: ${data.reason}`,
    );
  }
}
