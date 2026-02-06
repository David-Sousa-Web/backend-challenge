import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentService } from '../services/payment.service';
import { ConfirmPaymentDto } from '../dtos/confirm-payment.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('confirm')
  @ApiOperation({ summary: 'Confirmar pagamento de uma reserva' })
  async confirmPayment(
    @Body() dto: ConfirmPaymentDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.paymentService.confirmPayment(user.userId, dto);
  }

  @Get('history')
  @ApiOperation({ summary: 'Histórico de compras do usuário' })
  async findPurchaseHistory(@CurrentUser() user: { userId: string }) {
    return this.paymentService.findPurchaseHistory(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhes de uma venda' })
  async findSaleById(@Param('id') id: string) {
    return this.paymentService.findSaleById(id);
  }
}
